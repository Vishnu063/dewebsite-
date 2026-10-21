import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const templates=new Map();
export const BENCHMARK_DESIGNS=new Set(['naruto','luffy']);

export async function loadBenchmarkModels(characters,signal){
 const designs=[...new Set(characters.map(c=>c.design).filter(id=>BENCHMARK_DESIGNS.has(id)))];
 await Promise.all(designs.map(async id=>{
  if(templates.has(id))return;
  const response=await fetch(`/static/models/${id}-benchmark.glb`,{signal});
  if(!response.ok)throw new Error(`Detailed model download failed (${response.status})`);
  const data=await response.arrayBuffer();if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const gltf=await new GLTFLoader().parseAsync(data,'');
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  templates.set(id,gltf.scene);
 }));
}

export function makeBenchmarkCharacter(c){
 const template=templates.get(c.design);if(!template)return null;
 const root=new THREE.Group();root.userData.character=c;root.userData.benchmark=true;
 root.add(cloneSkeleton(template));
 root.traverse(node=>{if(node.isSkinnedMesh)node.frustumCulled=false;});
 const find=name=>{const node=root.getObjectByName(name);if(!node)throw new Error('Model joint missing: '+name);return node;};
 root.userData.rig={detailed:true,pose:'signature',visual:find('animated_body'),head:find('head_joint'),breathing:find('chest_joint'),
  arms:['L','R'].map(s=>find('upper_arm_'+s)),elbows:['L','R'].map(s=>find('forearm_'+s)),
  legs:['L','R'].map(s=>find('thigh_'+s)),knees:['L','R'].map(s=>find('shin_'+s)),
  eyes:['L','R'].map(s=>{const node=find('blink_'+s);return {node,y:node.scale.y};})};
 return root;
}

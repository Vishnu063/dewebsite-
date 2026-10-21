// A vector snapshot of the actual meshes, for docs/catalogue thumbnails.
import * as T from 'three';
import {makeCharacter} from '../frontend/models.js';
import {profileCamera} from '../frontend/profile-camera.js';
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function renderCharacter(c,angle='front'){
 const model=makeCharacter(c);model.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(model),view=profileCamera(bounds,angle,600/640);
 const camera=new T.PerspectiveCamera(42,600/640,.1,50);
 camera.position.copy(view.position);camera.lookAt(view.target);camera.updateMatrixWorld(true);
 const light=new T.Vector3(-.5,.8,1).normalize(),faces=[];
 model.traverse(m=>{
  if(!m.isMesh)return;
  const p=m.geometry.attributes.position,ix=m.geometry.index;
  for(let i=0;i<(ix?ix.count:p.count);i+=3){
   const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m.matrixWorld));
   const n=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();
   const center=vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3);
   if(n.dot(camera.position.clone().sub(center))<=0)continue;
   const projected=vs.map(v=>v.clone().project(camera));
   const color='#'+m.material.color.clone().multiplyScalar(.62+.38*Math.max(0,n.dot(light))).getHexString();
   faces.push({depth:projected.reduce((s,v)=>s+v.z,0)/3,color,points:projected.map(v=>`${((v.x+1)*300).toFixed(1)},${((1-v.y)*320).toFixed(1)}`).join(' ')});
  }
 });
 faces.sort((a,b)=>b.depth-a.depth);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="640" viewBox="0 0 600 640" role="img" aria-labelledby="title description"><title id="title">${escape(c.name)} — ${angle} 3D view</title><desc id="description">${escape(c.series?'Unofficial '+c.series+' fan model':'Original Veyra character')}. Static ${angle} rendering of the actual interactive 3D mesh.</desc><rect width="600" height="640" rx="32" fill="#f4f1e5"/><circle cx="300" cy="300" r="235" fill="#e2e9dc"/>${faces.map(f=>`<polygon points="${f.points}" fill="${f.color}" stroke="${f.color}" stroke-width="0.2"/>`).join('')}</svg>\n`;
}

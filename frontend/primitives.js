import * as THREE from 'three';

const geometries = new Map(), materials = new Map();
function geometry(kind) {
  if (!geometries.has(kind)) {
    const value = kind==='sphere' ? new THREE.SphereGeometry(1,12,8)
      : kind==='cylinder' ? new THREE.CylinderGeometry(1,1,1,12)
      : kind==='cone' ? new THREE.ConeGeometry(1,1,8)
      : kind==='crystal' ? new THREE.OctahedronGeometry(1)
      : kind==='ring' ? new THREE.TorusGeometry(1,.12,5,20)
      : new THREE.BoxGeometry(1,1,1);
    geometries.set(kind,value);
  }
  return geometries.get(kind);
}
export function material(color,glow=false) {
  const key=color+glow;
  if(!materials.has(key))materials.set(key,glow?new THREE.MeshBasicMaterial({color}):new THREE.MeshLambertMaterial({color}));
  return materials.get(key);
}
export function piece(parent,kind,color,position,scale) {
  const mesh=new THREE.Mesh(geometry(kind),material(color));
  mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;
}


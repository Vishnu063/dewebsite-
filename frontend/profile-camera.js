import * as THREE from 'three';
export const PROFILE_ANGLES=['front','back','left','right','top','bottom'];
export function profileCamera(bounds,angle,aspect=1,fov=42){
 const directions={front:[0,.04,1],back:[0,.04,-1],left:[-1,.04,0],right:[1,.04,0],top:[0,1,.001],bottom:[0,-1,.001]};
 if(!directions[angle])throw new Error('Unknown profile angle');
 const center=bounds.getCenter(new THREE.Vector3());
 const radius=bounds.getSize(new THREE.Vector3()).length()/2;
 const halfVertical=THREE.MathUtils.degToRad(fov/2);
 const halfHorizontal=Math.atan(Math.tan(halfVertical)*Math.max(.1,aspect));
 const distance=radius/Math.sin(Math.min(halfVertical,halfHorizontal))*1.12;
 return {target:center,position:center.clone().add(new THREE.Vector3(...directions[angle]).normalize().multiplyScalar(distance)),distance};
}

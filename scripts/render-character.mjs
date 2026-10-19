// Offline vector rendering of the actual world model, without a browser.
import fs from 'node:fs';
import * as T from 'three';
import {makeCharacter} from '../frontend/models.js';
const world=JSON.parse(fs.readFileSync(new URL('../data/world.json',import.meta.url)));
const c=world.characters.find(c=>c.id==='aela-venn');
if(!c)throw Error('Character missing');
const model=makeCharacter(c);model.updateMatrixWorld(true);
const camera=new T.OrthographicCamera(-1.8,1.8,1.9,-1.9,.1,50);
camera.position.set(3,2.9,8);camera.lookAt(0,1.35,0);camera.updateMatrixWorld(true);
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
 faces.push({depth:projected.reduce((s,v)=>s+v.z,0)/3,color,points:projected.map(v=>`${((v.x+1)*300).toFixed(2)},${((1-v.y)*320).toFixed(2)}`).join(' ')});
 }
});
faces.sort((a,b)=>b.depth-a.depth);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="640" viewBox="0 0 600 640" role="img" aria-labelledby="title description">
<title id="title">Aela Venn — Cloud gardener</title><desc id="description">An original 3D character with cream hair buns, sage clothes, amber scarf and a flower, rendered from Veyra's actual model.</desc>
<rect width="600" height="640" rx="32" fill="#f4f1e5"/><circle cx="300" cy="286" r="220" fill="#e2e9dc"/><ellipse cx="300" cy="549" rx="118" ry="20" fill="#cbd3be"/>
${faces.map(f=>`<polygon points="${f.points}" fill="${f.color}" stroke="${f.color}" stroke-width="0.3"/>`).join('\n')}</svg>\n`;
fs.mkdirSync(new URL('../docs/characters/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/characters/aela-venn.svg',import.meta.url),svg);
console.log(`Rendered ${c.name}: ${faces.length} faces`);

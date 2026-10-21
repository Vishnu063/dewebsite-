import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PROFILE_ANGLES,profileCamera} from '../frontend/profile-camera.js';
import {renderCharacter} from '../scripts/model-portrait.mjs';
import * as THREE from 'three';
import {makeCharacter} from '../frontend/models.js';
import {WorldView} from '../frontend/world.js';
import {walkable,buildings,BRIDGES} from '../frontend/layout.js';

const world=JSON.parse(fs.readFileSync(new URL('../data/world.json',import.meta.url)));

test('all 51 character meshes have distinct definitions and finite geometry',()=>{
  const signatures=new Set();
  for(const character of world.characters){
    const model=makeCharacter(character);
    assert.equal(model.userData.character.id,character.id);
    const bounds=new THREE.Box3().setFromObject(model);
    assert(bounds.max.y>2&&bounds.max.y<4.5);
    for(const value of [...bounds.min,...bounds.max])assert(Number.isFinite(value));
    signatures.add(JSON.stringify([character.color,character.accent,character.hair,character.silhouette,character.accessory]));
  }
  assert.equal(signatures.size,51);
});

test('world construction places every resident and bounds scene complexity',()=>{
  const fixture={world,scene:new THREE.Scene(),actors:[],obstacles:[]};
  WorldView.prototype.buildWorld.call(fixture);
  assert.equal(fixture.actors.length,51);
  assert.equal(new Set(fixture.actors.map(a=>a.userData.character.id)).size,51);
  let meshes=0,triangles=0;
  fixture.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  assert(meshes<2000,`${meshes} meshes`);
  assert(triangles<400000,`${triangles} triangles`);
  console.log(`Scene: ${meshes} meshes, ${triangles} triangles, 51 characters`);
});

test('walking ground connects all three islands while rejecting the void',()=>{
  for(const character of world.characters)assert(walkable(character.x,character.z,world.regions),character.id);
  for(const [ai,bi] of BRIDGES){
    const a=world.regions[ai],b=world.regions[bi];
    for(let n=0;n<=20;n++)assert(walkable(a.x+(b.x-a.x)*n/20,a.z+(b.z-a.z)*n/20,world.regions));
  }
  assert(!walkable(500,500,world.regions));
  const obstacles=buildings(world.regions);
  assert(!walkable(obstacles[0].x,obstacles[0].z,world.regions,obstacles));
  const r=world.regions[0];
  assert(walkable(r.x+7,r.z+5,world.regions,[...obstacles,...world.regions.map(r=>({...r,radius:4.2}))]));
});

test('guided tour can start and pause even though switching modes stops a previous tour',()=>{
  const fixture={touring:false,setWalking(){this.touring=false;}};
  assert.equal(WorldView.prototype.tour.call(fixture),true);
  assert.equal(WorldView.prototype.tour.call(fixture),false);
});


test('exactly the requested ten Naruto and ten One Piece guests use distinct 3D geometry',()=>{
  const expected=['Naruto Uzumaki','Sasuke Uchiha','Sakura Haruno','Kakashi Hatake','Hinata Hyuga','Itachi Uchiha','Gaara','Shikamaru Nara','Rock Lee','Jiraiya','Monkey D. Luffy','Roronoa Zoro','Nami','Usopp','Sanji','Tony Tony Chopper','Nico Robin','Franky','Brook','Jinbe'];
  const guests=world.characters.filter(c=>c.series);
  assert.deepEqual(guests.map(c=>c.name),expected);
  assert.equal(guests.filter(c=>c.series==='Naruto').length,10);
  assert.equal(guests.filter(c=>c.series==='One Piece').length,10);
  const hashes=new Set(),obstacles=[...buildings(world.regions),...world.regions.map(r=>({...r,radius:4.2}))];
  for(const c of guests){
    const m=makeCharacter(c);m.updateMatrixWorld(true);const hash=createHash('sha256');
    m.traverse(o=>{if(o.isMesh){hash.update(JSON.stringify(o.matrixWorld.elements));hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));}});
    hashes.add(hash.digest('hex'));
    assert(walkable(c.x,c.z,world.regions,obstacles),c.id+' must be reachable');
    for(const other of world.characters)if(other!==c)assert(Math.hypot(c.x-other.x,c.z-other.z)>2.5,c.id+' overlaps '+other.id);
    const preview=fs.readFileSync(new URL('../static/characters/'+c.id+'.svg',import.meta.url),'utf8');
    assert.equal(preview,renderCharacter(c),'stale model thumbnail: '+c.id);
    assert(!preview.includes('NaN'));assert(preview.includes('<polygon'));
  }
  assert.equal(hashes.size,20,'models must differ in geometry, not only names or colours');
});

test('all six profile camera views frame every model including tall and wide characters',()=>{
  for(const c of world.characters){
    const model=makeCharacter(c),bounds=new THREE.Box3().setFromObject(model);
    for(const aspect of [.55,1,1.7])for(const angle of PROFILE_ANGLES){
      const view=profileCamera(bounds,angle,aspect),camera=new THREE.PerspectiveCamera(42,aspect,.1,100);
      camera.position.copy(view.position);camera.lookAt(view.target);camera.updateMatrixWorld(true);
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
        const projected=new THREE.Vector3(x,y,z).project(camera);
        assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z>-1&&projected.z<1,c.id+' clipped at '+angle);
      }
    }
  }
  assert.throws(()=>profileCamera(new THREE.Box3(),'unknown'));
});

test('profile camera presets stop auto rotation and allow above/below inspection',()=>{
 const fixture={profile:true,camera:new THREE.PerspectiveCamera(42,1,.1,100),profileBounds:new THREE.Box3(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,4,1)),controls:{target:new THREE.Vector3(),autoRotate:true,update(){}},motion:true};
 WorldView.prototype.setProfileAngle.call(fixture,'bottom');
 assert(fixture.camera.position.y<fixture.controls.target.y);
 assert.equal(fixture.controls.autoRotate,false);assert.equal(fixture.motion,false);
 WorldView.prototype.setProfileAngle.call(fixture,'top');
 assert(fixture.camera.position.y>fixture.controls.target.y);
});

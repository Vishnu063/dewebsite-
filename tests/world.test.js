import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {makeCharacter} from '../frontend/models.js';
import {WorldView} from '../frontend/world.js';
import {walkable,buildings,BRIDGES} from '../frontend/layout.js';

const world=JSON.parse(fs.readFileSync(new URL('../data/world.json',import.meta.url)));

test('all thirty-one original character meshes have distinct definitions and finite geometry',()=>{
  const signatures=new Set();
  for(const character of world.characters){
    const model=makeCharacter(character);
    assert.equal(model.userData.character.id,character.id);
    const bounds=new THREE.Box3().setFromObject(model);
    assert(bounds.max.y>2&&bounds.max.y<4.5);
    for(const value of [...bounds.min,...bounds.max])assert(Number.isFinite(value));
    signatures.add(JSON.stringify([character.color,character.accent,character.hair,character.silhouette,character.accessory]));
  }
  assert.equal(signatures.size,31);
});

test('world construction places every resident and bounds scene complexity',()=>{
  const fixture={world,scene:new THREE.Scene(),actors:[],obstacles:[]};
  WorldView.prototype.buildWorld.call(fixture);
  assert.equal(fixture.actors.length,31);
  assert.equal(new Set(fixture.actors.map(a=>a.userData.character.id)).size,31);
  let meshes=0,triangles=0;
  fixture.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  assert(meshes<2000,`${meshes} meshes`);
  assert(triangles<400000,`${triangles} triangles`);
  console.log(`Scene: ${meshes} meshes, ${triangles} triangles, 31 residents`);
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

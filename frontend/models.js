import * as THREE from 'three';
import {piece} from './primitives.js';
import {makeAnimeCharacter} from './anime-models.js';
import {articulateCharacter} from './character-animation.js';
export {piece, material} from './primitives.js';

export function makeCharacter(c) {
  if(c.series)return articulateCharacter(makeAnimeCharacter(c));
  const root=new THREE.Group();root.userData.character=c;
  const dark='#343645',white='#f6f1dd';
  // Compact, original toy-like proportions. Every resident has their own
  // palette, hairstyle, silhouette and role-specific prop.
  const body=c.silhouette===2?'cone':c.silhouette===4?'cylinder':'sphere';
  piece(root,body,c.color,[0,.91,0],[.48,.85,.32]);
  piece(root,'sphere',c.skin,[0,1.95,0],[.47,.48,.41]);
  piece(root,'sphere',c.hair,[0,2.15,-.07],[.49,.36,.4]);
  piece(root,'sphere',c.skin,[0,1.99,.18],[.4,.35,.29]);
  for(const side of [-1,1]) {
    piece(root,'sphere',dark,[side*.15,2.02,.448],[.045,.068,.025]);
    piece(root,'sphere',white,[side*.15-.012,2.045,.468],[.013,.018,.008]);
    piece(root,'sphere','#d98f8b',[side*.28,1.88,.41],[.065,.028,.012]);
    const arm=piece(root,'sphere',c.color,[side*.48,1.05,.015],[.14,.4,.16]);arm.rotation.z=side*.16;
    piece(root,'sphere',c.skin,[side*.52,.74,.025],[.12,.13,.12]);
    piece(root,'box',dark,[side*.2,.25,.02],[.2,.4,.2]);
    piece(root,'sphere',dark,[side*.2,.09,.11],[.16,.12,.24]);
  }
  const mouth=piece(root,'ring',dark,[0,1.88,.458],[.065,.038,.04]);mouth.rotation.z=Math.PI;
  piece(root,'sphere',c.accent,[0,1.48,.015],[.43,.09,.33]);
  piece(root,'box',c.accent,[.16,1.27,.33],[.16,.37,.06]);
  if(c.silhouette===0) {
    for(let n=0;n<3;n++){const tuft=piece(root,'cone',c.hair,[-.25+n*.23,2.4,-.08],[.18,.42,.2]);tuft.rotation.z=(n-1)*.3;}
  } else if(c.silhouette===1) {
    for(const side of [-1,1])piece(root,'sphere',c.hair,[side*.43,2.13,-.08],[.23,.25,.24]);
  } else if(c.silhouette===2) {
    piece(root,'cone',c.accent,[0,2.56,-.04],[.56,.65,.48]);
  } else if(c.silhouette===3) {
    piece(root,'sphere',c.hair,[0,1.77,-.28],[.5,.63,.28]);
  } else {
    const hat=piece(root,'cylinder',c.accent,[0,2.4,-.04],[.55,.12,.46]);hat.rotation.z=.12;
    piece(root,'cylinder',c.color,[0,2.54,-.04],[.35,.25,.33]);
  }
  switch(c.accessory) {
    case 'lantern':
      piece(root,'box',dark,[.68,.75,.15],[.08,.9,.08]);
      piece(root,'box','#ffd47d',[.68,1.23,.15],[.35,.43,.32]);
      piece(root,'cone',c.accent,[.68,1.52,.15],[.27,.2,.24]);break;
    case 'compass': {
      const disc=piece(root,'cylinder','#f3d58f',[0,1.04,.36],[.24,.08,.24]);disc.rotation.x=Math.PI/2;
      const needle=piece(root,'cone',c.accent,[0,1.05,.42],[.05,.3,.04]);needle.rotation.z=.4;break;
    }
    case 'sail':
      piece(root,'box',dark,[-.2,1.55,-.4],[.06,2,.06]);
      piece(root,'cone',white,[-.17,2.1,-.39],[.8,.85,.06]);break;
    case 'bell':
      piece(root,'cone','#deb56c',[.65,.9,.22],[.32,.4,.3]);
      piece(root,'sphere','#816143',[.65,.69,.22],[.09,.09,.09]);break;
    case 'book': {
      const book=piece(root,'box',c.accent,[-.5,.95,.4],[.4,.55,.15]);book.rotation.z=.25;
      piece(root,'box',white,[-.5,.96,.48],[.3,.43,.03]);break;
    }
    case 'wings':
      for(const side of [-1,1]){const wing=piece(root,'cone',c.accent,[side*.7,1.35,-.25],[.6,1.2,.08]);wing.rotation.z=-side*.9;}break;
    case 'satchel':
      piece(root,'box','#80694f',[-.54,.76,.05],[.38,.43,.36]);
      piece(root,'box','#efd2a0',[-.54,.85,.25],[.14,.1,.04]);break;
    case 'hammer':
      piece(root,'cylinder','#83624c',[.68,.97,0],[.05,1.2,.05]);
      piece(root,'box','#9ca7b0',[.68,1.59,0],[.62,.3,.3]);break;
    case 'ribbon':
      for(const side of [-1,1]){const ribbon=piece(root,'ring',c.accent,[side*.7,1.1,-.05],[.48,.75,.12]);ribbon.rotation.y=side*.5;}break;
    case 'goggles':
      for(const side of [-1,1])piece(root,'ring','#e6c893',[side*.18,2.24,.34],[.16,.14,.12]);break;
    case 'staff':
      piece(root,'cylinder','#8a6c51',[.7,1.05,0],[.05,2.15,.05]);
      piece(root,'crystal',c.accent,[.7,2.3,0],[.24,.35,.24]);break;
    case 'flower':
      piece(root,'cylinder','#637f5b',[.65,1,0],[.04,.85,.04]);
      for(let n=0;n<5;n++){const a=n*Math.PI*2/5;piece(root,'sphere',c.accent,[.65+.22*Math.cos(a),1.5+.22*Math.sin(a),0],[.18,.18,.08]);}
      piece(root,'sphere','#f3cf79',[.65,1.5,.06],[.14,.14,.08]);break;
    case 'crystal':
      piece(root,'crystal',c.accent,[.68,1.15,.14],[.3,.55,.3]);
      piece(root,'crystal','#c8dce1',[-.6,1.15,.14],[.18,.3,.18]);break;
  }
  return root;
}

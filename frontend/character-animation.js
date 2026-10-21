import * as THREE from 'three';

// Lightweight articulated mesh groups; no external rig or animation downloads.
export const SIGNATURE_POSES={
 naruto:{label:'Ready for adventure',arms:[[-.6,0,-.58],[-.95,0,.52]],legs:[.12,-.12],head:-.06},
 sasuke:{label:'Quiet resolve',arms:[[.12,0,-.16],[-.35,0,.3]],head:.07},
 sakura:{label:'Confident guard',arms:[[-.9,0,-.2],[-.4,0,.42]],head:-.04},
 kakashi:{label:'Relaxed mentor',arms:[[-.2,0,-.16],[-.8,0,.35]],head:.1},
 hinata:{label:'Gentle fist stance',arms:[[-1.05,-.3,-.14],[-.8,.3,.14]],legs:[.1,-.1]},
 itachi:{label:'Silent watch',arms:[[-.25,0,-.12],[-.52,0,.18]],head:.07},
 gaara:{label:'Sand guardian',arms:[[-.7,-.2,-.16],[-.7,.2,.16]],head:-.04},
 shikamaru:{label:'Thinking it through',arms:[[.05,0,-.1],[-1.35,0,.18]],head:.13},
 'rock-lee':{label:'Taijutsu guard',arms:[[-.8,0,-.65],[-1.2,0,.65]],legs:[.18,-.18]},
 jiraiya:{label:'Travelling sage',arms:[[-.3,0,-.45],[-.3,0,.45]],head:-.07},
 luffy:{label:'Let’s set sail',arms:[[0,0,-.25],[-2.3,0,.2]],legs:[.1,-.1],head:-.07},
 zoro:{label:'Swordsman’s resolve',arms:[[.18,0,-.22],[-.32,0,.18]],legs:[.08,-.08],head:.06},
 nami:{label:'Charting the course',arms:[[-.55,0,-.45],[0,0,.06]],head:-.06},
 usopp:{label:'Brave sharpshooter',arms:[[-.25,0,-.48],[-.28,0,.14]],head:.1},
 sanji:{label:'At your service',arms:[[.18,0,-.12],[-.68,0,.22]],head:.08},
 chopper:{label:'A friendly greeting',arms:[[0,0,-.28],[-1.6,0,.35]],head:-.08},
 robin:{label:'A quiet discovery',arms:[[-.65,0,-.16],[-.65,0,.16]],head:.08},
 franky:{label:'Super shipwright',arms:[[-.4,0,-.95],[-.4,0,.95]],legs:[.13,-.13]},
 brook:{label:'A musician’s welcome',arms:[[-.3,0,-.85],[0,0,.08]],head:.12},
 jinbe:{label:'Steady helmsman',arms:[[-.6,0,-.3],[-.4,0,.3]],head:-.04}
};
function pivot(parent,name,position){const g=new THREE.Group();g.name=name;g.position.set(...position);parent.add(g);return g;}
export function articulateCharacter(model){
 const c=model.userData.character;if(!c?.series)return model;
 const children=[...model.children],visual=pivot(model,'animated-body',[0,0,0]);
 const hy=c.design==='chopper'?1.77:c.design==='brook'?2.76:2.62;
 const shoulder=c.design==='chopper'?1.2:c.design==='jinbe'?1.85:1.98;
 const hip=c.design==='chopper'?.46:1.04;
 const head=pivot(visual,'head-joint',[0,hy,0]);
 const arms=[pivot(visual,'left-arm',[-.44,shoulder,0]),pivot(visual,'right-arm',[.44,shoulder,0])];
 const legs=[pivot(visual,'left-leg',[-.2,hip,0]),pivot(visual,'right-leg',[.2,hip,0])];
 const armNames=/^(sleeve|forearm|hand|wrist-wrap|arm|hoof-hand|bone-hand|large-shoulder|mechanical-forearm|knuckle|wide-sleeve|blue-hand|mesh-sleeve|shoulder-tattoo|staff-ring|weather-staff|slingshot-.+)$/;
 const legNames=/^(leg|short-leg|shoe|hoof|shorts|shorts-cuff|leg-warmer|sandal|leg-bone|pant-wrap|sandal-strap|toe)$/;
 const headNames=/hair|head|face|eye|ear|fringe|nose|smile|whisker|hat|antler|muzzle|tusk|topknot|sideburn|skull|jaw|teeth|cravat|quiff|goatee|goggle|sunglasses|glasses|cheek-scar|white-cross|pink-hat-panel|blue-nose/;
 for(const node of children){
  let parent=visual;
  if(armNames.test(node.name))parent=arms[node.position.x<0?0:1];
  else if(legNames.test(node.name))parent=legs[node.position.x<0?0:1];
  else if(headNames.test(node.name)&&node.position.y>hy-.45)parent=head;
  parent.add(node);node.position.sub(parent.position);
 }
 const eyes=[];model.traverse(n=>{if(['eye','eye-light','eye-white','iris'].includes(n.name))eyes.push({node:n,y:n.scale.y});});
 model.userData.rig={visual,head,arms,legs,eyes,pose:'signature',breathing:visual.getObjectByName('torso')};
 setCharacterPose(model,'signature');return model;
}
export function setCharacterPose(model,pose){
 const rig=model.userData.rig;if(!rig)return;
 if(!['signature','neutral'].includes(pose))throw new Error('Unknown character pose');
 const spec=pose==='signature'?SIGNATURE_POSES[model.userData.character.design]:null;
 if(rig.detailed){
  rig.elbows.forEach(e=>e.rotation.set(0,0,0));rig.knees.forEach(k=>k.rotation.set(0,0,0));
 }
 rig.pose=pose;rig.visual.position.y=0;rig.visual.rotation.set(0,0,0);rig.head.rotation.set(0,0,spec?.head||0);
 rig.arms.forEach((a,i)=>a.rotation.set(...(spec?.arms?.[i]||[0,0,0])));
 rig.legs.forEach((l,i)=>l.rotation.set(0,0,spec?.legs?.[i]||0));
 if(rig.detailed&&pose==='signature'){
  if(model.userData.character.design==='naruto'){
   rig.arms[0].rotation.set(-.65,-.12,.35);rig.arms[1].rotation.set(-.65,.12,-.35);
   rig.elbows[0].rotation.set(-1.1,0,.12);rig.elbows[1].rotation.set(-1.1,0,-.12);
  }else{
   rig.arms[0].rotation.set(0,0,-.08);rig.arms[1].rotation.set(0,0,2.6);
   rig.elbows[1].rotation.z=.85;
  }
 }
 rig.eyes.forEach(e=>{e.node.scale.y=e.y;});
 if(rig.breathing)rig.breathing.scale.y=rig.breathing.userData.restHeight||rig.breathing.scale.y;
}
export function animateCharacter(model,time,mode='idle',enabled=true){
 const rig=model.userData.rig;if(!rig)return;
 setCharacterPose(model,rig.pose);
 if(!enabled||mode==='still')return;
 const walking=mode==='walk',phase=time*6;
 rig.visual.position.y=walking?Math.abs(Math.sin(phase))*.045:Math.sin(time*1.8)*.012;
 if(walking){
  rig.arms.forEach((arm,i)=>{arm.rotation.set(Math.sin(phase+i*Math.PI)*.42,0,i===0?-.08:.08);});
  rig.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(phase+i*Math.PI)*.4;leg.rotation.z=0;});
  if(rig.detailed){rig.elbows.forEach(e=>e.rotation.x=-.14);rig.knees.forEach((k,i)=>k.rotation.x=Math.max(0,-Math.sin(phase+i*Math.PI))*.55);}
 }else{
  rig.head.rotation.y=Math.sin(time*.6)*.025;
  if(rig.breathing){const b=rig.breathing;b.userData.restHeight??=b.scale.y;b.scale.y=b.userData.restHeight*(1+Math.sin(time*1.8)*.009);}
 }
 // Brook has eye sockets, so there are no eyelids to blink.
 if(model.userData.character.design!=='brook'){
  const cycle=(time+model.userData.character.name.length*.19)%4.6;
  const openness=cycle<.16?Math.max(.04,Math.abs(cycle-.08)/.08):1;
  rig.eyes.forEach(e=>{e.node.scale.y=e.y*openness;});
 }
}

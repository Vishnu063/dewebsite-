import * as THREE from 'three';
import {piece} from './primitives.js';

const ink='#242a36',ivory='#f0ead9',steel='#bec7ce',gold='#e5bd60';
function part(root,name,kind,color,position,scale,rotation){
  const m=piece(root,kind,color,position,scale);m.name=name;
  if(rotation)m.rotation.set(...rotation);return m;
}
function line(root,name,color,a,b,r=.025){
  const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),mid=va.clone().add(vb).multiplyScalar(.5);
  const m=part(root,name,'cylinder',color,mid.toArray(),[r,va.distanceTo(vb),r]);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return m;
}
function spikes(root,color,{count=9,y=2.93,radius=.38,length=.48}={}){
  for(let n=0;n<count;n++){
    const a=n*Math.PI*2/count;
    part(root,'hair-spike','cone',color,[Math.cos(a)*radius,y+Math.sin(a)*.09,Math.sin(a)*radius*.7],[.17,length,.17],[Math.sin(a)*.7,0,-Math.cos(a)*.6]);
  }
}
function longHair(root,color){
  part(root,'back-hair','sphere',color,[0,2.32,-.19],[.47,.69,.35]);
  for(const s of [-1,1])part(root,'side-lock','sphere',color,[s*.37,2.48,.04],[.12,.49,.18]);
}
function band(root,color=ink,tilt=0){
 const group=new THREE.Group();group.name='forehead-protector';root.add(group);group.position.set(0,2.88,.28);group.rotation.z=tilt;
 part(group,'headband-cloth','box',color,[0,0,0],[.77,.18,.12]);
 part(group,'headband-plate','box',steel,[0,0,.075],[.42,.135,.03]);
 part(group,'engraved-emblem','ring','#636e77',[0,0,.095],[.052,.038,.018]);
 for(const s of [-1,1])part(group,'headband-knot','box',color,[s*.14,0,-.63],[.12,.38,.05],[.1,0,s*.3]);
}
function vest(root,color){
 for(const s of [-1,1]){
 part(root,'vest-panel','box',color,[s*.21,1.63,.29],[.37,.72,.16]);
 for(const y of [1.52,1.79])part(root,'vest-pocket','box',color,[s*.22,y,.39],[.23,.18,.06]);
 }
 part(root,'vest-collar','cylinder',color,[0,2.09,0],[.38,.2,.29]);
}
function eye(root,x,color=ink){
 part(root,'eye','sphere',color,[x,2.63,.401],[.049,.067,.035]);
 part(root,'eye-light','sphere',ivory,[x-.014,2.65,.429],[.013,.019,.009]);
}
function face(root,c){
 part(root,'head','sphere',c.skin,[0,2.62,0],[.43,.46,.37]);
 part(root,'hair-cap','sphere',c.hair,[0,2.88,-.07],[.45,.28,.35]);
 part(root,'face','sphere',c.skin,[0,2.61,.105],[.36,.35,.3]);
 for(const s of [-1,1]){
 part(root,'ear','sphere',c.skin,[s*.42,2.6,0],[.08,.13,.07]);eye(root,s*.14,c.design==='hinata'?'#e6e1f5':c.design==='itachi'?'#aa343b':ink);
 }
 line(root,'smile','#86584d',[-.06,2.43,.392],[.06,2.43,.392],.014);
 part(root,'nose','sphere',c.skin,[0,2.55,.401],[.047,.061,.065]);
}
function humanoid(root,c){
 const shorts=['sasuke','luffy','nami','robin','franky'].includes(c.design);
 const trousers=['naruto','rock-lee'].includes(c.design)?c.color:ink;
 for(const s of [-1,1]){
 part(root,'leg','cylinder',shorts?c.skin:trousers,[s*.2,.59,0],[.15,.85,.15]);
 part(root,'shoe','sphere',ink,[s*.2,.13,.09],[.2,.14,.31]);
 if(shorts)part(root,'shorts','cylinder',c.accent,[s*.2,.98,0],[.22,.42,.24]);
 part(root,'sleeve','sphere',c.color,[s*.49,1.66,0],[.16,.43,.18],[0,0,s*.12]);
 part(root,'forearm','cylinder',c.skin,[s*.54,1.18,.02],[.12,.35,.13]);
 part(root,'hand','sphere',c.skin,[s*.55,.96,.035],[.13,.15,.13]);
 }
 part(root,'torso','cylinder',c.color,[0,1.54,0],[.4,1.1,.27]);
 part(root,'neck','cylinder',c.skin,[0,2.18,0],[.13,.23,.13]);
 face(root,c);
}
function cloud(root,x,y,z){
 const g=new THREE.Group();g.name='red-cloud';root.add(g);g.position.set(x,y,z);
 part(g,'cloud-base','sphere','#c53a4a',[0,0,0],[.17,.075,.025]);
 for(const [x,y,r] of [[-.1,.035,.07],[0,.09,.1],[.12,.04,.075]])part(g,'cloud-lobe','sphere','#c53a4a',[x,y,0],[r,r,.03]);
}
function sword(root,x,y,z,angle=0){
 const g=new THREE.Group();g.name='sword';g.position.set(x,y,z);g.rotation.z=angle;root.add(g);
 part(g,'sword-sheath','cylinder','#41444d',[0,-.47,0],[.048,1.03,.048]);
 part(g,'sword-guard','box',gold,[0,.11,0],[.24,.045,.14]);
 part(g,'sword-hilt','cylinder','#eee4cf',[0,.29,0],[.05,.32,.05]);
 for(let i=0;i<4;i++)part(g,'hilt-wrap','ring','#625d71',[0,.19+i*.06,0],[.052,.052,.025],[Math.PI/2,0,0]);
}
function star(root,x,y,z,color,r=.13){
 for(let n=0;n<5;n++){const a=n*Math.PI*2/5;part(root,'star-point','cone',color,[x+Math.sin(a)*r*.45,y+Math.cos(a)*r*.45,z],[r*.36,r*1.2,.02],[0,0,-a]);}
}
function chopper(root,c){
 const fur='#b98d67';
 for(const s of [-1,1]){
 part(root,'short-leg','cylinder',fur,[s*.17,.29,0],[.12,.4,.12]);
 part(root,'hoof','box','#6e4e39',[s*.17,.12,.08],[.23,.2,.3]);
 part(root,'arm','sphere',fur,[s*.39,.94,0],[.13,.34,.13],[0,0,s*.3]);
 part(root,'hoof-hand','sphere','#6e4e39',[s*.47,.67,.02],[.12,.12,.13]);
 part(root,'antler','cylinder','#89613e',[s*.64,2.32,0],[.065,.72,.065],[0,0,-s*.5]);
 for(let n=0;n<2;n++)line(root,'antler-branch','#89613e',[s*(.54+n*.1),2.33+n*.17,0],[s*(.83+n*.04),2.46+n*.2,0],.048);
 part(root,'ear','sphere',fur,[s*.49,1.86,0],[.18,.12,.08]);
 }
 part(root,'shorts','sphere','#884c68',[0,.5,0],[.33,.25,.24]);
 part(root,'torso','sphere',fur,[0,.93,0],[.33,.5,.28]);
 part(root,'reindeer-head','sphere',fur,[0,1.77,0],[.49,.44,.37]);
 part(root,'muzzle','sphere','#d4b594',[0,1.62,.31],[.28,.2,.15]);
 for(const s of [-1,1])part(root,'eye','sphere',ink,[s*.17,1.8,.355],[.058,.08,.03]);
 part(root,'blue-nose','sphere','#5ba8ca',[0,1.68,.46],[.09,.06,.05]);
 part(root,'hat-brim','cylinder','#65b5d3',[0,2.12,0],[.71,.14,.57]);
 part(root,'hat-dome','sphere','#65b5d3',[0,2.3,-.04],[.57,.43,.48]);
 part(root,'pink-hat-panel','box','#cb718f',[0,2.28,.409],[.66,.43,.07]);
 for(const angle of [-Math.PI/4,Math.PI/4])part(root,'white-cross','box',ivory,[0,2.29,.46],[.09,.32,.025],[0,0,angle]);
}
function brook(root,c){
 for(const s of [-1,1]){
 line(root,'leg-bone',ivory,[s*.2,.17,0],[s*.2,1,0],.055);
 part(root,'shoe','sphere',ink,[s*.2,.12,.09],[.17,.12,.3]);
 part(root,'coat-tail','box',ink,[s*.26,1.05,-.12],[.28,.74,.18],[0,0,s*.16]);
 line(root,'sleeve',ink,[s*.39,1.98,0],[s*.55,1.23,0],.12);
 part(root,'bone-hand','sphere',ivory,[s*.56,1.14,0],[.09,.12,.06]);
 }
 part(root,'jacket','cylinder',ink,[0,1.67,0],[.34,.88,.24]);
 part(root,'shirt','box',ivory,[0,1.79,.24],[.25,.6,.05]);
 for(const s of [-1,1])part(root,'lapel','box',gold,[s*.18,1.89,.27],[.09,.42,.04],[0,0,-s*.32]);
 part(root,'cravat','sphere','#ac89ba',[0,2.08,.29],[.23,.15,.09]);
 part(root,'neck-bone','cylinder',ivory,[0,2.27,0],[.07,.3,.07]);
 part(root,'afro','sphere','#292631',[0,2.81,-.15],[.68,.65,.48]);
 for(let n=0;n<9;n++){const a=n*Math.PI*2/9;part(root,'afro-curl','sphere','#292631',[.5*Math.cos(a),2.81+.5*Math.sin(a),-.12],[.21,.21,.22]);}
 part(root,'skull','sphere',ivory,[0,2.76,.18],[.35,.4,.3]);
 for(const s of [-1,1])part(root,'eye-socket','sphere','#282830',[s*.14,2.83,.452],[.095,.12,.025]);
 part(root,'nose-socket','cone',ink,[0,2.66,.483],[.05,.09,.02],[0,0,Math.PI]);
 part(root,'jaw','box',ivory,[0,2.49,.24],[.41,.18,.31]);
 for(let n=0;n<5;n++)line(root,'teeth',ink,[-.15+n*.075,2.44,.405],[-.15+n*.075,2.55,.405],.009);
 part(root,'top-hat-brim','cylinder','#c47e40',[0,3.34,-.08],[.51,.08,.38]);
 part(root,'top-hat','cylinder',ink,[0,3.57,-.08],[.34,.42,.28]);
 line(root,'cane','#927454',[.69,.15,.1],[.69,1.65,.1],.027);
}
function jinbe(root,c){
 const blue='#78a7c2';
 part(root,'kimono','cone',c.color,[0,1.2,0],[.85,1.9,.57]);
 for(const s of [-1,1]){
 part(root,'wide-sleeve','sphere',c.color,[s*.76,1.55,0],[.34,.44,.35]);
 part(root,'blue-hand','sphere',blue,[s*.86,1.16,.08],[.21,.24,.2]);
 part(root,'sandal','sphere','#594b43',[s*.33,.12,.12],[.24,.12,.35]);
 part(root,'tusk','cone',ivory,[s*.27,2.39,.45],[.065,.24,.06]);
 }
 part(root,'blue-head','sphere',blue,[0,2.6,0],[.61,.55,.47]);
 part(root,'hair','sphere',ink,[0,2.93,-.19],[.55,.3,.42]);
 part(root,'topknot','sphere',ink,[0,3.27,-.14],[.18,.28,.16]);
 for(const s of [-1,1]){
 part(root,'sideburn','sphere',ink,[s*.48,2.56,.13],[.15,.33,.13]);
 part(root,'eye','sphere',ink,[s*.21,2.65,.436],[.05,.05,.026]);
 line(root,'eyebrow',ink,[s*.12,2.76,.438],[s*.31,2.78,.411],.035);
 }
 part(root,'muzzle','sphere',blue,[0,2.4,.26],[.39,.24,.29]);
 for(const s of [-1,1])part(root,'tusk','cone',ivory,[s*.27,2.4,.48],[.065,.27,.06]);
 part(root,'obi','cylinder','#55516d',[0,1.22,0],[.61,.25,.45]);
 for(const s of [-1,1])line(root,'kimono-collar','#ebdac3',[s*.48,2,.29],[-s*.18,1.34,.5],.07);
 for(let n=0;n<7;n++){const a=n*2.4;part(root,'kimono-pattern','crystal',c.accent,[.54*Math.cos(a),.5+(n%3)*.4,.45*Math.sin(a)],[.14,.19,.035],[0,-a,0]);}
}

export function makeAnimeCharacter(c){
 const root=new THREE.Group();root.name=c.id;root.userData.character=c;
 if(c.design==='chopper'){chopper(root,c);return root;}
 if(c.design==='brook'){brook(root,c);return root;}
 if(c.design==='jinbe'){jinbe(root,c);return root;}
 humanoid(root,c);
 switch(c.design){
 case 'naruto':
  spikes(root,c.hair);band(root);
  part(root,'black-shoulders','box',c.accent,[0,1.94,.03],[.81,.28,.56]);
  line(root,'zipper',steel,[0,1.08,.282],[0,2.06,.282],.018);
  for(const s of [-1,1])for(let n=0;n<3;n++)line(root,'whisker',ink,[s*.22,2.5+n*.065,.36],[s*.33,2.48+n*.065,.32],.009);
  part(root,'back-spiral','ring','#bb453d',[0,1.66,-.29],[.19,.19,.035]);break;
 case 'sasuke':
  spikes(root,c.hair,{count:7,y:2.91,length:.59});
  part(root,'high-collar','cylinder',c.color,[0,2.15,-.01],[.32,.31,.29]);
  part(root,'fan-crest-red','sphere','#bb3f47',[0,1.74,-.29],[.19,.13,.03]);
  part(root,'fan-crest-white','cone',ivory,[0,1.59,-.3],[.17,.19,.03],[0,0,Math.PI]);
  line(root,'fan-handle',ivory,[0,1.52,-.31],[0,1.4,-.31],.025);break;
 case 'sakura':
  for(const s of [-1,1])part(root,'pink-bob','sphere',c.hair,[s*.35,2.55,-.04],[.13,.36,.27]);
  part(root,'tunic-skirt','cone',c.color,[0,1.07,0],[.5,.66,.32]);
  line(root,'tunic-zip',ivory,[0,1.1,.3],[0,2.04,.3],.018);
  part(root,'forehead-diamond','crystal','#7e568d',[0,2.83,.34],[.035,.065,.015]);
  part(root,'back-circle','ring',ivory,[0,1.68,-.284],[.16,.16,.025]);break;
 case 'kakashi':
  spikes(root,c.hair,{count:8,y:3.0,length:.66});band(root,ink,-.17);vest(root,c.color);
  part(root,'face-mask','sphere',c.accent,[0,2.42,.25],[.35,.2,.22]);
  part(root,'covered-eye','box',ink,[-.16,2.72,.395],[.23,.23,.045],[0,0,-.17]);break;
 case 'hinata':
  longHair(root,c.hair);
  part(root,'blunt-fringe','box',c.hair,[0,2.85,.2],[.62,.18,.29]);
  part(root,'hood','ring',c.accent,[0,2.1,-.04],[.4,.3,.21],[Math.PI/2,0,0]);
  line(root,'hoodie-zip',ivory,[0,1.06,.282],[0,2.04,.282],.022);
  for(const s of [-1,1])line(root,'hood-cord',ivory,[s*.14,2.02,.3],[s*.15,1.72,.31],.015);break;
 case 'itachi':
  longHair(root,c.hair);band(root);
  part(root,'cloak','cone',c.color,[0,1.19,0],[.67,1.9,.44]);
  part(root,'red-collar','cylinder',c.accent,[0,2.14,0],[.43,.4,.34]);
  line(root,'cloak-trim',c.accent,[0,.27,.39],[0,2.08,.35],.025);
  for(const [x,y,z] of [[-.3,.8,.33],[.26,1.5,.33],[0,1.15,-.41],[-.32,1.72,-.31]])cloud(root,x,y,z);
  line(root,'scratched-headband',ink,[-.2,2.86,.38],[.2,2.9,.38],.012);break;
 case 'gaara':
  spikes(root,c.hair,{count:10,y:2.94,length:.28});
  part(root,'sand-gourd','sphere','#b89b68',[.27,1.68,-.5],[.42,.57,.33]);
  part(root,'gourd-neck','sphere','#b89b68',[.27,2.25,-.5],[.23,.28,.22]);
  part(root,'gourd-stopper','cylinder','#644b38',[.27,2.51,-.5],[.12,.13,.12]);
  line(root,'gourd-strap','#cbb58c',[-.36,2.02,.25],[.4,1.02,.25],.09);
  for(const s of [-1,1])part(root,'dark-eye-ring','ring','#65454a',[s*.14,2.63,.42],[.075,.085,.022]);
  for(let n=0;n<3;n++)line(root,'forehead-mark','#8d3037',[.16+n*.03,2.8,.34],[.2+n*.035,2.9,.3],.012);break;
 case 'shikamaru':
  vest(root,c.color);
  part(root,'hairline','sphere',c.hair,[0,2.93,-.08],[.42,.2,.34]);
  part(root,'ponytail','cone',c.hair,[0,3.26,-.23],[.22,.6,.2],[.3,0,0]);
  part(root,'hair-tie','ring','#747c65',[0,3.07,-.21],[.13,.13,.045],[Math.PI/2,0,0]);
  for(const s of [-1,1])for(let n=0;n<3;n++)line(root,'mesh-sleeve',steel,[s*.47,1.62-n*.12,.16],[s*.62,1.51-n*.12,.16],.008);break;
 case 'rock-lee':
  part(root,'bowl-hair','sphere',c.hair,[0,2.88,-.01],[.47,.3,.4]);
  part(root,'bowl-fringe','box',c.hair,[0,2.8,.25],[.73,.17,.25]);
  for(const s of [-1,1]){
   part(root,'leg-warmer','cylinder',c.accent,[s*.2,.42,0],[.19,.48,.2]);
   part(root,'wrist-wrap','cylinder',ivory,[s*.54,1.15,.02],[.137,.32,.14]);
   line(root,'bushy-eyebrow',ink,[s*.06,2.73,.4],[s*.24,2.75,.36],.035);
  }
  part(root,'red-belt','cylinder','#a83d43',[0,1.07,0],[.41,.16,.28]);break;
 case 'jiraiya':
  longHair(root,c.hair);spikes(root,c.hair,{count:12,y:2.98,length:.66});band(root,'#7f8b83');
  for(const s of [-1,1]){
   part(root,'forehead-horn','cone',steel,[s*.3,3.04,.2],[.09,.25,.09]);
   part(root,'red-coat-panel','box',c.color,[s*.31,1.3,.18],[.24,1.27,.4]);
   line(root,'red-face-line',c.color,[s*.15,2.55,.405],[s*.21,2.26,.29],.025);
  }
  part(root,'inner-robe','box',c.accent,[0,1.52,.29],[.36,.95,.08]);
  part(root,'scroll','cylinder','#916c67',[0,1.65,-.5],[.31,1.25,.31],[0,0,Math.PI/2]);
  for(const s of [-1,1])part(root,'scroll-cap','cylinder',ivory,[s*.66,1.65,-.5],[.35,.1,.35],[0,0,Math.PI/2]);break;
 case 'luffy':
  part(root,'bare-chest','box',c.skin,[0,1.63,.284],[.39,.9,.08]);
  part(root,'straw-hat-brim','cylinder','#d7b974',[0,3.03,0],[.69,.1,.55]);
  part(root,'straw-hat-dome','sphere','#d7b974',[0,3.13,-.04],[.44,.28,.37]);
  part(root,'red-hat-band','cylinder','#ad3d3d',[0,3.1,-.035],[.45,.12,.37]);
  for(const s of [-1,1])part(root,'shorts-cuff','cylinder',ivory,[s*.2,.79,0],[.23,.11,.24]);
  line(root,'cheek-scar',ink,[.18,2.5,.38],[.3,2.5,.34],.011);
  line(root,'chest-scar','#b77560',[-.12,1.7,.335],[.12,1.39,.335],.02);
  line(root,'chest-scar','#b77560',[.12,1.7,.335],[-.12,1.39,.335],.02);break;
 case 'zoro':
  spikes(root,c.hair,{count:9,y:2.94,length:.23});
  part(root,'haramaki','cylinder',c.accent,[0,1.08,0],[.43,.35,.3]);
  for(let n=0;n<3;n++)sword(root,-.6-n*.09,1.11,-.11+n*.1,-.18+n*.17);
  for(let n=0;n<3;n++)part(root,'gold-earring','ring',gold,[.45,2.54-n*.07,0],[.04,.065,.02]);
  line(root,'closed-eye-scar','#996c59',[.14,2.55,.4],[.14,2.76,.39],.016);break;
 case 'nami':
  longHair(root,c.hair);
  part(root,'orange-side-fringe','sphere',c.hair,[.19,2.87,.23],[.23,.18,.16]);
  part(root,'waist','cylinder',c.skin,[0,1.33,0],[.39,.28,.27]);
  for(const y of [1.69,1.88])part(root,'top-stripe','box',c.accent,[0,y,.283],[.79,.07,.04]);
  line(root,'weather-staff','#6aa1b9',[.77,.08,.1],[.77,2.6,.1],.035);
  for(const y of [.4,1.3,2.2])part(root,'staff-ring','sphere','#b9d1df',[.77,y,.1],[.065,.065,.065]);
  part(root,'shoulder-tattoo','ring','#4c7495',[.51,1.82,.15],[.06,.1,.025]);break;
 case 'usopp':
  part(root,'long-nose','cone',c.skin,[0,2.57,.64],[.075,.5,.075],[Math.PI/2,0,0]);
  part(root,'bandana','sphere','#c7af79',[0,2.98,-.02],[.47,.24,.38]);
  for(const s of [-1,1])part(root,'goggle','ring','#a67b4b',[s*.17,3.01,.28],[.14,.11,.06]);
  for(const s of [-1,1])part(root,'overall-strap','box',c.accent,[s*.22,1.83,.28],[.1,.55,.07]);
  part(root,'satchel','box','#785938',[-.55,1.08,.05],[.31,.43,.32]);
  line(root,'slingshot-handle','#6d573e',[.77,.85,.1],[.77,1.75,.1],.045);
  for(const s of [-1,1])line(root,'slingshot-fork','#6d573e',[.77,1.75,.1],[.77+s*.2,2.02,.1],.04);
  line(root,'slingshot-band','#a9b080',[.57,2.02,.1],[.97,2.02,.1],.015);break;
 case 'sanji':
  part(root,'blond-fringe','sphere',c.hair,[-.2,2.8,.27],[.25,.35,.17],[0,0,-.2]);
  part(root,'blue-shirt','box',c.accent,[0,1.84,.281],[.22,.45,.05]);
  for(const s of [-1,1]){
   part(root,'suit-lapel','box',c.color,[s*.15,1.8,.31],[.13,.51,.05],[0,0,-s*.3]);
   for(const y of [1.25,1.48])part(root,'gold-button','sphere',gold,[s*.14,y,.29],[.025,.025,.02]);
  }
  line(root,'tie',ink,[0,2.02,.325],[0,1.69,.325],.03);
  part(root,'curled-eyebrow','ring','#8b6c35',[.14,2.75,.38],[.055,.035,.02]);
  line(root,'goatee','#806d50',[-.055,2.33,.25],[.055,2.33,.25],.022);break;
 case 'robin':
  longHair(root,c.hair);
  part(root,'pink-skirt','cone',c.accent,[0,1.07,0],[.53,.53,.33]);
  part(root,'open-jacket','box',c.skin,[0,1.78,.282],[.26,.6,.04]);
  for(const s of [-1,1])part(root,'sunglasses','ring','#7396ab',[s*.16,2.99,.25],[.14,.1,.055]);
  line(root,'glasses-bridge',steel,[-.02,2.99,.29],[.02,2.99,.29],.02);break;
 case 'franky':
  part(root,'quiff','cone',c.hair,[0,3.1,.07],[.35,.65,.25],[-.4,0,0]);
  part(root,'bare-torso','box',c.skin,[0,1.53,.28],[.59,1.04,.07]);
  for(const s of [-1,1]){
   part(root,'large-shoulder','sphere',c.skin,[s*.6,1.93,0],[.28,.32,.3]);
   part(root,'mechanical-forearm','box',c.accent,[s*.68,1.25,.03],[.43,.64,.43]);
   part(root,'knuckle','box',steel,[s*.68,.91,.07],[.4,.18,.37]);
   star(root,s*.68,1.33,.26,'#3b6c9b',.16);
   part(root,'shirt-flower','sphere','#f1cf7f',[s*.32,1.94,.3],[.07,.07,.025]);
  }
  part(root,'chain','ring',gold,[0,1.95,.32],[.22,.19,.025]);
  part(root,'metal-nose','cone',steel,[0,2.56,.44],[.06,.16,.05],[Math.PI/2,0,0]);break;
 default:throw new Error(`Unknown anime design: ${c.design}`);
 }
 return root;
}

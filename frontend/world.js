import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeCharacter, piece, material } from './models.js';
import { BRIDGES, buildings, walkable } from './layout.js';
import {profileCamera} from './profile-camera.js';
import {animateCharacter,setCharacterPose} from './character-animation.js';

export class WorldView {
  constructor(host, world, options={}) {
    this.host=host;this.world=world;this.options=options;this.profile=!!options.profile;
    try {
    this.keys=new Set();this.touch={x:0,z:0};this.disposed=false;this.walk=false;
    this.motion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animationMode=this.motion?'idle':'still';
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(this.profile?'#e7e8de':'#c5d4d5');
    this.scene.fog=new THREE.Fog(this.profile?'#e7e8de':'#c5d4d5',this.profile?35:160,this.profile?70:330);
    this.camera=new THREE.PerspectiveCamera(42,1,.1,500);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    this.setQuality(options.quality||'standard');
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.setClearColor(this.scene.background);
    this.renderer.domElement.setAttribute('aria-label',this.profile?'Rotatable 3D character model':'Interactive three-dimensional Lantern Isles world');
    this.renderer.domElement.setAttribute('tabindex','0');host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight('#fff7e7','#657987',2.1));
    const sun=new THREE.DirectionalLight('#fff2d7',2.4);sun.position.set(-40,90,40);this.scene.add(sun);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minPolarAngle=this.profile?.001:0;this.controls.maxPolarAngle=this.profile?Math.PI-.001:Math.PI*.47;
    this.controls.minDistance=this.profile?3.8:7;this.controls.maxDistance=this.profile?13:290;
    this.controls.enablePan=!this.profile;this.controls.target.set(0,this.profile?1.25:0,0);
    this.actors=[];this.obstacles=[];
    if(this.profile) {
      const actor=makeCharacter(options.character);this.scene.add(actor);this.actors.push(actor);
      this.updateProfileBounds(actor);
      this.profileAngle='front';
      this.camera.position.set(4.2,2.7,5.8);
      this.controls.autoRotate=this.motion;this.controls.autoRotateSpeed=.65;
    } else {
      this.buildWorld();this.camera.position.set(125,125,155);
      this.player=new THREE.Group();
      piece(this.player,'sphere','#f9e8b6',[0,1.05,0],[.34,.4,.34]);
      piece(this.player,'cone','#527e78',[0,.53,0],[.38,.8,.35]);
      const marker=piece(this.player,'crystal','#ffe4a0',[0,1.9,0],[.12,.22,.12]);
      this.player.position.set(world.regions[0].x+7,2,world.regions[0].z+5);this.player.visible=false;this.scene.add(this.player);
      this.selection=piece(this.scene,'ring','#ffdf92',[0,2.04,0],[1.05,1.05,.25]);this.selection.rotation.x=-Math.PI/2;this.selection.visible=false;
    }
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.down=e=>{this.pointerStart={x:e.clientX,y:e.clientY};};
    this.up=e=>{
      if(this.profile||!this.pointerStart||Math.hypot(e.clientX-this.pointerStart.x,e.clientY-this.pointerStart.y)>6)return;
      const bounds=this.renderer.domElement.getBoundingClientRect();
      this.pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);
      this.raycaster.setFromCamera(this.pointer,this.camera);
      const hit=this.raycaster.intersectObjects(this.actors,true)[0];
      if(hit){let object=hit.object;while(object&&!object.userData.character)object=object.parent;
        if(object){this.touring=false;this.focusCharacter(object.userData.character);options.onSelect?.(object.userData.character);}}
    };
    this.keydown=e=>{
      if(this.profile||!this.walk||/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName)||e.metaKey||e.ctrlKey)return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}
    };
    this.keyup=e=>this.keys.delete(e.code);this.blur=()=>{this.keys.clear();this.touch={x:0,z:0};};
    this.contextLost=e=>{e.preventDefault();this.options.onError?.(new Error('graphics-context-lost'));};
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    this.renderer.domElement.addEventListener('pointerdown',this.down);this.renderer.domElement.addEventListener('pointerup',this.up);
    window.addEventListener('keydown',this.keydown);window.addEventListener('keyup',this.keyup);window.addEventListener('blur',this.blur);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
    this.last=performance.now();this.elapsed=0;this.nextStop=0;
    this.animate=this.animate.bind(this);this.frame=requestAnimationFrame(this.animate);
    } catch(error) {this.dispose();throw error;}
  }

  setQuality(quality) {
    if(!['low','standard'].includes(quality))throw new Error('Unknown render quality');
    this.quality=quality;this.frameInterval=1000/(quality==='low'?20:30);
    this.renderer.setPixelRatio(quality==='low'?Math.min(window.devicePixelRatio||1,.85):Math.min(window.devicePixelRatio||1,1.5));
  }

  buildWorld() {
    const {regions,characters}=this.world;
    this.obstacles=buildings(regions);
    regions.forEach((r,index)=>{
      const land=new THREE.Mesh(new THREE.CylinderGeometry(r.radius,r.radius*.58,8,40),material('#8d9593'));
      land.position.set(r.x,-2,r.z);this.scene.add(land);
      const top=piece(this.scene,'cylinder',r.ground,[r.x,1.95,r.z],[r.radius,.18,r.radius]);
      const path=piece(this.scene,'ring','#d9cfb5',[r.x,2.08,r.z],[13,13,.35]);path.rotation.x=-Math.PI/2;
      // Each isle has its own landmark and environment language.
      if(index===0) {
        piece(this.scene,'cylinder','#ede4cb',[r.x,5,r.z],[2.5,6,2.5]);
        piece(this.scene,'cone','#b87b66',[r.x,9,r.z],[3.1,2.5,3.1]);
        piece(this.scene,'sphere','#ffd996',[r.x,7,r.z+2.45],[.7,.8,.2]);
      } else if(index===1) {
        piece(this.scene,'cylinder','#897e70',[r.x,6,r.z],[1.2,8,1.2]);
        for(let n=0;n<6;n++){const a=n*Math.PI/3;piece(this.scene,'sphere','#c5d5b4',[r.x+3*Math.cos(a),10+(n%2),r.z+3*Math.sin(a)],[4,3.2,4]);}
      } else {
        piece(this.scene,'cylinder','#8d8195',[r.x,3,r.z],[4,2,4]);
        for(let n=0;n<5;n++){const a=n*Math.PI*2/5;const shard=piece(this.scene,'crystal',n%2?'#bfacd4':'#d6c8e7',[r.x+3*Math.cos(a),5+n*.6,r.z+3*Math.sin(a)],[1.5,4+n*.5,1.5]);shard.rotation.z=(n-2)*.14;}
      }
      for(let n=0;n<14;n++){
        const a=n*2.399+index,radius=17+(n%4)*1.3,x=r.x+Math.cos(a)*radius,z=r.z+Math.sin(a)*radius;
        // Keep bridge approaches open; trees are decorative, not hard walls.
        if(BRIDGES.some(([ai,bi])=>{const a=regions[ai],b=regions[bi];return Math.abs((b.z-a.z)*(x-a.x)-(b.x-a.x)*(z-a.z))/Math.hypot(b.x-a.x,b.z-a.z)<3;}))continue;
        piece(this.scene,'cylinder','#8e8068',[x,3.2,z],[.25,2.2,.25]);
        if(index===2)piece(this.scene,'crystal',n%2?'#c1add2':'#dad1e0',[x,5,z],[1,2.6,1]);
        else piece(this.scene,index===0?'cone':'sphere',index===0?'#729783':'#b6d1bf',[x,5.2,z],[1.7,2.7,1.7]);
      }
      for(let n=0;n<7;n++){const a=n*2.4;piece(this.scene,'sphere','#b0bdc1',[r.x+Math.cos(a)*25,-5-n%3,r.z+Math.sin(a)*25],[4,1.3,3]);}
    });
    this.obstacles.forEach(o=>{
      const r=regions[o.region];
      piece(this.scene,'box',o.region===2?'#d1c7d6':'#ede4ce',[o.x,3.5,o.z],[3.2,3,3.2]);
      const roof=piece(this.scene,'cone',r.color,[o.x,5.8,o.z],[2.8,2.3,2.8]);roof.rotation.y=Math.PI/4;
      piece(this.scene,'box','#596a69',[o.x,3.1,o.z+1.61],[.8,1.8,.05]);
      piece(this.scene,'box','#f4d898',[o.x+1,4.1,o.z+1.62],[.5,.6,.06]);
    });
    // Landmark footprints are also blocked in walking mode.
    regions.forEach((r,i)=>this.obstacles.push({x:r.x,z:r.z,radius:i===1?2:4.2}));
    BRIDGES.forEach(([ai,bi])=>{
      const a=regions[ai],b=regions[bi],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
      const bridge=new THREE.Group();bridge.position.set((a.x+b.x)/2,2,(a.z+b.z)/2);bridge.rotation.y=angle;
      piece(bridge,'box','#c0a484',[0,0,0],[4,.3,length]);
      for(const side of [-1,1]){
        piece(bridge,'box','#8b806c',[side*2,1.1,0],[.14,.16,length]);
        for(let z=-length/2;z<length/2;z+=4)piece(bridge,'box','#8b806c',[side*2,.55,z],[.18,1.2,.18]);
      }
      this.scene.add(bridge);
    });
    characters.forEach((c,index)=>{
      const actor=makeCharacter(c);actor.position.set(c.x,2,c.z);actor.rotation.y=-.35+index*.7;
      actor.userData.index=index;this.actors.push(actor);this.scene.add(actor);
      const plinth=piece(this.scene,'cylinder','#d4ceb8',[c.x,2.05,c.z],[.95,.12,.95]);
    });
  }

  resize() {
    const width=this.host.clientWidth,height=this.host.clientHeight;
    if(!width||!height)return;
    this.camera.aspect=width/height;this.camera.fov=this.profile?42:(width/height<.85?62:42);this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false);
    if(this.profile)this.setProfileAngle(this.profileAngle,false);
  }
  updateProfileBounds(actor) {
    actor.updateMatrixWorld(true);
    actor.traverse(node=>{if(node.isSkinnedMesh){node.skeleton.update();node.computeBoundingBox();node.computeBoundingSphere();}});
    this.profileBounds=new THREE.Box3().setFromObject(actor).expandByScalar(.18);
  }
  setProfilePose(pose) {
    if(!this.profile)return;
    const actor=this.actors[0];setCharacterPose(actor,pose);
    this.updateProfileBounds(actor);
    this.setProfileAngle(this.profileAngle,false);
  }
  setProfileAnimation(mode) {
    if(!['still','idle','walk'].includes(mode))throw new Error('Unknown animation');
    this.animationMode=mode;
    if(this.profile){const actor=this.actors[0];setCharacterPose(actor,actor.userData.rig?.pose||'neutral');}
  }
  setProfileBackground(name) {
    if(!this.profile)return;
    const colors={studio:'#e7e8de',white:'#f8f8f5',night:'#202c39'};
    if(!colors[name])throw new Error('Unknown background');
    this.scene.background.set(colors[name]);this.scene.fog.color.set(colors[name]);
    this.renderer.setClearColor(this.scene.background);
  }
  setProfileAngle(angle,pause=true) {
    if(!this.profile)return;
    const view=profileCamera(this.profileBounds,angle,this.camera.aspect,this.camera.fov);
    this.profileAngle=angle;this.destination=null;
    // Flush previous orbit inertia before applying an exact camera preset.
    const damping=this.controls.enableDamping;this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=damping;
    this.camera.position.copy(view.position);this.controls.target.copy(view.target);
    this.controls.minDistance=Math.max(.8,view.distance*.32);this.controls.maxDistance=view.distance*2.5;
    if(pause){this.motion=false;this.controls.autoRotate=false;}
    this.camera.lookAt(view.target);this.controls.update();
  }
  go(position,target) {this.destination={position:new THREE.Vector3(...position),target:new THREE.Vector3(...target)};}
  overview() {
    if(this.profile)return;this.setWalking(false);this.touring=false;
    this.go([125,125,155],[0,0,0]);
  }
  travel(regionId) {
    const r=this.world.regions.find(r=>r.id===regionId);if(!r)return;
    this.touring=false;
    this.player.position.set(r.x+7,2,r.z+5);
    if(this.walk){const p=this.player.position;this.go([p.x+8,10,p.z+12],[p.x,3.3,p.z]);}
    else this.go([r.x+25,30,r.z+33],[r.x,2,r.z]);
  }
  focusCharacter(c) {
    if(this.profile)return;
    if(this.walk){
      const offset=[[2,2],[-2,2],[2,-2],[-2,-2],[0,0]].find(([x,z])=>walkable(c.x+x,c.z+z,this.world.regions,this.obstacles));
      if(offset)this.player.position.set(c.x+offset[0],2,c.z+offset[1]);
    }
    this.selection.position.set(c.x,2.15,c.z);this.selection.visible=true;
    this.go([c.x+6,6.5,c.z+8],[c.x,3.1,c.z]);
  }
  setWalking(value) {
    if(this.profile)return;
    this.walk=value;this.player.visible=value;this.keys.clear();this.touch={x:0,z:0};this.touring=false;
    if(value){const p=this.player.position;this.go([p.x+8,10,p.z+12],[p.x,3.3,p.z]);}
    this.options.onWalk?.(value);
  }
  tour() {const was=this.touring;this.setWalking(false);this.touring=!was;this.nextStop=0;return this.touring;}
  toggleMotion() {this.motion=!this.motion;if(this.profile)this.controls.autoRotate=this.motion;return this.motion;}
  animate(now) {
    if(this.disposed)return;
    this.frame=requestAnimationFrame(this.animate);
    if(now-this.last<this.frameInterval)return;
    const dt=Math.min((now-this.last)/1000,.05);this.last=now;
    if(document.hidden)return;
    this.elapsed+=dt;
    if(this.destination){this.camera.position.lerp(this.destination.position,Math.min(1,dt*3));this.controls.target.lerp(this.destination.target,Math.min(1,dt*3));if(this.camera.position.distanceTo(this.destination.position)<.08)this.destination=null;}
    if(this.touring&&this.elapsed>=this.nextStop){const c=this.world.characters[Math.floor(this.elapsed/6)%this.world.characters.length];this.focusCharacter(c);this.options.onSelect?.(c);this.nextStop=this.elapsed+6;}
    if(this.walk&&!this.destination){
      const x=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.touch.x;
      const z=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-this.touch.z;
      if(x||z){
        const forward=new THREE.Vector3();this.camera.getWorldDirection(forward);forward.y=0;forward.normalize();
        const right=new THREE.Vector3(-forward.z,0,forward.x),move=forward.multiplyScalar(z).add(right.multiplyScalar(x)).normalize().multiplyScalar(dt*8);
        const p=this.player.position,old=p.clone();
        if(walkable(p.x+move.x,p.z,this.world.regions,this.obstacles))p.x+=move.x;
        if(walkable(p.x,p.z+move.z,this.world.regions,this.obstacles))p.z+=move.z;
        this.player.rotation.y=Math.atan2(move.x,move.z);const offset=p.clone().sub(old);
        this.camera.position.add(offset);this.controls.target.add(offset);
      }
    }
    this.actors.forEach((a,i)=>{
      if(a.userData.rig)animateCharacter(a,this.elapsed+i*.27,this.animationMode,this.profile||this.motion);
      else a.rotation.z=this.motion?Math.sin(this.elapsed*1.1+i)*.025:0;
    });
    try {
      this.controls.update(dt);this.renderer.render(this.scene,this.camera);
      if(!this.ready){this.ready=true;this.options.onReady?.();}
    }catch(error){this.options.onError?.(error);}

  }
  dispose() {
    if(this.disposed)return;
    this.disposed=true;cancelAnimationFrame(this.frame);this.observer?.disconnect();this.controls?.dispose();
    if(this.keydown)window.removeEventListener('keydown',this.keydown);
    if(this.keyup)window.removeEventListener('keyup',this.keyup);
    if(this.blur)window.removeEventListener('blur',this.blur);
    if(this.down)this.renderer?.domElement.removeEventListener('pointerdown',this.down);
    if(this.up)this.renderer?.domElement.removeEventListener('pointerup',this.up);
    if(this.contextLost)this.renderer?.domElement.removeEventListener('webglcontextlost',this.contextLost);
    this.scene?.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
    this.renderer?.dispose();this.renderer?.domElement.remove();
  }
}

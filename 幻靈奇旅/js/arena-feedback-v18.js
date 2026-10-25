/* Shared lightweight Three.js contact flashes: pooled, image-free and bounded. */
(()=>{'use strict';function create(T,parent){
 const root=new T.Group();root.name='arena-contact-feedback';parent.add(root);
 const ring=new T.TorusGeometry(1,.055,6,32),core=new T.SphereGeometry(1,12,8),materials=new Map(),free=[],active=[];
 const palette={fire:0xff934f,water:0x66d9ff,grass:0x8ff7ba,electric:0xffdd72,ice:0xa6e9ff,psychic:0xceabff,fairy:0xffb4de,normal:0xffe1b0,dark:0xa998ec,dragon:0x62ccff};
 const metrics={hits:0,normal:0,ultimate:0,allocated:0,active:0,maxEffects:24,maxMeshes:72,images:0,last:null};let disposed=false;
 function material(color){if(!materials.has(color))materials.set(color,new T.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));return materials.get(color);}
 function release(e){root.remove(e.group);e.group.visible=false;free.push(e);}
 function impact(point,ev={}){if(disposed)return;if(root.parent!==parent)parent.add(root);if(active.length>=24)release(active.shift());let e=free.pop();if(!e){const g=new T.Group();e={group:g,ring:new T.Mesh(ring),cross:new T.Mesh(ring),core:new T.Mesh(core)};g.add(e.ring,e.cross,e.core);metrics.allocated+=3;}e.age=0;e.strong=!!ev.strong;e.duration=e.strong?.46:.25;e.group.visible=true;e.group.position.copy(point);const color=palette[ev.element]||0xb9ecff;e.ring.material=e.cross.material=material(color);e.core.material=material(0xf4fbff);e.ring.rotation.set(Math.PI/2,.3,0);e.cross.rotation.set(.2,Math.PI/3,.4);root.add(e.group);active.push(e);metrics.hits++;metrics[e.strong?'ultimate':'normal']++;metrics.last={x:point.x,y:point.y,z:point.z,strong:e.strong,speciesId:ev.speciesId};}
 function update(dt){if(disposed)return;for(let i=active.length-1;i>=0;i--){const e=active[i];e.age+=Math.max(0,dt);const t=e.age/e.duration;if(t>=1){release(e);active.splice(i,1);continue;}const size=(e.strong?1:.55)*(.15+t*.95);e.ring.scale.setScalar(size);e.cross.scale.setScalar(size*.75);e.cross.rotation.z+=dt*5;e.core.scale.setScalar((e.strong?.18:.1)*Math.sin(Math.PI*t));}metrics.active=active.length;}
 function clear(){while(active.length)release(active.pop());metrics.active=0;}
 function dispose(){if(disposed)return;clear();disposed=true;parent.remove(root);ring.dispose();core.dispose();materials.forEach(m=>m.dispose());materials.clear();free.length=0;}
 return{impact,update,clear,dispose,metrics};}window.PhantomArenaFeedback={create};})();

import {costumeFor} from './costume-effects.js?v=20261025-v24';
export function createCostumeView(T,scene,hero,costumes,{makeCompanion,prepareSound,releaseActor,metrics,onError}){
 const anchor=new T.Group(),tilt=new T.Group();anchor.name='衣櫃漂浮';tilt.position.y=1.1;hero.object.position.y-=1.1;hero.root.add(anchor);anchor.add(tilt);tilt.add(hero.object);
 const pulse=new T.Mesh(new T.TorusGeometry(1,.035,6,64),new T.MeshBasicMaterial({color:0xffdc81,transparent:true,opacity:0,depthWrite:false}));pulse.rotation.x=-Math.PI/2;pulse.visible=false;scene.add(pulse);
 let soundReady=false,id='',hover=0,lean=0,companion,pending=false,attempted=false,disposed=false,lastHero={x:0,z:0},lastRun='';
 function update(run,dt){const h=run?.hero||{x:0,z:0},s=costumeFor(run?.costumeId);lastHero=h;if(id!==s.id){id=s.id;costumes.apply(hero.object,id);if(id==='sound'&&!soundReady){soundReady=true;prepareSound().then(()=>{if(!disposed&&id==='sound')costumes.apply(hero.object,id);}).catch(onError);}}
  const moving=id==='sound'&&h.moving&&!h.roll&&h.hp>0,ease=1-Math.exp(-dt*7);hover+=((moving?.48+.055*Math.sin((run?.time||0)*6.2):0)-hover)*ease;lean+=((moving?.24:0)-lean)*ease;anchor.position.y=hover;tilt.rotation.x=lean;tilt.rotation.z=moving?.025*Math.sin((run?.time||0)*6):0;costumes.update(hero.object,dt);
  if(id==='mist'&&!attempted&&!pending){pending=true;attempted=true;makeCompanion().then(a=>{pending=false;if(disposed){releaseActor(a);return;}companion=a;a.root.name='衣櫃・小飯團同行';a.root.position.set(lastHero.x-1.4,0,lastHero.z+1.2);scene.add(a.root);}).catch(onError);}
  if(companion){companion.root.visible=id==='mist'&&h.hp>0;if(companion.root.visible){const x=h.x-Math.sin(h.heading||0)*1.45-1,z=h.z-Math.cos(h.heading||0)*1.45,d=Math.hypot(x-companion.root.position.x,z-companion.root.position.z);if(d>8||lastRun!==run.id)companion.root.position.set(x,0,z);else{const step=Math.min(1,dt*5);companion.root.position.x+=(x-companion.root.position.x)*step;companion.root.position.z+=(z-companion.root.position.z)*step;}companion.root.rotation.y=Math.atan2(x-companion.root.position.x,z-companion.root.position.z);companion.tick(dt,{hp:1,moving:h.moving});}}
  const age=(run?.time||0)-(run?.costumePulseAt??-100);pulse.visible=id==='adventure'&&age>=0&&age<.8;if(pulse.visible){pulse.position.set(h.x,.05,h.z);pulse.scale.setScalar(1+age*10);pulse.material.opacity=(1-age/.8)*.65;}
  lastRun=run?.id;metrics.costume={id,name:s.name,description:s.description,hover,lean,companionVisible:!!companion?.root.visible,butterflyVisible:!!hero.object.getObjectByName('小山套裝環繞蝴蝶')?.visible,absorbing:(run?.pickups||[]).filter(p=>p.costumePull).length};
 }
 function reset(){hover=lean=0;anchor.position.y=0;tilt.rotation.set(0,0,0);pulse.visible=false;lastRun='';}
 return{update,reset,dispose(){disposed=true;if(companion){scene.remove(companion.root);releaseActor(companion);}costumes.dispose(hero.object);scene.remove(pulse);pulse.geometry.dispose();pulse.material.dispose();}};
}

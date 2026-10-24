// Presentation methods preserved from the existing Starspire Tower snapshot. No tower state/save code.
const T=globalThis.THREE;
export class TowerFX {constructor(scene){this.dynamic=new T.Group();scene.add(this.dynamic);this.visualFX=[];this.geometries=new Map();this.shake=0;this.specialBeam=new T.Mesh(new T.CylinderGeometry(.6,1.8,18,12,1,true),new T.MeshBasicMaterial({color:0xffedb0,transparent:true,opacity:.6,side:T.DoubleSide,blending:T.NormalBlending,toneMapped:false,depthWrite:false}));this.dynamic.add(this.specialBeam);this.specialRings=Array.from({length:3},()=>{const r=new T.Mesh(this.fxGeo('ring'),new T.MeshBasicMaterial({color:0xffdb88,transparent:true,opacity:.8,side:T.DoubleSide,blending:T.NormalBlending,toneMapped:false,depthWrite:false}));r.rotation.x=-Math.PI/2;this.dynamic.add(r);return r;});this.ultimateTime=0;}
 ultimate(x,z,weapon){this.ultimateDuration=[1.15,1.45,1.65,1.1][weapon];this.ultimateTime=this.ultimateDuration;this.ultimateWeapon=weapon;this.ultimateX=x;this.ultimateZ=z;this.shake=.4;const color=[0xffdc80,0x64edee,0xc49cff,0x39ff8a][weapon];this.specialBeam.material.color.setHex(color);this.specialRings.forEach(r=>r.material.color.setHex(color));this.fxRing(x,z,color,weapon===0?2.4:3.2,.8,.55);}

 fxGeo(kind){const key='fx:'+kind;if(!this.geometries.has(key))this.geometries.set(key,kind==='ring'?new T.RingGeometry(.72,1,32):kind==='arc'?new T.RingGeometry(1.6,2.04,32,1,.2,Math.PI*1.4):kind==='arrow'?new T.ConeGeometry(.13,1.85,5):new T.IcosahedronGeometry(.19,0));return this.geometries.get(key);}
 addFX(mesh,life,options={}){this.dynamic.add(mesh);this.visualFX.push({mesh,life,max:life,velocity:options.velocity||[0,0,0],kind:options.kind||'particle',size:options.size||1,spin:options.spin||0,opacity:(mesh.material.opacity??1)*.86});}
 fxRing(x,z,color,radius=3,life=.55,opacity=.8){const mesh=new T.Mesh(this.fxGeo('ring'),new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,blending:T.NormalBlending,toneMapped:false,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.28,z);mesh.scale.setScalar(radius);this.addFX(mesh,life,{kind:'ring',size:radius});}
 fxArc(x,z,color,angle=0,scale=1,life=.3){const mesh=new T.Mesh(this.fxGeo('arc'),new T.MeshBasicMaterial({color,transparent:true,opacity:.93,side:T.DoubleSide,blending:T.NormalBlending,toneMapped:false,depthWrite:false}));mesh.position.set(x,1.1,z);mesh.rotation.set(-.3,angle,angle);mesh.scale.setScalar(scale);this.addFX(mesh,life,{kind:'arc',size:scale,spin:angle<0?-4:4});}
 fxShard(x,z,color,opts={}){const arrow=opts.arrow===true;const mesh=new T.Mesh(this.fxGeo(arrow?'arrow':'shard'),new T.MeshBasicMaterial({color,transparent:true,opacity:.95,blending:T.NormalBlending,toneMapped:false,depthWrite:false}));const a=opts.angle??Math.random()*Math.PI*2,speed=opts.speed??(2+Math.random()*5);mesh.position.set(x+(Math.random()-.5)*.9,arrow?10+Math.random()*3:.55+Math.random()*1.8,z+(Math.random()-.5)*.9);if(arrow)mesh.rotation.x=Math.PI;this.addFX(mesh,arrow?.65:.55,{kind:arrow?'arrow':'shard',velocity:arrow?[0,-24-Math.random()*3,0]:[Math.cos(a)*speed,4+Math.random()*4,Math.sin(a)*speed],size:1,spin:(Math.random()-.5)*6});}
 fxBurst(x,z,color,count=12,speed=5){for(let i=0;i<count;i++)this.fxShard(x,z,i%4===0?0xffffff:color,{angle:i/count*Math.PI*2,speed});}

 normal(ev){const {kind,x,z,heading:a}=ev;const colors={sword:0xffa322,blades:0x00eaff,guns:0xbc42ff,knife:0x37ff85},color=colors[kind]||0xffd979;
 if(kind==='guns'){for(const side of [-1,1]){const m=new T.Mesh(this.fxGeo('arrow'),new T.MeshBasicMaterial({color,transparent:true,opacity:.96,blending:T.NormalBlending,toneMapped:false,depthWrite:false}));m.position.set(x+Math.cos(a)*side*.35,1.2,z-Math.sin(a)*side*.35);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.sin(a),0,Math.cos(a)));this.addFX(m,.38,{kind:'bullet',velocity:[Math.sin(a)*30,0,Math.cos(a)*30]});}this.fxBurst(x+Math.sin(a)*.5,z+Math.cos(a)*.5,color,3,1);}
 else if(kind==='blades'){this.fxArc(x+.3,z,color,a+.65,.85,.24);this.fxArc(x-.3,z,0x28a8ff,a-.65,.85,.24);}
 else if(kind==='knife'){this.fxArc(x+Math.sin(a),z+Math.cos(a),color,a,1,.2);this.fxArc(x,z,0xd7ff72,a+.2,.6,.16);}
 else{this.fxArc(x,z,color,a,1.3,.36);this.fxBurst(x+Math.sin(a)*2,z+Math.cos(a)*2,0xff6a22,5,3);}}
 ultimateStrike(ev){const {weapon,index,x,z}=ev;
  if(weapon===0){this.fxArc(x+(index-1)*.35,z,0xffd979,index%2?-.75:.8,1.7,.4);this.fxArc(x,z,0xfff4c9,index%2?.5:-.5,1.25,.3);this.fxRing(x,z,0xfab55b,3.3,.55,.7);this.fxBurst(x,z,0xffc16a,11,7);this.shake=Math.max(this.shake,.42);}
  else if(weapon===1){this.fxArc(x+(index%2?-.75:.75),z,0x73f7ff,index%2?-.85:.85,.95,.22);this.fxArc(x,z,0xd2ffff,index%2?.9:-.9,.52,.19);if(index%3===0)this.fxRing(x,z,0x4bb8fa,2.4,.35,.7);this.fxBurst(x,z,0x57dbec,4,9);this.shake=Math.max(this.shake,.16);}
  else if(weapon===3){this.fxArc(x,z,0x39ff8a,index%2?-.95:.95,1.25,.26);this.fxArc(x,z,0xffffff,index%2?.5:-.5,.8,.18);if(index===4)this.fxRing(x,z,0x30e667,3,.5,.7);this.fxBurst(x,z,0xb4ff55,6,8);this.shake=Math.max(this.shake,.24);}
  else{this.fxRing(x,z,0xb897ff,1.8,.35,.65);for(let j=0;j<3;j++)this.fxShard(x+(j-1)*.6,z+(index%3-1)*.4,0xf3d9ff,{arrow:true});this.fxBurst(x,z,0xb58bff,4,4);this.shake=Math.max(this.shake,.18);}
 }

 updateVisualFX(dt){  this.ultimateTime=Math.max(0,(this.ultimateTime||0)-dt);this.specialBeam.visible=this.ultimateTime>0&&this.ultimateWeapon===0;const specialProgress=1-this.ultimateTime/(this.ultimateDuration||1.15);if(this.ultimateTime>0){this.specialBeam.position.set(this.ultimateX,8,this.ultimateZ);this.specialBeam.scale.set(1+Math.sin(specialProgress*Math.PI)*2,1,1+Math.sin(specialProgress*Math.PI)*2);this.specialBeam.material.opacity=(1-specialProgress)*.24;}this.specialRings.forEach((r,i)=>{r.visible=this.ultimateTime>0;if(r.visible){r.position.set(this.ultimateX,.3+i*.2,this.ultimateZ);r.scale.setScalar(1+((specialProgress+i*.22)%1)*4.5);r.material.opacity=(1-specialProgress)*.4;}});for(let i=this.visualFX.length-1;i>=0;i--){const v=this.visualFX[i],o=v.mesh;v.life-=dt;const t=Math.min(1,Math.max(0,1-v.life/v.max));o.material.opacity=v.opacity*(1-t);
   if(v.kind==='ring')o.scale.setScalar(v.size*(.55+t*1.8));
   else if(v.kind==='arc'){o.rotation.z+=v.spin*dt;o.scale.setScalar(v.size*(1+t*.55));}
   else{const d=v.velocity;o.position.x+=d[0]*dt;o.position.y+=d[1]*dt;o.position.z+=d[2]*dt;if(v.kind==='shard'){d[1]-=16*dt;o.rotation.z+=v.spin*dt;}if(v.kind==='arrow'){o.scale.setScalar(1.2-t*.6);if(o.position.y<=.6){if(Math.random()<.4)this.fxRing(o.position.x,o.position.z,0xd3abff,.8,.24,.8);v.life=0;}}}
   if(v.life<=0){this.dynamic.remove(o);o.material.dispose();this.visualFX.splice(i,1);}
  }
 }


dispose(){for(const f of this.visualFX)f.mesh.material.dispose();this.geometries.forEach(g=>g.dispose());this.dynamic.parent?.remove(this.dynamic);}
}
export {TOWER_ULTIMATES} from './tower-ultimates.js';

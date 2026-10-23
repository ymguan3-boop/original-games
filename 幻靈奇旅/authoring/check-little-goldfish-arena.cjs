/* Run: node authoring/check-little-goldfish-arena.cjs
 * Regression: live GLB Attack/Ultimate clips, catalog mappings, arena plan,
 * original 0.6s water bullet / 1.3–3.2s thin-column cues and FX disposal.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const original=read('authoring/water-spirits/spirits.js'),code=read('js/game.js'),combat=read('js/spirit-combat.js'),catalog=JSON.parse(read('data/spirit-catalog.json'));
const glb=fs.readFileSync(path.join(root,'models/spirits/goldfish-1.glb'));
assert.equal(glb.toString('ascii',0,4),'glTF');
const jsonLength=glb.readUInt32LE(12),meta=JSON.parse(glb.toString('utf8',20,20+jsonLength));
const clips=Object.fromEntries(meta.animations.map(a=>[a.name,a]));
const duration=name=>{
 const c=clips[name];assert(c,'Missing native '+name+' clip in shipped goldfish GLB');
 return Math.max(...c.samplers.map(x=>meta.accessors[x.input].max[0]));
};
assert(Math.abs(duration('Attack')-1.6)<.03);
assert(Math.abs(duration('Ultimate')-3.8)<.03);
assert(clips.Attack.channels.length>0&&clips.Ultimate.channels.length>0);
assert(original.includes("fx: [[0.6, 'bullet'"));
assert(original.includes("[1.3, 'beam'"));
assert(original.includes("[3.2, 'ripple'"));
const entry=catalog.entries.find(e=>e.id==='kyogre');assert(entry);
assert.equal(entry.skills[0].animation,'Attack');assert.equal(entry.skills[1].animation,'Ultimate');
assert.equal(entry.skills[0].duration,1.6);assert.equal(entry.skills[1].duration,3.8);
const sandbox={window:{}};vm.runInNewContext(combat,sandbox);
const action=name=>({getClip:()=>({duration:duration(name)}),getEffectiveTimeScale:()=>1});
const actor={path:'models/spirits/goldfish-1.glb',actions:{Idle:action('Idle'),Attack:action('Attack'),Ultimate:action('Ultimate')},controller:null};
for(const [i,mode] of ['Attack','Ultimate'].entries()){
 const configured=entry.skills[i],skill={name:configured.name,cost:i?3:1};
 const plan=sandbox.window.SpiritCombat.attackPlan({id:'kyogre',model:actor.path},actor,skill,configured);
 assert.equal(plan.mode,mode);assert(plan.nativeFx,'Must suppress generic particles');
 assert(Math.abs(plan.duration-duration(mode))<.03);
}
class Vec{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 clone(){return new Vec(this.x,this.y,this.z);}
 copy(v){return this.set(v.x,v.y,v.z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 setY(v){this.y=v;return this;}
 add(v){return this.set(this.x+v.x,this.y+v.y,this.z+v.z);}
 sub(v){return this.set(this.x-v.x,this.y-v.y,this.z-v.z);}
 addScaledVector(v,k){return this.set(this.x+v.x*k,this.y+v.y*k,this.z+v.z*k);}
 length(){return Math.hypot(this.x,this.y,this.z);}
 lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;}
 normalize(){const k=this.length()||1;return this.set(this.x/k,this.y/k,this.z/k);}
 lerpVectors(a,b,t){return this.copy(a).addScaledVector(b.clone().sub(a),t);}
}
class Group{constructor(){this.children=[];}add(node){this.children.push(node);}remove(node){this.children=this.children.filter(x=>x!==node);}}
class Geometry{dispose(){this.disposed=true;}}
class Material{constructor(config){Object.assign(this,config);}dispose(){this.disposed=true;}}
class Mesh{constructor(geo,mat){this.geometry=geo;this.material=mat;this.visible=false;this.position=new Vec;this.rotation={x:0};this.quaternion={setFromUnitVectors(){}};this.scale={set(){},setScalar(){}};}}
const T={Vector3:Vec,Group,Mesh,MeshBasicMaterial:Material,SphereGeometry:Geometry,CylinderGeometry:Geometry,RingGeometry:Geometry,DoubleSide:2,AdditiveBlending:1};
const start=code.indexOf('function littleGoldfishArenaFx('),end=code.indexOf('// Goldfish King / Queen:',start);
assert(start>0&&end>start,'Dedicated goldfish arena FX missing');
const battleGroup=new Group(),sounds=[];
const make=new Function('T','battleGroup','combatSound',code.slice(start,end)+'return littleGoldfishArenaFx;')(T,battleGroup,(el,big)=>sounds.push([el,big]));
const origin={position:new Vec,getWorldPosition:v=>v.set(0,0,0)};
const model={updateMatrixWorld(){},getObjectByName:n=>n==='body'?{localToWorld:v=>v.add(new Vec(0,1,0))}:null};
const enemy={position:new Vec(0,0,6),getWorldPosition:v=>v.set(0,0,6)};
const attacker={s:{id:'kyogre'},actor:{root:origin,object:model,worldSize:new Vec(1,1,1)}};
const defender={actor:{root:enemy,worldSize:new Vec(1,2,1)}};
for(const strong of [false,true]){
 const fx=make(attacker,defender,strong);
 assert.equal(battleGroup.children.length,1);
 const visuals=battleGroup.children[0].children;
 fx.update(.3);if(strong)assert(visuals[4].visible,'Early water ripple missing');
 fx.update(strong?1.45:.65);assert(visuals[0].visible,'Attack FX did not trigger on authored cue');
 if(strong)assert(visuals[2].visible,'Thin water column missing');
 fx.update(strong?2.8:1.10);assert(visuals[0].visible,'Water FX ends too early');
 fx.update(strong?3.3:1.4);assert(!visuals[0].visible,'Water FX overstays native clip');
 fx.dispose();
 assert.equal(battleGroup.children.length,0);
 assert(visuals.every(x=>x.geometry.disposed&&x.material.disposed),'FX resources must be released');
}
assert.equal(sounds.length,2);
assert(code.includes("littleGoldfish=attacker.s.id==='kyogre'"));
assert(code.includes("script?.dispose?.();targeted?.dispose()"));
assert(code.includes("if(royalGoldfish)royalGoldfishAttackFx("),'King and Queen native presentation must stay intact');
const index=read('index.html');
assert(index.includes('js/spirit-combat.js?v=20261023-goldfish-native-v1'));
assert(index.includes('js/game.js?v=20261023-goldfish-native-v1'));
console.log('PASS: Goldfish native Attack 1.6s and Ultimate 3.8s, authored FX cues, playback planning, resource cleanup, King/Queen preserved.');

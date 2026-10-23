/* Usage: node authoring/check-amphibian-arena.cjs
 * Validate original GLB Attack/Ultimate, leaf frog native Bump/Bubbles,
 * speed ratios (arena only), synced water bullet / silk triple-web and cleanup.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('data/spirit-catalog.json')),entry=id=>data.entries.find(e=>e.id===id);
const caterpillar=entry('entei'),frog=entry('articuno');
assert.deepEqual(caterpillar.skills.map(s=>s.animation),['Attack','Ultimate']);
assert.deepEqual(frog.skills.map(s=>s.animation),['Bump','Bubbles']);
const raw=fs.readFileSync(path.join(root,'models/spirits/water-caterpillar.glb'));
assert.equal(raw.toString('ascii',0,4),'glTF');
const count=raw.readUInt32LE(12),doc=JSON.parse(raw.toString('utf8',20,20+count));
const native=Object.fromEntries(doc.animations.map(clip=>[clip.name,Math.max(...clip.samplers.map(v=>doc.accessors[v.input].max[0]))]));
assert(Math.abs(native.Attack-1.6)<.03);
assert(Math.abs(native.Ultimate-4)<.03);
assert(read('authoring/water-spirits/spirits.js').includes("[0.62, 'bullet'"));
for(const t of ["[1.0, 'silk'","[1.7, 'silk'","[2.4, 'silk'"])assert(read('authoring/water-spirits/spirits.js').includes(t));
const window={};vm.runInNewContext(read('models/native/frog-spirits.js'),{window});
vm.runInNewContext(read('js/spirit-combat.js'),{window});
vm.runInNewContext(read('js/amphibian-arena-fx.js'),{window});
const {SpiritCombat,AmphibianArenaFx,FrogSpirits}=window;
for(const strong of [false,true]){
 const actionName=strong?'Ultimate':'Attack',cost=strong?3:1;
 const actions={Attack:{getClip:()=>({duration:native.Attack}),getEffectiveTimeScale:()=>1.3},
  Ultimate:{getClip:()=>({duration:native.Ultimate}),getEffectiveTimeScale:()=>1.4}};
 const p=SpiritCombat.attackPlan({id:'entei',model:'models/spirits/water-caterpillar.glb'},
  {path:'models/spirits/water-caterpillar.glb',actions,controller:null},
  {cost,name:strong?'吐絲結網':'頭槌水彈'},caterpillar.skills[strong?1:0]);
 assert.equal(p.mode,actionName);assert(p.nativeFx);
 assert(Math.abs(p.nativeDuration-(strong?4:1.6))<.03,'No repeated turn speed compounding');
 assert(Math.abs(p.duration-p.nativeDuration/(strong?1.4:1.3))<.03);
 const frogSkill=frog.skills[strong?1:0],frogModel='leaf-frog://articuno';
 const q=SpiritCombat.attackPlan({id:'articuno',model:frogModel},
  {path:frogModel,actions:{},controller:{seek(){}}},
  {cost,name:strong?'泡泡連彈':'普通撞擊'},frogSkill);
 assert.equal(q.mode,strong?'Bubbles':'Bump');assert(q.nativeFx);
 assert(Math.abs(q.nativeDuration-(strong?4.8:1.45))<.03);
 assert(Math.abs(q.duration-q.nativeDuration/(strong?1.4:1.3))<.03);
}
let log=[],actor={controller:{seek:(mode,t)=>log.push([mode,t])},nativePaused:false};
const frogFx=AmphibianArenaFx.frog({actor,plan:{mode:'Bubbles',nativeDuration:4.8,playbackRate:1.4}});
assert.equal(actor.nativePaused,true);
frogFx.update(1.5);assert.equal(log[0][0],'Bubbles');assert(Math.abs(log[0][1]-2.1)<1e-8);assert.equal(frogFx.approach(.3),0);
frogFx.dispose();assert.equal(actor.nativePaused,false);
class V{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
 clone(){return new V(this.x,this.y,this.z);}
 copy(v){return this.set(v.x,v.y,v.z);}
 setY(y){this.y=y;return this;}
 add(v){return this.set(this.x+v.x,this.y+v.y,this.z+v.z);}
 sub(v){return this.set(this.x-v.x,this.y-v.y,this.z-v.z);}
 addScaledVector(v,k){return this.set(this.x+v.x*k,this.y+v.y*k,this.z+v.z*k);}
 normalize(){let k=this.length()||1;return this.set(this.x/k,this.y/k,this.z/k);}
 length(){return Math.hypot(this.x,this.y,this.z);}
 lerp(v,k){return this.addScaledVector(v.clone().sub(this),k);}
}
class Group{
 constructor(){this.children=[];this.position=new V;this.visible=true;this.scale={setScalar(){}};}
 add(v){this.children.push(v);}remove(v){this.children=this.children.filter(x=>x!==v);}
 lookAt(){}
}
class Geometry{setFromPoints(points){this.points=points;return this;}dispose(){this.disposed=true;}}
class Material{constructor(o){Object.assign(this,o);}dispose(){this.disposed=true;}}
class Mesh{constructor(g,m){this.geometry=g;this.material=m;this.position=new V;this.visible=true;this.scale={set(){},setScalar(){}};this.rotation={x:0};this.quaternion={setFromUnitVectors(){}};}}
const T={Group,Vector3:V,Mesh,Line:Mesh,BufferGeometry:Geometry,
 SphereGeometry:Geometry,RingGeometry:Geometry,CylinderGeometry:Geometry,
 MeshBasicMaterial:Material,LineBasicMaterial:Material,DoubleSide:2,AdditiveBlending:1};
for(const strong of [false,true]){
 const group=new Group,sounds=[],rate=strong?1.4:1.3;
 const a={root:{position:new V,getWorldPosition:v=>v.set(0,0,0)},
  object:{updateMatrixWorld(){},getObjectByName:()=>({localToWorld:v=>v.add(new V(0,1,0))})},worldSize:new V(1,1,1)};
 const d={root:{position:new V(0,0,5),getWorldPosition:v=>v.set(0,0,5)},worldSize:new V(1,2,1)};
 const fx=AmphibianArenaFx.caterpillar({T,attacker:{actor:a},defender:{actor:d},group,
  plan:{strong,mode:strong?'Ultimate':'Attack',playbackRate:rate,nativeDuration:strong?4:1.6},
  sound:(...args)=>sounds.push(args)});
 assert.equal(group.children.length,1);
 const sprites=group.children[0].children,at=t=>t/rate;
 if(strong){
  fx.update(at(.99));assert.equal(sprites[2].visible,false);
  fx.update(at(1.1));assert.equal(sprites[2].visible,true);
  fx.update(at(1.8));assert.equal(sprites[3].visible,true);
  fx.update(at(2.5));assert.equal(sprites[4].visible,true);assert.equal(sprites[6].visible,true);
  fx.update(at(3.65));assert.equal(sprites[6].visible,true);
  fx.update(at(4));assert.equal(sprites[6].visible,false);
 }else{
  fx.update(at(.6));assert.equal(sprites[0].visible,false);
  fx.update(at(.72));assert.equal(sprites[0].visible,true);
  fx.update(at(1.07));assert.equal(sprites[5].visible,true);
  fx.update(at(1.22));assert.equal(sprites[0].visible,false);
 }
 assert.equal(fx.approach(1),0);fx.dispose();
 assert.equal(group.children.length,0);
 assert.equal(sounds.length,1);
 assert(sprites.slice(0,6).every(s=>s.geometry.disposed&&s.material.disposed));
}
const game=read('js/game.js'),index=read('index.html');
assert(game.includes('AmphibianArenaFx.caterpillar(')&&game.includes('AmphibianArenaFx.frog('));
assert(game.includes('script?.dispose?.();targeted?.dispose()'));
assert(game.includes("['entei','articuno'].includes(attacker.s.id)?240"));
assert(index.includes('js/amphibian-arena-fx.js?v=20261023-amphibian-native-v1'));
assert(index.includes('js/spirit-combat.js?v=20261023-amphibian-native-v1'));
new vm.Script(game);new vm.Script(read('js/amphibian-arena-fx.js'));new vm.Script(read('js/spirit-combat.js'));
console.log('PASS: Caterpillar native Attack/Ultimate, 0.62s bullet, three silk volleys and web; frog original Bump/Bubbles visible, native clips fully accelerated without double-ticking; no resource leaks.');

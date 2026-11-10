import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8');

test('all outdoor zhaocai forms grow 1.5 times and remain shorter than the outdoor Arala elephant',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(new URL('../js/spirit-combat.js',import.meta.url),'utf8'),ctx);
 const sizes=JSON.parse(fs.readFileSync(new URL('../data/model-size-overrides.json',import.meta.url),'utf8'));
 const elephantHeight=sizes.feraligatr.desiredWorldHeight*2;
 for(let stage=1;stage<=3;stage++){
  const id=stage===1?'zhaocai':'zhaocai-'+stage;
  const scale=ctx.window.SpiritCombat.outdoorScale({id});assert.equal(scale,1.5);
  const height=1.275*Math.pow(1.3,stage-1)*scale;assert.ok(height<elephantHeight);
 }
 assert.equal(ctx.window.SpiritCombat.outdoorScale({id:'feraligatr'}),1);
});
test('a fishing streak grants four fish per win and none for zero or invalid wins',async()=>{
 const fn=source.slice(source.indexOf('async function spawnRiverGoldfish('),source.indexOf('// 魚飼料：'));
 const ctx=vm.createContext({river:{},byId:{kyogre:{}},spawnOnRiver:async()=>({}),showWorldBroadcast(){},toast(){},S:{errors:[]}});
 vm.runInContext(fn,ctx);
 for(const [wins,n] of [[1,4],[3,12],[0,0],[-1,0],['bad',0]]){const result=await ctx.spawnRiverGoldfish(wins);assert.equal(result.length,n);assert.ok(result.every(f=>f.fishingReward));}
});
test('all three zhaocai stages use their native controller modes and retain full release time',()=>{
 const ctx=vm.createContext({window:{SpiritVfx:{keyOf:()=> 'orb'}}});vm.runInContext(fs.readFileSync(new URL('../js/spirit-combat.js',import.meta.url),'utf8'),ctx);
 for(let stage=1;stage<=3;stage++)for(const strong of [false,true]){
  const p=ctx.window.SpiritCombat.attackPlan({id:'zhaocai',model:'zhaocai://'+stage},{controller:{getState:()=>({durations:{Attack:1.15,Ultimate:3.3}})}},{cost:strong?3:1});
  assert.equal(p.mode,strong?'Ultimate':'Attack');assert.equal(p.nativeFx,true);assert.ok(!p.procedural);assert.ok(p.duration>(strong?3.3:1.15));assert.ok(Math.abs(p.duration*p.releaseFraction-(strong?.72:.36))<1e-8);
 }
});
test('zhaocai arena adapter routes each stage to its authored effects and restores the shield',()=>{
 const helper=source.slice(source.indexOf('function zhaocaiArenaFx('),source.indexOf('async function strike('));
 class Vector {clone(){return new Vector();}add(){return this;}setY(){return this;}}
 const ctx=vm.createContext({T:{Vector3:Vector},battleGroup:{},SpiritCombat:{targetPoint:()=>new Vector()},ZhaocaiCoins:{create:()=>Object.fromEntries(['toss','spray','bolt','domain','shieldChain','glory','update','dispose'].map(k=>[k,()=>calls.push(k)]))}});
 const calls=[];vm.runInContext(helper,ctx);
 for(const [stage,normal,ultimate] of [[1,'toss','spray'],[2,'bolt','domain'],[3,'shieldChain','glory']]){
  const controller={stage,hand(){},shield:{visible:true},onRelease:null},a={actor:{controller,root:{position:new Vector()}}};
  const script=ctx.zhaocaiArenaFx(a,{actor:{}},false,{});controller.onRelease('Attack');assert.equal(calls.at(-1),normal);controller.onRelease('Ultimate');assert.equal(calls.at(-1),ultimate);script.dispose();assert.equal(controller.onRelease,null);assert.equal(controller.shield.visible,true);
 }
});

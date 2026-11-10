import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relayChannel} from '../js/pk-https.js';
import {makeChannel} from '../js/pk-net.js';
import {snapshot, createMirror, applySnapshot, advanceMirror} from '../js/pk-sync.js';
import {createGame, beginDealing, playCard, step, PK_STAGE} from '../js/rules.js';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('relay sends a queued command immediately and never overlaps an in-flight request',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const calls=[];let release;
 const request=b=>{calls.push(b);return new Promise(r=>{release=r;});};
 const ch=relayChannel({code:'ABCD',token:'a'},makeChannel,{request,interval:180});
 try{
  await flush();assert.equal(calls.length,1);
  ch.send({t:'act',uid:7});t.mock.timers.tick(100);await flush();assert.equal(calls.length,1);
  release({paired:true,messages:[]});await flush();t.mock.timers.tick(0);await flush();
  assert.equal(calls.length,2);assert.equal(calls[1].messages[0].o.uid,7);
  release({paired:true,messages:[]});await flush();t.mock.timers.tick(10);
  ch.send({t:'ready',on:true});t.mock.timers.tick(0);await flush();
  assert.equal(calls.length,3,'new actions wake a sleeping poll instead of waiting for its timer');
 }finally{ch.close();}
});
test('relay cadence includes HTTP time instead of adding a fixed delay after each response',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});let count=0,release;
 const ch=relayChannel({code:'ABCD',token:'a'},makeChannel,{interval:180,request:()=>{count++;return new Promise(r=>{release=r;});}});
 try{
  await flush();assert.equal(count,1);t.mock.timers.tick(250);release({paired:true,messages:[]});await flush();
  t.mock.timers.tick(0);await flush();assert.equal(count,2,'a 250 ms response already consumed the 180 ms cadence');
 }finally{ch.close();}
});
test('mirror projects moving fighters between packets, stops after silence, and never predicts damage',()=>{
 const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
 const g=createGame({stage:PK_STAGE,deck:['charmander'],foeDeck:['squirtle'],spirits:read('../../data/spirits.json'),catalog:read('../../data/spirit-catalog.json'),evolution:read('../../survivors/data/evolution.json'),deferDeal:true,seed:1});
 beginDealing(g);playCard(g,0,'ally');step(g,1/30);
 const s=snapshot(g,[]),m=createMirror(PK_STAGE);applySnapshot(m,s);const f=m.fighters[0],x=f.x,hp=f.hp;
 assert.ok(s.f[0].v<0);advanceMirror(m,.2);assert.ok(f.x>x);assert.equal(f.hp,hp);
 advanceMirror(m,1);const held=f.x,time=m.time;advanceMirror(m,1);assert.equal(f.x,held);assert.equal(m.time,time);
 applySnapshot(m,s);assert.equal(m.time,time,'late packets must not rewind the clock');
 s.f[0].mv=0;s.f[0].v=0;applySnapshot(m,s);const stopped=f.x;advanceMirror(m,.2);assert.equal(f.x,stopped);
});

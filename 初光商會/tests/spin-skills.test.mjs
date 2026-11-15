import test from 'node:test';
import assert from 'node:assert/strict';
import {activeSpinSkills,SPIN_SKILL_IDS,SPIN_SKILL_SECONDS} from '../js/spin-arena-skills.js';
const match=()=>({id:'m',round:1,phase:'battle',time:3,topId:'flame',opponentTopId:'wind',effects:[{id:1,kind:'skill',actor:0,at:3},{id:2,kind:'skill',actor:1,at:3}]});
test('both actors and all six top identities keep independent special attacks',()=>{
 for(const id of SPIN_SKILL_IDS){const m=match();m.topId=id;const cues=activeSpinSkills(m);assert.equal(cues.length,2);assert.equal(cues[0].topId,id);assert.equal(cues[1].topId,'wind');assert.notEqual(cues[0].key,cues[1].key);}
});
test('simulation time determines frame, pause, expiry and phase cleanup',()=>{
 const m=match();assert.equal(activeSpinSkills(m)[0].frame,0);m.time+=.6;assert.equal(activeSpinSkills(m)[0].frame,8);assert.deepEqual(activeSpinSkills(m),activeSpinSkills(structuredClone(m)));
 m.time=3+SPIN_SKILL_SECONDS;assert.deepEqual(activeSpinSkills(m),[]);m.time=2;assert.deepEqual(activeSpinSkills(m),[]);m.time=3;m.phase='roundResult';assert.deepEqual(activeSpinSkills(m),[]);
});
test('hit effects cannot suppress casts; later casts retrigger within a round',()=>{
 const m=match();m.effects.push({id:3,kind:'hit',at:3});assert.equal(activeSpinSkills(m).length,2);m.effects.push({id:4,kind:'skill',actor:0,at:3});assert.match(activeSpinSkills(m)[0].key,/:4$/);
 m.effects=[];assert.deepEqual(activeSpinSkills(m),[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAVE_BIRD_IDS,isCaveBird,flightMotion} from '../js/avian-motion-v17.js';
const spirits=JSON.parse(readFileSync(new URL('../../data/spirits.json',import.meta.url),'utf8'));
const find=id=>spirits.find(s=>s.id===id);
test('cave birds match actual eleven models rather than legacy species names',()=>{
 assert.deepEqual(new Set(spirits.filter(isCaveBird).map(s=>s.id)),new Set(CAVE_BIRD_IDS));
 for(const id of ['jigglypuff','articuno','moltres','butterfree','beedrill','dialga','totodile','mewtwo'])assert.equal(isCaveBird(find(id)),false,id);
 assert.equal(isCaveBird(null),false);assert.equal(isCaveBird({id:'charmander',family:'leaf-frog',form:'frog'}),false);
});
test('flight motion chooses real Fly, Flight or FlyLoop clips and preserves controller names',()=>{
 const spec=find('charmander');assert.equal(flightMotion(spec,['Walk','Flight','FlyLoop','Fly']).mode,'Fly');
 assert.equal(flightMotion(spec,[{name:'Armature|FlyLoop'}]).mode,'FlyLoop');
 assert.equal(flightMotion(spec,{Idle:{},Flight:{}}).mode,'Flight');
 assert.equal(flightMotion(spec,new Set(['Idle','fly_loop'])).mode,'fly_loop');
 assert.equal(flightMotion(spec,['FlyAttack','FlyingHit','Walk']).mode,null);
});
test('verified native bird modes can be inferred but an explicit empty clip set uses procedural flight',()=>{
 for(const id of ['treecko','grovyle','sceptile','palkia','piplup','prinplup','empoleon','blissey'])assert.equal(flightMotion(find(id)).mode,'Fly',id);
 for(const id of ['charmander','charmeleon','charizard']){const motion=flightMotion(find(id),[]);assert.equal(motion.mode,null);assert.equal(motion.procedural,true);assert.ok(motion.lift>0&&motion.lift<=.8);}
 const nativeEmpty=flightMotion(find('palkia'),[]);assert.equal(nativeEmpty.procedural,true);
 assert.deepEqual(flightMotion(find('jigglypuff'),['Fly']),{bird:false,mode:null,procedural:false,lift:0});
});

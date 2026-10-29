'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(process.argv[2]||path.resolve(__dirname,'../../sites-hlqj-edit/public/guest-memory.js'),'utf8');
let nativeReads=0,nativeWrites=0,requests=0,beacons=0;
const persistent={getItem(){nativeReads++;return 'existing-account-save'},setItem(){nativeWrites++}};
const parent={PhantomGuestSession:{local:new Map(),session:new Map()}};
function load(host=parent){const w={localStorage:persistent,sessionStorage:persistent,fetch:async()=>{requests++;return new Response('{}')}};const navigator={sendBeacon:()=>{beacons++;return true}};const context={window:w,parent:host,Map,URL,Response,location:{href:'https://example.test/game/guest/'},navigator};vm.runInNewContext(source,context);return{w,navigator}}
(async()=>{
 const a=load();assert.equal(a.w.localStorage.getItem('phantom_journey_v1'),null);a.w.localStorage.setItem('phantom_journey_v1','guest progress');a.w.sessionStorage.setItem('controls','seen');
 const b=load();assert.equal(b.w.localStorage.getItem('phantom_journey_v1'),'guest progress','Town/cave/tower in this session share memory');
 await b.w.fetch('/api/portal',{method:'POST',body:'save'});await b.w.fetch(new URL('https://example.test/api/portal?action=ping'));b.navigator.sendBeacon('/api/portal','save');
 assert.equal(requests,0);assert.equal(beacons,0);await b.w.fetch('/game/data/spirits.json');assert.equal(requests,1);
 const reset=load({PhantomGuestSession:{local:new Map(),session:new Map()}});assert.equal(reset.w.localStorage.getItem('phantom_journey_v1'),null);
 assert.equal(nativeReads,0);assert.equal(nativeWrites,0);console.log('PASS: guest memory survives scene changes, resets for a new visit, never touches account storage or submits records.');
})().catch(e=>{console.error(e);process.exitCode=1});

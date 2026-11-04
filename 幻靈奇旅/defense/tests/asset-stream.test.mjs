import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {streamAssets, createImageCache} from '../js/asset-stream.js';

test('asset streaming bounds parallel decoding and yields between completed jobs', async () => {
  let active=0, peak=0, yielded=0;
  const done=[];
  await streamAssets(Array.from({length:9},(_,id)=>async()=>{
    active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,2));
    done.push(id);active--;
  }),2,async()=>{yielded++});
  assert.equal(peak,2);assert.equal(yielded,9);
  assert.deepEqual(done.sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8]);
});

test('shared card frames decode once; failed images are retryable', async () => {
  const created=[];
  class Image {constructor(){created.push(this)}set src(value){this.url=value}}
  const load=createImageCache(Image);
  const first=load('frame.webp');assert.equal(load('frame.webp'),first);
  assert.equal(created.length,1);created[0].onload();assert.equal(await first,created[0]);
  const failed=load('art.webp');created[1].onerror();assert.equal(await failed,null);
  const retry=load('art.webp');assert.equal(created.length,3);created[2].onload();
  assert.equal(await retry,created[2]);
});

test('defense keeps full user-selected BGM mix and only briefly ducks actual attacks', () => {
  const mixes=[],ducks=[];let config;
  const source=readFileSync(new URL('../js/combat-audio.js',import.meta.url),'utf8')
    .replace(/^import .*;$/m,'').replace('export function','function').replaceAll('import.meta.url',JSON.stringify('https://example.test/defense/js/combat-audio.js'));
  const context=vm.createContext({URL,PhantomBgm:{setMix:value=>mixes.push(value),duckFor:(...value)=>ducks.push(value)},PhantomCombatAudio:{create:value=>(config=value,{})}});
  vm.runInContext(source+';createCombatAudio()',context);
  assert.equal(mixes[0].gain,1);assert.equal(mixes[0].ceiling,1);
  assert.equal(ducks.length,0,'warming/opening the engine must not duck music');
  config.onPlayed({final:false});config.onPlayed({final:true});
  assert.deepEqual(ducks,[[.8,120],[.65,280]]);
});

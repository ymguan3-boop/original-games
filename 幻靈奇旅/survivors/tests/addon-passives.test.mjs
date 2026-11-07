import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {passiveDefinition} from '../js/passive-rules.js';import {ownPassives} from '../js/growth.js';
const read=f=>JSON.parse(readFileSync(new URL(f,import.meta.url),'utf8'));
test('add-on spirits take their passives from the add-on data instead of throwing',()=>{
 const crown=read('../../data/crown-addon.json'),zc=read('../../data/zhaocai-addon.json'),passives={...crown.passives,...zc.passives};
 assert.throws(()=>passiveDefinition({id:'crown-sparrow',cardFrame:'purple',hp:100,attack:50}));
 globalThis.PhantomAddonPassives=passives;
 try{for(const s of [...crown.spirits,...zc.spirits]){assert.equal(passiveDefinition(s).name,s.name);assert.equal(typeof ownPassives(s,1),'object');}}
 finally{delete globalThis.PhantomAddonPassives;}
});

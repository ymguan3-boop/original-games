import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeBattleAddon} from '../js/battle-catalog.js';
import {validPkDeck} from '../js/deck-rules.js';
import {SPOTS, MOBILE_SPOTS, PK_SPOT, MOBILE_PK_SPOT} from '../js/sea3d.js';
import {createGame, beginDealing, playCard, PK_STAGE} from '../js/rules.js';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const addon = read('../../data/zhaocai-addon.json');
function catalog(unlocked) {
  const data = {spirits:read('../../data/spirits.json'), catalog:read('../../data/spirit-catalog.json'), evolution:read('../../survivors/data/evolution.json'), art:read('../../data/card-art.json'), pool:read('../../survivors/data/gacha-pool.json')};
  mergeBattleAddon(data, addon, unlocked);
  return data;
}
test('locked desktop and unlocked phone both validate and simulate a zhaocai opponent without granting pool access', () => {
  const desktop = catalog(false), phone = catalog(true), deck = ['zhaocai','charmander','squirtle','bulbasaur'];
  for (const data of [desktop, phone]) {
    assert.equal(validPkDeck(deck, data.evolution, id=>data.spirits.find(s=>s.id===id)), true);
    for(const id of ['zhaocai','zhaocai-2','zhaocai-3']) assert.ok(data.spirits.find(s=>s.id===id));
    const game = createGame({...data,stage:PK_STAGE,deck,foeDeck:deck,seed:2,deferDeal:true});
    beginDealing(game); assert.ok(game.foe.hand.length);
    const at = game.foe.hand.findIndex(c=>c.species==='zhaocai');
    if(at>=0) {playCard(game,at,'enemy');assert.ok(game.fighters.some(f=>f.species==='zhaocai'));}
  }
  assert.ok(!desktop.pool.purple.includes('zhaocai'));
  assert.ok(phone.pool.purple.includes('zhaocai'));
  mergeBattleAddon(desktop, addon, false);
  assert.equal(desktop.spirits.filter(s=>s.id==='zhaocai').length,1);
});
test('desktop and portrait PK islands have a clear water gap from all stage islands',()=>{
  for(const [point,spots] of [[PK_SPOT,SPOTS],[MOBILE_PK_SPOT,MOBILE_SPOTS]]) {
    for(const p of spots) assert.ok(Math.hypot(point[0]-p[0],point[1]-p[1])>180);
  }
  assert.ok(PK_SPOT[1]<404); assert.ok(MOBILE_PK_SPOT[1]<640);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autoDeck, combatPower, validPkDeck} from '../js/deck-rules.js';
import {isBaseCard, isRedCard} from '../js/rules.js';
import {createPkLobby} from '../js/pk-lobby.js';
const json = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const evolution = json('../../survivors/data/evolution.json');
const spirits = json('../../data/spirits.json');
const spirit = id => spirits.find(s => s.id === id);
const base = spirits.filter(s => !isRedCard(s.id) && isBaseCard(evolution,s.id)).map(s=>s.id);
const red = spirits.filter(s=>isRedCard(s.id)).map(s=>s.id);
const validate = ids => validPkDeck(ids,evolution,spirit);

test('PK requires four unique deployable base cards; supports and malformed values cannot fill holes', () => {
  for(let n=0;n<4;n++) assert.equal(validate([...base.slice(0,n),...red.slice(0,2)]),false);
  assert.equal(validate(base.slice(0,4)),true);
  assert.equal(validate([...base.slice(0,4),...red.slice(0,2)]),true);
  for(const ids of [null,{},'abcd',[base[0],base[0],...base.slice(1,3)], [...base.slice(0,3),'missing'],base.slice(0,5)]) assert.equal(validate(ids),false);
});

test('one-click deck ranks owned eligible cards, keeps fixed slots, and never invents missing cards', () => {
  const owned = [...base,...red,'missing',base[0],...spirits.filter(s=>!isBaseCard(evolution,s.id)&&!isRedCard(s.id)).map(s=>s.id)];
  const result = autoDeck(owned,evolution,spirit);
  const strongest = base.slice().sort((a,b)=>combatPower(spirit(b))-combatPower(spirit(a))||a.localeCompare(b)).slice(0,4);
  assert.deepEqual(result.slice(0,4),strongest);
  assert.equal(validate(result),true);
  assert.deepEqual(autoDeck([base[0],base[0],red[0]],evolution,spirit),[base[0],null,null,null,red[0],null]);
  assert.deepEqual(autoDeck([],evolution,spirit),Array(6).fill(null));
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result,'saved deck preserves exact ordering');
});

test('PK host and join entry, invalid peer hello, ready, start and rematch enforce deployment rules', async () => {
  const previous = globalThis.document, previousLocation = globalThis.location;
  globalThis.location = {search:"?pknet=local"};
  const nodes = new Map();
  globalThis.document = {getElementById:id=>nodes.get(id)};
  let selected=base.slice(0,3), opens=0, starts=0, hostCalls=0, joinCalls=0;
  const channel={send(){},close(){}};
  const lobby=createPkLobby({
    openModal(html){opens++;nodes.clear();for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],{value:'ABCD',focus(){}});},
    closeModal(){},ribbon:()=>'',esc:String,picture:id=>id,spirit,deck:()=>selected.slice(),validateDeck:validate,
    name:()=> 'tester',setName(){},toast(){},onStart(){starts++;},
    network:{async hostRoom(){hostCalls++;return {code:'ABCD',ready:Promise.resolve(channel),cancel(){}}},async joinRoom(){joinCalls++;return channel;}}
  });
  try {
    lobby.open();assert.equal(opens,0);
    selected=base.slice(0,4);lobby.open();
    selected=base.slice(0,3);await nodes.get('pkCreate').onclick();assert.equal(hostCalls,0);
    nodes.get('pkJoin').onclick();assert.equal(joinCalls,0);
    selected=base.slice(0,4);lobby.open();await nodes.get('pkCreate').onclick();
    await new Promise(resolve=>setImmediate(resolve));assert.ok(lobby.session);
    channel.onmessage({t:'hello',deck:{},name:'bad'});assert.equal(lobby.session.foe,null);
    channel.onmessage({t:'ready',on:true});assert.equal(starts,0);
    channel.onmessage({t:'hello',deck:base.slice(0,4),name:'valid'});
    nodes.get('pkReady').onclick();channel.onmessage({t:'ready',on:true});assert.equal(starts,1);
    selected=base.slice(0,3);lobby.rematch();assert.equal(lobby.session,null);
  } finally {lobby.leave();globalThis.document=previous;globalThis.location=previousLocation;}
});

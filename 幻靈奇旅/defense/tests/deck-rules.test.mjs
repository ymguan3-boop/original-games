import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autoDeck, combatPower, validPkDeck, settleEggSlots} from '../js/deck-rules.js';
import {isBaseCard, isRedCard} from '../js/rules.js';
import {createPkLobby} from '../js/pk-lobby.js';
const json = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const evolution = json('../../survivors/data/evolution.json');
const spirits = json('../../data/spirits.json');
const spirit = id => spirits.find(s => s.id === id);
const base = spirits.filter(s => !isRedCard(s.id) && isBaseCard(evolution,s.id) && s.id !== 'jigglypuff').map(s=>s.id);
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
  let lastHtml='', selected=base.slice(0,3), opens=0, starts=0, hostCalls=0, joinCalls=0;
  const sent=[];
  const channel={send(m){sent.push(m);},close(){}};
  const lobby=createPkLobby({
    openModal(html){opens++;lastHtml=html;nodes.clear();for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],{value:'ABCD',focus(){}});},
    closeModal(){},ribbon:()=>'',esc:String,picture:id=>id,spirit,deck:()=>selected.slice(),validateDeck:validate,
    name:()=> 'tester',setName(){},toast(){},onStart(){starts++;},
    network:{async hostRoom(){hostCalls++;return {code:'ABCD',ready:Promise.resolve(channel),cancel(){}}},async joinRoom(){joinCalls++;return channel;}}
  });
  try {
    lobby.open();assert.equal(opens,1,'an incomplete deck still opens the lobby');assert.match(lastHtml,/pk-error/,'and shows how to fill the deck');
    selected=base.slice(0,4);lobby.open();
    selected=base.slice(0,3);await nodes.get('pkCreate').onclick();assert.equal(hostCalls,0);
    assert.match(nodes.get('pkNotice').textContent,/四個基礎格/,'local error is written inside the modal');
    nodes.get('pkJoin').onclick();assert.equal(joinCalls,0);
    selected=base.slice(0,4);lobby.open();await nodes.get('pkCreate').onclick();
    await new Promise(resolve=>setImmediate(resolve));assert.ok(lobby.session);
    await new Promise(resolve=>setTimeout(resolve,1550));
    assert.ok(sent.filter(m=>m.t==='hello').length>=2,'missing handshake acknowledgement triggers a resend');
    channel.onmessage({t:'hello',deck:{},name:'bad'});assert.equal(lobby.session.foe,null);
    assert.match(lastHtml,/role="alert"[\s\S]*對手卡組無法使用/,'invalid peer status is inside the dialog');
    channel.onmessage({t:'ready',on:true});assert.equal(starts,0);
    channel.onmessage({t:'hello',deck:base.slice(0,4),name:'valid'});
    channel.onmessage({t:'hello_ack'});
    nodes.get('pkReady').onclick();
    channel.onmessage({t:'hello',deck:base.slice(0,4),name:'valid'});
    assert.equal(lobby.session.ready.me,true,'a retried hello cannot undo ready');
    channel.onmessage({t:'ready',on:true});assert.equal(starts,1);
    channel.onmessage({t:'loaded'});
    channel.onmessage({t:'snap',d:{frame:1}});
    channel.onmessage({t:'snap',d:{frame:2}});
    let loaded=0,frame=0;
    lobby.session.on('loaded',()=>loaded++);
    lobby.session.on('snap',m=>{frame=m.d.frame;});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(loaded,1,'a faster peer must not lose its loaded message while the engine imports');
    assert.equal(frame,2,'only the latest early snapshot is needed');
    selected=base.slice(0,3);lobby.rematch();assert.equal(lobby.session,null);
  } finally {lobby.leave();globalThis.document=previous;globalThis.location=previousLocation;}
});

test('三色蛋佔三個基礎格：一鍵編組與 PK 驗證都算三格', () => {
  const others = base.slice(0,5), result = autoDeck(['jigglypuff',...others,...red],evolution,spirit);
  assert.equal(result.filter(id => id === 'jigglypuff').length, 3);
  assert.deepEqual(result.slice(0,3),['jigglypuff','jigglypuff','jigglypuff']);
  assert.ok(result[3] && result[3] !== 'jigglypuff');
  assert.equal(validate([...new Set(result.filter(Boolean))]),true);
  assert.equal(validate(['jigglypuff',base[0]]),true);
  assert.equal(validate(['jigglypuff',...base.slice(0,3)]),false,'蛋加三張基礎會超過四格');
  assert.equal(validate(['jigglypuff']),false);
  assert.deepEqual(settleEggSlots([base[0],'jigglypuff',base[1],base[2],red[0],null]),['jigglypuff','jigglypuff','jigglypuff',base[0],red[0],null]);
  assert.deepEqual(settleEggSlots([...base.slice(0,4),null,null]),[...base.slice(0,4),null,null]);
});

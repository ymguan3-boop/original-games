import test from 'node:test';
import assert from 'node:assert/strict';
import {hostRoom,joinRoom} from '../js/pk-net.js';

test('normal URLs pair independent tabs without a broker, reject a third guest, and close together', async () => {
  globalThis.location={search:''};
  class OfflinePeer {on(type,fn){if(type==='error')queueMicrotask(()=>fn({type:'network'}));}destroy(){}}
  globalThis.Peer=OfflinePeer;
  const host=await hostRoom();let a,b;
  try {
    b=await joinRoom(host.code);a=await host.ready;
    assert.equal(a.kind,'local');assert.equal(b.kind,'local');
    a.send({t:'hello',name:'same account'});
    const first=await new Promise(resolve=>{b.onmessage=resolve;});
    assert.equal(first.name,'same account');
    const received=new Promise(resolve=>{a.onmessage=resolve;});
    b.send({t:'act',uid:17});assert.deepEqual(await received,{t:'act',uid:17});
    await assert.rejects(joinRoom(host.code),/已經有人/);
    const closed=new Promise(resolve=>{a.onclose=resolve;});b.close();await closed;
    assert.equal(a.closed,true);
  } finally {a?.close();b?.close();host.cancel();delete globalThis.Peer;delete globalThis.location;}
});

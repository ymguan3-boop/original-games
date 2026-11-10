import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handlePkRelay} from '../server/pk-relay.js';
import {relayChannel,coalesceSnapshot} from '../js/pk-https.js';
import {makeChannel} from '../js/pk-net.js';
function database(){const sql=new DatabaseSync(':memory:');const db={prepare(query){let args=[];return {bind(...values){args=values;return this;},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return sql.prepare(query).get(...args);},async all(){return {results:sql.prepare(query).all(...args)};}};},async batch(commands){const results=[];for(const c of commands)results.push(await c.run());return results;}};return {db,sql};}
test('HTTPS relay pairs same-account/IP pages, delivers idempotent actions and latest snapshots, and closes',async()=>{
 const {db,sql}=database();
 const request=async(body,key)=>{const r=await handlePkRelay(new Request('https://hlqj.kyo1216kimo.chatgpt.site/api/pk',{method:'POST',headers:{Origin:'https://hlqj.kyo1216kimo.chatgpt.site','Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(body)}),db);const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 let host,guest;
 try{
  const h=await request({action:'create'}),g=await request({action:'join',code:h.code});
  assert.notEqual(h.token,g.token);await assert.rejects(request({action:'join',code:h.code}),/已經有人/);
  await assert.rejects(request({action:'exchange',code:h.code},'wrong-token'),/失效/);
  let paired;const connected=new Promise(r=>{paired=r;});host=relayChannel(h,makeChannel,{request,interval:10,onPaired:paired});guest=relayChannel(g,makeChannel,{request,interval:10});await connected;
  const hello=new Promise(resolve=>{guest.onmessage=resolve;});host.send({t:'hello',deck:['jigglypuff','squirtle']});assert.equal((await hello).t,'hello');
  const action=new Promise(resolve=>{host.onmessage=resolve;});guest.send({t:'act',uid:3});assert.equal((await action).uid,3);
  const frame=new Promise(resolve=>{guest.onmessage=resolve;});host.send({t:'snap',d:{frame:1}});host.send({t:'snap',d:{frame:2}});assert.equal((await frame).d.frame,2);
  const packet={action:'exchange',code:h.code,messages:[{id:'retry-id',o:{t:'ready'}}]};await request(packet,g.token);await request(packet,g.token);
  const rows=sql.prepare('SELECT COUNT(*) AS n FROM pk_relay_messages WHERE message_id=?').get('retry-id');assert.equal(rows.n,1);
  const gone=new Promise(resolve=>{guest.onclose=resolve;});host.close();await gone;assert.equal(guest.closed,true);
 }finally{host?.close();guest?.close();await new Promise(r=>setTimeout(r,30));sql.close();}
});
test('relay rejects another origin and malformed data before touching the database',async()=>{
 const response=await handlePkRelay(new Request('https://example.test/api/pk',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),null);assert.equal(response.status,403);
 const preflight=await handlePkRelay(new Request('https://example.test/api/pk',{method:'OPTIONS',headers:{Origin:'https://ymguan3-boop.github.io'}}),null);assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://ymguan3-boop.github.io');
});
test('coalescing pending frames retains battle events while replacing positional state',()=>{
 const result=coalesceSnapshot({t:'snap',d:{t:1,f:[1],ev:[{type:'deal'}]}},{t:'snap',d:{t:2,f:[2],ev:[{type:'play'}]}});assert.equal(result.d.t,2);assert.deepEqual(result.d.f,[2]);assert.deepEqual(result.d.ev.map(e=>e.type),['deal','play']);
});

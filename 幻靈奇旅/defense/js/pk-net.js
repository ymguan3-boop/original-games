/* PK rooms: a 4-character code (letters and digits, without the look-alikes 0 O 1 I) pairs two players, then the two
   devices talk directly over a WebRTC data channel. How the pair finds each other:
   - Firebase Realtime Database, when js/pk-config.js holds the project's config: the room lives at pkRooms/<code>
     (offer, answer and ICE candidates); if no direct link can be made the messages are relayed through the room.
   - otherwise the PeerJS public broker (no account needed): the host registers the peer id "hlqj-pk-<code>".
   - ?pknet=local: two tabs of the same browser over a BroadcastChannel (testing).
   Every transport returns the same channel: send(obj), onmessage(obj), onclose(), close(), kind. */
import {FIREBASE_CONFIG} from './pk-config.js?v=20261107-fixes-r1';
import {hostHttps,joinHttps} from './pk-https.js?v=20261110-shop-pk-r1';

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeCode = (rand = Math.random) => Array.from({length: 4}, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
export const normalizeCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
export const validCode = (s) => s.length === 4 && [...s].every((c) => CODE_CHARS.includes(c));
const PEER_PREFIX = 'hlqj-pk-', ICE = [{urls: 'stun:stun.l.google.com:19302'}, {urls: 'stun:stun1.l.google.com:19302'}];

export function transportKind() {
  if (/[?&]pknet=local/.test(location.search)) return 'local';
  if (/[?&]pknet=https/.test(location.search) || location.hostname?.endsWith('.chatgpt.site') || location.hostname === 'ymguan3-boop.github.io') return 'https';
  return FIREBASE_CONFIG ? 'firebase' : 'peerjs';
}

export function makeChannel(kind, sendRaw, close) {
  let listener=null;const pending=[];
  const ch = {kind, get onmessage(){return listener;}, set onmessage(fn){listener=fn;if(fn)queueMicrotask(()=>{while(listener&&pending.length&&!ch.closed)listener(pending.shift());});}, onclose: null, closed: false,
    send(obj) { if (!ch.closed) try { sendRaw(obj); } catch (e) { console.warn(e); } },
    close() { if (ch.closed) return; ch.closed = true; try { close(); } catch {} },
    _recv(obj) { if(ch.closed)return;if(listener)listener(obj);else if(pending.length<32)pending.push(obj); },
    _gone() { if (ch.closed) return; ch.closed = true;try{close();}catch{} ch.onclose?.(); }};
  return ch;
}

/* host: open a room and wait for the guest. Returns {code, ready: Promise<channel>, cancel()} */
export async function hostRoom({onStatus = () => {}} = {}) {
  const kind = transportKind();
  if(kind==='https'){onStatus('正在建立 HTTPS 對戰房間…');return hostHttps(makeChannel,{onStatus});}
  for (let tries = 0; tries < 5; tries++) {
    const code = makeCode();
    if (kind === 'local') return hostLocal(code);
    // Publish locally immediately: another tab must work even when the broker is offline.
    const local = hostLocal(code); let remote = null, cancelled = false, chosen = false;
    let resolve; const ready = new Promise(r => { resolve = r; });
    const accept = (ch, winner) => {
      if (cancelled || chosen) { ch.close(); return; }
      chosen = true;
      if (winner === 'local') remote?.cancel(); else local.cancel();
      resolve(ch);
    };
    local.ready.then(ch => accept(ch, 'local'));
    (kind === 'firebase' ? hostFirebase(code, onStatus) : hostPeer(code, onStatus)).then(h => {
      remote = h;
      if (cancelled || chosen) { h.cancel(); return; }
      h.ready.then(ch => accept(ch, 'remote')).catch(() => onStatus('遠端連線失敗；同瀏覽器分頁仍可輸入房號加入'));
    }).catch(() => { if (!cancelled && !chosen) onStatus('遠端服務暫時無法使用；同瀏覽器分頁仍可加入'); });
    return {code, ready, cancel() { cancelled = true; local.cancel(); remote?.cancel(); }};
  }
}
export async function joinRoom(code, {onStatus = () => {}} = {}) {
  code = normalizeCode(code);
  if (!validCode(code)) throw Error('房號是 4 碼英文字母或數字');
  const kind = transportKind();
  if (kind === 'local') return joinLocal(code);
  if(kind==='https'){onStatus('正在以 HTTPS 加入房間…');return joinHttps(code,makeChannel,{onStatus});}
  // Independent per-page tokens, never an account ID or IP address.
  if (typeof BroadcastChannel === 'function') {
    try { return await joinLocal(code, 650); }
    catch (e) { if (e.code === 'full') throw e; }
  }

  return kind === 'firebase' ? joinFirebase(code, onStatus) : joinPeer(code, onStatus);
}

/* ---------- same-origin tabs: private per-guest channel ---------- */
function hostLocal(code) {
  if (typeof BroadcastChannel !== 'function') return {code, ready: new Promise(() => {}), cancel() {}};
  const bc = new BroadcastChannel('hlqj-pk-' + code); let ch = null, resolve, timer;
  const ready = new Promise(r => { resolve = r; });
  bc.onmessage = e => {
    const m = e.data;
    if (m?.k !== 'hello' || typeof m.token !== 'string') return;
    if (ch) { bc.postMessage({k:'full', token:m.token}); return; }
    const link = new BroadcastChannel('hlqj-pk-' + code + '-' + m.token);
    ch = makeChannel('local', o => link.postMessage({k:'data',o}), () => {link.postMessage({k:'bye'});link.close();bc.close();clearTimeout(timer);});
    link.onmessage = e => {
      if(e.data?.k==='ack'){clearTimeout(timer);resolve(ch);}
      else if(e.data?.k==='data')ch._recv(e.data.o);
      else if(e.data?.k==='bye'){ch._gone();link.close();bc.close();}
    };
    timer=setTimeout(()=>{ch.close();},5000);
    bc.postMessage({k:'welcome',token:m.token});
  };
  return {code, ready, cancel() {clearTimeout(timer);bc.close();ch?.close();}};
}
function joinLocal(code, timeout=2500) {
  return new Promise((resolve,reject) => {
    const bc=new BroadcastChannel('hlqj-pk-'+code),token=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
    const link=new BroadcastChannel('hlqj-pk-'+code+'-'+token);let ch=null;
    const timer=setTimeout(()=>{bc.close();link.close();reject(Error('找不到房間 '+code+'，請確認房號'));},timeout);
    link.onmessage=e=>{if(e.data?.k==='data')ch?._recv(e.data.o);else if(e.data?.k==='bye'){ch?._gone();link.close();}};
    bc.onmessage=e=>{
      const m=e.data;if(m?.token!==token)return;
      if(m.k==='welcome'&&!ch){clearTimeout(timer);bc.close();ch=makeChannel('local',o=>link.postMessage({k:'data',o}),()=>{link.postMessage({k:'bye'});link.close();});link.postMessage({k:'ack'});resolve(ch);}
      else if(m.k==='full'&&!ch){clearTimeout(timer);bc.close();link.close();const err=Error('這個房間已經有人了');err.code='full';reject(err);}
    };
    bc.postMessage({k:'hello',token});
  });
}

/* ---------- PeerJS public broker ---------- */
let peerLib = null;
function loadPeer() {
  if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
  return peerLib ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = new URL('../vendor/peerjs.min.js', import.meta.url).href;
    const timer=setTimeout(()=>{peerLib=null;s.remove();reject(Error('連線元件載入逾時'));},10000);s.onload=()=>{clearTimeout(timer);resolve(globalThis.Peer);};s.onerror=()=>{clearTimeout(timer);peerLib=null;s.remove();reject(Error('連線元件載入失敗'));};document.head.append(s);
  });
}
function wrapConn(conn, peer) {
  const ch = makeChannel('peerjs', (o) => {
    /* An unstable mobile link must not accumulate megabytes of old frames.
       Snapshots are replaceable; actions, game-over and room messages are not. */
    const bytes = conn.dataChannel?.bufferedAmount || 0;
    if (o?.t === 'snap' && (bytes > 256 * 1024 || (conn._buffer?.length || 0) > 12)) return;
    conn.send(o);
  }, () => { conn.close(); setTimeout(() => peer.destroy(), 300); });
  conn.on('data', (o) => ch._recv(o)); conn.on('close', () => ch._gone()); conn.on('error', () => ch._gone());
  peer.on('disconnected', () => { /* the broker link only matters for pairing */ });
  return ch;
}
async function hostPeer(code, onStatus) {
  const Peer = await loadPeer();
  const peer = new Peer(PEER_PREFIX + code, {debug: 0, config: {iceServers: ICE}});
  await new Promise((resolve, reject) => {
    const timer=setTimeout(()=>{peer.destroy();reject(Error('連線服務回應逾時'));},10000);
    peer.on('open',()=>{clearTimeout(timer);resolve();});
    peer.on('error', (e) => { clearTimeout(timer);const err = Error(e.type === 'unavailable-id' ? 'taken' : '連線服務暫時無法使用（' + e.type + '）'); if (e.type === 'unavailable-id') err.code = 'taken'; peer.destroy(); reject(err); });
  });
  onStatus('等待對手輸入房號…');
  let resolve; const ready = new Promise((r) => (resolve = r)); let taken = false;
  peer.on('connection', (conn) => {
    if (taken) { conn.on('open', () => { conn.send({t: 'full'}); setTimeout(() => conn.close(), 300); }); return; }
    taken = true; conn.on('open', () => resolve(wrapConn(conn, peer)));
  });
  return {code, ready, cancel() { peer.destroy(); }};
}
async function joinPeer(code, onStatus) {
  const Peer = await loadPeer(), peer = new Peer({debug: 0, config: {iceServers: ICE}});
  await new Promise((resolve, reject) => { const timer=setTimeout(()=>{peer.destroy();reject(Error('連線服務回應逾時'));},10000);peer.on('open',()=>{clearTimeout(timer);resolve();}); peer.on('error', (e) => {clearTimeout(timer); peer.destroy(); reject(Error('連線服務暫時無法使用（' + e.type + '）')); }); });
  onStatus('正在連線到房間 ' + code + '…');
  return new Promise((resolve, reject) => {
    const conn = peer.connect(PEER_PREFIX + code, {reliable: true, serialization: 'json'});
    const timer = setTimeout(() => { peer.destroy(); reject(Error('連不上房間 ' + code + '（房號錯誤，或網路不允許直接連線）')); }, 15000);
    peer.on('error', (e) => { clearTimeout(timer); peer.destroy(); reject(Error(e.type === 'peer-unavailable' ? '找不到房間 ' + code + '，請確認房號' : '連線失敗（' + e.type + '）')); });
    conn.on('open', () => {
      const ch = wrapConn(conn, peer);
      clearTimeout(timer); resolve(ch);
    });
  });
}

/* ---------- Firebase Realtime Database (pairing, signaling, relay fallback) ---------- */
let fb = null;
async function firebase() {
  if (fb) return fb;
  const V = '10.12.2', app = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`), db = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
  const a = app.initializeApp(FIREBASE_CONFIG, 'hlqj-pk');
  return (fb = {...db, db: db.getDatabase(a)});
}
const STALE = 15 * 60 * 1000;
async function hostFirebase(code, onStatus) {
  const F = await firebase(), room = F.ref(F.db, 'pkRooms/' + code);
  const claim = await F.runTransaction(room, (cur) => (cur && Date.now() - (cur.at || 0) < STALE ? undefined : {at: Date.now(), state: 'open'}));
  if (!claim.committed) { const e = Error('taken'); e.code = 'taken'; throw e; }
  F.onDisconnect(room).remove();
  onStatus('等待對手輸入房號…');
  let resolve, reject; const ready = new Promise((r, j) => { resolve = r; reject = j; });
  const offs = [];
  const stop = () => { offs.forEach((f) => f()); };
  offs.push(F.onValue(F.ref(F.db, 'pkRooms/' + code + '/guest'), async (snap) => {
    if (!snap.val() || offs.started) return; offs.started = true;
    try { resolve(await linkFirebase(F, code, 'host', onStatus)); } catch (e) { reject(e); } finally { stop(); }
  }));
  return {code, ready, cancel() { stop(); F.remove(room); }};
}
async function joinFirebase(code, onStatus) {
  const F = await firebase(), room = F.ref(F.db, 'pkRooms/' + code);
  await F.get(room); /* prime the local cache so the transaction starts from the server's value */
  const res = await F.runTransaction(F.ref(F.db, 'pkRooms/' + code), (cur) => {
    if (!cur || Date.now() - (cur.at || 0) > STALE || cur.guest) return undefined;
    return {...cur, guest: Date.now(), state: 'paired'};
  });
  if (!res.committed) {
    const cur = (await F.get(room)).val();
    throw Error(cur?.guest ? '這個房間已經有人了' : '找不到房間 ' + code + '，請確認房號');
  }
  onStatus('正在連線到房間 ' + code + '…');
  return linkFirebase(F, code, 'guest', onStatus);
}
/* WebRTC through the room's offer / answer / ICE nodes; after 12 s without a direct link the room relays the messages */
function linkFirebase(F, code, role, onStatus) {
  const base = 'pkRooms/' + code + '/', at = (p) => F.ref(F.db, base + p), mine = role === 'host' ? 'hostIce' : 'guestIce', theirs = role === 'host' ? 'guestIce' : 'hostIce';
  const pc = new RTCPeerConnection({iceServers: ICE}), offs = [];
  return new Promise((resolve, reject) => {
    let done = false, relayCh = null;
    const finish = (ch) => { if (done) return; done = true; clearTimeout(timer); resolve(ch); };
    pc.onicecandidate = (e) => { if (e.candidate) F.push(at(mine), e.candidate.toJSON()); };
    offs.push(F.onChildAdded(at(theirs), (s) => { pc.addIceCandidate(s.val()).catch(() => {}); }));
    const useDc = (dc) => {
      dc.onopen = () => {
        const ch = makeChannel('firebase-p2p', (o) => dc.send(JSON.stringify(o)), () => { dc.close(); pc.close(); });
        dc.onmessage = (e) => ch._recv(JSON.parse(e.data)); dc.onclose = () => ch._gone();
        offs.forEach((f) => f()); if (role === 'host') setTimeout(() => F.remove(F.ref(F.db, 'pkRooms/' + code)), 2000);
        finish(ch);
      };
    };
    if (role === 'host') {
      useDc(pc.createDataChannel('pk', {ordered: true}));
      pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => F.set(at('offer'), {type: pc.localDescription.type, sdp: pc.localDescription.sdp}));
      offs.push(F.onValue(at('answer'), (s) => { const a = s.val(); if (a && !pc.currentRemoteDescription) pc.setRemoteDescription(a).catch(console.warn); }));
    } else {
      pc.ondatachannel = (e) => useDc(e.channel);
      offs.push(F.onValue(at('offer'), async (s) => {
        const o = s.val(); if (!o || pc.currentRemoteDescription) return;
        await pc.setRemoteDescription(o); const a = await pc.createAnswer(); await pc.setLocalDescription(a);
        F.set(at('answer'), {type: a.type, sdp: a.sdp});
      }));
    }
    /* relay: messages go through pkRooms/<code>/to<Role> lists, read and removed by the other side */
    const timer = setTimeout(() => {
      if (done) return; onStatus('改用伺服器中繼連線…'); pc.close();
      const inbox = at(role === 'host' ? 'toHost' : 'toGuest'), outbox = at(role === 'host' ? 'toGuest' : 'toHost');
      relayCh = makeChannel('firebase-relay', (o) => F.push(outbox, o), () => { offs.forEach((f) => f()); F.remove(F.ref(F.db, 'pkRooms/' + code)); });
      offs.push(F.onChildAdded(inbox, (s) => { relayCh._recv(s.val()); F.remove(s.ref); }));
      F.onDisconnect(F.ref(F.db, base + 'gone')).set(role);
      offs.push(F.onValue(at('gone'), (s) => { if (s.val() && s.val() !== role) relayCh._gone(); }));
      done = true; resolve(relayCh);
    }, 12000);
    void reject;
  });
}

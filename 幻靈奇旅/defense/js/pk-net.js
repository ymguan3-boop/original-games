/* PK rooms: a 4-character code (letters and digits, without the look-alikes 0 O 1 I) pairs two players, then the two
   devices talk directly over a WebRTC data channel. How the pair finds each other:
   - Firebase Realtime Database, when js/pk-config.js holds the project's config: the room lives at pkRooms/<code>
     (offer, answer and ICE candidates); if no direct link can be made the messages are relayed through the room.
   - otherwise the PeerJS public broker (no account needed): the host registers the peer id "hlqj-pk-<code>".
   - ?pknet=local: two tabs of the same browser over a BroadcastChannel (testing).
   Every transport returns the same channel: send(obj), onmessage(obj), onclose(), close(), kind. */
import {FIREBASE_CONFIG} from './pk-config.js?v=20261104-v22';

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeCode = (rand = Math.random) => Array.from({length: 4}, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
export const normalizeCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
export const validCode = (s) => s.length === 4 && [...s].every((c) => CODE_CHARS.includes(c));
const PEER_PREFIX = 'hlqj-pk-', ICE = [{urls: 'stun:stun.l.google.com:19302'}, {urls: 'stun:stun1.l.google.com:19302'}];

export function transportKind() {
  if (/[?&]pknet=local/.test(location.search)) return 'local';
  return FIREBASE_CONFIG ? 'firebase' : 'peerjs';
}

function makeChannel(kind, sendRaw, close) {
  const ch = {kind, onmessage: null, onclose: null, closed: false,
    send(obj) { if (!ch.closed) try { sendRaw(obj); } catch (e) { console.warn(e); } },
    close() { if (ch.closed) return; ch.closed = true; try { close(); } catch {} },
    _recv(obj) { if (!ch.closed) ch.onmessage?.(obj); },
    _gone() { if (ch.closed) return; ch.closed = true; ch.onclose?.(); }};
  return ch;
}

/* host: open a room and wait for the guest. Returns {code, ready: Promise<channel>, cancel()} */
export async function hostRoom({onStatus = () => {}} = {}) {
  const kind = transportKind();
  for (let tries = 0; tries < 5; tries++) {
    const code = makeCode();
    try {
      if (kind === 'local') return hostLocal(code);
      if (kind === 'peerjs') return await hostPeer(code, onStatus);
      return await hostFirebase(code, onStatus);
    } catch (e) { if (e.code !== 'taken') throw e; }
  }
  throw Error('暫時無法建立房間，請稍後再試');
}
/* guest: join a room by its code. Returns a channel once connected; throws a friendly error otherwise */
export async function joinRoom(code, {onStatus = () => {}} = {}) {
  const kind = transportKind();
  if (kind === 'local') return joinLocal(code);
  if (kind === 'peerjs') return joinPeer(code, onStatus);
  return joinFirebase(code, onStatus);
}

/* ---------- local: BroadcastChannel ---------- */
function hostLocal(code) {
  const bc = new BroadcastChannel('hlqj-pk-' + code); let ch = null, resolve;
  const ready = new Promise((r) => (resolve = r));
  bc.onmessage = (e) => {
    const m = e.data;
    if (m.k === 'hello' && !ch) { ch = makeChannel('local', (o) => bc.postMessage({k: 'h2g', o}), () => { bc.postMessage({k: 'bye'}); bc.close(); }); bc.postMessage({k: 'welcome'}); resolve(ch); }
    else if (m.k === 'g2h') ch?._recv(m.o); else if (m.k === 'bye') ch?._gone(); else if (m.k === 'hello' && ch) bc.postMessage({k: 'full'});
  };
  return {code, ready, cancel() { bc.close(); }};
}
function joinLocal(code) {
  return new Promise((resolve, reject) => {
    const bc = new BroadcastChannel('hlqj-pk-' + code); let ch = null;
    const timer = setTimeout(() => { bc.close(); reject(Error('找不到房間 ' + code + '，請確認房號')); }, 2500);
    bc.onmessage = (e) => {
      const m = e.data;
      if (m.k === 'welcome' && !ch) { clearTimeout(timer); ch = makeChannel('local', (o) => bc.postMessage({k: 'g2h', o}), () => { bc.postMessage({k: 'bye'}); bc.close(); }); resolve(ch); }
      else if (m.k === 'full' && !ch) { clearTimeout(timer); bc.close(); reject(Error('這個房間已經有人了')); }
      else if (m.k === 'h2g') ch?._recv(m.o); else if (m.k === 'bye') ch?._gone();
    };
    bc.postMessage({k: 'hello'});
  });
}

/* ---------- PeerJS public broker ---------- */
let peerLib = null;
function loadPeer() {
  if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
  return peerLib ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = new URL('../vendor/peerjs.min.js', import.meta.url).href;
    s.onload = () => resolve(globalThis.Peer); s.onerror = () => reject(Error('連線元件載入失敗')); document.head.append(s);
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
    peer.on('open', resolve);
    peer.on('error', (e) => { const err = Error(e.type === 'unavailable-id' ? 'taken' : '連線服務暫時無法使用（' + e.type + '）'); if (e.type === 'unavailable-id') err.code = 'taken'; peer.destroy(); reject(err); });
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
  await new Promise((resolve, reject) => { peer.on('open', resolve); peer.on('error', (e) => { peer.destroy(); reject(Error('連線服務暫時無法使用（' + e.type + '）')); }); });
  onStatus('正在連線到房間 ' + code + '…');
  return new Promise((resolve, reject) => {
    const conn = peer.connect(PEER_PREFIX + code, {reliable: true, serialization: 'json'});
    const timer = setTimeout(() => { peer.destroy(); reject(Error('連不上房間 ' + code + '（房號錯誤，或網路不允許直接連線）')); }, 15000);
    peer.on('error', (e) => { clearTimeout(timer); peer.destroy(); reject(Error(e.type === 'peer-unavailable' ? '找不到房間 ' + code + '，請確認房號' : '連線失敗（' + e.type + '）')); });
    conn.on('open', () => {
      const ch = wrapConn(conn, peer), first = (o) => { if (o?.t === 'full') { ch.close(); clearTimeout(timer); reject(Error('這個房間已經有人了')); } };
      const prev = ch._recv; ch._recv = (o) => { first(o); prev(o); };
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

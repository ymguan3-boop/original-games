/* PK 競技場 lobby: pick a name, create a room (shows a 4-character code) or join one by typing the code, see both
   decks, and press 確認出戰 on both sides to start. Each player fights with their own current 出擊卡組. The lobby owns the
   room channel and hands it to the battle as a session: {role, ch, me, foe, seed, on(type, fn)}. */
import {hostRoom, joinRoom, normalizeCode, validCode, transportKind} from './pk-net.js?v=20261110-relay-r3';
import {PK_ITEMS} from './rules.js?v=20261107-fixes-r1';

export function createPkLobby({openModal, closeModal, ribbon, esc, picture, spirit, deck, validateDeck, inventory = () => ({}), costume = () => 'trainer', name, setName, toast, onStart, onEditDeck = () => {}, network = {hostRoom, joinRoom}}) {
  let session = null, hosting = null, attempt = 0, helloTimer = null;
  const stopHello = () => { clearInterval(helloTimer); helloTimer = null; };
  const deckError = 'PK 必須編滿四個基礎格（三色蛋佔三格），請先調整出擊編組。';
  const notice = text => `<p id="pkNotice" class="pk-error" role="alert">${esc(text || '')}</p>`;
  const editButton = '<button class="tool" id="pkEditDeck">調整出擊編組</button>';
  const bindEdit = () => { if ($('pkEditDeck')) $('pkEditDeck').onclick = () => { leave(); closeModal(); onEditDeck(); }; };
  const valid = ids => typeof validateDeck === 'function' && validateDeck(ids);
  const requireDeck = () => { if (valid(deck())) return true; if ($('pkNotice')) $('pkNotice').textContent = deckError; else toast(deckError); return false; };
  const readyDecks = s => !!s && valid(s.me.deck) && valid(s.foe?.deck) && valid(deck());
  const strip = (ids) => `<div class="pk-deck">${ids.map((id) => `<img src="${picture(id)}" alt="${esc(spirit(id)?.name || id)}" title="${esc(spirit(id)?.name || id)}" data-frame="${spirit(id)?.cardFrame || 'yellow'}">`).join('')}</div>`;
  const kindNote = () => ({local: '本機測試模式：請在同一個瀏覽器開兩個分頁', https: 'HTTPS 中繼連線：支援同一帳號、同一 IP；不需要玩家之間建立 WebRTC 直連。', peerjs: '', firebase: ''}[transportKind()] || '');
  const $ = (id) => document.getElementById(id);

  function home(msg = '') {
    leave();
    openModal(`${ribbon('PK 競技場', '⚔️')}
      <p class="result-sub">支援同一 IP；同一帳號也可開兩個網頁，用房號互相對戰。兩位玩家用自己的出擊卡組對戰：各自發牌、派出幻靈往對方基地推進，先打倒對方基地的人獲勝。</p>
      <label class="pk-name">我的名字<input id="pkName" maxlength="8" value="${esc(name())}" autocomplete="off"></label>
      <h3 class="roster-group">我的出擊卡組</h3>${strip(deck())}
      ${notice(msg || (valid(deck()) ? '' : deckError))}
      <div class="pk-choices">
        <button class="primary big" id="pkCreate">建立房間<small>取得 4 碼房號給對手</small></button>
        <button class="big" id="pkJoin">進入房間<small>輸入對手的 4 碼房號</small></button>
      </div>
      ${kindNote() ? `<p class="pk-note">${kindNote()}</p>` : ''}
      <div class="modal-actions center">${editButton}<button class="tool" data-close>返回海圖</button></div>`, 'howto pk');
    bindEdit();
    const keep = () => setName(($('pkName').value || '').trim().slice(0, 8) || name());
    $('pkCreate').onclick = () => { keep(); create(); };
    $('pkJoin').onclick = () => { keep(); join(); };
  }

  async function create() {
    if (!requireDeck()) return;
    const request=++attempt;
    openModal(`${ribbon('建立房間', '⚔️')}<p class="pk-status" id="pkStatus">正在建立房間…</p><div class="modal-actions center"><button class="tool" id="pkBack">取消</button></div>`, 'howto pk');
    $('pkBack').onclick = () => home();
    try {
      const h = await network.hostRoom({onStatus: (t) => { if (request===attempt&&$('pkStatus')) $('pkStatus').textContent = t; }});
      if (request!==attempt) { h.cancel(); return; }hosting=h;
      openModal(`${ribbon('建立房間', '⚔️')}
        <p class="result-sub">把這組房號告訴對手，對手按「進入房間」輸入後就會連上。</p>
        <div class="pk-code" aria-label="房號">${[...h.code].map((c) => `<b>${c}</b>`).join('')}</div>
        <p class="pk-status" id="pkStatus">等待對手輸入房號…</p>
        <div class="modal-actions center"><button class="tool" id="pkBack">取消</button></div>`, 'howto pk');
      $('pkBack').onclick = () => home();
      const ch = await h.ready;
      if (hosting !== h) { ch.close(); return; }
      hosting = null; begin('host', ch, h.code);
    } catch (e) { if (request===attempt) home(e.message); }
  }

  function join() {
    if (!requireDeck()) return;
    const request=++attempt;
    openModal(`${ribbon('進入房間', '⚔️')}
      <p class="result-sub">輸入對手給你的 4 碼房號（英文字母與數字）。</p>
      <input id="pkCode" class="pk-code-input" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="例如 K7PQ" inputmode="text">
      <p class="pk-status" id="pkStatus"></p>${notice()}
      <div class="modal-actions center">${editButton}<button class="tool" id="pkBack">返回</button><button class="primary big" id="pkGo">進入</button></div>`, 'howto pk');
    bindEdit();
    const input = $('pkCode'); input.focus();
    input.oninput = () => { const v = normalizeCode(input.value); if (input.value !== v) input.value = v; };
    input.onkeydown = (e) => { if (e.key === 'Enter') $('pkGo').click(); };
    $('pkBack').onclick = () => home();
    $('pkGo').onclick = async () => {
      if (!requireDeck()) return;
      const code = normalizeCode(input.value);
      if (!validCode(code)) { $('pkStatus').textContent = '房號是 4 碼英文字母或數字'; return; }
      $('pkGo').disabled = true; $('pkStatus').textContent = '正在連線…';
      try {const ch=await network.joinRoom(code,{onStatus:t=>{if(request===attempt&&$('pkStatus'))$('pkStatus').textContent=t;}});if(request!==attempt){ch.close();return;}begin('guest',ch,code);}
      catch (e) { if (request===attempt&&$('pkStatus')) { $('pkStatus').textContent = e.message; $('pkGo').disabled = false; } }
    };
  }

  /* connected: swap names and decks, then both confirm */
  function begin(role, ch, code) {
    if (!requireDeck()) { ch.close(); home(deckError); return; }
    stopHello();
    const handlers = {}, pending = {};
    session = {role, ch, code, me: {name: name(), deck: deck(), stock: inventory(), costume: costume()}, foe: null, ready: {me: false, foe: false}, handlers,
      on(type, fn) { handlers[type] = fn;const messages=pending[type];delete pending[type];if(messages)queueMicrotask(()=>messages.forEach(m=>{if(session?.handlers===handlers)fn(m);})); }, send(o) { ch.send(o); }};
    ch.onmessage = (m) => {if(handlers[m?.t])handlers[m.t](m);else if(['loaded','snap','act','quit'].includes(m?.t)){const list=pending[m.t]||=[];if(m.t==='snap')list.length=0;if(list.length<32)list.push(m);}};
    ch.onclose = () => { stopHello(); const s = session; session = null; if (s?.inBattle) s.onGone?.(); else home('對手已離開房間'); };
    session.on('hello_ack', () => { if (session) session.helloAck = true; });
    session.on('hello', (m) => {
      const s = session; if (!s || s.inBattle) return;
      s.send({t:'hello_ack'});
      if (!valid(m.deck)) { s.foe = null; s.ready = {me:false, foe:false}; s.error = '對手卡組無法使用：需四個基礎格（三色蛋佔三格）。請雙方更新網頁並調整出擊編組後重新建立房間。'; room(); return; }
      const signature = JSON.stringify([m.name, m.deck]);
      if (s.foe && s.foeSignature === signature) return; // a retry must not cancel either player's confirmation
      s.foeSignature = signature; s.error = '';
      const stock = {};
      for (const id of PK_ITEMS)
        stock[id] = Math.min(99, Math.max(0, Math.floor(Number(m.stock?.[id]) || 0)));
      session.foe = {name: String(m.name || '對手').slice(0, 8),
        deck: m.deck.slice(), stock,
        costume: typeof m.costume === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(m.costume) ? m.costume : 'trainer'};
      session.ready = {me:false, foe:false};
      room();
    });
    session.on('stock', (m) => {
      if (!session.foe) return;
      for (const id of PK_ITEMS)
        session.foe.stock[id] = Math.min(99, Math.max(0, Math.floor(Number(m.stock?.[id]) || 0)));
      if (typeof m.costume === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(m.costume)) session.foe.costume = m.costume;
    });
    session.on('ready', (m) => { session.ready.foe = !!m.on && readyDecks(session); room(); maybeStart(); });
    session.on('start', (m) => { if (role === 'guest') launch(m.seed); });
    session.on('bye', () => {ch._gone?.();ch.close();});session.on('full',()=>home('這個房間已經有人了'));
    const connected = session;
    const sendHello = () => ch.send({t: 'hello', name: connected.me.name, deck: connected.me.deck, stock: connected.me.stock, costume: connected.me.costume});
    sendHello();
    let retries = 0;
    helloTimer = setInterval(() => {
      if (session !== connected || connected.inBattle) return stopHello();
      if (connected.helloAck && connected.foe) return stopHello();
      if (++retries > 20) { stopHello(); connected.error ||= '未收到完整對手資料，請雙方重新整理網頁，再離開並重新建立房間。'; room(); return; }
      sendHello();
    }, 1500);
    room();
  }
  function room() {
    const s = session; if (!s || s.inBattle) return;
    const side = (who, p, ready) => `<div class="pk-side ${ready ? 'is-ready' : ''}"><h3>${who}<b>${esc(p?.name || '…')}</b>${ready ? '<em>已確認</em>' : ''}</h3>${p ? strip(p.deck) : '<p class="muted">等待對手資料…</p>'}</div>`;
    openModal(`${ribbon('對戰準備・房號 ' + esc(s.code), '⚔️')}
      ${notice(s.error || (!valid(deck()) ? deckError : ''))}
      <div class="pk-versus">${side('我方', s.me, s.ready.me)}<div class="pk-vs">VS</div>${side('對手', s.foe, s.ready.foe)}</div>
      <p class="result-sub">雙方都按下「確認出戰」後開始。限時 4 分鐘：時間到時比基地剩餘血量，一樣多再比擊倒數。</p>
      <div class="modal-actions center"><button class="tool" id="pkLeave">離開房間</button>${editButton}<button class="primary big" id="pkReady" ${readyDecks(s) ? '' : 'disabled'}>${s.ready.me ? '取消確認' : '確認出戰'}</button></div>`, 'howto pk');
    bindEdit();
    $('pkLeave').onclick = () => home();
    $('pkReady').onclick = () => { if (!requireDeck() || !readyDecks(s)) return; s.ready.me = !s.ready.me; s.send({t: 'ready', on: s.ready.me}); room(); maybeStart(); };
  }
  function maybeStart() {
    const s = session; if (!s || s.role !== 'host' || !s.ready.me || !s.ready.foe || !s.foe || !readyDecks(s)) return;
    const seed = Math.floor(Math.random() * 2 ** 31); s.send({t: 'start', seed}); launch(seed);
  }
  function launch(seed) {
    const s = session; if (!s || s.inBattle) return;
    if (!readyDecks(s) || !s.ready.me || !s.ready.foe) { s.error = '雙方都需編滿四個基礎格並確認出戰'; room(); return; }
    stopHello();
    s.inBattle = true; s.seed = seed; s.ready = {me: false, foe: false};
    closeModal(); onStart(s);
  }
  /* after a match: back to the ready screen with the same opponent */
  function rematch() { if (!requireDeck()) { home(deckError); return; } if (!session) return home('對手已離開房間'); session.inBattle = false; session.ready = {me: false, foe: false}; ['snap', 'act', 'quit', 'loaded', 'itemUsed', 'itemDenied'].forEach((k) => delete session.handlers[k]); session.me.stock = inventory(); session.me.costume = costume(); session.send({t:'stock',stock:session.me.stock,costume:session.me.costume}); room(); }
  function leave() {
    stopHello();
    ++attempt;
    if (hosting) { hosting.cancel(); hosting = null; }
    if (session) { try { session.send({t: 'bye'}); } catch {} const ch = session.ch; session = null; setTimeout(() => ch.close(), 150); }
  }
  return {open: () => home(), rematch, leave, get session() { return session; }};
}

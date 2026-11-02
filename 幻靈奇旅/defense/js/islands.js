/* 幻靈群島 sea chart: one island per stage joined by sea lanes, plus the 初光鎮 pier. The boat sails lane by lane
   (SVG path lengths), so moving between far islands follows the route through every island in between. */
const W = 1000, H = 620;
const MOBILE_W = 700, MOBILE_H = 1120;
const isPortrait = () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait) and (max-width: 720px)').matches;
/* A compact portrait archipelago uses a readable two-column, five-row sailing route instead of
   shrinking the entire desktop chart to postage-stamp islands. Ordering remains port -> 1 ... -> 10. */
const MOBILE_SPOTS = [[210, 924], [485, 924], [485, 742], [210, 742], [210, 560],
  [485, 560], [485, 378], [210, 378], [210, 196], [485, 196]];
const MOBILE_HOME = [80, 1040];
const spots = () => isPortrait() ? MOBILE_SPOTS : SPOTS;
const home = () => isPortrait() ? MOBILE_HOME : HOME;
/* index -1 is the town pier; 0..9 are the stages */
export const SPOTS = [[240, 470], [262, 352], [186, 196], [362, 104], [506, 236], [438, 420], [622, 512], [724, 320], [648, 140], [864, 236]];
const HOME = [102, 556];
/* where the boat waits at the town pier (the end of the drawn pier) */
const HOME_DOCK = [HOME[0] + 62, HOME[1] + 6];
const LOOK = {
  meadow: {top: '#7fcf62', side: '#4f9a3e', icon: '🌾'}, pond: {top: '#69c9a8', side: '#3f8f78', icon: '🐸'},
  waterfall: {top: '#6fc2d6', side: '#3d7f99', icon: '💦'}, orchard: {top: '#8bd168', side: '#5b9a3e', icon: '🍎'},
  forge: {top: '#a9a6a0', side: '#6f6b66', icon: '⚡'}, desert: {top: '#f0c27a', side: '#c98c45', icon: '🌵'},
  observatory: {top: '#b6a6e8', side: '#7a68b8', icon: '🔭'}, night: {top: '#5a6aa8', side: '#33406f', icon: '🌙'},
  tower: {top: '#f2a9c6', side: '#c06a90', icon: '🗼'}, abyss: {top: '#4f8fd0', side: '#2b5590', icon: '🐉'},
};

/* the boat docks on the water at each island's south-west shore; the lanes run between these docking points */
const pt = (i) => i < 0 ? (isPortrait() ? [MOBILE_HOME[0] + 62, MOBILE_HOME[1] + 6] : HOME_DOCK)
  : [spots()[i][0] - 66, spots()[i][1] + 14];
/* a gentle S-curve between two points */
function lane(a, b, bend) {
  const [x1, y1] = pt(a), [x2, y2] = pt(b), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const cx = mx - dy / len * bend, cy = my + dx / len * bend;
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
}
const blob = (r, seed) => {
  const pts = [];
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = r * (0.82 + 0.18 * Math.abs(Math.sin(seed * 3.7 + k * 1.9))); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.62]); }
  /* smooth closed outline: midpoints are the anchors, the jittered rim points the curve controls */
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  let d = 'M' + f(mid(pts[pts.length - 1], pts[0]));
  pts.forEach((p, k) => { d += ` Q${f(p)} ${f(mid(p, pts[(k + 1) % pts.length]))}`; });
  return d + 'Z';
};

export function createIslandMap(host, {stages, onPick, onHome, esc = (s) => s}) {
  let state = {open: 0, cleared: {}, selected: 0, boatAt: -1, bosses: [], art: null, homeArt: null}, sailing = null, raf = 0;
  host.innerHTML = `<svg class="sea-chart" viewBox="0 0 ${isPortrait() ? MOBILE_W : W} ${isPortrait() ? MOBILE_H : H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="幻靈群島航海圖">
    <defs>
      <pattern id="seaWaves" width="60" height="26" patternUnits="userSpaceOnUse"><path d="M0 13 Q15 5 30 13 T60 13" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/></pattern>
      <radialGradient id="seaGlow" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#5fc6ec"/><stop offset="1" stop-color="#2a86c4"/></radialGradient>
      <filter id="isleShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="4" flood-color="#0b3f6a" flood-opacity=".35"/></filter>
      <filter id="locked"><feColorMatrix type="saturate" values=".15"/><feComponentTransfer><feFuncA type="linear" slope=".85"/></feComponentTransfer></filter>
    </defs>
    <rect x="-1500" y="-1500" width="${W + 3000}" height="${H + 3000}" fill="#2f8fcc"/><rect width="${W}" height="${H}" fill="url(#seaGlow)"/>
    <rect class="waves-a" x="-1500" y="-1500" width="${W + 3060}" height="${H + 3000}" fill="url(#seaWaves)"/>
    <g class="lanes"></g><g class="isles"></g><g class="home"></g><g class="boat-layer"></g>
  </svg>`;
  const svg = host.querySelector('svg'), lanesG = svg.querySelector('.lanes'), islesG = svg.querySelector('.isles'), homeG = svg.querySelector('.home'), boatG = svg.querySelector('.boat-layer');
  /* lanes: home->0, then i->i+1 */
  const lanePaths = [];
  for (let i = -1; i < stages.length - 1; i++) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', lane(i, i + 1, (i % 2 ? 1 : -1) * 38)); p.setAttribute('class', 'lane'); lanesG.append(p); lanePaths.push(p);
  }
  /* the town harbour: a drawn pier until the 3D picture is ready, then the rendered dock with the boatman; clicking it
     opens the boatman's menu (rules, gacha, back to town) */
  const homeLabel = '<g class="isle-label" transform="translate(0,52)"><rect x="-62" y="-14" width="124" height="24" rx="12"/><text text-anchor="middle" y="3" class="isle-name">初光鎮碼頭・船夫</text></g>';
  const drawHome = (url) => { homeG.innerHTML = '<g class="home-hit" transform="translate(' + home()[0] + ',' + home()[1] + ')" role="button" tabindex="0" aria-label="初光鎮碼頭：和船夫對話">' + (url ? '<image href="' + url + '" x="-100" y="-90" width="200" height="154"/>' : '<rect x="-34" y="-8" width="58" height="12" rx="3" fill="#b07a45" stroke="#6e4a2a" stroke-width="2"/>') + '<rect x="-100" y="-90" width="200" height="154" fill="transparent"/>' + homeLabel + '</g>'; };
  drawHome(null);
  homeG.addEventListener('click', () => !sailing && onHome?.());
  homeG.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHome?.(); } });
  /* a little speedboat: white hull with a red stripe, windshield and the hero at the wheel */
  boatG.innerHTML = `<g class="boat"><g class="boat-bob"><path d="M-26,-2 L18,-2 Q30,-1 34,6 Q30,12 16,13 L-24,13 Q-28,6 -26,-2 Z" fill="#fbfbf6" stroke="#33445e" stroke-width="2.5"/><path d="M-25,7 L31,7" stroke="#e23c34" stroke-width="3.5"/><path d="M4,-2 L12,-14 L16,-14 L14,-2 Z" fill="#8fd3ff" stroke="#33445e" stroke-width="2"/><circle cx="-4" cy="-14" r="5.5" fill="#2b1f1a"/><rect x="-9" y="-9" width="10" height="8" rx="2" fill="#3a8fe0"/><rect x="-24" y="-6" width="8" height="5" rx="1.5" fill="#e23c34"/><rect x="-30" y="-3" width="5" height="12" rx="1.5" fill="#2b2b33"/></g><ellipse class="wake" cx="-36" cy="10" rx="12" ry="3" fill="rgba(255,255,255,.65)"/></g>`;
  const boat = boatG.querySelector('.boat');

  function renderIsles() {
    islesG.innerHTML = stages.map((s, i) => {
      const [x, y] = spots()[i], look = LOOK[s.scene] || LOOK.meadow, locked = i > state.open, cleared = !!state.cleared[s.id], sel = state.selected === i, r = 46 + (s.path?.length || 0) % 3 * 3;
      return `<g class="isle ${locked ? 'is-locked' : ''} ${cleared ? 'is-cleared' : ''} ${sel ? 'is-selected' : ''}" data-isle="${i}" transform="translate(${x},${y})" tabindex="${locked ? -1 : 0}" role="button" aria-label="${i + 1}. ${esc(s.name)}${locked ? '（未解鎖）' : ''}">
        ${sel ? `<ellipse class="isle-ring" rx="${r + 16}" ry="${(r + 16) * 0.62}"/>` : ''}
        ${state.art?.[i] ? `<image href="${state.art[i]}" x="-78" y="-82" width="156" height="120"/>${locked ? '<text class="isle-lock" x="36" y="-44" text-anchor="middle">🔒</text>' : ''}` : `<g filter="url(#isleShadow)">
          <path d="${blob(r + 6, i + 1)}" fill="#f2deaa" transform="translate(0,6)"/>
          <path d="${blob(r, i + 1)}" fill="${look.side}" transform="translate(0,4)"/>
          <path d="${blob(r - 4, i + 2)}" fill="${look.top}"/>
        </g>
        <text class="isle-icon" y="-4" text-anchor="middle">${look.icon}</text>${locked ? '<text class="isle-lock" x="36" y="-44">🔒</text>' : ''}`}
        ${state.bosses[i] && !locked && !state.art?.[i] ? `<image href="${state.bosses[i]}" x="${r - 28}" y="-${r * 0.62 + 10}" width="30" height="30" class="isle-boss" clip-path="circle(15px at 15px 15px)"/>` : ''}
        <g class="isle-label" transform="translate(0,${r * 0.62 + 20})"><rect x="-58" y="-14" width="116" height="24" rx="12"/><text text-anchor="middle" y="3" class="isle-name">${i + 1}. ${esc(s.name)}</text></g>
        ${cleared ? `<text class="isle-flag" x="${-r + 6}" y="${-r * 0.4}">🚩</text>` : ''}
      </g>`;
    }).join('');
  }
  function placeBoat(x, y, dir = 1) { boat.setAttribute('transform', `translate(${x},${y}) scale(${dir < 0 ? -1 : 1},1)`); }
  function boatTo(i) { const [x, y] = pt(i); placeBoat(x, y); }

  /* sail along the lanes from `from` to `to` (either direction), lane by lane; resolves on arrival */
  function sail(from, to, {speed = 260} = {}) {
    cancelAnimationFrame(raf);
    const legs = [];
    if (to > from) for (let i = from; i < to; i++) legs.push({path: lanePaths[i + 1], reverse: false, end: i + 1});
    else for (let i = from; i > to; i--) legs.push({path: lanePaths[i], reverse: true, end: i - 1});
    if (!legs.length) { boatTo(to); return Promise.resolve(); }
    host.classList.add('sailing');
    return new Promise((resolve) => {
      let leg = 0, t0 = performance.now();
      const step = (now) => {
        const L = legs[leg], total = L.path.getTotalLength(), dur = Math.max(500, total / speed * 1000), k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const d = (L.reverse ? 1 - e : e) * total, p = L.path.getPointAtLength(d), q = L.path.getPointAtLength(Math.min(total, Math.max(0, d + (L.reverse ? -2 : 2))));
        /* lift the boat off the island centre at both ends of a leg so it docks at the shore */
        const lift = Math.sin(Math.min(1, k * 4) * Math.PI / 2) * Math.sin(Math.min(1, (1 - k) * 4) * Math.PI / 2);
        placeBoat(p.x, p.y + 4 * lift, q.x >= p.x ? 1 : -1);
        if (k >= 1) {
          state.boatAt = L.end; leg++; t0 = now;
          if (leg >= legs.length) { host.classList.remove('sailing'); sailing = null; boatTo(to); resolve(); return; }
        }
        raf = requestAnimationFrame(step);
      };
      sailing = {from, to}; raf = requestAnimationFrame(step);
    });
  }

  islesG.addEventListener('click', (e) => { const g = e.target.closest('[data-isle]'); if (g && !sailing) onPick?.(Number(g.dataset.isle)); });
  islesG.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('[data-isle]'); if (g) { e.preventDefault(); onPick?.(Number(g.dataset.isle)); } });

  let portraitLayout = isPortrait();
  const updateLayout = () => {
    const portrait = isPortrait();
    if (portrait === portraitLayout || sailing) return;
    portraitLayout = portrait;
    svg.setAttribute('viewBox', `0 0 ${portrait ? MOBILE_W : W} ${portrait ? MOBILE_H : H}`);
    lanePaths.forEach((p, i) => p.setAttribute('d', lane(i - 1, i, ((i - 1) % 2 ? 1 : -1) * 38)));
    drawHome(state.homeArt);
    renderIsles();
    boatTo(state.boatAt);
  };
  window.addEventListener('resize', updateLayout);
  return {
    update(next) { state = {...state, ...next}; renderIsles(); if (!sailing) boatTo(state.boatAt); },
    /* swap the drawn icon for the rendered speedboat picture (hull centred on the lane) */
    setBoatImage(url) { boat.querySelector('.boat-bob').innerHTML = `<image href="${url}" x="-34" y="-38" width="68" height="49"/>`; },
    /* the 3D island pictures replace the flat shapes and icons */
    setIslandArt(urls) { state.art = urls; renderIsles(); },
    setHomeArt(url) { state.homeArt = url; drawHome(url); },
    sail, get sailing() { return !!sailing; }, get boatAt() { return state.boatAt; },
  };
}

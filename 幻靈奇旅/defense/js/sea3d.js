/* 幻靈群島 sea chart, live in 3D: the ten island models, the town pier and the speedboat stand in one Three.js scene on an
   animated toon ocean. The player pans (drag), zooms (wheel / pinch / buttons) and tilts or turns (right-drag) the view; the
   boat sails the curved lanes between the docking points. It replaces the old SVG chart that placed pre-rendered pictures. */
const UNIT = 20;                                   /* old chart pixels per world unit */
export const SPOTS = [[240, 470], [262, 352], [186, 196], [362, 104], [506, 236], [438, 420], [622, 512], [724, 320], [648, 140], [864, 236]];
const HOME = [102, 556];
/* portrait: a seven-star (Big Dipper) pattern: the handle rises from the pier, the bowl closes at islands 5-8, then two more stars lead on */
export const MOBILE_SPOTS = [[170, 735], [330, 690], [470, 620], [560, 520], [480, 420], [260, 370], [230, 240], [470, 260], [600, 160], [380, 90]];
const MOBILE_HOME = [80, 805];
/* the PK colosseum island, just above (north of) the town pier */
const PK_SPOT = [92, 404], MOBILE_PK_SPOT = [66, 640];
const WATER_Y = -0.12, PITCH = 0.95, FOV = 38;
const isPortrait = () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait) and (max-width: 720px)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

import {ico} from './ui-icons.js?v=20261107-c5';

export function createSeaChart(host, {THREE: T, stages, onPick, onHome, onPk, esc = (s) => s}) {
  let state = {open: 0, cleared: {}, selected: 0, boatAt: -1}, sailing = null, portrait = isPortrait();
  const w3 = (p) => [p[0] / UNIT, p[1] / UNIT];
  const spots = () => (portrait ? MOBILE_SPOTS : SPOTS).map(w3), home = () => w3(portrait ? MOBILE_HOME : HOME), pkSpot = () => w3(portrait ? MOBILE_PK_SPOT : PK_SPOT);
  /* where the boat waits at each island: its south-west shore. The pier's tip is the town's mooring. */
  const HOME_SCALE = 0.42, MOOR = [51.6, -0.1, 6.9];
  const dockPoint = (i) => {
    if (i < 0) { const h = home(); return new T.Vector3(h[0] + 3.4, WATER_Y, h[1] + 0.4); }
    const s = spots()[i]; return new T.Vector3(s[0] - 3.2, WATER_Y, s[1] + 0.9);
  };

  /* ---------- renderer, scene, camera ---------- */
  host.innerHTML = '';
  const canvas = document.createElement('canvas'); canvas.className = 'sea-canvas'; canvas.setAttribute('aria-label', '幻靈群島 3D 海圖');
  const tags = document.createElement('div'); tags.className = 'sea-tags';
  const tools = document.createElement('div'); tools.className = 'sea-zoom';
  tools.innerHTML = '<button type="button" data-z="in" title="放大" aria-label="放大">' + ico('plus') + '</button><button type="button" data-z="out" title="縮小" aria-label="縮小">' + ico('minus') + '</button><button type="button" data-z="reset" title="回到全圖" aria-label="回到全圖">' + ico('home') + '</button>';
  host.append(canvas, tags);
  const renderer = new T.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.outputEncoding = T.sRGBEncoding; renderer.setClearColor(0x2a86c4, 1);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(FOV, 1, 0.5, 400); host.__sea = {scene, camera};
  const sun = new T.DirectionalLight(0xfff4e0, 0.9); sun.position.set(-6, 14, 8);
  scene.add(new T.HemisphereLight(0xffffff, 0x8fa8bf, 0.85), sun);

  /* ---------- the ocean: gentle vertex waves, toon bands and drifting foam stripes ---------- */
  const oceanUniforms = {uTime: {value: 0}};
  const ocean = new T.Mesh(new T.PlaneGeometry(260, 220, 130, 110).rotateX(-Math.PI / 2), new T.ShaderMaterial({
    uniforms: oceanUniforms,
    vertexShader: `uniform float uTime; varying vec3 vW; varying float vH;
      void main() {
        vec3 p = position;
        float h = sin(p.x * 0.33 + uTime * 0.9) * 0.07 + sin(p.z * 0.41 - uTime * 0.7) * 0.06 + sin((p.x + p.z) * 0.75 + uTime * 1.3) * 0.025;
        p.y += h; vH = h;
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `uniform float uTime; varying vec3 vW; varying float vH;
      void main() {
        vec3 deep = vec3(0.165, 0.525, 0.80), light = vec3(0.37, 0.78, 0.93);
        float band = smoothstep(-0.05, 0.09, vH);
        vec3 c = mix(deep, light, floor(band * 3.0 + 0.5) / 3.0);
        float s = sin(vW.x * 0.9 + vW.z * 0.55 + uTime * 1.4 + sin(vW.z * 0.7 + uTime * 0.3) * 1.6);
        float s2 = sin(vW.x * 0.45 - vW.z * 0.8 - uTime * 1.1 + sin(vW.x * 0.6) * 1.4);
        float foam = smoothstep(0.972, 0.992, s) * 0.3 + smoothstep(0.978, 0.995, s2) * 0.22;
        c = mix(c, vec3(1.0), foam);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  ocean.position.y = WATER_Y; ocean.frustumCulled = false; scene.add(ocean);

  /* ---------- lanes: dotted routes on the water ---------- */
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.fill(); const t = new T.CanvasTexture(c); return t; })();
  let curves = [], laneDots = null;
  const laneCurve = (a, b, bend) => {
    const p = dockPoint(a), q = dockPoint(b), m = p.clone().lerp(q, 0.5), d = q.clone().sub(p), len = d.length() || 1;
    m.x -= d.z / len * bend; m.z += d.x / len * bend;
    return new T.QuadraticBezierCurve3(p, m, q);
  };
  function buildLanes() {
    curves = []; if (laneDots) { scene.remove(laneDots); laneDots.geometry.dispose(); }
    const pts = [];
    for (let i = -1; i < stages.length - 1; i++) {
      const c = laneCurve(i, i + 1, (i % 2 ? 1 : -1) * 1.9); curves.push(c);
      const n = Math.max(6, Math.round(c.getLength() / 0.85));
      for (let k = 1; k < n; k++) { const p = c.getPointAt(k / n); pts.push(p.x, WATER_Y + 0.22, p.z); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    laneDots = new T.Points(geo, new T.PointsMaterial({map: dotTex, size: 7 * Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.5), sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, alphaTest: 0.2}));
    laneDots.frustumCulled = false; scene.add(laneDots);
  }

  /* ---------- islands, pier, boat ---------- */
  const islandRoots = [], islandModels = [], fogs = [], billboards = [], animations = [];
  const ringMat = new T.MeshBasicMaterial({color: 0xfff4a8, transparent: true, opacity: 0.95, side: T.DoubleSide, depthWrite: false});
  const selRing = new T.Mesh(new T.RingGeometry(3.0, 3.25, 48), ringMat); selRing.rotation.x = -Math.PI / 2; selRing.visible = false; scene.add(selRing);
  const fogMat = new T.MeshBasicMaterial({color: 0x9fb8cf, transparent: true, opacity: 0.38, depthWrite: false});
  const flagGeo = new T.CylinderGeometry(0.04, 0.04, 1.3, 6), flagCloth = new T.Mesh(new T.PlaneGeometry(0.62, 0.4), new T.MeshBasicMaterial({color: 0xe23c34, side: T.DoubleSide}));
  const flags = [];
  for (let i = 0; i < stages.length; i++) {
    const root = new T.Group(); root.userData.index = i; scene.add(root); islandRoots.push(root);
    const fog = new T.Mesh(new T.SphereGeometry(2.7, 18, 12), fogMat); fog.position.y = 0.6; fog.visible = false; root.add(fog); fogs.push(fog);
    const flag = new T.Group(); const pole = new T.Mesh(flagGeo, new T.MeshBasicMaterial({color: 0x6a4a2a})); pole.position.y = 0.65; const cloth = flagCloth.clone(); cloth.position.set(0.33, 1.1, 0); flag.add(pole, cloth); flag.position.set(-1.5, 0.3, 0.5); flag.visible = false; root.add(flag); flags.push(flag);
  }
  const homeRoot = new T.Group(); scene.add(homeRoot);
  const pkRoot = new T.Group(); scene.add(pkRoot);
  const boat = new T.Group(); boat.scale.setScalar(0.5); scene.add(boat);
  const wake = new T.Mesh(new T.PlaneGeometry(5, 1.8), new T.MeshBasicMaterial({map: (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(100, 32, 2, 56, 32, 60); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); return new T.CanvasTexture(c); })(), transparent: true, depthWrite: false, opacity: 0}));
  wake.rotation.x = -Math.PI / 2; wake.position.set(-3.6, 0.3, 0); boat.add(wake);
  let boatYaw = 0, boatModel = null;

  function placeIslands() {
    spots().forEach((s, i) => { islandRoots[i].position.set(s[0], 0, s[1]); });
    const h = home(); homeRoot.position.set(h[0] + 3.4 - MOOR[0] * HOME_SCALE, 0, h[1] + 0.4 - MOOR[2] * HOME_SCALE);
    homeRoot.scale.setScalar(HOME_SCALE);
    const k = pkSpot(); pkRoot.position.set(k[0], 0, k[1]);
  }

  /* ---------- camera rig ---------- */
  const rig = {x: 0, z: 0, dist: 30, yaw: 0, pitch: PITCH}, home0 = {x: 0, z: 0, dist: 30};
  let bounds = {minX: 0, maxX: 1, minZ: 0, maxZ: 1}, fitB = bounds, W = 0, H = 0;
  function computeBounds() {
    const pts = [...spots(), home(), pkSpot()]; bounds = {minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity};
    const isl = spots(); fitB = {minX: Math.min(...isl.map((p) => p[0])) - 4.2, maxX: Math.max(...isl.map((p) => p[0])) + 4.8, minZ: Math.min(...isl.map((p) => p[1])) - 3, maxZ: Math.max(...isl.map((p) => p[1]), home()[1]) + 3.6};
    fitB.minX = Math.min(fitB.minX, home()[0] - 0.5, pkSpot()[0] - 4.6); fitB.minZ = Math.min(fitB.minZ, pkSpot()[1] - 3.5);
    for (const [x, z] of pts) { bounds.minX = Math.min(bounds.minX, x - (x === home()[0] ? 7 : 4.2)); bounds.maxX = Math.max(bounds.maxX, x + 4.8); bounds.minZ = Math.min(bounds.minZ, z - 3.0); bounds.maxZ = Math.max(bounds.maxZ, z + 3.6); }
  }
  function fit() {
    if (!W || !H) return;
    const bw = fitB.maxX - fitB.minX, bd = fitB.maxZ - fitB.minZ, t = Math.tan(FOV * Math.PI / 360), a = W / H;
    const needH = bd * Math.sin(PITCH) / (2 * t), needW = bw / (2 * t * a);
    home0.dist = Math.max(needH, needW) * 1.02; home0.x = (fitB.minX + fitB.maxX) / 2; home0.z = (fitB.minZ + fitB.maxZ) / 2 + 0.3;
  }
  const minDist = () => 9, maxDist = () => Math.max(home0.dist * 1.35, 24);
  function reset(animate = true) { goal = {x: home0.x, z: home0.z, dist: home0.dist, yaw: 0, pitch: PITCH}; if (!animate) Object.assign(rig, goal); }
  let goal = {...rig};
  function applyCamera() {
    const cp = Math.cos(rig.pitch), d = rig.dist;
    camera.position.set(rig.x + Math.sin(rig.yaw) * cp * d, Math.sin(rig.pitch) * d, rig.z + Math.cos(rig.yaw) * cp * d);
    camera.lookAt(rig.x, 0, rig.z);
  }
  const clampRig = (r) => { r.dist = clamp(r.dist, minDist(), maxDist()); r.x = clamp(r.x, bounds.minX, bounds.maxX); r.z = clamp(r.z, bounds.minZ, bounds.maxZ); r.pitch = clamp(r.pitch, 0.45, 1.3); };
  const panBy = (dx, dy) => {
    const k = 2 * rig.dist * Math.tan(FOV * Math.PI / 360) / (H || 1), cy = Math.cos(rig.yaw), sy = Math.sin(rig.yaw);
    const right = [cy, -sy], fwd = [-sy, -cy], f = k / Math.sin(rig.pitch);
    goal.x -= right[0] * dx * k + 0; goal.z -= right[1] * dx * k; goal.x += fwd[0] * dy * f; goal.z += fwd[1] * dy * f;
    clampRig(goal); Object.assign(rig, {x: goal.x, z: goal.z});
  };
  const zoomBy = (factor) => { goal.dist = clamp(goal.dist * factor, minDist(), maxDist()); };

  /* ---------- tags (island names) ---------- */
  const tagEls = [], tagHome = document.createElement('button');
  tagHome.type = 'button'; tagHome.className = 'isle-tag home-tag'; tagHome.textContent = '⚓';tagHome.setAttribute('aria-label', '初光鎮碼頭'); tagHome.addEventListener('click', () => !sailing && onHome?.());
  const tagPk = document.createElement('button');
  tagPk.type = 'button'; tagPk.className = 'isle-tag pk-tag'; tagPk.textContent = 'PK';tagPk.setAttribute('aria-label', 'PK 競技場'); tagPk.addEventListener('click', () => !sailing && onPk?.());
  tags.append(tagHome, tagPk);
  stages.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'isle-tag'; b.dataset.isle = i;
    b.addEventListener('click', () => !sailing && onPick?.(i)); tags.append(b); tagEls.push(b);
  });
  const tagPos = new T.Vector3();
  /* the tag hangs just below the island's front edge, whatever the zoom: world size to pixels, plus half the tag */
  function projectTag(el, x, y, z, edge = 2.1) {
    tagPos.set(x, y, z).project(camera);
    const ok = tagPos.z < 1 && Math.abs(tagPos.x) < 1.25 && Math.abs(tagPos.y) < 1.25;
    if (el._ok !== ok) { el._ok = ok; el.style.visibility = ok ? 'visible' : 'hidden'; }
    if (ok) {
      const k = H / (2 * rig.dist * Math.tan(FOV * Math.PI / 360)), dy = edge * k * Math.sin(rig.pitch) + (el._h || (el._h = el.offsetHeight || 24)) / 2 + 3;
      const tf = `translate(${((tagPos.x + 1) / 2 * W).toFixed(1)}px, ${((1 - tagPos.y) / 2 * H + dy).toFixed(1)}px) translate(-50%, -50%)`;
      if (el._tf !== tf) { el._tf = tf; el.style.transform = tf; }
    }
  }
  function refreshTags() {
    stages.forEach((s, i) => {
      const locked = i > state.open, el = tagEls[i];
      el.className = 'isle-tag' + (locked ? ' is-locked' : '') + (state.selected === i ? ' is-selected' : '') + (state.cleared[s.id] ? ' is-cleared' : '');
      /* 常駐只顯示數字，名稱放到關卡資訊區，才不會遮住島嶼 */el.innerHTML = (locked ? '<i class="tag-lock">🔒</i>' : '') + (i + 1);
      el._h = 0; el.setAttribute('aria-label', (i + 1) + '. ' + s.name + (locked ? '（尚未解鎖）' : ''));
      fogs[i].visible = locked; flags[i].visible = !!state.cleared[s.id];
    });
    const sel = islandRoots[state.selected]; if (sel) { selRing.position.set(sel.position.x, WATER_Y + 0.12, sel.position.z); selRing.visible = true; }
  }

  /* ---------- input: drag to pan, wheel / pinch to zoom, right-drag to turn and tilt ---------- */
  const ptrs = new Map(); let down = null, pinch = null;
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pickAt(cx, cy) {
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...islandRoots, homeRoot, pkRoot], true).find((h) => !h.object.userData.isEffect && h.object.visible && !fogs.includes(h.object));
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) { if (o === homeRoot) return 'home'; if (o === pkRoot) return 'pk'; if (islandRoots.includes(o)) return o.userData.index; }
    return null;
  }
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId); ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (ptrs.size === 1) down = {x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, mode: e.button === 2 || e.shiftKey ? 'orbit' : 'pan'};
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2}; if (down) down.moved = 99; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse') { const hit = pickAt(e.clientX, e.clientY); canvas.style.cursor = hit === null ? 'grab' : (typeof hit === 'number' && hit > state.open ? 'not-allowed' : 'pointer'); } return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinch.d > 8 && d > 8) { goal.dist = clamp(goal.dist * pinch.d / d, minDist(), maxDist()); rig.dist = goal.dist; }
      panBy(mx - pinch.mx, my - pinch.my); pinch = {d, mx, my}; return;
    }
    if (!down) return;
    down.moved += Math.abs(dx) + Math.abs(dy);
    if (down.moved < 6) return;
    if (down.mode === 'orbit') { goal.yaw += dx * 0.006; goal.pitch = clamp(goal.pitch + dy * 0.004, 0.45, 1.3); rig.yaw = goal.yaw; rig.pitch = goal.pitch; }
    else { canvas.style.cursor = 'grabbing'; panBy(dx, dy); follow = false; }
  });
  const end = (e) => {
    const had = ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (!had) return;
    if (down && ptrs.size === 0) {
      const tap = down.moved < 8 && performance.now() - down.t < 600 && e.type === 'pointerup';
      if (tap && !sailing) { const hit = pickAt(e.clientX, e.clientY); if (hit === 'home') onHome?.(); else if (hit === 'pk') onPk?.(); else if (typeof hit === 'number') onPick?.(hit); }
      down = null; canvas.style.cursor = 'grab';
    }
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(clamp(e.deltaY, -240, 240) * 0.0016)); }, {passive: false});
  canvas.addEventListener('dblclick', () => reset());
  tools.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.z === 'in') zoomBy(0.72); else if (b.dataset.z === 'out') zoomBy(1.38); else reset();
    follow = false;
  });

  /* ---------- sailing ---------- */
  let follow = true, bobT = 0;
  const heading = new T.Vector3();
  function setBoatPose(p, tangent, k = 1) {
    boat.position.set(p.x, WATER_Y + 0.02, p.z);
    if (tangent && tangent.lengthSq() > 1e-6) { const target = -Math.atan2(tangent.z, tangent.x); let d = target - boatYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); boatYaw += d * k; }
    boat.rotation.y = boatYaw;
  }
  function boatTo(i) { const p = dockPoint(i); setBoatPose(p, new T.Vector3(1, 0, 0.2), 1); }
  function sail(from, to, {speed = 13} = {}) {
    const legs = [];
    if (to > from) for (let i = from; i < to; i++) legs.push({c: curves[i + 1], reverse: false, end: i + 1});
    else for (let i = from; i > to; i--) legs.push({c: curves[i], reverse: true, end: i - 1});
    if (!legs.length) { boatTo(to); return Promise.resolve(); }
    host.classList.add('sailing'); follow = true;
    return new Promise((resolve) => {
      let leg = 0, t0 = performance.now();
      sailing = {from, to, step(now) {
        const L = legs[leg], total = L.c.getLength(), dur = Math.max(600, total / speed * 1000), k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const u = L.reverse ? 1 - e : e, p = L.c.getPointAt(clamp(u, 0, 1)), tan = L.c.getTangentAt(clamp(u, 0, 1)); if (L.reverse) tan.negate();
        setBoatPose(p, tan, 0.25); wake.material.opacity = Math.sin(Math.min(1, k * 6) * Math.PI / 2) * Math.min(1, (1 - k) * 6) * 0.9;
        if (k >= 1) {
          state.boatAt = L.end; leg++; t0 = now;
          if (leg >= legs.length) { host.classList.remove('sailing'); sailing = null; wake.material.opacity = 0; boatTo(to); resolve(); }
        }
      }};
    });
  }

  /* ---------- frame loop ---------- */
  let raf = 0, last = 0, time = 0, alive = true;
  const lowPower = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (host.clientWidth < 2 || host.clientHeight < 2 || document.hidden) { last = now; return; }
    if (lowPower && now - last < 30) return;
    if (host.clientWidth !== W || host.clientHeight !== H) resize();
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; time += dt; oceanUniforms.uTime.value = time;
    sailing?.step(now);
    if (sailing && follow) { goal.x = boat.position.x; goal.z = boat.position.z; }
    const ease = 1 - Math.pow(0.0015, dt);
    for (const k of ['x', 'z', 'dist', 'yaw', 'pitch']) rig[k] += (goal[k] - rig[k]) * (k === 'x' || k === 'z' ? ease * 0.8 : ease);
    clampRig(rig); applyCamera();
    for (const f of animations) f(dt, time);
    bobT += dt; boat.position.y = WATER_Y + 0.03 + Math.sin(bobT * 1.6) * 0.04; boat.rotation.z = Math.sin(bobT * 1.1) * 0.03 + (sailing ? -0.07 : 0);
    ringMat.opacity = 0.7 + Math.sin(time * 3) * 0.25; selRing.rotation.z += dt * 0.5;
    for (const b of billboards) { const p = b.getWorldPosition(tagPos); b.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) - (b.parent?.rotation.y || 0); }
    for (let i = 0; i < islandRoots.length; i++) { const r = islandRoots[i]; projectTag(tagEls[i], r.position.x, 0.3, r.position.z); }
    projectTag(tagPk, pkRoot.position.x, 0.3, pkRoot.position.z, 2.3);
    projectTag(tagHome, homeRoot.position.x + (MOOR[0] - 8) * HOME_SCALE, 0.4, homeRoot.position.z + MOOR[2] * HOME_SCALE, 0.8);
    renderer.render(scene, camera);
  }
  function resize() {
    W = host.clientWidth; H = host.clientHeight; if (W < 2 || H < 2) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.5)); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const was = {...home0}; fit();
    const untouched = Math.abs(goal.dist - was.dist) < 0.01 || !was.dist || was.dist === 30;
    if (untouched) reset(rigReady); rigReady = true;
  }
  let rigReady = false;
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { resize(); const nowPortrait = isPortrait(); if (nowPortrait !== portrait && !sailing) relayout(nowPortrait); }) : null; ro?.observe(host);
  function relayout(p) {
    portrait = p; placeIslands(); computeBounds(); buildLanes(); fit(); reset(false); refreshTags(); if (!sailing) boatTo(state.boatAt);
  }
  addEventListener('orientationchange', () => setTimeout(() => { const p = isPortrait(); if (p !== portrait && !sailing) relayout(p); }, 150));

  placeIslands(); computeBounds(); buildLanes(); refreshTags(); boatTo(state.boatAt);
  raf = requestAnimationFrame(frame);
  /* the ocean never sleeps, but a hidden lobby (during a battle) skips rendering entirely */
  return {
    update(next) { state = {...state, ...next}; refreshTags(); if (!sailing) boatTo(state.boatAt); },
    /* island i's model (with its boss card), animated by the callbacks the builder collects */
    setIsland(i, group) {
      islandModels[i]?.parent?.remove(islandModels[i]); islandModels[i] = group; islandRoots[i].add(group);
      group.traverse((o) => { if (o.userData.billboard) billboards.push(o); });
      group.scale.setScalar(0.01); const t0 = performance.now(), pop = (now) => { const k = Math.min(1, (now - t0) / 450); group.scale.setScalar(0.01 + 0.99 * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pop); }; requestAnimationFrame(pop);
    },
    addIslandCard(i, pivot) { islandModels[i]?.add(pivot); pivot.traverse(o => { if (o.userData.billboard) billboards.push(o); }); },
    setPk(group) { pkRoot.add(group); group.traverse((o) => { if (o.userData.billboard) billboards.push(o); }); },
    setHome(group) { homeRoot.add(group); homeRoot.userData.model = group; },
    get homeGroup() { return homeRoot.userData.model || null; },
    setBoat(model) { boatModel?.parent?.remove(boatModel); boatModel = model; boat.add(model); },
    addAnimations(list) { animations.push(...list.map((f) => (dt, t) => f(dt, t))); },
    focusSelected() { const r = islandRoots[state.selected]; if (r) { goal.x = r.position.x; goal.z = r.position.z; goal.dist = Math.min(goal.dist, home0.dist * 0.6); clampRig(goal); } },
    /* jump the boat to an island without the voyage (used when the sortie starts at once) */
    snap(i) { state.boatAt = i; if (!sailing) boatTo(i); },
    resetView: reset, sail, get sailing() { return !!sailing; }, get boatAt() { return state.boatAt; },
    dispose() { alive = false; cancelAnimationFrame(raf); ro?.disconnect(); renderer.dispose(); },
  };
}

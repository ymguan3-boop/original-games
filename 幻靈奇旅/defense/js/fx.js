/* Ultimate and skill effects for 幻靈守護戰, drawn on top of each spirit's own cave attack.
   Soft additive particles, rotating magic circles, light pillars, shockwaves, lightning and comets, combined
   into one recipe per element so every ultimate reads clearly on the wide battle map. */

function canvasTexture(THREE, size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

export function createFx(THREE, scene) {
  const linear = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const add = THREE.AdditiveBlending;
  /* textures */
  const soft = canvasTexture(THREE, 64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  const spark = canvasTexture(THREE, 64, (g, s) => { g.translate(s / 2, s / 2); for (const a of [0, Math.PI / 2]) { g.save(); g.rotate(a); const r = g.createLinearGradient(-s / 2, 0, s / 2, 0); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-s / 2, -2, s, 4); g.restore(); } const c = g.createRadialGradient(0, 0, 0, 0, 0, s / 5); c.addColorStop(0, 'rgba(255,255,255,1)'); c.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = c; g.fillRect(-s / 2, -s / 2, s, s); });
  const ringTex = canvasTexture(THREE, 128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, s * 0.32, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  const circleTex = canvasTexture(THREE, 512, (g, s) => {
    const c = s / 2; g.translate(c, c); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10;
    for (const [r, w] of [[0.96, 6], [0.86, 3], [0.6, 4], [0.5, 2]]) { g.lineWidth = w; g.beginPath(); g.arc(0, 0, c * r, 0, Math.PI * 2); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI * 2 / 6 * 2; g[i ? 'lineTo' : 'moveTo'](Math.sin(a) * c * 0.86, -Math.cos(a) * c * 0.86); } g.stroke();
    g.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i * 2 + 1) * Math.PI / 6 * 2 / 2; g[i ? 'lineTo' : 'moveTo'](Math.sin(a) * c * 0.86, -Math.cos(a) * c * 0.86); } g.stroke();
    g.font = `bold ${s * 0.06}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const runes = '光焰森潮雷念✦✧◈☆✶❖';
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.save(); g.rotate(a); g.fillText(runes[i % runes.length], 0, -c * 0.91); g.restore(); }
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; g.lineWidth = i % 4 ? 1.5 : 3; g.beginPath(); g.moveTo(Math.sin(a) * c * 0.6, -Math.cos(a) * c * 0.6); g.lineTo(Math.sin(a) * c * (i % 4 ? 0.55 : 0.5), -Math.cos(a) * c * (i % 4 ? 0.55 : 0.5)); g.stroke(); }
  });
  const beamTex = canvasTexture(THREE, 128, (g, s) => { const r = g.createLinearGradient(0, s, 0, 0); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.6, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); const h = g.createLinearGradient(0, 0, s, 0); h.addColorStop(0, 'rgba(0,0,0,.9)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,.9)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, s, s); });
  const leafTex = canvasTexture(THREE, 64, (g, s) => { g.translate(s / 2, s / 2); g.rotate(0.6); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.18, 0, 0, Math.PI * 2); g.fill(); });

  /* No temporary point lights: every island keeps its authored sky, sun
     and ambient lighting unchanged during normal hits and ultimates. */
  const jobs = [], timers = new Set();
  const MOBILE_FX = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 720px)').matches;
  const MAX_JOBS = MOBILE_FX ? 76 : 140, MAX_PARTICLES = MOBILE_FX ? 24 : 52;
  let clock = 0;
  function job(life, update, obj) {
    if (jobs.length >= MAX_JOBS) {
      /* Skipped objects were never uploaded; let GC reclaim them (some use shared geometry). */
      return;
    }
    if (obj) scene.add(obj);
    jobs.push({life, age: 0, update, obj});
  }

  /* particles: one Points cloud per burst; each particle has velocity, gravity and drag */
  function particles({x, y = 0.5, z, count = 40, color, size = 0.5, speed = 4, up = 2, spread = 1, life = 1.1, gravity = -4, drag = 1.6, tex = soft, swirl = 0, toward = null, ring = 0}) {
    count = Math.max(0, Math.min(MAX_PARTICLES, count));
    if (jobs.length >= MAX_JOBS || count === 0) return;
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), vel = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = ring ? ring : Math.random() * spread, s = speed * (0.4 + Math.random() * 0.8);
      pos[i * 3] = x + Math.cos(a) * r; pos[i * 3 + 1] = y + Math.random() * 0.4; pos[i * 3 + 2] = z + Math.sin(a) * r;
      vel.push(toward ? [(toward.x - pos[i * 3]) * 1.8, (toward.y - pos[i * 3 + 1]) * 1.8, (toward.z - pos[i * 3 + 2]) * 1.8] : [Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s]);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({color: linear(color), size, map: tex, transparent: true, depthWrite: false, blending: add, sizeAttenuation: true});
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
    job(life, (k, dt) => {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const v = vel[i];
        if (swirl) { const dx = p[i * 3] - x, dz = p[i * 3 + 2] - z; v[0] += -dz * swirl * dt; v[2] += dx * swirl * dt; }
        v[1] += gravity * dt; const f = Math.max(0, 1 - drag * dt); v[0] *= f; v[2] *= f;
        p[i * 3] += v[0] * dt; p[i * 3 + 1] = Math.max(0.05, p[i * 3 + 1] + v[1] * dt); p[i * 3 + 2] += v[2] * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85; mat.size = size * (1 - k * 0.4);
      if (k >= 1) geo.dispose();
    }, pts);
  }
  function magicCircle({x, z, y = 0.06, color, radius = 2.4, life = 1.4, spin = 1.2, vertical = false}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: circleTex, color: linear(color), transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide}));
    if (!vertical) m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    const inner = m.clone(); inner.material = m.material.clone(); inner.scale.setScalar(0.6);
    const group = new THREE.Group(); group.add(m, inner);
    job(life, (k, dt) => {
      const grow = Math.min(1, k * 5), s = radius * 2 * (0.4 + 0.6 * grow) * (1 + k * 0.08);
      m.scale.set(s, s, s); inner.scale.set(s * 0.62, s * 0.62, s * 0.62);
      m.rotation.z += spin * dt; inner.rotation.z -= spin * 1.7 * dt;
      const o = k < 0.75 ? 0.95 : 0.95 * (1 - (k - 0.75) / 0.25); m.material.opacity = o; inner.material.opacity = o * 0.8;
    }, group);
  }
  function pillar({x, z, color, radius = 1.2, height = 9, life = 0.9, fromSky = false}) {
    const geo = new THREE.CylinderGeometry(radius, radius * (fromSky ? 1 : 1.25), height, 28, 1, true), mat = new THREE.MeshBasicMaterial({map: beamTex, color: linear(color), transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide});
    if (fromSky) geo.rotateZ(Math.PI);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, height / 2, z);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.45, height, 16, 1, true), mat.clone()); core.material.color = linear(0xffffff); m.add(core);
    job(life, (k) => { const w = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8 * 0.7; m.scale.set(w, k < 0.25 ? k / 0.25 : 1, w); mat.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; core.material.opacity = mat.opacity; m.rotation.y += 0.05; }, m);
  }
  function shockwave({x, z, y = 0.1, color, radius = 4, life = 0.7, delay = 0, strength = 1}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: ringTex, color: linear(color), transparent: true, depthWrite: false, blending: add}));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.visible = false;
    job(life + delay, (k) => { const t = Math.max(0, (k * (life + delay) - delay) / life); m.visible = t > 0; const s = radius * 2 * (0.15 + 0.85 * (1 - Math.pow(1 - t, 3))); m.scale.set(s, s, s); m.material.opacity = (1 - t) * strength; }, m);
  }
  function glowBall({x, y, z, color, size = 3, life = 0.5}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: soft, color: linear(color), transparent: true, depthWrite: false, blending: add})); s.position.set(x, y, z);
    job(life, (k) => { const v = size * (0.4 + Math.sin(Math.min(1, k * 1.6) * Math.PI / 2) * 0.9); s.scale.set(v, v, 1); s.material.opacity = 0.8 * (1 - k * k); }, s);
  }
  function flash({x, y = 2, z, color, intensity = 4, life = 0.5}) {
    /* A local additive glow gives impact without pulsating world illumination;
       neither sunlight nor the painted sky changes when the base takes damage. */
    glowBall({x, y, z, color, size: Math.min(3, intensity * 0.35), life});
  }
  function lightning({from, to, color, life = 0.35, branches = 2}) {
    const make = (a, b, width) => {
      const pts = [], n = 10;
      for (let i = 0; i <= n; i++) { const k = i / n, j = i % n ? 0.9 * Math.sin(k * Math.PI) : 0; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * k + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * k + (Math.random() - 0.5) * j * 0.6, a.z + (b.z - a.z) * k + (Math.random() - 0.5) * j)); }
      const curve = new THREE.CatmullRomCurve3(pts), mat = new THREE.MeshBasicMaterial({color: linear(color), transparent: true, depthWrite: false, blending: add});
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, width, 6, false), mat);
      const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, width * 0.4, 6, false), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, blending: add})); tube.add(core);
      job(life, (k) => { const on = k < 0.6 ? (Math.random() > 0.25 ? 1 : 0.3) : 1 - (k - 0.6) / 0.4; mat.opacity = on; core.material.opacity = on; }, tube);
      return pts;
    };
    const pts = make(from, to, 0.12);
    for (let b = 0; b < branches; b++) { const p = pts[3 + Math.floor(Math.random() * 5)]; make(p, {x: p.x + (Math.random() - 0.5) * 3, y: Math.max(0.3, p.y - 1.5 - Math.random() * 2), z: p.z + (Math.random() - 0.5) * 3}, 0.05); }
  }
  function comet({from, to, color, life = 0.45, size = 1.4}) {
    const head = new THREE.Sprite(new THREE.SpriteMaterial({map: soft, color: linear(color), transparent: true, depthWrite: false, blending: add})); head.scale.set(size, size, 1);
    const trail = [];
    job(life, (k, dt) => {
      const e = 1 - Math.pow(1 - k, 2), x = from.x + (to.x - from.x) * e, z = from.z + (to.z - from.z) * e, y = from.y + (to.y - from.y) * e + Math.sin(e * Math.PI) * 2.2;
      head.position.set(x, y, z);
      if (Math.random() < 0.9) { trail.push(1); particles({x, y, z, count: 4, color, size: size * 0.5, speed: 0.6, up: 0.3, spread: 0.15, life: 0.45, gravity: 0, drag: 3}); }
      if (k >= 1) { glowBall({...to, color, size: size * 2.6, life: 0.4}); }
    }, head);
  }

  /* ---------- recipes ---------- */
  const PALETTE = {焰: [0xff7a2a, 0xffd25a], 潮: [0x3fb6ff, 0xc6f2ff], 森: [0x5ce06a, 0xe6ff9a], 雷: [0xffe23a, 0xfffbd0], 念: [0xb66bff, 0xf0d6ff], 光: [0xffe7a0, 0xffffff]};

  /* Charging: a magic circle under the spirit, light rising around it. */
  function charge({x, z, element, duration = 1}) {
    const [c1, c2] = PALETTE[element] || PALETTE.光;
    magicCircle({x, z, color: c1, radius: 1.9, life: Math.max(0.9, duration + 0.3), spin: 2});
    particles({x, z, y: 0.2, count: 36, color: c2, size: 0.45, speed: 0.4, up: 3.2, spread: 0.2, ring: 1.6, life: Math.max(0.8, duration), gravity: 1.5, drag: 2, swirl: 3});
    glowBall({x, y: 1.2, z, color: c1, size: 2.4, life: Math.max(0.6, duration)});
  }

  /* Release of an ultimate at a point (or along a line from the caster). */
  function ultimate({from, to, element, kind, radius = 2.4}) {
    const [c1, c2] = PALETTE[element] || PALETTE.光, x = to.x, z = to.z, r = Math.max(2, radius);
    if (kind === 'self') {
      pillar({x: from.x, z: from.z, color: c1, radius: 1.3, height: 7, life: 1.2});
      particles({x: from.x, z: from.z, y: 0.3, count: 60, color: c2, size: 0.5, speed: 0.5, up: 4, spread: 2.5, life: 1.6, gravity: 0.8, tex: spark});
      shockwave({x: from.x, z: from.z, color: c1, radius: 4.5, life: 0.9}); flash({x: from.x, z: from.z, color: c1, intensity: 3});
      return;
    }
    if (['ranged', 'tracking', 'cone'].includes(kind) && from) comet({from: {x: from.x, y: from.y ?? 1.5, z: from.z}, to: {x, y: 1, z}, color: c1, life: 0.32});
    const delay = ['ranged', 'tracking', 'cone'].includes(kind) ? 320 : 0;
    setTimeout(() => {
      flash({x, z, color: c1, intensity: 5, life: 0.6});
      glowBall({x, y: 1.2, z, color: c1, size: r * 1.3, life: 0.4});
      shockwave({x, z, color: c1, radius: r * 1.1, life: 0.6, strength: 0.45});
      shockwave({x, z, color: c2, radius: r * 0.7, life: 0.5, delay: 0.12, strength: 0.45});
      if (element === '焰') {
        pillar({x, z, color: c1, radius: r * 0.55, height: 8, life: 0.9});
        particles({x, z, count: 90, color: c2, size: 0.55, speed: 6, up: 7, spread: 0.6, life: 1.4, gravity: -9, tex: spark});
        particles({x, z, y: 0.4, count: 40, color: 0xff3d1a, size: 1.4, speed: 3, up: 1.5, spread: r * 0.4, life: 1.0, gravity: 1, drag: 2.5});
      } else if (element === '潮') {
        pillar({x, z, color: c1, radius: r * 0.5, height: 6, life: 0.8});
        particles({x, z, count: 110, color: c2, size: 0.5, speed: 5, up: 8, spread: 0.5, life: 1.3, gravity: -14});
        for (let i = 0; i < 3; i++) shockwave({x, z, color: c1, radius: r * (1.2 + i * 0.6), life: 0.9, delay: i * 0.18});
      } else if (element === '森') {
        magicCircle({x, z, color: c1, radius: r * 1.1, life: 1.3, spin: 2.5});
        particles({x, z, count: 70, color: c2, size: 0.7, speed: 2, up: 3.5, spread: r * 0.7, life: 1.6, gravity: -1, swirl: 6, tex: leafTex});
        particles({x, z, count: 40, color: 0xff9ad6, size: 0.45, speed: 4, up: 4, spread: 0.4, life: 1.3, gravity: -3, tex: leafTex});
      } else if (element === '雷') {
        for (let i = 0; i < 3; i++) setTimeout(() => lightning({from: {x: x + (Math.random() - 0.5) * 3, y: 13, z: z + (Math.random() - 0.5) * 3}, to: {x: x + (Math.random() - 0.5) * r, y: 0.2, z: z + (Math.random() - 0.5) * r}, color: c1}), i * 90);
        particles({x, z, count: 80, color: c2, size: 0.45, speed: 8, up: 4, spread: 0.3, life: 0.8, gravity: -6, drag: 3, tex: spark});
      } else if (element === '念') {
        particles({x, z, y: 1, count: 70, color: c1, size: 0.6, ring: r * 1.4, toward: {x, y: 1.2, z}, life: 0.55, gravity: 0, drag: 0});
        setTimeout(() => { particles({x, z, y: 1.2, count: 90, color: c2, size: 0.55, speed: 7, up: 2, spread: 0.2, life: 1.1, gravity: 0, drag: 2.2, tex: spark}); magicCircle({x, z, y: 1.6, color: c1, radius: r, life: 1.1, spin: 3, vertical: true}); }, 380);
      } else {
        pillar({x, z, color: c1, radius: r * 0.6, height: 14, life: 1.0, fromSky: true});
        particles({x, z, count: 80, color: c2, size: 0.6, speed: 5, up: 5, spread: 0.4, life: 1.2, gravity: -3, tex: spark});
        magicCircle({x, z, color: c1, radius: r * 1.2, life: 1.1, spin: 1.5});
      }
    }, delay);
  }

  /* Normal hits: a small burst whose look depends on the element, a slash arc for melee, and a gold star burst for
     critical hits. Kept small so a crowded fight stays readable. */
  const slashGeo = new THREE.RingGeometry(0.75, 0.95, 24, 1, 0, Math.PI * 0.75);
  function hit({x, y = 1, z, element, kind, crit = false}) {
    const [c1, c2] = PALETTE[element] || PALETTE.光;
    const tex = element === '森' ? leafTex : ['雷', '光', '焰'].includes(element) ? spark : soft;
    const motion = {焰: {up: 2.5, gravity: -6}, 潮: {up: 3, gravity: -10}, 森: {up: 1.6, gravity: -1.5, swirl: 5}, 雷: {up: 1, gravity: -2, speed: 5}, 念: {up: 0.6, gravity: 0, drag: 3}, 光: {up: 1.4, gravity: -1}}[element] || {};
    particles({x, y, z, count: crit ? 22 : 9, color: crit ? c2 : c1, size: crit ? 0.42 : 0.3, speed: motion.speed || 2.6, up: motion.up, spread: 0.15, life: 0.45, gravity: motion.gravity ?? -4, drag: motion.drag || 2, swirl: motion.swirl || 0, tex});
    if (kind === 'melee') {
      const m = new THREE.Mesh(slashGeo, new THREE.MeshBasicMaterial({color: linear(c2), transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide}));
      m.position.set(x, y + 0.2, z); m.rotation.set(-0.6, Math.random() * Math.PI * 2, Math.random() * Math.PI);
      job(0.22, (k) => { m.scale.setScalar(0.6 + k * 0.7); m.material.opacity = 1 - k; m.rotation.z += 0.25; }, m);
    } else if (element === '潮') shockwave({x, z, y: 0.12, color: c1, radius: 0.9, life: 0.35});
    else if (element === '念') { const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 20), new THREE.MeshBasicMaterial({color: linear(c1), transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide})); r.position.set(x, y, z); job(0.3, (k) => { r.scale.setScalar(0.5 + k * 1.6); r.material.opacity = 1 - k; r.lookAt(r.position.x, r.position.y + 10, r.position.z + 6); }, r); }
    if (crit) {
      glowBall({x, y, z, color: 0xffd54a, size: 1.6, life: 0.32});
      shockwave({x, z, y: 0.15, color: 0xffd54a, radius: 1.4, life: 0.4});
      particles({x, y: y + 0.2, z, count: 10, color: 0xfff2a8, size: 0.5, speed: 4, up: 3, spread: 0.1, life: 0.55, gravity: -5, tex: spark});
    }
  }

  /* Support skills: a large circle in the field centre and a burst over every target. */
  function skill({center, targets = [], element, kind}) {
    const [c1, c2] = PALETTE[element] || PALETTE.光;
    magicCircle({x: center.x, z: center.z, color: c1, radius: 5, life: 1.25, spin: 0.8});
    shockwave({x: center.x, z: center.z, color: c2, radius: 12, life: 0.85});
    flash({x: center.x, y: 6, z: center.z, color: c1, intensity: 6, life: 1});
    particles({x: center.x, z: center.z, y: 0.5, count: 40, color: c2, size: 0.6, speed: 9, up: 3, spread: 2, life: 1.8, gravity: -1.5, tex: spark});
    targets.slice(0, 6).forEach((t, i) => { const timer = setTimeout(() => { timers.delete(timer);
      if (kind === 'freeze') { particles({x: t.x, z: t.z, y: 0.3, count: 24, color: 0xd8f6ff, size: 0.6, speed: 1.2, up: 2.5, spread: 0.6, life: 1.4, gravity: -1, tex: spark}); shockwave({x: t.x, z: t.z, color: 0xbff4ff, radius: 1.6, life: 0.7}); }
      else if (kind === 'volley' || kind === 'beam' || kind === 'quake') ultimate({from: null, to: t, element, kind: 'blast', radius: 1.6});
      else if (kind === 'plague') particles({x: t.x, z: t.z, y: 0.5, count: 30, color: 0x94f85f, size: 0.7, speed: 1.5, up: 1.5, spread: 0.5, life: 1.6, gravity: 0.5, swirl: 4});
      else { pillar({x: t.x, z: t.z, color: kind === 'heal' ? 0x83ffc5 : kind === 'shield' ? 0xffd058 : 0xfff27a, radius: 0.8, height: 5, life: 1}); particles({x: t.x, z: t.z, y: 0.3, count: 20, color: c2, size: 0.45, speed: 0.5, up: 3, spread: 0.6, life: 1.2, gravity: 1, tex: spark}); }
    }, 120 + i * 60); timers.add(timer); });
  }

  function update(dt) {
    clock += dt;
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i]; j.age += dt; const k = Math.min(1, j.age / j.life);
      j.update(k, dt);
      if (k >= 1) { if (j.obj) { scene.remove(j.obj); j.obj.traverse?.((n) => { if (!n.isSprite) n.geometry?.dispose?.(); n.material?.dispose?.(); }); } jobs.splice(i, 1); }
    }
  }
  function clear() {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    /* A PK rematch should not retain old GPU particle buffers or shader programs.
       Particle textures are shared by this module and deliberately stay cached. */
    for (const j of jobs.splice(0)) if (j.obj) {
      scene.remove(j.obj);
      j.obj.traverse?.((node) => {
        if (!node.isSprite) node.geometry?.dispose?.();
        for (const mat of (Array.isArray(node.material) ? node.material : [node.material]))
          mat?.dispose?.();
      });
    }
  }
  return {charge, ultimate, skill, hit, particles, shockwave, update, clear};
}

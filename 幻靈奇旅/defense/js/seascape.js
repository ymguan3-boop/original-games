/* Every stage is an island in a ring of sea under its own sky. The camera looks down at the field, so the true
   horizon is never on screen; instead the sea ends a little past the beach in a soft fade and a painted sky (a
   screen-space background with drifting clouds, sun or moon) fills everything beyond it, so the top of the screen
   shows blue sky and clouds rather than an empty colour. Weather follows the stage: sunny, misty drizzle, dusk
   haze, starry night, snow, or a storm with dark clouds and rain. */
const WEATHER = {
  meadow: {sky: ['#3f9ee8', '#9fd6ff', '#e6f6ff'], sea: 0x2aa3dc, clouds: 'white', sun: true},
  pond: {sky: ['#5aa6dc', '#a9d4ee', '#e8f2f4'], sea: 0x2f9fc6, clouds: 'soft', rain: 140},
  waterfall: {sky: ['#7a98b4', '#b8cbd8', '#e2e8ec'], sea: 0x2d8fb6, clouds: 'grey', rain: 320},
  orchard: {sky: ['#3d9be6', '#a8d8ff', '#fff2dc'], sea: 0x2aa6d8, clouds: 'white', sun: true},
  forge: {sky: ['#d9805a', '#f2b98a', '#ffe6c8'], sea: 0x2f8fb0, clouds: 'dusk'},
  desert: {sky: ['#2f8fe0', '#8fccff', '#fff0cf'], sea: 0x22b0d0, clouds: 'few', sun: true},
  observatory: {sky: ['#1f2466', '#4a4fa8', '#b9a8ee'], sea: 0x2c5f9a, clouds: 'night', stars: 160, moon: true},
  night: {sky: ['#0a1230', '#1c2a5a', '#3a4f88'], sea: 0x163a66, clouds: 'night', stars: 260, moon: true},
  tower: {sky: ['#7d74c8', '#c8b4ee', '#ffe0ee'], sea: 0x3a86c0, clouds: 'soft', snow: 380},
  abyss: {sky: ['#2b3a4e', '#56697e', '#8fa1b0'], sea: 0x1f5f7c, clouds: 'storm', rain: 650, storm: true},
};
/* One immutable climate per island. Attacks never edit this table, the painted sky,
   ambient light, rainfall or cloud density. Drifting clouds are cosmetic, not weather changes. */
export const STAGE_WEATHER = Object.freeze({
  meadow: {name:'晴天白雲',icon:'☀️',description:'藍天、明亮陽光與白雲',fixed:true},
  pond: {name:'陰天微雨',icon:'🌦️',description:'柔和陰雲、細雨與池塘水霧',fixed:true},
  waterfall: {name:'陰雨水霧',icon:'🌧️',description:'瀑布水霧、灰白雲層與細雨',fixed:true},
  orchard: {name:'晴朗暖陽',icon:'☀️',description:'果園晴空、柔和日光與白雲',fixed:true},
  forge: {name:'夕陽薄雲',icon:'🌇',description:'工坊夕霞、橘金天空與煙霧',fixed:true},
  desert: {name:'荒野晴空',icon:'🌤️',description:'清澈藍天與乾燥日照',fixed:true},
  observatory: {name:'晴朗星夜',icon:'✨',description:'紫色星空、月光與閃爍星點',fixed:true},
  night: {name:'月影晴夜',icon:'🌙',description:'深藍夜空、月亮及螢火蟲',fixed:true},
  tower: {name:'靜謐飄雪',icon:'❄️',description:'淡紫天空與持續輕雪',fixed:true},
  abyss: {name:'深淵暴雨',icon:'⛈️',description:'灰色烏雲、細密雨幕與海風',fixed:true}
});
export const stageWeather = (scene) => STAGE_WEATHER[scene] || STAGE_WEATHER.meadow;
export const weatherOf = (theme) => WEATHER[theme] || WEATHER.meadow;
const CLOUD = {white: ['#ffffff', 9, 1], soft: ['#f4f8fb', 12, .9], few: ['#ffffff', 4, 1], grey: ['#d3dbe2', 15, .95], dusk: ['#ffe2cc', 9, .85], night: ['#5a6494', 5, .55], storm: ['#4a5566', 18, .95]};

/* the painted sky: gradient, sun / moon / stars, layered puffy clouds; tiles horizontally so it can drift */
function paintSky(w, seed = 1) {
  /* a seeded generator: the same island always paints the very same sky, clouds and stars */
  let r = seed >>> 0; const rnd = () => { r = (r + 0x6D2B79F5) >>> 0; let t = r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, w.sky[0]); grad.addColorStop(0.55, w.sky[1]); grad.addColorStop(1, w.sky[2]);
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
  if (w.stars) for (let i = 0; i < w.stars; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.6})`; const s = rnd() < 0.1 ? 3 : 1.6; g.fillRect(rnd() * c.width, rnd() * c.height * 0.7, s, s); }
  if (w.sun) { const sg = g.createRadialGradient(1500, 190, 10, 1500, 190, 170); sg.addColorStop(0, 'rgba(255,252,220,1)'); sg.addColorStop(0.35, 'rgba(255,240,170,.9)'); sg.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = sg; g.fillRect(1300, 0, 400, 400); }
  if (w.moon) { g.fillStyle = '#fff4d0'; g.beginPath(); g.arc(1560, 170, 64, 0, Math.PI * 2); g.fill(); g.fillStyle = w.sky[0]; g.beginPath(); g.arc(1590, 150, 58, 0, Math.PI * 2); g.fill(); }
  const [color, count, alpha] = CLOUD[w.clouds] || CLOUD.white;
  for (let i = 0; i < count; i++) {
    const x = rnd() * c.width, y = 80 + rnd() * c.height * 0.6, s = 0.6 + rnd() * 0.9;
    for (const dx of [0, c.width]) {
      /* a flat-bottomed puff: shaded underside, then the bright body */
      g.globalAlpha = alpha * 0.5; g.fillStyle = w.storm ? '#2c3442' : 'rgba(150,170,195,1)';
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x - dx + (k - 2.5) * 46 * s, y + 14 * s, (38 + (k % 3) * 14) * s, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = alpha; g.fillStyle = color;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x - dx + (k - 2.5) * 46 * s, y - (k % 2) * 18 * s, (40 + (k % 3) * 16) * s, 0, Math.PI * 2); g.fill(); }
      g.fillRect(x - dx - 140 * s, y, 280 * s, 30 * s);
    }
  }
  g.globalAlpha = 1;
  return c;
}

export function createSeascape(THREE, scene, kit) {
  const linear = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  let group = null, sea = null, seaBase = null, foam = null, fall = null, skyTex = null, time = 0, w = WEATHER.meadow;

  function build(theme, island) {
    dispose();
    w = weatherOf(theme);
    group = new THREE.Group(); group.name = 'Seascape'; scene.add(group);
    skyTex = new THREE.CanvasTexture(paintSky(w, [...String(theme)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7))); skyTex.encoding = THREE.sRGBEncoding; skyTex.wrapS = THREE.RepeatWrapping; skyTex.repeat.set(0.5, 1);
    scene.background = skyTex; scene.fog = null;
    /* a ring of sea around the island that fades out into the sky (alpha map: solid inside, soft edge) */
    const [rx, rz] = island, sx = rx + 16, sz = rz + 13;
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ag = ac.getContext('2d'), ar = ag.createRadialGradient(128, 128, 0, 128, 128, 128);
    ar.addColorStop(0, '#fff'); ar.addColorStop(0.78, '#fff'); ar.addColorStop(1, '#000'); ag.fillStyle = ar; ag.fillRect(0, 0, 256, 256);
    const seaGeo = new THREE.PlaneGeometry(sx * 2, sz * 2, 90, 70).rotateX(-Math.PI / 2);
    seaBase = Float32Array.from(seaGeo.attributes.position.array);
    sea = new THREE.Mesh(seaGeo, new THREE.MeshToonMaterial({color: linear(w.sea), gradientMap: kit.gradientMap, alphaMap: new THREE.CanvasTexture(ac), transparent: true}));
    sea.position.y = -0.55; sea.receiveShadow = true; sea.renderOrder = -1; group.add(sea);
    foam = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.08, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false}));
    foam.userData = {rx, rz}; foam.scale.set(rx, 1, rz); foam.position.y = -0.38; group.add(foam);
    /* rain streaks or snowflakes over the island */
    const n = w.rain || w.snow || 0;
    if (n) {
      const p = new Float32Array(n * (w.snow ? 3 : 6));
      for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 90, z = (Math.random() - 0.5) * 70, y = Math.random() * 40; if (w.snow) p.set([x, y, z], i * 3); else p.set([x, y, z, x - 0.3, y - 1.4, z], i * 6); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      fall = w.snow ? new THREE.Points(g, new THREE.PointsMaterial({color: 0xffffff, size: 0.35, transparent: true, opacity: 0.9, depthWrite: false}))
        : new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: 0xcfe6f5, transparent: true, opacity: w.storm ? 0.55 : 0.35, depthWrite: false}));
      group.add(fall);
    }
    return w;
  }

  function update(dt) {
    if (!group) return;
    time += dt;
    /* the sky is painted once and never drifts: the weather of an island stays exactly as it was */
    const pos = sea.geometry.attributes.position, a = pos.array, amp = w.storm ? 0.4 : 0.18;
    for (let i = 0; i < pos.count; i++) {
      const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
      a[i * 3 + 1] = (Math.sin(x * 0.17 + time * 1.1) + Math.cos(z * 0.2 + time * 0.9) * 0.8 + Math.sin((x + z) * 0.4 + time * 1.7) * 0.35) * amp;
    }
    pos.needsUpdate = true; sea.geometry.computeVertexNormals();
    /* the foam ring breathes in and out with the swell */
    const k = 1 + Math.sin(time * 1.4) * 0.012; foam.material.opacity = 0.45 + Math.sin(time * 1.4) * 0.2; foam.scale.set(foam.userData.rx * k, 1, foam.userData.rz * k);
    if (fall) {
      const p = fall.geometry.attributes.position.array;
      if (w.snow) for (let i = 0; i < p.length; i += 3) { p[i + 1] -= 3 * dt; p[i] += Math.sin(time + i) * 0.6 * dt; if (p[i + 1] < -0.5) p[i + 1] += 40; }
      else { const f = (w.storm ? 34 : 22) * dt; for (let i = 0; i < p.length; i += 6) { p[i + 1] -= f; p[i + 4] -= f; p[i] -= f * 0.2; p[i + 3] -= f * 0.2; if (p[i + 4] < -0.5) { p[i + 1] += 40; p[i + 4] += 40; p[i] += 8; p[i + 3] += 8; } } }
      fall.geometry.attributes.position.needsUpdate = true;
    }
  }

  function dispose() {
    if (!group) return;
    scene.remove(group);
    group.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.alphaMap?.dispose?.();
      o.material?.dispose?.();
    });
    skyTex?.dispose(); group = null; sea = null; foam = null; fall = null; skyTex = null;
  }
  return {build, update, dispose, get weather() { return w; }};
}

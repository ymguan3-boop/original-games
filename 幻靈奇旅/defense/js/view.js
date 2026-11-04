/* Three.js view for 幻靈守護戰: the whole winding path on one screen. Reads rules state each frame and turns
   state.events into effects. Every fighter is a cave actor (actors.js); attacks use the cave's model-room scripts,
   metal projectiles (survivors/js/projectile-view.js) and spell/impact effects (survivors/js/combat-vfx-v17.js).
   Hits get hit-stop, a flash, a recoil and damage numbers so every strike lands with weight. */
import {createActor, performSkill, loadGltf, cloneModel, nativeAsset} from './actors.js?v=20261105-v18';
import {createFx} from './fx.js?v=20261105-v18';
import {createSeascape} from './seascape.js?v=20261105-v18';
import {createToonKit} from './style.js?v=20261105-v18';
import {batchStatic, movingMeshes} from './batch.js?v=20261105-v18';
import {buildEnvironment, themeOf, THEMES} from './env.js?v=20261105-v18';
import {ELEMENT_COLORS, TRAP_WARN} from './rules.js?v=20261105-v18';
import {pointAt} from './stages.js?v=20261105-v18';
import {createCombatVfx} from '../../survivors/js/combat-vfx-v17.js?v=20261105-v18';
import {createProjectileView} from '../../survivors/js/projectile-view.js?v=20261105-v18';
import {projectileStyle, projectileTint} from '../../survivors/js/actor-layout.js?v=20261105-v18';

/* spirits on the path are 0.7x of the earlier size */
const SCALE = 1.26, BOSS_SCALE = 2.1, FIELD = [34, 20], ISLAND = [33, 23.5];

export function createView(canvas, {spirits, catalog}) {
  const THREE = globalThis.THREE;
  const spiritMap = new Map(spirits.map((s) => [s.id, s]));
  const entries = new Map((catalog.entries || []).map((e) => [e.id, e]));
  const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'high-performance'});
  /* Two Three.js contexts (chart + battle) can coexist on a phone. A 2x
   framebuffer + 2048² shadows is too costly in a long PK match. */
  const mobileGpu = typeof matchMedia === 'function' &&
    (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 820px)').matches);
  renderer.setPixelRatio(Math.min(mobileGpu ? 1.25 : 1.75, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* Static shadow map: a base being hit or a hero hurt pose cannot move a
     scene-sized dark patch across the island. Refresh once per stage. */
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  /* no film tone mapping: cartoon colours stay saturated */
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.NoToneMapping;
  /* Clear the WebGL surface to transparency, revealing the immutable CSS sky. */
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.background = null; /* never paint the sky inside the hit-effect scene */
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 700);
  const hemi = new THREE.HemisphereLight(0xe8f6ff, 0x4d6b3a, 0.8); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.05);
  sun.position.set(-10, 24, 12); sun.castShadow = true; sun.shadow.mapSize.set(mobileGpu ? 1024 : 2048, mobileGpu ? 1024 : 2048); sun.shadow.bias = -0.0008;
  Object.assign(sun.shadow.camera, {left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 70});
  scene.add(sun);

  const linear = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const lambert = (hex) => new THREE.MeshLambertMaterial({color: linear(hex)});
  const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({color: linear(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending});
  const sphereGeo = new THREE.SphereGeometry(1, 16, 12), ringGeo = new THREE.RingGeometry(0.86, 1, 48);
  const metrics = {};
  let shake = 0, state = null, clock = 0, mapGroup = null, crystal = null, nest = null, camBase = new THREE.Vector3();
  let lockedClimateLighting = null;
  const fighters = new Map(), effects = [], helpers = [];
  const preloadJobs = new Map();
  const MAX_WORLD_EFFECTS = mobileGpu ? 65 : 110;
  function disposeWorldEffect(obj) {
    if (!obj) return;
    obj.parent?.remove(obj);
    obj.traverse((node) => {
      if (!node.isSprite && node.geometry && node.geometry !== sphereGeo && node.geometry !== ringGeo) node.geometry.dispose();
      for (const mat of (Array.isArray(node.material) ? node.material : [node.material])) {
        if (!mat) continue;
        if (node.userData?.ownsMap) mat.map?.dispose?.();
        mat.dispose?.();
      }
    });
  }
  function disposeMap() {
    if (!mapGroup) return;
    /* Detach cached GLB heroes before releasing procedural map geometry. */
    hero?.root?.parent?.remove(hero.root);
    rivalHero?.root?.parent?.remove(rivalHero.root);
    mapGroup.parent?.remove(mapGroup);
    const geometries = new Set(), materials = new Set(), maps = new Set();
    mapGroup.traverse((node) => {
      if (!node.isSprite && node.geometry) geometries.add(node.geometry);
      for (const mat of (Array.isArray(node.material) ? node.material : [node.material])) {
        if (mat && !kit.isSharedMaterial(mat)) {
          materials.add(mat);
          if (mat.map?.userData?.defenseGenerated) maps.add(mat.map);
        }
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    maps.forEach((t) => t.dispose());
    mapGroup = null; env = null; crystal = nest = null;
  }
  let numbersThisFrame = 0;
  const combatVfx = createCombatVfx(THREE, scene, {metrics, onShake: (a) => { shake = Math.max(shake, a); }});
  const fx = createFx(THREE, scene);
  const kit = createToonKit(THREE), seascape = createSeascape(THREE, scene, kit, canvas);
  let env = null;
  const projectileView = createProjectileView(THREE, scene, {actorPoint: (id) => actorPoint(id, true), targetPoint: (id, fallback) => actorPoint(id, false, fallback), metrics});

  /* lane coordinate -> world position on the curved path; lateral offsets spread crowds across the road */
  function world(x, lateral = 0) {
    const p = pointAt(state.path, x - state.left), nx = Math.cos(p.dir), nz = -Math.sin(p.dir);
    return {x: p.x + nx * lateral, z: p.z + nz * lateral, dir: p.dir};
  }

  /* ---------- map ---------- */
  function rand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  const HIT_BAR_SECONDS = 3;
  function hpBar(width, color = 0x6ee87a) {
    const g = new THREE.Group();
    const back = new THREE.Sprite(new THREE.SpriteMaterial({color: 0x2b1d12, depthTest: false})); back.scale.set(width, 0.2, 1); back.renderOrder = 8;
    const fill = new THREE.Sprite(new THREE.SpriteMaterial({color, depthTest: false})); fill.scale.set(width * 0.94, 0.13, 1); fill.renderOrder = 9;
    fill.center.set(0, 0.5); fill.position.x = -width * 0.47;
    g.add(back, fill); g.userData = {fill, width}; return g;
  }
  function distanceToPath(x, z) { let best = Infinity; for (const [px, pz] of state.path.points) best = Math.min(best, Math.hypot(px - x, pz - z)); return best; }
  function buildMap(game) {
    disposeMap();
    mapGroup = new THREE.Group(); scene.add(mapGroup);
    const r = rand(game.stage.id.length * 7919 + game.stageIndex * 131 + 7), [w, h] = FIELD, theme = themeOf(game.stage), T = THEMES[theme];
    /* theme lighting and sky */
    seascape.build(theme, ISLAND); hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2] * 0.62; sun.color.setHex(T.sun[0]); sun.intensity = T.sun[1] * 0.72;
    /* Snapshot the current island's exact light palette once. Normal hits,
       boss strikes, ultimates and network PK updates must not change it. */
    lockedClimateLighting = {
      hemiColor: hemi.color.clone(), hemiGround: hemi.groundColor.clone(), hemiPower: hemi.intensity,
      sunColor: sun.color.clone(), sunPower: sun.intensity,
    };
    const geo = new THREE.PlaneGeometry(w + 40, h + 30, 60, 40).rotateX(-Math.PI / 2), pos = geo.attributes.position, colors = [], c = new THREE.Color();
    const pal = T.ground.map((x) => new THREE.Color(x));
    /* the stage is an island: grass inside, a sand beach near the shore (r = 1 on a wobbly ellipse ISLAND) that slopes
       under the sea, so the ocean all around replaces the bare background */
    const sand = new THREE.Color(0xf2dea6), wet = new THREE.Color(0xd8bd82), deepSea = new THREE.Color(0x1f6f9a);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), n = Math.sin(x * 0.45) * Math.cos(z * 0.5) + Math.sin(x * 0.13 + z * 0.21) * 0.8;
      const a = Math.atan2(z, x), rr = Math.hypot(x / ISLAND[0], z / ISLAND[1]) * (1 + Math.sin(a * 5 + 1.3) * 0.025 + Math.sin(a * 9) * 0.015);
      if (rr > 0.9) pos.setY(i, -Math.min(2.6, (rr - 0.9) * 12));
      c.copy(pal[0]).lerp(n > 0.4 ? pal[2] : pal[1], Math.min(1, Math.abs(n) * 0.55));
      if (rr > 0.84) c.copy(rr > 1.04 ? deepSea : rr > 0.95 ? wet : sand);
      c.convertSRGBToLinear(); colors.push(c.r, c.g, c.b);
    }
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({vertexColors: true, gradientMap: kit.gradientMap})); ground.receiveShadow = true; mapGroup.add(ground);
    /* Static, continuous road ribbons: the old hundreds of overlapping BoxGeometry
       segments and flat cylinders at exactly the same depths caused aggressive
       z-fighting/flickering on mobile GPU depth buffers. These three BufferGeometry
       strips use one mesh each, with stable separated Y planes and no per-frame
       rebuild, so the entire route stays put while fighters follow the same path. */
    const pts = game.path.points;
    function buildRoadRibbon(points, width, y) {
      const vertices = new Float32Array(points.length * 2 * 3);
      const index = [];
      for (let i = 0; i < points.length; i++) {
        const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
        const dx = next[0] - prev[0], dz = next[1] - prev[1];
        const len = Math.max(1e-6, Math.hypot(dx, dz));
        const nx = -dz / len, nz = dx / len;
        const [x, z] = points[i], k = 6 * i;
        vertices[k] = x + nx * width * 0.5;
        vertices[k + 1] = y;
        vertices[k + 2] = z + nz * width * 0.5;
        vertices[k + 3] = x - nx * width * 0.5;
        vertices[k + 4] = y;
        vertices[k + 5] = z - nz * width * 0.5;
        if (i > 0) {
          const p = (i - 1) * 2, q = i * 2;
          index.push(p, p + 1, q, p + 1, q + 1, q);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return geometry;
    }
    const roadLayers = [
      {color: T.road[0], width: 3.3, height: 0.018},
      {color: T.road[1], width: 2.8, height: 0.038},
      {color: T.road[2], width: 2.25, height: 0.058},
    ];
    roadLayers.forEach(({color, width, height}, layer) => {
      const material = new THREE.MeshBasicMaterial({
        color: linear(color), side: THREE.DoubleSide,
        depthTest: true, depthWrite: true,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      });
      const road = new THREE.Mesh(buildRoadRibbon(pts, width, height), material);
      road.name = 'static-road-layer-' + layer;
      road.renderOrder = layer + 1;
      road.receiveShadow = false;
      mapGroup.add(road);
    });
    /* small arrows on the road show the direction monsters walk */
    const arrowMat = new THREE.MeshBasicMaterial({color: linear(T.road[1]), transparent: true, opacity: 0.7});
    for (let d = 6; d < game.path.length - 4; d += 7) {
      const p = pointAt(game.path, d), holder = new THREE.Group(), arrow = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 3), arrowMat);
      arrow.rotation.x = Math.PI / 2; holder.add(arrow); holder.rotation.y = p.dir; holder.position.set(p.x, 0.07, p.z); mapGroup.add(holder);
    }
    /* themed cartoon scenery (js/env.js) */
    const start = pts[0], end = pts[pts.length - 1];
    const beforeEnv = new Set(mapGroup.children);
    env = buildEnvironment(THREE, mapGroup, {theme, path: game.path, start, end, rand: r, kit});
    /* the scenery never moves except what its own animation drives: bake the rest (about 2,000 draw calls down to a few dozen) */
    const scenery = mapGroup.children.filter((c) => !beforeEnv.has(c));
    batchStatic(THREE, scenery, mapGroup, {moving: movingMeshes(scenery, (t) => env.update(t)), outlineMaterialFor: kit.bakedOutline});
    /* our base at the path end: the hero sitting on an oak wine barrel; the boss stands on a dark one at the nest */
    crystal = new THREE.Group(); crystal.position.set(end[0], 0, end[1]); crystal.scale.setScalar(1.3);
    const baseBody = makeBarrel(0xc0874a, 0x4f5560); crystal.add(baseBody);
    /* Two compact bars share the seated hero's overhead anchor: base durability and the
       protected hero's ready status. No second marker is drawn over the barrel. */
    const cbar = hpBar(2.5, 0x6ee8ff); cbar.position.y = 3.6; crystal.add(cbar);
    const heroBar = hpBar(2.5, 0x8ee27b); heroBar.position.y = 4.02; crystal.add(heroBar);
    crystal.userData = {bar: cbar, guardianBar: heroBar, body: baseBody}; mapGroup.add(crystal);
    seatHero(game);
    /* the monster tower: a plum barrel with gold hoops and a glowing portal on its head; the boss stands on it */
    nest = new THREE.Group(); nest.position.set(start[0], 0, start[1]); nest.scale.setScalar(1.3);
    const nestBody = game.duel ? makeBarrel(0x8c5834, 0x536b7e) : makeBarrel(0x6a3d78, 0xd9a93a);
    nest.add(nestBody);
    const portal = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), glow(0xb48cff, 0.75));
    portal.rotation.x = -Math.PI / 2; portal.position.y = BARREL_H + 0.01;
    portal.visible = !game.duel; nest.add(portal);
    /* While the boss stands on the nest, stack the nest and boss bars above the boss.
       Once it leaps down, keep only the nest bar here and show its combat bar on the path. */
    const nbar = hpBar(2.5, 0xff6b8a); nbar.position.y = 3.6; nest.add(nbar);
    const guardBar = hpBar(2.5, 0xf4c46e); guardBar.position.y = 4.02; nest.add(guardBar);
    nest.userData = {portal, bar: nbar, guardianBar: guardBar, body: nestBody}; mapGroup.add(nest);
    nestBody.rotation.y = faceTo(nest.position, crystal.position);
    if (game.duel) seatRivalHero(game); else seatBoss(game);
    buildTraps(game);
    renderer.shadowMap.needsUpdate = true; /* one static shadow bake */
    resize();
  }

  /* A wine barrel: bulging oak staves (lathe profile + stave texture), four iron hoops, a recessed plank head
     with a chime rim, and a little tap at the front. Height BARREL_H. */
  const BARREL_H = 1.7, barrelR = (y) => 0.92 + 0.22 * Math.sin(Math.PI * y / BARREL_H);
  function woodTexture(hex, kind) {
    const c = document.createElement('canvas'); c.width = kind === 'staves' ? 512 : 256; c.height = kind === 'staves' ? 128 : 256;
    const g = c.getContext('2d'), base = new THREE.Color(hex), tone = (k) => '#' + base.clone().multiplyScalar(k).getHexString();
    if (kind === 'staves') {
      const n = 18, w = c.width / n;
      for (let i = 0; i < n; i++) { g.fillStyle = tone(0.9 + (i % 3) * 0.07); g.fillRect(i * w, 0, w, c.height); g.fillStyle = tone(0.55); g.fillRect(i * w, 0, 2, c.height); }
      g.strokeStyle = tone(0.78); g.lineWidth = 1;
      for (let i = 0; i < 70; i++) { const x = Math.random() * c.width; g.beginPath(); g.moveTo(x, Math.random() * c.height); g.lineTo(x + (Math.random() - 0.5) * 3, Math.random() * c.height); g.stroke(); }
    } else {
      g.fillStyle = tone(1); g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 6; i++) { g.fillStyle = tone(0.88 + (i % 2) * 0.1); g.fillRect(0, i * 43, 256, 41); g.fillStyle = tone(0.55); g.fillRect(0, i * 43 + 41, 256, 2); }
      g.strokeStyle = tone(0.6); g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 18, 0, Math.PI * 2); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.userData = {...(t.userData || {}), defenseGenerated: true}; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (kind === 'staves') { t.wrapS = THREE.RepeatWrapping; }
    return t;
  }
  function makeBarrel(wood, hoop) {
    const g = new THREE.Group(), prof = [];
    for (let i = 0; i <= 12; i++) { const y = BARREL_H * i / 12; prof.push(new THREE.Vector2(barrelR(y), y)); }
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), new THREE.MeshToonMaterial({map: woodTexture(wood, 'staves'), gradientMap: kit.gradientMap}));
    g.add(body);
    const metal = kit.toon(hoop);
    for (const y of [0.16, 0.5, BARREL_H - 0.5, BARREL_H - 0.16]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(barrelR(y) + 0.025, barrelR(y) + 0.025, 0.11, 36, 1, true), metal); h.position.y = y; g.add(h); }
    const head = new THREE.Mesh(new THREE.CircleGeometry(barrelR(BARREL_H) - 0.02, 36), new THREE.MeshToonMaterial({map: woodTexture(wood, 'head'), gradientMap: kit.gradientMap}));
    head.rotation.x = -Math.PI / 2; head.position.y = BARREL_H - 0.06; g.add(head);
    const chime = new THREE.Mesh(new THREE.TorusGeometry(barrelR(BARREL_H) - 0.01, 0.06, 8, 36), kit.toon(new THREE.Color(wood).multiplyScalar(0.75).getHex())); chime.rotation.x = Math.PI / 2; chime.position.y = BARREL_H - 0.02; g.add(chime);
    const tap = new THREE.Group(), spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 10), metal); spout.rotation.x = Math.PI / 2; tap.add(spout);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), metal); knob.position.set(0, 0.07, 0.08); tap.add(knob);
    tap.position.set(0, 0.42, barrelR(0.42) + 0.12); g.add(tap);
    kit.toonify(g, {outline: 0.06});
    return g;
  }
  const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  /* where the boss barrel stands: just in front of the portal, toward the camera, so the rocks never hide it */
  const bossSpot = () => nest.position.clone();

  /* The hero (models/hero.glb) sits on the barrel: thighs raised and shins bent after each animation frame. */
  let placeGuide = null, placeGhost = null;
  let hero = null, rivalHero = null, nestBoss = null, traps = [], costumeId = 'trainer', rivalCostumeId = 'trainer', costumes = null, rivalCostumes = null;
  async function seatHero(game) {
    try {
      const g = await loadGltf('models/hero.glb'); if (state !== game) return;
      const object = cloneModel(g.scene), root = new THREE.Group(); root.add(object);
      object.traverse((n) => { if (n.isMesh) n.frustumCulled = false; });
      /* the town wardrobe outfit; the 小山 outfit needs its native companion script first */
      try {
        if (costumeId === 'sound' && !globalThis.XiaoshanSpirit) await new Promise((ok) => { const s = document.createElement('script'); s.src = '../models/native/xiaoshan.js'; s.onload = s.onerror = ok; document.head.append(s); });
        costumes ||= globalThis.HeroCostumes?.create(THREE); costumes?.apply(object, costumeId);
      } catch (e) { console.warn('costume', e); }
      const box = new THREE.Box3().setFromObject(object), s = 2.1 / Math.max(0.01, box.max.y - box.min.y); object.scale.setScalar(s); object.position.y = -box.min.y * s;
      const mixer = new THREE.AnimationMixer(object), actions = {};
      for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
      const bones = Object.fromEntries(['thighL', 'thighR', 'shinL', 'shinR'].map((n) => [n, object.getObjectByName(n)]));
      /* face the boss across the field, sitting on the front edge of the barrel head with legs hanging over */
      const facing = faceTo(crystal.position, bossSpot()); root.rotation.y = facing; /* sitting keeps the hips at standing height, so drop the model until the hips rest on the barrel head */
      object.updateMatrixWorld(true); const hips = object.getObjectByName('hips'), hipY = hips ? hips.getWorldPosition(new THREE.Vector3()).y : 0.9;
      /* sit right on the front rim so the knees clear the barrel edge (radius 0.92) and the shins hang outside */
      root.position.set(Math.sin(facing) * 0.82, BARREL_H - hipY + 0.1, Math.cos(facing) * 0.82);
      kit.toonify(object, {outline: 0.03});
      crystal.add(root);
      hero = {root, object, mixer, actions, bones, current: null};
      heroPlay('Idle');
    } catch (e) { console.warn(e); }
  }
  function heroPlay(name, once = false) {
    if (!hero) return; const a = hero.actions[name]; if (!a || (hero.current === a && !once)) return;
    const old = hero.current; hero.current = a;
    a.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once; a.play();
    if (old && old !== a) a.crossFadeFrom(old, 0.15, true);
    hero.back = once ? a.getClip().duration : 0;
  }
  function tickHero(dt) {
    if (!hero) return;
    hero.mixer.update(dt);
    try { costumes?.update(hero.object, dt); } catch {}
    if (hero.back > 0) { hero.back -= dt; if (hero.back <= 0 && !state?.result) heroPlay('Idle'); }
    const {thighL, thighR, shinL, shinR} = hero.bones;
    for (const t of [thighL, thighR]) if (t) t.rotation.x = -1.45;
    for (const s of [shinL, shinR]) if (s) s.rotation.x = 1.5;
  }
  /* PK has two REAL human trainers, not a monster boss. The room handshake
     provides the opponent's currently equipped costume. Both trainers reuse
     models/hero.glb and the same seated pose, one on each barrel. */
  async function seatRivalHero(game) {
    try {
      const g = await loadGltf('models/hero.glb');
      if (state !== game || !game.duel) return;
      const object = cloneModel(g.scene), root = new THREE.Group();
      root.add(object);
      object.traverse((node) => { if (node.isMesh) node.frustumCulled = false; });
      try {
        if (rivalCostumeId === 'sound' && !globalThis.XiaoshanSpirit)
          await new Promise((ok) => { const script = document.createElement('script'); script.src = '../models/native/xiaoshan.js'; script.onload = script.onerror = ok; document.head.append(script); });
        if (state !== game) return;
        rivalCostumes ||= globalThis.HeroCostumes?.create(THREE);
        rivalCostumes?.apply(object, rivalCostumeId);
      } catch (err) { console.warn('PK opponent costume', err); }
      const box = new THREE.Box3().setFromObject(object);
      const scale = 2.1 / Math.max(0.01, box.max.y - box.min.y);
      object.scale.setScalar(scale);
      object.position.y = -box.min.y * scale;
      const mixer = new THREE.AnimationMixer(object), actions = {};
      for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
      const bones = Object.fromEntries(['thighL','thighR','shinL','shinR'].map((id) => [id, object.getObjectByName(id)]));
      const facing = faceTo(nest.position, crystal.position);
      root.rotation.y = facing;
      object.updateMatrixWorld(true);
      const hips = object.getObjectByName('hips'), hipY = hips ? hips.getWorldPosition(new THREE.Vector3()).y : 0.9;
      root.position.set(Math.sin(facing) * 0.82, BARREL_H - hipY + 0.1, Math.cos(facing) * 0.82);
      kit.toonify(object, {outline: 0.03});
      if (state !== game) return;
      nest.add(root);
      rivalHero = {root, object, mixer, actions, bones, current:null, back:0};
      rivalPlay('Idle');
    } catch (err) { console.warn('PK rival hero', err); }
  }
  function rivalPlay(name, once = false) {
    if (!rivalHero) return;
    const action = rivalHero.actions[name];
    if (!action || (rivalHero.current === action && !once)) return;
    const prev = rivalHero.current; rivalHero.current = action;
    action.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once; action.play();
    if (prev && prev !== action) action.crossFadeFrom(prev, 0.15, true);
    rivalHero.back = once ? action.getClip().duration : 0;
  }
  function tickRivalHero(dt) {
    if (!rivalHero) return;
    rivalHero.mixer.update(dt);
    try { rivalCostumes?.update(rivalHero.object, dt); } catch {}
    if (rivalHero.back > 0) {
      rivalHero.back -= dt;
      if (rivalHero.back <= 0 && !state?.result) rivalPlay('Idle');
    }
    const {thighL,thighR,shinL,shinR} = rivalHero.bones;
    for (const thigh of [thighL,thighR]) if (thigh) thigh.rotation.x = -1.45;
    for (const shin of [shinL,shinR]) if (shin) shin.rotation.x = 1.5;
  }
  /* The stage boss waits on the nest (big and idle) until the nest is first hit, then steps onto the path. */
  async function seatBoss(game) {
    const id = game.stage.boss, spec = spiritMap.get(id); if (!spec) return;
    try {
      const a = await createActor(spec, entries.get(id), 1.1); if (state !== game) { a.dispose(); return; }
      kit.toonify(a.object, {outline: 0.035});
      /* the boss stands on a dark plum barrel with gold hoops, facing the hero */
      const spot = bossSpot(), top = BARREL_H * nest.scale.y; a.throne = nest;
      a.root.position.set(spot.x, top, spot.z); a.root.rotation.y = faceTo(spot, crystal.position);
      scene.add(a.root); a.play('Idle'); nestBoss = a;
      a.home = new THREE.Vector3(spot.x, top, spot.z); a.facing = a.root.rotation.y; a.mood = {next: clock + 3, kind: null, t: 0, back: 0}; a.hurtUntil = 0;
    } catch (e) { console.warn(e); }
  }
  /* when the nest is down to 60% the boss leaps off its barrel onto the start of the path (the walking boss takes over) */
  function releaseNestBoss() {
    if (!nestBoss) return;
    const b = nestBoss, p = world(state.left + 1.5); b.cast = null;
    b.leave = {t: 0, from: b.root.position.clone(), to: new THREE.Vector3(p.x, 0, p.z)};
    if (nest?.userData.guardianBar) nest.userData.guardianBar.visible = false;
    b.play('Attack', true);
  }
  /* the boss on its barrel: idle actions now and then (hop and spin, a taunt, a sway), a flinch when the nest is hit,
     its ultimate (off the barrel to the front of the screen, face the player, turn, cast at the field, fly back)
     and the final leap onto the path */
  function bossFlinch() {
    const b = nestBoss; if (!b || b.cast || b.leave || clock < b.hurtUntil) return;
    /* The boss still flinches locally; avoid the imported Hurt clip, which
       may animate additional luminous/translucent model parts. */
    b.hurtUntil = clock + 0.8; b.mood.back = 0.6; b.mood.kind = 'flinch'; b.mood.t = 0;
  }
  function bossSkillStart() {
    const b = nestBoss; if (!b || b.leave) return;
    const r = canvas.getBoundingClientRect(), to = screenToWorld(r.left + r.width / 2, r.top + r.height * 0.5, CASTER_DIST);
    to.y -= b.height * 0.45 * 0.6;
    b.cast = {t: 0, from: b.home.clone(), to, castT: undefined}; b.mood.kind = null; b.play('Idle');
  }
  function bossSkill(ev) {
    const b = nestBoss, color = ELEMENT_COLORS[ev.element] || 0xff6b8a;
    /* Boss attack remains localized: never tint the entire field/sky. Limit impact draw calls. */
    for (const f of state.fighters.filter((f) => f.side === 'ally' && f.hp > 0).slice(0, 6)) {
      const r = fighters.get(f.id);
      if (r) combatVfx.impact({x: r.deco.position.x, z: r.deco.position.z, element: ev.element, strong: true});
    }
    if (!b?.cast) return;
    b.cast.castT = 0;
    const center = world((state.left + state.right) / 2);
    performSkill(THREE, scene, b, spiritMap.get(state.stage.boss), entries.get(state.stage.boss), true, () => ({x: center.x, z: center.z, width: 30, height: 18}));
  }
  function tickNestBoss(dt) {
    const b = nestBoss; if (!b) return;
    b.tick(dt);
    if (b.leave) {
      const L = b.leave; L.t += dt; const k = Math.min(1, L.t / 0.45), e = ease(k);
      b.root.position.lerpVectors(L.from, L.to, e); b.root.position.y += Math.sin(k * Math.PI) * 2.2;
      b.root.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.75) * 4 * 0.5));
      if (k >= 1) { fx.shockwave({x: L.to.x, z: L.to.z, color: 0xff6b8a, radius: 3, life: 0.5}); fx.particles({x: L.to.x, z: L.to.z, y: 0.3, count: 24, color: 0xb46cff, size: 0.4, speed: 3, up: 2, life: 0.6}); b.dispose(); nestBoss = null; }
      return;
    }
    if (b.cast) {
      /* same beats as a skill card: leap out, face the player, turn while rising, cast, then fly home */
      const c = b.cast; c.t += dt; if (c.castT !== undefined) c.castT += dt;
      const t = c.t, jump = ease(Math.min(1, t / 0.5)), turn = ease(Math.max(0, Math.min(1, (t - 0.7) / 0.35)));
      const toCam = Math.atan2(camBase.x - b.root.position.x, camBase.z - b.root.position.z);
      if (c.castT !== undefined && c.castT > 1.6) {
        const k = ease(Math.min(1, (c.castT - 1.6) / 0.55));
        b.root.position.lerpVectors(c.to, b.home, k); b.root.position.y += Math.sin(k * Math.PI) * 1.6;
        b.root.rotation.y = toCam + Math.PI + (b.facing - toCam - Math.PI) * k; b.root.scale.setScalar(0.6 + 0.4 * k);
        if (k >= 1) { b.cast = null; b.root.scale.setScalar(1); b.root.rotation.y = b.facing; b.play('Idle'); }
        return;
      }
      b.root.position.lerpVectors(c.from, c.to, jump); b.root.position.y += Math.sin(Math.min(1, t / 0.5) * Math.PI) * 2;
      b.root.rotation.y = toCam + (1 - jump) * Math.PI * 2 + turn * Math.PI;
      b.root.scale.setScalar(1 - 0.4 * jump);
      return;
    }
    /* idle on the barrel */
    const m = b.mood; m.t += dt;
    let y = b.home.y + Math.sin(clock * 2) * 0.05, rotY = b.facing, rotZ = 0;
    if (m.kind === 'hop') { const k = Math.min(1, m.t / 0.8); y += Math.sin(k * Math.PI) * 0.9; rotY += k * Math.PI * 2; if (k >= 1) m.kind = null; }
    else if (m.kind === 'sway') { rotZ = Math.sin(m.t * 9) * 0.18 * Math.max(0, 1 - m.t / 1.4); y += Math.abs(Math.sin(m.t * 9)) * 0.12; if (m.t > 1.4) m.kind = null; }
    else if ((m.kind === 'taunt' || m.kind === 'flinch') && m.t > (m.kind === 'taunt' ? 1.2 : 0.6)) { m.kind = null; b.play('Idle'); }
    if (m.kind === 'flinch') { rotZ = -Math.sin(Math.min(1, m.t / 0.6) * Math.PI) * 0.25; }
    if (!m.kind && clock > m.next) {
      m.kind = ['hop', 'taunt', 'sway', 'taunt'][Math.floor(Math.random() * 4)]; m.t = 0; m.next = clock + 4 + Math.random() * 4;
      if (m.kind === 'taunt') b.play(Math.random() < 0.5 ? 'Attack' : 'Ultimate', true);
    }
    b.root.position.set(b.home.x, y, b.home.z); b.root.rotation.set(0, rotY, rotZ);
  }

  /* Road traps: zones are decals on the road; point traps pop when they fire, with a red warning ring just before. */
  const TRAP_LOOK = {mud: 0x7a5530, whirl: 0x3fa9e8, rune: 0xb46cff, poison: 0x7fd65a, spike: 0x9a9aa8, shock: 0xffd23a, geyser: 0x58caff};
  function buildTraps(game) { for (const tr of traps) disposeTrap(tr); traps = game.traps.map(buildTrap); }
  function disposeTrap(tr) { tr.g.parent?.remove(tr.g); tr.g.userData.puddles?.parent?.remove(tr.g.userData.puddles); }
  /* traps appear when the player lays a trap card: the model is built the moment the game state gains it */
  function buildTrap(t) {
    const game = state; {
      const g = new THREE.Group(), flat = new THREE.Group(), p = pointAt(game.path, t.x - game.left), color = TRAP_LOOK[t.kind];
      g.position.set(p.x, 0, p.z); g.rotation.y = p.dir;
      if (t.zone) {
        /* Zones follow the curve as a chain of overlapping round puddles (world space, in mapGroup), lifted above the
           road with a polygon offset so they never z-fight with it; flat pieces stay out of the outline pass. */
        const flatMat = (hex, opacity) => new THREE.MeshBasicMaterial({color: linear(hex), transparent: opacity < 1, opacity, depthWrite: opacity >= 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1});
        const puddleMat = flatMat(color, 1), rimMat = flatMat(0xffffff, 0.45), puddles = new THREE.Group(), from = t.x - game.left - t.half, to = t.x - game.left + t.half;
        const n = Math.max(1, Math.round((to - from) / 0.9));
        for (let k = 0; k <= n; k++) {
          const q = pointAt(game.path, from + (to - from) * k / n), rad = 0.95 + ((k * 37) % 5) * 0.04;
          const rim = new THREE.Mesh(new THREE.CircleGeometry(rad + 0.08, 28), rimMat); rim.rotation.x = -Math.PI / 2; rim.position.set(q.x, 0.075, q.z); puddles.add(rim);
          const pud = new THREE.Mesh(new THREE.CircleGeometry(rad, 28), puddleMat); pud.rotation.x = -Math.PI / 2; pud.position.set(q.x, 0.08, q.z); puddles.add(pud);
          const side = k % 2 ? 1 : -1, nx = Math.cos(q.dir), nz = -Math.sin(q.dir);
          if (t.kind === 'poison') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), kit.toon(0x9a4ad9, {emissive: linear(0x5a1a99), emissiveIntensity: 0.5})); m.position.set(q.x + nx * side * 1.25, 0.1, q.z + nz * side * 1.25); kit.toonify(m, {outline: 0.04}); puddles.add(m); }
          if (t.kind === 'mud') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), kit.toon(0x5a3a1e)); b.position.set(q.x + nx * side * 0.4, 0.12, q.z + nz * side * 0.4); b.scale.y = 0.4; puddles.add(b); }
        }
        mapGroup.add(puddles); g.userData.puddles = puddles;
        if (t.kind === 'whirl' || t.kind === 'rune') { const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.9, 24, 1, 0, Math.PI * 1.6), flatMat(0xffffff, 0.6)); ring.material.side = THREE.DoubleSide; ring.rotation.x = -Math.PI / 2; ring.position.y = 0.13; ring.renderOrder = 3; flat.add(ring); g.userData.spin = ring; }
      } else {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 20), kit.toon(t.kind === 'geyser' ? 0x2f6f9a : 0x6a6a74)); plate.position.y = 0.06; g.add(plate);
        const pop = new THREE.Group(); g.add(pop); g.userData.pop = pop;
        if (t.kind === 'spike') for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 6), kit.toon(0xd8d8e0)); const a = i / 7 * Math.PI * 2; c.position.set(Math.cos(a) * 0.5, 0.25, Math.sin(a) * 0.5); pop.add(c); }
        if (t.kind === 'shock') { const coil = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 20), kit.toon(0xffd23a, {emissive: linear(0xffb800), emissiveIntensity: 0.6})); coil.rotation.x = Math.PI / 2; coil.position.y = 0.15; g.add(coil); }
        pop.scale.y = 0.15;
        const warn = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 28), new THREE.MeshBasicMaterial({color: 0xff4a4a, transparent: true, opacity: 0, depthWrite: false})); warn.rotation.x = -Math.PI / 2; warn.position.y = 0.14; warn.renderOrder = 3; flat.add(warn); g.userData.warn = warn;
      }
      kit.toonify(g, {outline: 0.05}); g.add(flat);
      mapGroup.add(g); g.userData.born = clock;
      return {t, g, popT: 0};
    }
  }
  function syncTraps() {
    while (traps.length < state.traps.length) traps.push(buildTrap(state.traps[traps.length]));
    for (const tr of traps) {
      if (tr.t.expired && !tr.gone) { tr.gone = true; tr.g.visible = false; if (tr.g.userData.puddles) tr.g.userData.puddles.visible = false; }
      else if (!tr.gone) { const k = Math.min(1, (clock - tr.g.userData.born) * 4), sc = 0.4 + 0.6 * (1 - Math.pow(1 - k, 3)); tr.g.scale.set(sc, sc, sc); }
    }
  }
  function trapFired(ev) {
    const tr = traps[ev.index]; if (!tr) return;
    tr.popT = 0.5; const p = tr.g.position;
    if (ev.kind === 'shock') { fx.particles({x: p.x, z: p.z, y: 0.3, count: 26, color: 0xffe23a, size: 0.4, speed: 4, up: 3, spread: 0.3, life: 0.5, gravity: -4}); fx.shockwave({x: p.x, z: p.z, color: 0xffe23a, radius: 1.6, life: 0.4}); }
    else if (ev.kind === 'geyser') { fx.particles({x: p.x, z: p.z, y: 0.2, count: 60, color: 0xbff0ff, size: 0.5, speed: 1.6, up: 9, spread: 0.3, life: 1.1, gravity: -12}); fx.shockwave({x: p.x, z: p.z, color: 0x58caff, radius: 2, life: 0.6}); }
    else fx.particles({x: p.x, z: p.z, y: 0.3, count: 14, color: 0xe8e8f0, size: 0.3, speed: 2.5, up: 2, spread: 0.3, life: 0.4, gravity: -6});
  }
  const ZONE_FX = {mud: {color: 0x6a4524, up: 2.2, gravity: -9, size: 0.28}, whirl: {color: 0xbfeaff, up: 2.6, gravity: -8, size: 0.3, swirl: 6},
    rune: {color: 0xd6a8ff, up: 1.6, gravity: 0.5, size: 0.3}, poison: {color: 0x9be86a, up: 1.2, gravity: 1.2, size: 0.34}};
  function trapWalkFx(f, rec, dt) {
    rec.trapFx = (rec.trapFx || 0) - dt; if (rec.trapFx > 0) return;
    const zone = state.traps.find((t) => t.zone && !t.expired && Math.abs(f.x - t.x) <= t.half + 0.3); if (!zone) return;
    rec.trapFx = f.moving ? 0.28 : 0.6;
    const p = rec.deco.position, look = ZONE_FX[zone.kind];
    fx.particles({x: p.x, z: p.z, y: 0.15, count: 6, color: look.color, size: look.size, speed: 1.4, up: look.up, spread: 0.25, life: 0.55, gravity: look.gravity, swirl: look.swirl || 0});
  }
  function tickTraps(dt) {
    for (const tr of traps) {
      if (tr.gone) continue;
      if (tr.g.userData.spin) tr.g.userData.spin.rotation.z += dt * (tr.t.kind === 'whirl' ? 3 : 1);
      const pop = tr.g.userData.pop, warn = tr.g.userData.warn;
      if (pop) { tr.popT = Math.max(0, tr.popT - dt); pop.scale.y = 0.15 + (tr.popT > 0 ? Math.sin(Math.min(1, (0.5 - tr.popT) * 6) * Math.PI / 2) : 0) * 0.85 * Math.min(1, tr.popT * 4); }
      if (warn) { const left = tr.t.next - state.time; warn.material.opacity = left > 0 && left < TRAP_WARN ? 0.4 + Math.sin(clock * 25) * 0.4 : 0; }
    }
  }

  /* ---------- camera: the whole field on screen; portrait phones turn the camera 90° ---------- */
  /* The fitted view (whole field on screen) is the home position; players can zoom (wheel, pinch, buttons) and
     orbit / tilt (drag on the field); a double click resets the camera. */
  const view3 = {yaw: 0, zoom: 1, tilt: 0.77, dist: 30, target: new THREE.Vector3(), portrait: false};
  function placeCamera() {
    const d = view3.dist * view3.zoom, back = Math.cos(view3.tilt) * d, base = view3.portrait ? new THREE.Vector3(-back, 0, 0) : new THREE.Vector3(0, 0, back);
    base.applyAxisAngle(new THREE.Vector3(0, 1, 0), view3.yaw);
    camBase.set(view3.target.x + base.x, Math.sin(view3.tilt) * d, view3.target.z + base.z);
    camera.position.copy(camBase); camera.lookAt(view3.target); camera.updateProjectionMatrix();
    camera.userData.look = camera.getWorldDirection(new THREE.Vector3());
  }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const portrait = camera.aspect < 0.9, [mw, mh] = portrait ? [FIELD[1], FIELD[0]] : FIELD;
    const vfov = camera.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    /* leave room for the card hand at the bottom of the screen; about 44° above the ground so the models show their faces */
    const tilt = 0.77;
    view3.dist = Math.max((mw / 2 + 3.2) / Math.tan(hfov / 2), (mh / 2 * Math.sin(tilt) * 1.15 + 3) / Math.tan(vfov / 2) / 0.8);
    view3.portrait = portrait; view3.target.set(portrait ? 2.5 : 0, 0, portrait ? 0 : 2.5);
    placeCamera();
  }
  const camLimits = {zoom: [0.5, 1.15], yaw: [-0.9, 0.9], tilt: [0.5, 1.15]};
  const clampTo = (x, [a, b]) => Math.max(a, Math.min(b, x));
  function zoomBy(f) { view3.zoom = clampTo(view3.zoom * f, camLimits.zoom); placeCamera(); }
  function orbitBy(dyaw, dtilt = 0) { view3.yaw = clampTo(view3.yaw + dyaw, camLimits.yaw); view3.tilt = clampTo(view3.tilt + dtilt, camLimits.tilt); placeCamera(); }
  function resetCamera() { Object.assign(view3, {yaw: 0, zoom: 1, tilt: 0.77}); placeCamera(); }
  {
    const pointers = new Map(); let pinch = 0;
    canvas.addEventListener('wheel', (e) => { if (!state) return; e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0012)); }, {passive: false});
    canvas.addEventListener('pointerdown', (e) => { if (!state) return; pointers.set(e.pointerId, {x: e.clientX, y: e.clientY}); canvas.setPointerCapture?.(e.pointerId); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId); if (!p) return;
      if (pointers.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) zoomBy(pinch / Math.max(1, d)); pinch = d; return; }
      orbitBy(-(e.clientX - p.x) * 0.006, (e.clientY - p.y) * 0.004); p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => { pointers.delete(e.pointerId); pinch = 0; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('dblclick', () => state && resetCamera());
  }
  addEventListener('resize', resize);

  /* ---------- labels ---------- */
  function textSprite(text, color = '#ffe27a', size = 64, stroke = 'rgba(70,40,10,.85)') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const g = c.getContext('2d'); g.font = `900 ${size}px "jf-openhuninn", "Microsoft JhengHei", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = stroke; g.strokeText(text, 128, 48); g.fillStyle = color; g.fillText(text, 128, 48);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(c), transparent: true, depthTest: false})); sp.userData.ownsMap = true;
    sp.scale.set(2.4, 0.9, 1); sp.renderOrder = 12; return sp;
  }

  /* ---------- fighters ---------- */
  function addFighter(f) {
    const deco = new THREE.Group(), p = world(f.x, f.z); deco.position.set(p.x, 0, p.z);
    const scale = (f.boss ? BOSS_SCALE : SCALE) * (1 + (f.rank - 1) * 0.08);
    const ph = new THREE.Mesh(sphereGeo, glow(ELEMENT_COLORS[f.type] || 0xffffff, 0.85)); ph.scale.setScalar(0.45); ph.position.y = 0.8; deco.add(ph);
    const bar = hpBar(f.boss ? 2.4 : 1, f.side === 'ally' ? 0x6ee87a : 0xff7a7a); bar.position.y = 0.6 + scale * 2.1; bar.visible = false; deco.add(bar);
    if (f.boss) { const crown = textSprite('魔王', '#ff8a8a', 48); crown.position.y = bar.position.y + 0.6; crown.scale.set(1.8, 0.68, 1); deco.add(crown); }
    const ult = f.side === 'ally' ? hpBar(1, 0xffc93a) : null; if (ult) { ult.position.y = bar.position.y - 0.2; ult.scale.y = 0.6; deco.add(ult); }
    if (f.side === 'ally' && f.rank > 1) { const st = textSprite('★'.repeat(f.rank), '#ffe27a', 50); st.position.y = bar.position.y + 0.1; st.scale.set(1.3, 0.5, 1); deco.add(st); }
    const ring = new THREE.Mesh(ringGeo, glow(f.side === 'ally' ? 0x7fe6ff : 0xff7a7a, 0.55)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; ring.scale.setScalar(scale * 0.55); deco.add(ring);
    const flash = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, depthWrite: false})); flash.scale.set(scale * 0.55, scale * 0.9, scale * 0.55); flash.position.y = scale * 0.8; deco.add(flash);
    const ice = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({color: linear(0xbff4ff), transparent: true, opacity: 0.38, depthWrite: false})); ice.scale.set(scale * 0.6, scale * 1.1, scale * 0.6); ice.position.y = scale * 0.85; ice.visible = false; deco.add(ice);
    const rec = {deco, placeholder: ph, bar, ult, flash, ice, scale, stop: 0, recoil: 0, side: f.side};
    scene.add(deco); fighters.set(f.id, rec);
    createActor(spiritMap.get(f.species), entries.get(f.species), scale).then((a) => {
      if (rec.removed) { a.dispose(); return; }
      kit.toonify(a.object, {outline: 0.04});
      ph.parent?.remove(ph); rec.actor = a; scene.add(a.root); a.play('Walk');
    }).catch((e) => console.warn(e));
    if (f.side === 'ally') { burst(p.x, p.z, ELEMENT_COLORS[f.type], 1.6, 0.5); combatVfx.impact({x: p.x, z: p.z, element: f.type, strong: f.rank > 1}); }
    return rec;
  }
  function removeFighter(id) { const rec = fighters.get(id); if (!rec) return; rec.removed = true; rec.actor?.dispose(); scene.remove(rec.deco); fighters.delete(id); }
  function facingOf(f) { const p = world(f.x, f.z); return f.side === 'ally' ? p.dir + Math.PI : p.dir; }

  /* actorPoint ids: 'f<id>' fighters, 'nest' / 'crystal' bases (used by the cave projectile view). */
  function actorPoint(id, emitter = false, fallback) {
    if (id === 'nest' || id === 'crystal') { const b = id === 'nest' ? nest : crystal; return {x: b.position.x, y: 2, z: b.position.z}; }
    const rec = typeof id === 'string' && id[0] === 'f' ? fighters.get(Number(id.slice(1))) : null;
    if (rec?.actor) return rec.actor.point(emitter);
    if (rec) return {x: rec.deco.position.x, y: 1, z: rec.deco.position.z};
    return fallback ? {x: fallback.x, y: 1, z: fallback.z || 0} : null;
  }
  /* the defender proxy for the model-room scripts: a fighter (looked up live) or a base */
  function targetState(target) {
    if (!target) return null;
    if (!target.side) { const b = target === state.nest ? nest : crystal; return {x: b.position.x, z: b.position.z, width: 2.5, height: 4}; }
    const live = state?.fighters.find((o) => o.id === target.id); if (!live) return null;
    const rec = fighters.get(live.id), h = rec?.actor?.height || 2;
    return {x: rec?.deco.position.x ?? 0, z: rec?.deco.position.z ?? 0, width: h * 0.6, height: h};
  }

  /* The cave's attack, called synchronously by the rules when a fighter attacks. Enemies use it too. */
  function fire(f, target, strong) {
    const rec = fighters.get(f.id), a = rec?.actor;
    if (!a) return null;
    const p = world(f.x, f.z); a.root.position.set(p.x, a.root.position.y, p.z);
    const t = targetState(target); a.root.rotation.y = t ? Math.atan2(t.x - p.x, t.z - p.z) : facingOf(f); rec.aim = a.root.rotation.y; a.root.updateMatrixWorld(true);
    const info = performSkill(THREE, scene, a, spiritMap.get(f.species), entries.get(f.species), strong, () => targetState(target));
    rec.lastSkill = info;
    /* ultimates charge up with a magic circle under the spirit */
    if (strong) { const pt = rec.deco.position; fx.charge({x: pt.x, z: pt.z, element: spiritMap.get(f.species).type, duration: info.release}); }
    return {release: info.release, hold: info.hold};
  }

  /* ---------- effects ---------- */
  function addEffect(obj, life, update) {
    if (effects.length >= MAX_WORLD_EFFECTS) { disposeWorldEffect(obj); return; }
    scene.add(obj); effects.push({obj, life, age:0, update});
  }
  function burst(x, z, color, radius = 1.5, life = 0.45, y = 0.12) {
    const ring = new THREE.Mesh(ringGeo, glow(color, 0.9)); ring.rotation.x = -Math.PI / 2; ring.position.set(x, y, z);
    addEffect(ring, life, (o, k) => { o.scale.setScalar(0.2 + radius * k); o.material.opacity = 0.9 * (1 - k); });
  }
  function floatText(x, y, z, text, color, size = 56, scale = 1, onDone) {
    const s = textSprite(text, color, size); s.position.set(x, y, z); s.scale.multiplyScalar(scale);
    const drift = (Math.random() - 0.5) * 0.8;
    addEffect(s, 0.9, (o, k) => { if (k >= 1 && onDone) { onDone(); onDone = null; } o.position.set(x + drift * k, y + Math.sin(Math.min(1, k * 2) * Math.PI / 2) * 1.1, z); const pop = k < 0.12 ? 1.35 - k * 2.9 : 1; o.scale.set(2.4 * scale * pop, 0.9 * scale * pop, 1); o.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; });
  }
  function bolt(a, b, color) {
    const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * k + (i % 8 ? (Math.random() - 0.5) * 0.5 : 0), (a.y ?? 1.2) + ((b.y ?? 1.2) - (a.y ?? 1.2)) * k + Math.sin(k * Math.PI) * 0.6, a.z + (b.z - a.z) * k + (i % 8 ? (Math.random() - 0.5) * 0.5 : 0))); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color: linear(color || 0xfff27a), transparent: true, blending: THREE.AdditiveBlending}));
    addEffect(line, 0.25, (o, k) => { o.material.opacity = 1 - k; });
  }
  function tubeAlong(fromX, toX, color, radius, life) {
    const pts = []; for (let x = fromX; x >= toX; x -= 0.8) { const p = world(x); pts.push(new THREE.Vector3(p.x, 1.4, p.z)); }
    if (pts.length < 2) return;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, radius, 10, false), glow(color, 0.8));
    addEffect(tube, life, (o, k) => { o.material.opacity = 0.8 * (1 - k); o.scale.setScalar(1); });
  }

  /* Hit feedback: hit-stop, flash, recoil and an element burst on every hit. Damage numbers are pooled per target
     (one number every 0.6 s summing the hits in between), with at most NUMBER_CAP on screen; critical hits,
     ultimates and super-effective hits always show, bigger. Damage to our own spirits only shows on crits. */
  const NUMBER_CAP = 6;
  let numbersOnScreen = 0;
  function hit(ev) {
    const rec = fighters.get(ev.id); if (!rec) return;
    const d = rec.deco.position, y = 0.5 + rec.scale * 0.8;
    if (ev.blocked) return;
    rec.stop = Math.max(rec.stop, ev.crit || ev.strong ? 0.12 : 0.06);
    rec.barUntil = clock + HIT_BAR_SECONDS;
    rec.flashT = 0.14; rec.flash.material.color.copy(linear(ev.crit ? 0xffd54a : rec.side === 'ally' ? 0xff8a8a : ev.strong ? ELEMENT_COLORS[ev.element] || 0xffffff : 0xffffff));
    rec.recoil = ev.crit || ev.strong ? 0.3 : 0.14;
    if (numbersThisFrame < 4) fx.hit({x: d.x, y, z: d.z, element: ev.element, crit: ev.crit, kind: ev.kind});
    numbersThisFrame++;
    const loud = ev.crit || ev.strong || ev.effective;
    rec.pending = (rec.pending || 0) + ev.amount;
    if (rec.side === 'ally' && !ev.crit) return;
    if (!loud && clock - (rec.lastNumber || 0) < 0.6) return;
    if (numbersOnScreen >= NUMBER_CAP && !ev.crit) return;
    const n = Math.max(1, Math.round(rec.pending)); rec.pending = 0; rec.lastNumber = clock;
    const color = ev.crit ? '#ffd54a' : ev.effective ? '#ff9a3c' : ev.resisted ? '#b9c4cc' : rec.side === 'ally' ? '#ff6b6b' : '#ffffff';
    numbersOnScreen++;
    floatText(d.x, 1.6 + rec.scale, d.z, ev.crit ? n + '!' : String(n), color, loud ? 64 : 52, ev.crit ? 1.7 : ev.strong ? 1.5 : 1.05, () => numbersOnScreen--);
    if (ev.crit) floatText(d.x, 2.5 + rec.scale, d.z, '暴擊！', '#ffe27a', 46, 1.1);
  }

  /* A release from a spirit without its own model-room presentation falls back to the cave's spell burst,
     like scene.spellRelease() in the cave; 水蛟龍王 uses its native spirit effect. */
  function release(ev) {
    const rec = fighters.get(ev.from), a = rec?.actor, original = rec?.lastSkill?.originalPresentation;
    const from = a ? a.point(true) : {x: 0, y: 1, z: 0};
    const to = typeof ev.target === 'number' ? actorPoint('f' + ev.target) || from : actorPoint(ev.target) || from;
    const kind = ev.kind === 'melee' ? 'area' : ev.kind === 'tracking' ? 'ranged' : ev.kind;
    const spell = {sourceActor: 'f' + ev.from, speciesId: ev.species, x: from.x, z: from.z, from, to, heading: Math.atan2(to.x - from.x, to.z - from.z), kind, element: ev.element, strong: ev.strong,
      global: !!ev.global, final: !!ev.global, range: ev.radius || (kind === 'self' ? 3 : Math.max(1.5, Math.hypot(to.x - from.x, to.z - from.z)))};
    if (ev.species === 'mewtwo') combatVfx.nativeSpirit({...spell});
    if (ev.strong) {
      /* ultimates: the spirit's own model-room script plays as before, and the defense-map layer replaces the old fallback burst */
      fx.ultimate({from, to, element: ev.element, kind: ev.kind, radius: Math.min(3.5, ev.radius || 2.4)});
      shake = Math.max(shake, 0.35);
      return;
    }
    if (!original || ev.kind === 'self') combatVfx.spellRelease(spell);
    if (ev.kind !== 'self') combatVfx.impact({x: to.x, z: to.z, element: ev.element, strong: ev.strong});
  }
  function projectileRecords() {
    const list = [];
    for (const shot of state.shots) {
      if (!shot.profile.ranged || ['global', 'self', 'area'].includes(shot.profile.type) || shot.travel < shot.release) continue;
      const rec = fighters.get(shot.from); if (!rec || rec.lastSkill?.originalPresentation) continue;
      const k = Math.min(1, (shot.travel - shot.release) / Math.max(0.01, shot.eta - shot.release)), spec = spiritMap.get(shot.species);
      const from = rec.actor ? rec.actor.point(true) : {x: 0, y: 1.2, z: 0}, to = (typeof shot.target === 'number' ? actorPoint('f' + shot.target) : actorPoint(shot.target)) || from;
      list.push({id: shot.id, x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, origin: from,
        sourceActor: 'f' + shot.from, target: typeof shot.target === 'number' ? 'f' + shot.target : shot.target, fx: projectileStyle(spec, shot.strong), element: shot.element, color: projectileTint(spec), speciesId: shot.species, context: {strong: shot.strong}});
    }
    return list;
  }

  /* Support skills: the spirit appears beside the crystal and performs its cave ultimate, then the skill effect. */
  /* Support card entrance: the spirit leaps out of the card to the middle of the screen (floating in front of the
     camera) and faces the player; when the skill lands it turns round to the field and casts, then fades away. */
  const casters = [], CASTER_DIST = 8.5; let cardOrigin = null;
  const screenToWorld = (sx, sy, dist) => {
    const r = canvas.getBoundingClientRect(), ndc = new THREE.Vector3(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1, 0.5).unproject(camera);
    return camBase.clone().add(ndc.sub(camera.position).normalize().multiplyScalar(dist));
  };
  async function skillStart(ev) {
    const spec = spiritMap.get(ev.species), origin = cardOrigin || {x: innerWidth / 2, y: innerHeight * 0.85}; cardOrigin = null;
    const r = canvas.getBoundingClientRect(), to = screenToWorld(r.left + r.width / 2, r.top + r.height * 0.56, CASTER_DIST), from = screenToWorld(origin.x, origin.y, CASTER_DIST);
    const c = {ev, from, to, t: 0, a: null, cast: false};
    casters.push(c);
    try {
      const a = await createActor(spec, entries.get(ev.species), 0.6); kit.toonify(a.object, {outline: 0.012});
      if (!casters.includes(c)) { a.dispose(); return; }
      to.y -= a.height * 0.45; from.y -= a.height * 0.45;
      c.a = a; a.root.position.copy(from); a.root.scale.setScalar(0.25); scene.add(a.root); a.play('Idle');
      fx.particles({x: from.x, y: from.y + a.height * 0.5, z: from.z, count: 24, color: ELEMENT_COLORS[ev.element], size: 0.35, speed: 3, up: 1, life: 0.5, gravity: 0});
      if (c.cast) castFrom(c);
    } catch (e) { console.warn(e); }
  }
  function castFrom(c) {
    const ev = c.ev, spec = spiritMap.get(ev.species), center = world((state.left + state.right) / 2);
    const foes = state.fighters.filter((f) => f.side === 'enemy' && f.hp > 0).map((f) => fighters.get(f.id)?.deco.position).filter(Boolean);
    const single = ev.kind === 'volley' || ev.kind === 'beam';
    const aim = single && foes[0] ? {x: foes[0].x, z: foes[0].z, width: 1.5, height: 1.5} : {x: center.x, z: center.z, width: 30, height: 18};
    c.castT = 0;
    if (c.a) performSkill(THREE, scene, c.a, spec, entries.get(ev.species), true, () => aim);
  }
  /* Timeline from the card tap (the effect lands at SKILL_WINDUP = 1.1 s): leap out of the card along an arc and
     land facing the player (0-0.5 s), a small bounce (0.5-0.7 s), an eased half turn toward the field while
     rising (0.7-1.05 s), cast, then drift up and shrink away with a sparkle (2.4-2.8 s). */
  const ease = (k) => k * k * (3 - 2 * k);
  function tickCasters(dt) {
    for (let i = casters.length - 1; i >= 0; i--) {
      const c = casters[i], a = c.a; c.t += dt;
      if (!a) { if (c.t > 4) casters.splice(i, 1); continue; }
      a.tick(dt);
      const t = c.t, jump = ease(Math.min(1, t / 0.5)), turn = ease(Math.max(0, Math.min(1, (t - 0.7) / 0.35))), rise = ease(Math.max(0, Math.min(1, (t - 0.7) / 0.6)));
      a.root.position.lerpVectors(c.from, c.to, jump);
      a.root.position.y += Math.sin(Math.min(1, t / 0.5) * Math.PI) * 1.6 + rise * 0.5 + (t > 0.5 && t < 0.7 ? -Math.sin((t - 0.5) / 0.2 * Math.PI) * 0.12 : 0);
      const toCam = Math.atan2(camBase.x - a.root.position.x, camBase.z - a.root.position.z);
      /* spin in during the leap (one extra turn), face the player, then turn to the field */
      a.root.rotation.y = toCam + (1 - jump) * Math.PI * 2 + turn * Math.PI;
      let s = 0.25 + 0.75 * jump; if (t > 0.5 && t < 0.7) s *= 1 + Math.sin((t - 0.5) / 0.2 * Math.PI) * 0.06;
      if (t > 2.4) { const out = ease(Math.min(1, (t - 2.4) / 0.4)); s *= 1 - out; a.root.position.y += out * 1.2; if (out >= 1) { fx.particles({x: a.root.position.x, y: a.root.position.y + 0.6, z: a.root.position.z, count: 18, color: ELEMENT_COLORS[c.ev.element], size: 0.3, speed: 2, up: 1, life: 0.5, gravity: 0}); a.dispose(); casters.splice(i, 1); continue; } }
      a.root.scale.setScalar(Math.max(0.01, s));
    }
  }

  /* Global screen-wide washes were removed in V2.0: only localized VFX
     are allowed, so a hit cannot darken the scene or repaint its fixed sky. */

  function supportSkill(ev) {
    const color = ELEMENT_COLORS[ev.element], c = crystal.position, center = world((state.left + state.right) / 2);
    const caster = casters.find((k) => k.ev.species === ev.species && !k.cast);
    if (caster) { caster.cast = true; if (caster.a) castFrom(caster); }
    const side = ['heal', 'shield', 'haste'].includes(ev.kind) ? 'ally' : 'enemy';
    /* field-wide and team-wide skills wash the whole map; single-target ones (volley, beam) only mark their targets */
    /* No global fieldWash: stage weather and the painted sky never react to a skill. */
    if (['freeze', 'quake', 'plague'].includes(ev.kind)) {
      fx.shockwave({x: center.x, z: center.z, color, radius: 24, life: 1.1});
      for (let i = 0; i < state.path.points.length; i += 16) {
        const [px, pz] = state.path.points[i];
        fx.particles({x: px, z: pz, y: 0.3, count: 2, color, size: 0.35, speed: 1, up: 1.2, life: 0.7, gravity: -2});
      }
    }
    fx.skill({center, element: ev.element, kind: ev.kind,
      targets: state.fighters.filter((f) => f.side === side && f.hp > 0).slice(0, 6).map((f) => fighters.get(f.id)?.deco.position).filter(Boolean)});
    shake = Math.max(shake, 0.5);
    const enemies = () => state.fighters.filter((f) => f.side === 'enemy' && f.hp > 0);
    if (ev.kind === 'freeze') { const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({color: linear(0xbff4ff), transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false})); dome.position.set(center.x, 0, center.z); addEffect(dome, 1.6, (o, k) => { o.scale.setScalar(2 + Math.min(1, k * 4) * 22); o.material.opacity = 0.3 * (1 - k); }); }
    else if (ev.kind === 'volley' || ev.kind === 'quake' || ev.kind === 'plague') for (const f of enemies().slice(0, 6)) { const r = fighters.get(f.id); if (!r) continue; const t = r.deco.position; if (ev.kind === 'volley') bolt({x: c.x, y: 3, z: c.z}, {x: t.x, y: 1, z: t.z}, color); combatVfx.impact({x: t.x, z: t.z, element: ev.element, strong: true}); }
    else if (ev.kind === 'beam') tubeAlong(state.right, state.right - (state.right - state.left) * 0.6, color, 1.0, 1.0);
    else if (ev.kind === 'heal' || ev.kind === 'shield' || ev.kind === 'haste') for (const f of state.fighters.filter((f) => f.side === 'ally' && f.hp > 0).slice(0, 6)) { const r = fighters.get(f.id); if (r) burst(r.deco.position.x, r.deco.position.z, ev.kind === 'heal' ? 0x83ffc5 : ev.kind === 'shield' ? 0xffd058 : 0xfff27a, 1.8, 0.7); }
    if (ev.kind === 'heal') burst(c.x, c.z, 0x83ffc5, 3, 0.9);
  }

  function handleEvents() {
    numbersThisFrame = 0;
    for (const ev of state.events) {
      if (ev.type === 'release') release(ev);
      else if (ev.type === 'hit') hit(ev);
      else if (ev.type === 'heal') {
        const rec = fighters.get(ev.id), t = rec?.deco?.position;
        if (t) {
          burst(t.x, t.z, 0x83ffc5, 1.15, 0.5);
          if (numbersOnScreen < NUMBER_CAP) {
            numbersOnScreen++;
            floatText(t.x, 2 + rec.scale, t.z, '+' + Math.round(ev.amount), '#a5ffcd', 43, 0.65, () => numbersOnScreen--);
          }
        }
      }
      else if (ev.type === 'priestCast') {
        const rec = fighters.get(ev.id), t = rec?.deco?.position;
        if (t) fx.particles({x:t.x,y:0.8,z:t.z,count:8,color:0x83ffc5,size:0.24,speed:0.6,up:1.3,life:0.45,gravity:0});
      }
      else if (ev.type === 'chain') { const a = actorPoint('f' + ev.from), b = actorPoint('f' + ev.to); if (a && b) bolt(a, b, ELEMENT_COLORS[ev.element]); }
      else if (ev.type === 'death') { const r = fighters.get(ev.id); if (r) { r.dying = 0; r.actor?.play('Death', true); combatVfx.impact({x: r.deco.position.x, z: r.deco.position.z, element: '光', strong: true}); } }
      else if (ev.type === 'baseHit') { if (ev.side === 'nest') bossFlinch(); const b = ev.side === 'nest' ? nest : crystal; b.userData.flash = 0.18; b.userData.barUntil = clock + HIT_BAR_SECONDS; b.userData.pending = (b.userData.pending || 0) + ev.amount; if (clock - (b.userData.lastNumber || 0) > 0.8) { floatText(b.position.x, 4.2, b.position.z, String(Math.round(b.userData.pending)), ev.side === 'nest' ? '#ffe27a' : '#ff6b6b', 58, 1.1); b.userData.pending = 0; b.userData.lastNumber = clock; } /* Barrel squash and local damage number are the entire hit reaction.
           Do not play a model-wide Hurt clip at the same time: this created
           camera-visible bursts when the host/rival trainer was struck. */ }
      else if (ev.type === 'weatherLightning' && state?.stage?.id === 'waterfall' && !state.duel) {
        /* Damage was resolved by rules.js. Visuals are Three.js only, on the road. */
        const strike = world(ev.x);
        fx.lightningStrike({x: strike.x, z: strike.z});
      }
      else if (ev.type === 'trap') trapFired(ev);
      else if (ev.type === 'skillStart') skillStart(ev);
      else if (ev.type === 'bossSkillStart') bossSkillStart(ev);
      else if (ev.type === 'bossSkill') bossSkill(ev);
      else if (ev.type === 'skill') supportSkill(ev);
      else if (ev.type === 'boss') { shake = Math.max(shake, 0.7); releaseNestBoss(); }
      else if (ev.type === 'ultimate') { const rec = fighters.get(ev.id), name = spiritMap.get(ev.species)?.skills?.[1]?.name; if (rec && name && numbersOnScreen < NUMBER_CAP) { const d = rec.deco.position; numbersOnScreen++; floatText(d.x, 2.2 + rec.scale, d.z, '大絕・' + name, ev.side === 'ally' ? '#fff0a8' : '#ffb0b0', 40, 0.9, () => numbersOnScreen--); } }
      else if (ev.type === 'finish') { heroPlay(ev.won ? 'JumpCelebrate' : 'Disappointed', true); if (state?.duel) rivalPlay(ev.won ? 'Disappointed' : 'JumpCelebrate', true); }
    }
  }

  function update(dt) {
    clock += dt;
    if (state) {
      handleEvents();
      const live = new Set(state.fighters.map((f) => f.id)), frozen = state.freezeUntil > state.time, shielded = state.shieldUntil > state.time;
      for (const id of [...fighters.keys()]) if (!live.has(id)) removeFighter(id);
      for (const f of state.fighters) {
        const rec = fighters.get(f.id) || addFighter(f), d = rec.deco, a = rec.actor, p = world(f.x, f.z);
        d.position.x += (p.x - d.position.x) * Math.min(1, dt * 14); d.position.z += (p.z - d.position.z) * Math.min(1, dt * 14);
        d.position.y = f.flying ? 1 + Math.sin(clock * 3 + f.id) * 0.15 : 0;
        if (f.hp <= 0) {
          rec.bar.visible = false; rec.ice.visible = false; rec.dying = (rec.dying || 0) + dt;
          if (a) { a.root.scale.setScalar(Math.max(0.01, 1 - rec.dying * 1.1)); a.root.position.y = d.position.y - rec.dying * 0.6; a.tick(dt * 0.6); }
          continue;
        }
        /* the boss shows its health only for a moment after it is struck; other units while they are hurt */
        rec.bar.visible = f.boss ? clock < (rec.barUntil || 0) : f.hp < f.maxHp;
        if (rec.bar.visible) rec.bar.userData.fill.scale.x = rec.bar.userData.width * 0.94 * Math.max(0, f.hp) / f.maxHp;
        if (rec.ult) { const k = Math.max(0, Math.min(1, 1 - (f.ultAt - state.time) / f.ultCd)); rec.ult.userData.fill.scale.x = Math.max(0.001, rec.ult.userData.width * 0.94 * k); rec.ult.userData.fill.material.color.setHex(k >= 1 ? (Math.sin(clock * 10) > 0 ? 0xfff2a0 : 0xffc93a) : 0xffc93a); }
        trapWalkFx(f, rec, dt);
        rec.ice.visible = f.side === 'enemy' && frozen;
        rec.flashT = Math.max(0, (rec.flashT || 0) - dt); rec.flash.material.opacity = rec.flashT > 0 ? (f.side === 'ally' ? 0.3 : 0.45) * rec.flashT / 0.14 : f.side === 'ally' && shielded ? 0.25 : 0;
        if (f.side === 'ally' && shielded && !rec.flashT) rec.flash.material.color.copy(linear(0xffd058));
        if (a) {
          /* hit-stop freezes the pose for a few frames; recoil pushes the model back along its facing */
          const stopped = rec.stop > 0; rec.stop = Math.max(0, rec.stop - dt);
          rec.recoil = Math.max(0, rec.recoil - dt * 2.2);
          const face = a.hold > 0 && rec.aim !== undefined ? rec.aim : facingOf(f);
          a.root.position.set(d.position.x - Math.sin(face) * rec.recoil, d.position.y, d.position.z - Math.cos(face) * rec.recoil);
          a.root.rotation.y = face;
          a.root.rotation.z = f.knockUntil > state.time ? 0.3 : 0;
          if (a.hold <= 0) a.play(f.moving ? 'Walk' : 'Idle');
          const iced = f.side === 'enemy' && frozen;
          a.tick(stopped || iced ? 0 : dt * (f.moving && f.statuses.slow?.until > state.time ? 0.5 : 1), actorPoint(typeof f.lastTarget === 'number' ? 'f' + f.lastTarget : null));
        } else rec.placeholder.position.y = 0.8 + Math.sin(clock * 3 + f.id) * 0.1;
        for (const [k, color] of [['poison', 0x94f85f], ['burn', 0xff6838]]) if (f.statuses[k]?.until > state.time && Math.random() < dt * 6) {
          const q = new THREE.Mesh(sphereGeo, glow(color, 0.8)); q.scale.setScalar(0.1); q.position.set(d.position.x + (Math.random() - 0.5) * 0.6, 0.8, d.position.z);
          addEffect(q, 0.6, (o, kk) => { o.position.y += 0.03; o.material.opacity = 0.8 * (1 - kk); });
        }
        if (f.stunUntil > state.time && Math.random() < dt * 4) floatText(d.position.x, 2.4, d.position.z, 'ϟ', '#ffe473', 50, 0.6);
      }
      projectileView.update(projectileRecords(), dt);
      for (const [b, hp] of [[crystal, state.crystal], [nest, state.nest]]) {
        b.userData.bar.userData.fill.scale.x = b.userData.bar.userData.width * 0.94 * hp.hp / hp.maxHp;
        /* the hero's and the boss's health bars are not kept on screen: they appear for a moment when attacked */
        b.userData.bar.visible = clock < (b.userData.barUntil || 0); if (b.userData.guardianBar) b.userData.guardianBar.visible = false;
        { const body = b.userData.body; b.userData.flash = Math.max(0, (b.userData.flash || 0) - dt); const k = Math.sin(b.userData.flash / 0.18 * Math.PI) * 0.018; if (body) body.scale.set(1 + k, 1 - k, 1 + k); }
      }
    }
    for (let i = helpers.length - 1; i >= 0; i--) { const hlp = helpers[i]; hlp.a.tick(dt); if (clock > hlp.until) { const k = Math.min(1, (clock - hlp.until) * 3); hlp.a.root.scale.setScalar(Math.max(0.01, 1 - k)); if (k >= 1) { hlp.a.dispose(); helpers.splice(i, 1); } } }
    tickHero(dt); tickRivalHero(dt); tickCasters(dt);
    tickNestBoss(dt);
    if (state) { syncTraps(); tickTraps(dt); }
    if (nest) nest.userData.portal.material.opacity = 0.55 + Math.sin(clock * 3) * 0.2;
    combatVfx.update(dt); fx.update(dt); env?.update(dt); seascape.update(dt);
    /* Guard against imported skill VFX accidentally modifying climate state.
       Preserve per-character damage flashes without flickering the whole sky. */
    for (let i = effects.length - 1; i >= 0; i--) { const e = effects[i]; e.age += dt; const k = Math.min(1, e.age / e.life); e.update(e.obj, k); if (k >= 1) { disposeWorldEffect(e.obj); effects.splice(i, 1); } }
    /* Keep the sky and horizon visually steady when a tower or spirit takes damage.
       Damage feedback remains on the character and tower rather than the camera. */
    const s = 0; shake = Math.max(0, shake - dt * 1.6);
    /* smooth, decaying shake (no per-frame random jumps, which read as flicker) */
    camera.position.set(camBase.x + Math.sin(clock * 38) * s, camBase.y + Math.sin(clock * 47) * s * 0.4, camBase.z + Math.cos(clock * 33) * s * 0.6);
    if (s) camera.lookAt(view3.target);
    /* All 10 stages and PK: make the authored climate the final render state.
       No hit, model-room skill, boss attack or road thunder may tint the sky,
       move lighting, change fog, or switch the renderer to tone mapping. */
    seascape.lockWeather();
    if (lockedClimateLighting) {
      const c = lockedClimateLighting;
      if (!hemi.color.equals(c.hemiColor)) hemi.color.copy(c.hemiColor);
      if (!hemi.groundColor.equals(c.hemiGround)) hemi.groundColor.copy(c.hemiGround);
      if (hemi.intensity !== c.hemiPower) hemi.intensity = c.hemiPower;
      if (!sun.color.equals(c.sunColor)) sun.color.copy(c.sunColor);
      if (sun.intensity !== c.sunPower) sun.intensity = c.sunPower;
    }
    if (renderer.toneMapping !== THREE.NoToneMapping) renderer.toneMapping = THREE.NoToneMapping;
    /* Keep both the real GPU clear and the sky in separate compositing
       layers, even if a shared combat effect touches renderer state. */
    if (renderer.getClearAlpha() !== 0) renderer.setClearAlpha(0);
    renderer.render(scene, camera);
  }

  const portraits = new Map(); let portraitRig = null;
  function releasePortraitRenderer() {
    /* The optional GLB dialogue portrait uses a third WebGL context.
       Free it outside boss dialogue scenes, particularly during long PK
       sessions, rather than keeping a spare 384px renderer alive forever. */
    if (!portraitRig) return;
    try { portraitRig.r.dispose(); portraitRig.r.forceContextLoss?.(); } catch {}
    portraitRig = null;
  }
  return {
    update, resize, fire, metrics,
    set cardOrigin(p) { cardOrigin = p; },
    set costume(id) { costumeId = id || 'trainer'; },
    set rivalCostume(id) { rivalCostumeId = id || 'trainer'; },
    zoomBy, orbitBy, resetCamera,
    debug: () => ({THREE, scene, camera, renderer, crystal, nest, hero, rivalHero, nestBoss, traps}),
    setGame(game) {
      for (const id of [...fighters.keys()]) removeFighter(id);
      for (const hlp of helpers.splice(0)) hlp.a.dispose();
      if (nestBoss) { nestBoss.dispose(); nestBoss = null; }
      for (const e of effects.splice(0)) disposeWorldEffect(e.obj);
      disposeMap();
      hero = null; rivalHero = null; traps = []; placeGuide = placeGhost = null; numbersOnScreen = 0;
      for (const c of casters.splice(0)) c.a?.dispose();
      projectileView.clear(); combatVfx.clear(); fx.clear();
      if (!game || game.duel) releasePortraitRenderer();
      state = game; if (game) buildMap(game); else seascape.dispose();
    },
    async preload(ids, onProgress = null) {
      /* Fetch model/assets only. Old code constructed+destroyed every complete
         skinned fighter sequentially, delaying sortie for many seconds. */
      const unique = [...new Set(ids)].filter((id) => spiritMap.has(id));
      let index = 0, done = 0;
      const worker = async () => {
        while (index < unique.length) {
          const id = unique[index++], spec = spiritMap.get(id);
          if (!preloadJobs.has(id)) {
            const work = (spec.model?.includes('://')
              ? nativeAsset(spec.model) : loadGltf(spec.model)).catch((e) => {
                preloadJobs.delete(id); throw e;
              });
            preloadJobs.set(id, work);
          }
          try { await preloadJobs.get(id); } catch(e) { console.warn('預載角色失敗', id, e); }
          done++; onProgress?.(done, unique.length, id);
        }
      };
      await Promise.all(Array.from({length: Math.min(3,unique.length)}, () => worker()));
    },
    /* Trap placement: while a card is chosen the road is dotted and a preview follows the finger. pick() turns a screen point
       into the lane coordinate of the nearest road point (null when it is not on the road). */
    pickRoad(clientX, clientY) {
      if (!state) return null;
      const r = canvas.getBoundingClientRect(), ndc = new THREE.Vector2((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08), new THREE.Vector3()); if (!hit) return null;
      const {points, lengths} = state.path; let best = null, bd = 1e9;
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, az] = points[i], [bx, bz] = points[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((hit.x - ax) * dx + (hit.z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(hit.x - px, hit.z - pz);
        if (d < bd) { bd = d; best = {x: state.left + lengths[i] + (lengths[i + 1] - lengths[i]) * t, dist: d}; }
      }
      return best && best.dist <= 2.2 ? best : null;
    },
    placement(kind, x = null) {
      if (!state) return;
      if (!kind) { if (placeGuide) { placeGuide.parent?.remove(placeGuide); placeGuide.geometry.dispose(); placeGuide = null; } if (placeGhost) placeGhost.visible = false; return; }
      if (!placeGuide) {
        const pts = [], n = Math.floor(state.path.length / 0.8);
        for (let i = 1; i < n; i++) { const p = pointAt(state.path, i * 0.8); pts.push(p.x, 0.22, p.z); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        placeGuide = new THREE.Points(g, new THREE.PointsMaterial({color: 0xffffff, size: 0.5, transparent: true, opacity: 0.85, depthWrite: false})); placeGuide.renderOrder = 4; mapGroup.add(placeGuide);
      }
      if (!placeGhost) { placeGhost = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2})); placeGhost.renderOrder = 5; mapGroup.add(placeGhost); }
      placeGhost.material.color.setHex(kind === 'egg' ? 0xffdc70 : TRAP_LOOK[kind] || 0xffffff);
      if (x === null) placeGhost.visible = false; else { const p = pointAt(state.path, x - state.left); placeGhost.position.set(p.x, 0.2, p.z); placeGhost.visible = true; }
    },
    /* A transparent bust of a spirit's own 3D model, for dialog portraits (docs: GLB 透像). Cached per id and pose. */
    portrait(id, pose = {}) { return renderPortrait(id, pose); },
  };

  function renderPortrait(id, pose) {
    const key = id + JSON.stringify(pose);
    if (!portraits.has(key)) portraits.set(key, buildPortrait(id, pose).catch((e) => { console.warn(e); portraits.delete(key); return null; }));
    return portraits.get(key);
  }
  async function buildPortrait(id, pose) {
    const spec = spiritMap.get(id); if (!spec) return null;
    const T = THREE, S = 384;
    if (!portraitRig) {
      const r = new T.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
      r.setPixelRatio(1); r.setSize(S, S, false); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.NoToneMapping; r.setClearColor(0x000000, 0);
      const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xffffff, 0xb8a47a, 0.95));
      const key = new T.DirectionalLight(0xfff3dc, 1.0); key.position.set(-3, 5, 6); sc.add(key);
      const rim = new T.DirectionalLight(0xbfe0ff, 0.5); rim.position.set(4, 2, -5); sc.add(rim);
      portraitRig = {r, sc, cam: new T.PerspectiveCamera(26, 1, 0.05, 200)};
    }
    const {r, sc, cam} = portraitRig;
    const a = await createActor(spec, entries.get(id), 1);
    try {
      kit.toonify(a.object, {outline: 0.03});
      a.root.rotation.y = pose.yaw || 0; sc.add(a.root);
      a.play(pose.action || 'Idle'); a.tick(0.001); a.tick(pose.action === 'Idle' || !pose.action ? 0.25 : 0.32);
      sc.updateMatrixWorld(true);
      /* the body only: skip hidden parts and effect meshes, like the actor's own height fit */
      const box = new T.Box3(); a.root.traverse((n) => { if (!n.isMesh) return; for (let p = n; p; p = p.parent) if (!p.visible || p.userData?.isEffect) return; const b = new T.Box3().setFromObject(n); if (!b.isEmpty()) box.union(b); });
      /* skinned models can be authored in other units, so their mesh box under-reports; the bones are in true world space */
      const bones = new T.Box3(), bp = new T.Vector3(); a.root.traverse((n) => { if (n.isBone) { n.getWorldPosition(bp); bones.expandByPoint(bp); } });
      if (!bones.isEmpty() && bones.max.y - bones.min.y > (box.max.y - box.min.y) * 1.2) { bones.max.y += (bones.max.y - bones.min.y) * 0.14; bones.min.y -= 0.01; box.copy(bones); box.expandByVector(new T.Vector3((bones.max.y - bones.min.y) * 0.18, 0, (bones.max.y - bones.min.y) * 0.18)); }
      const size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
      /* head and shoulders: aim at about the upper third of the body, wide models get a looser crop */
      const focusY = box.max.y - size.y * (pose.focus ?? 0.3) + (pose.lift || 0) * size.y;
      const half = Math.max(size.y * 0.36, Math.min(Math.max(size.x, size.z) * 0.5, size.y * 0.62)) / (pose.zoom || 1);
      const dist = half / Math.tan(T.MathUtils.degToRad(cam.fov / 2));
      const pitch = pose.pitch || 0;
      cam.position.set(ctr.x, focusY + Math.sin(pitch) * dist, ctr.z + Math.cos(pitch) * dist); cam.lookAt(ctr.x, focusY, ctr.z);
      r.render(sc, cam);
      return r.domElement.toDataURL('image/png');
    } finally { a.dispose(); }
  }
}

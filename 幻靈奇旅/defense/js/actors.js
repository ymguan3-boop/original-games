/* Spirit actors for the defense mode, built the same way as the cave's pets (survivors/js/scene.js):
   same models and clips, the same special effects (阿宏牛仔/藍金星輝法師, 官胖, 歐頭慢), and attacks planned by
   SpiritCombat.attackPlan + the model room's SpiritVfx scripts, so moves and ultimates look identical. */
import {modelHeight} from '../../survivors/js/actor-layout.js?v=20261107-a3';
import {modelRoomPlan, originalPresentation, createModelRoomEffect} from '../../survivors/js/model-room-effects.js?v=20261107-a3';
import {attackProfile} from '../../survivors/js/combat-profile.js?v=20261107-a3';

const BASE = new URL('../../', import.meta.url);
const scripts = new Map(), gltfs = new Map();

function script(path, globalName) {
  if (globalName && globalThis[globalName]) return Promise.resolve();
  if (!scripts.has(path)) scripts.set(path, new Promise((resolve, reject) => {
    const el = document.createElement('script'); el.src = new URL(path, BASE).href;
    el.onload = resolve; el.onerror = () => { scripts.delete(path); el.remove(); reject(Error('無法載入遊戲素材：' + path)); }; document.head.append(el);
  }));
  return scripts.get(path);
}

/* Just Three.js and its glTF loader: enough for the sea chart, so the chart does not wait for the battle scripts. */
export async function loadThree() {
  await script('vendor/three.min.js', 'THREE');
  if (!globalThis.THREE.GLTFLoader) await script('vendor/GLTFLoader.js');
  return globalThis.THREE;
}

/* Same engine scripts the cave loads before building its scene. */
export async function loadEngine() {
  await script('vendor/three.min.js', 'THREE');
  await script('js/outoman-v2-fx.js?v=20261027-outoman-fix2', 'createOutomanV2Fx');
  await Promise.all([script('js/arena-fx.js', 'SpiritVfx'), script('js/duo-combat-vfx.js', 'createDuoCombatVFX'), script('js/guanpang-combat-vfx.js', 'createGuanpangCombatVFX')]);
  if (!globalThis.THREE.GLTFLoader) await script('vendor/GLTFLoader.js');
  await script('js/spirit-combat.js', 'SpiritCombat');
  return globalThis.THREE;
}

export function loadGltf(path) {
  if (!gltfs.has(path)) gltfs.set(path, new Promise((resolve, reject) => new THREE.GLTFLoader().load(new URL(path + '?v=20261023-starspire-v1', BASE).href, resolve, undefined, () => { gltfs.delete(path); reject(Error('模型讀取失敗：' + path)); })));
  return gltfs.get(path);
}

export function cloneModel(source) {
  const result = source.clone(true), map = new Map();
  const pair = (a, b) => { map.set(a, b); a.children.forEach((c, i) => pair(c, b.children[i])); };
  pair(source, result);
  source.traverse((n) => { if (n.isSkinnedMesh) { const c = map.get(n); c.skeleton = n.skeleton.clone(); c.skeleton.bones = n.skeleton.bones.map((b) => map.get(b)); c.bind(c.skeleton, n.bindMatrix); } });
  return result;
}

export async function nativeAsset(path) {
  const prefix = path.split('://')[0]; let api;
  if (prefix === 'native') { await script('js/fx/toon-outline.js');await script('models/native/birds-blueprint.js'); await script('models/native/elephants-blueprint.js'); await script('models/native/families.js', 'NativeFamilies'); return {g: NativeFamilies.build(path)}; }
  if (prefix === 'avian') { const id = path.split('://')[1], file = {jigglypuff: 'tricolor-egg', treecko: 'small-birds', grovyle: 'small-birds', sceptile: 'little-eagle', palkia: 'dapeng'}[id]; await script('models/native/' + file + '.js'); await script('models/native/avian-spirits.js', 'AvianSpirits'); api = AvianSpirits; }
  else if (['green-eye-bat', 'rabbit-evolution'].includes(prefix)) { await script('models/native/replacement-spirits.js', 'ReplacementSpirits'); api = ReplacementSpirits; }
  else if (prefix === 'robot-evolution') {
    await script('survivors/js/robot-evolution-v08.js?v=20261025-v20', 'CaveRobotEvolution'); await script('models/native/robot-spirits.js', 'RobotSpirits');
    const stage = {cyndaquil: 1, quilava: 2, typhlosion: 3}[path.split('://')[1]];
    return {g: {animations: [], create: () => { const c = CaveRobotEvolution.create({stage, inPlace: true}); c.root.userData.caveBounds = c.getState().bounds; return c; }}, api: RobotSpirits};
  }
  else if (prefix === 'leaf-frog') { await script('models/native/leaf-frogs.js'); await script('models/native/frog-spirits.js', 'FrogSpirits'); api = FrogSpirits; }
  if (api) { const g = api.load ? await api.load(path) : {create: () => api.create(path), animations: []}; return {g, api}; }
  if (prefix === 'crown') { await script('models/native/small-birds.js', 'SmallBirds'); await script('models/native/crown-birds.js', 'CrownBirds'); return {g: {animations: [], create: () => CrownBirds.create({kind: path.split('://')[1]})}}; }
  if (prefix === 'zhaocai') { await script('js/commerce-gate.js', 'PhantomCommerceGate'); return {g: {animations: [], create: () => PhantomCommerceGate.mascot(globalThis.THREE, Number(path.split('://')[1]) || 1)}}; }
  const defs = {'floral-deer': ['floral-deer', 'FloralDeer'], 'light-phoenix': ['light-phoenix', 'LightPhoenix'], riceball: ['riceball', 'RiceballSpirit'], xiaoshan: ['xiaoshan', 'XiaoshanSpirit']};
  const def = defs[prefix]; if (!def) throw Error('無支援的原生角色：' + path);
  await script('models/native/' + def[0] + '.js', def[1]);
  return {g: {animations: [], create: () => globalThis[def[1]].create({inPlace: true, stage: ['chikorita', 'bayleef', 'meganium'].indexOf(path.split('://')[1]) + 1})}};
}

/* Evolution overlay assets, as the cave passes them to playEvolutionSequence. */
export const evolutionAssets = {asset: async (path) => (path.includes('://') ? (await nativeAsset(path)).g : loadGltf(path)), cloneSkin: cloneModel};

const NATIVE_MOTIONS = {
  'floral-deer': {Attack: 'Pulse', Ultimate: 'Pulse', Hurt: 'Greet', Death: 'Rest'},
  'light-phoenix': {Attack: 'WingBurst', Ultimate: 'FeatherVolley', Run: 'Walk', Hurt: 'Idle'},
  riceball: {Attack: 'Wave', Ultimate: 'Wave', Run: 'Roll', Walk: 'Roll', Hurt: 'Stuck'},
  xiaoshan: {Attack: 'React', Ultimate: 'React', Hurt: 'Scared', Run: 'Walk'},
};

function normalize(object, height) {
  if (object.userData.caveBounds) { const b = object.userData.caveBounds, k = height / (b.max[1] - b.min[1]); object.scale.multiplyScalar(k); object.position.y -= b.min[1] * k; return; }
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  object.traverse((n) => { if (!n.isMesh) return; for (let p = n; p; p = p.parent) if (!p.visible || p.userData?.isEffect) return; const b = new THREE.Box3().setFromObject(n); if (!b.isEmpty()) box.union(b); });
  const h = box.max.y - box.min.y;
  if (!Number.isFinite(h) || h <= 0) throw Error('角色模型沒有有效尺寸');
  const s = height / h; object.scale.multiplyScalar(s); object.position.y -= box.min.y * s;
}

/* scale enlarges the cave height for the wide defense camera; effects use the same height so they scale too. */
export async function createActor(spec, entry, scale = 1) {
  const T = THREE, path = spec.model, id = spec.id, height = modelHeight(spec) * scale;
  const {g, api} = path.includes('://') ? await nativeAsset(path) : {g: await loadGltf(path)};
  const controller = g.create?.(), object = controller ? controller.root : cloneModel(g.scene), root = new T.Group();
  root.add(object);
  object.traverse((n) => { if (n.userData?.costume) n.visible = false; if (n.isMesh) { n.frustumCulled = false; n.castShadow = true; } });
  const mixer = new T.AnimationMixer(object), actions = {};
  (g.animations || []).forEach((c) => { actions[c.name.replace(/.*[|]/, '')] = mixer.clipAction(c); });
  const duoFx = /(ahong-cowboy|starlight-mage)\.glb$/.test(path) ? createDuoCombatVFX(T, root, object, path) : null;
  const guanpangFx = /guanpang\.glb$/.test(path) ? createGuanpangCombatVFX(T, root, object, g.animations || []) : null;
  normalize(object, height);
  const a = {root, object, mixer, actions, controller, api, path, id, duoFx, guanpangFx, height, mode: null, hold: 0, current: null, color: spec.color};
  a.outomanFx = id === 'pikachu' ? globalThis.createOutomanV2Fx(T, root, object, g.animations || []) : null;
  a.muzzle = object.getObjectByName(/typhlosion|cyndaquil/.test(id) ? 'RPalmSurface' : 'ChestBeamEmitter') || object.getObjectByName('mouth0') || object.getObjectByName('fxR');
  a.head = object.getObjectByName('Head') || object.getObjectByName('head');
  if (id === 'mewtwo' && a.head) { a.muzzle = new T.Object3D(); a.muzzle.position.set(0, 1.1, 1.55); a.head.add(a.muzzle); }
  if (id === 'pikachu') { const wrist = object.getObjectByName('wristL'); if (wrist) { a.muzzle = new T.Object3D(); a.muzzle.position.set(0, -0.15, 0.15); wrist.add(a.muzzle); } }
  a.play = (name, once = false, authored = false) => {
    let mapped = id === 'pikachu' && name === 'Hurt' ? 'Hit' : name;
    if (controller) {
      if (api) mapped = ['Attack', 'Ultimate'].includes(name) ? api.attack(path, name === 'Ultimate') : api.motion(path, name);
      else mapped = NATIVE_MOTIONS[path.split('://')[0]]?.[name] || name;
      if (a.mode !== mapped || once) { if (authored && once && a.mode === mapped) controller.setMode('Idle'); controller.setMode(mapped); a.mode = mapped; }
      return;
    }
    if (!authored && ['Attack', 'Ultimate'].includes(name)) mapped = entry?.skills?.[name === 'Ultimate' ? 1 : 0]?.animation || name;
    const key = Object.keys(actions).find((k) => k.toLowerCase() === mapped.toLowerCase())
      || (['Attack', 'Ultimate', 'Hurt', 'Death'].includes(name) ? ['React', 'Hurt', 'Idle'].find((k) => actions[k]) : ['Walk', 'Idle'].find((k) => actions[k]))
      || Object.keys(actions)[0];
    if (!key || (a.mode === key && !once)) return;
    const action = actions[key], old = authored ? null : a.current;
    if (authored) mixer.stopAllAction();
    a.current = action; a.mode = key;
    action.reset().setEffectiveTimeScale(1).setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once; action.play();
    if (old && old !== action) action.crossFadeFrom(old, 0.12, true);
  };
  /* Per frame, after the caller has placed root: animations, special effects and the model-room script. */
  a.tick = (dt, aim) => {
    a.hold = Math.max(0, a.hold - dt);
    mixer.update(dt); controller?.update?.(dt);
    if (a.outomanFx) { a.outomanFx.setTarget?.(aim); a.outomanFx.update(a.mode, a.current?.time || 0); }
    if (duoFx) { if (aim) duoFx.setTarget(new T.Vector3(aim.x, aim.y, aim.z)); duoFx.update(a.mode, a.current?.time || 0); }
    guanpangFx?.update(a.mode, a.current?.time || 0);
    a.roomFx?.update(dt);
  };
  a.point = (emitter = false) => {
    if (emitter && a.muzzle) { const v = new T.Vector3(); a.muzzle.getWorldPosition(v); return {x: v.x, y: v.y, z: v.z}; }
    return {x: a.root.position.x, y: a.root.position.y + a.height * 0.55, z: a.root.position.z};
  };
  a.dispose = () => {
    a.roomFx?.dispose(); a.outomanFx?.dispose?.(); duoFx?.dispose?.(); guanpangFx?.dispose?.();
    mixer.stopAllAction(); mixer.uncacheRoot(object); controller?.dispose?.();
    root.parent?.remove(root);
  };
  a.play('Idle');
  return a;
}

/* The cave's skill(): plan the move, play the clip and start the model-room effect.
   Returns {hold, release, originalPresentation} so the rules can land the hit on the release frame. */
export function performSkill(T, scene, a, spec, entry, strong, targetState) {
  const profile = attackProfile(spec, entry?.skills?.[strong ? 1 : 0] || {}, strong);
  if (strong && profile.support) {
    a.roomFx?.dispose(); a.roomFx = null; a.originalPresentation = false;
    a.play('Idle', true); a.hold = 1;
    return {hold: 1, release: 0.35, originalPresentation: false, support: true};
  }
  const animationStrong = a.id === 'swampert' ? !strong : strong;
  const configured = entry?.skills?.[animationStrong ? 1 : 0] || {};
  const plan = modelRoomPlan(a, globalThis.SpiritCombat.attackPlan(spec, {...a, controller: a.controller}, spec.skills?.[animationStrong ? 1 : 0] || {cost: animationStrong ? 3 : 1}, configured), animationStrong);
  if (/robot-evolution/.test(a.path) && globalThis.RobotSpirits) {
    const first = RobotSpirits.stage(a.path) === 1;
    plan.duration = first ? (strong ? 3 : 1.65) : (strong ? 4.2 : 3.1);
    plan.releaseFraction = (first ? (strong ? 1.15 : 0.55) : (strong ? 1.35 : 0.7)) / plan.duration;
  }
  a.originalPresentation = originalPresentation(a, plan);
  a.roomFx?.dispose();
  a.play(plan.mode || (animationStrong ? 'Ultimate' : 'Attack'), true, plan.authored);
  a.roomFx = createModelRoomEffect(T, scene, a, animationStrong, targetState, {});
  a.hold = Math.max(0.55, a.roomFx?.total || plan.duration || 0);
  if (plan.playbackRate && a.current) a.current.setEffectiveTimeScale(plan.playbackRate);
  const release = Math.min(a.hold * 0.85, Math.max(0.15, a.hold * (plan.procedural ? 0.4 : plan.releaseFraction || 0.48)));
  return {hold: a.hold, release, originalPresentation: a.originalPresentation};
}

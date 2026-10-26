// Smooth, reusable Three.js battle effects. No images, sprites or point particles.
// The owner advances this view once per scene frame; gameplay remains in world.js.
export function jumpUltimateHeight(state, time) {
  const jump = state?.jumpUltimate;
  if (!jump || state.hp <= 0 || !Number.isFinite(time) || time < jump.start || time >= jump.land) return 0;
  const duration = jump.land - jump.start;
  return duration > 0 ? Math.sin(Math.PI * Math.max(0, Math.min(1, (time - jump.start) / duration))) * 5 : 0;
}
export function createCombatVfx(T, scene, { metrics = {}, onShake = () => {} } = {}) {
  const root = new T.Group(); root.name = 'cave-metal-combat-v17'; scene.add(root);
  const LIMIT = 64, MESH_LIMIT = 640, records = [], free = new Map(), materials = new Map();
  const up = new T.Vector3(0, 1, 0), direction = new T.Vector3();
  const colors = { '光': 0xffd56b, '焰': 0xff7438, '森': 0x5bffa9, '潮': 0x34cfff, '雷': 0xffec42, '念': 0xc780ff };
  let clock = 0, allocated = 0, disposed = false;
  const armorViews = new Map();
  const geometries = {
    sphere: new T.SphereGeometry(1, 24, 16),
    box:new T.BoxGeometry(1,1,1),
    beam: new T.CylinderGeometry(1, 1, 1, 24, 1),
    lance: new T.ConeGeometry(1, 1, 24, 1),
    ring: new T.TorusGeometry(1, .035, 8, 80),
    wideRing: new T.TorusGeometry(1, .065, 10, 80),
    arc: arcGeometry(Math.PI * 1.1, .72),
    sweep: arcGeometry(Math.PI * 1.62, .84),
    slash: arcGeometry(Math.PI * .52, .42),
    sword: swordGeometry(),
  };
  function swordGeometry() {
    const shape = new T.Shape();
    shape.moveTo(-.22, -1.35); shape.lineTo(-.32, .85); shape.lineTo(0, 1.6); shape.lineTo(.32, .85); shape.lineTo(.22, -1.35); shape.closePath();
    return new T.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .055, bevelThickness: .035 });
  }
  function arcGeometry(angle, inner) {
    const positions = [], normals = [], indices = [], steps = 64;
    for (let i = 0; i <= steps; i++) {
      const a = -angle / 2 + angle * i / steps;
      for (const r of [inner, 1]) { positions.push(Math.sin(a) * r, 0, Math.cos(a) * r); normals.push(0, 1, 0); }
      if (i < steps) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3)); g.setIndex(indices); g.computeBoundingSphere(); return g;
  }
  function material(color, glow = false, unlit = false) {
    const key = color + ':' + Number(glow)+':'+Number(unlit);
    if (!materials.has(key)) {
      const m = unlit ? new T.MeshBasicMaterial({color,transparent:true,opacity:.88,depthWrite:false,toneMapped:false,fog:false}):glow ? new T.MeshBasicMaterial({ color, transparent: true, opacity: .19, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })
        : new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .52, metalness: .88, roughness: .19, side: T.DoubleSide });
      materials.set(key, m);
    }
    return materials.get(key);
  }
  function mesh(type, color, glow = false, unlit = false) {
    const key = type + ':' + color + ':' + Number(glow)+':'+Number(unlit), pool = free.get(key);
    let m = pool?.pop();
    if (!m) {
      if (allocated >= MESH_LIMIT) return null;
      m = new T.Mesh(geometries[type], material(color, glow,unlit)); m.userData.combatPoolKey = key; allocated++;
    }
    m.visible = true; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); return m;
  }
  function release(e) {
    for (const p of e.parts) { const m = p.mesh; e.group.remove(m); m.visible = false; const key = m.userData.combatPoolKey; if (!free.has(key)) free.set(key, []); free.get(key).push(m); }
    root.remove(e.group); e.parts.length = 0;
  }
  function create(kind, ev, duration, point = pointOf(ev)) {
    if (disposed) return null;
    while (records.length >= LIMIT) release(records.shift());
    const e = { kind, group: new T.Group(), parts: [], start: clock, duration, heading: headingOf(ev), range: Math.max(.4, finite(ev.range, 3)), strong: !!(ev.strong || ev.ultimate), ev };
    e.group.position.set(point.x, point.y || 0, point.z); root.add(e.group); records.push(e);
    metrics.combatVfxEvents = (metrics.combatVfxEvents || 0) + 1; return e;
  }
  function part(e, type, color, config = {}) {
    if (!e) return null;
    const m = mesh(type, color, !!config.glow,!!config.unlit); if (!m) return null;
    e.group.add(m); const p = { mesh: m, ...config }; e.parts.push(p); return p;
  }
  function finite(n, fallback = 0) { return Number.isFinite(n) ? n : fallback; }
  function pointOf(ev = {}) { const p = ev.from || (typeof ev.actor === 'object' && ev.actor) || (typeof ev.sourceActor === 'object' && ev.sourceActor) || ev; return { x: finite(p.x), y: finite(p.y), z: finite(p.z) }; }
  function targetOf(ev, fallback = pointOf(ev)) { const p = ev.to || ev.target || fallback; return { x: finite(p.x, fallback.x), y: finite(p.y, .9), z: finite(p.z, fallback.z) }; }
  function headingOf(ev) { if (Number.isFinite(ev.heading)) return ev.heading; const a = pointOf(ev), b = ev.to || (typeof ev.target === 'object' && ev.target); return b ? Math.atan2(b.x - a.x, b.z - a.z) : finite(ev.actor?.heading); }
  function weaponOf(ev) { const w = ev.weapon ?? ev.kind; if (typeof w === 'number') return ['sword', 'knife', 'blades', 'guns'][w] || 'sword'; return ['sword', 'knife', 'blades', 'guns'].includes(w) ? w : 'sword'; }
  function colorOf(ev) { return ev.color ?? colors[ev.element] ?? 0x65e7ff; }
  function ring(e, color, radius, delay = 0, height = .12, glow = false, thick = false) { return part(e, thick ? 'wideRing' : 'ring', color, { mode: 'ring', radius, delay, height, glow }); }
  function slash(e, color, radius, angle, delay = 0, type = 'arc', lift = .7) { return part(e, type, color, { mode: 'slash', radius, angle, delay, lift }); }
  function beam(e, color, from, to, radius, delay = 0, glow = false) { return part(e, 'beam', color, { mode: 'beam', from, to, radius, delay, glow }); }
  function star(e, color, radius, delay = 0, axis = 0) { return part(e, 'sphere', color, { mode: 'star', radius, delay, axis }); }
  function shake(amount, ev) { metrics.combatVfxShake = amount; metrics.combatVfxQuakes = (metrics.combatVfxQuakes || 0) + 1; onShake(amount, ev); }

  function heroNormal(ev = {}) {if(ev.swordWave){metrics.lastHeroMetalFx={kind:'knife',range:ev.range,renderer:'three-metal',trail:'sword-wave'};return;}if(weaponOf(ev)==='guns'){metrics.lastHeroMetalFx={kind:'guns',range:ev.range,renderer:'three-metal',trail:'dots'};return;}
    const kind = weaponOf(ev), e = create('hero-' + kind, ev, kind === 'guns' ? .25 : .34); if (!e) return;
    e.group.rotation.y = e.heading; const r = e.range = finite(ev.range, { blades: 2.1, knife: 3.1, sword: 4.3, guns: 12.9 }[kind]);
    if (kind === 'blades') {
      slash(e, 0x44f8ff, r, -.8, 0, 'sweep', .7); slash(e, 0xcbfbff, r * .9, Math.PI - .8, .055, 'sweep', 1.02);
      ring(e, 0x34dfff, r, 0, .13, true);
    } else if (kind === 'knife') {
      slash(e, 0xe4d1ff, r, -.25, 0, 'slash', .8);
      beam(e, 0xcb91ff, { x: 0, y: .8, z: .35 }, { x: 0, y: .85, z: r }, .08);
      beam(e, 0xffffff, { x: 0, y: .8, z: .35 }, { x: 0, y: .85, z: r }, .025);
    } else if (kind === 'guns') {
      for (const side of [-1, 1]) {
        beam(e, 0xffbf4a, { x: side * .27, y: .92, z: .35 }, { x: side * .16, y: .92, z: r }, .075, side > 0 ? .035 : 0);
        beam(e, 0xffffe7, { x: side * .27, y: .92, z: .35 }, { x: side * .16, y: .92, z: r }, .024, side > 0 ? .035 : 0);
      }
    } else {
      slash(e, 0xffcf53, r, -.7, 0, 'arc', .8); slash(e, 0xfff2b5, r * .98, -.64, .03, 'arc', .84);
      slash(e, 0xff982a, r * 1.05, -.7, 0, 'sweep', .75);
    }
    metrics.lastHeroMetalFx = { kind, range: r, renderer: 'three-metal' };
  }
  function heroBlink(ev = {}) {for(const point of [ev.from,ev.to]){if(!point)continue;const e=create('blink',ev,.38,point);if(!e)continue;ring(e,0xff813e,1.2,0,.1,true);ring(e,0xffddb0,.8,.02,.18);star(e,0xffbd68,.8,.02,1);}metrics.lastBlink={from:ev.from,to:ev.to,renderer:'three-metal'};}
  function heroStart(ev = {}) {
    const kind = weaponOf(ev), e = create('charge', ev, .65); if (!e) return;
    e.group.rotation.y = e.heading;
    const color = { sword: 0xffc84e, knife: 0xc882ff, blades: 0x36edff, guns: 0xffaf42 }[kind];
    ring(e, color, 2.5, 0, .1, false, true); ring(e, color, 3.2, .07, .13, true);
    ring(e, 0xffffff, 1.4, .08, .22); star(e, color, .8, .05, 1);
    metrics.lastHeroCharge = { kind, renderer: 'three-metal' };
  }
  function heroStrike(ev = {}) {if(ev.swordWave){metrics.lastHeroUltimateFx={kind:'knife',final:!!ev.final,renderer:'three-metal',trail:'sword-wave'};return;}if(weaponOf(ev)==='guns'){metrics.lastHeroUltimateFx={kind:'guns',final:!!ev.final,renderer:'three-metal',trail:'dense-dots'};return;}
    const kind = weaponOf(ev), isGlobal = !!ev.global || kind === 'sword', final = !!ev.final, e = create('ultimate-' + kind, ev, final ? .95 : .62); if (!e) return;
    e.group.rotation.y = e.heading;
    const r = Math.max(1, finite(ev.range, kind === 'guns' ? 15 : kind === 'blades' ? 4 : 6));
    if (kind === 'sword') {
      const radius = isGlobal ? Math.max(36, finite(ev.arenaRange, 68)) : r;
      ring(e, 0xffc03e, radius, 0, .14, false, true); ring(e, 0xffecaf, radius * .78, .075, .25);
      ring(e, 0xffaa26, radius, .04, .2, true);
      for (let i = 0; i < 4; i++) slash(e, i % 2 ? 0xfff6cc : 0xffba41, 7 + i * 1.7, e.heading + i * Math.PI / 2, i * .025, 'arc', .6 + i * .22);
      if (final) { for (let i = 0; i < 3; i++) ring(e, 0xffe294, radius * (1 - i * .15), i * .1, .08, false, true); shake(.9, ev); }
    } else if (kind === 'knife') {
      const end = { x: 0, y: .9, z: r };
      beam(e, 0xc37bff, { x: 0, y: .9, z: 0 }, end, .28); beam(e, 0xfff0ff, { x: 0, y: .9, z: 0 }, end, .095);
      slash(e, 0xe0b2ff, r, -.5, 0, 'slash', .8); slash(e, 0xffffff, r * .85, .5, .065, 'slash', 1);
      star(e, 0xd8adff, 1.2, .1, 0); if (final) shake(.38, ev);
    } else if (kind === 'blades') {
      for (let i = 0; i < 4; i++) { slash(e, i % 2 ? 0xcfffff : 0x20dbff, r, i * Math.PI / 2, i * .045, 'sweep', .45 + i * .27); }
      ring(e, 0x42efff, r, .04, .12); ring(e, 0x42efff, r * 1.1, .08, .18, true); if (final) shake(.3, ev);
    } else {
      for (const side of [-1, 1]) { const from = { x: side * .38, y: .95, z: 0 }, to = { x: side * .16, y: .95, z: r };
        beam(e, 0xff9e32, from, to, final ? .34 : .2); beam(e, 0xffffc4, from, to, final ? .11 : .065);
        beam(e, 0xffbd5c, from, to, final ? .65 : .4, 0, true);
      }
      for (let i = 0; i < 3; i++) ring(e, 0xffce6a, 1.2 + i * .35, i * .035, .15 + i * .07);
      if (final) shake(.3, ev);
    }
    metrics.lastHeroUltimateFx = { kind, global: isGlobal, final, renderer: 'three-metal' };
  }
  function nativeSpirit(ev={}){
    const dragon=ev.speciesId==='mewtwo',strong=!!ev.strong,from=pointOf(ev),to=targetOf(ev),e=create('native-spirit',ev,dragon?(strong?2.3:.65):.8,from);if(!e)return;
    const end={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},colors=dragon?[0xc8f8ff,0x38baff,0x77e9ff]:strong?[0xff3b46,0xffa236,0xfff35a,0x55ff8a,0x44dfff,0x527cff,0xc879ff]:[0xffffff];
    const dx=end.x,dz=end.z,len=Math.hypot(dx,dz)||1,side={x:dz/len,z:-dx/len};
    if(dragon&&!strong){part(e,'sphere',0x66e5ff,{mode:'water-ball',end});ring(e,0xc5f8ff,1,0,.05,true);}
    else colors.forEach((color,i)=>{const spread=dragon?(i-1)*.09:(i-3)*.17,offset={x:side.x*spread,y:0,z:side.z*spread};beam(e,color,offset,{x:end.x+offset.x,y:end.y,z:end.z+offset.z},dragon?(i===0?.29:.4):.075);});
    metrics.lastNativeSpiritFx={speciesId:ev.speciesId,strong,from,to,colors,renderer:'three-metal',authored:true};
  }
  function healBurst(ev){const e=create('heal-burst',{...ev,from:undefined,actor:undefined,sourceActor:undefined},1.4,ev.hero);if(!e)return;
    ring(e,0x7effc1,2.4,0,.12,false,true);ring(e,0xebfff7,1.9,.12,.32,true);
    for(let i=0;i<3;i++)for(const horizontal of [false,true])part(e,'box',i?0xc9ffea:0x48ffad,{mode:'heal-cross',unlit:true,cross:i,horizontal,delay:i*.12});
    beam(e,0x7fffc3,{x:0,y:.15,z:0},{x:0,y:3.1,z:0},.38,0,true);metrics.healBursts=(metrics.healBursts||0)+1;metrics.lastHealBurst={amount:ev.instantHeal,hero:ev.hero,follow:true,duration:1.4};
  }
  function spellRelease(ev = {}) {
    if(ev.instantHeal>0){healBurst(ev);if(!ev.statusWave&&!ev.shield)return;}
    if(ev.kind==='support'){const color=({burn:0xff6838,poison:0x94f85f,slow:0x72baff,paralysis:0xffdf55,freeze:0xa4efff})[ev.statusWave]||(ev.shield?0x8edbff:ev.shieldBreak?0xffd274:0x83ffc5),point=ev.support||ev.shieldBreak?ev.hero:ev;const e=create('support',ev,.9,point||ev);if(!e)return;ring(e,color,ev.statusWave?68:2.2,0,.15,false,true);ring(e,color,ev.statusWave?58:1.65,.06,.35);if(ev.support||ev.shieldBreak)star(e,ev.shieldBreak?0xffd274:color,1.2,.04,1);metrics.lastSupportFx={status:ev.statusWave,shield:ev.shield,shieldBreak:!!ev.shieldBreak,renderer:'three-metal'};return;}
    const color = colorOf(ev), strong = !!(ev.strong || ev.ultimate), id = ev.speciesId, global = !!ev.global || (id === 'infernape' && strong);
    const waterDragon = id === 'mewtwo', blast = ev.kind === 'blast', origin = blast ? targetOf(ev, pointOf(ev)) : pointOf(ev);
    const e = create('spell', ev, strong ? .85 : .44, origin); if (!e) return;
    e.group.rotation.y = e.heading; const r = Math.max(1, finite(ev.range, strong ? 4.5 : 2.1));
    const area = global || waterDragon || ['area', 'blast', 'self', 'cone'].includes(ev.kind);
    if (ev.armor) { ring(e, 0xffd058, 2.4, 0, .2, false, true); star(e, 0xfff2b0, .9, .06, 1); }
    if (global) {
      ring(e, 0xffd366, 68, 0, .16, false, true); ring(e, 0xfff1b3, 58, .09, .2);
      ring(e, 0xffae38, 68, .03, .12, true); if (ev.final) shake(id === 'wigglytuff' ? 1.05 : .85, ev);
      if (id === 'wigglytuff') { for (let i = 0; i < 3; i++) ring(e, i % 2 ? 0xfff2d4 : 0xffa76a, 68 - i * 9, .04 + i * .1, .1 + i * .08, false, true); }
    } else if (id === 'swampert' && !strong) {
      const radius = Math.max(2.4, r);
      part(e, 'sword', 0x751c13, { mode: 'moltenblade', radius });
      part(e, 'sword', 0xff9a31, { mode: 'moltenblade', radius, core: true });
      slash(e, 0xff481f, radius, -.6, 0, 'sweep', .75); slash(e, 0xffdb72, radius * .93, -.5, .04, 'arc', .84);
      ring(e, 0xff6a27, radius, .02, .12, true);
    } else if (waterDragon) {
      for (let i = 0; i < (strong ? 4 : 2); i++) {
        ring(e, i % 2 ? 0xe0fbff : 0x1fc5ff, r * (1 - i * .12), i * .06, .18 + i * .25, false, strong);
        slash(e, 0x60e6ff, r * (1 - i * .08), i * Math.PI / 2, i * .06, 'sweep', .65 + i * .23);
      }
      ring(e, 0x36cfff, r * 1.12, 0, .15, true); if (strong && ev.final) shake(.42, ev);
    } else if (area) {
      ring(e, color, r, 0, .15, false, strong); ring(e, color, r * 1.08, .04, .13, true);
      slash(e, color, r, -.4, 0, ev.kind === 'cone' ? 'arc' : 'sweep', .65);
      if (strong) { slash(e, 0xeefaff, r * .85, Math.PI - .4, .09, 'sweep', .9); ring(e, color, r * .78, .13, .5); }
    } else {
      // A visible muzzle halo complements the independently tracked projectile.
      ring(e, color, strong ? 1.35 : .65, 0, .12); star(e, color, strong ? .65 : .32, 0, 0);
      if (strong) { ring(e, color, 1.8, .06, .2, true); slash(e, color, 1.65, -.6, .02, 'arc', .95); }
    }
    if (ev.from && ev.to && !blast && !global && !ev.armor) {
      // World endpoints are converted into this effect's local coordinates.
      const p = pointOf(ev), q = targetOf(ev), dx = q.x - p.x, dz = q.z - p.z, c = Math.cos(e.heading), s = Math.sin(e.heading);
      const end = { x: c * dx - s * dz, y: q.y - p.y, z: s * dx + c * dz };
      beam(e, color, { x: 0, y: .95, z: 0 }, end, strong ? .18 : .07); beam(e, 0xeefcff, { x: 0, y: .95, z: 0 }, end, strong ? .06 : .025);
    }
    metrics.lastPetMetalFx = { speciesId: id, element: ev.element, strong, global, area, armor: !!ev.armor, moltenSword: id === 'swampert' && !strong, x: origin.x, z: origin.z, renderer: 'three-metal' };
  }
  function syncActors(states = [], worldTime = 0) {
    if (disposed) return;
    const active = new Set();for(const e of records)if(e.kind==='heal-burst'&&states[0]?.hp>0)e.group.position.set(states[0].x,0,states[0].z);
    for (const state of states) {
      if (!(state?.armorUntil > worldTime) || !(state.hp > 0)) continue;
      active.add(state); let e = armorViews.get(state);
      if (!e || !records.includes(e)) {
        e = create('armor', { actor: state, range: 2.2 }, 3600); if (!e) continue; armorViews.set(state, e);
        part(e, 'sphere', 0xffc94e, { mode: 'shield', radius: 1.45, glow: true });
        for (let i = 0; i < 3; i++) part(e, 'wideRing', i === 1 ? 0xfff3c2 : 0xffc44a, { mode: 'armor-ring', radius: 1.55, axis: i });
      }
      e.group.position.set(finite(state.x), 0, finite(state.z));
    }
    for (const [state, e] of armorViews) if (!active.has(state)) { const i = records.indexOf(e); if (i >= 0) { release(e); records.splice(i, 1); } armorViews.delete(state); }
    metrics.armorViews = armorViews.size;
  }
  function impact(ev = {}) {
    const strong = !!(ev.strong || ev.ultimate), color = ev.critical ? 0xffb331 : colorOf(ev);
    const point = ev.to || ev.target || ev, e = create('impact', { ...ev, from: undefined, actor: undefined, sourceActor: undefined }, strong ? .52 : .27, { x: finite(point.x), y: 0, z: finite(point.z) }); if (!e) return;
    const r = strong ? 1.5 : ev.critical ? .95 : .48;
    ring(e, color, r, 0, .17, false, strong); star(e, color, r * .62, 0, 0); star(e, 0xfff7e2, r * .5, .015, 1);
    if (strong) { ring(e, color, r * 1.4, .045, .2, true); slash(e, color, r, -.4, .02, 'arc', .9); slash(e, 0xf4fcff, r * .8, Math.PI - .4, .06, 'arc', 1.1); }
    if (ev.final && ev.global) shake(.85, ev);
    metrics.lastMetalImpact = { x: finite(point.x), z: finite(point.z), strong, critical: !!ev.critical, renderer: 'three-metal' };
  }
  function render(e, t, age) {
    const fade = Math.max(.001, 1 - t * t), grow = 1 - (1 - t) ** 3;
    for (const p of e.parts) {
      const m = p.mesh, delay = p.delay || 0, local = (age - delay) / Math.max(.08, e.duration - delay);
      m.visible = local >= 0 && local < 1; if (!m.visible) continue;
      const q = Math.min(1, Math.max(0, local)), f = Math.max(.001, 1 - q * q);
      if(p.mode==='heal-cross'){const angle=p.cross*2.1;const radius=p.cross?.55:0;m.position.set(Math.cos(angle)*radius,1.5+q*.9+p.cross*.22,Math.sin(angle)*radius+.25);const size=(p.cross?1:1.8)*(.85+.15*Math.sin(q*Math.PI))*f;m.scale.set((p.horizontal?.9:.17)*size,(p.horizontal?.17:.9)*size,.16*size);}
      else if(p.mode==='water-ball'){const u=Math.min(1,q*1.8);m.position.set(p.end.x*u,p.end.y*u,p.end.z*u);m.scale.setScalar(.55*Math.sin(q*Math.PI));}
      else if (p.mode === 'ring') {
        const radius = p.radius * (.12 + .88 * (1 - (1 - q) ** 3)); m.position.y = p.height + Math.sin(q * Math.PI) * .08;
        m.rotation.x = -Math.PI / 2; m.scale.set(radius, radius, Math.max(.12, f));
      } else if (p.mode === 'slash') {
        const r = p.radius * (.9 + q * .1); m.position.y = p.lift + Math.sin(q * Math.PI) * .12;
        m.rotation.y = p.angle + (q - .5) * 1.5; m.scale.set(r, Math.max(.08, f), r * (.8 + .2 * f));
        // Collapse the crescent smoothly after its bright impact frame.
        if (q > .72) m.scale.multiplyScalar(Math.max(.01, (1 - q) / .28));
      } else if (p.mode === 'beam') {
        const a = p.from, b = p.to; direction.set(b.x - a.x, b.y - a.y, b.z - a.z); const len = direction.length();
        if (len < .001) { m.visible = false; continue; }
        direction.multiplyScalar(1 / len); m.quaternion.setFromUnitVectors(up, direction);
        const travel = Math.min(1, q * 7), length = len * travel;
        m.position.set(a.x + direction.x * length / 2, a.y + direction.y * length / 2, a.z + direction.z * length / 2);
        const width = p.radius * f; m.scale.set(width, length, width);
      } else if (p.mode === 'moltenblade') {
        const swing = -.95 + q * 2.1, size = Math.max(.7, p.radius * .26);
        m.position.set(Math.sin(swing) * p.radius * .4, 1.2, Math.cos(swing) * p.radius * .4);
        m.rotation.set(-.2, swing, -.85 + q * 1.7); m.scale.set(size * (p.core ? .32 : 1), size, size * (p.core ? 1.1 : 1));
        if (q > .76) m.scale.multiplyScalar(Math.max(.01, (1 - q) / .24));
      } else if (p.mode === 'shield') {
        const pulse = 1 + Math.sin(age * 4) * .035; m.position.y = 1.1; m.scale.set(p.radius * pulse, p.radius * 1.1 * pulse, p.radius * pulse);
      } else if (p.mode === 'armor-ring') {
        m.position.y = 1.1; m.rotation.set(Math.PI / 2 + Math.sin(age * .8 + p.axis) * .25, age * .35 + p.axis * Math.PI / 3, p.axis * Math.PI / 3); m.scale.setScalar(p.radius);
      } else if (p.mode === 'star') {
        m.position.y = .95; m.rotation.y = e.heading + q * Math.PI * .6; m.rotation.z = p.axis ? Math.PI / 3 : -Math.PI / 4;
        const r = p.radius * Math.sin(q * Math.PI) + .002; m.scale.set(r * (p.axis ? .2 : 1.25), r * (p.axis ? 1.6 : .2), r * .23);
      }
    }
    // Keep data available for browser QA without modifying scene time or game state.
    e.group.userData.phase = t; e.group.userData.fade = fade; e.group.userData.grow = grow;
  }
  function update(dt = 0) {
    if (disposed) return; clock += Math.max(0, finite(dt));
    let visible = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      const e = records[i], age = clock - e.start;
      if (age >= e.duration) { release(e); records.splice(i, 1); continue; }
      render(e, age / e.duration, age); visible += e.parts.length;
    }
    metrics.combatVfx = { renderer: 'three-metal', time: clock, effects: records.length, meshes: visible, allocated, limit: MESH_LIMIT, images: 0 };
  }
  function clear() { for (const e of records) release(e); records.length = 0; armorViews.clear(); metrics.armorViews = 0; metrics.combatVfx = { renderer: 'three-metal', time: clock, effects: 0, meshes: 0, allocated, limit: MESH_LIMIT, images: 0 }; }
  function dispose() { if (disposed) return; clear(); disposed = true; scene.remove(root); for (const g of Object.values(geometries)) g.dispose(); for (const m of materials.values()) m.dispose(); free.clear(); materials.clear(); }
  return { heroNormal, heroBlink, heroStart, heroStrike, spellRelease, nativeSpirit, impact, syncActors, update, clear, dispose };
}

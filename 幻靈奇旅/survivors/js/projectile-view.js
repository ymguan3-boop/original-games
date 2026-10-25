// Smooth instanced metal cores keep every projectile visible without allocating per shot.
export function createProjectileView(T, scene, { actorPoint, targetPoint, metrics = {} }) {
  const group = new T.Group(); group.name = 'cave-metal-projectiles'; scene.add(group);
  const sphere = new T.SphereGeometry(1, 24, 16), cylinder = new T.CylinderGeometry(1, 1, 1, 24, 1);
  const crescent = new T.TorusGeometry(1,.09,8,32,Math.PI*1.35);
  const up = new T.Vector3(0, 1, 0), start = new T.Vector3(), end = new T.Vector3(), dir = new T.Vector3(), dummy = new T.Object3D();
  const records = new Map(), flashes = [], CAPACITY = 512, FLASH_LIMIT = 64;
  const colors = { '光': 0xffe5a1, '焰': 0xff853e, '森': 0x6fe5a0, '潮': 0x58caff, '雷': 0xffdc43, '念': 0xc091ff };
  let disposed = false;
  const pools = [cylinder, cylinder, sphere, sphere, sphere, crescent].map((geo, i) => {
    const mat = i === 4
      ? new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .14, depthWrite: false, blending: T.AdditiveBlending })
      : new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: i % 2 ? .85 : .62, metalness: .88, roughness: .18,
        transparent: i % 2 === 0, opacity: i % 2 === 0 ? .62 : 1, depthWrite: i % 2 !== 0 });
    // Instance colors affect diffuse color; use that same color for continuous emission.
    if (i !== 4) mat.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= diffuseColor.rgb;');
    };
    const mesh = new T.InstancedMesh(geo, mat, CAPACITY); mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    // Three r128 allocates instanceColor from mesh.count on its first setColorAt.
    // Allocate while count is CAPACITY; setting count=0 first produces a zero-length buffer.
    mesh.frustumCulled = false; mesh.setColorAt(0, new T.Color(0xffffff)); mesh.count = 0; group.add(mesh); return mesh;
  });
  const tint = new T.Color(); let counts = [0, 0, 0, 0, 0, 0];
  function put(i, x, y, z, r, length, color, isBeam = false, heading = 0) {
    const n = counts[i]; if (n >= CAPACITY) return; counts[i]++;
    dummy.position.set(x, y, z); dummy.scale.set(r, isBeam ? length : r, r);
    if (isBeam) dummy.quaternion.setFromUnitVectors(up, dir); else dummy.quaternion.identity();
    if(i===5){dummy.rotation.set(-Math.PI/5,heading,-Math.PI*.15);dummy.scale.set(r,r*1.25,r);}
    dummy.updateMatrix(); pools[i].setMatrixAt(n, dummy.matrix); pools[i].setColorAt(n, tint.setHex(color));
  }
  function draw(p, from, to, fade = 1) {
    const color = p.color ?? colors[p.element] ?? 0x87e8ff;
    if(p.fx==='sword-wave'){const heading=Math.atan2(p.vx||0,p.vz||1),size=(p.context?.strong?.95:.65)*fade;put(5,to.x,to.y,to.z,size,0,0xff9b36,false,heading);put(2,to.x,to.y,to.z,.1*fade,0,0xffe6ac);metrics.swordWave={mode:'piercing-crescent',strong:!!p.context?.strong,origin:sourceOf(p),tip:{...to}};
    } else if(p.sourceActor==='hero'&&p.piercing){
      start.set(from.x,from.y,from.z);end.set(to.x,to.y,to.z);dir.copy(end).sub(start);const len=dir.length();if(len<.001)return;dir.normalize();const spacing=p.context?.strong?.13:.35,n=Math.min(72,Math.max(1,Math.ceil(len/spacing))),radius=(p.context?.strong?.075:.055)*fade;for(let j=0;j<=n;j++){const d=Math.min(len,j*spacing);put(2,start.x+dir.x*d,start.y+dir.y*d,start.z+dir.z*d,radius,0,0x6fe7ff);}metrics.gunTrail={mode:'dots',dense:!!p.context?.strong,spacing,origin:sourceOf(p),dots:n+1};metrics.gunTrails||={};metrics.gunTrails[p.context?.strong?'ultimate':'normal']={...metrics.gunTrail};
    } else if (p.fx === 'beam' || p.piercing) {
      start.set(from.x, from.y, from.z); end.set(to.x, to.y, to.z); dir.copy(end).sub(start);
      const length = dir.length(); if (length < .01) return; dir.multiplyScalar(1 / length); start.add(end).multiplyScalar(.5);
      const r = (p.context?.strong ? .14 : .07) * fade;
      put(0, start.x, start.y, start.z, r, length, color, true);
      put(1, start.x, start.y, start.z, r * .34, length, 0xf3fcff, true);
    } else {
      const floral = ['chikorita', 'bayleef', 'meganium'].includes(p.speciesId), r = (p.context?.strong ? (floral ? .42 : .34) : (floral ? .24 : .18)) * fade;
      put(4, to.x, to.y, to.z, r * 1.65, 0, color);
      put(2, to.x, to.y, to.z, r, 0, color); put(3, to.x, to.y, to.z, r * .4, 0, 0xf1ffff);
      const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz) || 1;
      for (let i = 1; i <= 2; i++) put(4, to.x - dx / len * i * r * .8, to.y, to.z - dz / len * i * r * .8, r * (1.1 - i * .25), 0, color);
    }
  }
  function sourceOf(p) {
    const a = actorPoint(p.sourceActor), origin = p.origin || {};
    return { x: Number.isFinite(origin.x) ? origin.x : (a?.x ?? p.x), y: Number.isFinite(origin.y) ? origin.y : (a?.y ?? .95), z: Number.isFinite(origin.z) ? origin.z : (a?.z ?? p.z) };
  }
  function pierceTrail(p, tip, length = p.context?.strong ? 4.5 : 3.2) {
    const origin = sourceOf(p), dx = Number.isFinite(p.vx) ? p.vx : tip.x - origin.x, dz = Number.isFinite(p.vz) ? p.vz : tip.z - origin.z;
    const magnitude = Math.hypot(dx, dz) || 1, travelled = Number.isFinite(p.travelled) ? p.travelled : Math.hypot(tip.x - origin.x, tip.z - origin.z);
    const distance = Math.min(length, Math.max(0, travelled));
    return { x: tip.x - dx / magnitude * distance, y: tip.y, z: tip.z - dz / magnitude * distance };
  }
  function impact(p, target) {
    if (disposed) return;
    const rec = records.get(p.id), resolved = targetPoint(target?.id || p.targetActor || p.target, target);
    const to = resolved || (target && Number.isFinite(target.x) && Number.isFinite(target.z) ? { x: target.x, y: target.y ?? .95, z: target.z } : null);
    if (to) {
      const from = p.piercing ? pierceTrail(p, to, 1.4) : rec?.from || sourceOf(p);
      if (flashes.length >= FLASH_LIMIT) flashes.shift();
      flashes.push({ p: { ...p }, from: { ...from }, to: { ...to }, life: p.context?.strong ? .26 : .17, duration: p.context?.strong ? .26 : .17 });
      metrics.lastProjectileEndpoint = { id: p.id, target: target?.id || p.targetActor || p.target, point: { ...to }, fx: p.piercing ? 'piercing' : p.fx };
      metrics.projectileFlashes = (metrics.projectileFlashes || 0) + 1;
    }
    // A piercing projectile can strike several targets while its front keeps travelling.
    if (!p.piercing) records.delete(p.id);
  }
  function update(projectiles, dt) {
    if (disposed) return; counts = [0, 0, 0, 0, 0, 0]; const seen = new Set();
    for (const p of projectiles || []) {
      seen.add(p.id); let rec = records.get(p.id);
      if (p.piercing) {
        if (!rec) { rec = { from: sourceOf(p), piercing: true }; records.set(p.id, rec); }
        const point = { x: p.x, y: Number.isFinite(p.y) ? p.y : rec.from.y, z: p.z }, from = pierceTrail(p, point);
        draw(p, from, point);
        metrics.lastProjectileVisual = { id: p.id, target: p.targetActor || p.target, speciesId: p.speciesId, source: p.context?.source, strong: !!p.context?.strong, point, from, goal: null, fx: 'piercing', travelled: p.travelled, range: p.range };
      } else {
        const to = targetPoint(p.targetActor || p.target); if (!to) continue;
        if (!rec) { const from = sourceOf(p); rec = { from: { ...from }, distance: Math.max(.01, Math.hypot(to.x - p.x, to.z - p.z)) }; records.set(p.id, rec); }
        if (p.fx === 'beam') rec.from = actorPoint(p.sourceActor) || rec.from;
        const u = Math.min(1, 1 - Math.hypot(to.x - p.x, to.z - p.z) / rec.distance);
        const point = { x: p.x, y: rec.from.y + (to.y - rec.from.y) * Math.max(0, u), z: p.z };
        draw(p, rec.from, point);
        metrics.lastProjectileVisual = { id: p.id, target: p.targetActor || p.target, speciesId: p.speciesId, source: p.context?.source, strong: !!p.context?.strong, point, goal: to, fx: p.fx };
      }
      metrics.projectileSpecies ||= {}; if (p.speciesId) metrics.projectileSpecies[p.speciesId] = (metrics.projectileSpecies[p.speciesId] || 0) + 1;
    }
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; draw(f.p, f.from, f.to, Math.max(.02, f.life / f.duration)); f.life -= Math.max(0, dt || 0); if (f.life <= 0) flashes.splice(i, 1); }
    for (const [id] of records) if (!seen.has(id)) records.delete(id);
    pools.forEach((p, i) => { p.count = counts[i]; p.instanceMatrix.needsUpdate = true; if (p.instanceColor) p.instanceColor.needsUpdate = true; });
    metrics.projectileViews = records.size; metrics.projectileMeshes = counts.reduce((n, c) => n + c, 0);
    metrics.projectileRenderer = 'three-metal-instanced'; metrics.projectileFlashViews = flashes.length;
  }
  function clear() { records.clear(); flashes.length = 0; pools.forEach(p => p.count = 0); metrics.projectileViews = 0; metrics.projectileMeshes = 0; }
  function dispose() { if (disposed) return; clear(); disposed = true; sphere.dispose(); cylinder.dispose(); crescent.dispose(); pools.forEach(p => p.material.dispose()); scene.remove(group); }
  return { update, impact, clear, dispose };
}

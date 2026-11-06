/* Cartoon look for 幻靈守護戰: stepped (toon) shading and dark outlines, applied to the existing spirit models and
   to every prop, without remaking any model. Outlines are inverted hulls; skinned and morphing meshes keep animating. */

/* Local hull thickness for a wanted world thickness. Expression parts (mouth and eye shapes, effect sockets) rest at a
   0.0001 scale until an animation swaps them in: dividing by that would give a hull 10,000 times too thick, a dark sheet
   that covers the screen for the frames the part is shown. Those hiding scales are left out of the sum. */
export const HIDDEN_SCALE = 0.02;
export function outlineThickness(mesh, worldThickness) {
  let scale = 1;
  for (let o = mesh; o; o = o.parent) { const k = (Math.abs(o.scale.x) + Math.abs(o.scale.y) + Math.abs(o.scale.z)) / 3; if (k >= HIDDEN_SCALE) scale *= k; }
  return worldThickness / Math.max(1e-3, scale);
}

export function createToonKit(THREE) {
  /* three light bands: shadow, mid, lit */
  const tones = new Uint8Array([110, 190, 255]);
  const gradientMap = new THREE.DataTexture(tones, tones.length, 1, THREE.LuminanceFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter; gradientMap.generateMipmaps = false; gradientMap.needsUpdate = true;
  const linear = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const solid = new Map(), converted = new Map(), sharedMaterials = new WeakSet();
  const INK = linear(0x3a2414);

  /* a flat-colour toon material for props */
  function toon(hex, extra = {}) {
    const key = hex + JSON.stringify(extra);
    if (!solid.has(key)) { const material = new THREE.MeshToonMaterial({color: linear(hex), gradientMap, ...extra}); solid.set(key, material); sharedMaterials.add(material); }
    return solid.get(key);
  }

  /* convert a lit model material to toon, keeping its texture, colour and skinning */
  function toToon(m, mesh) {
    if (!m || m.isMeshToonMaterial || m.isMeshBasicMaterial || m.isShaderMaterial || m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.9)) return m;
    const key = m.uuid + (mesh.isSkinnedMesh ? 's' : '') + (mesh.morphTargetInfluences ? 'm' : '');
    if (!converted.has(key)) {
      const t = new THREE.MeshToonMaterial({
        color: m.color ? m.color.clone() : new THREE.Color(1, 1, 1), map: m.map || null, gradientMap,
        emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0, 0, 0), emissiveMap: m.emissiveMap || null, emissiveIntensity: m.emissiveIntensity ?? 1,
        transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, vertexColors: m.vertexColors,
        skinning: !!mesh.isSkinnedMesh, morphTargets: !!mesh.morphTargetInfluences,
      });
      t.name = (m.name || '') + '-toon';
      converted.set(key, t); sharedMaterials.add(t);
    }
    return converted.get(key);
  }

  /* inverted-hull outline: the mesh's own geometry pushed out along its normals, drawn back-face in ink colour */
  function outlineMaterial(mesh, worldThickness) {
    const thickness = outlineThickness(mesh, worldThickness);
    const mat = new THREE.MeshBasicMaterial({color: INK, side: THREE.BackSide, skinning: !!mesh.isSkinnedMesh, morphTargets: !!mesh.morphTargetInfluences});
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.outlineThickness = {value: thickness};
      shader.vertexShader = 'uniform float outlineThickness;\n' + shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normalize( normal ) * outlineThickness;');
    };
    mat.customProgramCacheKey = () => 'outline-' + thickness.toFixed(4) + (mesh.isSkinnedMesh ? 's' : '') + (mesh.morphTargetInfluences ? 'm' : '');
    return mat;
  }

  /* hull material for geometry baked into world space (batch.js): the thickness is simply the world thickness */
  const baked = new Map();
  function bakedOutline(t) {
    if (baked.has(t)) return baked.get(t);
    const mat = new THREE.MeshBasicMaterial({color: INK, side: THREE.BackSide});
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.outlineThickness = {value: t};
      shader.vertexShader = 'uniform float outlineThickness;\n' + shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normalize( normal ) * outlineThickness;');
    };
    mat.customProgramCacheKey = () => 'outline-baked-' + t;
    sharedMaterials.add(mat); baked.set(t, mat);
    return mat;
  }

  function addOutline(mesh, worldThickness) {
    if (!mesh.geometry?.attributes?.normal) return;
    const mat = outlineMaterial(mesh, worldThickness);
    let line;
    if (mesh.isSkinnedMesh) { line = new THREE.SkinnedMesh(mesh.geometry, mat); line.bind(mesh.skeleton, mesh.bindMatrix); line.bindMode = mesh.bindMode; }
    else line = new THREE.Mesh(mesh.geometry, mat);
    if (mesh.morphTargetInfluences) { line.morphTargetInfluences = mesh.morphTargetInfluences; line.morphTargetDictionary = mesh.morphTargetDictionary; }
    line.userData.isOutline = true; line.userData.outlineWorld = worldThickness; line.frustumCulled = false; line.castShadow = false; line.renderOrder = -1;
    mesh.add(line);
  }

  /* Toon-shade every lit mesh under root and give it an outline. Effect meshes (additive / see-through) are left alone. */
  function toonify(root, {outline = 0.04, shadows = true} = {}) {
    root.updateMatrixWorld(true);
    const meshes = [];
    root.traverse((n) => { if (n.isMesh && !n.userData.isOutline && !n.userData.toonOutlined && !n.userData.isEffect && n.visible !== false) meshes.push(n); });
    for (const n of meshes) {
      const before = n.material;
      n.material = Array.isArray(before) ? before.map((m) => toToon(m, n)) : toToon(before, n);
      const lit = Array.isArray(n.material) ? n.material.some((m) => m.isMeshToonMaterial) : n.material?.isMeshToonMaterial;
      if (!lit) continue;
      if (shadows) n.castShadow = true;
      if (outline > 0) addOutline(n, outline);
    }
    return root;
  }

  return {toon, toonify, bakedOutline, gradientMap, linear, isSharedMaterial: (m) => sharedMaterials.has(m)};
}

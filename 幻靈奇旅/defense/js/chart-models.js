/* The sea chart's models, loaded straight from GLB files (defense/models/*.glb, baked by tools/bake-chart-models.mjs from
   js/islands3d.js and js/harbor.js): ten islands, the town pier and the speedboat. Nothing is built with code at run time except
   the boss cards, the two painted-texture props (star plate, rainbow plaza), the boatman and the rider (the hero model). */
import {createIslandProps} from './island-props.js?v=20261104-islands-v1';
import {createCardMaker} from './island-cards.js?v=20261105-glb-v1';

export function createChartModels(THREE, kit, {loadGltf, cloneModel}) {
  const T = THREE, ink = new T.Color(0x3a2414).convertSRGBToLinear();
  const animated = [], P = createIslandProps(T, kit, Math.random, animated), cards = createCardMaker(T, kit);
  const TOP = 0.43;

  /* GLB materials are plain colours: give them the game's three-band toon shading back */
  function toToon(root) {
    root.traverse((n) => {
      if (!n.isMesh) return;
      const m = n.material;
      if (n.userData.isOutline) { n.material = new T.MeshBasicMaterial({color: ink}); n.castShadow = false; n.renderOrder = -1; return; }
      if (n.userData.isEffect) { m.depthWrite = false; n.renderOrder = 2; return; }
      n.material = new T.MeshToonMaterial({color: m.color, emissive: m.emissive, gradientMap: kit.gradientMap, transparent: m.transparent, opacity: m.opacity, side: m.side, alphaTest: m.alphaTest});
      if (m.transparent) n.material.depthWrite = false;
    });
    return root;
  }
  const model = async (file) => toToon(cloneModel((await loadGltf('defense/models/' + file)).scene));
  const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };

  /* props whose texture is painted on a canvas are not in the GLB: the game adds them */
  const PAINTED = {
    observatory: () => [[P.magicCircle(2.3), 0, TOP + 0.15, 0.15, 0.42]],
    tower: () => [[P.plaza(3.6), -0.1, TOP, -0.25, 0.4]],
  };
  return {
    animated,
    async island(scene, card) {
      const g = await model('island-' + scene + '.glb');
      for (const [o, x, y, z, k] of PAINTED[scene]?.() || []) { o.scale.multiplyScalar(k); g.add(at(o, x, y, z)); }
      if (card) g.add(await cards.bossCard(card, TOP));
      return g;
    },
    async dock() { return model('dock.glb'); },
    async boat() { return model('speedboat.glb'); },
  };
}

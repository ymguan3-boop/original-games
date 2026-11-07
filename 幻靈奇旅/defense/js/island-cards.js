/* The boss dex card that stands on each island of the sea chart: drawn like css/collection-card.css (frame image hue-shifted
   for purple / red, art window, name, number, type line and stats) on a canvas, then put on a card that turns toward the viewer. */
import {createImageCache} from './asset-stream.js?v=20261107-a3';
export function createCardMaker(THREE, kit) {
  const T = THREE, {toon} = kit;
  const loadImage = createImageCache();
  const FRAME_FILTER = {red: 'hue-rotate(315deg) saturate(2.3) brightness(.98)', purple: 'hue-rotate(245deg) saturate(1.8) brightness(1.09)', yellow: 'none'};
  const FRAME_BG = {red: ['#ffdfdc', '#b52635'], purple: ['#f3e3ff', '#b380db'], yellow: ['#fff6dc', '#e8c46a']};
  async function cardTexture(card) {
    const c = document.createElement('canvas'), W = 300, H = 420; c.width = W; c.height = H; const g = c.getContext('2d');
    const [art, frame] = await Promise.all([loadImage(card.art), loadImage(card.frameImage)]);
    const bg = g.createLinearGradient(0, 0, W, H), [b0, b1] = FRAME_BG[card.frame] || FRAME_BG.yellow; bg.addColorStop(0, b0); bg.addColorStop(1, b1); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (art) { const x = W * 0.1, y = H * 0.09, w = W * 0.8, h = H * 0.6, s = Math.max(w / art.width, h / art.height); g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 18) : g.rect(x, y, w, h); g.clip(); g.drawImage(art, x + (w - art.width * s) / 2, y + (h - art.height * s) / 2, art.width * s, art.height * s); g.restore(); }
    if (frame) { g.filter = FRAME_FILTER[card.frame] || 'none'; g.drawImage(frame, 0, 0, W, H); g.filter = 'none'; }
    g.textAlign = 'center'; g.fillStyle = '#2d2433'; g.font = 'bold 22px "Microsoft JhengHei",sans-serif'; g.fillText(card.name, W / 2, H * 0.075);
    g.font = '13px "Microsoft JhengHei",sans-serif'; g.fillStyle = '#6b5a74'; g.fillText('No.' + card.number, W / 2, H * 0.715);
    g.fillStyle = '#62516d'; g.font = '14px "Microsoft JhengHei",sans-serif'; g.fillText(card.info, W / 2, H * 0.79);
    g.fillStyle = '#382e3f'; g.font = 'bold 16px "Microsoft JhengHei",sans-serif'; g.fillText('HP ' + card.hp + '　攻擊 ' + card.attack, W / 2, H * 0.84);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  /* the card stands slanted in the island's front-right corner, its foot pushed into the grass */
  async function bossCard(card, y) {
    const tex = await cardTexture(card), g = new T.Group(), w = 1.38, h = 1.93;
    const face = new T.MeshBasicMaterial({map: tex}), back = toon(0xe8d6a6);
    const cardMesh = new T.Mesh(new T.BoxGeometry(w, h, 0.03), [back, back, back, back, face, back]); g.add(cardMesh);
    const edge = new T.Mesh(new T.BoxGeometry(w + 0.07, h + 0.07, 0.015), new T.MeshBasicMaterial({color: 0x3b2412})); edge.position.z = -0.012; g.add(edge);
    const pivot = new T.Group(); pivot.userData.billboard = true; g.rotation.x = -0.5; pivot.add(g);
    pivot.position.set(1.15, y + h * 0.5, 1.0);
    return pivot;
  }

  return {bossCard};
}

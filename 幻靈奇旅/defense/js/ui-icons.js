/* One icon style for the whole 幻靈守護戰 interface: simple warm-brown line icons (like the town's music / sound / help / full-screen
   buttons) instead of colourful emoji. Every emoji that appears anywhere in the page (static markup, templates, toasts, data
   tables such as weather and trap cards) is swapped for its line icon by skin(); initIcons() runs it on the whole page once and
   keeps watching for new text, so new screens need no extra work. Icons draw with currentColor, so a button's text colour sets them. */
const I = {
  coin: '<circle cx="12" cy="12" r="9" fill="#ffd45a"/><circle cx="12" cy="12" r="4.2"/>',
  gacha: '<rect x="5" y="3" width="14" height="11" rx="5.5"/><rect x="7.5" y="14" width="9" height="7" rx="1.5"/><circle cx="12" cy="8.5" r="2"/>',
  cards: '<rect x="3.5" y="6.5" width="11" height="14" rx="2" transform="rotate(-9 9 13.5)"/><rect x="9.5" y="3.5" width="11" height="14" rx="2" transform="rotate(8 15 10.5)"/>',
  book: '<path d="M12 6.5C9.8 5 6.8 4.6 4 5v13c2.8-.4 5.8 0 8 1.5 2.2-1.5 5.2-1.9 8-1.5V5c-2.8-.4-5.8 0-8 1.5z"/><path d="M12 6.5v13"/>',
  boat: '<path d="M12 3v11"/><path d="M12 4.5l7 8.5h-7"/><path d="M4 16h16l-3 4.5H7z"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8.5 11h7M5 14a7 7 0 0 0 14 0"/>',
  camera: '<rect x="3" y="7" width="13" height="10" rx="2.5"/><path d="M16 11l5-3v8l-5-3z"/>',
  bag: '<path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/><rect x="5" y="8" width="14" height="13" rx="3.5"/><path d="M9 14h6"/>',
  swords: '<path d="M4 4l13 13M20 4L7 17M14 18.5l3-3M10 18.5l-3-3"/>',
  shield: '<path d="M12 3l8 3v6c0 4.800-3.600 7.800-8 9-4.400-1.200-8-4.200-8-9V6z"/>',
  bow: '<path d="M6 3c9 2 15 9 15 18"/><path d="M6 3l15 18"/>',
  orb: '<circle cx="12" cy="10.5" r="7"/><path d="M7.500 20h9M9 8.500a3.500 3.500 0 0 1 3-2"/>',
  sparkle: '<path d="M12 3l2.200 6.300L20.500 11.500 14.200 13.700 12 20l-2.200-6.300L3.500 11.500 9.800 9.300z"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  battery: '<rect x="3" y="8" width="16" height="9" rx="2.500"/><path d="M21 11v3M7 12v1M11 12v1"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.500 4.500 0 0 1 8-2.500A4.500 4.500 0 0 1 20 9c0 6-8 11-8 11z"/>',
  refresh: '<path d="M20 8a8 8 0 0 0-14-2M4 3.500V8h4.500M4 16a8 8 0 0 0 14 2M20 20.500V16h-4.500"/>',
  mud: '<path d="M4.500 16c-.8-4.500 3-9 7.500-9s8.300 4.500 7.500 9c-1 3.200-14 3.200-15 0z"/>',
  whirl: '<path d="M12 12a1.800 1.800 0 1 1 1.800 1.800A3.800 3.800 0 1 1 10 8a5.800 5.800 0 1 1 5.800 5.800"/>',
  hexagram: '<path d="M12 3l8 14H4zM12 21L4 7h16z"/>',
  mushroom: '<path d="M4 12a8 7 0 0 1 16 0z"/><path d="M10 12v7h4v-7"/>',
  spikes: '<path d="M4 20l3-10 3 10M10 20l3-15 3 15M16 20l2-8 2 8M3 20h18"/>',
  geyser: '<path d="M12 3.500c2.200 3.300 3.200 4.600 3.200 6.500a3.200 3.200 0 0 1-6.400 0c0-1.900 1-3.200 3.200-6.500z"/><path d="M5 20.500h14M7 20.500V17h10v3.500"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M18.700 5.300l-2.100 2.100M7.400 16.600l-2.100 2.100"/>',
  cloudSun: '<circle cx="8" cy="8" r="3"/><path d="M8 2.500v1M2.500 8h1M4 4l.7.7M12 4l-.7.7"/><path d="M9 20a3.500 3.500 0 0 1 0-7 4.500 4.500 0 0 1 8.500-.5A3.500 3.500 0 0 1 17 20z"/>',
  rain: '<path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.500-1A4 4 0 0 1 17 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  sunset: '<path d="M3 19h18M6.500 19a5.500 5.500 0 0 1 11 0M12 6v3M5 11l2 2M19 11l-2 2"/>',
  moon: '<path d="M20 14.500A8 8 0 1 1 9.500 4a6.500 6.500 0 0 0 10.500 10.500z"/>',
  snow: '<path d="M12 3v18M4.500 7.500l15 9M19.500 7.500l-15 9"/>',
  storm: '<path d="M7 14a4 4 0 0 1 0-8 5 5 0 0 1 9.500-1A4 4 0 0 1 17 14z"/><path d="M12 14l-2 4h3l-1 4"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  save: '<path d="M5 3h12l3 3v15H5z"/><path d="M8 3v6h7V3M8 21v-7h8v7"/>',
  skip: '<path d="M5 5l9 7-9 7zM18 5v14"/>',
  play: '<path d="M7 4.500l12 7.500-12 7.500z"/>',
  pause: '<path d="M8.500 5v14M15.500 5v14"/>',
  timer: '<circle cx="12" cy="13.500" r="7.500"/><path d="M12 9.500v4l3 2M9.500 2.500h5"/>',
  burst: '<path d="M12 2l2 6 6-2-3 6 5 3-6 1 1 6-5-4-5 4 1-6-6-1 5-3-3-6 6 2z"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.500-2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  party: '<path d="M4 20l5-12 7 7z"/><path d="M14 4v2.500M19 8.500h2M17.500 12.500l2 1"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 3 1 3h6s0-2 1-3a6 6 0 0 0-4-10z"/>',
  island: '<path d="M3 19.500c3 1 6 1 9 0s6-1 9 0M12 17.500V9"/><path d="M12 9c-3-1.500-5-.5-6 1.500M12 9c3-1.500 5-.5 6 1.500M12 10c-1-3-3-4-5-4.500M12 10c1-3 3-4 5-4.500"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.500"/><path d="M3 9h18V6H3zM12 6v14M12 6C10 3 7 3 7 5s3 1 5 1zM12 6c2-3 5-3 5-1s-3 1-5 1z"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 6 5 6 5 9s-5 3-5 9M17 3c0 6-5 6-5 9s5 3 5 9"/>',
  path: '<path d="M8.500 3L5 21M15.500 3L19 21M7 9h10M6 15h12"/>',
  trap: '<path d="M3 18h18M5 18a7 7 0 0 1 14 0M9 10.500l-2-4.500M15 10.500l2-4.500"/>',
  flag: '<path d="M6 21V4M6 4h11l-2.500 4L17 12H6"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  music: '<path d="M9 18V6.500l10-2.500v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/>',
  speaker: '<path d="M4 9.500v5h3.500L12.500 19V5L7.500 9.500z"/><path d="M15.500 9.500a3.500 3.500 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
  mute: '<path d="M4 9.500v5h3.500L12.500 19V5L7.500 9.500z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  home: '<path d="M4 11l8-7 8 7M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  restore: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
};
const EMOJI = {
  '🎟️': 'coin', '🎟': 'coin', '🎰': 'gacha', '🃏': 'cards', '🎴': 'cards', '📖': 'book', '⛵': 'boat', '🚤': 'boat', '⚓': 'anchor', '🎥': 'camera', '🎒': 'bag',
  '⚔️': 'swords', '⚔': 'swords', '🛡️': 'shield', '🛡': 'shield', '🏹': 'bow', '🔮': 'orb', '✨': 'sparkle', '⚡': 'bolt', '🔋': 'battery', '🧪': 'flask',
  '💖': 'heart', '❤️': 'heart', '❤': 'heart', '🔄': 'refresh', '🟤': 'mud', '🌀': 'whirl', '🔯': 'hexagram', '🍄': 'mushroom', '📍': 'spikes', '⛲': 'geyser',
  '☀️': 'sun', '☀': 'sun', '🌦️': 'rain', '🌧️': 'rain', '🌇': 'sunset', '🌤️': 'cloudSun', '🌤': 'cloudSun', '🌙': 'moon', '❄️': 'snow', '❄': 'snow', '⛈️': 'storm',
  '🗺️': 'map', '🗺': 'map', '💾': 'save', '⏭️': 'skip', '⏭': 'skip', '▶️': 'play', '▶': 'play', '❚❚': 'pause', '⏱️': 'timer', '⏱': 'timer', '💥': 'burst',
  '🔓': 'unlock', '🔒': 'lock', '🎉': 'party', '💡': 'bulb', '🏝️': 'island', '🏝': 'island', '🎁': 'gift', '⏳': 'hourglass', '🛤️': 'path', '🛤': 'path',
  '🪤': 'trap', '🚩': 'flag', '⛶': 'fullscreen', '🗗': 'restore',
};
const RE = new RegExp(Object.keys(EMOJI).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

export const ico = (name) => '<x-ico class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + (I[name] || I.sparkle) + '</svg></x-ico>';
/* the emoji of a string as icon markup (for strings that are written with innerHTML) */
export const iconize = (text) => String(text).replace(RE, (m) => ico(EMOJI[m]));

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'TITLE', 'OPTION', 'NOSCRIPT']);
function skinText(node) {
  const text = node.nodeValue; if (!text || !RE.test(text)) { RE.lastIndex = 0; return; } RE.lastIndex = 0;
  const parent = node.parentNode; if (!parent || SKIP.has(parent.nodeName) || parent.closest?.('.ico')) return;
  const frag = document.createDocumentFragment(); let last = 0, m;
  while ((m = RE.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    const span = document.createElement('span'); span.innerHTML = ico(EMOJI[m[0]]); frag.append(span.firstChild); last = m.index + m[0].length;
  }
  RE.lastIndex = 0;
  if (last < text.length) frag.append(text.slice(last));
  parent.replaceChild(frag, node);
}
export function skin(root) {
  if (!root) return;
  if (root.nodeType === 3) return skinText(root);
  if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.classList?.contains('ico')) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: (n) => (n.parentNode && (SKIP.has(n.parentNode.nodeName) || n.parentNode.closest?.('.ico')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)}), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) skinText(n);
}
export function initIcons() {
  skin(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') skinText(m.target);
      else for (const n of m.addedNodes) skin(n);
    }
  }).observe(document.body, {childList: true, subtree: true, characterData: true});
}

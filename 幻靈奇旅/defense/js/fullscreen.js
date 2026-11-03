/* The "全畫面" buttons (top right of the chart and of the battle HUD). Uses the Fullscreen API (also the webkit-prefixed
   one); on browsers without it (iPhone Safari) the page fills the visible viewport instead (html.pseudo-fs) and
   scrolls the address bar away. Every button with class .fs-toggle is wired and kept in sync. */
const root = document.documentElement;
const request = root.requestFullscreen || root.webkitRequestFullscreen;
const exit = document.exitFullscreen || document.webkitExitFullscreen;
const current = () => document.fullscreenElement || document.webkitFullscreenElement || null;
export const nativeFullscreen = () => !!(request && exit);
export const isFullscreen = () => !!current() || root.classList.contains('pseudo-fs');

function sync() {
  const on = isFullscreen();
  document.querySelectorAll('.fs-toggle').forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? '還原視窗' : '全畫面';
    b.setAttribute('aria-label', b.title);
    const label = b.querySelector('span');
    if (label) label.textContent = on ? '還原' : '全畫面';
    const icon = b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild : null;
    if (icon) icon.nodeValue = on ? '🗗' : '⛶';
    else if (!label) b.textContent = on ? '🗗' : '⛶';
  });
  /* layout depends on the viewport size; let the 3D view and HUD re-measure */
  dispatchEvent(new Event('resize'));
}

export async function toggleFullscreen() {
  if (isFullscreen()) {
    root.classList.remove('pseudo-fs');
    if (current()) await Promise.resolve(exit.call(document)).catch(() => {});
  } else if (nativeFullscreen()) {
    try { await Promise.resolve(request.call(root, {navigationUI: 'hide'})); }
    catch { root.classList.add('pseudo-fs'); }
  } else {
    root.classList.add('pseudo-fs');
    setTimeout(() => scrollTo(0, 1), 50);
  }
  sync();
}

export function initFullscreen() {
  document.querySelectorAll('.fs-toggle').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); toggleFullscreen(); }; });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('pseudo-fs')) toggleFullscreen(); });
  sync();
}

/* Hold the weapon button or V to select equipment; a short press cycles classes. */
(() => {
  const api = () => window.TowerControlAPI;
  let timer = null, pointer = null, control = null, long = false, vHeld = false;
  const stop = () => { clearTimeout(timer); timer = null; };
  function reset() {
    stop();
    const oldPointer = pointer, oldControl = control;
    pointer = control = null; vHeld = false; long = false;
    if (oldControl?.hasPointerCapture?.(oldPointer)) oldControl.releasePointerCapture(oldPointer);
  }
  function start() {
    stop(); long = false;
    timer = setTimeout(() => { timer = null; long = true; api()?.openWeaponMenu(); }, 450);
  }
  addEventListener('pointerdown', e => {
    const target = e.target.closest?.('#mobileAttack');
    if (!target || e.button !== 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (pointer !== null || vHeld || !api()?.canInteract()) return;
    pointer = e.pointerId; control = target;
    target.setPointerCapture?.(pointer); start();
  }, { capture: true });
  addEventListener('pointerup', e => {
    if (e.pointerId !== pointer) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const cycle = !long && api()?.canInteract();
    reset(); if (cycle) api()?.cycle();
  }, { capture: true });
  for (const name of ['pointercancel', 'lostpointercapture']) addEventListener(name, e => {
    if (e.pointerId === pointer) reset();
  }, { capture: true });
  addEventListener('click', e => {
    if (!e.target.closest?.('#mobileAttack')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.detail === 0) api()?.openWeaponMenu();
  }, true);
  addEventListener('keydown', e => {
    if (api()?.menuOpen) {
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); api().closeWeaponMenu(); return; }
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault(); e.stopImmediatePropagation();
        const buttons = [...document.querySelectorAll('.weapon-quick-list button')];
        const index = buttons.indexOf(document.activeElement), delta = ['ArrowUp', 'ArrowLeft'].includes(e.code) ? -1 : 1;
        buttons[(index + delta + buttons.length) % buttons.length]?.focus(); return;
      }
    }
    if (e.code === 'KeyV' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat && !vHeld && pointer === null && api()?.canInteract()) { vHeld = true; start(); }
    }
  }, true);
  addEventListener('keyup', e => {
    if (e.code !== 'KeyV') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const cycle = vHeld && !long && api()?.canInteract();
    reset(); if (cycle) api()?.cycle();
  }, true);
  addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  // Native dialogs interrupt pointer/key gestures; no hold may survive opening one.
  new MutationObserver(() => { if (document.getElementById('panel')?.open) reset(); })
    .observe(document.getElementById('panel'), { attributes: true, attributeFilter: ['open'] });
})();

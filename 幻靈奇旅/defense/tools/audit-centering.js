/* Paste into the browser console (or run through the preview) to list visible buttons, ribbons and pills whose text/icon content
   sits off-centre. Usage: auditCentering() -> [{where, text, dx, dy}] */
window.auditCentering = function auditCentering(tol = 3) {
  const sel = 'button:not(.item):not(.collectionThumb):not(.hand-card):not(.stage-btn):not(.isle-tag), .ribbon span, .stat, .points-badge, .isle-tag, .ci-tag, .weather-pill, .cleared-tag, .boss-class, .banner, .toast.show, .sheet-title, .result-title';
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || getComputedStyle(el).visibility === 'hidden' || el.closest('[hidden]')) continue;
    const range = document.createRange(); range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0); if (!rects.length) continue;
    const left = Math.min(...rects.map((q) => q.left)), right = Math.max(...rects.map((q) => q.right)), top = Math.min(...rects.map((q) => q.top)), bottom = Math.max(...rects.map((q) => q.bottom));
    const cs = getComputedStyle(el);
    const bl = r.left + parseFloat(cs.borderLeftWidth), br = r.right - parseFloat(cs.borderRightWidth), bt = r.top + parseFloat(cs.borderTopWidth), bb = r.bottom - parseFloat(cs.borderBottomWidth);
    const dx = (left + right) / 2 - (bl + br) / 2, dy = (top + bottom) / 2 - (bt + bb) / 2;
    const multiline = (bottom - top) > parseFloat(cs.lineHeight || 20) * 1.6, overflows = left < bl - 2 || right > br + 2 || top < bt - 3 || bottom > bb + 3;
    if (Math.abs(dx) > tol || (!multiline && Math.abs(dy) > tol) || overflows) out.push({el: (el.id ? '#' + el.id : el.className.toString().slice(0, 30) || el.tagName), text: el.textContent.trim().slice(0, 14), dx: +dx.toFixed(1), dy: +dy.toFixed(1), overflow: overflows});
  }
  return out;
};

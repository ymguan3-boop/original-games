// Shared by the town and its standalone games on the same site.
(function (host) {
  'use strict';
  if (host.FirstlightTutorials) return;
  const key = 'firstlight-tutorials-skipped-v1';
  const eventName = 'firstlight:tutorials-skipped';
  let skipped = false;
  function isSkipped() {
    if (!skipped) {
      try { skipped = host.localStorage.getItem(key) === '1'; } catch {}
    }
    return skipped;
  }
  function notify() {
    skipped = true;
    host.dispatchEvent(new Event(eventName));
  }
  function skip() {
    try { host.localStorage.setItem(key, '1'); } catch {}
    if (!skipped) notify();
  }
  host.addEventListener('storage', e => {
    if (e.key === key && e.newValue === '1' && !skipped) notify();
  });
  host.FirstlightTutorials = Object.freeze({isSkipped, skip});
})(window);

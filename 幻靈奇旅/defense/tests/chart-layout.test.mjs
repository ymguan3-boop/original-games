import test from 'node:test';
import assert from 'node:assert/strict';
import {SPOTS, MOBILE_SPOTS} from '../js/islands.js';

/* Stage ordering must stay aligned with STAGES; the ferry must never skip an island. */
test('desktop and portrait maps contain ten reachable stages in the same order', () => {
  for (const spots of [SPOTS, MOBILE_SPOTS]) {
    assert.equal(spots.length, 10);
    assert.equal(new Set(spots.map((p) => p.join(','))).size, 10);
    for (const p of spots) {
      assert.equal(p.length, 2);
      assert.ok(p.every(Number.isFinite));
    }
  }
});

test('portrait islands form a continuous serpentine ferry route from the bottom dock', () => {
  assert.ok(MOBILE_SPOTS[0][1] > MOBILE_SPOTS[9][1]);
  for (let i = 1; i < MOBILE_SPOTS.length; i++) {
    const [ax, ay] = MOBILE_SPOTS[i - 1];
    const [bx, by] = MOBILE_SPOTS[i];
    const distance = Math.hypot(ax - bx, ay - by);
    assert.ok(distance > 100 && distance < 300, `islands ${i} and ${i + 1} are too far apart`);
    assert.ok(by <= ay, 'the ferry proceeds steadily up the chart toward stage ten');
  }
});

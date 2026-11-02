import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

/* The entire diorama, not only the centre point, must fit within the portrait SVG. */
test('portrait chart bounds include islands and the harbor without overlay', () => {
  const chartWidth = 700, chartHeight = 890;
  for (const [x, y] of MOBILE_SPOTS) {
    assert.ok(x - 78 >= 0 && x + 78 <= chartWidth, 'island artwork cropped horizontally');
    assert.ok(y - 82 >= 0 && y + 70 <= chartHeight, 'island artwork or label cropped vertically');
  }
  const harbor = [80, 805];
  assert.ok(harbor[0] + 100 <= chartWidth);
  assert.ok(harbor[1] - 90 >= 0 && harbor[1] + 64 <= chartHeight);
});

test('portrait HUD reserves distinct map and button areas, with fixed-right items and contained stars', () => {
  const css = readFileSync(new URL('../css/defense.css', import.meta.url), 'utf8');
  assert.match(css, /grid-template-rows:auto minmax\(0,1fr\) auto/);
  assert.match(css, /#lobby \.sea-wrap \{[\s\S]*?grid-row:2/);
  assert.match(css, /#lobby \.isle-panel \{[\s\S]*?grid-row:3/);
  assert.match(css, /#hud \.hud-bottom \{[\s\S]*?grid-template-columns:minmax\(0,1fr\) 86px/);
  assert.match(css, /#hud \.item-wrap \{[\s\S]*?grid-column:2/);
  assert.match(css, /#hud \.hand-card \.stars \{[\s\S]*?top:3px/);
});

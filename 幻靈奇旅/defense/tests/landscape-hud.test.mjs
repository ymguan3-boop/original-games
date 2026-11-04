import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../css/defense.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('landscape hand uses screen-height cap and preserves collectible 5:7 aspect ratio', () => {
  assert.match(css, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*600px\)/);
  assert.match(css, /#hud \.hand-card\s*\{[\s\S]*?width:\s*min\(80px, 17dvh/);
  assert.match(css, /#hud \.hand-card\s*\{[\s\S]*?aspect-ratio:\s*5\s*\/\s*7/);
  assert.match(css, /#hud \.hud-bottom\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*54px/);
  assert.match(css, /#hud \.item-wrap\s*\{[\s\S]*?grid-column:\s*2/);
  assert.match(css, /max-height:\s*28dvh/);
});

test('six cards always fit common phone landscape screen sizes without covering the center', () => {
  // The CSS cap is min(80px,17dvh,16.6667dvw - 25px), reserving 150px for controls and safe areas.
  for(const [width,height,safe] of [[667,375,0],[740,360,0],[844,390,34],[915,412,0],[1024,600,0]]) {
    const cardWidth = Math.min(80,0.17*height,width/6-25);
    const totalWidth = 6*cardWidth+5*4;
    const cardHeight = cardWidth*7/5;
    assert.ok(totalWidth <= width-68-safe,`card row overflow at ${width}x${height}`);
    assert.ok(cardHeight <= .28*height,`card height too large at ${width}x${height}`);
  }
});

test('fusion and evolution no longer create flying yellow stars', () => {
  const burst = main.match(/const burstHtml\s*=\s*\(\)\s*=>[^;]+;/)?.[0] || '';
  assert.ok(burst.includes('fb-glow') && burst.includes('fb-ring'));
  assert.ok(!burst.includes('fb-star'), 'large yellow star must not be created');
  assert.ok(!burst.includes('<s '), 'star-shaped sparks must not be created');
  assert.ok(main.includes("'<i>★</i>'.repeat(c.rank)"), 'permanent rank stars stay on the card');
  assert.ok(!main.includes('evoOverlay(c.uid)'), 'evolution cutscene remains disabled; battle merge still works');
});

test('published HTML has updated CSS and JS versions to bypass cached old layout', () => {
  assert.match(html,/defense\.css\?v=20261104-v27/);
  assert.match(html,/main\.js\?v=20261104-v27/);
});

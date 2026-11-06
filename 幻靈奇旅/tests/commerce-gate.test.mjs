import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const game = src('js/game.js'), gate = src('js/commerce-gate.js'), hall = src('js/commerce-hall.js');

test('every answer to 招財 ends in the takeover, and he only leaves once the shop is really entered', () => {
  const lines = game.match(/const ZHAOCAI_LINES=\[[\s\S]*?\n\];/)[0];
  assert.ok((lines.match(/\n \['/g) || []).length >= 6);
  assert.match(game, /S\.state\.zhaocai=1;save\(\);closeDialog\(\);syncZhaocai\(\)/);
  assert.match(game, /function enterCommerce[^\n]*S\.state\.zhaocai=2;/);
  assert.match(game, /if\(st>=2\)g\.setPhase\('gone'\)/);
});

test('the gate opens only on approach, and the fence and gate block the way until then', () => {
  assert.match(gate, /want=near&&unlocked/);
  assert.match(gate, /open<\.7\)return true/);
  assert.match(hall, /gate\?\.blocked\(x,z,m\)/);
});

test('fence, gate and dog are outlined and merged so they stay cheap', () => {
  assert.match(gate, /ToonOutline\?\.add\(T,fence\)/);
  assert.match(gate, /ToonOutline\?\.add\(T,dog\.root\)/);
  assert.match(gate, /vertexColors:true/);
});

test('radar marks the cave, pier and commerce, and 回復藥 cleanses the whole party', () => {
  assert.match(game, /name:'山洞'/); assert.match(game, /name:'碼頭'/); assert.match(game, /name:'商會'/);
  assert.match(game, /p\.hp=Math\.min\(p\.s\.hp,p\.hp\+45\);cleanseAllies\(b\)/);
  assert.match(game, /NEGATIVE_STATUS=\['poison','burn','freeze','stun','defDown'\]/);
});

test('special-spirit broadcasts outrank traveller tips and never show together', () => {
  assert.match(game, /channel==='general'&&!guardian\.hidden\)\{pendingBroadcast=text;return;\}/);
  assert.match(game, /channel==='guardian'&&!general\.hidden/);
});

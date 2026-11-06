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

test('after the talk 招財 walks the player to the door and straight into the shop', () => {
  assert.match(game, /if\(zhaocaiEscort\)return stepZhaocaiEscort\(dt\)/);
  assert.match(game, /zhaocaiEscort=true;enterBusy=true/);
  assert.match(game, /enterBusy=false;document\.body\.classList\.remove\('zhaocai-escort'\);enterCommerce\(\)/);
  assert.match(gate, /setLeash\(v\)/);
});

test('a spirit auto-joined on capture still reads as joined', () => {
  assert.match(game, /team\.includes\(d\.add\)\)return toast\('已加入隊伍'\)/);
  assert.doesNotMatch(game, /這位夥伴已在隊伍中/);
});

test('toasts over a modal live on body, so the card cannot cover 隊伍已滿', () => {
  assert.match(game, /host=overModal\?document\.body:\$\('game'\)/);
  assert.match(game, /return toast\('隊伍已滿'\)/);
});

test('arena and fishing outlines stay on the outer silhouette only', () => {
  const outline = src('js/fx/toon-outline.js'), vfx = src('js/fx/vfx3d.js');
  assert.match(outline, /stencilFunc:T\.NotEqualStencilFunc/);
  assert.match(outline, /hull\.renderOrder=mesh\.renderOrder\+1/);
  assert.match(game, /ToonOutline\.silhouette\(T,battleGroup,\{skipRoots:\[battle\.arena\]\}\)/);
  assert.match(game, /\(!battle\|\|battle\.gym\)&&ToonOutline\.active\)ToonOutline\.release\(\)/);
  assert.match(vfx, /stencilFunc:T\.NotEqualStencilFunc/);
  assert.match(outline, /o\.userData\.ownOutline\)return;/);
  assert.match(src('models/native/families.js'), /scene\.userData\.ownOutline=true/);
});

test('arena spirits stand on the discs, with half-width lines', () => {
  assert.match(game, /const ARENA_GROUND=\.14/);
  assert.match(game, /\|\|arenaGround\(b\);/);
  assert.match(game, /FISHING_GROUND=-\.05/);
  assert.match(game, /width:ToonOutline\.WIDTH\/2/);
  assert.match(src('models/native/families.js'), /OUTLINE_WIDTH=\.0026,OUTLINE_BROWN=0x7a4a2a/);
});

test('the gate opens only on approach, and the fence and gate block the way until then', () => {
  assert.match(gate, /want=near&&unlocked/);
  assert.match(gate, /open<\.7\)return true/);
  assert.match(hall, /gate\?\.blocked\(x,z,m\)/);
});

test('fence and gate are outlined, 招財 has none, and all stay cheap', () => {
  assert.match(gate, /ToonOutline\?\.add\(T,fence\)/);
  assert.doesNotMatch(gate, /ToonOutline\?\.add\(T,dog\.root\)/);
  assert.match(gate, /DOG_Y=\.1/);
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

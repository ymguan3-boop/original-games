import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGES} from '../js/stages.js';
import {PK_STAGE, PK_ARENAS, pkArenaFor, createGame, TRIAL_ROSTER} from '../js/rules.js';
import {createMirror} from '../js/pk-sync.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const main = read('../js/main.js'), view = read('../js/view.js');
const style = read('../js/style.js'), fx = read('../js/fx.js');
const lobby = read('../js/pk-lobby.js'), net = read('../js/pk-net.js');
const css = read('../css/defense.css'), html = read('../index.html');

test('one seeded random PK scenery per match, same stage for both phones', () => {
  assert.equal(PK_ARENAS.length, 10);
  assert.equal(STAGES.length, 10);
  for(let i=0;i<10;i++) {
    const a=pkArenaFor(100+i), b=pkArenaFor(100+i);
    assert.equal(a.scene, b.scene);
    assert.equal(a.name, b.name);
    assert.deepEqual(a.path, PK_STAGE.path,'random scenery may not unbalance lane length');
    assert.equal(a.boss, null);
    assert.equal(createMirror(a).stage.scene, a.scene);
  }
  assert.equal(new Set(Array.from({length:10},(_,i)=>pkArenaFor(i).scene)).size,10);
  assert.match(main,/pk\.arena = pkArenaFor\(pk\.seed\)/);
  assert.match(main,/stage: pk\.arena, deck: pk\.me\.deck, foeDeck: pk\.foe\.deck/);
  assert.match(main,/game = createMirror\(pk\.arena\)/);
  assert.match(lobby,/s\.send\(\{t: 'start', seed\}\)/);
});

test('battle loading paints the progress overlay then streams models without constructing actors', () => {
  assert.match(main,/await nextPaint\(\)/);
  assert.match(main,/loadingElapsed/,'elapsed loading seconds must be visible');
  assert.match(html,/id="loadingElapsed"/);
  assert.match(main,/loadingPhase\('正在搭建島嶼與道路…', 26\)/);
  assert.match(main,/loadingPhase\('戰場準備完成，開始出擊！', 100\)/);
  assert.match(main,/view\.preload\(ids, \(done, total\)/);
  assert.match(main,/setTimeout\(resolve, 4300\)/);
  const preload=view.slice(view.indexOf('async preload(ids'), view.indexOf('/* Trap placement:'));
  assert.match(preload,/new Set\(ids\)/);
  assert.match(preload,/nativeAsset\(spec\.model\) : loadGltf\(spec\.model\)/);
  assert.match(preload,/Math\.min\(3,unique\.length\)/);
  assert.doesNotMatch(preload,/createActor\(/,'preloading full 3D actors is expensive');
  assert.match(main,/pendingDealingScene = game/);
  assert.match(main,/if \(\+\+visibleSceneFrames >= 2\)/,'card dealing waits for visible battle');
});

test('long PK mobile rendering, network buffers and VFX queues are bounded', () => {
  assert.match(main,/const mobilePk = !!pk/);
  assert.match(main,/now - \(loop\.lastRenderAt \|\| 0\) >= 32/);
  assert.match(main,/if \(pk\.outbox\.length > 160\)/);
  assert.match(main,/firebase-relay' \? 450 : 190/);
  assert.match(net,/bufferedAmount \|\| 0/);
  assert.match(net,/o\?\.t === 'snap'/);
  assert.match(view,/mobileGpu \? 1\.25 : 1\.75/);
  assert.match(view,/mobileGpu \? 1024 : 2048/);
  assert.match(view,/MAX_WORLD_EFFECTS = mobileGpu \? 65 : 110/);
  assert.match(view,/disposeWorldEffect\(e\.obj\)/);
  assert.match(view,/disposeMap\(\)/);
  assert.match(view,/releasePortraitRenderer\(\)/,'unused third WebGL context must be released in PK');
  assert.match(view,/else seascape\.dispose\(\)/,'ocean GPU resources must be released on exit');
  assert.match(style,/sharedMaterials\.has\(m\)/);
  assert.match(fx,/function clear\(\)/);
  assert.match(fx,/node\.geometry\?\.dispose/);
});

test('landscape deck keeps Complete and gacha buttons outside scrollable card list', () => {
  assert.match(main,/data-close>完成/);
  assert.match(main,/'howto deck'\)/);
  assert.match(css,/dialog#modal\.deck #modalBody > \.panel-scroll/);
  assert.match(css,/flex:1 1 auto/);
  assert.match(css,/dialog#modal\.deck #modalBody > \.modal-actions/);
  assert.match(css,/flex:0 0 auto/);
  assert.match(css,/@media \(orientation:landscape\) and \(max-height:600px\)/);
  assert.match(css,/max-height:calc\(100dvh - 62px\)/);
  assert.match(html,/deck-preview-v7/);
});


test('portrait and landscape deck cards keep their 5:7 previews and one scrolling parent', () => {
  assert.match(main,/class="panel-scroll deck-card-list"/);
  assert.match(main,/class="deck-special-details"/);
  assert.match(main,/deckHelpExpanded \? 'open' : ''/);
  assert.match(main,/deckHelpExpanded = help.open/);
  assert.match(css,/dialog#modal\.deck #modalBody > \.panel-scroll\.deck-card-list/);
  assert.match(css,/dialog#modal\.deck \.deck-card-list \.roster/);
  assert.match(css,/grid-auto-rows:max-content/);
  assert.match(css,/max-height:none !important/);
  assert.match(css,/overflow:visible !important/);
  assert.match(css,/aspect-ratio:5 \/ 7/);
  assert.match(css,/dialog#modal\.deck \.deck-special-details > summary/);
  assert.match(css,/@media \(orientation:landscape\) and \(max-height:600px\)/);
  assert.match(css,/@media \(orientation:portrait\) and \(max-width:540px\)/);
  assert.match(css,/dialog#modal\.deck #modalBody > \.modal-actions/);
});

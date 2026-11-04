import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGES,buildPath} from '../js/stages.js';
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
  assert.match(main,/LOW_POWER && !pendingDealingScene/);
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
  assert.doesNotMatch(view,/portraitRig|renderPortrait/,'2D dialogue portraits must not allocate another WebGL renderer');
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
  assert.match(html,/20261104-v22/);
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


test('sortie editor shows selected deck first with visible 出擊 ribbons and no duplicated lower cards', () => {
  const selectedSection = main.indexOf('class="roster sortie-current"');
  const selectableSection = main.indexOf('其他基礎幻靈');
  const redSection = main.indexOf('其他紅卡輔助');
  assert.ok(selectedSection >= 0 && selectedSection < selectableSection && selectableSection < redSection,
    'selected deck must appear before all unselected groups');
  assert.match(main,/const chosenSlots = record\.deckSlots\.map\(\(id, i\) =>/);
  assert.match(main,/unchosenBase = units\.base\.filter\(\(u\) => !record\.deck\.includes\(u\.id\)\)/);
  assert.match(main,/unchosenRed = units\.red\.filter\(\(u\) => !record\.deck\.includes\(u\.id\)\)/);
  assert.match(main,/chosenSlots\.join\(''\)/);
  assert.match(main,/class="sortie-badge">出擊<\/span>/);
  assert.match(main,/n >= 0 \? '<span class="sortie-badge">出擊<\/span>' : ''/);
  assert.match(main,/openDeck\(null, added \? 0 : scroller\?\.scrollTop \|\| 0\)/,
    'when adding a card, reveal its new position in the selected top row');
  assert.match(css,/\.roster\.sortie-current/);
  assert.match(css,/\.collectionThumb\.sortie-picked/);
  assert.match(css,/\.collectionThumb \.sortie-badge/);
  assert.match(css,/aspect-ratio:5 \/ 7/,'selected and unselected cards retain the full aspect ratio');
  assert.match(css,/dialog#modal\.deck #modalBody > \.modal-actions/,'Complete button stays available');
  assert.match(main,/class="sortie-empty-slot"/);
  assert.match(css,/\.roster\.sortie-current \.sortie-empty-slot/);
});

test('fixed sortie slots preserve holes after removal and allow deliberate refill', () => {
  const normalStart = main.indexOf('function normalizeDeck() {');
  const selectionStart = main.indexOf('function updateDeckSelection(id) {');
  const selectionEnd = main.indexOf('function renderLobby() {', selectionStart);
  assert.ok(normalStart >= 0 && selectionStart > normalStart && selectionEnd > selectionStart);
  const logic = main.slice(normalStart, selectionStart) + main.slice(selectionStart, selectionEnd);
  const make = new Function('record','availableUnits','DECK_BASE','DECK_RED','DECK_SIZE','isRedCard','saveRecord',
    logic + ';return {normalizeDeck,updateDeckSelection};');
  const base = ['a','b','c','d','e'].map((id) => ({id}));
  const red = ['r1','r2','r3'].map((id) => ({id}));
  const availableUnits = () => ({base,red});
  const redCard = (id) => id.startsWith('r');
  const old = {deck:['a','b','c','d','r1','r2']};
  let saved = '';
  const api = make(old,availableUnits,4,2,6,redCard,()=>{saved=JSON.stringify(old);});
  api.normalizeDeck();
  assert.deepEqual(old.deckSlots,['a','b','c','d','r1','r2']);
  assert.equal(api.updateDeckSelection('b'),false);
  assert.deepEqual(old.deckSlots,['a',null,'c','d','r1','r2']);
  assert.deepEqual(old.deck,['a','c','d','r1','r2']);
  api.normalizeDeck();
  assert.equal(old.deckSlots[1],null,'normalization must not refill a removed card');
  const reopened=JSON.parse(saved);
  make(reopened,availableUnits,4,2,6,redCard,()=>{}).normalizeDeck();
  assert.equal(reopened.deckSlots[1],null,'saved hole persists after reopening');
  assert.equal(api.updateDeckSelection('e'),true);
  assert.deepEqual(old.deckSlots,['a','e','c','d','r1','r2'],'new base card refills the same open base slot');
  assert.equal(api.updateDeckSelection('r1'),false);
  assert.equal(old.deckSlots[4],null);
  assert.equal(api.updateDeckSelection('r3'),true);
  assert.equal(old.deckSlots[4],'r3','red skill fills red slot, not a base slot');
  const incomplete={deck:['a','b','c','d'],deckSlots:['a','b','c','d',null,null]};
  const newer=make(incomplete,availableUnits,4,2,6,redCard,()=>{});
  newer.normalizeDeck();
  assert.deepEqual(incomplete.deckSlots,['a','b','c','d',null,null],
    'empty two red positions must stay visible even when red cards are available');
});


test('incomplete base deck is stopped in Chinese and the reported CanvasTexture crash is repaired', () => {
  assert.match(main,/function requireCompleteSortie\(\)/);
  assert.match(main,/必須編滿四位基礎幻靈才可以出擊/);
  assert.match(main,/目前只有 \$\{count\}\/\$\{DECK_BASE\} 位/);
  assert.match(main,/if \(!requireCompleteSortie\(\)\) return/);
  assert.match(main,/class="sortie-base-warning"/);
  assert.match(main,/role="status"/);
  assert.match(main,/aria-disabled="true"/);
  assert.match(view,/t\.userData = \{\.\.\.\(t\.userData \|\| \{\}\), defenseGenerated: true\}/);
  assert.doesNotMatch(view,/t\.userData\.defenseGenerated = true/,
    'Three.js CanvasTexture may not provide userData before initialization');
});

test('top points and four action shortcuts share all available width at phone and desktop breakpoints', () => {
  const top = css.slice(css.indexOf('responsive full-width top shortcuts'));
  assert.ok(top.length > 0,'responsive toolbar styles exist');
  assert.match(top,/#lobby \.chart-head \.chart-tools \{/);
  assert.match(top,/grid-template-columns:minmax\(0,1\.16fr\) repeat\(3,minmax\(0,1fr\)\) minmax\(0,1\.3fr\)/);
  assert.match(top,/grid-column:3;grid-row:1/,'desktop toolbar fills available middle area');
  assert.match(top,/grid-column:1\/-1;grid-row:2/,'phone toolbar spans viewport width');
  assert.match(top,/@media \(max-width:1020px\)/);
  assert.match(top,/@media \(orientation:portrait\) and \(max-width:720px\)/);
  assert.match(top,/@media \(orientation:landscape\) and \(max-height:640px\)/);
  assert.match(top,/width:100%;min-width:0;max-width:none/);
  assert.match(top,/#lobby \.chart-head \.chart-tools button\.tool span/);
  assert.match(top,/#lobby \.chart-head \.chart-tools \.points-badge/);
  assert.match(top,/sortie-base-warning/);
  assert.match(html,/20261104-v22/,'main script needs a new version after hit isolation');
});

test('win screen keeps Next Stage button in a fixed accessible footer on landscape phones', () => {
  const result = main.slice(main.indexOf('function showResult(r) {'),
    main.indexOf('/* jump straight into another stage', main.indexOf('function showResult(r) {')));
  assert.match(result,/class="stage-result-content"/);
  assert.match(result,/class="sheet-actions stage-result-actions"/);
  assert.match(result,/id="nextStage"/);
  assert.match(result,/\$\('nextStage'\)\.onclick = \(\) => nextVoyage\(idx \+ 1\)/);
  assert.match(result,/\$\('modal'\)\.classList\.add\('stage-result'\)/);
  assert.match(css,/dialog#modal\.stage-result #modalBody \{/);
  assert.match(css,/dialog#modal\.stage-result \.stage-result-content \{/);
  assert.match(css,/overflow-y:auto;/);
  assert.match(css,/dialog#modal\.stage-result \.stage-result-actions \{/);
  assert.match(css,/flex:0 0 auto;/);
  assert.match(css,/@media \(orientation:landscape\) and \(max-height:650px\)/);
  assert.match(css,/@media \(orientation:landscape\) and \(max-height:380px\)/);
  assert.match(css,/safe-area-inset-bottom/);
});

test('all ten stages use continuous non-overlapping road mesh strips instead of flashing segments', () => {
  const begin=view.indexOf('function buildRoadRibbon(points, width, y) {');
  const end=view.indexOf('const roadLayers = [',begin);
  assert.ok(begin>=0&&end>begin);
  const body=view.slice(begin,end);
  assert.doesNotMatch(body,/BoxGeometry|CylinderGeometry/);
  const geom = new Function('THREE',body+';return buildRoadRibbon;')({
    BufferGeometry:class {
      setAttribute(k,v){this.position=v;return this;}
      setIndex(v){this.indices=v;return this;}
      computeVertexNormals(){}
    },
    BufferAttribute:class {constructor(values,itemSize){this.array=values;this.itemSize=itemSize;}}
  });
  for (const stage of STAGES) {
    const path = buildPath(stage.path);
    for(const [width,height] of [[3.3,.018],[2.8,.038],[2.25,.058]]) {
      const g=geom(path.points,width,height);
      assert.equal(g.position.array.length,path.points.length*6,stage.name);
      assert.equal(g.indices.length,(path.points.length-1)*6,stage.name);
      assert.ok([...g.position.array].every(Number.isFinite),stage.name+' invalid coordinates');
      assert.ok(g.indices.every(i=>i>=0&&i<path.points.length*2),stage.name+' invalid triangles');
    }
  }
  assert.match(view,/roadLayers\.forEach\(/);
  assert.match(view,/new THREE\.MeshBasicMaterial/);
  assert.match(view,/road\.receiveShadow = false/);
  assert.match(view,/road\.name = 'static-road-layer-'/);
  assert.doesNotMatch(view.slice(view.indexOf('const pts = game.path.points;'),
    view.indexOf('/* small arrows on the road')),/new THREE\.BoxGeometry\(width, 0\.03/);
});


test('portrait HUD uses two compact top rows without orphaned stage/weather words', () => {
  assert.match(html,/id="stageName"[^>]+><span class="hud-stage-label" id="hudStageLabel"><\/span><span class="hud-weather-label" id="hudWeatherLabel"><\/span>/);
  assert.match(main,/setBattleStageHeading\(\x60\$\{record\.stage \+ 1\}\. \$\{game\.stage\.name\}\x60/);
  assert.match(main,/if \(pk\) setBattleStageHeading\(/);
  const begin=main.indexOf('function setBattleStageHeading(stageText, weatherText');
  const end=main.indexOf('function hud() {',begin);
  assert.ok(begin>=0 && end>begin);
  const nodes=Object.fromEntries(['stageName','hudStageLabel','hudWeatherLabel']
    .map(id=>[id,{textContent:'',hidden:false,title:'',setAttribute(name,value){this[name]=value;}}]));
  const setHeading=new Function('$',main.slice(begin,end)+'return setBattleStageHeading;')(id=>nodes[id]);
  for(let i=0;i<STAGES.length;i++) {
    const title=(i+1)+'. '+STAGES[i].name;
    setHeading(title,'☀️ 晴朗暖陽');
    assert.equal(nodes.hudStageLabel.textContent,title);
    assert.equal(nodes.hudWeatherLabel.textContent,'☀️ 晴朗暖陽');
    assert.equal(nodes.stageName['aria-label'],title+'，☀️ 晴朗暖陽');
    assert.equal(nodes.hudWeatherLabel.hidden,false);
  }
  setHeading('⚔️ vs 旅人70','PK・猴王果園・2:57');
  assert.equal(nodes.hudWeatherLabel.textContent,'PK・猴王果園・2:57');
  setHeading('單獨標題');
  assert.equal(nodes.hudWeatherLabel.hidden,true);
  const styles=css.slice(css.indexOf('2026-11-04 v14: compact weather-safe HUD'));
  assert.ok(styles.length>4000);
  assert.match(styles,/white-space:nowrap/);
  assert.match(styles,/text-overflow:ellipsis/);
  assert.match(styles,/word-break:keep-all/);
  assert.match(styles,/@media \(orientation:portrait\) and \(max-width:720px\)/);
  assert.match(styles,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(styles,/grid-template-rows:56px 44px/);
  assert.match(styles,/grid-column:1 \/ span 6/);
  assert.match(styles,/grid-column:7 \/ span 4/);
  assert.match(styles,/grid-column:11 \/ span 2/);
  assert.match(styles,/grid-column:1 \/ span 4/);
  assert.match(styles,/grid-column:5 \/ span 8/);
  assert.match(styles,/@media \(orientation:portrait\) and \(max-width:355px\)/);
  for(const width of [320,351,390,430,720]) {
    const inner=width-14, gap=4, unit=(inner-11*gap)/12;
    const span=n=>unit*n+(n-1)*gap;
    assert.ok(span(5)>0 && span(3)>0,'all PK tracks remain usable');
    assert.ok(Math.abs(span(6)+span(4)+span(2)+2*gap-inner)<.01);
    assert.ok(Math.abs(span(4)+span(8)+gap-inner)<.01);
    assert.ok(Math.abs(span(5)+span(3)+span(2)+span(2)+3*gap-inner)<.01);
  }
  assert.match(html,/20261104-v22/);
});

test('evolution cutscene and obsolete camera button stay removed in solo and PK', () => {
  const head=html.slice(html.indexOf('<div id="hud"'),html.indexOf('<div class="hud-bottom">'));
  assert.doesNotMatch(head,/camReset|evoToggle|進化動畫/);
  assert.match(head,/id="speed"/);
  assert.match(head,/id="pause"/);
  assert.match(head,/class="fs-toggle hud-fs"/);
  assert.doesNotMatch(main,/camReset|evoToggle|evoOverlay\(|evolvingCards|EVO_TIME|\.evo-anim/);
  assert.doesNotMatch(css,/#evoToggle|\.evo-anim|\.evo-old|\.evo-new|\.evo-flash|\.evo-rays/);
  assert.match(main,/if \('evoAnim' in record\) \{ delete record\.evoAnim; saveRecord\(\); \}/);
  const source=css.slice(css.indexOf('2026-11-04 v14: compact weather-safe HUD'));
  assert.match(source,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
    'solo HUD divides space evenly between speed and pause');
  assert.match(source,/body\.pk-mode #hud \.hud-top \.hud-actions \{\s*grid-column:9 \/ span 2;/,
    'PK gives pause a compact control in the top row');
  assert.match(source,/@media \(orientation:landscape\) and \(max-height:700px\)/);
  assert.match(source,/body\.pk-mode #hud \.hud-top \.hud-actions \{\s*grid-column:3;/,
    'landscape PK gives the pause button its own top-row track');
  assert.match(main,/else if \(ev\.type === 'merge'\) \{ fuse\(ev\)/,
    'card merging is not disabled by cutscene removal');
});

test('all islands retain authored weather and lighting after boss hits, in solo and PK', async () => {
  const sea=read('../js/seascape.js');
  const {stageWeather}=await import('../js/seascape.js');
  for(const stage of STAGES) {
    assert.equal(stageWeather(stage.scene).fixed,true,stage.name+' should be fixed');
  }
  for(const arena of PK_ARENAS) {
    assert.equal(stageWeather(arena.scene).fixed,true,'PK climate must be stage-controlled');
  }
  assert.match(sea,/function lockWeather\(\)/);
  assert.match(sea,/scene\.background !== null/);
  assert.match(sea,/scene\.fog !== null/);
  assert.match(view,/lockedClimateLighting = \{/);
  assert.match(view,/seascape\.lockWeather\(\)/);
  assert.match(view,/hemi\.intensity !== c\.hemiPower/);
  assert.match(view,/sun\.intensity !== c\.sunPower/);
  assert.doesNotMatch(view,/scene\.background\s*=\s*new THREE\.Color\(0x(?:000000|ffffff)\)/);
});

test('all stages share localized thunder animations and climate cannot flash screen-wide', () => {
  const sea=read('../js/seascape.js');
  const rules=read('../js/rules.js');
  assert.match(fx,/function lightningStrike\(\{x, z\}\)/);
  assert.match(fx,/bolt\.name = 'road-weather-lightning'/);
  assert.doesNotMatch(fx,/function lightning\(\{from, to/,'random screen-high flashing bolts must be removed');
  assert.doesNotMatch(fx,/y: 13/,'bolt must not begin above the camera');
  assert.match(fx,/lightningStrike\(\{x, z\}\)/);
  assert.match(fx,/shockwave\(\{x: center\.x, z: center\.z, color: c2, radius: 4/);
  assert.match(view,/seascape\.lockWeather\(\)/);
  assert.match(view,/if \(renderer\.toneMapping !== THREE\.NoToneMapping\)/);
  assert.match(view,/hemi\.intensity !== c\.hemiPower/);
  assert.match(view,/sun\.intensity !== c\.sunPower/);
  assert.match(sea,/function lockWeather\(\)/);
  assert.match(rules,/state\.stage\.id === 'waterfall'/);
  assert.match(html,/main\.js\?v=20261104-v22/);
});

test('hits cannot recolor the CSS weather: alpha WebGL, frozen shadows and local barrel feedback', () => {
  const sea=read('../js/seascape.js');
  assert.match(view,/WebGLRenderer\(\{canvas, alpha: true/);
  assert.match(view,/renderer\.setClearColor\(0x000000, 0\)/);
  assert.match(view,/renderer\.shadowMap\.autoUpdate = false/);
  assert.match(view,/renderer\.shadowMap\.needsUpdate = true/);
  assert.match(view,/createSeascape\(THREE, scene, kit, canvas\)/);
  assert.match(sea,/painted\.toDataURL\('image\/png'\)/);
  assert.match(sea,/canvas\.style\.backgroundImage = skyCss/);
  assert.match(sea,/scene\.background = null/);
  assert.match(sea,/scene\.background !== null/);
  assert.doesNotMatch(sea,/skyTex/,'stage sky must never be a renderable WebGL background');
  assert.doesNotMatch(view,/heroPlay\('Hurt'/);
  assert.doesNotMatch(view,/rivalPlay\('Hurt'/);
  assert.doesNotMatch(view,/b\.play\('Hurt'/);
  assert.match(view,/body\.scale\.set\(1 \+ k, 1 - k, 1 \+ k\)/,'local barrel squash remains');
  assert.match(view,/Math\.sin\(b\.userData\.flash \/ 0\.18 \* Math\.PI\) \* 0\.018/);
  assert.match(css,/#world \{[^}]+background-position: center; background-size: cover;/);
  assert.match(html,/defense\.css\?v=20261104-v22/);
  assert.match(html,/main\.js\?v=20261104-v22/);
});

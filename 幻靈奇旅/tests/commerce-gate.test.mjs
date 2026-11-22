import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const game = src('js/game.js'), gate = src('js/commerce-gate.js'), hall = src('js/commerce-hall.js');

function playHandover(stage=0){
  const state={zhaocai:stage}, player={x:0,z:0}, actions=[], nodes=new Map();
  const $=id=>{if(!nodes.has(id))nodes.set(id,{style:{}});return nodes.get(id);};
  const gate={post:{x:0,z:0},dog:{rotation:{},position:{x:0,z:0}},setPhase(p){this.phase=p;},setTalking(){}};
  const ctx=vm.createContext({S:{state,player,stick:{}},hero:{root:{rotation:{}},play(){}},commerce:{gate,unlockGate(){}},
    dialog:null,modal:false,battle:false,place:null,throwing:false,roll:false,enterBusy:false,
    window:{PhantomCommerce:{shopURL:()=>'/shop'},PhantomOnboarding:null},PhantomTransition:{navigate:url=>actions.push(url)},
    boatmanRush:null,labEvent:null,elapsed:1,save:()=>true,cancelNavigation(){},clearTarget(){},esc:s=>s,toast(){},$});
  const segment=(from,to)=>game.slice(game.indexOf(from),game.indexOf(to,game.indexOf(from)));
  vm.runInContext(segment('const ZHAOCAI_LINES','let boatmanRush')+segment('function enterCommerce()','function portalCheck')+segment('function closeDialog()','function talk(n)'),ctx);
  return {ctx,state,player,actions,$,gate};
}

test('呈呈 can decline and reapproach, then hand the shop to 宏宏 and enter immediately',()=>{
  const {ctx,state,player,actions,$,gate}=playHandover();
  ctx.tickZhaocai();assert.match($('npcText').textContent,/呈呈/);
  ctx.closeDialog();ctx.tickZhaocai();assert.equal(ctx.dialog,null);assert.equal(state.zhaocai,0);
  player.x=6;ctx.tickZhaocai();player.x=0;ctx.tickZhaocai();
  ctx.advanceZhaocai();assert.equal(state.zhaocai,1);assert.match($('npcActions').innerHTML,/弟弟宏宏/);
  ctx.advanceZhaocai();assert.match($('npcText').textContent,/宏宏接過鑰匙/);
  ctx.advanceZhaocai();assert.equal(state.zhaocai,2);assert.equal(gate.phase,'gone');assert.deepEqual(actions,['/shop']);
});

test('old pending saves resume at handoff, completed saves enter directly, failed saves can retry',()=>{
  const {ctx,state,actions,$}=playHandover(1);
  ctx.enterCommerce();assert.match($('npcActions').innerHTML,/弟弟宏宏/);ctx.advanceZhaocai();
  ctx.save=()=>false;ctx.advanceZhaocai();assert.equal(state.zhaocai,1);assert.deepEqual(actions,[]);
  ctx.save=()=>true;ctx.advanceZhaocai();assert.deepEqual(actions,['/shop']);
  const old=playHandover(2);old.ctx.enterCommerce();assert.equal(old.ctx.dialog,null);assert.deepEqual(old.actions,['/shop']);
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

test('招財 uses the hero joint set and smooth surfaces', () => {
  for (const j of ['hips', 'chest', 'head', 'upperArm', 'forearm', 'hand', 'thigh', 'shin', 'foot', 'ear', 'tail1', 'tail2', 'tail3']) assert.ok(gate.includes("'" + j), j);
  const dog = gate.slice(gate.indexOf('function buildDog'), gate.indexOf('function poseDog'));
  assert.ok(!dog.includes('BoxGeometry') && !dog.includes('S.box'));
  assert.ok(gate.includes('poseDog(dog,time,stride,act)'));
  assert.ok(gate.includes("const FACES=['idle','blink','happy','talk','shout','star','sad','wow']"));
  assert.ok(gate.includes('attack:{length:1.15') && gate.includes('ultimate:{length:3.3'));
  assert.ok(game.includes("g?.setTalking(dialog?.data?.id==='zhaocai'&&zhaocaiStep<2)"));
});

test('fence and gate are outlined, 招財 has none, and all stay cheap', () => {
  assert.match(gate, /ToonOutline\?\.add\(T,fence,thin\)/);
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

test('招財 stays out of base dex data until unlocked through the addon', () => {
  assert.ok(src('js/model-preview.js').includes("category:'npc'"));
  assert.ok(src('js/model-preview-settings.js').includes("kind:'zhaocai'"));
  for (const f of ['data/spirits.json', 'data/spirit-catalog.json']) assert.ok(!/zhaocai:\/\/|"zhaocai"/.test(src(f)), f);
});

test('未締約的圖鑑卡片直接寫出取得方式，不再彈出視窗', () => {
  const game = src('js/game.js');
  assert.ok(game.includes('function captureHint(s)') && game.includes('esc(captureHint(s))'));
  assert.ok(!game.includes('showCaptureHint') && !game.includes('點擊查看取得方式'));
});

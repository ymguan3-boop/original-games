const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('mobile uses touch gestures with no camera shortcut palette',()=>{
 const html=read('index.html'),scene=read('js/scene.js'),css=read('event-layout-v12.css');
 assert.match(scene,/touchDragMode='rotate'/);assert.match(scene,/getTouchGesture/);
 assert.doesNotMatch(html,/class="camera-controls"/);
 assert.match(css,/\.camera-controls\{display:none!important/);
 assert.match(scene,/down\.shelfCandidate=found\.id;return;/);
});
test('patrol button sits next to settings in mobile header without duplicating it',()=>{
 const html=read('index.html'),nav=read('js/shop-navigation.js'),css=read('event-layout-v12.css');
 assert.equal((html.match(/id="camera-mode"/g)||[]).length,1);
 assert.match(html,/data-panel="settings">設定<\/button><button id="camera-mode"/);
 assert.match(css,/grid-template-areas:"info summary settings patrol return"/);
 assert.match(nav,/target\.after\(patrol\)/);
 const app=read('js/app.js');assert.match(app,/textContent=active\?'退出巡店':'主管巡店'/);
});
test('manager movement remains on joystick while camera is controlled by touch',()=>{
 const html=read('index.html'),scene=read('js/scene.js');
 assert.match(html,/id="joystick"/);
 assert.match(scene,/getTouchGesture/);assert.match(scene,/yaw-=dx\*\.007/);
 assert.doesNotMatch(html,/id="zoom-in"/);
});
test('patrol movement speed is exactly doubled for manual and auto paths',()=>{
 const core=read('js/core.js');assert.match(core,/this\.safeMove\(s,s\.manager,step\*2\.7,step\)/);
 assert.match(core,/steerManager\(s,dt\)\{const a=s\.manager,delta=dt\*2\.7/);
});
test('clicking event words on staff and 3D actor labels opens a focused detail',()=>{
 const staff=read('js/staff-overlay.js'),actors=read('js/actor-visuals.js'),scene=read('js/scene.js'),app=read('js/app.js'),detail=read('js/incident-detail.js');
 assert.match(staff,/⚠ \$\{esc\(s\.event\.title\)\}/);
 assert.match(staff,/onEventClick\(game\.state\.event\.instanceId\|\|game\.state\.event\.id\)/);
 assert.match(scene,/eventId:ev\.instanceId\|\|ev\.id,eventTitle:ev\.title/);
 assert.match(actors,/onEventClick\(node\.dataset\.eventId\)/);
 assert.match(app,/openPanel\('incident'\)/);
 assert.match(app,/incidentDetailPanel\(game,esc,btn\)/);
 assert.match(detail,/resolveEvent/);
});
test('GIF handoff is explicit and no originals are prematurely deleted',()=>{
 const guide=read('IMAGE26_GIF_CODEX_HANDOFF.md');
 assert.match(guide,/image2\.6/);assert.match(guide,/comic-1\.gif/);assert.match(guide,/stockout\.gif/);
 assert.match(guide,/全倉庫搜尋/);
});

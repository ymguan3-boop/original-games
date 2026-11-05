const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('mobile view controls are visible and rotation is the default',()=>{
 const html=read('index.html'),scene=read('js/scene.js'),css=read('commerce-controls-v11.css');
 assert.match(html,/id="camera-drag-mode"[^>]+aria-pressed="false"[^>]+>拖曳：旋轉/);
 assert.match(scene,/touchDragMode='rotate'/);
 assert.match(css,/body:not\(\.camera-locked\) \.camera-controls button:not\(#camera-mode\)\{display:grid!important/);
 assert.match(css,/body:not\(\.patrol-active\):not\(\.camera-locked\) \.camera-controls/);
 assert.match(scene,/down\.shelfCandidate=found\.id;return;/);
 assert.match(scene,/down\.shelfCandidate&&Math\.hypot/);
});
test('the top bar contains exactly one patrol shortcut and the old bottom one is gone',()=>{
 const html=read('index.html');
 assert.equal((html.match(/id="camera-mode"/g)||[]).length,1);
 assert.ok(html.indexOf('id="camera-mode"')>html.indexOf('class="time-controls"'));
 assert.ok(html.indexOf('id="camera-mode"')<html.indexOf('id="pause"'));
 const camera=html.match(/<div class="camera-controls">([\s\S]*?)<\/div>/)[1];
 assert.doesNotMatch(camera,/camera-mode/);
 const css=read('commerce-controls-v11.css');
 assert.match(css,/width:86px!important/);assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 const app=read('js/app.js');assert.match(app,/textContent=active\?'退':'巡'/);
});
test('manager joystick stays left and view controls move right during patrol',()=>{
 const css=read('commerce-controls-v11.css');
 assert.match(css,/body\.patrol-active:not\(\.camera-locked\) \.camera-controls/);
 assert.match(css,/right:10px!important;top:calc\(var\(--shop-header-bottom/);
 assert.match(css,/body\.patrol-active #patrol-controls #joystick\{left:14px!important/);
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

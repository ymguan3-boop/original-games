const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('camera uses touch orbit and pinch instead of visible angle buttons',()=>{
 const html=read('index.html'),scene=read('js/scene.js'),css=read('event-layout-v12.css');
 for(const id of ['camera-left','camera-right','zoom-in','zoom-out','camera-drag-mode'])assert.doesNotMatch(html,new RegExp('id="'+id+'"'));
 assert.match(scene,/touchDragMode='rotate'/);assert.match(scene,/getTouchGesture/);
 assert.match(css,/\.camera-controls\{display:none!important/);
});
test('camera pose is preserved when entering and exiting shelf editing',()=>{
 const scene=read('js/scene.js');
 assert.match(scene,/const previousMode=mode;/);
 assert.match(scene,/if\(m!=='follow'&&previousMode==='follow'\)target\.set/);
 assert.doesNotMatch(scene,/if\(m!=='follow'\)target\.set/);
 assert.match(scene,/thisModeDecorate\(\)\{mode='decorate';/);
 assert.match(scene,/selectShelf\(null\)/);
});
test('mobile cache includes new scene version so browsers receive the change',()=>{
 assert.match(read('index.html'),/app\.js\?v=\d{8}-/);
 assert.match(read('js/app.js'),/scene\.js\?v=\d{8}-/);
 assert.match(read('index.html'),/shop-interactions-v9\.css\?v=20261110-chibi2/);
});
test('focused patrol keeps the {actors,notices} shape for the overlay',()=>{
 const app=read('js/app.js');
 assert.doesNotMatch(app,/rows\.filter\(v=>v\.id===game\.state\.patrolFocus/);
 assert.match(app,/actors:view\.actors\.filter\(v=>v\.id===focus\),notices:view\.notices\.filter\(n=>n\.targetId===focus\)/);
});
test('pinch and wheel zoom work during manager patrol',()=>{
 const scene=read('js/scene.js');
 assert.doesNotMatch(scene,/Math\.min\(distance,8\)/);
 assert.match(scene,/mode==='follow'\?followDistance:/);
 assert.match(scene,/zoomView\(gesture\.distance\/next\.distance\)/);
 assert.match(scene,/if\(mode==='follow'\)followDistance=Math\.max\(4\.5,Math\.min\(16,/);
});

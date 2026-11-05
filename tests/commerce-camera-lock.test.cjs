const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('browse mode exposes both camera rotations and pan/zoom controls',()=>{
 const html=read('index.html'),css=read('shop-interactions-v9.css'),app=read('js/app.js');
 for(const id of ['camera-left','camera-right','zoom-in','zoom-out','camera-drag-mode'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(css,/body:not\(\.camera-locked\) \.camera-controls\{visibility:visible!important/);
 assert.match(app,/scene\.rotate\(-\.3\)/);assert.match(app,/scene\.rotate\(\.3\)/);
 assert.match(app,/scene\.setGestureMode\(scene\.gestureMode==='pan'\?'rotate':'pan'\)/);
});
test('shelf selection and placement freeze every camera input path',()=>{
 const scene=read('js/scene.js'),css=read('shop-interactions-v9.css'),app=read('js/app.js');
 assert.match(scene,/function cameraLocked\(\)\{return !!selectedShelf\|\|!!placement;\}/);
 assert.match(scene,/function panCamera\(dx,dy\)\{if\(cameraLocked\(\)\)return;/);
 assert.match(scene,/if\(cameraLocked\(\)\)\{gesture=null;return;\}/);
 assert.match(scene,/if\(cameraLocked\(\)&&!drag&&!placement\)return;/);
 assert.match(scene,/function wheel\(e\)\{e\.preventDefault\(\);if\(cameraLocked\(\)\)return;/);
 assert.match(scene,/rotate\(delta=\.24\)\{if\(cameraLocked\(\)\)return false;/);
 assert.match(scene,/zoom\(delta=1\)\{if\(cameraLocked\(\)\)return false;/);
 assert.match(app,/document\.body\.classList\.toggle\('camera-locked',locked\)/);
 assert.match(app,/control\.disabled=locked/);
 assert.match(css,/body\.camera-locked \.camera-controls\{visibility:hidden!important/);
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
 assert.match(read('index.html'),/app\.js\?v=20261105-(?:camera3|comic1|patrol4)/);
 assert.match(read('js/app.js'),/scene\.js\?v=20261105-(?:camera3|comic1|patrol5)/);
 assert.match(read('index.html'),/shop-interactions-v9\.css\?v=20261105-camera3/);
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('camera uses touch orbit and pinch instead of visible angle buttons',()=>{
 const html=read('index.html'),scene=read('js/scene.js'),css=read('event-layout-v12.css');
 for(const id of ['camera-left','camera-right','zoom-in','zoom-out','camera-drag-mode'])assert.doesNotMatch(html,new RegExp('id="'+id+'"'));
 assert.match(scene,/touchDragMode='rotate'/);assert.match(scene,/getTouchGesture/);
 assert.match(css,/\.camera-controls\{display:none!important/);
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
 assert.match(read('index.html'),/app\.js\?v=20261105-(?:camera3|comic1|patrol4|customer1|chapters1|chapter-bootfix2|customer-chase1|commissions2|evolution-patrol1)/);
 assert.match(read('js/app.js'),/scene\.js\?v=20261105-(?:camera3|comic1|patrol5|customer1|patrol-solved1|chase-daily1)/);
 assert.match(read('index.html'),/shop-interactions-v9\.css\?v=20261105-camera3/);
});

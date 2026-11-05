const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const moduleSource=read('js/window-controls.js').replace(/^export /gm,'');
function limits(){const context={};vm.runInNewContext(moduleSource+';this.bounds={clampWindowRect,defaultWindowRect,resizeWindowRect};',context);return context.bounds;}
test('mobile header contains information and return action within a single top bar',()=>{
 const html=read('index.html'),header=html.match(/<header class="topbar">([\s\S]*?)<\/header>/);
 assert.ok(header);assert.match(header[1],/class="mobile-strip"/);assert.equal((html.match(/class="mobile-strip"/g)||[]).length,1);
 const css=read('shop-interactions-v9.css');assert.match(css,/grid-area:quick/);assert.match(css,/\.topbar \.mobile-strip/);
 const nav=read('js/shop-navigation.js');assert.match(nav,/初光鎮/);assert.match(nav,/ResizeObserver\(updateHeaderBottom\)/);
});
test('window size is clamped on portrait, landscape and after zoom',()=>{
 const {defaultWindowRect,resizeWindowRect,clampWindowRect}=limits();
 for(const v of [{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:1024,height:768}]){
  let r=defaultWindowRect(v);for(const factor of [1.2,1.2,.83,.83,.83,.83]){r=resizeWindowRect(r,factor,v);assert.ok(r.left>=7&&r.top>=7);assert.ok(r.left+r.width<=v.width-7&&r.top+r.height<=v.height-7);}
  const moved=clampWindowRect({...r,left:4000,top:-600},v);assert.equal(moved.top,8);assert.ok(moved.left+moved.width<=v.width-8);
 }
});
test('manager panels have non-modal draggable controls',()=>{
 const html=read('index.html'),app=read('js/app.js'),win=read('js/window-controls.js');
 for(const id of ['panel-smaller','panel-larger','panel-reset','panel-close'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(win,/pointerdown/);assert.match(win,/setPointerCapture/);
 assert.match(app,/panelWindow\.open\(\)/);assert.doesNotMatch(app,/\$\('#panel'\)\.showModal\(\)/);
 const css=read('shop-interactions-v9.css');assert.match(css,/dialog#panel\[open\]/);assert.match(css,/touch-action:none/);
});
test('shop camera has touch-pan and pinch zoom without disabling shelf interactions',()=>{
 const scene=read('js/scene.js'),app=read('js/app.js');
 assert.match(scene,/activeTouches=new Map/);assert.match(scene,/getTouchGesture/);assert.match(scene,/setGestureMode\(m\)/);
 assert.match(scene,/if\(drag\)/);assert.match(scene,/pointercancel/);assert.doesNotMatch(app,/#camera-drag-mode/);
});

import {buildStoryHorizon} from '../js/storybook-landscape.js?v=20261121-storybook';
import {buildShell,buildCounter,buildGround,tune} from '../js/chibi/shell.js?v=20261121-storybook';
import {buildYard,createHeroChibi,layout} from '../js/chibi/yard.js?v=20261121-storybook';
import {createHuman,LOOKS} from '../js/human-customers.js?v=20261121-storybook';
import {createAssets} from '../js/asset-resolver.js?v=20261121-storybook';
import {createShelfView} from '../js/shelf-view.js?v=20261121-storybook';
import {shelvesForLevel} from '../js/furniture.js?v=20261121-storybook';
import {decorForLevel} from '../js/decorations.js?v=20261121-storybook';
import {loadProduct,buildProducts,setProductCount} from '../js/shelf-products.js?v=20261121-storybook';
import {createSpinModels} from '../js/spin-arena-models.js?v=20261121-storybook';
import {SPIN_TOPS} from '../js/spin-arena-config.js?v=20261121-storybook';
import {counterPositions,dimensions} from '../js/nav.js?v=20261121-storybook';
import {buildMeadow} from '../../幻靈奇旅/survivors/js/meadow-terrain.js?v=20261115-v63';
import {merchantWeaponCatalog} from '../../幻靈奇旅/survivors/js/merchant-meadow.js?v=20261115-v63';

const chapters={
 facade:['店面','THE MERCHANT HOUSE','屋脊、窗框與入口木作'],
 inside:['店內','THE COUNTER ROOM','收銀台、貨架與陳列商品'],
 square:['街道廣場','MARKET SQUARE','街道與商會對面的活動場地'],
 stock:['貨架與家具','THE WORKSHOP','旋轉展品，查看側面與背面的做工'],
 goods:['商品','THE MERCHANDISE','架上商品的單件近照'],
 people:['角色','TOWNSFOLK','呈呈、店長宏宏、顧客與幻靈'],
 arena:['陀螺競技場','THE TOURNAMENT','廣場擂台與對戰陀螺'],
 meadow:['採集草原','THE MEADOW','草原水岸、岩壁與林木']
};
const T=globalThis.THREE, $=id=>document.getElementById(id);
const current=new URL(location.href), params=current.searchParams;
const chapter=Object.hasOwn(chapters,params.get('scene'))?params.get('scene'):'facade';
const level=Math.min(5,Math.max(1,Math.floor(Number(params.get('level')))||1)), tier=Math.min(5,level);
const tick=[];
if(params.get('embedded')==='1')document.body.classList.add('embedded');
function link(changes){const u=new URL(current);for(const [k,v] of Object.entries(changes))v==null?u.searchParams.delete(k):u.searchParams.set(k,v);return u.href;}
for(const [id,[name]] of Object.entries(chapters)){const a=document.createElement('a');a.href=link({scene:id,item:null});a.textContent=name;if(id===chapter)a.setAttribute('aria-current','page');$('chapters').append(a);}
for(let n=1;n<=5;n++)$('level').add(new Option('Lv.'+n,n,n===level,n===level));
$('level').onchange=()=>location.assign(link({level:$('level').value,item:null}));
const [caption,english,detail]=chapters[chapter];$('title').textContent=caption;$('english').textContent=english;$('detail').textContent=detail;
function choose(items){const id=items.some(i=>i.id===params.get('item'))?params.get('item'):items[0].id;
 for(const item of items)$('object').add(new Option(item.name,item.id,false,item.id===id));
 $('objectLabel').hidden=false;$('object').onchange=()=>location.assign(link({item:$('object').value}));
 const obj=items.find(i=>i.id===id);$('title').textContent=obj.name;return obj;}
const canvas=$('model'), root=new T.Scene(), camera=new T.PerspectiveCamera(36,1,.025,300);
const assets=createAssets(T,{assets:[]}), focus=new T.Vector3();
let yaw=.36,pitch=.41,span=11,zoom=1,preset;
function pose(x,y,z,size,az,el){focus.set(x,y,z);span=size;yaw=az;pitch=el;zoom=1;preset=[x,y,z,size,az,el];}
$('back').onclick=()=>preset&&pose(...preset);
let sun;function light(color,intensity,x,y,z){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);root.add(l);if(!sun){sun=l;l.castShadow=true;l.shadow.mapSize.set(1536,1536);l.shadow.bias=-.0005;l.shadow.normalBias=.025;root.add(l.target);}}
root.background=new T.Color(0xc3d6cb);root.fog=new T.FogExp2(0xe0dfc8,.012);
root.add(new T.HemisphereLight(0xfff1d2,0x9daabd,.86));light(0xffedd0,1.04,-7,11,8);light(0xe4edff,.19,4,6,-7);
function platform(radius){
 for(const [r,h,y,c] of [[radius*.95,.14,-.16,0x36544f],[radius,.09,-.055,0xcbaa78],[radius*.99,.06,-.013,0xe7d9bb]]){
 const m=new T.Mesh(new T.CylinderGeometry(r,r*.99,h,64),new T.MeshStandardMaterial({color:new T.Color(c).convertSRGBToLinear(),roughness:.9}));m.position.y=y;root.add(m);}
}
function box(w,h,d,m,x,y,z,parent){const n=new T.Mesh(new T.BoxGeometry(w,h,d),m);n.position.set(x,y,z);parent.add(n);return n;}
async function furnishing(item,decoration=false){
 const sh={...item,id:item.id,type:item.id,tier:level,decoration};
 const view=await new Promise((resolve,reject)=>createShelfView({T,assets,sh,level,box,onReady:resolve,onError:reject}));
 if(!decoration){const skus=item.id==='materials'?['shop-iron','shop-wood']:[item.sku];
 for(const [i,sku] of skus.entries()){const model=await loadProduct(T,assets,sku);const capacity=Math.max(1,Math.floor(item.capacity/skus.length));
 const batch=buildProducts(T,assets,model,capacity,{...item,materialSide:i?'wood':'iron'});setProductCount(batch,capacity);view.products.add(batch);}}
 return view.root;
}
function addAt(o,x,y,z){o.position.set(x,y,z);root.add(o);return o;}
async function drawChapter(){
 const {width:w,height:d}=dimensions(level), opts={w,d,ground:-.07,ambient:true};
 const racks=shelvesForLevel(level),decor=decorForLevel(level);
 if(['facade','inside','square'].includes(chapter)){
  const shell=buildShell(tier,opts);root.add(tune(shell),tune(buildGround()));root.add(buildStoryHorizon(T,w,d,tier));
  if(chapter!=='inside'){
   $('cutaway').hidden=false;
   for(const [id,set] of [['roof',on=>shell.userData.setRoofTranslucent(on)],['front',on=>shell.userData.setFrontFade(on?.13:1)]]){
    const input=$(id);
    input.checked=params.get(id)==='clear';
    set(input.checked);
    input.onchange=()=>{set(input.checked);if(input.checked)params.set(id,'clear');else params.delete(id);history.replaceState(null,'',current);};
   }
  }
  for(const desk of counterPositions(level)){const counter=tune(buildCounter(tier));counter.scale.x=.62;counter.rotation.y=-Math.PI/2;addAt(counter,desk.x-(w-1)/2,0,desk.z-(d-1)/2);}
  if(chapter==='inside'){
   shell.userData.setFrontFade?.(.10);shell.userData.setRoofVisible?.(false);
   const display=[racks[0],racks.find(r=>r.id==='armory'),racks.find(r=>r.id==='materials')].filter(Boolean);
   for(const [i,r]of display.entries())addAt(await furnishing(r),-w*.31+i*1.73,0,-d*.06);
   const plant=decor.find(o=>o.id==='plant');if(plant)addAt(await furnishing(plant,true),w*.33,0,d*.18);
   pose(0,1,-d*.13,w*.96,.28,.68);
  }else{
   const yard=buildYard(tier,opts);root.add(tune(yard.root));tick.push((dt,t)=>yard.update(dt,t,'clear'));
   if(chapter==='square'){const road=layout(tier,opts).zR;pose(0,.52,road+(tier>=3?3.7:.1),tier>=3?13:11,-.24,.55);}
   else{
    pose(0,2.0,.28,w*1.12,.44,.32);
    {
     const closeUp=[...preset];let wide=false;
     function frameDistrict(on){
      wide=on;pose(...(on?[0,1,-1.1,w*2.32,.27,.43]:closeUp));
      $('district').textContent=wide?'店面近看':'街坊全景';$('district').setAttribute('aria-pressed',String(wide));
     }
     $('district').hidden=false;$('district').onclick=()=>frameDistrict(!wide);
     frameDistrict(params.get('district')==='1');
    }
   }
  }
 }else if(chapter==='stock'){
  const item=choose([...racks,...decor]);const o=await furnishing(item,!!item.group);root.add(o);
  const b=new T.Box3().setFromObject(o),s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),size=Math.max(s.x,s.y,s.z,.9);
  platform(size*.80);pose(c.x,c.y,c.z,size*1.55,.48,.25);
 }else if(chapter==='goods'){
  const catalog=await (await fetch('./data/shop-catalog.json')).json(),all=new Map();
  for(const o of [...catalog,...merchantWeaponCatalog()])if(o.isSellable&&o.sku!=='shop-crystal')all.set(o.sku,{id:o.sku,name:o.merchantGrade?o.displayName+' · '+o.sourceWeaponId:o.displayName});
  const item=choose([...all.values()]),o=assets.clone((await loadProduct(T,assets,item.id)).scene);assets.normalize(o,1.4,true);root.add(o);platform(1.21);
  const c=new T.Box3().setFromObject(o).getCenter(new T.Vector3());pose(c.x,c.y,c.z,2,.48,.27);
 }else if(chapter==='people'){
  const spirits=await(await fetch('./data/spirits.json')).json(),names={commoner:'平民',rich:'富商',adventurer:'冒險者',mage:'法師'};
  const item=choose([{id:'hero',name:'宏宏・商會店長'},{id:'chengcheng',name:'呈呈・冒險旅人',path:'models/hero.glb'},...Object.keys(LOOKS).flatMap(id=>['m','f'].map(v=>({id:id+'-'+v,name:(names[id]||id)+' · '+(v==='m'?'男':'女'),job:id,v}))),...spirits.map(o=>({id:o.id,name:o.name,path:o.model}))]);
  const actor=item.path?await assets.actor(item.path,1.55,{footprint:2,diameter:2}):item.job?createHuman(T,item.job,item.v):createHeroChibi();
  if(item.id==='hero')actor.setAction?.('portrait');
  root.add(actor.root);tick.push(dt=>actor.update?.(dt));platform(1.18);
  const b=new T.Box3().setFromObject(actor.root),s=b.getSize(new T.Vector3());pose(0,s.y*.50,0,Math.max(1.65,s.y*1.55),.19,.15);
 }else if(chapter==='arena'){
  const item=choose(SPIN_TOPS),factory=createSpinModels(T);await factory.ready;const ring=factory.arena({level:Math.max(3,tier)});root.add(ring);
  const first=addAt(factory.top(item.id),-.82,.55,0),other=addAt(factory.top(item.id==='wind'?'flame':'wind'),.82,.55,.04);
  for(const [i,o] of [first,other].entries()){o.scale.setScalar(.74);tick.push((dt,t)=>{o.rotation.y+=dt*(i?-3:4);o.position.z=.30*Math.sin(t*1.4+i*Math.PI);});}
  pose(0,.68,0,6.25,.18,.49);
 }else{
  const grass=new T.TextureLoader().load('../幻靈奇旅/survivors/assets/meadow/grass-v1.webp');grass.encoding=T.sRGBEncoding;grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.repeat.set(12,12);const base=new T.Mesh(new T.CircleGeometry(64,96),new T.MeshStandardMaterial({map:grass,roughness:1}));base.rotation.x=-Math.PI/2;base.position.y=-.06;base.receiveShadow=true;root.add(base);
  const terrain=buildMeadow(T,root,o=>o,{});terrain.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});pose(-14,.8,-7,20,-.45,.36);
 }
}
async function start(){
 const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputEncoding=T.sRGBEncoding;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.physicallyCorrectLights=true;
 await drawChapter();const radius=Math.max(3,span*1.5);sun.target.position.copy(focus);sun.position.copy(focus).add(new T.Vector3(-.56,.97,1.14).multiplyScalar(radius));Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,near:.1,far:radius*4});sun.shadow.camera.updateProjectionMatrix();$('status').hidden=true;
 const touch=new Map();let pinch=0;const dist=()=>{const [a,b]=[...touch.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);touch.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touch.size===2)pinch=dist();};
 canvas.onpointermove=e=>{const p=touch.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;touch.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touch.size===2){const d=dist();if(d&&pinch)zoom=Math.max(.4,Math.min(2.8,zoom*pinch/d));pinch=d;}else{yaw-=dx*.008;pitch=Math.max(.035,Math.min(1.48,pitch+dy*.006));}};
 canvas.onpointerup=canvas.onpointercancel=e=>touch.delete(e.pointerId);
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.4,Math.min(2.8,zoom*Math.exp(e.deltaY*.001)));},{passive:false});
 let last=0,t=0,previousPose='';
 T.DefaultLoadingManager.onLoad=()=>{previousPose='';};
 function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden||now-last<1000/30)return;
  const signature=[yaw,pitch,zoom,canvas.clientWidth,canvas.clientHeight].join('/');
  if(!tick.length&&signature===previousPose)return;
  previousPose=signature;
  const dt=Math.min(.07,(now-last)/1000);last=now;t+=dt;
  const w=canvas.clientWidth,h=canvas.clientHeight;if(camera.aspect!==w/h||renderer.domElement.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const safeWidth=camera.aspect<1&&chapter==='facade'?1.32:1;const radius=span*zoom*safeWidth/(2*Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));camera.position.set(focus.x+radius*Math.cos(pitch)*Math.sin(yaw),focus.y+radius*Math.sin(pitch),focus.z+radius*Math.cos(pitch)*Math.cos(yaw));camera.lookAt(focus);
  for(const update of tick)update(dt,t);renderer.render(root,camera);canvas.dataset.ready='true';}
 requestAnimationFrame(frame);
}
start().catch(e=>{$('status').hidden=false;$('status').textContent='場景載入失敗：'+e.message;console.error(e);});

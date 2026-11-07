/* 員工進化的 3D 演出：流程、時間與畫面都比照一般場景（幻靈奇旅 js/game.js 的 playEvolutionSequence）。
 * 平常員工在選單裡只顯示 2D 小圖，只有這裡才載入進化前後的 3D 模型。 */
const TOTAL=4.28,SWAP=3.02;
function ownMaterials(root){
 const cache=new Map(),list=[];
 const own=m=>{if(cache.has(m))return cache.get(m);const copy=m.clone();cache.set(m,copy);list.push({material:copy,color:copy.color?.clone(),emissive:copy.emissive?.clone(),intensity:copy.emissiveIntensity||0});return copy;};
 root.traverse(n=>{if(n.isMesh&&n.material)n.material=Array.isArray(n.material)?n.material.map(own):own(n.material);});
 return list;
}
export async function playEvolution3D({before,after,loadActor}){
 const T=globalThis.THREE,overlay=document.createElement('section');
 overlay.className='evolutionOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',`${before.name}進階至${after.name}`);overlay.tabIndex=-1;
 overlay.innerHTML='<div class="evolutionPanel"><div class="evolutionHeading">幻靈進階</div><div class="evolutionSubtitle"></div><div class="evolutionStage"></div><div class="evolutionWhiteFlash"></div><div class="evolutionMessage" aria-live="polite">正在凝聚羈絆，準備 3D 模型…</div></div>';
 document.body.append(overlay);overlay.focus({preventScroll:true});
 const host=overlay.querySelector('.evolutionStage'),flash=overlay.querySelector('.evolutionWhiteFlash'),message=overlay.querySelector('.evolutionMessage');
 overlay.querySelector('.evolutionSubtitle').textContent=`${before.name}  →  ${after.name}`;
 const white=new T.Color(0xffffff),stage=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,90);
 stage.add(new T.HemisphereLight(0xffffff,0x8481ac,2));
 const key=new T.DirectionalLight(0xffffff,2.3);key.position.set(-3,5,7);stage.add(key);
 const rim=new T.DirectionalLight(0xaad9ff,1.1);rim.position.set(4,4,-5);stage.add(rim);
 const whiten=(list,v)=>{const value=Math.max(0,Math.min(1,v));for(const x of list){const m=x.material;if(x.color)m.color.copy(x.color).lerp(white,value*.94);if(x.emissive){m.emissive.copy(x.emissive).lerp(white,value);m.emissiveIntensity=x.intensity+value*2.5;}}};
 let renderer,oldActor,newActor,raf=0;
 try{
  [oldActor,newActor]=await Promise.all([loadActor(before),loadActor(after)]);
  if(!overlay.isConnected)throw Error('進階畫面已關閉');
  for(const a of [oldActor,newActor])a.root.position.y=-1.5;
  const oldMats=ownMaterials(oldActor.root),newMats=ownMaterials(newActor.root);
  renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  renderer.setSize(width,height,false);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  camera.aspect=width/height;camera.position.set(0,.25,7.8);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  host.append(renderer.domElement);stage.add(oldActor.root);message.textContent=`${before.name} 正在凝聚白光…`;
  await new Promise((resolve,reject)=>{
   let elapsed=0,last=0,lastDraw=0,rotation=0,swapped=false;
   const frame=now=>{try{
    if(!last)last=now;const dt=document.hidden?0:Math.min(.07,Math.max(0,(now-last)/1000));last=now;elapsed+=dt;
    const warmup=Math.min(1,elapsed/SWAP);rotation+=(.4+warmup*warmup*12)*dt;
    if(!swapped&&elapsed>=SWAP){swapped=true;stage.remove(oldActor.root);stage.add(newActor.root);message.textContent=`${after.name} 進階成功！`;}
    const actor=swapped?newActor:oldActor;actor.root.rotation.y=rotation;actor.update(dt,false,{});
    if(!swapped){const phase=Math.PI*2*(1.05*elapsed+.95*elapsed*elapsed),bright=Math.min(1,elapsed/.85)*Math.pow(.5+.5*Math.sin(phase),1.2);whiten(oldMats,Math.min(1,bright*.78+Math.max(0,(elapsed-2.72)/.3)*.35));flash.style.opacity=String(Math.max(0,(elapsed-2.82)/.2)*.99);}
    else{whiten(newMats,Math.max(0,1-(elapsed-SWAP)/.75));flash.style.opacity=String(Math.max(0,1-(elapsed-SWAP)/.52)*.99);}
    if(now-lastDraw>=28){renderer.render(stage,camera);lastDraw=now;}
    if(elapsed>=TOTAL){resolve();return;}
    raf=requestAnimationFrame(frame);
   }catch(e){reject(e);}};
   raf=requestAnimationFrame(frame);
  });
 }finally{
  if(raf)cancelAnimationFrame(raf);
  oldActor?.dispose?.();newActor?.dispose?.();
  if(renderer){renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();}
  overlay.remove();
 }
}

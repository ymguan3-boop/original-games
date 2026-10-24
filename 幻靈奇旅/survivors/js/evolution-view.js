// Presentation adapted from the local original game snapshot; no original save code.
export async function playEvolutionSequence(before,after,{T,asset,cloneSkin}){const mobileGraphics=innerWidth<760;const posedBounds=object=>new T.Box3().setFromObject(object);const controllerBounds=(path,c)=>posedBounds(c.root);const actorBaseBounds=new Map();const graphicsQuality={preset:"balanced"};const graphicsPixelRatio=()=>Math.min(devicePixelRatio||1,1.5);
 const overlay=document.createElement('section');
 overlay.className='evolutionOverlay';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label',before.name+'進階至'+after.name);
 overlay.tabIndex=-1;
 overlay.innerHTML='<div class="evolutionPanel"><div class="evolutionHeading">幻靈進階</div><div class="evolutionSubtitle"></div><div class="evolutionStage"></div><div class="evolutionWhiteFlash"></div><div class="evolutionMessage" aria-live="polite">正在凝聚羈絆，準備 3D 模型…</div></div>';
 document.body.append(overlay);overlay.focus({preventScroll:true});
 const host=overlay.querySelector('.evolutionStage'),flash=overlay.querySelector('.evolutionWhiteFlash'),message=overlay.querySelector('.evolutionMessage'),subtitle=overlay.querySelector('.evolutionSubtitle');
 subtitle.textContent=before.name+'  →  '+after.name;
 let renderer,oldModel,newModel,rafId=0;
 const white=new T.Color(0xffffff);
 const stage=new T.Scene();
 const camera=new T.PerspectiveCamera(34,1,.1,90);
 stage.add(new T.HemisphereLight(0xffffff,0x8481ac,2));
 const keyLight=new T.DirectionalLight(0xffffff,2.3);keyLight.position.set(-3,5,7);stage.add(keyLight);
 const rimLight=new T.DirectionalLight(0xaad9ff,1.1);rimLight.position.set(4,4,-5);stage.add(rimLight);
 function buildModel(spirit,assetData){
  const controller=assetData.create?.(),object=controller?controller.root:cloneSkin(assetData.scene);
  const bounds=controller?controllerBounds(spirit.model,controller):(actorBaseBounds.get(spirit.model)?.clone()||posedBounds(object));
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const root=new T.Group();
  object.position.sub(center);
  root.scale.setScalar(Math.min(3/Math.max(.01,size.y),mobileGraphics?2.5/Math.max(.01,size.x):3.8/Math.max(.01,size.x),2.9/Math.max(.01,size.z)));
  root.add(object);
  const materialCache=new Map(),materials=[];
  function ownMaterial(material){
   if(materialCache.has(material))return materialCache.get(material);
   const copy=material.clone();materialCache.set(material,copy);
   materials.push({material:copy,color:copy.color?.clone(),emissive:copy.emissive?.clone(),intensity:copy.emissiveIntensity||0});
   return copy;
  }
  object.traverse(n=>{if(n.isMesh&&n.material)n.material=Array.isArray(n.material)?n.material.map(ownMaterial):ownMaterial(n.material);});
  const mixer=new T.AnimationMixer(object);
  if(!controller){
   const clips=assetData.animations||[],idle=clips.find(clip=>/idle|待機/i.test(clip.name))||clips[0];
   if(idle)mixer.clipAction(idle).play();
  }else controller.setMode?.('Idle');
  return {root,controller,mixer,materials,dispose(){mixer.stopAllAction();controller?.dispose();for(const x of materials)x.material.dispose();}};
 }
 function whiten(model,intensity){
  const value=Math.max(0,Math.min(1,intensity));
  for(const x of model.materials){
   const m=x.material;
   if(x.color)m.color.copy(x.color).lerp(white,value*.94);
   if(x.emissive){m.emissive.copy(x.emissive).lerp(white,value);m.emissiveIntensity=x.intensity+value*2.5;}
  }
 }
 try{
  const [previousData,nextData]=await Promise.all([asset(before.model),asset(after.model)]);
  if(!overlay.isConnected)throw Error('進階畫面已關閉');
  oldModel=buildModel(before,previousData);
  newModel=buildModel(after,nextData);
  renderer=new T.WebGLRenderer({alpha:true,antialias:!mobileGraphics,powerPreference:'high-performance'});
  renderer.setPixelRatio(graphicsPixelRatio(graphicsQuality.preset));
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  renderer.setSize(width,height,false);renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  camera.aspect=width/height;camera.position.set(0,.25,7.8);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  host.append(renderer.domElement);
  stage.add(oldModel.root);
  message.textContent=before.name+' 正在凝聚白光…';
  await new Promise((resolve,reject)=>{
   let elapsedTime=0,lastTime=0,lastDraw=0,rotation=0,swapped=false;
   const animate=(now)=>{
    try{
     if(!lastTime)lastTime=now;
     const dt=document.hidden?0:Math.min(.07,Math.max(0,(now-lastTime)/1000));lastTime=now;
     elapsedTime+=dt;
     const warmup=Math.min(1,elapsedTime/3.02);
     rotation+=(0.4+warmup*warmup*12)*dt;
     if(!swapped&&elapsedTime>=3.02){
      swapped=true;stage.remove(oldModel.root);stage.add(newModel.root);
      message.textContent=after.name+' 進階成功！';
     }
     const model=swapped?newModel:oldModel;
     model.root.rotation.y=rotation;
     model.mixer.update(dt);model.controller?.update?.(dt);
     if(!swapped){
      const phase=Math.PI*2*(1.05*elapsedTime+.95*elapsedTime*elapsedTime);
      const brightness=Math.min(1,(elapsedTime/.85))*Math.pow(.5+.5*Math.sin(phase),1.2);
      whiten(oldModel,Math.min(1,brightness*.78+Math.max(0,(elapsedTime-2.72)/.3)*.35));
      flash.style.opacity=String(Math.max(0,(elapsedTime-2.82)/.2)*.99);
     }else{
      const fade=Math.max(0,1-(elapsedTime-3.02)/.75);
      whiten(newModel,fade);
      flash.style.opacity=String(Math.max(0,1-(elapsedTime-3.02)/.52)*.99);
     }
     if(now-lastDraw>=28){renderer.render(stage,camera);lastDraw=now;}
     if(elapsedTime>=4.28){resolve();return;}
     rafId=requestAnimationFrame(animate);
    }catch(e){reject(e);}
   };
   rafId=requestAnimationFrame(animate);
  });
 }finally{
  if(rafId)cancelAnimationFrame(rafId);
  oldModel?.dispose();newModel?.dispose();
  if(renderer){renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();}
  overlay.remove();
 }
}

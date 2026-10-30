/* Shared, bounded presentation; damage is resolved by the scene's simulation. */
(function(global){'use strict';
 const assetBase=new URL('../assets/effects/reaper-v2/',document.currentScript.src).href;
 const clamp=x=>Math.max(0,Math.min(1,x));
 function create({THREE:T,scene,camera,weapon,onSound=()=>{}}){
  const materials=[],geometries=[],textures=[];
  const mat=(color,opacity=1)=>{const m=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide});materials.push(m);return m;};
  const apparitionMaterial=new T.SpriteMaterial({transparent:true,opacity:0,depthWrite:false});materials.push(apparitionMaterial);
  const apparition=new T.Sprite(apparitionMaterial);apparition.name='ReaperApparition';apparition.visible=false;scene.add(apparition);
  apparitionMaterial.color.setScalar(1.5);apparitionMaterial.toneMapped=false;
  const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;const hc=haloCanvas.getContext('2d'),gradient=hc.createRadialGradient(64,64,5,64,64,64);gradient.addColorStop(0,'rgba(255,208,100,.9)');gradient.addColorStop(.34,'rgba(255,123,47,.65)');gradient.addColorStop(.65,'rgba(224,33,53,.25)');gradient.addColorStop(1,'rgba(224,33,53,0)');hc.fillStyle=gradient;hc.fillRect(0,0,128,128);const haloTexture=new T.CanvasTexture(haloCanvas);textures.push(haloTexture);const haloMaterial=new T.SpriteMaterial({map:haloTexture,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});materials.push(haloMaterial);const halo=new T.Sprite(haloMaterial);halo.name='ReaperBacklight';halo.visible=false;halo.renderOrder=30;apparition.renderOrder=31;scene.add(halo);
  const eyes=new Image(),glass=new Image();
  const ready=Promise.all([new Promise((resolve,reject)=>new T.TextureLoader().load(assetBase+'reaper-gold-crimson.webp',texture=>{texture.encoding=T.sRGBEncoding;textures.push(texture);apparitionMaterial.map=texture;apparitionMaterial.needsUpdate=true;resolve();},undefined,reject)),new Promise((resolve,reject)=>{eyes.onload=resolve;eyes.onerror=reject;eyes.src=assetBase+'hollow-eyes.webp';}),new Promise((resolve,reject)=>{glass.onload=resolve;glass.onerror=reject;glass.src=assetBase+'screen-glass.webp';})]);
  const canvas=global.document?.createElement('canvas'),ctx=canvas?.getContext('2d');
  if(canvas){canvas.dataset.reaperOverlay='true';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:24;display:none';document.body.append(canvas);}
  const arcGeometry=new T.RingGeometry(.87,1,56,1,-Math.PI/3,Math.PI*2/3);geometries.push(arcGeometry);
  const arcs=Array.from({length:6},()=>{const material=mat(0xff234d,0);const mesh=new T.Mesh(arcGeometry,material);mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return{mesh,life:0};});
  const metrics={phase:'idle',casts:0,glassSounds:0,slashes:0,activeArcs:0,apparitionVisible:false,eyesVisible:false,glassVisible:false};let id=null,sounded=false,disposed=false,w=0,h=0;
  function clear(){apparition.visible=false;halo.visible=false;id=null;sounded=false;metrics.phase='idle';metrics.apparitionVisible=metrics.eyesVisible=metrics.glassVisible=false;for(const a of arcs){a.life=0;a.mesh.visible=false;}if(canvas){canvas.style.display='none';ctx?.clearRect(0,0,w,h);}}
  function slash(ev){const a=arcs.find(a=>a.life<=0)||arcs[0];a.life=.30;a.mesh.position.set(ev.x,.28,ev.z);a.mesh.scale.setScalar(ev.range||3.4);a.mesh.rotation.z=-(ev.heading||0)+Math.PI/2;a.mesh.material.opacity=.8;a.mesh.visible=true;metrics.slashes++;}
  function screen(t){if(!ctx)return;const nw=global.innerWidth||800,nh=global.innerHeight||600;if(w!==nw||h!==nh){w=canvas.width=nw;h=canvas.height=nh;}canvas.style.display='block';ctx.clearRect(0,0,w,h);
   const fade=clamp(t/.4)*clamp((3.6-t)/.5);ctx.fillStyle='rgba(3,4,13,'+(.30*fade)+')';ctx.fillRect(0,0,w,h);
   const size=Math.min(w*.27,h*.28),cx=w*.5,cy=h*.35;
   if(t>=1.05&&t<2.25&&eyes.complete){const alpha=clamp((t-1.05)/.2)*clamp((2.25-t)/.22);ctx.save();ctx.globalAlpha=alpha;const ew=Math.min(w*.88,950),eh=ew*eyes.height/eyes.width;ctx.drawImage(eyes,cx-ew/2,cy-eh/2,ew,eh);ctx.restore();}
   if(t>=2.4){const progress=clamp((t-2.4)/.16),alpha=clamp((3.6-t)/.6);ctx.save();ctx.globalAlpha=alpha;const x1=-w*.04,y1=h*.78,x2=w*1.04,y2=h*.26,ex=x1+(x2-x1)*progress,ey=y1+(y2-y1)*progress;ctx.lineCap='round';
    for(const [width,color,blur]of [[16,'#07020a',0],[6,'#ff3654',20],[1.6,'#fff3ef',8]]){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(ex,ey);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.shadowColor='#ff234d';ctx.shadowBlur=blur;ctx.stroke();}
    if(t>2.52&&glass.complete){ctx.shadowBlur=0;ctx.globalAlpha=alpha*clamp((t-2.52)/.12);ctx.drawImage(glass,0,0,w,h);}
    if(t<2.49){ctx.fillStyle='rgba(255,235,235,'+((2.49-t)/.09*.38)+')';ctx.fillRect(0,0,w,h);}
    ctx.restore();
   }
  }
  function update(cast,dt=0){if(disposed)return;for(const a of arcs){a.life=Math.max(0,a.life-dt);a.mesh.visible=a.life>0;a.mesh.material.opacity=a.life/.30*.8;}metrics.activeArcs=arcs.filter(a=>a.life>0).length;
   if(!cast||cast.elapsed<0||cast.elapsed>=3.6){if(id!==null){apparition.visible=false;halo.visible=false;canvas&&(canvas.style.display='none');id=null;metrics.phase='idle';metrics.apparitionVisible=metrics.eyesVisible=metrics.glassVisible=false;}return;}
   if(id!==cast.id){id=cast.id;sounded=false;metrics.casts++;onSound({kind:'scythe',phase:'start',strong:true});}
   const t=cast.elapsed;metrics.phase=t<1.05?'apparition':t<2.25?'red-eyes':t<2.4?'eyes-fade':'glass-cut';
   apparition.visible=t<1.05;halo.visible=apparition.visible;metrics.apparitionVisible=apparition.visible;metrics.eyesVisible=t>=1.05&&t<2.25;metrics.glassVisible=t>=2.4;
   apparitionMaterial.opacity=clamp(t/.18)*clamp((1.05-t)/.18);
   const hero=cast.hero||{x:0,z:0};apparition.position.set(hero.x,3.4+Math.sin(t*2)*.12,hero.z-2);apparition.scale.set(6.4,9.6,1);halo.position.copy(apparition.position);halo.scale.set(10,11.8,1);haloMaterial.opacity=apparitionMaterial.opacity*.9;
   if(t>=2.4&&!sounded){sounded=true;metrics.glassSounds++;onSound({kind:'scythe',phase:'strike',strong:true,final:true,glass:true});}screen(t);
  }
  function dispose(){if(disposed)return;clear();disposed=true;scene.remove(apparition);scene.remove(halo);for(const a of arcs)scene.remove(a.mesh);for(const g of new Set(geometries))g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();canvas?.remove();}
  return{update,slash,clear,dispose,metrics,ready};
 }
 global.PhantomReaperEffects=Object.freeze({create,duration:3.6});
})(globalThis);

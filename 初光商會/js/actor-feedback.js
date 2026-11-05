/* Lightweight canvas billboards: one texture per actor, no GIF downloads or model changes. */
const STATUS={
 question:['?','缺貨了','#fff1cb','#a07024'],confused:['？','找不到商品','#fff1cb','#a07024'],
 impatient:['⌛','等好久','#ffe7b1','#a66b25'],angry:['💢','等太久了！','#ffddd0','#b43c29'],
 happy:['♥','買到了！','#e7f7d8','#437b39'],training:['✦','職能訓練','#e5ecff','#526baf'],
 proud:['★','謝謝主管','#edfae2','#477d36'],stressed:['!','忙不過來','#ffdfd2','#a74832'],
 bored:['Zzz','等客中','#edf1fc','#73758e'],sleep:['☾','休息中','#edf1fc','#73758e'],
 work:['✓','努力工作','#e3f5da','#47723c'],restock:['📦','補貨中','#f1e6d1','#826342'],
 tired:['💤','需要休息','#f4e7e0','#a05e45'],event:['!','事件待處理','#ffe2d6','#ae3928'],
 'event-cashier':['!','收銀事件','#ffe2d6','#ae3928'],'event-stocker':['📦','補貨事件','#fff0d1','#9b5b29'],
 'event-sales':['💬','推銷事件','#ffedda','#9b5b29'],'event-smith':['⚒','鍛造事件','#fff0d1','#9b5b29'],
 'event-warehouse':['📋','庫房事件','#fff0d1','#9b5b29'],'event-security':['⚠','保全事件','#ffe2d6','#ae3928'],
 'event-cleaner':['✧','清潔事件','#e2f8eb','#438466'],'event-host':['♫','迎賓事件','#e8f3ff','#536fb2']
};
export function feedbackBubble(T){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=144;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
 const material=new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}),sprite=new T.Sprite(material);sprite.scale.set(.91,.51,1);sprite.renderOrder=35;sprite.visible=false;let last='';
 return {sprite,update(kind,height,t=0){const item=STATUS[kind];sprite.visible=!!item;if(!item){last='';return;}sprite.position.set(0,height+.87+Math.sin(t*5)*.045,0);
  if(last===kind)return;last=kind;ctx.clearRect(0,0,256,144);
  ctx.shadowColor='#452e2855';ctx.shadowBlur=7;ctx.shadowOffsetY=3;
  ctx.fillStyle=item[2];ctx.strokeStyle=item[3];ctx.lineWidth=6;ctx.beginPath();ctx.roundRect(8,8,240,124,29);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=item[3];ctx.font='900 48px "Noto Sans TC",system-ui,sans-serif';ctx.fillText(item[0],128,57);
  ctx.font='bold 22px "Noto Sans TC",system-ui,sans-serif';ctx.fillText(item[1],128,105);texture.needsUpdate=true;
 },dispose(){texture.dispose();material.dispose();}};
}
export function floatingNotice(T,text,tone='good'){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
 const positive=tone!=='bad',color=tone==='xp'?'#3b64b5':tone==='level'?'#ab7219':positive?'#31764c':'#c74337';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 48px "Noto Sans TC",system-ui,sans-serif';ctx.lineWidth=13;ctx.lineJoin='round';ctx.strokeStyle='#fff9e8';ctx.strokeText(String(text).slice(0,30),256,65,496);ctx.fillStyle=color;ctx.fillText(String(text).slice(0,30),256,65,496);
 const material=new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}),sprite=new T.Sprite(material);sprite.renderOrder=40;sprite.scale.set(1.8,.45,1);
 return {sprite,update(age,height,lane=0){const elapsed=Math.max(0,age);sprite.position.set(0,height+1.16+Math.min(elapsed,2)*.39+lane*.40,0);material.opacity=elapsed<1.2?1:Math.max(0,(2.1-elapsed)/.9);const pulse=1+.08*Math.sin(Math.min(elapsed/.35,1)*Math.PI);sprite.scale.set(1.8*pulse,.45*pulse,1);},dispose(){texture.dispose();material.dispose();}};
}

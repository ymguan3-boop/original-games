/* 大、小魔王不在畫面內時，在畫面邊緣標出方向與距離（洞穴與商會草原副本共用）。 */
const LABEL={boss:'大魔王',elite:'小魔王'};
export function createBossMarkers(T,camera,canvas,doc=globalThis.document){
 if(!doc?.body)return {update(){return 0;},dispose(){}};
 const host=doc.createElement('div');host.id='bossMarkers';host.setAttribute('aria-hidden','true');doc.body.append(host);
 const pool=new Map(),v=new T.Vector3();
 function marker(id,kind){let m=pool.get(id);if(!m){const el=doc.createElement('div');el.className='boss-marker';el.innerHTML='<i>▲</i><b></b><small></small>';host.append(el);m={el,arrow:el.querySelector('i'),name:el.querySelector('b'),dist:el.querySelector('small'),kind:''};pool.set(id,m);}if(m.kind!==kind){m.kind=kind;m.el.dataset.kind=kind;m.name.textContent=LABEL[kind];}return m;}
 function update(run,hero){
  const list=run?.status==='active'?(run.enemies||[]).filter(e=>e.hp>0&&LABEL[e.kind]):[],rect=canvas.getBoundingClientRect(),shown=new Set();
  if(rect.width<2||rect.height<2){for(const m of pool.values())m.el.hidden=true;return 0;}
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,side=Math.min(40,rect.width*.1),top=Math.min(104,rect.height*.16),bottom=Math.min(140,rect.height*.2);
  for(const e of list){
   v.set(e.x,1.2,e.z).project(camera);
   let x=v.x,y=-v.y;const behind=v.z>1;if(behind){x=-x;y=-y;}
   if(!behind&&Math.abs(x)<=.96&&Math.abs(y)<=.96)continue;
   const dx=x*rect.width/2,dy=y*rect.height/2,ang=Math.atan2(dy,dx),limX=rect.width/2-side,limY=dy<0?cy-rect.top-top:rect.bottom-bottom-cy;
   const t=Math.min(Math.abs(dx)>1e-6?limX/Math.abs(dx):Infinity,Math.abs(dy)>1e-6?Math.max(10,limY)/Math.abs(dy):Infinity);
   const m=marker(e.id,e.kind);shown.add(e.id);m.el.hidden=false;
   const half=(m.el.offsetWidth||90)/2+6,hy=(m.el.offsetHeight||24)/2+6;m.el.style.left=Math.min(rect.right-half,Math.max(rect.left+half,cx+dx*t))+'px';m.el.style.top=Math.min(rect.bottom-hy,Math.max(rect.top+hy,cy+dy*t))+'px';
   m.arrow.style.transform='rotate('+(ang*180/Math.PI+90).toFixed(1)+'deg)';
   const meters=Math.round(Math.hypot(e.x-(hero?.x||0),e.z-(hero?.z||0)))+'m';if(m.dist.textContent!==meters)m.dist.textContent=meters;
  }
  for(const [id,m] of pool){if(shown.has(id))continue;if(!list.some(e=>e.id===id)){m.el.remove();pool.delete(id);}else m.el.hidden=true;}
  return shown.size;
 }
 function dispose(){host.remove();pool.clear();}
 return {update,dispose};
}

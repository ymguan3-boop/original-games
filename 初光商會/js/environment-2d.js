/* 2D 店外環境：時段色調、窗戶灑進的陽光、店外的雨雪與季節落葉。
 * 雨雪只下在店外與窗戶上，店內不會淋雨；夜晚與壞天氣整體變暗。 */
export function createEnvironment2D({world,getView}){
 const c=document.createElement('canvas');c.className='world2d-env';world.after(c);const g=c.getContext('2d');let drops=[],last=0,flash=0;
 const spawn=(n,W,H)=>Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,v:.6+Math.random()*.6,s:Math.random()}));
 function draw(env,dt){
  const v=getView();if(!v)return;const r=world.getBoundingClientRect();if(c.width!==Math.round(r.width)||c.height!==Math.round(r.height)){c.width=Math.round(r.width);c.height=Math.round(r.height);drops=[];}
  c.style.left=r.left+'px';c.style.top=r.top+'px';c.style.width=r.width+'px';c.style.height=r.height+'px';
  const W=c.width,H=c.height;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
  const S=(X,Y)=>[v.panX+X*v.scale,v.panY+Y*v.scale];
  /* 窗戶灑進來的光：從窗台往地板斜照，角度隨時間改變 */
  if(env.beams){g.save();for(const w of v.windows){const len=5+env.angle*1.5,[bx,by]=S(w.X,w.Y),ax=w.ax*v.scale,ay=w.ay*v.scale,ix=w.ix*len*v.scale,iy=w.iy*len*v.scale,sh=env.angle*w.ax*1.2*v.scale;const grad=g.createLinearGradient(bx,by,bx+ix,by+iy);grad.addColorStop(0,`rgba(255,205,95,${.36*Math.min(1,env.sun)})`);grad.addColorStop(1,'rgba(255,205,95,0)');g.fillStyle=grad;g.beginPath();g.moveTo(bx-ax,by-ay);g.lineTo(bx+ax,by+ay);g.lineTo(bx+ax+ix+sh,by+ay+iy);g.lineTo(bx-ax+ix+sh,by-ay+iy);g.closePath();g.fill();}g.restore();}
  /* 整體色調 */
  if(env.tintAlpha>0){g.fillStyle=env.tint;g.globalAlpha=Math.min(.6,env.tintAlpha);g.fillRect(0,0,W,H);g.globalAlpha=1;}
  /* 店外的雨、雪、颱風、季節落葉：只畫在店外與窗戶範圍 */
  const kind=env.weather,season=env.season.id,falling=kind==='rain'||kind==='typhoon'||kind==='snow'||season==='autumn'||season==='spring';
  if(falling){const n=kind==='typhoon'?260:kind==='rain'?150:kind==='snow'?90:28;if(drops.length!==n)drops=spawn(n,W,H);
   g.save();g.beginPath();g.rect(0,0,W,H);v.poly.forEach((p,i)=>{const[x,y]=S(p.X,p.Y);i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.clip('evenodd');
   const wind=kind==='typhoon'?7:kind==='rain'?1.5:.6;
   for(const d of drops){d.y+=(kind==='snow'?1.2:kind==='rain'||kind==='typhoon'?9:1.4)*d.v*dt*60;d.x+=wind*d.v*dt*60;if(d.y>H){d.y=-10;d.x=Math.random()*W;}if(d.x>W)d.x-=W;
    if(kind==='rain'||kind==='typhoon'){g.strokeStyle='rgba(190,215,240,.7)';g.lineWidth=1.3;g.beginPath();g.moveTo(d.x,d.y);g.lineTo(d.x-wind*1.6,d.y-12);g.stroke();}
    else if(kind==='snow'){g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(d.x,d.y,1.5+d.s*2,0,7);g.fill();}
    else{g.fillStyle=season==='autumn'?'#e9783b':'#ffc4dc';g.beginPath();g.ellipse(d.x,d.y,3+d.s*2,2,d.y*.05,0,7);g.fill();}}
   g.restore();}
  /* 颱風偶爾閃電 */
  if(kind==='typhoon'){flash=Math.max(0,flash-dt*3);if(Math.random()<dt*.15)flash=1;if(flash>0){g.fillStyle=`rgba(255,255,255,${flash*.35})`;g.fillRect(0,0,W,H);}}
 }
 return {draw,dispose(){c.remove();}};
}

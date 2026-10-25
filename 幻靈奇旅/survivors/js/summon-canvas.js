import {itemArtwork} from './item-pictures.js?v=20261025-v23';
import {ITEMS,WEAPONS} from './inventory.js?v=20261025-v23';
const COLORS = { yellow:'#ffd16a', purple:'#bd75ff', red:'#ff385d' };
const clamp = x => Math.max(0, Math.min(1,x));
const ease = x => 1-Math.pow(1-clamp(x),3);

export function createSummon(stage, rewards, picture, duration) {
  const canvas=stage.querySelector('canvas'), ctx=canvas.getContext('2d',{alpha:false});
  const caption=stage.querySelector('.summon-v07-caption'), progress=stage.querySelector('.summon-v07-progress i');
  let raf=0, disposed=false, paused=false, elapsed=0, previous=null, frame=0, width=1, height=1, phase='';
  const images=[];
  function load(src) { const img=new Image(); img.src=src; images.push(img); return img; }
  const core=load('assets/spirit-core-v06.png'), sky=load('assets/summon-sky-v06.png');
  const atlases={'assets/items-v08.png':load('assets/items-v08.png'),'assets/status-items-v10.png':load('assets/status-items-v10.png')};
  const cards=rewards.map(r=>r.kind==='spirit' ? load(picture(r.id)) : null);
  stage.dataset.duration=String(duration);
  const spirits=rewards.filter(r=>r.kind==='spirit'||r.kind==='weapon'),rarity=spirits.some(r=>r.color==='red')?'red':spirits.some(r=>r.color==='purple')?'purple':spirits.some(r=>r.color==='yellow')?'yellow':'supply',tone=COLORS[rarity]||'#80f6e0';stage.dataset.rarity=rarity;
  const particles=Array.from({length:66},(_,i)=>({angle:i*2.39996,depth:(i*.618034)%1,speed:.12+(i%7)*.025}));
  function resize() { const rect=stage.getBoundingClientRect(); width=Math.max(1,rect.width);height=Math.max(1,rect.height); const dpr=Math.min(1.6,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0); }
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  function imageReady(img) {return img?.complete && img.naturalWidth>0;}
  function glow(x,y,r,color,alpha=1) {ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
  function drawCore(x,y,size,angle,alpha=1) {ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);if(imageReady(core)){ctx.drawImage(core,-size/2,-size/2,size,size);}else{ctx.fillStyle='#b8ffea';ctx.beginPath();ctx.moveTo(0,-size*.4);ctx.lineTo(size*.28,0);ctx.lineTo(0,size*.4);ctx.lineTo(-size*.28,0);ctx.closePath();ctx.fill();}ctx.restore();}
  function setPhase(next,text) {if(phase!==next){phase=next;stage.dataset.phase=next;caption.textContent=text;}}
  function paint(realTime) {
    const t=realTime*7400/duration;
    const seconds=t/1000, revealStart=4450, centerX=width/2, centerY=height*.43;
    ctx.fillStyle='#071d31';ctx.fillRect(0,0,width,height);
    if(imageReady(sky)){const zoom=1.08+.2*Math.sin(Math.min(t/4500,1)*Math.PI/2),scale=Math.max(width/sky.naturalWidth,height/sky.naturalHeight)*zoom;const w=sky.naturalWidth*scale,h=sky.naturalHeight*scale;ctx.globalAlpha=.7;ctx.drawImage(sky,(width-w)/2+Math.sin(seconds*.5)*9,(height-h)/2+seconds*3,w,h);ctx.globalAlpha=1;}
    ctx.fillStyle='rgba(3,16,36,.35)';ctx.fillRect(0,0,width,height);
    if(rarity==='red'||rarity==='purple'){
      const pulse=.34+Math.sin(seconds*4)*.07;glow(centerX,centerY,Math.max(width,height)*.74,tone,pulse);
      ctx.save();ctx.translate(centerX,centerY);ctx.globalCompositeOperation='screen';ctx.rotate(seconds*.45);ctx.fillStyle=tone;
      for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);ctx.globalAlpha=.11+Math.sin(seconds*3+i)*.035;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-width*.035,-height);ctx.lineTo(width*.035,-height);ctx.closePath();ctx.fill();}
      ctx.strokeStyle=tone;ctx.globalAlpha=.5+Math.sin(seconds*5)*.1;ctx.lineWidth=2.5;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,width*(.2+i*.07),height*(.16+i*.05),seconds*.2+i*.6,0,Math.PI*2);ctx.stroke();}ctx.restore();
    }
    const flight=clamp(t/3300);
    // Perspective cloud ribbons expand from the vanishing point toward the viewer.
    for(let i=0;i<7;i++){const z=(i/7+seconds*.19)%1;const spread=z*z;ctx.save();ctx.translate(centerX,centerY);ctx.scale(1,.45);ctx.strokeStyle=`rgba(168,234,245,${.03+z*.12})`;ctx.lineWidth=12+z*20;ctx.beginPath();ctx.ellipse(0,0,30+spread*width,25+spread*height,Math.sin(i)*.1,0,Math.PI*2);ctx.stroke();ctx.restore();}
    for(const p of particles){const z=(p.depth+seconds*p.speed*(t<3500?1.8:.6))%1, radius=12+z*z*Math.max(width,height)*.85;const x=centerX+Math.cos(p.angle)*radius,y=centerY+Math.sin(p.angle)*radius*.8;ctx.strokeStyle=t>2800?tone:'#d0fff6';ctx.globalAlpha=z*.65;ctx.lineWidth=.5+z*1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(p.angle)*z*22,y+Math.sin(p.angle)*z*22);ctx.stroke();}ctx.globalAlpha=1;
    if(t<revealStart){
      setPhase(t<1500?'flight':t<3000?'dive':'resonance',t<1500?'靈舟啟航 · 穿越雲海':t<3000?'靈核俯衝 · 尋找命運的回響':'靈核共鳴 · 光芒即將綻放');
      const arrival=ease((t-500)/2800),x=centerX+Math.sin(seconds*2.4)*(1-arrival)*width*.25,y=height*.15+arrival*height*.28+Math.sin(seconds*3)*5;
      const size=Math.min(width*.46,210)*(.12+arrival*.88);
      glow(x,y,size*.9,tone,.18+.2*arrival);
      ctx.save();ctx.translate(x,y);ctx.rotate(seconds*1.7);ctx.strokeStyle=tone;ctx.globalAlpha=arrival*.8;ctx.lineWidth=2;
      for(let i=0;i<3;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.ellipse(0,0,size*.68,size*.23,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
      for(let i=0;i<4;i++)drawCore(x-(1-arrival)*i*8,y-i*14,size*(1-i*.025),seconds*1.2,.06*(4-i));
      drawCore(x,y,size,seconds*1.2);
      if(t>3650){const burst=clamp((t-3650)/800);glow(centerX,centerY,Math.max(width,height)*burst,tone,Math.sin(burst*Math.PI)*.8);}
    } else {
      setPhase('reveal','命運相遇 · 逐一揭曉獎勵');
      const cols=rewards.length===1?1:rewards.length<=3?rewards.length:5,rows=Math.ceil(rewards.length/cols);
      const cardW=Math.min(rewards.length===1?156:100,(width-24-(cols-1)*6)/cols),cardH=cardW*1.33,gap=6,totalW=cols*cardW+(cols-1)*gap,totalH=rows*cardH+(rows-1)*12;
      let revealed=0;
      rewards.forEach((reward,i)=>{const start=revealStart+i*Math.min(185,1600/Math.max(1,rewards.length-1)),p=clamp((t-start)/480);if(p<=0)return;revealed++;const x=centerX-totalW/2+(i%cols)*(cardW+gap)+cardW/2,y=centerY-totalH/2+Math.floor(i/cols)*(cardH+12)+cardH/2;const color=COLORS[reward.color]||'#80f6e0';
        glow(x,y,cardW*.85,color,.16*ease(p));ctx.save();ctx.translate(x,y+(1-ease(p))*35);ctx.scale(Math.max(.025,Math.sin(p*Math.PI/2)),.8+.2*ease(p));ctx.globalAlpha=ease(p);ctx.fillStyle='#102a3e';ctx.fillRect(-cardW/2,-cardH/2,cardW,cardH);if(imageReady(cards[i])){const img=cards[i],s=Math.max(cardW/img.naturalWidth,cardH/img.naturalHeight);ctx.save();ctx.beginPath();ctx.rect(-cardW/2,-cardH/2,cardW,cardH);ctx.clip();ctx.drawImage(img,-img.naturalWidth*s/2,-img.naturalHeight*s/2,img.naturalWidth*s,img.naturalHeight*s);ctx.restore();}else{const art=itemArtwork(reward.id),atlas=art&&atlases[art.src];if(art&&imageReady(atlas)){const sw=atlas.naturalWidth/art.cols,sh=atlas.naturalHeight/art.rows;ctx.drawImage(atlas,art.col*sw,art.row*sh,sw,sh,-cardW*.46,-cardH*.38,cardW*.92,cardW*.92);stage.dataset.itemArt='ready';}ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.max(8,cardW*.14)}px sans-serif`;ctx.fillText(WEAPONS[reward.id]?.name||ITEMS[reward.id]?.name||(reward.id==='ore'?'洞穴礦石':reward.id),0,cardH*.3,cardW*.94);}ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(-cardW/2,-cardH/2,cardW,cardH);ctx.restore();
      });stage.dataset.revealed=String(revealed);
    }
    stage.dataset.frame=String(++frame);stage.dataset.elapsed=String(Math.round(realTime));progress.style.transform=`scaleX(${clamp(realTime/duration)})`;
  }
  function tick(now) {raf=0;if(disposed)return;if(!stage.isConnected){dispose();return;}if(paused||document.hidden){previous=null;return;}if(previous!==null)elapsed+=Math.min(100,now-previous);previous=now;paint(Math.min(elapsed,duration));if(elapsed>=duration){setPhase('complete','共鳴完成 · 與新的力量相遇');stage.dispatchEvent(new CustomEvent('summoncomplete',{bubbles:true}));return;}raf=requestAnimationFrame(tick);}
  function schedule(){if(!disposed&&!paused&&!document.hidden&&!raf&&elapsed<duration){previous=null;raf=requestAnimationFrame(tick);}}
  function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;previous=null;}else schedule();}
  function pause(value=true){paused=value;if(value){cancelAnimationFrame(raf);raf=0;previous=null;}else schedule();}
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);raf=0;observer.disconnect();document.removeEventListener('visibilitychange',visibility);images.forEach(img=>{img.onload=null;img.onerror=null;});images.length=0;stage.dataset.disposed='true';delete stage._summon;canvas.width=1;canvas.height=1;}
  document.addEventListener('visibilitychange',visibility);paint(0);schedule();
  return {dispose,pause};
}

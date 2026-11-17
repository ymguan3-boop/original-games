import {partStock,partVariants} from './spin-part-inventory.js?v=20261117-parts-v68';
import {SPIN_RULES as R,SPIN_TOPS,SPIN_PARTS,SPIN_GRADES,SPIN_SKILLS,SPIN_STAT_NAMES,SPIN_OPPONENTS,SPIN_VISITOR_REWARD,spinLevelBonus,spinTop,spinPartBonus,spinBonusText} from './spin-arena-config.js?v=20261117-parts-v68';
import {spinState,spinStats,effectiveSpinStats} from './spin-arena-core.js?v=20261117-parts-v68';
import {SPIN_GROWTH} from './spin-arena-progression.js?v=20261117-parts-v68';
import {createSpinBattleView} from './spin-arena-view.js?v=20261117-v67';
import {createSpinAudio,createSpinPresentation} from './spin-arena-presentation.js?v=20261117-v67';
import {spinSkillCooldown} from './spin-arena-paths.js?v=20261117-v67';
export function installSpinArena({game,toast,music=null,onOpen=()=>{}}){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../spin-arena.css?v=20261117-parts-v68',import.meta.url);document.head.append(css);
 const dialog=document.createElement('dialog');dialog.className='spin-arena-dialog';dialog.setAttribute('aria-label','廣場戰鬥陀螺大會');document.body.append(dialog);
 const audio=createSpinAudio();let page='home',selected='flame',selectedSlot='rim',view=null,presentation=null,raf=0,previous=0,accumulator=0,battlePhase='',busy=false,cinematic=null,slowUntil=0;
 const a=()=>spinState(game.state),e=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),name=id=>spinTop(id)?.name||id;
 const art=id=>`./assets/spin-arena/${SPIN_TOPS.findIndex(t=>t.id===id)>=6?'cards-v63':'cards-v61'}/${id}.webp`,img=id=>`<img class="spin-thumb" src="${art(id)}" alt="${e(name(id))}" loading="lazy">`;
 const statsHTML=stats=>{
  const keys=Object.keys(SPIN_STAT_NAMES),max=180,point=(i,value)=>{const angle=-Math.PI/2+i*Math.PI/2;return `${140+Math.cos(angle)*85*value/max},${120+Math.sin(angle)*85*value/max}`;};
  return `<figure class="spin-radar"><svg viewBox="0 0 280 245" role="img" aria-label="能力雷達圖：${keys.map(k=>SPIN_STAT_NAMES[k]+Math.round(stats[k])).join('、')}">${[45,90,135,180].map(v=>`<polygon points="${keys.map((k,i)=>point(i,v)).join(' ')}" class="radar-grid"/>`).join('')}${keys.map((k,i)=>`<line x1="140" y1="120" x2="${point(i,max).split(',')[0]}" y2="${point(i,max).split(',')[1]}" class="radar-grid"/>`).join('')}<polygon class="radar-value" points="${keys.map((k,i)=>point(i,Math.min(max,stats[k]))).join(' ')}"/>${keys.map((k,i)=>{const coords=[[140,18],[247,125],[140,232],[30,125]][i];return `<text x="${coords[0]}" y="${coords[1]}" text-anchor="middle">${SPIN_STAT_NAMES[k]} ${Math.round(stats[k]*10)/10}</text>`;}).join('')}</svg><figcaption>能力雷達圖 · 各軸固定上限 180</figcaption></figure>`;
 };
 const partText=part=>{if(!part)return '本次沒有額外零件';if(typeof part==='string')return `普通${SPIN_PARTS[part]?.name||'零件'}`;return `${SPIN_GRADES[part.grade]?.name||''}${SPIN_PARTS[part.slot]?.name||'零件'}`;};
 function act(type,p={}){if(busy)return {ok:false};busy=true;let r;try{r=game.act(type,p);}finally{busy=false;}if(!r.ok)toast(r.message,true);return r;}
 function release(){presentation?.dispose();presentation=null;view?.dispose();view=null;}
 function syncMusic(){const m=a().match,on=dialog.open&&page==='battle'&&m&&m.phase!=='result'&&!a().soundMuted;if(on){audio.startMusic();music?.suspend(true);}else{audio.stopMusic();music?.suspend(dialog.open&&audio.musicPlaying);}}
 function close(){dialog.close();game.spinArenaPaused=false;document.body.classList.remove('spin-arena-open');cancelAnimationFrame(raf);release();cinematic=null;audio.stop();audio.stopMusic();music?.suspend(false);}
 function navigate(next){release();page=next;render();dialog.scrollTop=0;}
 const nav=()=>[['商店',()=>navigate('store')],['收藏／裝備',()=>navigate('collection')],['選擇對手',()=>navigate('opponents')],['回廣場',close]];
 function card(t,{clickable=false}={}){
  const o=a().owned[t.id],locked=!o&&a().reputation<t.reputation,tag=clickable?'button':'div';
  return `<${tag} class="spin-card ${locked?'locked':''} ${o?'collected':''}" style="--element:#${t.color.toString(16).padStart(6,'0')}" ${clickable?`data-detail="${t.id}"`:''}><span class="spin-card-number">No.${String(SPIN_TOPS.indexOf(t)+1).padStart(2,'0')} · ${t.kind}</span><img src="${art(t.id)}" alt="${e(t.name)}收藏卡" loading="lazy"><strong>${t.name}</strong><span class="spin-card-skill">${t.skill}</span><span class="spin-card-state">${o?`Lv.${o.level} · ${a().equipped===t.id?'出戰中':'已收藏'}`:locked?`聲望 ${t.reputation} 解鎖`:'已解鎖 · 尚未收藏'}</span></${tag}>`;
 }
 const plus=level=>level?` +${level}`:'';
 function partIcon(slot,level=0){return `<span class="spin-part-art" aria-hidden="true"><img src="./assets/spin-arena/parts-v68/${slot}.webp" alt="" width="96" height="96">${level?`<b class="spin-part-plus">+${level}</b>`:''}</span>`;}
 function fittingHTML(t,o){
  const def=SPIN_PARTS[selectedSlot],stock=partVariants(a(),selectedSlot);
  return `<section class="spin-fitting"><h3>零件裝備</h3><small>選擇裝備欄，再從背包搭配。卸下與換裝會保留零件的強化值。</small><div class="spin-equipment">${Object.entries(SPIN_PARTS).map(([slot,d])=>{const item=o.parts[slot];return `<button data-slot="${slot}" class="equipment-slot ${selectedSlot===slot?'selected':''}" style="--grade:${SPIN_GRADES[item?.grade]?.color||'#ad9266'}">${partIcon(slot,item?.enhancement||0)}<strong>${d.name}${plus(item?.enhancement)}</strong><span>${item?SPIN_GRADES[item.grade].name:'空欄位'}</span><small>${item?spinBonusText(spinPartBonus(slot,item.value,item.grade,item.enhancement)):'點選裝備'}</small></button>`;}).join('')}</div><h4>${def.name}背包</h4>${stock.length?`<div class="spin-backpack">${stock.map(({grade,level,count})=>`<article style="--grade:${SPIN_GRADES[grade].color}">${partIcon(selectedSlot,level)}<b>${SPIN_GRADES[grade].name}${def.name}${plus(level)} ×${count}</b><small>選擇這份零件的能力配置</small>${Object.keys(def.choices).map(value=>`<button data-part-fit="${grade}:${value}:${level}" data-top="${t.id}">${def.choices[value]}${plus(level)}<small>${spinBonusText(spinPartBonus(selectedSlot,value,grade,level))}</small></button>`).join('')}</article>`).join('')}</div>`:'<p class="spin-empty-bag">尚未持有可裝備的零件，可透過挑戰取得。</p>'}${o.parts[selectedSlot]?`<button data-unequip="${selectedSlot}" data-top="${t.id}">卸下${def.name}${plus(o.parts[selectedSlot].enhancement)}，放回背包</button>`:''}<small>每強化 +1，該零件原有加成提高 10%，最高 +10；裝備合計仍適用能力加成上限。</small></section>`;
 }
 function fusionHTML(t,o){
  const def=SPIN_PARTS[selectedSlot],item=o.parts[selectedSlot],locked=['battle','strategy','roundResult'].includes(a().match?.phase);
  const options=Object.entries(SPIN_PARTS).map(([slot,d])=>`<button data-slot="${slot}" class="equipment-slot ${selectedSlot===slot?'selected':''}">${partIcon(slot)}<strong>${d.name}</strong></button>`).join('');
  let equipped='';if(item){const level=item.enhancement||0,count=partStock(a(),selectedSlot,item.grade,level);equipped=`<article><h3>已裝備：${SPIN_GRADES[item.grade].name}${def.name}${plus(level)}</h3>${partIcon(selectedSlot,level)}<p>${def.choices[item.value]} · ${spinBonusText(spinPartBonus(selectedSlot,item.value,item.grade,level))}</p><small>背包同款 ${count} 件；消耗 1 件作為材料，保留目前能力配置。</small><button data-fuse="equipped:${item.grade}:${level}:${count}" ${locked||level>=10||count<1?'disabled':''}>${level>=10?'已達 +10 上限':`合成為 +${level+1} · ${spinBonusText(spinPartBonus(selectedSlot,item.value,item.grade,level+1))}`}</button></article>`;}
  const bag=partVariants(a(),selectedSlot).map(({grade,level,count})=>`<article>${partIcon(selectedSlot,level)}<b>${SPIN_GRADES[grade].name}${def.name}${plus(level)} ×${count}</b><small>${level>=10?'已達最高強化值，可直接裝備使用。':`消耗 2 件 → ${SPIN_GRADES[grade].name}${def.name} +${level+1} ×1，能力配置可於裝備時選擇。`}</small><button data-fuse="bag:${grade}:${level}:${count}" ${locked||level>=10||count<2?'disabled':''}>${level>=10?'已達 +10 上限':count<2?'還需要 1 件相同零件':`合成 +${level+1}`}</button></article>`).join('');
  return `<p>兩件同部位、同品質、同強化值零件合成一件。每 +1 提高原有加成 10%，最高 +10。<br>不需金幣，成功率 100%；比賽途中無法合成。</p><div class="spin-equipment">${options}</div><div class="spin-backpack spin-fusion">${equipped}${bag||(!item?'<p class="spin-empty-bag">目前沒有這個部位的零件，可先透過挑戰取得。</p>':'')}</div>`;
 }
 function render(){
  const savedScroll=dialog.scrollTop;release();const s=game.state,state=a();audio.setMuted(state.soundMuted);let title='廣場戰鬥陀螺大會',content='',buttons=nav();
  if(page==='home'){
   const next=SPIN_TOPS.find(t=>!state.owned[t.id]&&state.reputation<t.reputation);
   content=`<p>Lv.3 解鎖 · 三戰兩勝 · 每局打到分出勝負</p><div class="spin-summary">競技聲望 <b>${state.reputation}</b> · 收藏 ${Object.keys(state.owned).length}/${SPIN_TOPS.length}<br>目前出戰：${state.equipped?e(name(state.equipped)):'尚未收藏陀螺'}${next?`<br>下一款：${next.name} · 聲望 ${next.reputation}`:''}</div>${state.visitor?'<button data-visitor-entry class="spin-visitor-banner">外來高手抵達！選擇對手 → 挑戰<br><small>勝利 ${SPIN_VISITOR_REWARD.coins} G · 聲望 +${SPIN_VISITOR_REWARD.rep} · 勝敗都保證給零件</small></button>':''}<p>先收藏烈焰獅王，透過對戰累積聲望，再逐款解鎖。對戰會暫停商會營業。</p><small>今日一般獎金 ${state.daily.coins}/${R.coinCap} G · 一般零件 ${state.daily.parts}/${R.partCap}<br>外來對手保證的零件不受每日上限影響。失敗不扣款、不失去陀螺。</small>`;
  }else if(page==='store'){
   title='廣場陀螺商店';content=`<p>持有 ${Math.floor(s.gold)} G · 競技聲望 ${state.reputation}</p><div class="spin-grid spin-store">${SPIN_TOPS.map(t=>`<article>${card(t)}<button data-buy="${t.id}" ${state.owned[t.id]||state.reputation<t.reputation||s.gold<t.cost?'disabled':''}>${state.owned[t.id]?'已收藏':state.reputation<t.reputation?`聲望 ${t.reputation} 解鎖`:`收藏 ${t.cost} G`}</button></article>`).join('')}</div><details><summary>普通零件補給（每份 100 G）</summary><small>進階與高級零件須由對戰取得。</small><div class="spin-parts">${Object.entries(SPIN_PARTS).map(([k,v])=>`<button data-part-buy="${k}" ${s.gold<100?'disabled':''}>${v.name} · 普通 ${state.parts[k].normal}</button>`).join('')}</div></details>`;
  }else if(page==='collection'){
   title='陀螺收藏冊';content=`<div class="spin-album-heading"><strong>星紋典藏</strong><span>${Object.keys(state.owned).length} / ${SPIN_TOPS.length}</span></div><p>點卡片查看能力、必殺技與零件搭配。</p><div class="spin-album">${SPIN_TOPS.map(t=>card(t,{clickable:true})).join('')}</div>`;
  }else if(page==='detail'){
   const t=spinTop(selected),o=state.owned[t.id],stats=spinStats(t.id,o);title=t.name+' · 收藏卡';
   content=`<div class="spin-detail-card">${card(t)}</div>${statsHTML(stats)}<div class="spin-skill-description"><b>${t.skill}</b><p>${spinBonusText(SPIN_SKILLS[t.id].bonuses)}<br>持續 ${SPIN_SKILLS[t.id].seconds} 秒；先登場轉場與音效，再播放場上特效。</p></div>${o?`<div class="spin-mastery"><b>Lv.${o.level} / 20 · ${o.level>=20?'熟練滿級':`熟練度 ${o.mastery}%`}</b><progress max="100" value="${o.level>=20?100:o.mastery}"></progress><small>勝利 +25%、落敗 +10%；每 100% 升一級，超出進度保留。<br>每級成長：${spinBonusText(SPIN_GROWTH[t.id])}</small></div><div class="spin-parts"><button data-equip="${t.id}" ${state.equipped===t.id?'disabled':''}>${state.equipped===t.id?'出戰中':'裝備出戰'}</button></div>${fittingHTML(t,o)}`:`<p>聲望 ${t.reputation} 解鎖 · 收藏費用 ${t.cost} G</p><button data-buy="${t.id}" ${state.reputation<t.reputation||s.gold<t.cost?'disabled':''}>收藏陀螺</button>`}`;
   buttons=[['返回收藏冊',()=>navigate('collection')],['選擇對手',()=>navigate('opponents')],['回廣場',close],...(o?[['合成',()=>navigate('fusion')]]:[])];
  }else if(page==='fusion'){
   const t=spinTop(selected)||SPIN_TOPS[0],o=state.owned[t.id];title=t.name+' · 零件合成';content=o?fusionHTML(t,o):'<p>請先收藏這顆陀螺。</p>';buttons=[['返回收藏卡',()=>navigate('detail')],['回廣場',close]];
  }else if(page==='opponents'){
   title='選擇對手';const m=state.match,v=state.visitor;
   content=`<p>${state.equipped?`出戰：${e(name(state.equipped))}`:'請先收藏並裝備烈焰獅王。'}</p>${m&&['strategy','battle','roundResult'].includes(m.phase)?'<button data-resume class="spin-resume">▶ 繼續未完成的比賽</button>':''}${v?`<article class="spin-visitor-banner">${img(v.topId)}<h3>${e(v.name)} · 外來高手</h3><p>各項能力至少高於目前出戰配置 12%。<br>勝利獎金 ${SPIN_VISITOR_REWARD.coins} G · 聲望 +${SPIN_VISITOR_REWARD.rep}（不受每日上限）。<br>勝敗都保證進階或高級零件。<br>本場結束後就會離開。</p><button data-opponent="${v.id}" ${!state.equipped||v.status!=='waiting'?'disabled':''}>${v.status==='waiting'?'挑戰外來高手':'挑戰進行中'}</button></article>`:''}<div class="spin-grid">${(state.roster?.entries||[]).map((o,i)=>`<article>${img(o.topId)}<b>${o.name}</b><small>${['新秀','進階','高手'][i]} · ${e(name(o.topId))}</small><small>商會 Lv.${o.shopLevel} · 能力倍率 ${o.scale.toFixed(2)}×</small><p>勝利獎金最多 ${o.reward+spinLevelBonus(s.level)} G${spinLevelBonus(s.level)?`<br><small>含 Lv.${s.level} 加碼 ${spinLevelBonus(s.level)} G</small>`:''}<br>聲望 +${o.rep}</p><button data-opponent="${o.id}" ${!state.equipped?'disabled':''}>挑戰</button></article>`).join('')}</div><details><summary>零件掉落規則</summary><p>一般對手：勝利 65%、落敗 25% 機率獲得一份隨機零件，每日最多 ${R.partCap} 份。高手較容易掉落高級零件。</p><p>外來高手：勝敗都保證一份，進階 55%、高級 45%，輪盤／軸心／外環隨機；勝利固定 ${SPIN_VISITOR_REWARD.coins} G、聲望 +${SPIN_VISITOR_REWARD.rep}；不給首勝來客加成，不受每日上限影響。<br>商會 Lv.4／Lv.5 挑戰一般對手獲勝，另加碼 350 G／600 G（不受每日一般獎金上限）。</p></details>`;
  }else if(page==='battle'){
   const m=state.match;if(!m){page='opponents';render();return;}title=`${name(m.topId)} VS ${m.opponent?.name||SPIN_OPPONENTS.find(o=>o.id===m.opponentId)?.name||'挑戰者'}`;
   if(m.phase==='result'){
    const reward=m.reward||{};content=`<div class="spin-result ${m.won?'win':'lose'}"><h2>${m.won?'勝利！':'下次再挑戰！'}</h2><strong>${m.score.join('：')}</strong><p>獎金 ${reward.coins||0} G · 聲望 +${reward.reputation||0}</p><div class="spin-loot ${reward.part?.grade||''}">${partText(reward.part)}${reward.part?' ×1 · 已入庫':''}</div><p>${m.visitorId?'外來高手已離開，完成勝敗都保證零件。':reward.traffic?`今日來客 +${Math.round(reward.traffic*100)}%`:'沒有扣款、失去陀螺或降低來店率。'}</p><small>熟練度 +${reward.mastery||0}%${reward.levels?` · 升級至 Lv.${reward.level}`:''}，已自動儲存。</small></div>`;buttons=[['再選對手',()=>navigate('opponents')],['收藏／改裝',()=>navigate('collection')],['回廣場',close]];
   }else if(m.phase==='strategy'||m.phase==='roundResult'){
    content=`<p>比分 ${m.score.join('：')} · 第 ${m.round} 局</p>${m.roundResult?`<p>${m.roundResult.tied?'本局平手':m.roundResult.winner===0?'本局獲勝':'對手拿下一局'}：${e(m.roundResult.reason)}</p>`:''}<p>${m.suddenDeath?'連續平局：進入一勝決勝！下一位勝出的選手直接贏得整場。':'每局能量、耐久重置。'}請選擇策略：</p><p>攻擊：撞擊較強、旋轉消耗較快。<br>防禦：減傷與守護。<br>平衡：維持原本能力。</p>`;
    buttons=[...['attack','defense','balance'].map((strategy,i)=>[['攻擊出戰','防禦出戰','平衡出戰'][i],()=>{const r=act('spinLaunch',{strategy,round:m.round,expectedPhase:m.phase});if(r.ok){battlePhase='';render();}}]),['暫存離開',close]];
   }else{
    content=`<div class="spin-bars"><div><b>${name(m.topId)}</b><span data-player></span><small data-buff="0"></small></div><div><b>${name(m.opponentTopId)}</b><span data-enemy></span><small data-buff="1"></small></div></div><p class="spin-score" data-score></p><div class="spin-battle-stage"><canvas class="spin-battle-canvas" aria-label="3D 戰鬥陀螺競技場"></canvas></div><small>技能依各陀螺「速」的冷卻時間自動施放（速越高冷卻越短）。登場演出時戰鬥暫停。比賽持續到出界、耐久或旋轉能量歸零才分勝負；按「快轉」直接看本局結果。</small>`;
    buttons=[['快轉 ▶▶',()=>{if(cinematic)return;cinematic=null;const r=act('spinFastForward');if(r.ok){battlePhase='';render();}}],['鏡頭：斜俯視',()=>{dialog.querySelector('[data-action="1"]').textContent='鏡頭：'+view.changeCamera();}],['縮放',()=>view.zoom()],['暫存離開',close]];
   }
  }
  dialog.classList.toggle('spin-battle-mode',page==='battle'&&a().match?.phase==='battle');
  dialog.innerHTML=`<header><strong>${e(title)}</strong><button class="spin-sound" data-sound aria-label="${state.soundMuted?'開啟':'關閉'}陀螺音效">${state.soundMuted?'♪×':'♪'}</button><button data-close aria-label="關閉戰鬥陀螺大會">×</button></header><main>${content}</main><footer>${buttons.map(([label],i)=>`<button data-action="${i}" ${label==='選擇對手'&&state.visitor?.status==='waiting'?'class="has-notice" title="外來高手等待挑戰"':''}>${e(label)}</button>`).join('')}</footer>`;
  dialog.querySelector('[data-close]').onclick=close;
  dialog.querySelector('[data-sound]').onclick=()=>{audio.unlock();const muted=!a().soundMuted;act('spinSound',{muted});audio.setMuted(muted);const button=dialog.querySelector('[data-sound]');if(!muted)audio.play(a().equipped||'flame');button.textContent=muted?'♪×':'♪';button.setAttribute('aria-label',(muted?'開啟':'關閉')+'陀螺音效');syncMusic();};
  dialog.querySelectorAll('[data-action]').forEach(b=>b.onclick=buttons[+b.dataset.action][1]);
  dialog.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{selected=b.dataset.detail;navigate('detail');});
  dialog.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{act('spinBuy',{topId:b.dataset.buy});render();});
  dialog.querySelectorAll('[data-part-buy]').forEach(b=>b.onclick=()=>{act('spinBuyPart',{slot:b.dataset.partBuy});render();});
  dialog.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{act('spinEquip',{topId:b.dataset.equip});render();});
  dialog.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{selectedSlot=b.dataset.slot;render();});
  dialog.querySelectorAll('[data-part-fit]').forEach(b=>b.onclick=()=>{const [grade,value,enhancement]=b.dataset.partFit.split(':');act('spinPart',{topId:b.dataset.top,slot:selectedSlot,grade,value,enhancement:Number(enhancement)});render();});
  dialog.querySelectorAll('[data-fuse]').forEach(b=>b.onclick=()=>{const [source,grade,level,count]=b.dataset.fuse.split(':');const r=act('spinFusePart',{topId:selected,slot:selectedSlot,grade,enhancement:Number(level),source,expectedCount:Number(count)});if(r.ok)toast(r.message);render();});
  dialog.querySelectorAll('[data-unequip]').forEach(b=>b.onclick=()=>{act('spinUnequip',{topId:b.dataset.top,slot:b.dataset.unequip});render();});
  dialog.querySelectorAll('[data-opponent]').forEach(b=>b.onclick=()=>{if(act('spinStart',{opponentId:b.dataset.opponent}).ok)navigate('battle');});
  const resume=dialog.querySelector('[data-resume]');if(resume)resume.onclick=()=>navigate('battle');
  const visitorEntry=dialog.querySelector('[data-visitor-entry]');if(visitorEntry)visitorEntry.onclick=()=>navigate('opponents');
  const canvas=dialog.querySelector('canvas');if(canvas){view=createSpinBattleView(canvas,{level:s.level,lowPower:(navigator.hardwareConcurrency||8)<=4});presentation=createSpinPresentation(dialog.querySelector('.spin-battle-stage'),audio);battlePhase=a().match.phase;view.render(a().match,performance.now()/1000);presentation.update(a().match);}
  dialog.scrollTop=savedScroll;syncMusic();
 }
 function frame(now){
  if(!dialog.open)return;const dt=previous?Math.min(.1,(now-previous)/1000):0;previous=now;
  /* 敗北特寫：本局已分出勝負，先演出（停轉倒下／撞飛出場）再切到結果頁；不再推進模擬 */
  if(cinematic&&view){cinematic.t+=dt;const m=a().match;if(m)view.render(m,now/1000,cinematic);if(cinematic.t>=cinematic.length){cinematic=null;render();}raf=requestAnimationFrame(frame);return;}
  if(page==='battle'&&a().match?.phase==='battle'&&!document.hidden){
   accumulator+=dt*(slowUntil>now?.35:1);if(accumulator>=.1){act('spinAdvance',{seconds:accumulator});accumulator=0;}
   const m=a().match;if(m.phase!==battlePhase){const rr=m.roundResult;if(view&&rr&&!m.fastForward&&battlePhase==='battle'){cinematic={t:0,loser:rr.loser,cause:rr.cause,vx:rr.loserVelocity?.x||0,vz:rr.loserVelocity?.z||0,length:rr.tied?.9:rr.cause==='out'?2.1:rr.cause==='burst'?2.6:2.3};if(rr.cause==='burst')audio.crit(true);battlePhase=m.phase;const label=dialog.querySelector('[data-score]');if(label)label.textContent=rr.tied?'同時出局！':(rr.loser===0?'我方':'對手')+(rr.cause==='burst'?'被暴擊爆裂':rr.cause==='out'?'被撞飛出場':'停止旋轉')+'！';const ff=dialog.querySelector('[data-action="0"]');if(ff)ff.disabled=true;}else render();}
   else{
    const out=view.render(m,now/1000);if(out?.slow)slowUntil=now+300;presentation.update(m,accumulator);
    for(const [k,i] of [['player',0],['enemy',1]]){
     const b=m.bodies[i],stats=effectiveSpinStats(b,m.time),cd=spinSkillCooldown(stats.speed),left=Math.max(0,(100-b.energy)/100*cd);dialog.querySelector(`[data-${k}]`).textContent=`旋轉 ${Math.ceil(b.spin)}% · 耐久 ${Math.ceil(b.hp)}% · 技能 ${b.energy>=100?'施放！':left.toFixed(1)+'秒'}`;
     dialog.querySelector(`[data-buff="${i}"]`).textContent=b.buffUntil>m.time?`${spinTop(i?m.opponentTopId:m.topId).skill}：${spinBonusText(SPIN_SKILLS[b.skillId].bonuses)} · ${(b.buffUntil-m.time).toFixed(1)}秒`:`攻${Math.round(stats.attack)} 防${Math.round(stats.defense)} 速${Math.round(stats.speed)}（冷卻 ${cd.toFixed(1)} 秒） 持${Math.round(stats.stamina)}`;
    }
    dialog.querySelector('[data-score]').textContent=`比分 ${m.score.join('：')} · 第 ${m.round} 局 · ${Math.floor(m.time)} 秒${m.suddenDeath?' · 一勝決勝':''}${m.cutin?' · 技能登場':''}`;
   }
  }
  raf=requestAnimationFrame(frame);
 }
 function open(){if(game.state.level<R.unlock){toast('戰鬥陀螺大會於 Lv.3 解鎖');return;}onOpen();act('spinRoster');audio.unlock();game.spinArenaPaused=true;document.body.classList.add('spin-arena-open');page='home';render();dialog.showModal();previous=0;accumulator=0;raf=requestAnimationFrame(frame);}
 dialog.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});dialog.addEventListener('keydown',()=>audio.unlock());dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});window.addEventListener('pagehide',()=>{close();audio.dispose();},{once:true});
 const entry=document.createElement('button');entry.type='button';entry.className='spin-arena-entry';entry.textContent='戰鬥陀螺大會';entry.onclick=open;document.querySelector('#quick-menu .quick-menu-items')?.append(entry);
 const sync=()=>{entry.hidden=game.state.level<R.unlock;const waiting=game.state.spinArena?.visitor?.status==='waiting';entry.classList.toggle('has-notice',!!waiting);entry.title=waiting?'外來高手等待挑戰':'';};game.subscribe(sync);sync();
 return {open,close,dialog,get view(){return view;},get audio(){return audio.metrics;}};
}

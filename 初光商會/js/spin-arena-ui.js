import {SPIN_RULES as R,SPIN_TOPS,SPIN_PARTS,SPIN_GRADES,SPIN_SKILLS,SPIN_STAT_NAMES,SPIN_OPPONENTS,spinTop,spinPartBonus,spinBonusText} from './spin-arena-config.js?v=20261115-v61';
import {spinState,spinStats,effectiveSpinStats} from './spin-arena-core.js?v=20261115-v61';
import {createSpinBattleView} from './spin-arena-view.js?v=20261115-v61';
import {createSpinAudio,createSpinPresentation} from './spin-arena-presentation.js?v=20261115-v61';
export function installSpinArena({game,toast,onOpen=()=>{}}){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../spin-arena.css?v=20261115-v61',import.meta.url);document.head.append(css);
 const dialog=document.createElement('dialog');dialog.className='spin-arena-dialog';dialog.setAttribute('aria-label','廣場戰鬥陀螺大會');document.body.append(dialog);
 const audio=createSpinAudio();let page='home',selected='flame',view=null,presentation=null,raf=0,previous=0,accumulator=0,battlePhase='',busy=false;
 const a=()=>spinState(game.state),e=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),name=id=>spinTop(id)?.name||id;
 const art=id=>`./assets/spin-arena/cards-v61/${id}.webp`,img=id=>`<img class="spin-thumb" src="${art(id)}" alt="${e(name(id))}" loading="lazy">`;
 const statsHTML=stats=>`<div class="spin-stat-grid">${Object.entries(SPIN_STAT_NAMES).map(([k,label])=>`<span>${label}<b>${Math.round(stats[k]*10)/10}</b></span>`).join('')}</div>`;
 const partText=part=>{if(!part)return '本次沒有額外零件';if(typeof part==='string')return `普通${SPIN_PARTS[part]?.name||'零件'}`;return `${SPIN_GRADES[part.grade]?.name||''}${SPIN_PARTS[part.slot]?.name||'零件'}`;};
 function act(type,p={}){if(busy)return {ok:false};busy=true;let r;try{r=game.act(type,p);}finally{busy=false;}if(!r.ok)toast(r.message,true);return r;}
 function release(){presentation?.dispose();presentation=null;view?.dispose();view=null;}
 function close(){dialog.close();game.spinArenaPaused=false;document.body.classList.remove('spin-arena-open');cancelAnimationFrame(raf);release();audio.stop();}
 function navigate(next){release();page=next;render();dialog.scrollTop=0;}
 const nav=()=>[['商店',()=>navigate('store')],['收藏／裝備',()=>navigate('collection')],['選擇對手',()=>navigate('opponents')],['回廣場',close]];
 function card(t,{clickable=false}={}){
  const o=a().owned[t.id],locked=!o&&a().reputation<t.reputation,tag=clickable?'button':'div';
  return `<${tag} class="spin-card ${locked?'locked':''} ${o?'collected':''}" style="--element:#${t.color.toString(16).padStart(6,'0')}" ${clickable?`data-detail="${t.id}"`:''}><span class="spin-card-number">No.${String(SPIN_TOPS.indexOf(t)+1).padStart(2,'0')} · ${t.kind}</span><img src="${art(t.id)}" alt="${e(t.name)}收藏卡" loading="lazy"><strong>${t.name}</strong><span class="spin-card-skill">${t.skill}</span><span class="spin-card-state">${o?`Lv.${o.level} · ${a().equipped===t.id?'出戰中':'已收藏'}`:locked?`聲望 ${t.reputation} 解鎖`:'已解鎖 · 尚未收藏'}</span></${tag}>`;
 }
 function inventoryHTML(){return `<div class="spin-part-stock">${Object.entries(SPIN_PARTS).map(([slot,def])=>`<div><b>${def.name}</b>${Object.entries(SPIN_GRADES).map(([grade,g])=>`<span style="color:${g.color}">${g.name} ${a().parts[slot][grade]}</span>`).join('')}</div>`).join('')}</div>`;}
 function fittingHTML(t,o){return `<section class="spin-fitting"><h3>零件工坊</h3><small>輪盤、軸心、外環各裝一份。換裝會歸還舊零件；比賽途中不能更換。</small>${Object.entries(SPIN_PARTS).map(([slot,def])=>{const current=o.parts[slot];return `<label>${def.name}<small>${current?`${SPIN_GRADES[current.grade].name} · ${spinBonusText(spinPartBonus(slot,current.value,current.grade))}`:'尚未安裝'}</small><select data-slot="${slot}" data-top="${t.id}"><option value="">選擇零件等級與搭配</option>${Object.entries(SPIN_GRADES).flatMap(([grade,g])=>Object.keys(def.choices).map(value=>`<option value="${grade}:${value}" ${a().parts[slot][grade]===0?'disabled':''}>${g.name} · ${spinBonusText(spinPartBonus(slot,value,grade))} · 庫存${a().parts[slot][grade]}</option>`)).join('')}</select></label>`;}).join('')}${inventoryHTML()}<details><summary>三級零件加成</summary><p>普通：主能力 +8%、副能力 +2%。<br>進階：主能力 +14%、副能力 +4%。<br>高級：主能力 +22%、副能力 +6%。</p><p>強化、熟練度與零件的單項常駐加成合計上限 +80%；必殺技另計。</p></details></section>`;}
 function render(){
  const savedScroll=dialog.scrollTop;release();const s=game.state,state=a();audio.setMuted(state.soundMuted);let title='廣場戰鬥陀螺大會',content='',buttons=nav();
  if(page==='home'){
   const next=SPIN_TOPS.find(t=>!state.owned[t.id]&&state.reputation<t.reputation);
   content=`<p>Lv.3 解鎖 · 三戰兩勝 · 每局 45 秒</p><div class="spin-summary">競技聲望 <b>${state.reputation}</b> · 收藏 ${Object.keys(state.owned).length}/6<br>目前出戰：${state.equipped?e(name(state.equipped)):'尚未收藏陀螺'}${next?`<br>下一款：${next.name} · 聲望 ${next.reputation}`:''}</div>${state.visitor?'<button data-visitor-entry class="spin-visitor-banner">外來高手抵達！選擇對手 → 挑戰<br><small>勝敗都保證給零件，不增加聲望</small></button>':''}<p>先收藏烈焰獅王，透過對戰累積聲望，再逐款解鎖。對戰會暫停商會營業。</p><small>今日一般獎金 ${state.daily.coins}/${R.coinCap} G · 一般零件 ${state.daily.parts}/${R.partCap}<br>外來對手保證的零件不受每日上限影響。失敗不扣款、不失去陀螺。</small>`;
  }else if(page==='store'){
   title='廣場陀螺商店';content=`<p>持有 ${Math.floor(s.gold)} G · 競技聲望 ${state.reputation}</p><div class="spin-grid spin-store">${SPIN_TOPS.map(t=>`<article>${card(t)}<button data-buy="${t.id}" ${state.owned[t.id]||state.reputation<t.reputation||s.gold<t.cost?'disabled':''}>${state.owned[t.id]?'已收藏':state.reputation<t.reputation?`聲望 ${t.reputation} 解鎖`:`收藏 ${t.cost} G`}</button></article>`).join('')}</div><details><summary>普通零件補給（每份 100 G）</summary><small>進階與高級零件須由對戰取得。</small><div class="spin-parts">${Object.entries(SPIN_PARTS).map(([k,v])=>`<button data-part-buy="${k}" ${s.gold<100?'disabled':''}>${v.name} · 普通 ${state.parts[k].normal}</button>`).join('')}</div></details>`;
  }else if(page==='collection'){
   title='陀螺收藏冊';content=`<div class="spin-album-heading"><strong>星紋典藏</strong><span>${Object.keys(state.owned).length} / 6</span></div><p>點卡片查看能力、必殺技與零件搭配。</p><div class="spin-album">${SPIN_TOPS.map(t=>card(t,{clickable:true})).join('')}</div>`;
  }else if(page==='detail'){
   const t=spinTop(selected),o=state.owned[t.id],stats=spinStats(t.id,o);title=t.name+' · 收藏卡';
   content=`<div class="spin-detail-card">${card(t)}</div>${statsHTML(stats)}<div class="spin-skill-description"><b>${t.skill}</b><p>${spinBonusText(SPIN_SKILLS[t.id].bonuses)}<br>持續 ${SPIN_SKILLS[t.id].seconds} 秒；先登場轉場與音效，再播放場上特效。</p></div>${o?`<p>熟練度 ${o.mastery}/100 · 強化 Lv.${o.level}/5</p><div class="spin-parts"><button data-equip="${t.id}" ${state.equipped===t.id?'disabled':''}>${state.equipped===t.id?'出戰中':'裝備出戰'}</button><button data-upgrade="${t.id}" ${o.level>=5?'disabled':''}>${o.level>=5?'強化已滿':`強化 ${[0,80,120,180,260][o.level]} G`}</button></div>${fittingHTML(t,o)}`:`<p>聲望 ${t.reputation} 解鎖 · 收藏費用 ${t.cost} G</p><button data-buy="${t.id}" ${state.reputation<t.reputation||s.gold<t.cost?'disabled':''}>收藏陀螺</button>`}`;
   buttons=[['返回收藏冊',()=>navigate('collection')],['選擇對手',()=>navigate('opponents')],['回廣場',close]];
  }else if(page==='opponents'){
   title='選擇對手';const m=state.match,v=state.visitor;
   content=`<p>${state.equipped?`出戰：${e(name(state.equipped))}`:'請先收藏並裝備烈焰獅王。'}</p>${m&&['strategy','battle','roundResult'].includes(m.phase)?'<button data-resume>繼續未完成的比賽</button>':''}${v?`<article class="spin-visitor-banner">${img(v.topId)}<h3>${e(v.name)} · 外來高手</h3><p>各項能力至少高於目前出戰配置 12%。<br>勝敗保證進階或高級零件，聲望 +0。<br>本場結束後就會離開。</p><button data-opponent="${v.id}" ${!state.equipped||v.status!=='waiting'?'disabled':''}>${v.status==='waiting'?'挑戰外來高手':'挑戰進行中'}</button></article>`:''}<div class="spin-grid">${SPIN_OPPONENTS.map((o,i)=>`<article>${img(o.topId)}<b>${o.name}</b><small>${['新秀','進階','高手'][i]} · ${e(name(o.topId))}</small><p>勝利獎金最多 ${o.reward} G<br>聲望 +${o.rep}</p><button data-opponent="${o.id}" ${!state.equipped?'disabled':''}>挑戰</button></article>`).join('')}</div><details><summary>零件掉落規則</summary><p>一般對手：勝利 65%、落敗 25% 機率獲得一份隨機零件，每日最多 ${R.partCap} 份。高手較容易掉落高級零件。</p><p>外來高手：勝敗都保證一份，進階 55%、高級 45%，輪盤／軸心／外環隨機；不給聲望與首勝來客加成，不受一般零件每日上限影響。</p></details>`;
  }else if(page==='battle'){
   const m=state.match;if(!m){page='opponents';render();return;}title=`${name(m.topId)} VS ${m.opponent?.name||SPIN_OPPONENTS.find(o=>o.id===m.opponentId)?.name||'挑戰者'}`;
   if(m.phase==='result'){
    const reward=m.reward||{};content=`<div class="spin-result ${m.won?'win':'lose'}"><h2>${m.won?'勝利！':'下次再挑戰！'}</h2><strong>${m.score.join('：')}</strong><p>獎金 ${reward.coins||0} G · 聲望 +${reward.reputation||0}</p><div class="spin-loot ${reward.part?.grade||''}">${partText(reward.part)}${reward.part?' ×1 · 已入庫':''}</div><p>${m.visitorId?'外來高手已離開，完成勝敗都保證零件。':reward.traffic?`今日來客 +${Math.round(reward.traffic*100)}%`:'沒有扣款、失去陀螺或降低來店率。'}</p><small>熟練度 +${m.won?5:1}，已自動儲存。</small></div>`;buttons=[['再選對手',()=>navigate('opponents')],['收藏／改裝',()=>navigate('collection')],['回廣場',close]];
   }else if(m.phase==='strategy'||m.phase==='roundResult'){
    content=`<p>比分 ${m.score.join('：')} · 第 ${m.round} 局</p>${m.roundResult?`<p>${m.roundResult.tied?'本局平手':m.roundResult.winner===0?'本局獲勝':'對手拿下一局'}：${e(m.roundResult.reason)}</p>`:''}<p>每局能量、耐久重置。請選擇策略：</p><p>攻擊：撞擊較強、旋轉消耗較快。<br>防禦：減傷與守護。<br>平衡：維持原本能力。</p>`;
    buttons=[...['attack','defense','balance'].map((strategy,i)=>[['攻擊出戰','防禦出戰','平衡出戰'][i],()=>{const r=act('spinLaunch',{strategy,round:m.round,expectedPhase:m.phase});if(r.ok){battlePhase='';render();}}]),['暫存離開',close]];
   }else{
    content=`<div class="spin-bars"><div><b>${name(m.topId)}</b><span data-player></span><small data-buff="0"></small></div><div><b>${name(m.opponentTopId)}</b><span data-enemy></span><small data-buff="1"></small></div></div><p class="spin-score" data-score></p><div class="spin-battle-stage"><canvas class="spin-battle-canvas" aria-label="3D 戰鬥陀螺競技場"></canvas></div><small>必殺技滿 100 才能施放。登場演出時戰鬥暫停；加成持續數秒。出界、耐久或旋轉能量歸零即敗。</small>`;
    buttons=[['必殺技',()=>act('spinSkill')],['鏡頭：斜俯視',()=>{dialog.querySelector('[data-action="1"]').textContent='鏡頭：'+view.changeCamera();}],['縮放',()=>view.zoom()],['暫存離開',close]];
   }
  }
  dialog.innerHTML=`<header><strong>${e(title)}</strong><button class="spin-sound" data-sound aria-label="${state.soundMuted?'開啟':'關閉'}陀螺音效">${state.soundMuted?'♪×':'♪'}</button><button data-close aria-label="關閉戰鬥陀螺大會">×</button></header><main>${content}</main><footer>${buttons.map(([label],i)=>`<button data-action="${i}" ${label==='選擇對手'&&state.visitor?.status==='waiting'?'class="has-notice" title="外來高手等待挑戰"':''}>${e(label)}</button>`).join('')}</footer>`;
  dialog.querySelector('[data-close]').onclick=close;
  dialog.querySelector('[data-sound]').onclick=()=>{audio.unlock();const muted=!a().soundMuted;act('spinSound',{muted});audio.setMuted(muted);const button=dialog.querySelector('[data-sound]');button.textContent=muted?'♪×':'♪';button.setAttribute('aria-label',(muted?'開啟':'關閉')+'陀螺音效');};
  dialog.querySelectorAll('[data-action]').forEach(b=>b.onclick=buttons[+b.dataset.action][1]);
  dialog.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{selected=b.dataset.detail;navigate('detail');});
  dialog.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{act('spinBuy',{topId:b.dataset.buy});render();});
  dialog.querySelectorAll('[data-part-buy]').forEach(b=>b.onclick=()=>{act('spinBuyPart',{slot:b.dataset.partBuy});render();});
  dialog.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{act('spinEquip',{topId:b.dataset.equip});render();});
  dialog.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const topId=b.dataset.upgrade;act('spinUpgrade',{topId,expectedLevel:a().owned[topId].level});render();});
  dialog.querySelectorAll('select[data-slot]').forEach(select=>select.onchange=()=>{if(select.value){const [grade,value]=select.value.split(':');act('spinPart',{topId:select.dataset.top,slot:select.dataset.slot,grade,value});render();}});
  dialog.querySelectorAll('[data-opponent]').forEach(b=>b.onclick=()=>{if(act('spinStart',{opponentId:b.dataset.opponent}).ok)navigate('battle');});
  const resume=dialog.querySelector('[data-resume]');if(resume)resume.onclick=()=>navigate('battle');
  const visitorEntry=dialog.querySelector('[data-visitor-entry]');if(visitorEntry)visitorEntry.onclick=()=>navigate('opponents');
  const canvas=dialog.querySelector('canvas');if(canvas){view=createSpinBattleView(canvas,{level:s.level});presentation=createSpinPresentation(dialog.querySelector('.spin-battle-stage'),audio);battlePhase=a().match.phase;view.render(a().match,performance.now()/1000);presentation.update(a().match);}
  dialog.scrollTop=savedScroll;
 }
 function frame(now){
  if(!dialog.open)return;const dt=previous?Math.min(.1,(now-previous)/1000):0;previous=now;
  if(page==='battle'&&a().match?.phase==='battle'&&!document.hidden){
   accumulator+=dt;if(accumulator>=.1){act('spinAdvance',{seconds:accumulator});accumulator=0;}
   const m=a().match;if(m.phase!==battlePhase)render();else{
    view.render(m,now/1000);presentation.update(m,accumulator);
    for(const [k,i] of [['player',0],['enemy',1]]){
     const b=m.bodies[i],stats=effectiveSpinStats(b,m.time);dialog.querySelector(`[data-${k}]`).textContent=`旋轉 ${Math.ceil(b.spin)}% · 耐久 ${Math.ceil(b.hp)}%`;
     dialog.querySelector(`[data-buff="${i}"]`).textContent=b.buffUntil>m.time?`${spinBonusText(SPIN_SKILLS[b.skillId].bonuses)} · ${(b.buffUntil-m.time).toFixed(1)}秒`:`攻${Math.round(stats.attack)} 防${Math.round(stats.defense)} 速${Math.round(stats.speed)} 持${Math.round(stats.stamina)}`;
    }
    dialog.querySelector('[data-score]').textContent=`比分 ${m.score.join('：')} · 第 ${m.round} 局 · ${Math.ceil(R.roundSeconds-m.time)} 秒${m.cutin?' · 技能登場':''}`;
    const skill=dialog.querySelector('[data-action="0"]');skill.disabled=m.bodies[0].energy<100||!!m.cutin;skill.textContent=m.cutin?'登場演出中':m.bodies[0].energy>=100?spinTop(m.topId).skill+'！':`必殺技 ${Math.floor(m.bodies[0].energy)}%`;
   }
  }
  raf=requestAnimationFrame(frame);
 }
 function open(){if(game.state.level<R.unlock){toast('戰鬥陀螺大會於 Lv.3 解鎖');return;}onOpen();game.spinArenaPaused=true;document.body.classList.add('spin-arena-open');page='home';render();dialog.showModal();previous=0;accumulator=0;raf=requestAnimationFrame(frame);}
 dialog.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});window.addEventListener('pagehide',()=>{close();audio.dispose();},{once:true});
 const entry=document.createElement('button');entry.type='button';entry.className='spin-arena-entry';entry.textContent='戰鬥陀螺大會';entry.onclick=open;document.querySelector('#quick-menu .quick-menu-items')?.append(entry);
 const sync=()=>{entry.hidden=game.state.level<R.unlock;const waiting=game.state.spinArena?.visitor?.status==='waiting';entry.classList.toggle('has-notice',!!waiting);entry.title=waiting?'外來高手等待挑戰':'';};game.subscribe(sync);sync();
 return {open,close,dialog,get view(){return view;},get audio(){return audio.metrics;}};
}

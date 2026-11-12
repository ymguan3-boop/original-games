import {isMerchantMeadow} from './merchant-meadow.js?v=20261111-meadow-v3';
import {autoPotionLearned,rememberAutoPotionLesson} from './tutorial-progress.js?v=20261112-guide-v33';
export function createCaveTutorial(api){
 rememberAutoPotionLesson(api.store);
 const qa=new URLSearchParams(location.search).has('qa'),saved=api.store.state,firstVisit=!qa&&!(saved.tutorial?.firstVisitSeen||saved.starterClaimed||saved.run||saved.history?.length);
 const sheet=document.createElement('aside');sheet.id='caveTutorial';sheet.hidden=true;sheet.setAttribute('role','region');sheet.setAttribute('aria-label','副本操作教學');document.body.append(sheet);
 const focus=document.createElement('div');focus.id='tutorialFocus';focus.hidden=true;document.body.append(focus);let phase='',index=0;
 /* 只引導到玩家成功勾選；門檻可自行調整，不要求固定 40%。 */
 const ensurePotion=()=>{if((api.store.state.inventory?.potion||0)<1)api.store.transact(api.store.newId('tutorial-potion'),s=>{s.inventory||={};s.inventory.potion=1;});};
 const potionOn=()=>!!api.store.state.autoItems?.potion?.enabled;
 const healSteps=[
  {title:'打開道具背包',text:'已打開「道具／暫停」背包，亮框內是治療藥水。若沒有藥水，會先補給你 1 瓶。',target:'[data-bag-item=potion]',open:()=>{ensurePotion();api.bag();}},
  {title:'勾選自動使用',text:'勾選亮框內的「自動使用」即可完成設定。血量門檻可自行調整；成功勾選後，往後不會再自動提示這段教學。',target:'[data-auto-item=potion] label',open:()=>{ensurePotion();if(!document.querySelector('[data-auto-item=potion]'))api.bag();},ready:potionOn}
 ];

 const steps={lobby:isMerchantMeadow?[
  {title:'商會武器採集',text:'首次進入會帶入洞穴收藏。每波 24 秒，共 10 波；草原戰局獨立保存。',target:'#start'},
  {title:'拾取才能帶回',text:'擊倒魔物後，走近拾取武器商品。小魔王、大魔王可掉落高價限定武器；從背包點「帶回商會」即可返回販售。',target:'#returnTown'},
  {title:'出發與自動補血',text:'編組三位幻靈後出發。首次入場會協助勾選自動補血；設定成功後不再重複，之後可從背包自行調整。',target:'#start'}
 ]:[
  {title:'移動與戰鬥',text:'電腦用 WASD 或方向鍵移動、Space 翻滾；手機拖曳搖桿移動，點右側按鈕翻滾、投球與施放大絕。',target:'#start'},
  {title:'準備夥伴',text:'首次免費召喚三位不同的基礎幻靈，再編入三位夥伴出發。',target:'#start'},
  {title:'購買補給',text:'商店購買治療藥水；首次入場會引導勾選自動補血，觸發門檻可自行調整。',target:'#shopTabs',open:()=>api.shop()},
  {title:'準備出發',text:'編好三位夥伴後開始挑戰。重整可續戰，永久收藏保留。',target:'#start',open:()=>api.close()}
 ],heal:healSteps,combat:[
  {title:'移動與翻滾',text:'拖曳搖桿移動。只有小魔王與大魔王會施放大絕，地面紅圈亮起後至少有 1.25 秒可移動或翻滾離開；小怪只有普攻。',target:'#joystick',open:()=>api.close()},...healSteps,
  {title:'確認補血庫存',text:'自動補血每次會消耗藥水。庫存為 0 時不會補血，請到補給商店購買；設定會跨局保留。',target:'[data-auto-item=potion]',open:()=>api.bag()},
  {title:isMerchantMeadow?'武器採集與返回':'武器與寵物',text:isMerchantMeadow?'走近掉落武器即可收進採集袋。背包按「帶回商會」返回，上架武器櫃販售；未拾取的物品仍留在戰場。':'點武器按鈕換裝、點寵物卡切換；長按卡牌開關自動大絕。',target:isMerchantMeadow?'#bagTown':'#weapon',open:()=>isMerchantMeadow?api.bag():api.close()}
 ]};
 function save(done=false){api.store.transact(api.store.newId('tutorial'),s=>{s.tutorial||={};s.tutorial[phase]={step:index,done};});}
 function position(){if(!phase||sheet.hidden)return;const modal=document.getElementById('panel'),host=modal?.open?modal:document.body;if(sheet.parentNode!==host)host.append(sheet,focus);const r=document.querySelector(steps[phase][index].target)?.getBoundingClientRect();focus.hidden=!r||!r.width||!r.height;if(!focus.hidden){Object.assign(focus.style,{left:r.x-4+'px',top:r.y-4+'px',width:r.width+8+'px',height:r.height+8+'px'});for(const[left,top]of [[false,false],[true,false],[false,true],[true,true]]){Object.assign(sheet.style,{left:left?'12px':'auto',right:left?'auto':'12px',top:top?'100px':'auto',bottom:top?'auto':'12px'});const b=sheet.getBoundingClientRect();if(b.right<r.left-8||b.left>r.right+8||b.bottom<r.top-8||b.top>r.bottom+8)break;}}}
 function readiness(){const n=sheet.querySelector('[data-tutorial=next]');if(n)n.disabled=!!steps[phase]?.[index]?.ready&&!steps[phase][index].ready();}
 function render(){const step=steps[phase][index];step.open?.();sheet.hidden=false;sheet.dataset.phase=phase;sheet.innerHTML='<small>操作教學 '+(index+1)+' / '+steps[phase].length+' · 戰鬥暫停</small><h3>'+step.title+'</h3><p>'+step.text+'</p><div><button data-tutorial="skip">稍後再看</button>'+(index?'<button data-tutorial="back">上一步</button>':'')+'<button data-tutorial="next">'+(index===steps[phase].length-1?'完成教學':'下一步')+'</button></div>';readiness();position();}
 function finish(skip=false){if(!skip)save(true);sheet.hidden=focus.hidden=true;phase='';api.close();}
 sheet.onclick=e=>{const b=e.target.closest('[data-tutorial]');if(!b||b.disabled)return;const mode=b.dataset.tutorial;if(mode==='skip')return finish(true);if(mode==='next'&&index===steps[phase].length-1)return finish();index+=mode==='back'?-1:1;save();render();};
 const onChange=()=>{rememberAutoPotionLesson(api.store);if(phase){readiness();position();}};document.addEventListener('change',onChange);addEventListener('resize',position);addEventListener('scroll',position,true);const observer=new MutationObserver(position);observer.observe(document.getElementById('panel'),{attributes:true,attributeFilter:['open']});
 return{get active(){return !sheet.hidden;},get isFirstVisit(){return true;},begin(name,force=false){rememberAutoPotionLesson(api.store);const needsHeal=!autoPotionLearned(api.store.state);if(!force&&!firstVisit&&!(name==='combat'&&needsHeal))return;if(!force&&api.store.state.tutorial?.[name]?.done&&!(name==='combat'&&needsHeal))return;if(phase&&phase!==name)save(true);if(name==='combat'){steps.combat=steps.combat.filter(step=>!healSteps.includes(step));if(needsHeal)steps.combat.splice(1,0,...healSteps);}phase=!force&&!firstVisit&&name==='combat'&&needsHeal?'heal':name;index=0;render();},dispose(){observer.disconnect();sheet.remove();focus.remove();document.removeEventListener('change',onChange);removeEventListener('resize',position);removeEventListener('scroll',position,true);}};
}

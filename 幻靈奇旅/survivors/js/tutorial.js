import {isMerchantMeadow} from './merchant-meadow.js?v=20261111-meadow-v1';
export function createCaveTutorial(api){
 const qa=new URLSearchParams(location.search).has('qa'),saved=api.store.state,firstVisit=!qa&&!(saved.tutorial?.firstVisitSeen||saved.starterClaimed||saved.run||saved.history?.length);
 const healReady=()=>!!api.store.state.autoItems?.potion?.enabled&&api.store.state.autoItems.potion.threshold===.4;
 const sheet=document.createElement('aside');sheet.id='caveTutorial';sheet.hidden=true;sheet.setAttribute('role','region');sheet.setAttribute('aria-label','副本操作教學');document.body.append(sheet);
 const focus=document.createElement('div');focus.id='tutorialFocus';focus.hidden=true;document.body.append(focus);let phase='',index=0;
 const heal={title:'設定自動補血',text:'在治療藥水下勾選「自動使用」，將門檻設為「任一角色 ≤40%」。設定後才會亮起下一步；必須持有藥水才會自動消耗並替主角與存活寵物回血。',target:'[data-auto-item=potion]',open:()=>api.bag(),ready:healReady};
 const steps={lobby:isMerchantMeadow?[
  {title:'商會武器採集',text:'沿用無盡洞穴的武器、寵物與操作。草原另存戰局，首次帶入洞穴收藏；不會覆蓋原洞穴進度。',target:'#start'},
  {title:'拾取才能帶回',text:'所有魔物都有機會掉落武器。小魔王與大魔王會掉落更高價的限定武器；請走近拾取，離開前按「回商會」自動入庫，重整不會重複領取。',target:'#returnTown'},
  {title:'出發與自動補血',text:'編組三位幻靈後出發。進場會先帶你設定自動補血；採集途中可從道具／暫停的背包調整。',target:'#start'}
 ]:[
  {title:'移動與戰鬥',text:'電腦用 WASD 或方向鍵移動、Space 翻滾；手機拖曳搖桿移動，點右側按鈕翻滾、投球與施放大絕。',target:'#start'},
  {title:'準備夥伴',text:'首次免費召喚三位不同的基礎幻靈，再編入三位夥伴出發。',target:'#start'},
  {title:'購買補給',text:'商店購買治療藥水；入場後會教你開啟自動補血及設定觸發門檻。',target:'#shopTabs',open:()=>api.shop()},
  {title:'準備出發',text:'編好三位夥伴後開始挑戰。重整可續戰，永久收藏保留。',target:'#start',open:()=>api.close()}
 ],combat:[
  {title:'移動與翻滾',text:'拖曳搖桿移動。只有小魔王與大魔王會施放大絕，地面紅圈亮起後至少有 1.25 秒可移動或翻滾離開；小怪只有普攻。',target:'#joystick',open:()=>api.close()},heal,
  {title:'確認補血庫存',text:'自動補血每次會消耗藥水。庫存為 0 時不會補血，請到補給商店購買；設定會跨局保留。',target:'[data-auto-item=potion]',open:()=>api.bag()},
  {title:isMerchantMeadow?'武器採集與返回':'武器與寵物',text:isMerchantMeadow?'走近掉落武器即可收進採集袋。背包按「帶回商會」返回，上架武器櫃販售；未拾取的物品仍留在戰場。':'點武器按鈕換裝、點寵物卡切換；長按卡牌開關自動大絕。',target:isMerchantMeadow?'#bagTown':'#weapon',open:()=>isMerchantMeadow?api.bag():api.close()}
 ]};
 function save(done=false){api.store.transact(api.store.newId('tutorial'),s=>{s.tutorial||={};s.tutorial[phase]={step:index,done};if(done&&phase==='combat'&&healReady())s.tutorial.autoHealLessonVersion=2;});}
 function position(){if(!phase||sheet.hidden)return;const modal=document.getElementById('panel'),host=modal?.open?modal:document.body;if(sheet.parentNode!==host)host.append(sheet,focus);const r=document.querySelector(steps[phase][index].target)?.getBoundingClientRect();focus.hidden=!r||!r.width||!r.height;if(!focus.hidden){Object.assign(focus.style,{left:r.x-4+'px',top:r.y-4+'px',width:r.width+8+'px',height:r.height+8+'px'});for(const[left,top]of [[false,false],[true,false],[false,true],[true,true]]){Object.assign(sheet.style,{left:left?'12px':'auto',right:left?'auto':'12px',top:top?'100px':'auto',bottom:top?'auto':'12px'});const b=sheet.getBoundingClientRect();if(b.right<r.left-8||b.left>r.right+8||b.bottom<r.top-8||b.top>r.bottom+8)break;}}}
 function readiness(){const n=sheet.querySelector('[data-tutorial=next]');if(n)n.disabled=!!steps[phase]?.[index]?.ready&&!steps[phase][index].ready();}
 function render(){const step=steps[phase][index];step.open?.();sheet.hidden=false;sheet.dataset.phase=phase;sheet.innerHTML='<small>操作教學 '+(index+1)+' / '+steps[phase].length+' · 戰鬥暫停</small><h3>'+step.title+'</h3><p>'+step.text+'</p><div><button data-tutorial="skip">稍後再看</button>'+(index?'<button data-tutorial="back">上一步</button>':'')+'<button data-tutorial="next">'+(index===steps[phase].length-1?'完成教學':'下一步')+'</button></div>';readiness();position();}
 function finish(skip=false){if(!skip)save(true);sheet.hidden=focus.hidden=true;phase='';api.close();}
 sheet.onclick=e=>{const b=e.target.closest('[data-tutorial]');if(!b||b.disabled)return;const mode=b.dataset.tutorial;if(mode==='skip')return finish(true);if(mode==='next'&&index===steps[phase].length-1)return finish();index+=mode==='back'?-1:1;save();render();};
 const onChange=()=>{if(phase){readiness();position();}};document.addEventListener('change',onChange);addEventListener('resize',position);addEventListener('scroll',position,true);const observer=new MutationObserver(position);observer.observe(document.getElementById('panel'),{attributes:true,attributeFilter:['open']});
 return{get active(){return !sheet.hidden;},get isFirstVisit(){return true;},begin(name,force=false){const needsHeal=api.store.state.tutorial?.autoHealLessonVersion!==2;if(!force&&!firstVisit&&!(name==='combat'&&needsHeal))return;if(!force&&api.store.state.tutorial?.[name]?.done&&!(name==='combat'&&needsHeal))return;if(phase&&phase!==name)save(true);phase=name;index=!force&&!firstVisit&&name==='combat'?1:0;render();},dispose(){observer.disconnect();sheet.remove();focus.remove();document.removeEventListener('change',onChange);removeEventListener('resize',position);removeEventListener('scroll',position,true);}};
}

export function createCaveTutorial(api){
 const qa=new URLSearchParams(location.search).has('qa'),saved=api.store.state,seen=!!(saved.tutorial?.firstVisitSeen||saved.tutorial?.lobby||saved.tutorial?.combat||saved.starterClaimed||saved.run||saved.history?.length),firstVisit=!qa&&!seen;
 if(!qa&&!saved.tutorial?.firstVisitSeen)api.store.transact(api.store.newId('tutorial-visit'),s=>{s.tutorial||={};s.tutorial.firstVisitSeen=true;});
 const sheet=document.createElement('aside');sheet.id='caveTutorial';sheet.hidden=true;sheet.setAttribute('role','region');sheet.setAttribute('aria-label','洞穴操作教學');document.body.append(sheet);const focus=document.createElement('div');focus.id='tutorialFocus';focus.hidden=true;document.body.append(focus);let phase='',index=0;
 const steps={lobby:[{title:'電腦與直立手機操作',text:'電腦：WASD／方向鍵移動、Space翻滾、E投球、Q大絕，點武器圖示換武器；1–3切換幻靈。直立手機：拖左下搖桿移動，右側點翻滾／靈核球／武器／大絕；長按靈核球自動捕捉，長按寵物卡自動大絕。滾輪或雙指可縮放視角。',target:'#start'},{title:'歡迎進入無盡洞穴',text:'首次可免費召喚三位不同的基礎幻靈。主遊戲任務與商人換得的點數都會顯示在右上錢包。',target:'#start'},
 {title:'靈核召喚',text:'一次100點，十次1000點。召喚會播放動畫並列出獎勵；取得的道具要在探險背包使用才生效。',target:'.gacha-intro',open:()=>api.gacha()},
 {title:'購買道具與武器',text:'商店可切換道具補給、永久武器。永久武器跨局保留；寶箱掉落武器需要走近拾取，維持至本局結束。',target:'#shopTabs',open:()=>api.shop()},
 {title:'準備出發',text:'關閉商店，編好三位幻靈後開始挑戰。重整可續戰；再次挑戰會從第1波重新開始，帳號收藏與點數保留。',target:'#start',open:()=>api.close()}],
 combat:[{title:'移動、翻滾與換寵',text:'拖曳左下搖桿移動，翻滾可閃避攻擊。點其他存活寵物卡可換人，點出戰卡施放大絕；倒下者需復甦藥。',target:'#joystick',open:()=>api.close()},
 {title:'設定自動補血',text:'道具／暫停 → 背包，在治療藥水下開啟「自動使用」，可選任一角色血量低於40%等門檻。由主角使用，所有存活寵物一起回血。',target:'.auto-item-control',open:()=>api.bag()},
 {title:'自動捕捉與共用庫存',text:'長按靈核球約半秒開啟自動捕捉；鎖定目標低於40%生命時自動投球。短按手動投球，三種球與主遊戲共用庫存，捕捉後卡片翻轉換點數。',target:'#throw',open:()=>api.close()},
 {title:'寵物大絕與進化',text:'點出戰卡片施放大絕，長按卡牌開關自動大絕；多隻會由左至右輪替出戰。點ⓘ查看招式效果；備戰幻靈達進化等級時點亮起的肖像即可進化。',target:'#party'},
 {title:'武器與掉落',text:'點擊武器按鈕選擇裝備。金屬圓球代表點數；技能書與武器要走近拾取才生效。前五波魔物會普攻，第六波開始使用專屬大絕。',target:'#weapon'}]};
 function save(done=false){api.store.transact(api.store.newId('tutorial'),s=>{s.tutorial||={};s.tutorial[phase]={step:index,done};});}
 function position(){if(!phase||sheet.hidden)return;const modal=document.getElementById('panel'),host=modal?.open?modal:document.body;if(sheet.parentNode!==host)host.append(sheet,focus);const r=document.querySelector(steps[phase][index].target)?.getBoundingClientRect();focus.hidden=!r||r.width===0||r.height===0;if(!focus.hidden)Object.assign(focus.style,{left:r.x-5+'px',top:r.y-5+'px',width:r.width+10+'px',height:r.height+10+'px'});}
 function render(){const step=steps[phase][index];step.open?.();sheet.hidden=false;sheet.dataset.phase=phase;sheet.innerHTML='<small>洞穴操作教學 '+(index+1)+' / '+steps[phase].length+' · 教學期間暫停戰鬥</small><h3>'+step.title+'</h3><p>'+step.text+'</p><div><button data-tutorial="skip">稍後再看</button>'+(index?'<button data-tutorial="back">上一步</button>':'')+'<button data-tutorial="next">'+(index===steps[phase].length-1?'完成教學':'下一步')+'</button></div>';position();}
 function finish(){save(true);sheet.hidden=focus.hidden=true;phase='';api.close();}
 sheet.onclick=e=>{const mode=e.target.closest('[data-tutorial]')?.dataset.tutorial;if(!mode)return;if(mode==='skip'||mode==='next'&&index===steps[phase].length-1)return finish();index+=mode==='back'?-1:1;save();render();};
 addEventListener('resize',position);
 addEventListener('scroll',position,true);
 const observer=new MutationObserver(position);observer.observe(document.getElementById('panel'),{attributes:true,attributeFilter:['open']});
 return{get active(){return !sheet.hidden;},get isFirstVisit(){return firstVisit;},begin(name,force=false){if(!force&&(!firstVisit||api.store.state.tutorial?.[name]?.done))return;if(phase&&phase!==name)save(true);phase=name;index=force?0:Math.min(steps[name].length-1,api.store.state.tutorial?.[name]?.step||0);render();},dispose(){observer.disconnect();sheet.remove();focus.remove();removeEventListener('resize',position);removeEventListener('scroll',position,true);}};
}

/* 招財帶新老闆走完第一天：進度全部由商店狀態判斷，重新整理也會接續。 */
const CAN_COVER=['#event-coach','#daily-start','#daily-settlement','#chapter-clear'];
export function firstDayStep(s){
 const seen=s.tutorialSeen||{},days=s.totals?.days||0;
 if(seen['first-day-done']||s.level!==1||days>=2)return null;
 if(days>=1||s.phase==='report')return {id:'finish',no:0,title:'第一天完成，老闆！',text:'今天的帳都結清了。接下來到「商會委託」看章節目標，達成後商會會自動升級。汪！',button:'知道了'};
 if(s.day>1)return null;
 if(s.phase==='open'){
  if((s.totals?.sales||0)<1)return {id:'sale',no:4,title:'等顧客結帳',text:'開門了！顧客會自己挑貨、排隊、付款。完成第一筆交易就過關，這段時間可以看看店裡。'};
  return {id:'close',no:5,title:'打烊日結',text:'成交了！按「打烊結算」看今天的收入和薪資。想多賺一點，也可以再營業一會兒。',button:'前往打烊',focus:'#business',click:'#business'};
 }
 if(!seen['fd-goods'])return {id:'goods',no:1,title:'看看商品',text:'點「商品採購」看庫房存貨和售價。今天的貨夠賣，先認識一下就好。',button:'打開商品採購',focus:'.toolbar [data-panel="goods"]',panel:'goods'};
 if(!seen['fd-shelves'])return {id:'shelves',no:2,title:'確認貨架',text:'顧客只買貨架上的東西。點「貨架裝潢」看看商品有沒有擺上去。',button:'打開貨架裝潢',focus:'.toolbar [data-panel="shelves"]',panel:'shelves'};
 return {id:'open',no:3,title:'開門營業',text:'準備好了！按「開門營業」，讓第一位客人進來。',button:'開門營業',focus:'#business',click:'#business'};
}
export function installFirstDayGuide({game,openPanel}){
 const box=document.createElement('aside');box.id='first-day-guide';box.hidden=true;box.setAttribute('aria-live','polite');
 box.innerHTML='<img src="../幻靈奇旅/assets/ui/zhaocai.webp" alt="招財"><div><small></small><strong></strong><p></p></div><button type="button" class="primary"></button>';
 document.body.append(box);
 const [small,title,text,button]=[box.querySelector('small'),box.querySelector('strong'),box.querySelector('p'),box.querySelector('button')];
 let current=null,focused=null;
 const setFocus=q=>{const el=q?document.querySelector(q):null;if(el===focused)return;focused?.classList.remove('first-day-focus');el?.classList.add('first-day-focus');focused=el;};
 button.addEventListener('click',()=>{if(!current)return;if(current.panel)openPanel(current.panel);else if(current.click)document.querySelector(current.click)?.click();else{game.act('ackTutorial',{id:'first-day-done'});sync();}});
 const covered=()=>!!document.querySelector('dialog[open]')||CAN_COVER.some(q=>{const el=document.querySelector(q);return el&&!el.hidden;});
 function sync(s=game.state){
  const step=firstDayStep(s);
  if(!step||s.patrolFocus||covered()){box.hidden=true;setFocus(null);if(!step)current=null;return;}
  if(current?.id!==step.id){current=step;small.textContent=step.no?`第一天目標 ${step.no} / 5`:'第一天目標達成';title.textContent=step.title;text.textContent=step.text;button.textContent=step.button||'';button.hidden=!step.button;}
  box.hidden=false;setFocus(step.focus);
 }
 return {sync,notePanel(name){if((name==='goods'||name==='shelves')&&firstDayStep(game.state)?.id===name)game.act('ackTutorial',{id:'fd-'+name});}};
}

/* One-time, persisted explanations of store incidents and limited commissions. */
const ROLES={
 cashier:['🧾','收銀狀況','確認收銀員在崗、檢查排隊長度；必要時調整排班，再到「主管巡查」選擇處理方式。'],
 stocker:['📦','商品補貨','先到「商品採購」進貨，再確認貨架有陳列商品、補貨員有被指派。事件也可在「主管巡查」處理。'],
 sales:['💬','銷售狀況','檢查商品售價、推銷員職務與顧客預算，再到「主管巡查」處理。'],
 smith:['⚒','鍛造狀況','請檢查鍛造師疲勞與鍛造訂單，前往「主管巡查」處理。'],
 warehouse:['📋','庫房狀況','確認倉庫存貨及可行通道，再透過「主管巡查」協助。'],
 security:['⚠','保全狀況','留意店門與顧客動線，可指派保全員，再進入「主管巡查」。'],
 cleaner:['🧹','清潔狀況','安排清潔員維護環境，在「主管巡查」選擇協助或指導。'],
 host:['♫','迎賓狀況','看看迎賓員疲勞與現場客流，前往「主管巡查」協助。']
};
export function installEventCoach({game,openPanel,openAchievements=()=>openPanel('quests')}){
 const box=document.getElementById('event-coach');if(!box)return {sync(){}};
 const figure=box.querySelector('.event-coach-figure'),title=box.querySelector('h3'),desc=box.querySelector('p'),go=box.querySelector('[data-coach-go]'),later=box.querySelector('[data-coach-later]');
 let current=null;
 function select(s){
  const ev=s.event;
  if(ev&&!s.tutorialSeen?.['event-'+ev.id]){
   const [icon,group,help]=ROLES[ev.role]||['!','商會事件','查看主管巡查並選擇對應處理方式。'];
   const shortage=ev.id==='stockout';
   return {id:'event-'+ev.id,icon,gif:shortage?'question':ev.id==='queue-complaint'?'angry':ROLES[ev.role]?ev.role:'question',title:'第一次遇到｜'+ev.title,desc:shortage?'顧客頭上的問號代表缺貨。先檢查「商品採購」和貨架庫存，並指派補貨員；再到「主管巡查」處理待辦事件。':group+'：'+help,panel:shortage?'goods':'manager',button:shortage?'前往商品採購':'前往主管巡查'};
  }
  const board=s.commissionBoard;
  if(board?.entries?.some(q=>q.status==='active')&&!s.tutorialSeen?.['first-commission'])
   return {id:'first-commission',icon:'✉',gif:'host',title:'首次限時委託',desc:'商會聯絡簿收到限時訂單。點「商會委託」查看指定商品或成交數，達成後記得手動領獎；逾期沒有罰款。',panel:'quests',button:'查看商會委託'};
  const claimable=game.questList().some(q=>q.done&&!s.quests[q.id]);
  if(claimable&&!s.tutorialSeen?.['first-achievement'])
   return {id:'first-achievement',icon:'★',gif:'sales',title:'首次商會成就可領獎',desc:'你的商會已經達成一項成就。打開「商會委託」的「商會成就」分頁，點擊領取金幣，獎勵只能領取一次。',panel:'quests',button:'查看商會成就'};
  return null;
 }
 function acknowledge(open){
  if(!current)return;const target=current;current=null;box.hidden=true;
  box.classList.remove('active');document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));
  const result=game.act('ackTutorial',{id:target.id});
  if(result.ok&&open){if(target.id==='first-achievement')openAchievements();else openPanel(target.panel);}
 }
 go.addEventListener('click',()=>acknowledge(true));later.addEventListener('click',()=>acknowledge(false));
 function sync(s=game.state){
  if(document.querySelector('dialog[open]')||document.hidden){box.hidden=true;box.classList.remove('active');return;}
  const item=select(s);if(!item){current=null;box.hidden=true;box.classList.remove('active');document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));return;}
  if(current?.id===item.id&&!box.hidden)return;
  current=item;figure.textContent='';const img=document.createElement('img');img.src='./assets/event-gifs/'+item.gif+'.gif';img.alt='';img.setAttribute('aria-hidden','true');figure.append(img);title.textContent=item.title;desc.textContent=item.desc;go.textContent=item.button;box.hidden=false;box.classList.add('active');
  document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));
  document.querySelector('.toolbar [data-panel="'+item.panel+'"]')?.classList.add('tutorial-focus');
 }
 return {sync};
}

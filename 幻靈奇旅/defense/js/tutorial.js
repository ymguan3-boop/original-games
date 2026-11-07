/* 首次登島引導：只讀正式遊戲狀態判斷過關，不改星數、不發獎勵。進度存在 record.tutorial。 */
export const TUTORIAL_FLOW=['displayControls','islandHint','gacha','deck','sortie','deploy','star2','star3','dragMerge','item','itemInfo','leaveBattle','returnHint'];
const TEXT={
 displayControls:['老船夫','歡迎來到守護戰島！用手機玩嗎？把手機橫過來視野更寬，也能雙指縮放，或從選單切換全螢幕。',true],
 islandHint:['老船夫','點島嶼上的數字，可以查看關卡名稱；拖曳地圖可以看其他島！',true],
 gacha:['老船夫','先召喚幻靈夥伴吧！點「轉蛋」，看看會出現誰。'],
 deck:['老船夫','按「一鍵編組」，或點「編組」自己挑四位夥伴！'],
 sortie:['老船夫','準備好了嗎？按下「出擊」！'],
 deploy:['老船夫','這是教學戰。點這張一星卡，讓幻靈出擊！'],
 star2:['老船夫','按住右邊的青螺靈一星卡，拖到左邊青螺靈旁邊放開，親自合成二星！'],
 star3:['老船夫','準備好兩張二星卡，中間用另一張卡隔開。接著照指示移動右邊的二星卡。'],
 dragMerge:['老船夫','按住右邊的二星卡，拖到左邊二星卡的旁邊放開，兩張相鄰就會合成三星！'],
 item:['老船夫','很好！現在點「道具」打開看看。'],
 itemInfo:['老船夫','道具從轉蛋取得，點一下就會使用，例如整理手牌或加速發牌。用完就沒了，沒有道具時這裡是空的。',true],
 leaveBattle:['老船夫','教學就到這裡，不用打魔王。回海島吧！',true],
 returnHint:['老船夫','想回初光鎮時，點「選單」→「返回初光鎮」。接下來就自由遊玩吧！',true]
};
/* 每一步要按的按鈕，由前往後找第一個看得到的 */
const FOCUS={gacha:['#closePanelTarget','#panelBody .dg-actions button','#panelBody .dg-machine','#gachaBtn'],deck:['#deckCloseTarget','#autoDeck','[data-open="deck"]'],sortie:['#sortieBtn'],deploy:['.hand-card'],star2:['#hand .hand-card:last-child'],dragMerge:['#hand .hand-card:last-child'],item:['#items'],leaveBattle:['#tutor [data-next]'],returnHint:['#menuBtn']};
export function createTutorial({get,save,box,onDone=()=>{},extraFocus=()=>null,onAdvance=()=>{}}){
 const face=box.querySelector('img'),FACE={displayControls:'happy',islandHint:'talk',gacha:'talk',deck:'talk',sortie:'wow',deploy:'talk',dragMerge:'wow',itemInfo:'talk',leaveBattle:'happy',star2:'talk',star3:'wow',item:'talk',finish:'happy',returnHint:'happy'},[who,line]=[box.querySelector('b'),box.querySelector('p')],next=box.querySelector('[data-next]'),skip=box.querySelector('[data-skip]');
 const state=()=>get().tutorial||(get().tutorial={step:'displayControls',done:false,version:1});
 /* 未完成就離開：下次進來從頭開始 */
 if(!state().done&&state().step!==TUTORIAL_FLOW[0]){state().step=TUTORIAL_FLOW[0];save();}
 const advance=()=>{const t=state(),i=TUTORIAL_FLOW.indexOf(t.step);onAdvance(t.step);if(i>=TUTORIAL_FLOW.length-1){t.done=true;t.step='done';onDone();}else t.step=TUTORIAL_FLOW[i+1];save();render();};
 let focused=null;
 const shown=q=>{const el=document.querySelector(q);return el&&el.getClientRects().length?el:null;};
 /* 標出目標按鈕，對話框放到目標的另一側才不會擋住；有視窗開著時只留標示 */
 function place(step){const list=[extraFocus(step),...(FOCUS[step]||[])].filter(Boolean),el=list.map(shown).find(Boolean)||null;if(el!==focused){focused?.classList.remove('tutor-focus');el?.classList.add('tutor-focus');focused=el;}const dialog=!!document.querySelector('dialog[open]');box.classList.toggle('tutor-away',dialog);const bars=['.lobby-top','.hud-top'].map(shown).filter(Boolean),safeTop=Math.max(8,...bars.map(b=>b.getBoundingClientRect().bottom))+8;if(dialog||!el||box.contains(el)){box.style.top=safeTop+'px';box.style.bottom='auto';return;}const r=(el.closest('.lobby-top')||el).getBoundingClientRect();if(r.top<innerHeight/2){box.style.top=Math.max(safeTop,Math.min(innerHeight-box.offsetHeight-8,r.bottom+12))+'px';box.style.bottom='auto';}else{box.style.bottom=(innerHeight-r.top+12)+'px';box.style.top='auto';}}
 function render(){const t=state();if(t.done){box.hidden=true;focused?.classList.remove('tutor-focus');focused=null;return;}const [name,text,info]=TEXT[t.step]||TEXT.displayControls;face.src='assets/captain/'+(FACE[t.step]||'talk')+'.gif?v=2';who.textContent=name;line.textContent=text;next.hidden=!info;next.textContent=t.step==='leaveBattle'?'返回海島':t.step==='returnHint'?'完成':'下一步';box.hidden=false;place(t.step);}
 next.onclick=advance;
 skip.onclick=()=>{if(confirm('要跳過教學嗎？之後可以從選單重播。')){const t=state();t.done=true;t.step='done';save();render();onDone();}};
 return {render,advance,replay(){const t=state();t.done=false;t.step='displayControls';t.replay=true;save();render();},
  /* 由遊戲事件回報，符合目前步驟才前進，所以重複呼叫不會跳步 */
  check(conditions){const t=state();if(t.done)return;if(conditions[t.step]?.())advance();else place(t.step);},get active(){return !state().done;}};
}

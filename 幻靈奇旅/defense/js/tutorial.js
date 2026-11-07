/* 首次登島引導：只讀正式遊戲狀態判斷過關，不改星數、不發獎勵。進度存在 record.tutorial。 */
export const TUTORIAL_FLOW=['displayControls','islandHint','gacha','deck','sortie','deploy','star2','star3','item','finish','returnHint'];
const TEXT={
 displayControls:['船長','歡迎來到守護戰島！用手機玩嗎？把手機橫過來視野更寬，也能雙指縮放，或從選單切換全螢幕。',true],
 islandHint:['船長','點島嶼上的數字，可以查看關卡名稱；拖曳地圖可以看其他島！',true],
 gacha:['船長','先召喚幻靈夥伴吧！點「轉蛋」，看看會出現誰。'],
 deck:['船長','按「一鍵編組」，或點「編組」自己挑四位夥伴！'],
 sortie:['船長','準備好了嗎？按下「出擊」！'],
 deploy:['船長','先點幻靈卡讓牠出場！三色蛋要點道路，一張卡會佔三個位置。'],
 star2:['船長','把相鄰的相同卡片合成，讓幻靈升到二星！'],
 star3:['船長','再繼續合成，升到三星！'],
 item:['船長','打開「道具」，選一項幫助戰鬥！沒有道具可以按下一步。',true],
 finish:['船長','撐到戰鬥結束吧，做得好！'],
 returnHint:['船長','想回初光鎮？選單 → 返回初光鎮。你已學會守護戰！',true]
};
/* 每一步要按的按鈕，由前往後找第一個看得到的 */
const FOCUS={gacha:['#closePanelTarget','#panelBody .dg-actions button','#panelBody .dg-machine','#gachaBtn'],deck:['#deckCloseTarget','#autoDeck','#deckBtn'],sortie:['#sortieBtn'],deploy:['.hand-card'],star2:['.hand-card'],star3:['.hand-card'],item:['#items'],returnHint:['#menuBtn']};
export function createTutorial({get,save,box,onDone=()=>{},extraFocus=()=>null}){
 const face=box.querySelector('img'),FACE={displayControls:'happy',islandHint:'talk',gacha:'talk',deck:'talk',sortie:'wow',deploy:'talk',star2:'talk',star3:'wow',item:'talk',finish:'happy',returnHint:'happy'},[who,line]=[box.querySelector('b'),box.querySelector('p')],next=box.querySelector('[data-next]'),skip=box.querySelector('[data-skip]');
 const state=()=>get().tutorial||(get().tutorial={step:'displayControls',done:false,version:1});
 /* 未完成就離開：下次進來從頭開始 */
 if(!state().done&&state().step!==TUTORIAL_FLOW[0]){state().step=TUTORIAL_FLOW[0];save();}
 const advance=()=>{const t=state(),i=TUTORIAL_FLOW.indexOf(t.step);if(i>=TUTORIAL_FLOW.length-1){t.done=true;t.step='done';onDone();}else t.step=TUTORIAL_FLOW[i+1];save();render();};
 let focused=null;
 const shown=q=>{const el=document.querySelector(q);return el&&el.getClientRects().length?el:null;};
 /* 標出目標按鈕，對話框放到目標的另一側才不會擋住；有視窗開著時只留標示 */
 function place(step){const list=[extraFocus(step),...(FOCUS[step]||[])].filter(Boolean),el=list.map(shown).find(Boolean)||null;if(el!==focused){focused?.classList.remove('tutor-focus');el?.classList.add('tutor-focus');focused=el;}const dialog=!!document.querySelector('dialog[open]');box.classList.toggle('tutor-away',dialog);if(dialog||!el){box.style.top='';box.style.bottom='';return;}const r=(el.closest('.isle-panel')||el).getBoundingClientRect();if(r.top<innerHeight/2){box.style.top=Math.min(innerHeight-box.offsetHeight-8,r.bottom+12)+'px';box.style.bottom='auto';}else{box.style.bottom=(innerHeight-r.top+12)+'px';box.style.top='auto';}}
 function render(){const t=state();if(t.done){box.hidden=true;focused?.classList.remove('tutor-focus');focused=null;return;}const [name,text,info]=TEXT[t.step]||TEXT.displayControls;face.src='assets/captain/'+(FACE[t.step]||'talk')+'.gif';who.textContent=name;line.textContent=text;next.hidden=!info;box.hidden=false;place(t.step);}
 next.onclick=advance;
 skip.onclick=()=>{if(confirm('要跳過教學嗎？之後可以從選單重播。')){const t=state();t.done=true;t.step='done';save();render();onDone();}};
 return {render,advance,replay(){const t=state();t.done=false;t.step='displayControls';t.replay=true;save();render();},
  /* 由遊戲事件回報，符合目前步驟才前進，所以重複呼叫不會跳步 */
  check(conditions){const t=state();if(t.done)return;if(conditions[t.step]?.())advance();else place(t.step);},get active(){return !state().done;}};
}

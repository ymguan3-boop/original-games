/* 首次登島引導：只讀正式遊戲狀態判斷過關，不改星數、不發獎勵。進度存在 record.tutorial。 */
export const TUTORIAL_FLOW=['displayControls','islandHint','gacha','deck','sortie','deploy','star2','star3','item','finish','returnHint'];
const TEXT={
 displayControls:['船長','歡迎來到守護戰島！用手機玩嗎？把手機橫過來視野更寬，也能雙指縮放，或從選單切換全螢幕。',true],
 islandHint:['船長','點島嶼上的數字，可以查看關卡名稱；拖曳地圖可以看其他島！',true],
 gacha:['船長','先召喚幻靈夥伴吧！點「轉蛋」，看看會出現誰。'],
 deck:['船長','到「編組」挑好四位基礎幻靈，組成出擊隊伍！'],
 sortie:['船長','準備好了嗎？按下「出擊」！'],
 deploy:['船長','先點幻靈卡讓牠出場！三色蛋要點道路，一張卡會佔三個位置。'],
 star2:['船長','把相鄰的相同卡片合成，讓幻靈升到二星！'],
 star3:['船長','再繼續合成，升到三星！'],
 item:['船長','打開「道具」，選一項幫助戰鬥！沒有道具可以按下一步。',true],
 finish:['船長','撐到戰鬥結束吧，做得好！'],
 returnHint:['船長','想回初光鎮？選單 → 返回初光鎮。你已學會守護戰！',true]
};
export function createTutorial({get,save,box,onDone=()=>{}}){
 const [who,line]=[box.querySelector('b'),box.querySelector('p')],next=box.querySelector('[data-next]'),skip=box.querySelector('[data-skip]');
 const state=()=>get().tutorial||(get().tutorial={step:'displayControls',done:false,version:1});
 /* 未完成就離開：下次進來從頭開始 */
 if(!state().done&&state().step!==TUTORIAL_FLOW[0]){state().step=TUTORIAL_FLOW[0];save();}
 const advance=()=>{const t=state(),i=TUTORIAL_FLOW.indexOf(t.step);if(i>=TUTORIAL_FLOW.length-1){t.done=true;t.step='done';onDone();}else t.step=TUTORIAL_FLOW[i+1];save();render();};
 function render(){const t=state();if(t.done){box.hidden=true;return;}const [name,text,info]=TEXT[t.step]||TEXT.displayControls;who.textContent=name;line.textContent=text;next.hidden=!info;box.hidden=false;}
 next.onclick=advance;
 skip.onclick=()=>{if(confirm('要跳過教學嗎？之後可以從選單重播。')){const t=state();t.done=true;t.step='done';save();render();onDone();}};
 return {render,advance,replay(){const t=state();t.done=false;t.step='displayControls';t.replay=true;save();render();},
  /* 由遊戲事件回報，符合目前步驟才前進，所以重複呼叫不會跳步 */
  check(conditions){const t=state();if(t.done)return;if(conditions[t.step]?.())advance();},get active(){return !state().done;}};
}

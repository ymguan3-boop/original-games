/* 宏宏的對話與新手提示共用右下角半身立繪。 */
export function showManagerDialogue(text,{actionLabel,onAction,duration=0,tutorial=false,onSkip}={}){
 let root=document.getElementById('manager-dialogue');
 if(!root){
  root=document.createElement('aside');
  root.id='manager-dialogue';
  root.setAttribute('aria-live','polite');
  root.innerHTML='<div class="manager-bubble"><button class="manager-dismiss" aria-label="關閉對話">×</button><p></p><button class="manager-action" hidden></button><div class="manager-guide-options" hidden><button type="button">略過</button><button type="button" title="以後都跳過新手教學" aria-label="跳過，以後都不再進入新手教學">跳過</button></div></div><div class="manager-portrait"><img src="./assets/ui-generated/guide-hero-v23.gif" alt="店長宏宏"></div>';
  document.body.append(root);
  root.querySelector('.manager-dismiss').onclick=()=>root.hidden=true;
  window.addEventListener('firstlight:tutorials-skipped',()=>{
   if(!root.querySelector('.manager-guide-options').hidden)root.hidden=true;
  });
 }
 clearTimeout(root.hideTimer);
 root.querySelector('p').textContent=String(text);
 const action=root.querySelector('.manager-action');
 action.hidden=!actionLabel;
 action.textContent=actionLabel||'';
 action.onclick=()=>{root.hidden=true;onAction?.();};
 const options=root.querySelector('.manager-guide-options');
 options.hidden=!tutorial;
 if(tutorial){
  const [dismiss,skip]=options.querySelectorAll('button');
  dismiss.onclick=()=>{root.hidden=true;onSkip?.();};
  skip.onclick=()=>{window.FirstlightTutorials.skip();root.hidden=true;onSkip?.();};
 }
 root.hidden=false;
 if(duration)root.hideTimer=setTimeout(()=>root.hidden=true,duration);
 return root;
}

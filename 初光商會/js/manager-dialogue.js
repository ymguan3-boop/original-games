/* 主角說話共用一處：右下貼底半身，泡泡在頭部左側，依內容縮排。 */
export function showManagerDialogue(text,{actionLabel,onAction,duration=0}={}){
 let root=document.getElementById('manager-dialogue');
 if(!root){root=document.createElement('aside');root.id='manager-dialogue';root.setAttribute('aria-live','polite');root.innerHTML='<div class="manager-bubble"><button class="manager-dismiss" aria-label="關閉對話">×</button><p></p><button class="manager-action" hidden></button></div><div class="manager-portrait"><img src="./assets/ui-generated/guide-hero-v23.gif" alt="主管"></div>';document.body.append(root);root.querySelector('.manager-dismiss').onclick=()=>root.hidden=true;}
 clearTimeout(root.hideTimer);root.querySelector('p').textContent=String(text);const action=root.querySelector('.manager-action');action.hidden=!actionLabel;action.textContent=actionLabel||'';action.onclick=()=>{root.hidden=true;onAction?.();};root.hidden=false;if(duration)root.hideTimer=setTimeout(()=>root.hidden=true,duration);return root;
}

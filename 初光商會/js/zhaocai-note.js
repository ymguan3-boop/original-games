/* 失敗時的招財小卡：幾秒後自己收起，不擋操作 */
const SAD='../幻靈奇旅/assets/ui/zhaocai-sad.gif';
export function showZhaocaiNote(text){
 let note=document.getElementById('zhaocai-note');
 if(!note){note=document.createElement('div');note.id='zhaocai-note';note.setAttribute('role','status');note.innerHTML='<img src="'+SAD+'" alt="難過的招財"><p></p>';document.body.append(note);}
 note.querySelector('p').textContent=text;note.hidden=false;clearTimeout(note.timer);note.timer=setTimeout(()=>{note.hidden=true;},4500);
}

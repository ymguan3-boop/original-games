/* High-resolution, self-contained CSS comic scene instead of a blurry stretched GIF. */
const ROLE_SCENE={
 cashier:['🧾','🪙','😳'],stocker:['📦','🛒','💫'],sales:['🏷️','💬','😁'],
 smith:['⚒️','🔥','🌈'],warehouse:['📋','📦','❓'],security:['🕵️','🚨','😅'],
 cleaner:['🧹','🫧','✨'],host:['🎤','🎵','😆']
};
const EFFECTS={checkout:'⚡',reputation:'🌟',stock:'📦',logistics:'🚚',sales:'📢',forge:'🔨',storage:'📦',patience:'❤️',traffic:'🎉',morale:'😊',rest:'💤',clean:'✨'};
const ANIMATIONS=new Set(['chase','bounce','stack','jelly','flutter','pop','dance','wobble','float','spin','sneak','sparkle']);
export function incidentSketch(ev,esc=v=>String(v)){
 const icons=Array.isArray(ev?.emoji)&&ev.emoji.length===3?ev.emoji:ROLE_SCENE[ev?.role]||['🌟','❗','✨'];
 const motion=ANIMATIONS.has(ev?.animation)?ev.animation:'bounce';
 return `<div class="incident-scene incident-scene--${motion}" role="img" aria-label="${esc((ev?.title||'商會事件')+'｜動畫表演')}">
  <div class="incident-scene-stage" aria-hidden="true">
   <span class="incident-sprite incident-sprite--a">${esc(icons[0])}</span>
   <span class="incident-sprite incident-sprite--b">${esc(icons[1])}</span>
   <span class="incident-sprite incident-sprite--c">${esc(icons[2])}</span>
   <span class="incident-spark incident-spark--left">✧</span><span class="incident-spark incident-spark--right">✦</span>
  </div><span class="incident-scene-caption">${esc(ev?.funny?'搞笑突發狀況':'商會突發狀況')} · ${esc(EFFECTS[ev?.effect]||'✨')} ${esc(ev?.effectText||'')}</span>
 </div>`;
}

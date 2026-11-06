/* 每個事件一張專屬 GIF；懶載入，事件結束就不再占用記憶體。 */
const EFFECTS={checkout:'⚡',reputation:'🌟',stock:'📦',logistics:'🚚',sales:'📢',forge:'🔨',storage:'📦',patience:'❤️',traffic:'🎉',morale:'😊',rest:'💤',clean:'✨'};
const COMPLAINT={stockout:'stockout',disappointed:'stockout',queue:'queue-complaint',angry:'queue-complaint'};
export const eventGif=ev=>'./assets/event-gifs/v2/'+(COMPLAINT[ev?.kind]||(/^(event-\d+|comic-\d+|stockout|queue-complaint)$/.test(ev?.id||'')?ev.id:'event-1'))+'.gif';
export function incidentSketch(ev,esc=v=>String(v)){
 return `<div class="incident-scene"><img class="incident-scene-gif" src="${esc(eventGif(ev))}" alt="${esc((ev?.title||'商會事件')+'動畫')}" width="220" height="220" loading="lazy" decoding="async"><span class="incident-scene-caption">${esc(EFFECTS[ev?.effect]||'✨')} ${esc(ev?.effectText||'')}</span></div>`;
}

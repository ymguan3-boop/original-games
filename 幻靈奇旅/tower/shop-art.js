/* Item art is loaded only inside the shop; combat never loads these textures. */
(()=>{'use strict';
 const version='20261023-shop-motion-v1';
 const types=['greatsword','dual-blades','dual-pistols','katana'];
 const special={duelist_recoil:'sunset-pistols',starlight_siphon:'starlight-katana',golden_ward:'golden-greatsword'};
 const effects={knock:['震退','#d5aa6b'],freeze:['冰霜','#83d8ff'],paralyze:['雷電','#ffe47b'],poison:['毒性','#a7dd76'],lifesteal:['回生','#97c9ff'],ward:['護身','#f0cf76'],heal:['回復','#ed8ca2'],power:['戰意','#ffb86d']};
 const items=new Map();
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function art(item){const id=special[item.id]||(item.id==='heal'?'heal-potion':item.id==='power'?'power-potion':types[item.type]);return 'icons/'+id+'.webp?v='+version;}
 function html(item){items.set(item.id,{...item});const effect=effects[item.effect||item.id]||['裝備','#cfb57c'];return '<button type="button" class="shop-art" data-shop-art="'+esc(item.id)+'" style="--item-accent:'+effect[1]+'" aria-label="放大查看'+esc(item.name)+'圖示"><img src="'+art(item)+'" alt="'+esc(item.name)+'" width="128" height="128" loading="lazy" decoding="async"><span>'+effect[0]+'</span></button>';}
 let preview;
 document.addEventListener('click',event=>{const trigger=event.target.closest('[data-shop-art]');if(!trigger)return;const item=items.get(trigger.dataset.shopArt);if(!item)return;
  if(!preview){preview=document.createElement('dialog');preview.className='shop-art-preview';preview.setAttribute('aria-labelledby','shopArtTitle');document.body.append(preview);preview.addEventListener('click',e=>{if(e.target===preview||e.target.closest('[data-close-art]'))preview.close();});}
  preview.innerHTML='<button type="button" class="shop-art-close" data-close-art aria-label="關閉物品圖示">×</button><img src="'+art(item)+'" alt="'+esc(item.name)+'" width="512" height="512"><h2 id="shopArtTitle">'+esc(item.name)+'</h2><p>'+esc(item.label||item.description)+'</p>';
  preview.showModal();
 });
 document.addEventListener('keydown',event=>{if(!preview?.open)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();preview.close();}else event.stopPropagation();},true);
 window.TowerShopArt={html};
})();

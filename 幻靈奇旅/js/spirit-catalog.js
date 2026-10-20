/* Stable display numbers and authored attack bindings; save IDs remain untouched. */
(()=>{'use strict';
 function create(data){
  if(!Array.isArray(data?.entries))throw new Error('圖鑑設定缺少 entries');
  const entries=data.entries.slice().sort((a,b)=>a.order-b.order),byId=Object.create(null);
  for(const entry of entries){if(byId[entry.id])throw new Error('重複的圖鑑 ID：'+entry.id);byId[entry.id]=entry;}
  const idOf=value=>typeof value==='string'?value:value?.id||value?.speciesId;
  const get=value=>byId[idOf(value)]||null;
  const number=value=>get(value)?.number||'—';
  const towerNumbers=Object.fromEntries((data.towerEntries||[]).map(e=>[e.id,e.number]));
  const towerNumber=id=>towerNumbers[id]||'—';
  function sort(items){return items.map((item,index)=>({item,index,order:get(item)?.order??Number.MAX_SAFE_INTEGER})).sort((a,b)=>a.order-b.order||a.index-b.index).map(row=>row.item);}
  function skill(value,selection=0){
   const entry=get(value);if(!entry)return null;
   if(Number.isInteger(selection))return entry.skills[selection]||null;
   const name=typeof selection==='string'?selection:selection?.name;
   return entry.skills.find(item=>item.name===name)||entry.skills[(selection?.cost||0)>=3?entry.skills.length-1:0]||null;
  }
  function attack(value,selection=0,availableModes){
   const binding=skill(value,selection);if(!binding)return null;
   if(availableModes===undefined)return {...binding};
   const modes=Array.isArray(availableModes)?availableModes:Object.keys(availableModes||{});
   const find=name=>modes.find(mode=>mode.toLowerCase()===String(name||'').toLowerCase());
   const exact=find(binding.animation);
   if(exact)return {...binding,animation:exact,mode:exact};
   // Missing dedicated clips are explicit fallbacks, never silently classified as native attacks.
   const fallback=['Attack','Ultimate','Special','React','Walk','Idle'].map(find).find(Boolean)||null;
   return {...binding,animation:fallback,mode:fallback,nativeAttack:false,fallback:true,missingAnimation:binding.animation};
  }
  return {data,entries,byId,get,number,towerNumber,sort,skill,attack};
 }
 window.SpiritCatalog={create};
})();

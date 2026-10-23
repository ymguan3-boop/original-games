/* One authoritative tower-card transaction per permanent mount. */
(()=>{'use strict';
 const mounts=[{id:'bicycle',name:'腳踏車',icon:'🚲'},{id:'mirror-deer',name:'藏鏡鹿',icon:'🦌'}];
 const recipe=['阿宏牛仔卡片','藍金星輝法師卡片','官胖卡片'].map(name=>[name,3]);
 function purchase(progress,id){
  if(!mounts.some(m=>m.id===id))return {ok:false,reason:'unknown'};
  if(progress.mounts?.[id])return {ok:true,owned:true,progress};
  if(recipe.some(([name,count])=>(Number(progress.cards?.[name])||0)<count))return {ok:false,reason:'cards'};
  const next={...progress,cards:{...progress.cards},mounts:{...progress.mounts,[id]:true}};
  for(const [name,count]of recipe)next.cards[name]-=count;
  return {ok:true,owned:false,progress:next};
 }
 window.MountEconomy={mounts,recipe,purchase};
})();

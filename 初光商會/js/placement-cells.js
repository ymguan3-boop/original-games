/* 布置時地板上的可放置格子：2D 與 3D 共用同一份計算。
 * 只在擺放的物件種類或旋轉改變時重算，拖曳時不會每格每幀都跑一次。 */
import {dimensions} from './nav.js?v=20261114-v47';
export function createPlacementCells(game){
 let key='',cells=[];
 return function(placement){
  if(!placement)return [];
  const original=game.state,moving=[...original.shelves,...(original.decorations||[])].find(i=>i.id===(placement.id||placement.shelfId));
  const s=moving?{...original,shelves:original.shelves.filter(i=>i.id!==moving.id),decorations:(original.decorations||[]).filter(i=>i.id!==moving.id),shelfStorage:[...(original.shelfStorage||[]),...(!moving.decoration?[moving]:[])],decorStorage:[...(original.decorStorage||[]),...(moving.decoration?[moving]:[])]}:original;
  const target={...placement,shelfId:placement.shelfId||moving?.id},k=[placement.type,target.shelfId,placement.rotation,s.level,s.shelves.length,(s.decorations||[]).length,placement.id,[...s.shelves,...(s.decorations||[])].map(x=>[x.id,x.x,x.z,x.rotation,x.mount,x.garden].join(',')).join(';')].join('|');
  if(k===key)return cells;key=k;cells=[];
  const {width,height}=dimensions(s.level);
  const outdoor=['plant','fern','lavender','citrus'].includes(placement.type);for(let z=0;z<height+(outdoor?3:0);z++)for(let x=0;x<width;x++){const r=game.placementStatus({...target,x,z},s);cells.push({x,z,ok:!!r.ok});}
  return cells;
 };
}

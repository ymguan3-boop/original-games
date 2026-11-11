/* 布置時地板上的可放置格子：2D 與 3D 共用同一份計算。
 * 只在擺放的物件種類或旋轉改變時重算，拖曳時不會每格每幀都跑一次。 */
import {dimensions} from './nav.js?v=20261111-decor-v22';
export function createPlacementCells(game){
 let key='',cells=[];
 return function(placement){
  if(!placement)return [];
  const s=game.state,k=[placement.type,placement.shelfId,placement.rotation,s.level,s.shelves.length,(s.decorations||[]).length,s.shelves.map(x=>x.x+','+x.z).join(';')].join('|');
  if(k===key)return cells;key=k;cells=[];
  const {width,height}=dimensions(s.level);
  for(let z=0;z<height;z++)for(let x=0;x<width;x++){const r=game.placementStatus({...placement,x,z});cells.push({x,z,ok:!!r.ok});}
  return cells;
 };
}

export function occupiedCells(item){const x=item.x||0,z=item.z||0;if(item.type!=='materials'||item.decoration)return [{x,z}];const a=(item.rotation||0)*Math.PI/180;return [{x,z},{x:x+Math.round(Math.cos(a)),z:z-Math.round(Math.sin(a))}];}
export function footprintCenter(item){const cells=occupiedCells(item);return {x:cells.reduce((n,c)=>n+c.x,0)/cells.length,z:cells.reduce((n,c)=>n+c.z,0)/cells.length};}
export function footprintSize(item){if(item.type==='carpet')return {width:2.7,depth:1.9};if(item.type==='materials')return {width:2,depth:1};return {width:1,depth:1};}

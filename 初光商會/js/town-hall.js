import {buildShell,tune,LEVELS,ramp} from './chibi/shell.js?v=20261115-v63';
import {dimensions} from './nav.js?v=20261115-v63';

// Fit the shop's own facade to the town's established door and visitor route.
export function buildTownHall(level){
 const {width:w,height:d}=dimensions(level), t=LEVELS[level].t;
 const center=(w-1)/2,doorX=Math.round(center)-center;
 const root=tune(buildShell(level,{w,d,doorX,ground:-.07}));
 root.userData.setRoofVisible(true);
 const sharedRamp=ramp();
 function dispose(){
  const resources=new Set();
  function collect(){root.traverse(node=>{
   if(node.geometry)resources.add(node.geometry);
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    if(!material)continue;
    resources.add(material);
    for(const value of Object.values(material))if(value?.isTexture&&value!==sharedRamp)resources.add(value);
   }
  });}
  // Capture the front-wall fade materials before outline disposal restores the originals.
  collect();
  for(const contour of root.userData.contours||[])contour.dispose();
  collect();
  for(const resource of resources)resource.dispose();
 }
 return {root,halfW:w/2+t,depth:d+t,front:d/2+t/2,doorX,setDoorOpen:root.userData.setDoorOpen,dispose};
}

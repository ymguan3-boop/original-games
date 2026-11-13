import {dimensions,buildingLevel} from './nav.js?v=20261113-v39';
// Same centers and sizes as chibi/shell.js, including frames, curtains and sconces.
export function wallFixtures(level){
 const l=buildingLevel(level),{width:w,height:d}=dimensions(l),door=Math.round((w-1)/2)-(w-1)/2,DW=l===1?1.05:l>=4?2.1:1.8,out=[],add=(side,u,width,kind)=>out.push({side,u,width,kind});
 const nb=[0,1,2,3,3,4][l],span=w-1.6,ww=l===1?.85:l>=4?1.1:1;
 for(let i=0;i<nb;i++){const x=nb===1?.6:-span/2+span*(i+.5)/nb;add('back',x,ww+.55,'window');if(l>1&&i<nb-1)add('back',x+span/nb/2,.6,'lamp');}
 for(const side of ['left','right'])for(const z of l>=4?[-d*.22,d*.2]:[-.4])add(side,z,ww+.55,'window');
 const fw=l===1?.9:l===2?1.05:l===3?1.2:l===4?1.15:1.1;
 for(const [a,b]of[[-w/2,door-DW/2],[door+DW/2,w/2]]){const len=b-a-1.1,n=Math.max(1,Math.floor(len/2.3)),us=l<=3?[(a+b)/2]:Array.from({length:n},(_,i)=>a+.55+len*(i+.5)/n);for(const u of us)add('front',u,fw+.5,'window');}
 add('front',door,DW+.7,'door');add('left',Math.floor(d)-2-(d-1)/2,2.8,'door-2d');return out;
}
export const wallItemWidth=type=>({'painting-large':1.18,painting:.72,clock:.70,couplet:.50})[type]||.95;

export function modelHeight(spec){if(!spec)return 2.35;const stage=spec.stage||1,path=spec.model||'';
 if(spec.id==='pikachu')return Math.min(2.6,Math.max(1.15,spec.height||1.6))*2.1;
 if(spec.id==='wigglytuff')return Math.min(2.6,Math.max(1.15,spec.height||1.6))*1.3;
 if(spec.id==='giratina')return Math.min(2.6,Math.max(1.15,spec.height||1.6))*2/3;
 if(/cat-girl/.test(path))return(2.35+(stage-1)*.3)*.9;
 if(/floral-deer/.test(path))return(2.5+(stage-1)*.45)*2/3;
 if(/water-dog/.test(path))return(2.1+(stage-1)*.5)*2/3;
 const base=Math.min(2.6,Math.max(1.15,spec.height||1.6));
 return base*(/robot-evolution/.test(path)?1.1:['totodile','croconaw','feraligatr'].includes(spec.id)?1.3:1);
}
export function projectileStyle(spec,strong=false,mode=''){const name=spec?.skills?.[strong?1:0]?.name||'';return /Beam|光束|光線|射線|光炮|光砲/i.test(mode+' '+name)&&!/Nova|能量球|光球/i.test(mode+' '+name)?'beam':'orb';}

export function projectileTint(spec){return /floral-deer/.test(spec?.model||'')?0xffd65b:/robot-evolution/.test(spec?.model||'')?(spec.id==='quilava'?0xff2848:0x32c4ff):undefined;}

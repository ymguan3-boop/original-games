// Match the original model-room's presentationKind contract, without touching its files.
export function attackProfile(spec,config={},strong=false){
 const model=spec?.model||'',name=spec?.skills?.[strong?1:0]?.name||config[strong?'ultimateName':'normalName']||'';
 let type=config[strong?'ultimateType':'normalType']||'ranged';
 if(/回滿|治癒|回血|霸體|武裝|Armor|Restore/i.test(name))type='self';
 else if(!strong&&/water-dog/.test(model))type='melee';
 else if(['infernape','zapdos','turtwig','grotle','torterra'].includes(spec?.id)||/fire-bear|cat-girl/.test(model))type='melee';
 else if(/拳|爪|斬|刃|踢|撞|啄|斧|棍|撲|衝鋒|SkyRam|WingPounce|Peck|Guitar|Kick|Ram/i.test(name)&&!/遠程|射擊|飛刃|光束|火球|射線/i.test(name))type='melee';
 else if(strong&&(/water-dog-3|water-fairy/.test(model)||/波|Pulse|Wave|Burst/i.test(name)))type='cone';
 else if(strong&&/spiral-snail|mushroom|book-monster|chest-monster/.test(model))type='area';
 else type='ranged';
 const configured=Number(config[strong?'ultimateRange':'range'])||3;
 const range=type==='melee'?Math.min(3.2,configured):['area','cone'].includes(type)?Math.max(5,configured):type==='self'?10:Math.max(strong?11:9,configured);
 return {type,range,ranged:!['melee','self'].includes(type)};
}
export const HERO_ATTACKS={sword:{duration:.76,release:.32,type:'cone',range:3.5},blades:{duration:.54,release:.2,type:'cone',range:2.8},guns:{duration:.44,release:.14,type:'ranged',range:14},knife:{duration:.6,release:.26,type:'cone',range:3.8}};
export const ROLL_DURATION=.46;

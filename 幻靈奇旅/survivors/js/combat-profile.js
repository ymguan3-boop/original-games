// Match the original model-room's presentationKind contract, without touching its files.
export function attackProfile(spec,config={},strong=false){
 const id=spec?.id;
 if(id==='swampert')return strong?{type:'self',range:0,ranged:false,armor:true}:{type:'area',range:4.8,ranged:false,lavaSword:true};
 if(strong){
  if(id==='mew')return{type:'tracking',range:16,ranged:true,chain:true,chainOnHit:true,sustain:10};
  if(id==='wigglytuff')return{type:'global',range:160,ranged:true,global:true,jump:true};
  if(['pikachu','quilava','typhlosion'].includes(id))return{type:'ranged',range:18,ranged:true,piercing:true};
  if(['charizard','palkia','meganium','feraligatr','torterra','empoleon'].includes(id))return{type:'blast',range:18,ranged:true,blastRadius:7};
  if(['wartortle','blastoise','groudon','rayquaza','moltres'].includes(id))return{type:'tracking',range:16,ranged:true,chain:true,chainOnHit:true};
  if(id==='suicune')return{type:'area',range:18,ranged:true,noTarget:true};
 }
 if(spec?.id==='mewtwo')return{type:'area',range:strong?11:7,ranged:true};
 if(spec?.id==='infernape'&&strong)return{type:'global',range:160,ranged:true,global:true};
 if(spec?.id==='chimchar'&&strong)return{type:'ranged',range:15,ranged:true,piercing:true};
 if(spec?.id==='monferno')return{type:'tracking',range:strong?14:11,ranged:true,chain:true};
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
export const HERO_ATTACKS={sword:{duration:.76,release:.32,type:'cone',range:4.2},blades:{duration:.54,release:.2,type:'area',range:2.4},guns:{duration:.44,release:.14,type:'ranged',range:12.6},knife:{duration:.6,release:.26,type:'melee',range:3.2}};
export const ROLL_DURATION=.46;

export function skillDescription(spec,config={},strong=false){const p=attackProfile(spec,config,strong);const label={melee:'單體 · 近身攻擊',ranged:'單體 · 遠程射擊',tracking:'追蹤攻擊',cone:'範圍 · 前方扇形',area:'範圍 · 周身攻擊',blast:'遠程 · 大範圍爆發',global:'全場地 · 最後一擊地震',self:'自身增益'};return (p.armor?'霸體 10 秒：攻擊與防禦 +50%，免疫控制':label[p.type])+(p.piercing?' · 貫穿':'')+(p.chain?(p.chainOnHit?' · 命中後連鎖下一目標':' · 擊敗後連鎖下一目標'):'')+(p.sustain?' · 持續 '+p.sustain+' 秒':'')+(p.jump?' · 原地高跳後落地震擊':'');}

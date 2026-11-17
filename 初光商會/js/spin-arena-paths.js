/* 戰鬥陀螺：12 顆現有陀螺 → 動作原型（只決定移動路線與演出風格，不改名稱、屬性、技能數值與素材）。
 * 路線是模擬的一部分（固定步長、可重現），所以畫面與碰撞判定永遠一致。 */
export const SPIN_ARCHETYPES={
 flame:'assault',   // 烈焰獅王・攻擊 → 突擊型：直線加速→短距變向→正面重撞
 wind:'speed',      // 蒼風翼龍・速度 → 速度型：高速環繞→斜切→連續擦撞
 shield:'guard',    // 聖耀天盾・持久 → 防禦型：定點穩轉→小幅避讓→反彈撞擊
 nebula:'balance',  // 星穹麒麟・平衡 → 平衡型：S 型游走→弧線切入→回中
 thunder:'lightning',// 雷光戰狼・爆發 → 雷電型：Z 字閃電→瞬間折返→穿刺撞擊
 sun:'blaze',       // 熾日鳳凰・爆發 → 火焰型：螺旋蓄速→火環包覆→猛撞
 frost:'frost',     // 霜晶白虎・防禦 → 冰霜型：外圈巡航→短暫滑移→精準碰撞
 tide:'cyclone',    // 滄海玄鯨・持久 → 旋風型：大圓繞行→螺旋收束→側撞
 terra:'heavy',     // 磐岩巨犀・防禦 → 重擊型：低速逼近→短蓄力→單次強撞
 shadow:'combo',    // 影刃魔鋒・平衡 → 連擊型：左右交錯→多段折返→收尾撞擊
 thorn:'counter',   // 荊棘靈狐・速度 → 閃避反擊型：假動作→側滑閃避→繞背反撞
 crystal:'special'  // 翠晶守衛・防禦 → 特殊技能型：晶壁定點爆發
};
/* 演出風格：拖尾顏色、元素粒子、命中特效 */
export const SPIN_FX={
 flame:{trail:0xff7a2a,glow:0xffc04a,particle:'ember',impact:'spark'},
 wind:{trail:0x8fd8ff,glow:0xe8fbff,particle:'streak',impact:'spark'},
 shield:{trail:0xfff1b8,glow:0xffe27a,particle:'halo',impact:'shock'},
 nebula:{trail:0xc9a8ff,glow:0xf3e6ff,particle:'star',impact:'spark'},
 thunder:{trail:0xb98cff,glow:0xf6f0ff,particle:'arc',impact:'arc'},
 sun:{trail:0xff9b2e,glow:0xfff07a,particle:'ember',impact:'shock'},
 frost:{trail:0xbdeeff,glow:0xffffff,particle:'ice',impact:'ice'},
 tide:{trail:0x46b6e6,glow:0xc8f4ff,particle:'bubble',impact:'shock'},
 terra:{trail:0xc89a5a,glow:0xffe0a8,particle:'debris',impact:'shock'},
 shadow:{trail:0xa261cb,glow:0xeac8ff,particle:'blade',impact:'spark'},
 thorn:{trail:0x7ed36a,glow:0xe8ffd0,particle:'leaf',impact:'spark'},
 crystal:{trail:0x7fe0a0,glow:0xe6fff0,particle:'shard',impact:'ice'}
};
export const archetypeOf=id=>SPIN_ARCHETYPES[id]||'balance';
/* 技能冷卻：速越高冷卻越短（4.5～14 秒） */
export const spinSkillCooldown=speed=>Math.max(4.5,Math.min(14,270/Math.max(1,speed)));
const unit=(x,z)=>{const d=Math.hypot(x,z)||1;return [x/d,z/d];};
/* 回傳期望方向（未正規化）與速度倍率。skill=true 為技能播放期間（GIF 播放時）的專屬路徑 */
export function steer(type,b,o,t,i,skill){
 const [ux,uz]=unit(o.x-b.x,o.z-b.z),sg=i?1:-1,px=-uz*sg,pz=ux*sg,ph=b.phase||0,d=Math.hypot(o.x-b.x,o.z-b.z),r=Math.hypot(b.x,b.z)||1e-6,[rx,rz]=[b.x/r,b.z/r],tx=-rz*sg,tz=rx*sg;
 const orbit=(radius,k=1)=>[tx*k-rx*(r-radius)*1.6,tz*k-rz*(r-radius)*1.6];
 const mix=(a,wa,c,wc)=>[a[0]*wa+c[0]*wc,a[1]*wa+c[1]*wc];
 const cyc=(len)=>((t+ph)%len)/len,toward=[ux,uz],side=[px,pz],center=[-b.x,-b.z];
 if(skill){
  switch(type){
   case 'assault':return {dir:toward,speed:1.9};
   case 'speed':return {dir:mix(side,.8,toward,.75),speed:1.8};
   case 'guard':return {dir:mix(center,.6,toward,.25),speed:.45};
   case 'balance':return {dir:mix(toward,.9,side,Math.sin(t*6+ph)*.9),speed:1.5};
   case 'lightning':return {dir:mix(toward,1,side,Math.sign(Math.sin(t*14+ph))*1.2),speed:2};
   case 'blaze':return {dir:mix(toward,.7,side,1),speed:1.7};
   case 'frost':return {dir:mix(toward,1,side,.25),speed:1.65};
   case 'cyclone':return {dir:mix(orbit(Math.max(.4,d*.8),1.2),.8,toward,.7),speed:1.6};
   case 'heavy':return {dir:toward,speed:cyc(1.1)<.3?.15:2.2};
   case 'combo':return {dir:mix(toward,1,side,Math.sign(Math.sin(t*11+ph))*.9),speed:1.75};
   case 'counter':return d>1.5?{dir:mix(side,1,toward,.35),speed:1.7}:{dir:mix(toward,1,side,-.6),speed:1.9};
   default:return {dir:mix(center,.4,toward,.15),speed:.5};
  }
 }
 switch(type){
  case 'assault':return cyc(2.4)<.62?{dir:mix(toward,1,side,.12),speed:1.25}:{dir:mix(toward,.35,side,.95),speed:.95};
  case 'speed':return cyc(2.2)<.72?{dir:mix(orbit(1.45,1.1),1,toward,.35),speed:1.3}:{dir:mix(toward,1,side,.55),speed:1.35};
  case 'guard':return d<1.25?{dir:toward,speed:1.05}:{dir:mix(center,.7,side,Math.sin(t*1.6+ph)*.35),speed:.65};
  case 'balance':return {dir:mix(toward,.75,side,Math.sin(t*2.1+ph)*.95),speed:1};
  case 'lightning':return {dir:mix(toward,.85,side,Math.sign(Math.sin(t*4.6+ph))*.95),speed:1.15};
  case 'blaze':{const rad=1.7-cyc(3.2)*1.25;return cyc(3.2)<.8?{dir:mix(orbit(rad,1),1,toward,.3),speed:1.05}:{dir:toward,speed:1.4};}
  case 'frost':return cyc(3)<.75?{dir:mix(orbit(1.65,.95),1,toward,.25),speed:1}:{dir:mix(toward,1,side,.1),speed:1.25};
  case 'cyclone':{const rad=1.8-cyc(4)*1.4;return {dir:mix(orbit(rad,1.15),1,toward,.25+cyc(4)*.5),speed:1.1};}
  case 'heavy':{const c=cyc(3.2);return c<.62?{dir:toward,speed:.62}:c<.78?{dir:toward,speed:.18}:{dir:toward,speed:1.65};}
  case 'combo':return {dir:mix(toward,.9,side,Math.sign(Math.sin(t*6.5+ph))*.65),speed:1.1};
  case 'counter':{if(d<1.5){const bx=o.x-ux*.2+px*1.1-b.x,bz=o.z-uz*.2+pz*1.1-b.z;return {dir:[bx,bz],speed:1.2};}return {dir:mix(toward,.8,side,Math.sin(t*3+ph)*.7),speed:1.05};}
  default:return cyc(3)<.8?{dir:mix(center,.55,side,Math.sin(t*2+ph)*.4),speed:.75}:{dir:toward,speed:1.2};
 }
}
/* 碰撞分類：依相對速度與法線夾角、是否護盾、是否連續 */
export function classifyHit(a,b,nx,nz,recent,shielded){
 const rvx=a.vx-b.vx,rvz=a.vz-b.vz,rv=Math.hypot(rvx,rvz),along=rv?Math.abs(rvx*nx+rvz*nz)/rv:0,power=Math.min(1,rv/4.5);
 const sa=Math.hypot(a.vx,a.vz),sb=Math.hypot(b.vx,b.vz),fa=sa?Math.abs(a.vx*nx+a.vz*nz)/sa:0,fb=sb?Math.abs(b.vx*nx+b.vz*nz)/sb:0;
 const type=shielded?'rebound':recent?'combo':along>.82&&fa>.6&&fb>.6?'front':along<.45?'graze':'side';
 return {type,power:Math.round(power*100)/100};
}

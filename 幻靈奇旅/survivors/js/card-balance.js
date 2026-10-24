// Cave-only base values. Original exploration/tower species data is read-only.
export const CARD_TIERS={
 yellow:[{hp:90,attack:26,defense:10,power:1},{hp:125,attack:40,defense:14,power:1.3},{hp:160,attack:54,defense:18,power:1.6}],
 purple:[{hp:170,attack:56,defense:20,power:1.45},{hp:220,attack:78,defense:24,power:2},{hp:250,attack:90,defense:28,power:2.2},{hp:275,attack:100,defense:32,power:2.4}],
 red:[{hp:310,attack:112,defense:36,power:2.6},{hp:350,attack:130,defense:40,power:2.9},{hp:390,attack:145,defense:44,power:3.2}]
};
export const PASSIVE_UNITS={hp:.125,defense:.1,'proc-poison':.08,'proc-paralysis':.06,'proc-freeze':.05,'proc-slow':.08,'proc-knockback':.07,pickup:.06,reduction:.06,regen:.001,attack:.125,range:.06,heal:.08,projectileSpeed:.08,cooldown:.035,speed:.05,crit:.025,petXp:.05,capture:.035};
export function cardBase(spec){if(!spec?.id||!spec.role&&!spec.cardFrame)return{hp:spec?.hp||90,attack:spec?.attack||26,defense:spec?.defense||10,power:1};const tiers=CARD_TIERS[spec.cardFrame||'yellow']||CARD_TIERS.yellow;return{...tiers[Math.max(0,Math.min(tiers.length-1,(spec.stage||1)-1))]};}
export function passiveDescription(effect,value){const percent=+(value*100).toFixed(3),labels={hp:'生命上限',defense:'防禦力',pickup:'拾取半徑',reduction:'承受傷害',regen:'每秒恢復最大 HP',attack:'攻擊力',range:'攻擊範圍',heal:'治療效果',projectileSpeed:'投射物速度',cooldown:'技能冷卻',speed:'移動速度',crit:'暴擊率',petXp:'幻靈經驗',capture:'捕捉率'};return effect==='regen'?labels[effect]+' '+percent+'%':(labels[effect]||effect)+' '+(['reduction','cooldown'].includes(effect)?'−':'+')+percent+'%';}

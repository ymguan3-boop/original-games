import {promoterHireCost} from './shop-entry-rules.js?v=20261110-shop-pk-r1';
/* 宣傳員：大型幻靈在店門外當吉祥物。不佔在班名額，一次一位；
 * 打烊結算時依機率把當天毛利再提高 1% 到該宣傳員的上限。 */
export const PROMOTERS=[
 {id:'swampert',level:1,cost:300,maxBonus:.01,text:'站在門口揮手，路過的冒險者忍不住進來看看。'},
 {id:'feraligatr',level:2,cost:650,maxBonus:.02,text:'用長鼻子噴出彩色泡泡，小朋友排隊要合照。'},
 {id:'empoleon',level:3,cost:1000,maxBonus:.03,text:'在屋簷上展翅，遠遠就看得到商會招牌。'},
 {id:'blissey',level:4,cost:1500,maxBonus:.04,text:'灑下光羽，讓整條街都亮起來。'},
 {id:'mewtwo',level:5,cost:2200,maxBonus:.05,text:'盤在門口的水蛟龍王，是全鎮最有名的吉祥物。'}
];
export const BONUS_CHANCE=.7;
export const promoterDef=id=>PROMOTERS.find(p=>p.id===id)||null;
export const availablePromoters=s=>PROMOTERS.filter(p=>p.level<=s.level);
export function hirePromoter(g,s,id){
 const p=promoterDef(id);if(!p)throw Error('沒有這位宣傳員');if(p.level>s.level)throw Error(`商會 Lv.${p.level} 才能聘請`);
 if(s.employees.some(e=>e.spiritId===id||e.baseId===id))throw Error('這位幻靈已是員工，不能同時擔任宣傳員');if(s.promoter?.id===id)throw Error('已經是目前的宣傳員');const cost=promoterHireCost(s,p);g.pay(s,cost);s.stats.expenses+=cost;s.promoterFirstHireClaimed=true;
 const sp=g.data.spirits.find(x=>x.id===id);s.promoter={id,name:sp?.name||id,since:s.day};g.log(s,`${s.promoter.name} 成為商會宣傳員。`);return `${s.promoter.name} 開始在門口宣傳`;
}
/* 只在毛利為正時加成，避免虧損的日子被放大 */
export function settlePromoter(g,s){
 const p=promoterDef(s.promoter?.id);if(!p)return 0;const gross=(s.stats.revenue||0)-(s.stats.cogs||0);if(gross<=0||g.random(s)>BONUS_CHANCE)return 0;
 const rate=.01+g.random(s)*(p.maxBonus-.01),bonus=Math.round(gross*rate);if(bonus<=0)return 0;
 s.gold+=bonus;s.stats.promoterBonus=(s.stats.promoterBonus||0)+bonus;g.log(s,`${s.promoter.name} 的宣傳讓今天多賺了 ${bonus} G（${Math.round(rate*100)}%）。`);return bonus;
}

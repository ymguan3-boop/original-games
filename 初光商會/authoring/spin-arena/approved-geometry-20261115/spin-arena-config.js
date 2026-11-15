export const SPIN_RULES=Object.freeze({unlock:3,radius:2.25,bodyRadius:.64,roundSeconds:45,roundsToWin:2,maxUpgrade:5,upgradeStep:.06,statBonusCap:.35,coinCap:450,partCap:3,trafficMin:.05,trafficMax:.15,trafficCap:.15,combinedTrafficCap:1.45,fixedStep:1/60});
export const SPIN_TOPS=[
 {id:'flame',name:'烈焰獅王',color:0xa9231c,metal:0xe4af38,kind:'攻擊',element:'fire',cost:300,reputation:0,attack:31,defense:19,speed:23,stamina:22,skill:'獅焰衝鋒',blades:5},
 {id:'wind',name:'蒼風翼龍',color:0x3286d1,metal:0xdce8f0,kind:'速度',element:'wind',cost:300,reputation:0,attack:23,defense:20,speed:33,stamina:20,skill:'風翼迴旋',blades:6},
 {id:'crystal',name:'翠晶守衛',color:0x4b9b45,metal:0xd6bf5c,kind:'防禦',element:'earth',cost:300,reputation:0,attack:19,defense:34,speed:19,stamina:24,skill:'晶壁反擊',blades:8},
 {id:'thunder',name:'雷光戰狼',color:0x8654b6,metal:0xefc955,kind:'爆發',element:'wind',cost:800,reputation:10,attack:30,defense:21,speed:29,stamina:18,skill:'雷牙爆襲',blades:4},
 {id:'shield',name:'聖耀天盾',color:0xf5eed4,metal:0xdcae37,kind:'持久',element:'earth',cost:800,reputation:20,attack:18,defense:26,speed:19,stamina:35,skill:'聖耀守護',blades:10},
 {id:'shadow',name:'影刃魔鋒',color:0x393046,metal:0xa261cb,kind:'平衡',element:'fire',cost:800,reputation:30,attack:26,defense:26,speed:25,stamina:25,skill:'影刃連斬',blades:7}
];
export const SPIN_PARTS={rim:{name:'輪盤',choices:{attack:'鋒刃（攻擊）',defense:'厚甲（防禦）',stamina:'平衡環（持久）'}},axis:{name:'軸心',choices:{speed:'疾行軸（速度）',defense:'定心軸（穩定）',stamina:'長轉軸（持久）'}},ring:{name:'外環',choices:{attack:'爆發環（攻擊）',defense:'護盾環（防禦）',speed:'迅捷環（速度）'}}};
export const SPIN_OPPONENTS=[{id:'rookie',name:'小鎮新秀',topId:'wind',difficulty:0,reward:55,rep:2},{id:'artisan',name:'機巧工匠',topId:'crystal',difficulty:1,reward:95,rep:4},{id:'champion',name:'廣場冠軍',topId:'shadow',difficulty:2,reward:150,rep:6}];
export const spinTop=id=>SPIN_TOPS.find(t=>t.id===id);
export function plazaArenaPlacement(level){return {x:0,zOffset:level===3?3.15:level===4?3.85:4.35,radius:level===3?1.65:1.9,stallX:level===3?3.7:level===4?4.7:4};}

export const SPIN_RULES=Object.freeze({unlock:3,radius:2.25,bodyRadius:.64,roundSeconds:45,roundsToWin:2,maxUpgrade:20,chargeRate:2,upgradeStep:.06,statBonusCap:.8,coinCap:450,partCap:3,trafficMin:.05,trafficMax:.15,trafficCap:.15,combinedTrafficCap:1.45,fixedStep:1/60,cutinSeconds:.8,visitorMin:180,visitorMax:300});
export const SPIN_TOPS=[
 {id:'flame',name:'烈焰獅王',color:0xa9231c,metal:0xe4af38,kind:'攻擊',element:'fire',cost:300,reputation:0,attack:31,defense:19,speed:23,stamina:22,skill:'獅焰衝鋒',blades:5},
 {id:'wind',name:'蒼風翼龍',color:0x3286d1,metal:0xdce8f0,kind:'速度',element:'wind',cost:300,reputation:4,attack:23,defense:20,speed:33,stamina:20,skill:'風翼迴旋',blades:6},
 {id:'crystal',name:'翠晶守衛',color:0x4b9b45,metal:0xd6bf5c,kind:'防禦',element:'earth',cost:300,reputation:10,attack:19,defense:34,speed:19,stamina:24,skill:'晶壁反擊',blades:8},
 {id:'thunder',name:'雷光戰狼',color:0x8654b6,metal:0xefc955,kind:'爆發',element:'wind',cost:800,reputation:18,attack:30,defense:21,speed:29,stamina:18,skill:'雷牙爆襲',blades:4},
 {id:'shield',name:'聖耀天盾',color:0xf5eed4,metal:0xdcae37,kind:'持久',element:'earth',cost:800,reputation:28,attack:18,defense:26,speed:19,stamina:35,skill:'聖耀守護',blades:10},
 {id:'shadow',name:'影刃魔鋒',color:0x393046,metal:0xa261cb,kind:'平衡',element:'fire',cost:800,reputation:40,attack:26,defense:26,speed:25,stamina:25,skill:'影刃連斬',blades:7}
];
export const SPIN_PARTS={rim:{name:'輪盤',choices:{attack:'鋒刃（攻擊）',defense:'厚甲（防禦）',stamina:'平衡環（持久）'}},axis:{name:'軸心',choices:{speed:'疾行軸（速度）',defense:'定心軸（穩定）',stamina:'長轉軸（持久）'}},ring:{name:'外環',choices:{attack:'爆發環（攻擊）',defense:'護盾環（防禦）',speed:'迅捷環（速度）'}}};
export const SPIN_GRADES={normal:{name:'普通',primary:.08,secondary:.02,color:'#827659'},advanced:{name:'進階',primary:.14,secondary:.04,color:'#397fa6'},high:{name:'高級',primary:.22,secondary:.06,color:'#9457ad'}};
export const SPIN_STAT_NAMES={attack:'攻',defense:'防',speed:'速',stamina:'持久'};
export function spinPartBonus(slot,value,grade='normal'){
 const g=SPIN_GRADES[grade];if(!g||!SPIN_PARTS[slot]?.choices[value])return {};
 const secondary={rim:{attack:'speed',defense:'stamina',stamina:'defense'},axis:{speed:'stamina',defense:'speed',stamina:'speed'},ring:{attack:'defense',defense:'stamina',speed:'attack'}}[slot][value];
 return {[value]:g.primary,[secondary]:g.secondary};
}
export const SPIN_SKILLS={flame:{seconds:4,bonuses:{attack:.65,speed:.15}},wind:{seconds:4,bonuses:{speed:.65,attack:.15}},crystal:{seconds:5,bonuses:{defense:.7,stamina:.2}},thunder:{seconds:3.5,bonuses:{attack:.45,speed:.45}},shield:{seconds:5,bonuses:{defense:.45,stamina:.65}},shadow:{seconds:4,bonuses:{attack:.3,defense:.2,speed:.3,stamina:.2}}};
export const spinBonusText=bonuses=>Object.entries(bonuses).map(([k,v])=>`${SPIN_STAT_NAMES[k]} +${Math.round(v*1000)/10}%`).join('／');
export const SPIN_OPPONENTS=[{id:'rookie',name:'小鎮新秀',topId:'wind',difficulty:0,reward:55,rep:2},{id:'artisan',name:'機巧工匠',topId:'crystal',difficulty:1,reward:95,rep:4},{id:'champion',name:'廣場冠軍',topId:'shadow',difficulty:2,reward:150,rep:6}];
export const spinTop=id=>SPIN_TOPS.find(t=>t.id===id);
export function plazaArenaPlacement(level){return {x:0,zOffset:level===3?3.15:level===4?3.85:4.35,radius:level===3?1.65:1.9,stallX:level===3?3.7:level===4?4.7:4};}
export function plazaArenaTheme(level){const tier=Math.max(3,Math.min(5,Math.floor(level)));return {level:tier,name:['灰岩青銅場','寶石拱冠場','皇家獅冠場'][tier-3],spectators:4+(tier-3)*4};}
export function plazaArenaSpectators(level){const p=plazaArenaPlacement(level),theme=plazaArenaTheme(level),r=p.radius+.65;return Array.from({length:theme.spectators},(_,i)=>{const angle=Math.PI*(.15+.72*i/(theme.spectators-1));return {x:Math.cos(angle)*r,zOffset:p.zOffset+Math.sin(angle)*r,angle,seed:6300+i*29};});}

/* Game-facing mapping for the approved native robot family. Legacy IDs retain saves. */
(()=>{'use strict';
 const stages={cyndaquil:1,quilava:2,typhlosion:3};
 const stage=key=>stages[String(key).replace('robot-evolution://','')];
 const has=key=>String(key).startsWith('robot-evolution://')&&!!stage(key);
 const attack=(key,strong=false)=>stage(key)===1?(strong?'PunchNova':'Punch'):stage(key)===2?(strong?'ChestNova':'ChestBeam'):(strong?'PalmNova':'PalmBeam');
 function motion(key,name){if(['Attack','Throw','Special'].includes(name))return attack(key,name==='Special');const n=({Run:'Walk',React:'Wave',Sit:'Idle',Sleep:'Idle',Hurt:'Idle',Celebrate:'Wave',Landing:'Land'})[name]||name;return stage(key)===1&&['Fly','Takeoff','Land'].includes(n)?'Walk':n;}
 function labels(key){return Object.assign({Idle:'待機',Walk:'行走',Wave:'揮手'},stage(key)===1?{Punch:'普通攻擊 · 小光波',PunchNova:'大絕 · 集能大光波'}:{Takeoff:'前傾起飛',Fly:'推進器飛行',Land:'降落',...(stage(key)===2?{ChestBeam:'小絕 · 胸口紅光',ChestNova:'大絕 · 紅色能量球'}:{PalmBeam:'小絕 · 掌心藍光',PalmNova:'大絕 · 藍色能量球'})});}
 window.RobotSpirits={has,stage,attack,motion,labels,duration:(key,strong)=>strong?(stage(key)===1?3:3.15):(stage(key)===1?1.65:2.35),create:key=>RobotEvolution.create({stage:stage(key),inPlace:true})};
})();

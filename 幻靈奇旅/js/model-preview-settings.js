/* Model-room presentation settings. Native controller metadata is authoritative. */
(()=>{'use strict';
const N='models/native/';
const routes=[
 {kind:'replacement',test:p=>/^(green-eye-bat|rabbit-evolution):\/\//.test(p),scripts:[N+'replacement-spirits.js'],create:async p=>(await ReplacementSpirits.load(p)).create(),labels:p=>ReplacementSpirits.labels(p)},
 {kind:'avian',test:p=>p.startsWith('avian://'),scripts:[N+'avian-spirits.js'],create:async p=>(await AvianSpirits.load(p)).create(),labels:p=>AvianSpirits.labels(p)},
 {kind:'frog',test:p=>p.startsWith('leaf-frog://'),scripts:[N+'leaf-frogs.js',N+'frog-spirits.js'],create:p=>FrogSpirits.create(p),labels:p=>FrogSpirits.labels(p),durations:()=>LeafFrogs.durations},
 {kind:'robot',test:p=>p.startsWith('robot-evolution://'),scripts:[N+'robot-evolution.js',N+'robot-spirits.js'],create:p=>RobotSpirits.create(p),labels:p=>RobotSpirits.labels(p),durations:{Takeoff:2,Land:2,Wave:2.5,Punch:1.65,PunchNova:3,ChestBeam:3.1,ChestNova:4.2,PalmBeam:3.1,PalmNova:4.2}},
 {kind:'deer',test:p=>p.startsWith('floral-deer://'),scripts:[N+'floral-deer.js'],create:p=>FloralDeer.create({stage:p.endsWith('meganium')?3:p.endsWith('bayleef')?2:1,inPlace:true}),labels:()=>({Greet:'點頭招呼',Pulse:'花光共鳴'})},
 {kind:'phoenix',test:p=>p==='light-phoenix://blissey',scripts:[N+'light-phoenix.js'],create:()=>LightPhoenix.create({inPlace:true}),labels:()=>({Idle:'展翼待機',Walk:'收翼行走',WingBurst:'振翼光波',FeatherVolley:'鳳羽連射'}),durations:{Takeoff:2.1,Land:2.1,WingBurst:2.4,FeatherVolley:2.7}},
 {kind:'outouman',test:p=>p==='outouman://pikachu',scripts:[N+'outouman.js'],create:()=>OutoumanSpirit.create({inPlace:true}),modes:['Idle','Walk','Wave','Beam','BeamPose','Roll','Throw','Hurt','Jump'],labels:()=>({Beam:'彩虹光束',BeamPose:'光束投球姿勢',Throw:'發射幻靈球'}),durations:{Beam:2,BeamPose:2,Roll:1,Throw:1.5,Jump:1.6}},
 {kind:'xiaoshan',test:p=>p==='xiaoshan://wigglytuff',scripts:[N+'xiaoshan.js'],create:()=>XiaoshanSpirit.create({inPlace:true}),modes:['Idle','Walk','Sleep','Wake','Jump','Scared','React'],labels:()=>({Sleep:'打瞌睡',Wake:'醒來',Scared:'驚恐表情'}),durations:{Wake:1.2,Jump:2.2,Scared:3}},
 {kind:'riceball',test:p=>p==='riceball://mew',scripts:[N+'riceball.js'],create:()=>RiceballSpirit.create({inPlace:true}),modes:['Auto','Idle','Roll','Stuck','Wave'],labels:()=>({Auto:'自動翻滾與卡住',Roll:'橫向翻滾',Stuck:'卡住 >_<',Wave:'紫色光波'})},
 {kind:'family',test:p=>p.startsWith('native://'),scripts:[N+'birds-blueprint.js',N+'elephants-blueprint.js',N+'families.js'],build:p=>NativeFamilies.build(p),labels:p=>NativeFamilies.labelsFor(p)}
];
const labels={Idle:'站立／待機',Rest:'休息',Walk:'行走／移動',Run:'跑步',Sit:'坐下',Sleep:'睡覺',Wake:'醒來',Takeoff:'蹲低起飛',Fly:'飛行',Glide:'滑翔',Land:'降落',Landing:'緩緩降落',Attack:'普通攻擊',Ultimate:'大絕招',Wave:'招呼',Greet:'招呼',React:'回應',Hurt:'受擊',Throw:'投擲',Roll:'翻滾',Jump:'跳躍',Hop:'小跳',NinjaRun:'忍者跑步',Celebrate:'歡呼',JumpCelebrate:'舉手跳起',Disappointed:'失落',GroundPoundDisappointed:'蹲下捶地',Eat:'吃辣椒',Count:'坐下數椒',InspectHat:'摘帽檢查',TongueWiggle:'擺動舌頭',PageFlutter:'翻動書頁',Armor:'武裝',Restore:'回滿',Evolve:'進化展羽',Peck:'銳喙啄擊',WingPounce:'幼鷹撲擊',PowerFlap:'強力拍翼射羽',SkyRam:'高空衝撞'};
const phaseLabels={hover:'懸浮待機','wave-outside':'外側揮手','hop-crouch':'彎膝蓄力','hop-air':'向前蹦跳','hop-land':'落地緩衝','carrot-reach-back':'伸手至背後取胡蘿蔔','carrot-retrieve':'沿身體外側取到身前','throw-release':'投擲胡蘿蔔','carrot-flight':'胡蘿蔔向前飛行','ram-crouch':'蹲低蓄力','ram-jump':'向前跳撞','ram-recover':'落地回位','guitar-grab-back':'抓住背後琴柄','guitar-clear-side':'沿身體外側取琴','guitar-forward-stab':'吉他向前刺擊','guitar-sweep-windup':'準備橫掃','guitar-side-sweep':'橫掃音符電光','guitar-return-side':'沿外側收琴','pain-crouch':'痛苦表情與半蹲','thunder-charge':'凝聚毒光雷彈','thunder-launch':'發射電光毒球','poison-impact':'毒光爆發',idle:'待機',breathing:'呼吸待機',gathering:'凝聚能量',restoring:'治癒回復',healing:'治癒回復',restore:'治癒回復',armour:'羽殼武裝',armoring:'羽殼武裝',shielding:'羽殼護盾',opening:'羽片展開',closing:'羽片收合',evolving:'進化展羽',recover:'收勢回復',recovery:'收勢回復',rest:'收翼休息',stride:'交替行走',walk:'移動',crouch:'屈膝蓄力',charge:'集氣蓄力',flight:'拍翼飛行',gliding:'展翼滑翔',descending:'減速降落','lift-off':'拍翼升空','lean-forward':'前傾準備','wing-pounce':'振翼撲擊','beak-strike':'啄擊命中','ram-dash':'俯衝撞擊','ram-impact':'撞擊反作用','high-ascent':'向上攀升'};
const loops=new Set(['Hover','Move','Dash','Auto','Idle','Rest','Walk','Run','NinjaRun','Sit','Sleep','Fly','Glide','Roll','Stuck','Scared','BeamPose']);
const suits={trainer:'原始造型',adventure:'冒險服',electric:'鹹蛋超人變身',mist:'小飯團同行',sound:'小山蝴蝶套裝',healing:'冒險套裝'};
const frameLabels={red:'紅卡',purple:'紫卡',default:'標準卡框'};
function route(path){return routes.find(r=>r.test(path))||null;}
function evolution(s,byId){
 if(!s)return '主角可切換六套既有服裝，套用與遊戲一致的外觀。';
 const name=id=>byId[id]?.name||id;
 if(s.id==='jigglypuff'){const chance=window.AvianRules?.captureChance({species:s},'normal',s.captureRate)??s.captureRate;return '基礎捕捉率 '+Math.round(chance*100)+'%；同次遭遇捕捉失敗時隨機變為小麻、咕咕或小鷹（依目前遊戲規則）。';}
 if(['treecko','grovyle'].includes(s.id))return '三色蛋同次遭遇捕捉失敗時的變化型態；不以羈絆卡片進階。';
 if(s.id==='sceptile')return '小鷹卡片累積 3 張 → '+name('palkia');
 if(s.id==='palkia')return '由 3 張小鷹卡進階取得；目前無後續進階。';
 if(s.id==='giratina')return '加入隊伍累計完成擂台 3 場 → '+name('raichu')+'（勝敗皆計、不要求連續參戰；中途離開不計次）。';
 if(s.id==='kyogre')return '小金魚卡片 3 張 → 隨機金魚國王或金魚皇后。';
 const next=s.evolvesTo||s.next;
 if(!next)return s.id==='mewtwo'?'將國王與皇后各 3 張交給釣魚郎換取魚飼料，再於河畔召喚。':'目前無後續進階。';
 if(['raikou','entei','articuno'].includes(s.id))return '連續擂台參戰 3 場 → '+name(next);
 return (Number(s.stage)===1?5:10)+' 份羈絆 → '+name(next);
}
window.ModelRoomSettings={routes,route,labels,phaseLabels,loops,suits,frameLabels,evolution,revision:'20261022-six-elements-v1'};
})();

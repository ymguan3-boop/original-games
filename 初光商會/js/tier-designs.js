// One style specification drives the catalogue, runtime model and generated thumbnail.
export const TIER_DESIGNS=[null,
 {name:'晨光木作',wood:0xd9ae78,dark:0x76523a,panel:0xb8c6a5,trim:0xd8b369,accent:0xd9e7c6,shape:'cottage',motif:'leaf'},
 {name:'遠行冒險',wood:0xc08a53,dark:0x5b3e2d,panel:0x708466,trim:0xbb8151,accent:0xf4c882,shape:'expedition',motif:'sword'},
 {name:'匠心工坊',wood:0xa7774f,dark:0x4b342a,panel:0x6c807b,trim:0x8e9c9c,accent:0xe7b65d,shape:'workshop',motif:'gear'},
 {name:'星穹藍金',wood:0x657c9b,dark:0x293951,panel:0x91b3c2,trim:0xdbb96e,accent:0xe9e0b1,shape:'star',motif:'star'},
 {name:'傳奇朱金',wood:0xc27564,dark:0x783f36,panel:0xe9d8b6,trim:0xe5bd61,accent:0xa8474c,shape:'crown',motif:'crown'},
 {name:'翡翠花庭',wood:0x88ae94,dark:0x475c4a,panel:0xc9dcc3,trim:0xc2ad79,accent:0xd9acb5,shape:'botanical',motif:'flower'},
 {name:'象牙雅藏',wood:0xe3d8bf,dark:0x826956,panel:0xc5b8a3,trim:0xc3a275,accent:0xf7efdc,shape:'gallery',motif:'pearl'},
 {name:'紫晶祕法',wood:0x9785b0,dark:0x493a69,panel:0xc0b1d3,trim:0xd2c6ad,accent:0x87d1d9,shape:'moon',motif:'moon'},
 {name:'蒼藍王室',wood:0x6388b0,dark:0x2d456b,panel:0xadc3d6,trim:0xe2bf6d,accent:0x6fd0ce,shape:'royal',motif:'crown'},
 {name:'天曜神話',wood:0xf1e5c7,dark:0xa48a64,panel:0xc4e0d9,trim:0xe9c975,accent:0x77c9c9,shape:'celestial',motif:'sun'}];
export const tierNumber=n=>Math.max(1,Math.min(10,Math.floor(Number(n)||1)));
export function tierDefinition(base,tier){const n=tierNumber(tier),theme=TIER_DESIGNS[n],delta=Math.max(0,n-base.level),capacity=base.capacity?base.capacity+delta*(base.id==='materials'?4:3):undefined;return {...base,tier:n,baseName:base.name,name:`${theme.name}・${base.name}`,cost:Math.round(base.cost*(1+delta*.18)),...(capacity?{capacity,premium:Math.round((base.premium+delta*.025)*1000)/1000,columns:base.columns||5,depth:base.depth||3,spacing:(base.top-.46)/Math.max(1,Math.ceil(capacity/((base.columns||5)*(base.depth||3)))-1)}:{})};}
export const tierThumb=(group,type,tier,state='full')=>`./assets/tier-v43/lv${tierNumber(tier)}/${group}-${type}${group==='rack'?'-'+state:''}.webp?v=20261114-v57r2`;

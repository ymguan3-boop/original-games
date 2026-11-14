import {applyWallFinish} from './wall-finish-v7.js?v=20261114-v50';
export function finishes(level,mat){return {wall:mat([0,0xffedce,0xf1e2bd,0xe2e8cd,0xdce9e6,0xdde6d4][level]),floorA:mat([0,0xd9b97d,0xd4a66b,0xd9d8bd,0xe5e9e5,0xe5e6d2][level]),floorB:mat([0,0xe9d29c,0xe8c48c,0xf0e8ce,0xf9f7ec,0xf9f3db][level]),ceiling:mat([0,0x64442a,0x946834,0x526444,0xe5d8b7,0x35535c][level]),curtain:mat(level===5?0x34575c:level===4?0x607c58:0x668a3f)};}
export function floorFinish({T,building,level,width,depth,finish,oakTexture,metrics}){
 const file='floor-lv'+level;
 const record=metrics.floorFinish={level,file:file+'.webp',status:'loading'};
 // Keep the light stone fallback visible until the asynchronous image is decoded.
 const material=new T.MeshStandardMaterial({color:level===3?0xe2e6dc:0xffffff,roughness:level>=4?.5:.85});
 let disposed=false;
 const tex=new T.TextureLoader().load('./assets/art-v11/'+file+'.webp?v=5',loaded=>{
  if(disposed){loaded.dispose();return;}
  material.map=loaded;material.needsUpdate=true;record.status='ready';
 },undefined,()=>{record.status='error';metrics.errors.push('地板貼圖載入失敗：'+file+'.webp');});
 material.addEventListener('dispose',()=>{disposed=true;tex.dispose();});
 tex.encoding=T.sRGBEncoding;tex.wrapS=tex.wrapT=T.RepeatWrapping;
 tex.repeat.set(width/6,depth/6);
 material.color.setScalar([0,.6,.8,.82,.86,.86][level]);
 const floor=new T.Mesh(new T.PlaneGeometry(width,depth),material);floor.rotation.x=-Math.PI/2;floor.position.set((width-1)/2,.041,(depth-1)/2);floor.receiveShadow=true;
 Object.assign(floor.userData,{ownedGeometry:true,ownedMaterial:true,ownedTexture:true,noOutline:true});building.add(floor);metrics.floorTexture=file+'.webp';
}
export function windows({T,building,level,width,box,mats,metrics}){applyWallFinish({T,building,level,width,material:mats.finishes.wall,metrics});const {gold,cream,wood,windowGlass}=mats,paint=mats.finishes.curtain,centers=[1.5,width-2.2,...(width>=20?[16.5]:[]),...(width>=22?[19.5]:[])];metrics.windows=[];
 for(const x of centers){
  const base=box(1.68,1.90,.10,wood,x,2,-.24,building);base.userData.windowFrame=true;
  if(level<4){box(1.48,1.65,.05,windowGlass,x,2,-.155,building);for(const d of [-.76,.76])box(.08,1.78,.10,cream,x+d,2,-.09,building);for(const y of [1.14,2.86])box(1.62,.08,.10,cream,x,y,-.09,building);box(.055,1.68,.10,cream,x,2,-.055,building);box(1.5,.055,.10,cream,x,2,-.055,building);
   for(const d of [-1.05,1.05]){box(.28,1.83,.09,paint,x+d,2,-.12,building);if(level>=2)for(let y=1.23;y<2.8;y+=.18)box(.25,.035,.045,cream,x+d,y,-.047,building);}
   if(level===3)for(const d of [-.36,.36]){const bar=box(.027,1.4,.04,gold,x+d,2,-.025,building);bar.rotation.z=d>0?-.28:.28;}
  }else{
   const shape=new T.Shape();shape.moveTo(-.72,-.85);shape.lineTo(.72,-.85);shape.lineTo(.72,.30);shape.absarc(0,.30,.72,0,Math.PI,false);shape.lineTo(-.72,-.85);const geometry=new T.ShapeGeometry(shape),uv=geometry.attributes.uv,pos=geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+.72)/1.44,(pos.getY(i)+.85)/1.87);
   const tex=new T.TextureLoader().load('./assets/art-v6/celestial-glass.webp');tex.encoding=T.sRGBEncoding;const glass=new T.Mesh(geometry,new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));glass.position.set(x,2,-.13);Object.assign(glass.userData,{ownedGeometry:true,ownedMaterial:true,ownedTexture:true,noOutline:true});building.add(glass);
   for(const d of [-.77,.77])box(.07,1.18,.09,gold,x+d,1.71,-.07,building);box(1.62,.09,.12,gold,x,1.12,-.06,building);const arch=new T.Mesh(new T.TorusGeometry(.765,.042,6,28,Math.PI),gold);arch.position.set(x,2.30,-.06);arch.userData.ownedGeometry=true;building.add(arch);box(.04,1.72,.08,cream,x,2,-.015,building);
   // Curtains stay wholly inside a single three-cell bay; ties sit in front of folds.
   for(const sign of [-1,1]){for(let i=0;i<3;i++)box(.082,1.86,.10+(i%2)*.045,paint,x+sign*(.92+i*.09),2.08,.06,building);box(.34,.065,.08,gold,x+sign*1.01,1.66,.185,building);}
   box(2.5,.065,.09,gold,x,3.12,.08,building);
  }
  metrics.windows.push({center:x,min:x-1.25,max:x+1.25,columnLeft:x-1.5,columnRight:x+1.5,clearance:.09,style:level<4?'timber':'arched-glass'});
 }
 // Open roof reveals the shop; layered fascia represents the ceiling edge.
 box(width,.18,.36,mats.finishes.ceiling,(width-1)/2,3.38,-.22,building);if(level>=2)box(width,.055,.40,level>=3?gold:cream,(width-1)/2,3.25,-.18,building);if(level>=4)box(width,.075,.28,gold,(width-1)/2,3.51,-.19,building);if(level===5)for(let x=.5;x<width-.5;x+=1)box(.16,.09,.06,gold,x,3.39,-.005,building);
 metrics.architecture={level,floor:['','暖色石磚','蜂蜜橡木','象牙石拼花','珠光大理石','皇家金線石紋'][level],ceiling:'開放剖面天花收邊',windowCount:centers.length};
}

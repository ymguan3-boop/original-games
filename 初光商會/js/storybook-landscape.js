// Districts follow the five architectural tiers. The neighboring lots are
// beside or behind the shop, leaving the front garden, road and plaza free.
const districts=[null,
 {wall:0xcaa579,roof:0xa56242,trim:0x76513f,accent:0x9aaa79,leaves:[0x849255,0xa6aa62,0xc3995a]},
 {wall:0xefc58e,roof:0x497f76,trim:0x80513b,accent:0xd8985b,leaves:[0x56876a,0x89a866,0xb6bd76]},
 {wall:0xe0b38f,roof:0xaf5753,trim:0x754b48,accent:0x568d93,leaves:[0x67916f,0xc4935c,0xd2ad76]},
 {wall:0xf0dcca,roof:0x527b9b,trim:0x66586d,accent:0xc69286,leaves:[0x678c83,0x91a7a0,0xcb9f93]},
 {wall:0xf0dabb,roof:0x806294,trim:0x7b596e,accent:0xc29b58,leaves:[0x749583,0xb998a6,0xd3b078]}
];

export function buildStoryHorizon(T,w,d,tier=1){
 const root=new T.Group();root.name='遠山與糖楓林';
 const hill=new T.IcosahedronGeometry(1,1),crown=new T.IcosahedronGeometry(1,0);
 const cone=new T.ConeGeometry(1,1,7),timber=new T.CylinderGeometry(.69,1,1,7);
 const block=new T.BoxGeometry(1,1,1),round=new T.CylinderGeometry(1,1,1,10);
 const gable=new T.Shape();gable.moveTo(-.58,0);gable.lineTo(0,1);gable.lineTo(.58,0);gable.closePath();
 const roof=new T.ExtrudeGeometry(gable,{depth:1,bevelEnabled:false});roof.translate(0,0,-.5);
 const batches=new Map([hill,crown,cone,timber,block,round,roof].map(g=>[g,[]]));
 function part(shape,color,x,y,z,sx,sy,sz,tilt=0,yaw){const batch=batches.get(shape);
  batch.push({color,x,y,z,sx,sy,sz,tilt,yaw:yaw??batch.length*.79});}
 const paint=districts[tier];
 const back=-d/2;
 for(let i=0;i<11;i++){
  const x=(i-5)*6.7,z=back-20-Math.cos(i*2.6)*2,h=3.2+2*Math.sin(i*1.2);
  part(hill,i%2?0x71a79b:0x869ca4,x,-.65,z,8.1,h,6.5);
 }
 function tree(x,z,h,pine,index){
  const lean=Math.sin(index)*.11;
  part(timber,0x795443,x,h*.28,z,.16*h/3,h*.57,.17*h/3,lean);
  if(pine){
   for(let j=0;j<3;j++){const size=h*(.32-.064*j);part(cone,[0x426b60,0x538274,0x729780][j],x+h*lean*j*.15,h*(.46+.18*j),z,size,h*(.58-.09*j),size,lean*.7);}
  }else{
   for(let j=0;j<5;j++){const a=j*1.91,offset=j===4?0:.18*h;
    part(hill,paint.leaves[j%3],x+Math.cos(a)*offset,h*(j===4?.85:.60+j*.035),z+Math.sin(a)*offset,h*.24,h*(j===4?.28:.24),h*.24,lean);}
  }
 }
 function cottage(x,z,size,angle,index){
  const cs=Math.cos(angle),sn=Math.sin(angle),depth=1.52,height=1.35+(tier>=3?.34:0);
  const width=1.95, roofHeight=.85+.09*tier;
  function place(shape,col,dx,y,dz,sx,sy,sz,tilt=0){
   part(shape,col,x+size*(cs*dx+sn*dz),size*y-.06,z+size*(-sn*dx+cs*dz),sx*size,sy*size,sz*size,tilt,angle);
  }
  place(block,0xb2a088,0,.1,0,width+.16,.23,depth+.15);
  place(block,paint.wall,0,height*.5+.18,0,width,height,depth);
  place(roof,paint.roof,0,height+.16,0,width+.18,roofHeight,depth+.40);
  place(block,paint.trim,-.59,height+.64,-.26,.22,.95,.25);
  place(block,0xc7a277,-.59,height+1.13,-.26,.29,.12,.32);
  const face=depth/2;
  for(const side of [-1,1]){
   place(block,paint.trim,side*.91,height*.5+.15,face,.10,height,.085);
   place(block,paint.trim,side*.62,height*.58+.11,face+.05,.41,.54,.08);
   place(block,0xf5cf89,side*.62,height*.58+.11,face+.10,.32,.42,.025);
   place(block,paint.trim,side*.62,height*.58+.11,face+.12,.038,.45,.018);
   place(block,paint.accent,side*.62,height*.58-.16,face+.12,.54,.13,.16);
  }
  place(block,paint.trim,0,.56,face+.055,.46,.98,.09);
  place(block,paint.accent,0,.54,face+.115,.35,.84,.045);
  place(block,paint.trim,0,height+.13,face+.06,2.05,.12,.10);
  if(tier>=3){place(block,paint.trim,0,height+.44,face+.16,.36,.32,.08);place(block,0xf3d997,0,height+.44,face+.212,.23,.19,.03);}
  if(tier>=4){place(round,paint.wall,.93,height*.56,-.3,.39,height*1.12,.39);place(cone,paint.roof,.93,height*1.12+.43,-.3,.52,.86,.52);}
  // Crates with bindings, barrels with hoops and a low split-rail fence.
  for(let j=0;j<2+index%2;j++){
   const dx=-1.27-j*.33,dz=.13+j*.36;
   if((j+index)%2){
    place(round,0xae774d,dx,.27,dz,.24,.54,.24);
    for(const y of [.12,.40])place(round,0x6b6458,dx,y,dz,.246,.055,.246);
   }else{
    place(block,0xb88658,dx,.22,dz,.45,.44,.43);
    for(const side of [-1,1])place(block,paint.trim,dx+side*.16,.22,dz+.22,.035,.42,.018);
   }
  }
  for(let j=0;j<4;j++)place(block,paint.trim,.58+j*.41,.26,1.22,.085,.54,.085);
  for(const y of [.16,.36])place(block,0xc39b6b,1.19,y,1.22,1.36,.055,.065);
 }
 // Keep the inhabited side visible in the default three-quarter and frontal
 // cameras. Leave a full strip between the side wall and the nearest cottage.
 cottage(-w*.5-2.85,back+.65,1.24,.19,0);
 cottage(w*.5+3.15,back-2.20,1.09,-.27,1);
 if(tier>=2)cottage(1.8,back-6.4,1.30,-.24,2);
 if(tier>=3)cottage(-w*.47,back-6.9,1.20,.17,3);
 if(tier>=4)cottage(w*.5+6.5,back-5.15,1.24,-.17,4);
 for(const [i,[x,z,h,pine]] of [
  [-w*.5-1.4,back-1.6,3.1,false],[-w*.5-5.5,back+1.5,4.7,true],
  [w*.5+1.95,back-.13,2.65,false],[w*.5+4.7,back-.52,3.8,true],
  [-w*.18,back-3.7,3.3,true],[w*.31,back-4.3,4.4,false],
  [w*.5+1.9,back+2.12,1.35,false],[-w*.5-1.62,back+2.04,1.7,false]
 ].entries())tree(x,z,h*(1+.035*(tier-1)),pine,i);
 for(let i=0;i<23;i++){
  const x=(i-11)*2.35,z=back-8.2-2.7*(1+Math.sin(i*3.2)),h=2.5+.8*Math.cos(i*2.5);
  part(timber,0x80533f,x,h*.3,z,.15,h*.65,.16,-.07);
  if(i%3===0){
   for(let k=0;k<3;k++)part(cone,[0x427369,0x598878,0x72a18b][k],x+.07*k,h*(.52+.18*k),z,1.03-.21*k,h*(.70-.12*k),1.01-.21*k,-.06*k);
  }else{
   const leaves=i%4===1?[0xba8155,0xe0a95d,0xe8c775]:[0x688659,0x93a763,0xb2bb77];
   for(let k=0;k<3;k++)part(crown,leaves[k],x+(k-1)*.43,h*(.63+.09*k),z+.16*Math.sin(i),.95-.11*k,1.25-.1*k,.81,-.17+k*.12);
  }
 }
 const dummy=new T.Object3D(),tint=new T.Color();
 for(const [geometry,pieces] of batches){
  const material=new T.MeshStandardMaterial({roughness:1,flatShading:true});
  const mesh=new T.InstancedMesh(geometry,material,pieces.length);
  pieces.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,p.tilt);dummy.scale.set(p.sx,p.sy,p.sz);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,tint.setHex(p.color).convertSRGBToLinear());});
  mesh.userData.noOutline=true;mesh.userData.ownedGeometry=true;mesh.userData.ownedMaterial=true;root.add(mesh);
 }
 return root;
}

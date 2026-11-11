/* 場景與戰鬥共用碰撞資料，中心半徑 9m 留白。 */
export const MEADOW_SOLIDS=[
 {id:'pond',kind:'pond',x:-16,z:-7,rx:4.8,rz:3.4},
 {id:'cliff',kind:'cliff',x:19,z:-14,rx:7,rz:3},
 ...[[-11,10,1.1],[9,-12,.8],[16,7,1.2],[-24,-18,1.5],[5,20,.9],[-7,-23,1.3]].map(([x,z,r],i)=>({id:'rock'+i,kind:'rock',x,z,rx:r,rz:r*.8})),
 ...[[-23,8],[-12,19],[14,18],[25,0],[-26,-3],[-7,-18],[8,-23],[24,-22],[-25,24],[23,25]].map(([x,z],i)=>({id:'tree'+i,kind:'tree',x,z,rx:.5+i%3*.13,rz:.5+i%3*.13,height:4+i%4*1.1,pine:i%2===0}))
];
for(let i=0;i<12;i++){const a=i/12*Math.PI*2;MEADOW_SOLIDS.push({id:'shore'+i,kind:'rock',x:-16+Math.sin(a)*5.2,z:-7+Math.cos(a)*3.8,rx:.5,rz:.4});}
export function meadowBlocked(p,radius=.45){return MEADOW_SOLIDS.some(o=>((p.x-o.x)/(o.rx+radius))**2+((p.z-o.z)/(o.rz+radius))**2<1);}
export function constrainMeadow(p,from=p,radius=.45){let at={x:from.x,z:from.z};if(meadowBlocked(at,radius)){for(const o of MEADOW_SOLIDS){const dx=at.x-o.x,dz=at.z-o.z,a=o.rx+radius+.02,b=o.rz+radius+.02,k=Math.hypot(dx/a,dz/b);if(k<1){at={x:o.x+(k>0?dx/k:a),z:o.z+(k>0?dz/k:0)};}}}
 const distance=Math.hypot(p.x-at.x,p.z-at.z),steps=Math.max(1,Math.ceil(distance/.2)),dx=(p.x-at.x)/steps,dz=(p.z-at.z)/steps;for(let i=0;i<steps;i++){const full={x:at.x+dx,z:at.z+dz};if(!meadowBlocked(full,radius))at=full;else{const x={x:at.x+dx,z:at.z},z={x:at.x,z:at.z+dz};if(!meadowBlocked(x,radius))at=x;else if(!meadowBlocked(z,radius))at=z;}}
 return at;
}
export function buildMeadow(T,scene,own,metrics){
 const group=new T.Group();group.name='商會草原';scene.add(group);const mat=color=>{const m=own(new T.MeshStandardMaterial({color,roughness:.92,flatShading:true}));m.color.convertSRGBToLinear();return m;};
 const bark=mat(0x775335),leaf=mat(0x548749),pine=mat(0x446f4a),rock=mat(0x85897d),cliff=mat(0x9c947b),water=own(new T.MeshStandardMaterial({color:0x328caa,roughness:.28,metalness:.12,transparent:true,opacity:.83}));
 water.color.convertSRGBToLinear();const geo=own(new T.IcosahedronGeometry(1,1)),trunk=own(new T.CylinderGeometry(.65,1,1,8)),cone=own(new T.ConeGeometry(1,1,8));let triangles=0;
 const mesh=(g,m,x,y,z,sx,sy,sz)=>{const n=new T.Mesh(g,m);n.position.set(x,y,z);n.scale.set(sx,sy,sz);group.add(n);triangles+=(g.index?g.index.count:g.attributes.position.count)/3;return n;};
 for(const o of MEADOW_SOLIDS){if(o.kind==='pond'){const g=own(new T.CircleGeometry(1,48)),n=mesh(g,water,o.x,.005,o.z,o.rx,o.rz,1);n.rotation.x=-Math.PI/2;}
 else if(o.kind==='tree'){mesh(trunk,bark,o.x,o.height*.28,o.z,o.rx,o.height*.56,o.rz);for(let j=0;j<3;j++){const size=(o.pine?1.8:1.65)*(1-j*.2);mesh(o.pine?cone:geo,o.pine?pine:leaf,o.x+(o.pine?0:Math.sin(j*2)*.45),o.height*(.55+j*.14),o.z+(o.pine?0:Math.cos(j*2)*.4),size,size*(o.pine?1.4:.85),size);}}
 else if(o.kind==='cliff'){for(let j=0;j<5;j++)mesh(geo,cliff,o.x-4+j*2,1.8+j%2*.8,o.z,2.7,3+j%2,o.rz);}
 else mesh(geo,rock,o.x,o.rx*.45,o.z,o.rx,o.rx*.7,o.rz);}
 /* 相同材質合併，樹木、岩岸不會各自增加一次 draw call。 */
 const batches=new Map();for(const n of group.children){n.updateMatrix();const g=(n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone()).applyMatrix4(n.matrix),data=batches.get(n.material)||{positions:[],normals:[]};data.positions.push(...g.attributes.position.array);data.normals.push(...g.attributes.normal.array);batches.set(n.material,data);g.dispose();}
 group.clear();for(const[material,data]of batches){const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.normals,3));g.computeBoundingSphere();group.add(new T.Mesh(g,material));}
 metrics.meadow={profile:'low-poly + generated texture',triangles,drawCalls:group.children.length,solidCount:MEADOW_SOLIDS.length,texture:'assets/meadow/grass-v1.webp',budget:5000};return group;
}

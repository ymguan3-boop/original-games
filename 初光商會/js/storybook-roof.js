// Sign brackets and the roof use the same outermost eave coordinate.
export const frontEaveZ=(depth,wallThickness)=>depth*.5+wallThickness+.37;

// A removable roof for the exterior camera. Every shingle follows the actual flared roof surface.
export function buildStorybookRoof(T,{level,w,d,H,t,doorX}){
  const palette=[null,
    [0xa46d48,0xb67d53,0x885e47,0xc39267,0x664b39,0xe2ba85],
    [0x2d8179,0x3d9183,0x306f70,0x5a9e87,0x354d52,0xf4d39d],
    [0xb34444,0xc4554c,0xa34349,0xcc6b52,0x723e47,0xffce91],
    [0x406c97,0x517ea5,0x456588,0x6093a8,0x3e445f,0xf5dcaa],
    [0x655284,0x7e6299,0x604d7d,0x8972a4,0x484260,0xf5ca71]
  ][level];
  const root=new T.Group();root.name='童話屋頂';
  const positions=[],colors=[],normal=new T.Vector3(),edge=new T.Vector3(),tint=new T.Color();
  function triangle(a,b,c,paint,up=false){
    normal.subVectors(b,a).cross(edge.subVectors(c,a));
    if(up&&normal.y<0)[b,c]=[c,b];
    tint.setHex(paint).convertSRGBToLinear();
    for(const p of [a,b,c]){positions.push(p.x,p.y,p.z);colors.push(tint.r,tint.g,tint.b);}
  }
  function quad(a,b,c,d,paint,up=false){triangle(a,b,c,paint,up);triangle(a,c,d,paint,up);}
  const hw=w*.5+t+.32,hd=frontEaveZ(d,t),peak=1.35+d*.14+level*.12;
  const apex=-d*.075,v=(x,y,z)=>new T.Vector3(x,y,z);
  function roofY(x,z){
    const u=Math.min(1,Math.abs(z-apex)/(hd-Math.sign(z-apex)*apex));
    const sway=.13*Math.pow(Math.abs(x/hw),3)-.13*Math.cos(x/hw*1.8);
    const sag=level===1?-.24*Math.exp(-((x+hw*.52)**2+(z-hd*.51)**2)/1.4):0;
    return H+.24+peak*Math.pow(1-u,1.48)+sway*(1-u*.6)+.11*Math.pow(u,7)+sag;
  }
  const pt=(x,z,offset=0)=>v(x,roofY(x,z)+offset,z);
  const columns=Math.ceil(hw*2/.74),rows=Math.ceil(hd/.57),step=hw*2/columns;
  for(const sign of [-1,1]){
    const span=hd-sign*apex;
    for(let r=0;r<rows;r++){
      const zm=apex+sign*span*r/rows, ze=apex+sign*span*(r+1)/rows;
      for(let i=-1;i<columns;i++){
        const left=Math.max(-hw,-hw+(i+(r%2)*.5)*step);
        const right=Math.min(hw,-hw+(i+1+(r%2)*.5)*step);
        if(right-left<.02)continue;
        const dz=ze-zm,shade=(i*17+r*13+24)%11,paint=palette[shade<4?0:shade<7?1:shade<10?2:3];
        const a=pt(left,zm),b=pt(right,zm),c=pt(right,ze),e=pt(left,ze);
        quad(a,b,c,e,palette[4],true);
        if(level===1&&sign===1&&((i===2&&r===rows-2)||(i===columns-3&&r===rows-1))){
          // Two slipped shingles expose the parallel edges of the timber lath beneath.
          for(let j=0;j<3;j++){
            const x=left+j*(right-left)/3+.015,xEnd=x+(right-left)/3-.025;
            quad(pt(x,zm,.015),pt(xEnd,zm,.015),pt(xEnd,ze,.015),pt(x,ze,.015),j%2?0xb38a5d:0x947050,true);
          }
          continue;
        }
        const x1=left+.014,x2=right-.014,xm=(x1+x2)*.5;
        const rim=[pt(x1,zm,.054),pt(x2,zm,.054),pt(x2,ze-dz*.15,.047),pt(x2-(x2-x1)*.16,ze-dz*.05,.065),pt(xm,ze,.066),pt(x1+(x2-x1)*.16,ze-dz*.05,.064),pt(x1,ze-dz*.15,.046)];
        const center=pt(xm,(zm+ze)/2,.093);
        for(let k=0;k<rim.length;k++)triangle(center,rim[k],rim[(k+1)%rim.length],paint,true);
      }
    }
    const zr=sign*hd;
    for(let i=0;i<columns;i++){
      const x1=-hw+step*i,x2=x1+step;
      quad(pt(x1,zr),pt(x2,zr),pt(x2,zr,-.13),pt(x1,zr,-.13),palette[4]);
    }
  }
  for(const side of [-1,1]){
    const x=side*hw;
    for(const sign of [-1,1])for(let r=0;r<rows;r++){
      const span=hd-sign*apex,z0=apex+sign*span*r/rows,z1=apex+sign*span*(r+1)/rows;
      quad(pt(x,z0),pt(x,z1),v(x,H+.02,z1),v(x,H+.02,z0),palette[4]);
      quad(pt(x+side*.016,z0,-.12),pt(x+side*.016,z1,-.12),pt(x+side*.016,z1,-.20),pt(x+side*.016,z0,-.20),palette[5]);
    }
  }
  if(level===1){
    // A waxed canvas patch pegged down with mismatched strips of reclaimed oak.
    const x=-hw*.51,z=hd*.51;
    function repairStrip(left,right,back,front,offset,paint){
      const skew=.07;
      quad(pt(x+left,z+back,offset),pt(x+right,z+back+skew,offset),
        pt(x+right-.045,z+front+skew,offset),pt(x+left-.045,z+front,offset),paint,true);
    }
    repairStrip(-.79,.78,-.65,.62,.145,0x897e5e);
    repairStrip(-.67,.69,-.55,.53,.163,0xaa9d77);
    for(const side of [-1,1]){
      repairStrip(side*.53-.06,side*.53+.06,-.72,.69,.202,side<0?0x956338:0xbd8c53);
      for(const end of [-.48,.50])repairStrip(side*.53-.024,side*.53+.024,end,end+.045,.22,0x52463c);
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const roof=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.95}));roof.castShadow=true;roof.receiveShadow=true;root.add(roof);
  const material=new Map();
  function add(g,paint,x,y,z){
    if(!material.has(paint))material.set(paint,new T.MeshStandardMaterial({color:new T.Color(paint).convertSRGBToLinear(),roughness:.82}));
    const m=new T.Mesh(g,material.get(paint));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
  }
  const box=(w,h,d,paint,x,y,z)=>add(new T.BoxGeometry(w,h,d),paint,x,y,z);
  function dormer(x,size){
    const z=hd*.49, y=roofY(x,z)-.28,glass=level<=2?0x729d94:0x658ba0;
    const shape=new T.Shape();shape.moveTo(-.65,0);shape.lineTo(.65,0);shape.lineTo(.65,.75);shape.quadraticCurveTo(.3,.97,0,1.3);shape.quadraticCurveTo(-.3,.97,-.65,.75);shape.closePath();
    const body=add(new T.ExtrudeGeometry(shape,{depth:.89,bevelEnabled:false,curveSegments:6}),palette[5],x,y,z-.62);body.scale.setScalar(size);
    for(const side of [-1,1]){
      const tile=box(.94*size,.15*size,1.21*size,palette[0],x+side*.35*size,y+1.09*size,z-.18);
      tile.rotation.z=-side*.66;
    }
    const face=z-.62+.89*size+.026;
    box(.50*size,.53*size,.053,palette[4],x,y+.51*size,face);
    box(.39*size,.41*size,.055,glass,x,y+.52*size,face+.03);
    box(.055,.43*size,.04,palette[5],x,y+.52*size,face+.067);
    box(.42*size,.055,.04,palette[5],x,y+.52*size,face+.067);
  }
  dormer(Math.min(hw-1.15,Math.max(-hw+1.15,doorX)),1+level*.065);
  if(level>=3)dormer(hw*.63,.78+level*.035);
  if(level>=4)dormer(-hw*.61,.9);
  const cx=-hw*.57,cz=apex-.66,cy=roofY(cx,cz)+.57;
  box(.56,1.68,.57,0xb97557,cx,cy,cz).rotation.z=-.06;
  box(.73,.17,.70,palette[4],cx+.05,cy+.76,cz);
  box(.64,.14,.63,0xe5b18a,cx+.05,cy+.89,cz);
  box(.42,.025,.39,0x60493d,cx+.05,cy+.97,cz);
  if(level>=4){
    const lx=hw*.32,ly=roofY(lx,apex);
    add(new T.CylinderGeometry(.37,.47,.63,8),palette[5],lx,ly+.24,apex);
    add(new T.ConeGeometry(.61,1.0,8),palette[1],lx,ly+1.0,apex);
    add(new T.OctahedronGeometry(.11),palette[5],lx,ly+1.59,apex);
  }
  root.traverse(o=>{o.userData.noLine=true;o.userData.noOutline=true;});return root;
}

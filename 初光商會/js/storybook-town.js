// Palette and silhouettes for the cutaway storybook town. Static colored pieces share one draw per group.
export const townPaint = [null,
  { roof:0xba7f53, shadow:0x855738, trim:0xf6dca6, wall:0xf7e2be, frame:0x9d704a, flag:0xe0b26e },
  { roof:0x398f86, shadow:0x285b63, trim:0xffdf9f, wall:0xffe1af, frame:0x9e6446, flag:0xee8760 },
  { roof:0xc75948, shadow:0x894354, trim:0xffdda3, wall:0xf6cdad, frame:0x765260, flag:0xe6ad4a },
  { roof:0x5188a5, shadow:0x565174, trim:0xf6daa5, wall:0xf9e6c7, frame:0x586c86, flag:0xc38bb2 },
  { roof:0x78629b, shadow:0x50466d, trim:0xffda82, wall:0xf8e9ca, frame:0x8c637e, flag:0xcd7778 }
];

function painter(T) {
  const pos=[], normal=[], color=[];
  const matrix=new T.Matrix4(), quaternion=new T.Quaternion(), euler=new T.Euler();
  const scale=new T.Vector3(), point=new T.Vector3(), direction=new T.Vector3(), normals=new T.Matrix3(), tint=new T.Color();
  function put(geo, paint, x,y,z, sx=1,sy=1,sz=1, rx=0,ry=0,rz=0) {
    matrix.compose(point.set(x,y,z),quaternion.setFromEuler(euler.set(rx,ry,rz)),scale.set(sx,sy,sz));
    normals.getNormalMatrix(matrix);tint.setHex(paint).convertSRGBToLinear();
    const vertex=geo.attributes.position, n=geo.attributes.normal, count=geo.index?.count??vertex.count;
    for(let i=0;i<count;i++){
      const j=geo.index?geo.index.getX(i):i;
      point.fromBufferAttribute(vertex,j).applyMatrix4(matrix);pos.push(point.x,point.y,point.z);
      direction.fromBufferAttribute(n,j).applyNormalMatrix(normals);normal.push(direction.x,direction.y,direction.z);color.push(tint.r,tint.g,tint.b);
    }
  }
  function finish(parent,name){
    const g=new T.BufferGeometry();
    for(const [key,values] of [['position',pos],['normal',normal],['color',color]])g.setAttribute(key,new T.Float32BufferAttribute(values,3));
    const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.89}));mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.name=name;mesh.userData.noLine=true;parent.add(mesh);return mesh;
  }
  return {put,finish};
}
function profile(T,draw,depth){
  const s=new T.Shape();draw(s);s.closePath();return new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:6});
}
function crestPanel(T,level){
  return profile(T,s=>{
    s.moveTo(-1,0);s.lineTo(-1,.11);
    if(level<=2){s.quadraticCurveTo(-.6,.15,-.12,.95);s.quadraticCurveTo(-.02,1.16,.12,.94);s.quadraticCurveTo(.49,.24,1,.12);}
    else if(level===3){s.lineTo(-.82,.12);s.lineTo(-.82,.41);s.bezierCurveTo(-.58,.42,-.35,.39,-.33,.72);s.bezierCurveTo(-.28,1.08,.28,1.08,.33,.72);s.bezierCurveTo(.35,.39,.58,.42,.82,.41);s.lineTo(.82,.12);s.lineTo(1,.12);}
    else{s.quadraticCurveTo(-.51,.29,-.5,.66);s.quadraticCurveTo(-.28,.6,0,1.12);s.quadraticCurveTo(.28,.6,.5,.66);s.quadraticCurveTo(.51,.29,1,.12);}
    s.lineTo(1,0);
  },.14);
}
export function addStoryRoof(T,root,{level,w,d,H,t,doorX}){
  const paint=townPaint[level], batch=painter(T);
  const block=new T.BoxGeometry(), sphere=new T.IcosahedronGeometry(1,0), panel=crestPanel(T,level);
  const window=new T.CylinderGeometry(1,1,.12,14), cone=new T.ConeGeometry(1,1,8);
  const z=d/2+t+.16, h=.93+level*.08;
  for(const sign of [-1,1]){
    const outer=sign*w/2, cx=(outer+doorX)/2, span=Math.abs(outer-doorX), r=Math.min(1.65,span*.36);
    // Thin facade gables leave the overhead floorplan open and fade with the front wall.
    batch.put(panel,paint.shadow,cx,H+.01,z,r,h,1);
    batch.put(panel,paint.trim,cx,H+.055,z+.12,r*.93,h*.89,.8);
    batch.put(panel,paint.roof,cx,H+.10,z+.22,r*.79,h*.72,.6);
    batch.put(window,paint.trim,cx,H+h*.40,z+.38,.22,1,.22,Math.PI/2);
    batch.put(window,paint.frame,cx,H+h*.40,z+.405,.15,1,.15,Math.PI/2);
    batch.put(block,paint.trim,cx,H+h*.40,z+.48,.037,.29,.026);
    batch.put(block,paint.trim,cx,H+h*.40,z+.48,.29,.036,.026);
    if(level>=2)for(const side of [-1,1])batch.put(sphere,paint.trim,cx+side*r*.60,H+.16,z+.36,.055,.085,.038);
    if(level===4){batch.put(cone,paint.roof,outer,H+.58,z-.09,.46,1.16,.46);batch.put(sphere,paint.trim,outer,H+1.18,z-.09,.095,.12,.095);}
    if(level===5){batch.put(sphere,paint.trim,cx,H+h*1.15,z+.05,.11,.21,.075);}
  }
  batch.finish(root,'故事書山牆與彩窗');

  for(const g of [block,sphere,panel,window,cone])g.dispose();
}

export function storyTree(T,parent,x,z,s,kind,ground){
  const root=new T.Group(),b=painter(T);root.position.set(x,ground,z);root.scale.setScalar(s);parent.add(root);
  const branch=new T.CylinderGeometry(.7,1,1,7), leaves=new T.IcosahedronGeometry(1,1);
  const pine=profile(T,p=>{p.moveTo(0,.72);p.bezierCurveTo(.09,.30,.27,.0,.57,-.16);p.quadraticCurveTo(.31,-.19,.16,-.12);p.quadraticCurveTo(.29,-.34,.53,-.42);p.quadraticCurveTo(0,-.57,-.60,-.35);p.quadraticCurveTo(-.29,-.24,-.20,-.08);p.quadraticCurveTo(-.49,-.14,-.53,-.07);p.quadraticCurveTo(-.20,.12,0,.72);},.18);
  const mirror=Math.sin(x*3+z)>0?1:-1;
  b.put(branch,0x8a604a,-.08,.52,0,.16,1.08,.16,0,0,.14*mirror);
  b.put(branch,0x72584b,.12,.99,.025,.08,.74,.08,0,0,-.56*mirror);
  if(kind==='pine'){
    for(let tier=0;tier<3;tier++)for(let i=0;i<4;i++)b.put(pine,[0x477b71,0x579384,0x70a58c][tier],.085*tier*mirror,1.15+tier*.39,0,1.25-tier*.23,.96-tier*.08,1,0,i*Math.PI/4,.07*mirror);
  }else{
    const cool=Math.cos(x+z)>.1;
    for(const [dx,dy,dz,r,c] of [[-.42,1.42,-.04,.50,0],[.47,1.63,.01,.52,1],[-.06,1.86,-.11,.63,1],[.09,2.13,-.10,.43,2],[-.32,1.7,.36,.36,2],[.27,1.60,.33,.32,1]]){
      b.put(leaves,(cool?[0x44796b,0x649772,0x9db478]:[0x68824e,0x99a55d,0xbab466])[c],dx*mirror,dy,dz,r,r*.85,r*.9,.2,dx,.12*mirror);
    }
  }
  b.finish(root,'手繪林冠');for(const geo of [branch,leaves,pine])geo.dispose();return root;
}

export function addMarketCanopy(T,g,c1,c2){
  const b=painter(T),w=2.38,n=9;
  const cloth=profile(T,s=>{s.moveTo(-.72,-.03);s.quadraticCurveTo(-.57,.05,-.43,.27);s.quadraticCurveTo(-.04,.68,.26,.47);s.quadraticCurveTo(.49,.28,.74,-.01);s.lineTo(.73,-.09);s.quadraticCurveTo(.39,.03,.16,.28);s.quadraticCurveTo(-.08,.47,-.36,.25);s.quadraticCurveTo(-.56,-.05,-.72,-.10);},w/n+.004);
  const swag=profile(T,s=>{s.moveTo(-.5,.08);s.lineTo(.5,.08);s.quadraticCurveTo(.49,-.20,0,-.22);s.quadraticCurveTo(-.49,-.20,-.5,.08);},.04);
  for(let i=0;i<n;i++){
    b.put(cloth,i%2?c2:c1,-w/2+(i+1)*w/n,1.99,.07,1,1,1,0,-Math.PI/2);
    b.put(swag,i%2?c2:c1,-w/2+(i+.5)*w/n,1.90,.80,w/n,1,1);
  }
  b.finish(g,'拱篷與扇貝飾邊');cloth.dispose();swag.dispose();
}

export function storyLamp(T,parent,x,z,gold,ground){
  const root=new T.Group();parent.add(root);root.position.set(x,ground,z);
  const b=painter(T),bronze=gold?0xb68755:0x56645e,lit=0xffdd91;
  const base=new T.LatheGeometry([[0,0],[.23,0],[.24,.06],[.18,.12],[.14,.24],[.10,.29],[.064,.55],[.048,2.07],[.094,2.16],[.09,2.22],[0,2.22]].map(([x,y])=>new T.Vector2(x,y)),10);
  const lantern=new T.LatheGeometry([[0,0],[.08,.05],[.18,.14],[.21,.31],[.16,.43],[0,.46]].map(([x,y])=>new T.Vector2(x,y)),8);
  const cap=new T.ConeGeometry(.26,.24,8),finial=new T.IcosahedronGeometry(1,0);
  const arm=profile(T,s=>{s.moveTo(-.04,0);s.bezierCurveTo(.08,.62,.53,.69,.62,.32);s.quadraticCurveTo(.60,.14,.48,.12);s.quadraticCurveTo(.58,.31,.48,.40);s.bezierCurveTo(.29,.56,.11,.30,.05,-.03);},.055);
  b.put(base,bronze,0,0,0);b.put(arm,bronze,0,2.04,0);
  b.put(lantern,lit,.53,1.75,0);b.put(cap,bronze,.53,2.22,0);
  b.put(finial,bronze,.53,1.75,0,.08,.13,.08);b.put(finial,0xdcb46c,0,2.28,0,.085,.16,.085);
  b.finish(root,'彎頸橡實街燈');for(const geo of [base,lantern,cap,arm,finial])geo.dispose();return root;
}

export function storyPaving(canvasTex,level,turn=false){
  return canvasTex(256,256,(c,W,H)=>{
    // Draw a seamless square repeat; one world-space repeat size serves every strip.
    if(turn){c.translate(W,0);c.rotate(Math.PI/2);}
    let seed=173+level;
    const random=()=>((seed=seed*16807%2147483647)/2147483647);
    const fill=(paint,x,y,w,h)=>{c.fillStyle=paint;c.fillRect(x,y,w,h);};
    function polygon(paint,points){
      c.fillStyle=paint;c.beginPath();c.moveTo(...points[0]);
      for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fill();
    }
    function oval(paint,x,y,w,h,angle=0){
      c.fillStyle=paint;c.beginPath();c.ellipse(x,y,w,h,angle,0,Math.PI*2);c.fill();
    }
    function star(x,y,r,paint){
      const pts=[];
      for(let i=0;i<8;i++){const a=i*Math.PI/4,k=i%2?r*.26:r;pts.push([x+Math.cos(a)*k,y+Math.sin(a)*k]);}
      polygon(paint,pts);
    }
    if(level===1){
      // Ox-cart lane: tamped ochre earth with soft winding ruts, shale and straw.
      fill('#bd986b',0,0,W,H);
      for(const y of [62,194]){
        for(const [width,color] of [[23,'#b08b61'],[12,'#a88760'],[4,'#b5956e']]){
          c.strokeStyle=color;c.lineWidth=width;c.beginPath();
          for(let x=0;x<=W;x+=4){const yy=y+5*Math.sin(x*Math.PI*2/W)+(width===4?3:0);if(x)c.lineTo(x,yy);else c.moveTo(0,yy);}
          c.stroke();
        }
      }
      for(let i=0;i<270;i++){
        const x=random()*W,y=random()*H;
        oval(i%4?'#b38f65':'#d3b485',x,y,1+random()*3,.5+random(),-.2);
        if(i%16===0)polygon('#93765a',[[x,y],[x+5,y-2],[x+8,y],[x+3,y+2]]);
      }
    }else if(level===2){
      // Split river cobbles with chipped corners and moss in the wide joints.
      fill('#879071',0,0,W,H);
      const colors=['#b3af91','#c9c4a6','#9fa794','#dad1ac'];
      for(let j=0;j<4;j++)for(let i=-1;i<5;i++){
        const v=(i+4)%4,x=i*64+(j%2)*32,y=j*64,n=(v*13+j*7)%10;
        const pts=[[x+6,y+14+n],[x+18,y+5],[x+46+n,y+4],[x+60,y+15],[x+61,y+44+n],[x+47,y+60],[x+15,y+58],[x+4,y+46]];
        polygon(colors[(v+j*3)%4],pts);c.strokeStyle='#d9d5b8';c.lineWidth=2;c.beginPath();c.moveTo(...pts[0]);c.lineTo(...pts[1]);c.lineTo(...pts[2]);c.stroke();
        oval('#7a8967',x+2,y+10,2,4,.6);
      }
    }else if(level===3){
      // Kiln-fired market bricks in alternating basket-weave pairs.
      fill('#957662',0,0,W,H);
      const bricks=['#b76851','#ce8160','#b97761','#c8896d'];
      for(let y=0;y<H;y+=64)for(let x=0;x<W;x+=64){
        const across=((x+y)/64)%2===0;
        for(let n=0;n<2;n++){
          const left=x+(across?0:n*32)+2,top=y+(across?n*32:0)+2,w=across?60:28,h=across?28:60;
          fill(bricks[(x/64+y/64*3+n)%4],left,top,w,h);
          fill('#d49b79',left+2,top+1,w-4,2);
          for(let k=0;k<5;k++)oval('#a86652',left+4+random()*(w-8),top+4+random()*(h-8),1.7,.7);
        }
      }
    }else if(level===4){
      // Broad blue-grey cut slate with bevelled rims and occasional mineral veins.
      fill('#515e67',0,0,W,H);
      const slates=['#8398a3','#97a8ad','#78919d','#91a1a8'];
      for(let y=0;y<H;y+=64)for(let i=-1;i<3;i++){
        const x=i*128+(y%128?64:0);
        fill(slates[((i+2)%2+y/64)%4],x+2,y+2,124,60);
        fill('#bdc8c4',x+4,y+3,119,2);fill('#687c87',x+5,y+59,116,2);
        c.strokeStyle='#aab9ba';c.lineWidth=1.5;c.beginPath();c.moveTo(x+13,y+53);c.lineTo(x+39,y+38);c.lineTo(x+52,y+35);c.lineTo(x+64,y+25);c.stroke();
      }
    }else{
      // Palace mosaic: warm marble octagons, bronze keys and plum enamel rosettes.
      fill('#937e67',0,0,W,H);
      for(let y=0;y<H;y+=128)for(let x=0;x<W;x+=128){
        const points=[[x+27,y+2],[x+101,y+2],[x+126,y+27],[x+126,y+101],[x+101,y+126],[x+27,y+126],[x+2,y+101],[x+2,y+27]];
        polygon('#d5b377',points);
        polygon('#e8d7b4',points.map(([a,b])=>[x+64+(a-x-64)*.93,y+64+(b-y-64)*.93]));
        star(x+64,y+64,28,'#c09b60');star(x+64,y+64,18,'#926e82');
      }
      for(let y=0;y<=H;y+=128)for(let x=0;x<=W;x+=128)
        polygon('#786879',[[x,y-22],[x+22,y],[x,y+22],[x-22,y]]);
    }
  });
}

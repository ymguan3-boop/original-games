// All the carvings are baked into the parent's vertex-colour mesh. They share
// the original cabinet, tray, wall-hanging and floor-mat placement envelopes.
export function storyPalette(level) {
  const colours = [
    [0xf1cc96, 0x7b503e, 0x66958a, 0xf5c673, 0xbd6354],
    [0xcc985d, 0x684137, 0x568575, 0xeeb85d, 0xd97b51],
    [0xce8a62, 0x634356, 0x45788a, 0xf6b967, 0xc9505e],
    [0x869db9, 0x454663, 0x647bab, 0xf3ce87, 0xce828e],
    [0xb97a70, 0x623c53, 0x873e64, 0xffd888, 0x5eafb2],
    [0x9bb9a0, 0x445e54, 0x567f6b, 0xf1cc8b, 0xe9989d],
    [0xe6ccae, 0x785553, 0x947f95, 0xe4b77c, 0xa1c6c0],
    [0xad93b5, 0x503f6a, 0x755786, 0xf2c69a, 0x88c9d2],
    [0x89a5bd, 0x3a4568, 0x45659b, 0xf7cf85, 0xb1d2cd],
    [0xe7d6b0, 0x665066, 0x528c92, 0xffcf7b, 0xc77a91]
  ];
  const [wood,dark,panel,trim,accent] = colours[Math.min(colours.length-1,Math.max(0,level-1))];
  return {wood,dark,panel,trim,accent};
}

function lathe(T,profile) {
  return new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),12);
}
function profile(T,draw,depth) {
  const shape=new T.Shape();
  draw(shape);
  shape.closePath();
  return new T.ExtrudeGeometry(shape,{depth,curveSegments:5,bevelEnabled:false});
}

export function dressStoryFixture(T,b,G,C,type,level,height,decoration) {
  const temporary=[];
  const keep=g=>(temporary.push(g),g);
  const place=(g,c,...p)=>b.put(g,c,...p);
  const bead=(c,x,y,z,w,h=w,d=w,rz=0)=>place(G.ball,c,x,y,z,w,h,d,0,0,rz);
  const flower=(x,y,z,r)=>{
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;bead(C.accent,x+r*.5*Math.sin(a),y+r*.5*Math.cos(a),z,r*.32,r*.55,r*.2,-a);}
    bead(C.trim,x,y,z+r*.11,r*.31,r*.31,r*.19);
  };
  const cream=0xffe8b6;
  if(!decoration && type==='materials') {
    // A shallow pie-cart bin: merchandise stays visible in both compartments.
    const bracket=keep(profile(T,s=>{s.moveTo(-.14,.07);s.lineTo(.14,.07);s.bezierCurveTo(.11,-.02,.05,-.07,0,-.08);s.quadraticCurveTo(-.10,-.07,-.14,.07);},.022));
    for(const side of [-1,1]){place(bracket,C.panel,side*.24,.285,.342);flower(side*.24,.30,.371,.065);}
  } else if(!decoration) {
    const y=height-.02;
    if(['apothecary','arcane','relic','royal'].includes(type)) {
      // Awning bows forward like stitched velvet; the edge has a real scalloped profile.
      const scallop=keep(profile(T,s=>{s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(.5,-.35);s.quadraticCurveTo(0,-1.13,-.5,-.35);},.027));
      const roof=keep(profile(T,s=>{s.moveTo(-.27,.02);s.quadraticCurveTo(-.12,.11,.23,.25);s.lineTo(.24,.20);s.quadraticCurveTo(-.11,.06,-.27,-.025);},.133));
      for(let i=0;i<7;i++){
        const color=i%2?cream:C.panel,x=(i-3)*.133;
        place(roof,color,x-.066,y,0,1,1,1,0,Math.PI/2,0);
        place(scallop,color,x,y+.026,.270,.133,.125,1);
      }
      for(const side of [-1,1])flower(side*.413,y+.09,-.02,.068);
    } else {
      const flourish=keep(profile(T,s=>{s.moveTo(0,-.18);s.bezierCurveTo(.01,-.04,.14,.04,.16,.19);s.quadraticCurveTo(.08,.10,.044,.09);s.lineTo(0,.20);s.quadraticCurveTo(-.035,.0,0,-.18);},.04));
      for(const side of [-1,1])place(flourish,C.trim,side*.34,y-.03,-.145,side,1,1);
      if(type==='limited-armory')bead(C.accent,0,y+.17,-.095,.058,.086,.032);
    }
  } else if(['plant','fern','lavender','citrus'].includes(type)) {
    const pot=keep(lathe(T,[[.14,.06],[.17,.08],[.22,.1],[.32,.30],[.30,.36],[.33,.385],[.33,.43],[.25,.44]]));
    place(pot,C.panel,0,0,0);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;bead(cream,.30*Math.sin(a),.33,.30*Math.cos(a),.028,.036,.028);}
    if(type==='plant'||type==='fern')flower(0,.28,.287,.11);
  } else if(type==='clock') {
    const eave=keep(profile(T,s=>{s.moveTo(-.275,0);s.quadraticCurveTo(-.13,.06,0,.22);s.quadraticCurveTo(.13,.06,.275,0);s.lineTo(.23,-.043);s.quadraticCurveTo(.09,.012,0,.12);s.quadraticCurveTo(-.1,.015,-.23,-.043);},.075));
    place(eave,C.accent,0,.60,.027);flower(0,.59,.076,.045);
  } else if(type==='painting'||type==='painting-large'||type==='couplet') {
    const h=type==='painting-large'?.70:type==='couplet'?.36:.52;
    const w=type==='painting-large'?1.15:type==='couplet'?.48:.70;
    if(type==='couplet'){flower(0,h*.58,.099,h*.25);}
    else {
      for(let i=0;i<3;i++){
        const x=(i-1)*w*.185,y=h*.30;
        place(G.box,[cream,0xeab393,0xe3c995][i],x,y,.10,h*.17,h*.18,.007);
        place(G.cone,C.accent,x,y+h*.13,.106,h*.15,h*.14,.01);
        place(G.box,C.dark,x,y-.015,.116,h*.035,h*.09,.007);
      }
    }
  } else if(type==='carpet') {
    for(let i=0;i<12;i++){const a=i*Math.PI/6;place(G.ball,i%2?cream:C.accent,Math.cos(a)*.64,.068,Math.sin(a)*.42,.14,.007,.046,0,-a,0);}
  } else if(type==='sofa') {
    const arm=keep(lathe(T,[[.045,0],[.095,.035],[.085,.08],[.055,.13],[.077,.17],[.045,.19]]));
    for(const side of [-1,1]){place(arm,C.trim,side*.38,.31,.24);flower(side*.29,.64,-.107,.06);}
    for(const x of [-.21,0,.21])bead(cream,x,.66,-.110,.019,.019,.013);
  } else {
    // Enamel medallions on the bases of lanterns, monuments and sculpture.
    const plinth=keep(lathe(T,[[.20,0],[.26,.02],[.27,.055],[.205,.086],[.20,.10]]));
    place(plinth,C.panel,0,0,0);flower(0,.095,type==='fountain'?.42:.26,.052);
  }
  temporary.forEach(geometry=>geometry.dispose());
}

export function storyCounter(T,builder,level) {
  const C=storyPalette(level), b=builder(T);
  const box=new T.BoxGeometry(1,1,1),ball=new T.SphereGeometry(1,12,8);
  const foot=lathe(T,[[.09,0],[.105,.025],[.085,.06],[.055,.09],[.09,.15]]);
  const panel=profile(T,s=>{s.moveTo(-.34,.12);s.lineTo(.34,.12);s.quadraticCurveTo(.32,-.035,.16,-.09);s.quadraticCurveTo(0,-.19,-.16,-.09);s.quadraticCurveTo(-.32,-.035,-.34,.12);},.024);
  const put=(g,c,...p)=>b.put(g,c,...p);
  for(const x of [-1.07,1.07])for(const z of [-.28,.28])put(foot,C.dark,x,0,z);
  put(box,C.wood,0,.32,0,2.4,.43,.72);
  put(box,C.dark,0,.513,0,2.52,.065,.80);put(box,C.wood,0,.557,0,2.57,.045,.83);
  for(const x of [-.78,0,.78]){
    put(panel,C.panel,x,.38,.361);
    for(const d of [-1,1])put(ball,0xffdfa0,x+d*.068,.337,.395,.061,.027,.012,0,0,d*.52);
    put(ball,C.accent,x,.36,.40,.036,.045,.018);
  }
  // The cash register is a curved brass till with a raised price window and ivory keys.
  put(box,C.dark,.68,.625,-.035,.47,.09,.36);
  put(ball,C.trim,.68,.711,-.07,.202,.143,.143);
  put(box,C.dark,.68,.806,-.13,.30,.098,.055);
  put(box,0xc4e6da,.68,.81,-.099,.236,.050,.012);
  for(let i=0;i<4;i++)put(ball,0xffedc3,.54+i*.09,.697,.071,.031,.017,.033);
  put(box,C.accent,-.70,.608,0,.36,.046,.27,0,.14,0);
  put(box,0xffe8bc,-.70,.641,0,.337,.028,.252,0,.14,0);
  put(box,C.panel,-.70,.664,0,.36,.020,.27,0,.14,0);
  const root=new T.Group();const mesh=b.mesh(.82,.06);root.add(mesh);mesh.receiveShadow=true;
  mesh.userData.ownedGeometry=mesh.userData.ownedMaterial=true;
  for(const g of [box,ball,foot,panel])g.dispose();
  root.userData.counterTop=.60;root.name='storybook-counter-lv'+level;
  return root;
}

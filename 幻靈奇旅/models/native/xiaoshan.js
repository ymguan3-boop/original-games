/* 小山 · Original procedural Three.js r128 character. Face +Z, ground anchor Y=0. */
(() => {
  'use strict';
  function create(options = {}) {
    const T = THREE, root = new T.Group(), rig = new T.Group();
    root.name = 'XiaoshanGroundAnchor'; rig.name = 'XiaoshanConnectedRig'; root.add(rig);
    const geometries = new Set(), materials = new Set();
    const ownGeo = g => (geometries.add(g), g);
    const mat = (color, extras = {}) => { const m = new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(), roughness:.48, ...extras}); materials.add(m); return m; };
    const green = mat(0x8fcf54), greenLight = mat(0xa4df6b), orange = mat(0xe9a245), toe = mat(0xffd37f), dark = mat(0x242924), twig = mat(0x79502c), purple = mat(0x8651b6), lilac = mat(0xc899ed,{roughness:.24,metalness:.13}), yellow = mat(0xffd61d), eyeGold = mat(0xffd96b,{emissive:0xaa7414,emissiveIntensity:.28});
    const bubbleMat = mat(0x79d8ef,{roughness:.1,metalness:.05,transparent:true,opacity:.82});
    const white = mat(0xffffff,{roughness:.18}), sleepMat=mat(0xe7cf87,{emissive:0x80601b,emissiveIntensity:.25,transparent:true,opacity:.7});
    const sphere = ownGeo(new T.SphereGeometry(1,32,24)), smallSphere = ownGeo(new T.SphereGeometry(1,16,12));
    function ball(parent, material, x,y,z, sx,sy,sz, high = false) { const m=new T.Mesh(high?sphere:smallSphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
    function tube(parent, material, pts, radius = .02) {const path=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));const m=new T.Mesh(ownGeo(new T.TubeGeometry(path,Math.max(8,pts.length*5),radius,6,false)),material);parent.add(m);return m;}
    const body = new T.Group(); body.name='BodyAndFace'; rig.add(body);
    const egg = sphere.clone(); geometries.add(egg);
    const pos=egg.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i), widen=1.03-.11*y;pos.setX(i,pos.getX(i)*widen);pos.setZ(i,pos.getZ(i)*widen);}egg.computeVertexNormals();
    const main = new T.Mesh(egg,green);main.position.y=1.3;main.scale.set(1.08,1.10,.87);main.castShadow=true;main.receiveShadow=true;body.add(main);
    // All feet rotate at embedded upper joints and remain joined to the lower body.
    const legs=[];for(const x of [-.72,.72])for(const z of [-.46,.46]) {const pivot=new T.Group();pivot.position.set(x,.62,z);rig.add(pivot);ball(pivot,orange,0,-.24,.04,.25,.37,.28);ball(pivot,toe,0,-.49,.18,.16,.105,.14);legs.push({pivot,side:x<0?-1:1,front:z>0?1:-1});}
    // Rounded orange scallops form a continuous crown around the lower edge.
    ball(body,orange,0,.47,0,.97,.32,.79,true);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2,p=ball(body,orange,Math.cos(a)*.84,.55,Math.sin(a)*.68,.34,.29,.24);p.rotation.z=-Math.cos(a)*.35;}
    const face=new T.Group();body.add(face);
    const sleepyEyes=new T.Group(), openEyes=new T.Group();face.add(sleepyEyes,openEyes);
    for(const x of [-.38,.38]){ball(sleepyEyes,dark,x,1.58,.835,.13,.037,.036);ball(openEyes,eyeGold,x,1.58,.842,.14,.19,.045);ball(openEyes,dark,x,1.59,.882,.073,.125,.025);ball(openEyes,white,x-.028,1.65,.903,.025,.035,.012);}
    const flatMouth=ball(face,dark,0,1.43,.894,.16,.039,.032);
    const scaredMouth=ball(face,dark,0,1.34,.913,.11,.14,.035);
    const bubble=new T.Group();bubble.position.set(.12,1.27,.943);face.add(bubble);
    const drop=ball(bubble,bubbleMat,0,-.02,0,.092,.12,.07);ball(bubble,white,-.025,.015,.06,.018,.037,.009);
    // Butterfly ornament follows the head, with separate wing pivots.
    const ornament=new T.Group();ornament.position.set(-.77,2.12,.10);ornament.rotation.z=-.47;body.add(ornament);
    tube(ornament,twig,[[-.18,-.30,0],[0,0,0],[.19,.33,0]],.052);
    const insect=new T.Group();insect.position.set(0,.12,.045);ornament.add(insect);
    ball(insect,yellow,0,0,.035,.067,.14,.065);ball(insect,yellow,0,.13,.035,.065,.068,.065);
    const wings=[];for(const sign of [-1,1]){const w=new T.Group();w.position.set(sign*.035,.035,0);insect.add(w);for(const [x,y,sx,sy] of [[.19,.15,.16,.23],[.14,-.10,.12,.13]]){const border=ball(w,purple,sign*x,y,0,sx,sy,.044);border.rotation.z=-sign*.42;const inner=ball(w,lilac,sign*x,y,.032,sx*.80,sy*.83,.025);inner.rotation.z=-sign*.42;}wings.push({w,sign});tube(insect,dark,[[sign*.026,.16,.02],[sign*.065,.30,.03],[sign*.12,.35,.02]],.009);ball(insect,dark,sign*.12,.35,.02,.022,.022,.022);}
    // A fixed pool of Z glyphs: no textures, allocation, or new scene objects per frame.
    const glyphs=[];for(let i=0;i<4;i++){const g=new T.Group();const size=.085+i*.015;tube(g,sleepMat,[[-size,size,0],[size,size,0],[-size,-size,0],[size,-size,0]],.016);body.add(g);glyphs.push(g);}
    let mode='Idle', time=0, age=0, motionSpeed=1, disposed=false;
    const valid=new Set(['Idle','Walk','Sleep','Wake','Jump','Scared','React']);
    const smooth=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function setMode(value){const next=valid.has(value)?value:'Idle';if(next!==mode){mode=next;time=0;}}
    function update(dt){if(disposed)return;dt=clamp(Number(dt)||0,0,.1);time+=dt;age+=dt;
      const sleep=mode==='Sleep', scared=mode==='Scared', walk=mode==='Walk', wake=mode==='Wake';
      const blend=1-Math.exp(-dt*13), breath=Math.sin(age*(sleep?1.9:2.6));
      let sy=1+breath*(sleep?.024:.009), sx=1-breath*.004, lean=0, lift=0, rz=0;
      if(sleep){lean=.055+.045*Math.sin(time*1.4);rz=.014*Math.sin(time*.9);}
      if(wake){const p=clamp(time/.6,0,1);sy+=Math.sin(p*Math.PI)*.07;lean=-Math.sin(p*Math.PI)*.08;}
      if(mode==='Jump'){const p=time%1.8;if(p<.3){sy-=.17*Math.sin(p/.3*Math.PI/2);sx+=.08*Math.sin(p/.3*Math.PI/2);}else if(p<1.2){sy+=.09*Math.sin((p-.3)/.9*Math.PI);if(!options.inPlace)lift=Math.sin((p-.3)/.9*Math.PI)*2.2;}else if(p<1.5){sy-=.17*Math.sin((p-1.2)/.3*Math.PI);sx+=.08*Math.sin((p-1.2)/.3*Math.PI);}}
      if(scared){rz=Math.sin(age*43)*.014;lean=Math.sin(age*31)*.008;}
      if(mode==='React'){lean=-.11*Math.sin(Math.min(time/.65,1)*Math.PI);}
      if(walk){const f=age*7*Math.max(.25,motionSpeed);lift=Math.abs(Math.sin(f))*.035;rz=Math.sin(f)*.015;for(const l of legs)l.pivot.rotation.x=smooth(l.pivot.rotation.x,Math.sin(f+l.side*l.front*Math.PI/2)*.37,blend);}else for(const l of legs)l.pivot.rotation.x=smooth(l.pivot.rotation.x,0,blend);
      rig.scale.x=smooth(rig.scale.x,sx,blend);rig.scale.y=smooth(rig.scale.y,sy,blend);rig.scale.z=smooth(rig.scale.z,sx,blend);rig.position.y=smooth(rig.position.y,lift,blend);body.rotation.x=smooth(body.rotation.x,lean,blend);rig.rotation.z=smooth(rig.rotation.z,rz,blend);
      sleepyEyes.visible=!scared;openEyes.visible=scared;flatMouth.visible=!scared;scaredMouth.visible=scared;
      const blink=age%4.7>4.56?.12:1;openEyes.scale.y=smooth(openEyes.scale.y,blink,blend);
      bubble.visible=!scared&&mode!=='Jump';const bs=sleep?1.1+.30*Math.sin(time*1.9):.9+.1*Math.sin(age*2);bubble.scale.setScalar(bs);bubble.rotation.z=Math.sin(age*1.3)*.08;
      for(const {w,sign} of wings)w.rotation.y=sign*(.12+Math.sin(age*5.8)*.18+(Math.sin(age*.7)>.8?Math.sin(age*19)*.20:0));
      for(let i=0;i<glyphs.length;i++){const g=glyphs[i],p=(time*.38+i*.25)%1;g.visible=sleep&&p<.88;g.position.set(.46+p*.40,2.35+p*.65,.30);g.scale.setScalar(.65+p*.55);g.rotation.z=Math.sin(time+i)*.10;}
    }
    function dispose(){if(disposed)return;disposed=true;root.removeFromParent?.();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
    update(0);
    return {root,update,setMode,setMotionSpeed:value=>{motionSpeed=clamp(Number(value)||1,0,8);},dispose,getState:()=>({mode,phase:mode.toLowerCase(),time,expression:mode==='Scared'?'scared':'sleepy',sleepGlyphs:mode==='Sleep'?4:0,height:2.85})};
  }
  // Reuse the same yellow-body/purple-wing design as Xiaoshan's hair ornament
  // as a lightweight, independently animated companion for the sound costume.
  function createButterfly() {
    const T=THREE, root=new T.Group(),parts=[],geometries=[],materials=[];
    root.name='小山蝴蝶套裝・漂浮蝴蝶';
    const material=(hex,opacity=1)=>{
      const m=new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(),roughness:.34,metalness:.08,transparent:opacity<1,opacity,side:T.DoubleSide,depthWrite:opacity>=1});
      materials.push(m);return m;
    };
    const purple=material(0x8651b6,.92),lilac=material(0xc899ed,.64),yellow=material(0xffd61d),dark=material(0x242924);
    const sphere=new T.SphereGeometry(1,14,10);geometries.push(sphere);
    function oval(parent,mat,x,y,z,sx,sy,sz){
      const m=new T.Mesh(sphere,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=false;parent.add(m);return m;
    }
    oval(root,yellow,0,0,.04,.082,.18,.08);
    oval(root,yellow,0,.145,.05,.073,.07,.065);
    const wings=[];
    for(const sign of [-1,1]){
      const hinge=new T.Group();hinge.position.set(sign*.04,.045,0);root.add(hinge);
      for(const [x,y,sx,sy] of [[.19,.15,.16,.23],[.14,-.1,.12,.13]]){
        oval(hinge,purple,sign*x,y,0,sx,sy,.035).rotation.z=-sign*.42;
        oval(hinge,lilac,sign*x,y,.03,sx*.81,sy*.84,.021).rotation.z=-sign*.42;
      }
      const feeler=new T.Mesh(new T.CylinderGeometry(.009,.009,.19,6),dark);
      feeler.position.set(sign*.10,.235,.08);feeler.rotation.z=-sign*.35;root.add(feeler);parts.push(feeler);
      oval(root,dark,sign*.128,.34,.08,.024,.024,.024);
      wings.push({hinge,sign});
    }
    let age=0,disposed=false;
    root.scale.setScalar(1.1);
    function update(dt){
      if(disposed)return;
      age+=Math.min(.06,Math.max(0,dt||0));
      for(const {hinge,sign} of wings){
        hinge.rotation.y=sign*(.23+.76*Math.sin(age*24));
        hinge.rotation.z=sign*.065*Math.sin(age*12+sign);
      }
      root.rotation.z=.09*Math.sin(age*4.4);
      root.rotation.x=.09*Math.sin(age*3.2);
    }
    function dispose(){
      if(disposed)return;disposed=true;root.removeFromParent();
      for(const g of geometries)g.dispose();
      for(const m of materials)m.dispose();
    }
    update(0);
    return {root,update,dispose};
  }
  window.XiaoshanSpirit={create,createButterfly};
})();

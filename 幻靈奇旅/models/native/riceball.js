/* RiceballSpirit — standalone THREE r128, +Z face / +Y up. No network or assets.
 * The anchor lives at ground y=0; contact support is evaluated on the rolling child.
 */
(function (global) {
  'use strict';
  function create(options) {
    const T = global.THREE;
    if (!T) throw new Error('Load THREE before riceball.js');
    options=options||{}; let externalSpeed=null;
    let seed = (options && options.seed || 7127) >>> 0;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    const root = new T.Group(); root.name = 'RiceballSpirit';
    const pivot = new T.Group(); pivot.name = 'RollingBody'; root.add(pivot);
    const ownedGeo = new Set(), ownedMat = new Set(), textures = [];
    const geometry = g => { ownedGeo.add(g); return g; };
    const material = m => { ownedMat.add(m); return m; };
    const riceMat = material(new T.MeshStandardMaterial({color:0xfff9e9, roughness:.48}));
    const inkMat = material(new T.MeshStandardMaterial({color:0x111713, roughness:.22}));
    const purpleMat = material(new T.MeshStandardMaterial({color:0xb965df, roughness:.34}));
    const sphere = geometry(new T.SphereGeometry(1,12,8));
    function mesh(g,m,parent) { const a = new T.Mesh(g,m); a.castShadow=true; a.receiveShadow=true; (parent||pivot).add(a); return a; }
    // Cubic silhouette: rounded apex, gently sloping shoulders, broad rounded base.
    const outline = new T.Shape(); outline.moveTo(0,1.27);
    outline.bezierCurveTo(.43,1.27,.65,.88,.87,.47);
    outline.bezierCurveTo(1.12,.03,1.33,-.55,1.16,-.86);
    outline.bezierCurveTo(1.04,-1.12,.62,-1.13,0,-1.13);
    outline.bezierCurveTo(-.62,-1.13,-1.04,-1.12,-1.16,-.86);
    outline.bezierCurveTo(-1.33,-.55,-1.12,.03,-.87,.47);
    outline.bezierCurveTo(-.65,.88,-.43,1.27,0,1.27);
    const edge=outline.getSpacedPoints(384);
    function boundary(u) { const q=((u%1)+1)%1*384, i=Math.floor(q), f=q-i; return new T.Vector2().lerpVectors(edge[i],edge[(i+1)%384],f); }
    function surface(theta,u) { const p=boundary(u), r=Math.sin(theta); return new T.Vector3(p.x*r,p.y*r,.63*Math.cos(theta)); }
    const verts=[], inds=[], N=128, M=56;
    for(let j=0;j<=M;j++) for(let i=0;i<=N;i++){const p=surface(j/M*Math.PI,i/N);verts.push(p.x,p.y,p.z);}
    for(let j=0;j<M;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+N+1;inds.push(a,b,a+1,b,b+1,a+1);}
    const bodyGeo=geometry(new T.BufferGeometry()); bodyGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3)); bodyGeo.setIndex(inds); bodyGeo.computeVertexNormals();
    // Orient outward (the outline proceeds clockwise when viewed from the face).
    const normals=bodyGeo.attributes.normal; if(normals.getZ(N+3)<0){for(let k=0;k<inds.length;k+=3){const q=inds[k];inds[k]=inds[k+2];inds[k+2]=q;}bodyGeo.setIndex(inds);bodyGeo.computeVertexNormals();}
    mesh(bodyGeo,riceMat);
    const riceGeo=geometry(new T.SphereGeometry(1,8,6));
    const riceCount=2700, grains=new T.InstancedMesh(riceGeo,riceMat,riceCount);
    grains.castShadow=true; grains.receiveShadow=true; pivot.add(grains);
    const helper=new T.Object3D(), normal=new T.Vector3(), tangent=new T.Vector3(), bitangent=new T.Vector3(), basis=new T.Matrix4(), support=[];
    const color=new T.Color(); let visibleRiceCount=0;
    for(let i=0;i<riceCount;i++) {
      const theta=Math.acos(1-2*(i+.5)/riceCount), u=(i*.61803398875+random()*.006)%1, p=surface(theta,u);
      // The nori compresses/covers these grains. Keeping them underneath would
      // cause white tips to intersect its thin surface, particularly at the base.
      if(Math.abs(p.x)<.55 && p.y<-.17) continue;
      tangent.copy(surface(theta,u+.0001)).sub(p); bitangent.copy(surface(Math.min(Math.PI,theta+.0001),u)).sub(p);
      normal.crossVectors(tangent,bitangent).normalize(); if(normal.dot(p)<0)normal.negate();
      tangent.normalize(); bitangent.crossVectors(normal,tangent).normalize(); basis.makeBasis(tangent,bitangent,normal);
      helper.quaternion.setFromRotationMatrix(basis); helper.rotateZ(random()*Math.PI*2);
      const sz=.88+random()*.23; helper.scale.set(.038*sz,.067*sz,.032*sz);
      helper.position.copy(p).addScaledVector(normal,.018); helper.updateMatrix();grains.setMatrixAt(visibleRiceCount,helper.matrix);
      color.setHSL(.105+random()*.02,.13+random()*.14,.87+random()*.10); grains.setColorAt(visibleRiceCount++,color);
      // Project each grain ellipsoid onto XY for accurate rotational support.
      const e=helper.matrix.elements;
      support.push([helper.position.x,helper.position.y,e[0],e[1],e[4],e[5],e[8],e[9]]);
    }
    grains.count=visibleRiceCount;grains.instanceMatrix.needsUpdate=true;
    // Nori is a curved ribbon which follows the front surface and wraps underneath.
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#18241a';ctx.fillRect(0,0,128,128);
    for(let i=0;i<1800;i++){const l=12+Math.floor(random()*27);ctx.strokeStyle='rgba('+l+','+(l+8)+','+l+',.65)';ctx.lineWidth=.5+random()*1.2;const x=random()*128,y=random()*128;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*7,y+random()*5);ctx.stroke();}
    const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;textures.push(tex);
    const noriMat=material(new T.MeshStandardMaterial({color:0x293628,map:tex,bumpMap:tex,bumpScale:.024,roughness:.66,side:T.DoubleSide}));
    const nv=[],nu=[],ni=[], rows=44, cols=20;
    // Recover depth from the actual triangle cross section: the body is an
    // outline scaled by sin(theta), never an elliptical XY approximation.
    function frontDepth(x,y){
      let rho=1;
      for(let k=0;k<384;k++){
        const a=edge[k],b=edge[k+1],dx=b.x-a.x,dy=b.y-a.y;
        const det=x*dy-y*dx;if(Math.abs(det)<1e-10)continue;
        const ray=(a.x*dy-a.y*dx)/det;
        const segment=(a.x*y-a.y*x)/det;
        if(ray>0 && segment>=0 && segment<=1){rho=1/ray;break;}
      }
      return .63*Math.sqrt(Math.max(0,1-rho*rho));
    }
    function bottomAt(x){let y=0;for(let k=0;k<384;k++){const a=edge[k],b=edge[k+1];if((a.x<=x&&b.x>=x)||(b.x<=x&&a.x>=x)){const d=b.x-a.x;if(Math.abs(d)>1e-9)y=Math.min(y,a.y+(b.y-a.y)*(x-a.x)/d);}}return y;}
    // Front y at -0.22 to bottom -1.13, continuing to rear lower edge.
    for(let j=0;j<=rows;j++){
      const t=j/rows, a=.20+t*2.63;
      for(let i=0;i<=cols;i++){
        const s=i/cols, corner=Math.pow(Math.abs(s-.5)*2,12), width=.51;
        const x=(s-.5)*2*width, y=bottomAt(x)*Math.sin(a)+.018*corner*Math.pow(Math.cos(a),2);
        const sign=Math.cos(a)>=0?1:-1;
        const z=sign*frontDepth(x,y)+.040*Math.cos(a);
        nv.push(x,y-.028*Math.sin(a),z);nu.push(s,t*1.7);
      }
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;ni.push(a,b,a+1,b,b+1,a+1);}
    const ng=geometry(new T.BufferGeometry());ng.setAttribute('position',new T.Float32BufferAttribute(nv,3));ng.setAttribute('uv',new T.Float32BufferAttribute(nu,2));ng.setIndex(ni);ng.computeVertexNormals();mesh(ng,noriMat);
    for(let i=0;i<nv.length;i+=3)support.push([nv[i],nv[i+1],.008,0,0,.008,0,0]);
    const normalEyes=new T.Group(), stressEyes=new T.Group();pivot.add(normalEyes,stressEyes);
    function tube(points,r,parent,mat){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(geometry(new T.TubeGeometry(curve,24,r,6,false)),mat||inkMat,parent);}
    [-1,1].forEach(sign=>{
      const e=mesh(sphere,inkMat,normalEyes);e.position.set(sign*.35,.36,.626);e.scale.set(.079,.087,.045);
      const shine=mesh(sphere,material(new T.MeshBasicMaterial({color:0xffffff})),normalEyes);shine.position.set(sign*.35-.019,.387,.665);shine.scale.set(.014,.014,.006);
      const x=sign*.35;
      tube([[x+sign*.065,.435,.664],[x-sign*.045,.36,.675],[x+sign*.065,.285,.664]],.021,stressEyes);
    });
    tube([[-.14,.18,.674],[-.07,.125,.68],[0,.112,.681],[.07,.125,.68],[.14,.18,.674]],.026,normalEyes);
    tube([[-.065,.13,.681],[0,.13,.682],[.065,.13,.681]],.022,stressEyes);
    for(const sign of [-1,1]) for(const upper of [true,false]) {
      const a=mesh(sphere,purpleMat);a.position.set(sign*(upper?.91:1.19),upper?.43:-.47,.08);a.scale.set(.066,.145,.095);a.rotation.z=sign*(upper?-.25:.5);
      const ca=Math.cos(a.rotation.z),sa=Math.sin(a.rotation.z);
      support.push([a.position.x,a.position.y,.066*ca,.066*sa,-.145*sa,.145*ca,0,0]);
    }
    // Precomputed support function includes rice, nori, and appendages. No frame allocations.
    const L=2048, heights=new Float32Array(L+1);
    for(let k=0;k<=L;k++){const a=k/L*Math.PI*2,s=Math.sin(a),c=Math.cos(a);let h=0;
      for(const p of support){const d1=p[2]*s+p[3]*c,d2=p[4]*s+p[5]*c,d3=p[6]*s+p[7]*c;h=Math.max(h,-p[0]*s-p[1]*c+Math.sqrt(d1*d1+d2*d2+d3*d3));}heights[k]=h;
    }
    function height(a){const f=((a/(2*Math.PI)%1)+1)%1*L,k=Math.floor(f);return heights[k]+(heights[k+1]-heights[k])*(f-k);}
    const waveRoot=new T.Group();root.add(waveRoot);
    const ringGeo=geometry(new T.TorusGeometry(.42,.018,6,64));
    const waves=Array.from({length:6},()=>{const m=material(new T.MeshBasicMaterial({color:0xb66aff,transparent:true,opacity:0,depthWrite:false}));const o=mesh(ringGeo,m,waveRoot);o.castShadow=false;o.visible=false;return {o,age:99};});
    // Two short signal arcs also animate freely above the crown, matching the model sheet.
    const signal=new T.Group();root.add(signal);
    const signalMat=material(new T.MeshStandardMaterial({color:0xb667dc,emissive:0x7a2b9c,emissiveIntensity:.22,transparent:true}));
    for(const r of [.27,.47]){const pts=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI*.48;pts.push([Math.cos(a)*r,Math.sin(a)*r,0]);}tube(pts,.038,signal,signalMat);}
    let mode='Auto',phase='idle',t=0,modeTime=0,angle=0,x=0,expression=0,dir=1,speed=0,waveClock=0,rollTime=0,stuckBase=0,previousPhase='';
    const TAU=Math.PI*2;
    function emitWave(){const w=waves.find(w=>w.age>1.9);if(!w)return;w.age=0;w.o.visible=true;w.o.position.set(0,2.54,.08);}
    function update(dt){
      dt=Math.min(.05,Math.max(0,Number(dt)||0));t+=dt;modeTime+=dt;
      if(mode==='Auto'){const q=modeTime%18;phase=q<1.5?'idle':q<5.1?'roll':q<7.5?'stuck':q<9?'recover':q<13.2?'roll':q<15?'recover':'wave';}
      else phase=mode.toLowerCase();
      if(phase!==previousPhase){if(phase==='stuck')stuckBase=angle;previousPhase=phase;}
      const stressed=phase==='stuck';expression+=(Number(stressed)-expression)*(1-Math.exp(-dt*13));
      const es=Math.max(.001,1-expression);normalEyes.scale.setScalar(es);stressEyes.scale.setScalar(Math.max(.001,expression));normalEyes.visible=es>.01;stressEyes.visible=expression>.01;
      if(phase==='roll'){
        rollTime+=dt;
        if(x>2.35)dir=-1;if(x< -2.35)dir=1;
        speed+=((externalSpeed===null?dir*1.42:externalSpeed)-speed)*(1-Math.exp(-dt*8));
        const da=-speed*dt/height(angle);angle+=da;if(!options.inPlace)x+=speed*dt;
      }else if(stressed){speed*=Math.exp(-dt*9);angle=stuckBase+Math.sin(t*28)*.045+Math.sin(t*39)*.018;}
      else {speed*=Math.exp(-dt*6);const target=Math.round(angle/TAU)*TAU;angle+=(target-angle)*(1-Math.exp(-dt*(phase==='recover'?4:5)));}
      pivot.rotation.z=angle;pivot.position.y=height(angle);if(!options.inPlace)root.position.x=x;
      signal.position.set(.60,2.6+Math.sin(t*2.2)*.045,.03);signal.rotation.z=.10+Math.sin(t*1.8)*.08;
      const sig=phase==='wave'?1:.55+.10*Math.sin(t*2);signal.scale.setScalar(sig);signalMat.opacity=phase==='stuck'?.35:.85;
      waveClock+=dt;if(waveClock>(phase==='wave'||phase==='stuck'?.48:4.1)){emitWave();waveClock=0;}
      waves.forEach(w=>{w.age+=dt;if(w.age>1.9){w.o.visible=false;return;}const p=w.age/1.9;w.o.scale.setScalar(.30+p*3.1);w.o.position.y=2.54+p*.55;w.o.material.opacity=Math.sin(Math.PI*p)*.60;});
    }
    function setMotionSpeed(value){externalSpeed=Number.isFinite(value)?value:null;}
    function setMode(value){if(mode===value)return;if(!['Auto','Idle','Roll','Stuck','Wave'].includes(value))throw new Error('Unknown Riceball mode: '+value);mode=value;modeTime=0;previousPhase='';}
    function reset(){t=modeTime=angle=x=expression=speed=waveClock=rollTime=stuckBase=0;dir=1;previousPhase='';waves.forEach(w=>{w.age=99;w.o.visible=false;});update(0);}
    function dispose(){ownedGeo.forEach(g=>g.dispose());ownedMat.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent?root.removeFromParent():root.parent&&root.parent.remove(root);}
    reset();
    return {root,update,setMode,setMotionSpeed,reset,dispose,getState:()=>({mode,phase,expression:expression>.5?'strained':'happy',expressionBlend:expression,waves:waves.filter(w=>w.o.visible).length,rollAngle:angle,x,contactHeight:pivot.position.y,riceGrains:visibleRiceCount})};
  }
  global.RiceballSpirit={create};
})(window);

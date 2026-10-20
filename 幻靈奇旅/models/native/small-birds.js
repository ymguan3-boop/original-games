/* Small birds — authored avian silhouettes, articulated joints and pooled effects.
 * Local native Three.js r128; +Y up, +Z forward. No external texture or frame allocation.
 */
(()=>{'use strict';
function create(options={}){
 const T=window.THREE;if(!T)throw Error('SmallBirds requires THREE');
 const chicken=options.species==='gugu',name=chicken?'咕咕':'小麻',root=new T.Group(),rig=new T.Group(),fx=new T.Group();
 root.name=name;rig.name='Character';fx.name='Effects';fx.userData.isEffect=true;root.add(rig,fx);
 const geometries=new Set(),materials=new Set(),joints=[],wings=[],legs=[],tailParts=[],blink=[],billParts=[];
 const G=g=>(geometries.add(g),g),col=h=>new T.Color(h).convertSRGBToLinear();
 const mat=(h,extra={})=>{const m=new T.MeshStandardMaterial(Object.assign({color:col(h),roughness:.62,metalness:0},extra));materials.add(m);return m;};
 const ivory=mat('#fff1d8'),softWhite=mat('#fff9ec'),lavender=mat('#aaa4b6'),slate=mat('#817b91'),paleGrey=mat('#c8c2ce'),darkGrey=mat('#6e687a');
 const brown=mat('#a66a43'),cocoa=mat('#754333'),tan=mat('#c38c5b'),red=mat('#ce4b3d'),redLight=mat('#e9604d'),gold=mat('#efa42c'),goldDark=mat('#b96b1b');
 const toeMat=chicken?gold:mat('#bc8b81'),beakMat=chicken?gold:mat('#938395'),dark=mat('#382820'),iris=mat('#693f27',{roughness:.27}),irisLight=mat('#b6804a',{roughness:.28}),pink=mat('#efa598'),oral=mat('#682d28'),tongue=mat('#e78273');
 const baseGeo=G(new T.SphereGeometry(1,28,20)),fineGeo=G(new T.SphereGeometry(1,48,32)),tinyGeo=G(new T.SphereGeometry(1,18,12));
 function group(p,x=0,y=0,z=0,n=''){const o=new T.Group();o.position.set(x,y,z);o.name=n;p.add(o);if(n)joints.push(o);return o;}
 function mesh(p,g,m){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function ell(p,m,x,y,z,sx,sy,sz,fine=false){const o=mesh(p,fine?fineGeo:baseGeo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function flow(p,m,pts,r,n=22,sides=10,flatten=1){const c=new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a))),frames=c.computeFrenetFrames(n,false),v=[],ix=[];
  for(let i=0;i<=n;i++){const t=i/n,pt=c.getPointAt(t),rad=typeof r==='function'?r(t):r;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,q=pt.clone().addScaledVector(frames.normals[i],Math.cos(a)*rad).addScaledVector(frames.binormals[i],Math.sin(a)*rad*flatten);v.push(q.x,q.y,q.z);}}
  for(let i=0;i<n;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,a+1,b,a+1,b+1,b);}const g=G(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return mesh(p,g,m);
 }
 // Closed biconvex feather: shaped perimeter, raised shaft and an actual tapered tip.
 const featherGeo=(()=>{const p=[],ix=[],rows=15,cols=6,layer=(rows+1)*(cols+1);for(const s of [1,-1])for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const t=i/rows,u=j/cols*2-1,w=.27*Math.pow(Math.sin(Math.PI*t),.60)*(1-.18*t);p.push(u*w,t,.075*t*t+s*.037*Math.sin(Math.PI*t)*(1-u*u));}for(let s=0;s<2;s++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=s*layer+i*(cols+1)+j,b=a+cols+1;if(!s)ix.push(a,a+1,b,a+1,b+1,b);else ix.push(a,b,a+1,a+1,b,b+1);}const g=G(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;})();
 function feather(p,m,x,y,z,w,l,rz=0,rx=0,ry=0){const o=mesh(p,featherGeo,m);o.position.set(x,y,z);o.scale.set(w,l,w);o.rotation.set(rx,ry,rz);return o;}
 const body=group(rig,0,chicken?1.09:1.03,0,'Body');
 if(chicken){ell(body,ivory,0,-.02,.025,.86,.86,.73,true);ell(body,softWhite,0,-.10,.43,.59,.65,.25,true);ell(body,tan,0,.11,-.24,.73,.66,.52);}
 else{ell(body,lavender,0,-.03,0,.70,.66,.60,true);ell(body,ivory,0,-.04,.305,.58,.55,.33,true);}
 const neck=group(body,0,chicken?.45:.35,chicken?.15:.17,'Neck');ell(neck,chicken?ivory:lavender,0,.06,-.015,chicken?.43:.48,chicken?.39:.35,chicken?.41:.46);
 const head=group(neck,0,chicken?.19:.30,chicken?.02:.04,'Head'),headSize=chicken?[.53,.64,.49]:[.68,.70,.61];ell(head,chicken?ivory:lavender,0,0,0,...headSize,true);
 const surf=(x,y,offset=0)=>headSize[2]*Math.sqrt(Math.max(.001,1-x*x/headSize[0]**2-y*y/headSize[1]**2))+offset;
 // A single conformed heart silhouette has no floating face discs or intersecting eye globes.
 if(!chicken){const p=[],ix=[],sides=96,rows=16;for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const r=i/rows,a=j/sides*Math.PI*2,x=16*Math.pow(Math.sin(a),3)/18*.67*r,boundary=(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/19*.62-.01,y=-.08+(boundary+.08)*r;p.push(x,y,surf(x,y,.008));}for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,a+1,b,a+1,b+1,b);}const g=G(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();mesh(head,g,ivory);}
 function facePatch(parent,s,m,cx,cy,rx,ry,offset=.012,tilt=0){const p=[],ix=[],rows=10,segments=44;for(let i=0;i<=rows;i++)for(let j=0;j<=segments;j++){const r=i/rows,a=j/segments*Math.PI*2,u=r*Math.cos(a),v=r*Math.sin(a),x=s*(cx+rx*u),y=cy+ry*v+tilt*u;p.push(x,y,surf(x,y,offset));}for(let i=0;i<rows;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;if(s>0)ix.push(a,b,a+1,b,b+1,a+1);else ix.push(a,a+1,b,b,a+1,b+1);}const g=G(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();const o=mesh(parent,g,m);o.castShadow=false;return o;}
 for(const s of [-1,1]){const cx=chicken?.235:.285,cy=chicken?.105:.08,eye=group(head,0,cy,0,'Eye'+s),open=group(eye,0,0,0,'Eyelid'+s);open.position.y=-cy;
  facePatch(open,s,softWhite,cx,cy,chicken?.19:.195,chicken?.245:.255,.013);facePatch(open,s,iris,cx,cy-.008,chicken?.118:.126,chicken?.177:.185,.019);facePatch(open,s,irisLight,cx-.004,cy-.074,.100,.104,.021);facePatch(open,s,dark,cx,cy+.006,.089,.137,.023);facePatch(open,s,softWhite,cx-.034,cy+.080,.040,.053,.026);facePatch(open,s,softWhite,cx+.044,cy-.067,.018,.025,.026);blink.push({open,cy});
  facePatch(head,s,pink,chicken?.345:.433,chicken?-.095:-.14,chicken?.110:.130,chicken?.069:.09,.014);
  const brow=[];for(let i=0;i<=12;i++){const u=i/12,x=s*(cx-.115+u*.23),y=cy+.28+Math.sin(u*Math.PI)*.038;brow.push([x,y,surf(x,y,.013)]);}flow(head,chicken?tan:slate,brow,.014,18,7);
 }
 // Upper beak and hinged lower mandible are the bird's sole mouth geometry.
 const bill=group(head,0,chicken?-.075:-.08,headSize[2]-.012,'Beak'),jaw=group(bill,0,-.018,.015,'Jaw');billParts.push(jaw);
 function beakHalf(parent,upper){const p=[],ix=[],rows=24,sides=28;for(let i=0;i<=rows;i++){const t=i/rows,w=(chicken?.18:.165)*Math.pow(1-t,.64),h=(chicken?.092:.092)*Math.pow(1-t,.58),z=t*(chicken?.30:.23);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI;p.push(w*Math.cos(a),upper?h*Math.sin(a):-.062*Math.sin(a)*Math.pow(1-t,.6),z-(upper?.028:0)*t*t);}}for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;if(upper)ix.push(a,a+1,b,b,a+1,b+1);else ix.push(a,b,a+1,b,b+1,a+1);}const g=G(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return mesh(parent,g,beakMat);}
 beakHalf(bill,true);beakHalf(jaw,false);ell(jaw,oral,0,-.012,.09,.105,.018,.073);ell(jaw,tongue,0,-.007,.127,.058,.014,.025);for(const s of [-1,1])ell(bill,dark,s*.065,.056,.061,.010,.006,.012);
 const crest=[];
 if(chicken){const comb=group(head,0,.48,-.015,'Comb');for(let i=0;i<3;i++){const o=ell(comb,i===1?redLight:red,0,.10+Math.sin(i*Math.PI/2)*.08,-.19+i*.19,.115,.26+Math.sin(i*Math.PI/2)*.09,.17);o.rotation.x=(i-1)*.26;}for(const s of [-1,1]){const w=group(head,s*.067,-.25,.41,'Wattle'+s);ell(w,red,0,-.075,0,.091,.17,.065);crest.push({node:w,k:s});}flow(head,ivory,[[0,.49,.22],[0,.59,.35],[0,.55,.47],[0,.46,.48]],t=>.095*(1-.67*t),28,12);}
 else for(let i=0;i<2;i++){const p=group(head,(i?1:-1)*.065,.60,-.02,'Crest'+i);feather(p,i?slate:paleGrey,0,0,0,.69,i?.37:.50,i?-.64:.18,-.25,0);crest.push({node:p,k:i});}
 // Throat scallops are volumetric feathers that overlap the neck-to-body transition.
 for(let row=0;row<(chicken?2:0);row++)for(let i=0;i<7;i++){const u=(i-3)/3;feather(neck,chicken?ivory:paleGrey,u*(chicken?.33:.45),.13-row*.19,.36-Math.abs(u)*.10,chicken?.68:.61,chicken?.45:.29,Math.PI-u*.35,-.13,-u*.15);}
 for(const s of [-1,1]){const mirror=group(body,s*(chicken?.64:.53),chicken?.24:.11,-.09,'WingMirror'+s);mirror.scale.x=s;const shoulder=group(mirror,0,0,0,'WingShoulder'+s),elbow=group(shoulder,chicken?.38:.30,.03,-.015,'WingElbow'+s),wrist=group(elbow,chicken?.33:.25,.02,-.02,'WingWrist'+s);
  ell(shoulder,chicken?tan:lavender,.17,-.11,-.02,chicken?.34:.29,chicken?.24:.20,.12);
  for(let i=0;i<4;i++)feather(shoulder,chicken?tan:paleGrey,.02+i*.115,.03-i*.014,.10,.72,chicken?.43:.34,-2.63+i*.13,-.12,0);
  for(let i=0;i<5;i++)feather(elbow,chicken?(i<2?tan:brown):(i%2?ivory:lavender),i*.080,.02-i*.032,.065,.79,chicken?.56:.43,-2.57+i*.18,-.14,0);
  for(let i=0;i<5;i++)feather(wrist,chicken?(i<2?brown:cocoa):(i%2?slate:lavender),i*.046,-.005-i*.040,.006,.87,chicken?.63:.51,-2.40+i*.15,-.14,0);
  // Overlapping dorsal feathers complete back and folded silhouettes.
  for(let i=0;i<4;i++)feather(elbow,chicken?brown:slate,i*.09,.05-i*.033,-.12,.79,chicken?.40:.32,-2.48+i*.17,.08,Math.PI);
  wings.push({s,shoulder,elbow,wrist});
 }
 const tail=group(body,0,chicken?-.12:-.19,chicken?-.54:-.42,'TailRoot');
 if(chicken){for(let i=0;i<7;i++){const u=(i-3)/3,g=group(tail,u*.085,0,-.04*Math.abs(u),'SickleTail'+i),m=i%2?cocoa:red;const points=[[0,0,0],[u*.14,.45,-.33],[u*.30,1.02,-.70],[u*.36,1.18,-1.04],[u*.34,.94,-1.35],[u*.30,.52,-1.48]];flow(g,m,points,t=>(.135+.055*Math.sin(t*Math.PI))*Math.pow(Math.sin(Math.PI*(.04+t*.96)),.61),38,12,.37);tailParts.push({node:g,i,u});}for(let i=0;i<5;i++)feather(tail,brown,(i-2)*.09,.06,-.03,.95,.47,Math.PI,1.25,(i-2)*.15);}
 else for(let i=0;i<5;i++){const u=(i-2)/2,g=group(tail,u*.075,0,0,'TailFan'+i);feather(g,i%2?slate:lavender,0,0,0,1.05,.64-Math.abs(u)*.10,Math.PI,1.20,u*.34);tailParts.push({node:g,i,u});}
 const lengths=chicken?[.18,.13,.11]:[.15,.17,.13],hipY=chicken?-.62:-.54;
 for(const s of [-1,1]){const hip=group(body,s*(chicken?.33:.29),hipY,.04,'Hip'+s),knee=group(hip,0,-lengths[0],.025,'Knee'+s),ankle=group(knee,0,-lengths[1],.015,'Ankle'+s),foot=group(ankle,0,-lengths[2],.04,'Foot'+s),toes=[];
  ell(hip,chicken?ivory:lavender,0,-.06,0,chicken?.18:.17,.19,.17);flow(knee,toeMat,[[0,.025,0],[0,-lengths[1]*.52,.015],[0,-lengths[1],.015]],chicken?.058:.048,18,10);flow(ankle,toeMat,[[0,.015,0],[0,-lengths[2],.035]],chicken?.058:.052,16,10);ell(foot,toeMat,0,.012,.035,.13,.065,.13);
  for(let i=0;i<4;i++){const front=i<3,t=group(foot,front?(i-1)*.092:0,0,front?.06:-.08,'Toe'+s+'-'+i);t.rotation.y=front?(i-1)*.24:Math.PI;flow(t,toeMat,[[0,0,0],[0,-.012,.10],[0,-.015,chicken?.24:.20]],v=>(chicken?.049:.045)*(1-.48*v),18,10);if(chicken)flow(t,goldDark,[[0,-.01,.215],[0,-.025,.265],[0,-.047,.271]],v=>.024*(1-v*.98),12,7);toes.push(t);}
  legs.push({s,hip,knee,ankle,foot,toes});
 }
 // Consolidate material-compatible surfaces within each moving joint.
 function mergeStatic(node){for(const c of node.children.slice())if(c.isGroup)mergeStatic(c);const buckets=new Map();for(const c of node.children.slice())if(c.isMesh&&!Array.isArray(c.material)){const a=buckets.get(c.material)||[];a.push(c);buckets.set(c.material,a);}for(const [m,parts]of buckets){if(parts.length<2)continue;const p=[],n=[];for(const o of parts){o.updateMatrix();let g=o.geometry.clone().applyMatrix4(o.matrix);if(g.index){const f=g.toNonIndexed();g.dispose();g=f;}const a=g.attributes.position,b=g.attributes.normal;for(let i=0;i<a.count;i++){p.push(a.getX(i),a.getY(i),a.getZ(i));n.push(b.getX(i),b.getY(i),b.getZ(i));}g.dispose();node.remove(o);}const g=G(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));mesh(node,g,m);}}
 mergeStatic(rig);
 // Pooled feather eddies / rooster acoustic rings. Effects never enter character bounds.
 const featherParticles=[],waves=[];const fxMat=mat(chicken?'#f9be5f':'#d8cced',{transparent:true,opacity:.66,depthWrite:false,side:T.DoubleSide});
 for(let i=0;i<20;i++){const o=feather(fx,chicken?ivory:(i%2?ivory:lavender),0,0,0,.22,.29);o.name='PooledFeather'+i;o.castShadow=false;o.visible=false;featherParticles.push(o);}
 const ringGeo=G(new T.TorusGeometry(1,.025,6,64));for(let i=0;i<7;i++){const m=fxMat.clone();materials.add(m);const o=mesh(fx,ringGeo,m);o.name='PooledSoundWave'+i;o.castShadow=false;o.visible=false;waves.push(o);}
 const duration={Idle:6.4,Rest:6,Walk:1.2,Takeoff:chicken?1.5:1.3,Fly:chicken?1.1:.62,Glide:chicken?1.2:2.4,Land:chicken?1.5:1.35,Attack:chicken?2.3:1.7,Ultimate:chicken?4.4:4.2},modes=Object.keys(duration),bodyBase=body.position.y,basePose=new Map();
 rig.traverse(o=>{if(o.isGroup)basePose.set(o,{p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
 const ikBodyInverse=new T.Matrix4(),ikRootInverse=new T.Matrix4(),ikTarget=new T.Vector3();
 let mode='Idle',modeTime=0,elapsed=0,speed=1,disposed=false,phase='idle',altitude=0,motionZ=0,bodyPitch=0,completed=false,lastAttack='',lastAttackTime=0,floorOffset=0;
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},attackMode=m=>m==='Attack'||m==='Ultimate';
 function setMode(n){if(!modes.includes(n))return false;mode=n;modeTime=0;completed=false;if(attackMode(n)){lastAttack=n;lastAttackTime=0;}return true;}
 function setMotionSpeed(v){speed=clamp(Number(v)||1,.2,2);}
 function pose(t,a){for(const [o,b]of basePose){o.position.copy(b.p);o.quaternion.copy(b.q);o.scale.copy(b.s);}rig.position.set(0,floorOffset,0);rig.rotation.set(0,0,0);altitude=0;motionZ=0;bodyPitch=0;let fly=0,fold=1,crouch=0,flap=0,headPitch=0,jawOpen=.025+Math.max(0,Math.sin(t*1.8))*.025,run=0;
  phase=mode.toLowerCase();
  if(mode==='Idle'){body.position.y+=Math.sin(t*1.8)*.012;head.rotation.y=Math.sin(t*.65)*.085;}
  if(mode==='Rest'){body.position.y-=.13;head.rotation.x=.18;neck.scale.y=.88;jawOpen=.02;}
  if(mode==='Walk'){run=1;body.position.y+=Math.abs(Math.sin(t*5.8))*.028;body.rotation.z=Math.sin(t*5.8)*.026;head.rotation.x=-Math.sin(t*5.8)*.028;motionZ=t*(chicken?.55:.65);}
  if(mode==='Takeoff'){if(a<.35){phase='crouch';crouch=.18*smooth(a/.35);}else if(a<.62){phase='launch';const u=smooth((a-.35)/.27);crouch=.18*(1-u);fly=u;fold=1-u;altitude=.27*u;}else{phase='wing-powered-lift';const u=smooth((a-.62)/(duration.Takeoff-.62));fly=1;fold=0;altitude=.27+(chicken?.45:.95)*u;bodyPitch=(chicken?.32:.98)*u;flap=Math.sin(a*(chicken?14:20));motionZ=(chicken?.35:.75)*u;}}
  if(mode==='Fly'){fly=1;fold=0;flap=Math.sin(t*(chicken?15:20));altitude=chicken?.54+Math.sin(t*5.7)*.13:1.20+Math.sin(t*3.1)*.06;bodyPitch=chicken?.37:1.05;motionZ=t*(chicken?.52:1.25);phase=chicken?'short-heavy-flutter':'rapid-pigeon-flight';}
  if(mode==='Glide'){fly=1;fold=0;altitude=chicken?.42+Math.sin(t*5)*.07:1.22+Math.sin(t*.9)*.045;bodyPitch=chicken?.30:1.10;flap=chicken?Math.sin(t*13)*.50:.045*Math.sin(t*1.8);motionZ=t*(chicken?.40:1.4);body.rotation.z=Math.sin(t*.9)*.07;phase=chicken?'short-flap-hop':'rounded-wing-glide';}
  if(mode==='Land'){const u=smooth(a/duration.Land);fly=1-u;fold=smooth((u-.35)/.65);altitude=(chicken?.60:1.20)*(1-u);bodyPitch=(chicken?.25:1.0)*(1-u);crouch=.15*Math.sin(Math.PI*clamp((u-.65)/.35));flap=Math.sin(a*(chicken?13:17))*(1-u);phase=u<.72?'braking-flaps':'touchdown';}
  if(mode==='Attack'){lastAttackTime=a;if(!chicken){if(a<.42){phase='curious-windup';crouch=.11*smooth(a/.42);head.rotation.z=.16;headPitch=-.13;}else if(a<.78){const u=smooth((a-.42)/.36);phase='beak-peck';bodyPitch=.35*u;headPitch=.45*u;motionZ=.52*u;jawOpen=.14;}else{const u=smooth((a-.78)/.92);phase='peck-recover';bodyPitch=.35*(1-u);headPitch=.45*(1-u);motionZ=.52*(1-u);}}else{if(a<.55){const u=smooth(a/.55);phase='comb-charge-windup';crouch=.18*u;bodyPitch=.18*u;headPitch=.23*u;}else if(a<1.35){const u=smooth((a-.55)/.8);phase='comb-charge';bodyPitch=.28;headPitch=.31;motionZ=1.18*u;run=1.8;}else{const u=smooth((a-1.35)/.95);phase='charge-recover';bodyPitch=.28*(1-u);headPitch=.31*(1-u);motionZ=1.18*(1-u);}}}
  if(mode==='Ultimate'){lastAttackTime=a;if(!chicken){if(a<.55){const u=smooth(a/.55);phase='downy-windup';crouch=.20*u;fold=1-.3*u;}else if(a<1.15){const u=smooth((a-.55)/.6);phase='whirl-liftoff';fly=u;fold=1-u;altitude=.68*u;flap=Math.sin(a*23);}else if(a<3.1){phase='down-feather-whirl';fly=1;fold=0;altitude=.68+Math.sin(a*5)*.05;rig.rotation.y=(a-1.15)*5.5;flap=Math.sin(a*23);bodyPitch=.16;}else{const u=smooth((a-3.1)/1.1);phase='whirl-touchdown';altitude=.68*(1-u);fly=1-u;fold=u;flap=Math.sin(a*18)*(1-u);crouch=.1*Math.sin(u*Math.PI);}}else{if(a<.85){const u=smooth(a/.85);phase='crowing-inhale';crouch=.15*Math.sin(u*Math.PI);body.scale.set(1+.08*u,1+.035*u,1+.08*u);headPitch=-.23*u;jawOpen=.12+.16*u;}else if(a<3.3){phase='sunrise-crow';headPitch=-.28;jawOpen=.63;fold=.25;flap=Math.sin(a*10)*.42;body.scale.setScalar(1.018+Math.sin(a*9)*.008);}else{const u=smooth((a-3.3)/1.1);phase='crow-recover';headPitch=-.28*(1-u);jawOpen=.63*(1-u)+.13*u;fold=.25+.75*u;}}}
  body.position.y-=crouch;body.rotation.x=bodyPitch;neck.rotation.x=-bodyPitch*.27;head.rotation.x+=headPitch-bodyPitch*.73;
  if(mode!=='Rest'){for(const e of blink){const b=t%6.1,open=b>5.85?Math.max(.045,Math.abs(b-5.97)/.12):1;e.open.scale.y=open;e.open.position.y=-e.cy*open;}}
  else for(const e of blink){e.open.scale.y=.05;e.open.position.y=-e.cy*.05;}
  jaw.rotation.x=jawOpen;for(const c of crest){c.node.rotation.x+=Math.sin(t*3+c.k)*.025;}
  for(const w of wings){w.shoulder.rotation.y=fold*1.25+(1-fold)*(.1+flap*.62);w.shoulder.rotation.z=-fold*.86+(1-fold)*(.18+flap*.48);w.shoulder.rotation.x=fold*.06;w.elbow.rotation.y=-fold*.18+(1-fold)*flap*.18;w.elbow.rotation.z=-fold*.50+(1-fold)*flap*.15;w.wrist.rotation.z=-fold*.38+(1-fold)*flap*.11;}
  for(const l of legs){const stride=t*(chicken?5.7:6.2)+(l.s<0?0:Math.PI),swing=Math.sin(stride)*run;l.hip.rotation.x=fly*.80+swing*.34;l.knee.rotation.x=-fly*1.3-Math.max(0,swing)*.50-crouch*3.5;l.ankle.rotation.x=fly*.62+crouch*1.8;l.foot.rotation.x=fly*.32-swing*.15;for(let i=0;i<l.toes.length;i++)l.toes[i].rotation.x=fly*(i<3?.48:-.27);}
  for(const p of tailParts){p.node.rotation.x=Math.sin(t*2.4+p.i*.22)*(chicken?.035:.022);p.node.rotation.y=Math.sin(t*1.7)*.03;}
  tail.rotation.x=-bodyPitch*.70+Math.sin(t*1.9)*.02;
  rig.position.y=floorOffset+altitude;rig.position.z=options.inPlace===false?motionZ:0;
  // Foot IK preserves actual contact and flexes knees without stretching the legs.
  if(fly<.98){root.updateMatrixWorld(true);const inv=ikBodyInverse.copy(body.matrixWorld).invert();ikRootInverse.copy(root.matrixWorld).invert();for(const l of legs){const base=basePose.get(l.hip).p,targetWorld=ikTarget;l.hip.getWorldPosition(targetWorld);targetWorld.applyMatrix4(ikRootInverse);const st=t*(chicken?5.7:6.2)+(l.s<0?0:Math.PI),step=run?Math.max(0,Math.sin(st))*.09:0;targetWorld.y=floorOffset+.055+step;targetWorld.z=rig.position.z+.14+(run?Math.sin(st)*.12:0);const target=targetWorld.applyMatrix4(root.matrixWorld).applyMatrix4(inv),dy=target.y-base.y,dz=target.z-base.z,L1=lengths[0],L2=lengths[1]+lengths[2],r=Math.min(Math.hypot(dy,dz),L1+L2-.0001),ang=Math.acos(clamp((L1*L1+r*r-L2*L2)/(2*L1*r),-1,1)),hipAng=Math.atan2(-dz,-dy)+ang,kneeAng=-Math.PI+Math.acos(clamp((L1*L1+L2*L2-r*r)/(2*L1*L2),-1,1)),mix=1-fly;l.hip.rotation.x=l.hip.rotation.x*fly+hipAng*mix;l.knee.rotation.x=l.knee.rotation.x*fly+kneeAng*mix;l.ankle.rotation.x=l.ankle.rotation.x*fly-(hipAng+kneeAng+bodyPitch)*mix;l.foot.rotation.x*=fly;}}
  for(let i=0;i<featherParticles.length;i++){const o=featherParticles[i],active=mode==='Ultimate'&&!chicken&&a>=1.12&&a<3.55;o.visible=active;if(active){const u=(a-1.12)/2.43,r=.62+u*.75,phi=a*5.1+i/20*Math.PI*2;o.position.set(Math.sin(phi)*r,floorOffset+.25+(i%5)*.30+Math.sin(phi)*.08,Math.cos(phi)*r);o.rotation.set(Math.sin(phi)*.3,phi,phi+Math.PI/2);o.scale.set(.20+.12*u,.27+.16*u,.20);}}
  for(let i=0;i<waves.length;i++){const o=waves[i],age=a-(.96+i*.27),active=chicken&&mode==='Ultimate'&&age>=0&&age<1.8;o.visible=active;if(active){const u=age/1.8;o.position.set(0,floorOffset+2.12,1.05+age*3.6);o.rotation.set(0,0,0);o.scale.setScalar(.18+u*1.4);o.material.opacity=(1-u)*.60;}}
 }
 function update(delta=0){if(disposed)return;const d=Math.min(.08,Math.max(0,Number(delta)||0))*speed;elapsed+=d;modeTime+=d;pose(elapsed,modeTime);if(['Takeoff','Land','Attack','Ultimate'].includes(mode)&&modeTime>=duration[mode]){if(attackMode(mode)){completed=true;lastAttackTime=duration[mode];}mode=mode==='Takeoff'?'Fly':'Idle';modeTime=0;}}
 function seek(n,time=0){mode='Idle';elapsed=0;modeTime=0;completed=false;setMode(n);for(let left=Math.max(0,time);left>1e-8;){const d=Math.min(1/60,left);update(d/speed);left-=d;}update(0);return getMotionState();}
 function getMotionState(){return{name,mode,phase,modeTime,altitude,motionZ,renderedMotionZ:rig.position.z,bodyPitch,attack:lastAttack,attackTime:lastAttackTime,attackProgress:attackMode(mode)?clamp(modeTime/duration[mode]):completed?1:0,specialActive:attackMode(mode),attackCompleted:completed,completed,disposed};}
 pose(0,0);root.updateMatrixWorld(true);const firstBox=new T.Box3().setFromObject(rig);floorOffset=-firstBox.min.y;pose(0,0);root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(rig),size=bounds.getSize(new T.Vector3());
 function getState(){let triangles=0,meshes=0;rig.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return Object.assign(getMotionState(),{species:chicken?'gugu':'xiaoma',triangles:Math.round(triangles),meshes,joints:joints.length,modes:modes.slice(),durations:Object.assign({},duration),height:size.y,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray()}});}
 function dispose(){if(disposed)return;disposed=true;if(root.parent)root.parent.remove(root);root.clear();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();}
 return{root,update,setMode,seek,setMotionSpeed,dispose,getState,getMotionState};
}
window.SmallBirds={create,version:'1.0.0'};
})();

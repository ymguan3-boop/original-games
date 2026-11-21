// Merchant protagonist. Limbs pivot at the shoulder, elbow and hip so the
// portrait pose, patrol stride and cashier gesture share one mesh assembly.
export function createStoryBoy(T){
 const root=new T.Group(),materials=new Map(),geometries=new Set();
 function material(color){
  if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:.82}));
  return materials.get(color);
 }
 function joint(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 function mesh(parent,g,mat,x=0,y=0,z=0){geometries.add(g);const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 const sphere=new T.SphereGeometry(1,24,18);
 function oval(p,color,x,y,z,a,b,c){const m=mesh(p,sphere,material(color),x,y,z);m.scale.set(a,b,c);return m;}
 function contour(p,color,points,r){
  const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));
  return mesh(p,new T.TubeGeometry(curve,10,r,5,false),material(color));
 }
 const ivory=0xffeed3,skin=0xf7c69d,hair=0x392f24,blue=0x466981,khaki=0xbca977;
 const body=joint(root,0,0,0),head=joint(body,0,1.15,0);
 head.scale.set(1.085,.935,1.055);
 // A shallow crown and broader cheeks give the boy a rounded profile.
 const crownY=y=>y-.085*Math.max(0,y)**3/.27**2;
 const skull=sphere.clone(),vertices=skull.attributes.position;
 for(let i=0;i<vertices.count;i++)vertices.setY(i,crownY(vertices.getY(i)*.259)/.259);
 skull.computeVertexNormals();mesh(head,skull,material(skin)).scale.set(.226,.259,.205);
 for(const side of [-1,1]){
  oval(head,skin,side*.221,-.003,-.001,.045,.067,.036);
  oval(head,0xcd8d68,side*.24,-.003,.027,.019,.039,.012);
 }
 // A shaped hairline rises at the temples and lowers over the back of the neck.
 const scalp=new T.SphereGeometry(1,48,15),v=scalp.attributes.position;
 for(let i=0;i<v.count;i++){
  const theta=Math.acos(Math.max(-1,Math.min(1,v.getY(i))))/Math.PI;
  const az=(scalp.attributes.uv.getX(i)-.25)*Math.PI*2,front=Math.max(0,Math.cos(az));
  const stop=1.72-.77*front+.23*Math.max(0,-Math.cos(az))+(.055*Math.cos(5*az)+.040*Math.sin(13*az))*front;
  const a=theta*stop,grain=1+.007*Math.sin(az*21+theta*8);
  v.setXYZ(i,.234*grain*Math.sin(a)*Math.sin(az),crownY(.265*Math.cos(a)+.012),.216*grain*Math.sin(a)*Math.cos(az));
 }
 scalp.computeVertexNormals();mesh(head,scalp,material(hair));
 // Small curved marks follow the skull instead of projecting a flat fringe.
 for(let i=0;i<15;i++){
  const az=(i-7)*.19,start=.64+.16*Math.cos(i*2.4);
  const pts=[0,.085,.17].map((d,k)=>[.231*Math.sin(start+d)*Math.sin(az-.035*k),crownY(.264*Math.cos(start+d)+.016),.212*Math.sin(start+d)*Math.cos(az-.035*k)]);
  contour(head,i%3?0x473930:0x594538,pts,.0022);
 }
 const eyes=[];
 for(const side of [-1,1]){
  const eye=joint(head,side*.088,.027,.187);eye.rotation.y=side*.38;eyes.push(eye);
  oval(eye,ivory,0,0,0,.046,.023,.010);oval(eye,0x493223,-side*.002,.001,.008,.022,.023,.007);
  oval(eye,0x302321,-side*.002,.001,.014,.011,.016,.004);oval(eye,0xfff6e7,-.006,.009,.018,.005,.005,.002);
  contour(eye,hair,[[-.044,-.001,.004],[-.021,.021,.012],[.010,.023,.013],[.043,.004,.005]],.0038);
  contour(eye,0x49372b,[[-.043,.055,-.004],[-.01,.064,.007],[.037,.055,.002]],.007);
 }
 oval(head,skin,0,-.013,.197,.025,.037,.023);
 oval(head,skin,0,-.025,.213,.027,.019,.018);
 for(const side of [-1,1])oval(head,skin,side*.020,-.029,.207,.013,.011,.014);
 contour(head,0x966953,[[-.039,-.084,.194],[-.01,-.089,.194],[.015,-.088,.193],[.035,-.083,.192]],.0033);
 oval(body,skin,0,.922,0,.075,.085,.075);
 const cloth=0xcac8c2,rib=0xb6b4ad,seam=0x898a85;
 function garment(p,profile,color,x,y,z,depth){
  const g=new T.LatheGeometry(profile.map(([h,r])=>new T.Vector2(r,h)),28);
  const o=mesh(p,g,material(color),x,y,z);o.scale.z=depth;return o;
 }
 const torso=[[.43,.156],[.443,.172],[.475,.174],[.502,.184],[.60,.181],[.71,.181],[.803,.190],[.841,.178],[.87,.146],[.896,.079]];
 garment(body,torso,cloth,0,0,0,.78);
 garment(body,[[.431,.158],[.441,.174],[.468,.177]],rib,0,0,0,.79);
 // Lowered hood, rolled lining and a partially open zipper around the neck.
 const hood=oval(body,cloth,0,.844,-.086,.177,.126,.111);hood.rotation.x=-.22;
 function front(x,y){
  const i=Math.max(1,torso.findIndex(([h])=>h>=y));const [a,r]=torso[i-1],[b,q]=torso[i];
  const radius=r+(q-r)*(y-a)/(b-a);return .78*Math.sqrt(Math.max(0,radius*radius-x*x));
 }
 const neck=new T.BufferGeometry(),pts=[];
 for(let i=0;i<10;i++){
  const t=i/10,u=(i+1)/10;
  for(let j=0;j<8;j++){
   const left=j/4-1,right=(j+1)/4-1;
   for(const [h,side] of [[t,left],[t,right],[u,right],[t,left],[u,right],[u,left]]){
   const y=.756+h*.138,x=side*h*.067;pts.push(x,y,front(x,y)+.003);
   }
  }
 }
 neck.setAttribute('position',new T.Float32BufferAttribute(pts,3));neck.computeVertexNormals();mesh(body,neck,material(skin));
 for(const side of [-1,1]){
  const rim=[[side*.135,.917,-.101],[side*.155,.895,-.016],[side*.097,.875,.077],[side*.049,.824,.121],[side*.009,.758,.147]];
  contour(body,rib,rim,.018);
  contour(body,cloth,rim.map(([x,y,z])=>[x,y+.006,z+.006]),.013);
  const pocket=[[.142,.538],[.106,.556],[.071,.586]].map(([x,y])=>[side*x,y,front(x,y)+.003]);
  contour(body,seam,pocket,.0032);
 }
 contour(body,seam,torso.filter(([y])=>y<.756).map(([y,r])=>[0,y,r*.78+.002]).concat([[0,.758,.146]]),.004);
 oval(body,0x747776,.003,.746,.150,.006,.014,.004);
 const badge=joint(body,.090,.728,.128);badge.rotation.y=.40;
 oval(badge,0x9c8653,0,0,0,.028,.036,.005);oval(badge,0xd8bb66,0,0,.004,.024,.032,.004);
 oval(badge,blue,0,.007,.008,.019,.020,.003);contour(badge,ivory,[[-.011,.005,.012],[-.002,.001,.013],[.010,.011,.012]],.0025);
 oval(body,khaki,0,.449,0,.154,.060,.102);
 const legs=[],arms=[];
 for(const side of [-1,1]){
  const hip=joint(body,side*.083,.46,0);legs.push(hip);
  garment(hip,[[-.395,.060],[-.37,.068],[-.35,.063],[-.32,.069],[-.25,.063],[-.211,.073],[-.18,.068],[-.09,.085],[.016,.088]],khaki,0,0,0,1.13);
  contour(hip,0xab996e,[[side*.082,-.05,.008],[side*.069,-.20,.021],[side*.061,-.32,0]],.0026);
  oval(hip,blue,0,-.410,.029,.067,.052,.109);oval(hip,0xe4decb,0,-.445,.035,.069,.020,.116);
  oval(hip,0xe2dac7,0,-.423,.108,.060,.023,.048);
  for(const z of [.055,.074])contour(hip,ivory,[[-.030,-.377,z],[0,-.369,z+.004],[.030,-.377,z]],.003);
  const sh=joint(body,side*.17,.818,0),elbow=joint(sh,0,-.176,0);arms.push({sh,elbow,side});
  oval(sh,cloth,0,-.068,0,.065,.116,.067);
  garment(elbow,[[-.147,.043],[-.118,.051],[-.098,.057],[-.070,.052],[-.02,.057],[.018,.058]],cloth,0,0,0,1);
  oval(elbow,cloth,0,0,0,.057,.057,.057);garment(elbow,[[-.151,.045],[-.127,.049]],rib,0,0,0,1);
  oval(elbow,skin,0,-.173,.006,.043,.048,.038);oval(elbow,skin,-side*.030,-.162,.022,.017,.028,.016);
 }
 let mode='Idle',mood='',action='',time=0;
 function update(dt){
  time+=dt;const moving=mode==='Walk'||mode==='Run',stride=moving?Math.sin(time*(mode==='Run'?10:7))*.52:0;
  body.position.y=moving?Math.abs(stride)*.041:Math.sin(time*2)*.004;
  head.rotation.set(.025*Math.sin(time*1.4),.056*Math.sin(time),.027*Math.sin(time*1.6));
  const blink=time%3.8;for(const eye of eyes)eye.scale.y=blink>3.62?Math.max(.10,Math.abs(blink-3.71)/.09):1;
  for(const [i,arm] of arms.entries()){
   const {side,sh,elbow}=arm,cheer=!moving&&side===-1&&(action==='celebrate'||mood==='proud'||mood==='happy');
   legs[i].rotation.x=side*(stride+(action==='portrait'?.13:0));
   sh.rotation.set(cheer?-.28:-.08-side*stride,0,side*(cheer?1.70:.19));
   elbow.rotation.set(cheer?-.58:action==='pay'?-.89:-.22,0,side*(cheer?.95:.01));
  }
 }
 update(0);
 return {root,setMode(m){mode=m;},setMood(m){mood=m;},setAction(a){action=a;},update,
  dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}

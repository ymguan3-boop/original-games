/* 星冠限定武器櫃：雕金弧楣、月桂、寶石與紅絨階台。靜態零件合併為一個網格。 */
import {builder} from './product-models.js?v=20261114-v46';
let cached;
export function limitedRack(T){
 if(cached)return cached;
 const b=builder(T),wood=0x21545a,dark=0x123b42,gold=0xe9bc5c,light=0xffe0a0,velvet=0x812f49,gem=0x438ee5;
 const S={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,12),leaf:new T.SphereGeometry(1,8,5),gem:new T.OctahedronGeometry(1),ring:new T.TorusGeometry(1,.10,5,16)};
 const line=(points,color=gold,r=.008)=>{const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*4),r,5,false);b.put(g,color);g.dispose();};
 const leaf=(x,y,z,angle,size=.055)=>b.put(S.leaf,gold,x,y,z,size*.42,size,.012,0,0,angle);
 // Soft scalloped pediment is an actual extruded profile, rather than a flat crown image.
 const shape=new T.Shape();shape.moveTo(-.49,1.52);shape.bezierCurveTo(-.58,1.7,-.38,1.62,-.28,1.77);shape.bezierCurveTo(-.15,1.97,.15,1.97,.28,1.77);shape.bezierCurveTo(.38,1.62,.58,1.7,.49,1.52);shape.lineTo(.39,1.52);shape.quadraticCurveTo(0,1.86,-.39,1.52);shape.closePath();
 const crest=new T.ExtrudeGeometry(shape,{depth:.50,bevelEnabled:true,bevelSize:.018,bevelThickness:.015,bevelSegments:2,curveSegments:12});b.put(crest,wood,0,0,-.28);crest.dispose();
 b.put(S.box,dark,0,.16,0,1,.18,.75);b.put(S.box,wood,0,.245,0,1.04,.06,.78);b.put(S.box,gold,0,.273,.39,1.02,.012,.018);
 b.put(S.box,dark,0,.91,-.29,.90,1.34,.08);b.put(S.box,velvet,0,.94,-.237,.76,1.28,.03);
 for(let i=-7;i<=7;i++)b.put(S.cyl,i%2?0x90384e:0x70243d,i*.05,.94,-.215,.014,1.22,.012);
 for(const side of [-1,1]){
  const x=side*.44;
  b.put(S.cyl,wood,x,.91,0,.075,1.34,.32);b.put(S.box,dark,x,.91,0,.09,1.3,.59);
  for(const y of [.28,1.48,1.55]){b.put(S.box,gold,x,y,0,.17,.035,.67);b.put(S.box,wood,x,y+.035,0,.18,.035,.68);}
  line([[x,.33,.33],[x,.9,.33],[x,1.47,.33]],light,.005);
  for(const y of [.43,.58,.73,1.02,1.17,1.32])for(const s of [-1,1])leaf(x+s*.025,y,.345,-s*.55,.043);
  b.put(S.gem,gold,x,.87,.36,.065,.095,.027);b.put(S.gem,gem,x,.87,.388,.043,.068,.02);
  for(const z of [-.26,.27]){
   line([[x,.18,z],[x+side*.025,.08,z+.015],[x+side*.055,.035,z+.045]],gold,.038);
   leaf(x,.11,z+.035,side*.3,.07);
  }
  // Swept gold vine follows the shaped crest; small leaves catch mobile lighting.
  line([[side*.48,1.61,.25],[side*.35,1.69,.25],[side*.22,1.84,.25],[0,1.91,.25]],gold,.014);
  for(let i=0;i<4;i++){const x=side*(.10+i*.065),y=1.84-i*.045;leaf(x,y,.285,-side*.8,.045);leaf(x+side*.025,y-.035,.285,side*.8,.037);}
  b.put(S.ring,gold,side*.47,1.67,.25,.065,.065,.1,0,0,side*.3);
 }
 for(const [i,y]of [.30,.64,.98,1.32].entries()){
  b.put(S.box,wood,0,y-.026,0,.79,.052,.59);b.put(S.box,velvet,0,y+.004,0,.77,.012,.55);b.put(S.box,gold,0,y,.30,.80,.022,.025);
  for(const x of [-.24,0,.24]){b.put(S.gem,gold,x,y-.04,.319,.027,.032,.014);b.put(S.gem,gem,x,y-.04,.333,.014,.019,.006);}
 }
 // Crown prongs, sapphire setting, hand-carved scrolls on the plinth.
 b.put(S.box,gold,0,1.91,.19,.29,.045,.14);
 for(const [x,h]of [[-.13,.12],[0,.23],[.13,.12]]){
  line([[x*.7,1.93,.20],[x,1.95+h*.5,.21],[x,1.95+h,.21]],gold,.023);
  b.put(S.leaf,light,x,1.95+h,.21,.034,.036,.029);
 }
 b.put(S.gem,gold,0,2.02,.247,.075,.11,.028);b.put(S.gem,gem,0,2.02,.275,.045,.075,.018);
 b.put(S.gem,gold,0,.17,.39,.075,.085,.025);b.put(S.gem,gem,0,.17,.414,.044,.054,.014);
 for(const s of [-1,1]){line([[s*.07,.16,.402],[s*.18,.115,.402],[s*.30,.18,.402],[s*.37,.17,.402]],gold,.007);for(let i=0;i<3;i++)leaf(s*(.14+i*.06),.15+(i%2)*.03,.414,-s*.85,.033);}
 const scene=new T.Group(),mesh=b.mesh(.42,.28);scene.add(mesh);scene.name='limited-armory-rack-v45';
 scene.userData.artProfile='low-poly';scene.userData.triangles=mesh.geometry.attributes.position.count/3;
 Object.values(S).forEach(g=>g.dispose());cached={scene};return cached;
}

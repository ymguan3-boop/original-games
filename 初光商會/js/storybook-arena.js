import {ornament} from './storybook-cast.js?v=20261121-storybook';

// Recessed crest tiles and painted compass rays follow the existing shallow arena bowl.
export function dressStoryArena(T,root,level) {
  const kit=ornament(T,'星盤競技場的彩釉與黃銅鑲嵌');
  const palette={3:[0x2c7473,0xe7ab68],4:[0x31597b,0xf0c16f],5:[0x633c64,0xf2c674]}[level];
  const gold=palette[1], enamel=palette[0], ivory=0xffe7ae;
  const face=new T.Shape();
  face.moveTo(-.40,.12);face.quadraticCurveTo(-.36,-.17,0,-.28);
  face.quadraticCurveTo(.36,-.17,.40,.12);face.quadraticCurveTo(0,.21,-.40,.12);
  const geometry=(s,depth=.016)=>new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:5});
  for(let i=0;i<12;i++){
    const theta=(i+.5)*Math.PI/6, x=Math.sin(theta), z=Math.cos(theta);
    for(const [r,scale,tint] of [[2.69,1,gold],[2.711,.84,enamel]]){
      kit.put(geometry(face),tint,x*r,.52,z*r,scale,scale,1,0,theta);
    }
    kit.put(new T.OctahedronGeometry(.073),ivory,x*2.734,.50,z*2.734,.78,1.45,.33,0,theta);
  }
  // The compass sits completely inside the almost-flat centre, below the spinning tops.
  const compass = new T.Shape();
  compass.moveTo(0,0);compass.lineTo(-.069,.26);compass.lineTo(0,1);compass.lineTo(.069,.26);compass.closePath();
  for(let i=0;i<16;i++) {
    const a=i*Math.PI/8, length=i%4===0?.80:i%2===0?.56:.34;
    kit.put(geometry(compass,.002),i%4===0?enamel:gold,0,.356,0,1,length,1,-Math.PI/2,0,a);
  }
  kit.put(new T.CylinderGeometry(.14,.14,.013,16),gold,0,.364,0);
  kit.put(new T.CylinderGeometry(.095,.095,.015,12),enamel,0,.373,0);
  kit.finish(root);
}

function token(T,kind){
  const s=new T.Shape();
  if(kind==='leaf'){
    s.moveTo(0,-.85);s.quadraticCurveTo(-.75,-.27,-.34,.45);s.quadraticCurveTo(.22,.55,.4,.96);
    s.quadraticCurveTo(.75,.05,0,-.85);
  } else if(kind==='bolt'){
    s.moveTo(.42,1);s.lineTo(-.57,.03);s.lineTo(-.08,.04);s.lineTo(-.29,-.96);
    s.lineTo(.63,.20);s.lineTo(.18,.17);
  } else if(kind==='wave'){
    s.moveTo(-.75,-.57);s.bezierCurveTo(-.56,.1,-.10,.92,.63,.64);
    s.quadraticCurveTo(.14,.51,.26,.05);s.quadraticCurveTo(.47,-.18,.8,.08);
    s.quadraticCurveTo(.46,-.82,-.75,-.57);
  } else if(kind==='shield'){
    s.moveTo(0,.82);s.quadraticCurveTo(.30,.59,.65,.62);s.quadraticCurveTo(.72,-.27,0,-.88);
    s.quadraticCurveTo(-.72,-.27,-.65,.62);s.quadraticCurveTo(-.30,.59,0,.82);
  } else{
    const n=kind==='star'?4:6;
    for(let i=0;i<n*2;i++){
      const a=i*Math.PI/n, r=i%2?.39:.95;
      if(i===0) s.moveTo(Math.sin(a)*r,Math.cos(a)*r);
      else s.lineTo(Math.sin(a)*r,Math.cos(a)*r);
    }
  }
  s.closePath();
  return s;
}
export function dressStoryTop(T,root,t) {
  const types={flame:'bolt',wind:'wave',crystal:'snow',thunder:'bolt',shield:'shield',shadow:'star',
    frost:'snow',tide:'wave',thorn:'leaf',terra:'shield',sun:'star',nebula:'star'};
  const kit=ornament(T,'雕花輪盤'),s=token(T,types[t.id]), cream=0xffe2a3;
  for(let i=0;i<t.blades;i++){
    const a=i*Math.PI*2/t.blades, x=Math.sin(a)*.40,z=Math.cos(a)*.40;
    kit.put(new T.ExtrudeGeometry(s,{depth:.02,bevelEnabled:false,curveSegments:5}),
      cream,x,.611,z,.054,.067,.1,-Math.PI/2,0,a);
  }
  kit.finish(root);
}

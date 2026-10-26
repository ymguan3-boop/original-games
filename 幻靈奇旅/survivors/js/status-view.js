import {heroSupportStates} from './pet-ultimate-rules.js?v=20261026-v27';
import {activeStatuses} from './combat-status.js?v=20261025-v22';
const TYPES=['poison','burn','paralysis','freeze','slow','heal'];
/** Procedural THREE geometry only: no status image/texture requests. */
export async function createStatusView(T,scene,heightOf){
 const pool=new Map(),geometries=[];const own=g=>(geometries.push(g),g),sphere=own(new T.SphereGeometry(1,8,6)),crystal=own(new T.ConeGeometry(1,1,5)),torus=own(new T.TorusGeometry(1,.025,5,40)),box=own(new T.BoxGeometry(1,1,1));
 const flame=own(new T.LatheGeometry([new T.Vector2(0,0),new T.Vector2(.1,.06),new T.Vector2(.15,.22),new T.Vector2(.12,.4),new T.Vector2(.06,.57),new T.Vector2(0,.8)],12));
 const points=[];for(let i=0;i<7;i++)points.push(new T.Vector3((i%2?.08:-.08),i*.15,0));const lightning=own(new T.BufferGeometry().setFromPoints(points));
 function build(type){const root=new T.Group(),parts=[],materials=[];root.name='Status3D:'+type;scene.add(root);const color={poison:0x85ef4d,burn:0xff6429,paralysis:0xffdf45,freeze:0xa6f0ff,slow:0x64a8ee,heal:0x73ffc0,guard:0x83d6ff,barrier:0xffdc83,critical:0xffad63,knockback:0xffc17c}[type];
 const material=(c=color,opacity=.72)=>{const m=new T.MeshBasicMaterial({color:c,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false});materials.push(m);return m;};
 function mesh(g,m){const o=new T.Mesh(g,m);root.add(o);parts.push(o);return o;}
 const base=type==='burn'?new T.MeshStandardMaterial({color,emissive:0xff4210,emissiveIntensity:1.15,metalness:.65,roughness:.22,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}):material(color,type==='freeze'?.4:.6),accent=material(type==='poison'?0xb55bd5:type==='burn'?0xffd16b:color,.6);
 if(type==='burn'){materials.push(base);for(let i=0;i<5;i++){const o=mesh(flame,i%2?accent:base);o.scale.setScalar(.8);}mesh(torus,accent).rotation.x=-Math.PI/2;}
 if(type==='poison'){for(let i=0;i<8;i++){const o=mesh(sphere,i%3?base:accent);o.scale.setScalar(.045+(i%3)*.012);}mesh(torus,accent).rotation.x=-Math.PI/2;}
 if(type==='paralysis'){const lm=new T.LineBasicMaterial({color,transparent:true,opacity:.9,toneMapped:false});materials.push(lm);for(let i=0;i<5;i++){const o=new T.Line(lightning,lm);root.add(o);parts.push(o);}}
 if(type==='freeze'){for(let i=0;i<7;i++){const o=mesh(crystal,i%2?base:accent);o.scale.set(.13,.45+(i%3)*.08,.13);}mesh(torus,accent).rotation.x=-Math.PI/2;}
 if(type==='slow'){for(let i=0;i<3;i++){const o=mesh(torus,i%2?accent:base);o.rotation.x=-Math.PI/2;}for(let i=0;i<5;i++){const o=mesh(sphere,accent);o.scale.setScalar(.035);}}
 if(type==='heal'){for(let i=0;i<3;i++){const o=mesh(torus,base);o.rotation.x=-Math.PI/2;}for(let i=0;i<5;i++){const cross=new T.Group(),a=new T.Mesh(box,accent),b=new T.Mesh(box,accent);a.scale.set(.035,.15,.035);b.scale.set(.15,.035,.035);cross.add(a,b);root.add(cross);parts.push(cross);}}
 if(['guard','barrier'].includes(type)){const o=mesh(sphere,base);o.scale.set(.55,.55,.55);o.position.y=.53;for(let i=0;i<2;i++){const ring=mesh(torus,accent);ring.scale.setScalar(.58);ring.position.y=.53;ring.rotation.x=i?Math.PI/3:-Math.PI/3;}}
 if(type==='critical'){for(let i=0;i<3;i++){const o=mesh(torus,accent);o.scale.setScalar(.43+i*.07);o.rotation.x=-Math.PI/2;o.position.y=.05+i*.08;}}
 if(type==='knockback'){const o=mesh(torus,base);o.rotation.x=-Math.PI/2;}
 return{root,parts,materials,type};}
 function release(v){scene.remove(v.root);v.materials.forEach(m=>m.dispose());}
 function animate(v,t){const {type,parts}=v;for(let i=0;i<parts.length;i++){const o=parts[i],a=i*2.39996+t*(type==='slow'?-.35:.55),phase=(t*(type==='paralysis'?2.8:type==='slow'?.17:.55)+i*.21)%1;
 if(type==='burn'){if(i<5){o.position.set(Math.cos(a)*.46,.02,Math.sin(a)*.46);o.scale.set(.65+Math.sin(t*7+i)*.1,.95+Math.sin(t*9+i)*.18,.65);o.rotation.z=Math.sin(t*5+i)*.17;}else{o.position.y=.035;o.scale.setScalar(.57+Math.sin(t*6)*.025);}}
 if(type==='poison'){if(i<8){o.position.set(Math.cos(a)*.31,.1+phase*.75,Math.sin(a)*.31);o.scale.setScalar((.04+(i%3)*.012)*(.55+Math.sin(phase*Math.PI)*.7));}else{o.position.y=.035;o.scale.setScalar(.45+Math.sin(t*2)*.025);}}
 if(type==='paralysis'){o.position.set(Math.cos(a)*.28,.06,Math.sin(a)*.28);o.rotation.y=-a; o.scale.setScalar(.85+Math.sin(t*25+i)*.12);}
 if(type==='freeze'){if(i<7){o.position.set(Math.cos(a*.08)*.29,.15,Math.sin(a*.08)*.29);o.rotation.z=Math.cos(a)*.24;}else{o.scale.setScalar(.49);o.position.y=.035;}}
 if(type==='slow'){if(i<3){o.scale.setScalar(.38+i*.12);o.position.y=.04+i*.025;o.rotation.z=t*(i%2?-.32:.22);}else{o.position.set(Math.cos(a)*.46,.12+(i-3)*.07,Math.sin(a)*.46);}}
 if(type==='heal'){if(i<3){o.scale.setScalar(.32+phase*.18);o.position.y=.04+phase*.7;}else{o.position.set(Math.cos(a)*.32,.1+phase*.9,Math.sin(a)*.32);o.rotation.y=t*.5;}}
 if(type==='guard'||type==='barrier'){if(i>0){o.rotation.z=t*(i%2?-.5:.5);o.rotation.y=t*.3;}}
 if(type==='critical')o.rotation.z=t*(i%2?-.7:.7);
 if(type==='knockback'){o.scale.setScalar(.4+phase*.3);o.position.y=.04;}}
 for(const m of v.materials)m.opacity=((type==='guard'||type==='barrier')&&m===v.materials[0]?.12:type==='freeze'?.35:type==='paralysis'||type==='burn'?.8:.6)*(1+Math.sin(t*(type==='paralysis'?24:3))*.12);}
 function update(run,visible=()=>true){const seen=new Set(),counts={},details=[];if(run)for(const[id,a]of[['hero',run.hero],...run.pets.filter((p,i)=>i===run.activePet).map(p=>['pet',p]),...run.enemies.map(e=>[e.id,e])]){if(a.hp<=0||a.capturePending||!visible(a))continue;const states=activeStatuses(a,run.time).map(s=>s.type).filter(t=>TYPES.includes(t)||t==='knockback');if(a.healUntil>run.time||id==='hero'&&a.skillRegen?.until>run.time)states.push('heal');if(id==='hero')states.push(...heroSupportStates(a,run.time).filter(s=>s.type!=='regen').map(s=>s.type));const h=id==='hero'?2.35:heightOf(a.speciesId),size=Math.min(3.6,Math.max(1.7,h*1.25));for(const type of states){const key=id+':'+type;seen.add(key);let v=pool.get(key);if(!v){v=build(type);pool.set(key,v);}v.root.position.set(a.x,.05,a.z);v.root.scale.set(size,h,size);animate(v,run.time);counts[type]=(counts[type]||0)+1;details.push({actor:id,type,asset:null,renderer:'three-procedural',size,phase:run.time,parts:v.parts.length});}}
 for(const[key,v]of pool)if(!seen.has(key)){release(v);pool.delete(key);}return{counts,details,instances:pool.size,textures:[],renderer:'three-procedural'};}
 function clear(){for(const v of pool.values())release(v);pool.clear();}
 return{update,clear,dispose(){clear();geometries.forEach(g=>g.dispose());}};
}

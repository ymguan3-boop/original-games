/* Runtime-only original accessories. Tiny deterministic procedural texture; no network IO.
 * Keep parent outside animated actor visual bounds when its loader normalizes per frame. */
export const weatherOutfitKind=(weather,outdoors)=>outdoors?(weather==='rain'||weather==='typhoon'?'umbrella':weather==='snow'?'coat':null):null;
export const WEATHER_APPEARANCES=Object.freeze([
 {name:'酒紅與栗皮',umbrella:'#832e46',highlight:'#d997a6',leather:'#734432',fur:'#f2e6cc'},
 {name:'墨綠與苔皮',umbrella:'#235d4c',highlight:'#8ec3a9',leather:'#495849',fur:'#e9e3d5'},
 {name:'海軍藍與深棕',umbrella:'#273f6d',highlight:'#91addc',leather:'#4b3734',fur:'#bfc4c7'},
 {name:'焦糖與駝皮',umbrella:'#a46729',highlight:'#f0cf8e',leather:'#a2764f',fur:'#fff0d4'},
 {name:'紫梅與灰皮',umbrella:'#674575',highlight:'#c4a5d3',leather:'#65616c',fur:'#d7d5dc'}
]);
export function weatherAppearance(appearanceKey='weather-person'){
 const key=String(appearanceKey);let hash=2166136261;for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619);}const index=(hash>>>0)%WEATHER_APPEARANCES.length;return {index,...WEATHER_APPEARANCES[index]};
}
export function createWeatherOutfit(T,{parent,height=1.3,width=height*.44,appearanceKey}={}){
 const root=new T.Group();root.name='weather-outfit';root.userData.noOutline=true;root.visible=false;parent?.add(root);
 const rain=new T.Group(),snow=new T.Group();root.add(rain,snow);
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.85,...extra});m.color.convertSRGBToLinear();return m;};
 const appearance=weatherAppearance(appearanceKey??(parent?.name||'weather-person'));
 const grain=new Uint8Array(64*64*4);let seed=9173;for(let i=0;i<grain.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=135+(seed>>>25);grain[i]=grain[i+1]=grain[i+2]=value;grain[i+3]=255;}
 const texture=new T.DataTexture(grain,64,64,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(7,7);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
 const reflections=Array.from({length:6},(_,side)=>{const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const stripe=Math.exp(-(((x-12)/4)**2)-(((y-11)/13)**2)),v=Math.round(30+stripe*(side===3?40:225)),i=(y*32+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}return new T.DataTexture(pixels,32,32,T.RGBAFormat);});
 const reflection=new T.CubeTexture(reflections);reflection.generateMipmaps=false;reflection.minFilter=T.LinearFilter;reflection.needsUpdate=true;
 const fabric=new T.MeshPhysicalMaterial({color:appearance.umbrella,roughness:.23,metalness:0,clearcoat:.85,clearcoatRoughness:.15,side:T.DoubleSide});
 fabric.color.convertSRGBToLinear();
 fabric.envMap=reflection;fabric.envMapIntensity=.5;
 const cream=mat(0xf1d6a2),dark=mat(0x574738),wool=mat(appearance.leather,{roughness:.55,bumpMap:texture,bumpScale:height*.0005}),lining=mat(appearance.fur,{roughness:1,bumpMap:texture,bumpScale:height*.012});
 const materials=[fabric,cream,dark,wool,lining],geometries=new Set();
 const add=(p,g,m,x,y,z)=>{geometries.add(g);const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.userData.noOutline=true;p.add(mesh);return mesh;};
 const rod=(p,a,b,r,m)=>{const start=new T.Vector3(...a),v=new T.Vector3(...b).sub(start),mesh=add(p,new T.CylinderGeometry(r,r,v.length(),6),m,...start.addScaledVector(v,.5).toArray());mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return mesh;};
 const cx=-height*.145,cz=height*.19,r=Math.max(width*.8,height*.35),top=height*1.24,edge=height*1.08;
 const positions=[],indices=[];const rings=3,sectors=12;
 for(let j=0;j<=rings;j++)for(let i=0;i<=sectors;i++){const a=i/sectors*Math.PI*2,k=j/rings;positions.push(cx+Math.cos(a)*r*k,top-(top-edge)*k*k,cz+Math.sin(a)*r*k);}
 for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++){const a=j*(sectors+1)+i,b=a+sectors+1;if(j)indices.push(a,b,a+1);indices.push(a+1,b,b+1);}
 const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute(positions,3));canopy.setIndex(indices);canopy.computeVertexNormals();add(rain,canopy,fabric,0,0,0);
 rod(rain,[cx,height*.43,cz],[cx,top+.035*height,cz],height*.008,dark);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,b=i/6*Math.PI*2+Math.PI/3;rod(rain,[cx+Math.cos(a)*r,edge,cz+Math.sin(a)*r],[cx+Math.cos(b)*r,edge,cz+Math.sin(b)*r],height*.004,cream);rod(rain,[cx,top+.001,cz],[cx+Math.cos(a)*r,edge,cz+Math.sin(a)*r],height*.003,dark);}
 const hook=add(rain,new T.TorusGeometry(height*.035,height*.008,4,8,Math.PI),dark,cx+height*.035,height*.43,cz);hook.rotation.z=Math.PI;
 const body=add(snow,new T.CylinderGeometry(width*.36,width*.53,height*.37,12,1,true),wool,0,height*.405,0);body.scale.z=.85;body.material.side=T.DoubleSide;
 const sleeves=[];for(const side of [-1,1]){const sleeve=new T.Group();sleeve.position.set(side*width*.38,height*.57,0);snow.add(sleeve);sleeve.rotation.z=side*.14;add(sleeve,new T.CylinderGeometry(width*.13,width*.115,height*.22,8),wool,0,-height*.105,0);add(sleeve,new T.CylinderGeometry(width*.132,width*.132,height*.035,8),lining,0,-height*.21,0);sleeves.push(sleeve);}
 for(const side of [-1,1]){const lapel=add(snow,new T.SphereGeometry(1,8,6),lining,side*width*.13,height*.55,width*.3);lapel.scale.set(width*.11,height*.087,height*.035);lapel.rotation.z=-side*.28;}
 add(snow,new T.BoxGeometry(width*.025,height*.33,height*.012),dark,0,height*.405,width*.43);
 for(let i=0;i<3;i++)add(snow,new T.SphereGeometry(height*.012,6,4),cream,0,height*(.48-i*.075),width*.45);
 for(const side of [-1,1])add(snow,new T.BoxGeometry(width*.19,height*.08,height*.018),wool,side*width*.27,height*.33,width*.39);
 // Merge static pieces by material: 3 draw calls rain, 4 snow + 4 animated sleeves.
 for(const group of [rain,snow]){const buckets=new Map();group.updateMatrixWorld(true);for(const child of [...group.children]){if(!child.isMesh)continue;child.updateMatrix();const g=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);const bucket=buckets.get(child.material)||{position:[],normal:[],uv:[]};for(const attr of ['position','normal'])bucket[attr].push(...g.attributes[attr].array);bucket.uv.push(...(g.attributes.uv?.array||new Float32Array(g.attributes.position.count*2)));buckets.set(child.material,bucket);g.dispose();group.remove(child);}for(const [material,attrs]of buckets){const g=new T.BufferGeometry();for(const attr of ['position','normal','uv'])g.setAttribute(attr,new T.Float32BufferAttribute(attrs[attr],attr==='uv'?2:3));add(group,g,material,0,0,0);}}
 const triangles=group=>{let count=0;group.traverse(o=>{if(o.isMesh)count+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return count;};
 root.userData.appearance=appearance;
 root.userData.weatherBudget={umbrellaTriangles:triangles(rain),coatTriangles:triangles(snow),textureBytes:grain.byteLength+6*32*32*4,textureSize:[64,64],reflectionCubeSize:32,umbrellaDrawCalls:3,coatDrawCalls:8};
 let disposed=false;
 return {root,sleeves,appearance,update({weather,outdoors,position,rotation,scale,armAngles}={}){if(disposed)return null;const kind=weatherOutfitKind(weather,outdoors);root.visible=!!kind;rain.visible=kind==='umbrella';snow.visible=kind==='coat';root.userData.weatherKind=kind;if(position)root.position.copy(position);if(rotation)root.rotation.copy(rotation);if(scale)root.scale.copy(scale);if(armAngles)for(let i=0;i<2;i++)sleeves[i].rotation.x=armAngles[i]||0;return kind;},dispose(){if(disposed)return;disposed=true;root.parent?.remove(root);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();texture.dispose();reflection.dispose();for(const face of reflections)face.dispose();root.clear();}};
}
export function updateWeatherOutfit2D(element,{weather,outdoors,appearanceKey}={}){
 const key=String(appearanceKey??(element.dataset.actorId||element.id||'weather-person'));if(element.dataset.weatherAppearanceKey!==key){const palette=weatherAppearance(key);for(const name of ['umbrella','highlight','leather','fur'])element.style.setProperty('--weather-'+name,palette[name]);element.dataset.weatherAppearanceKey=key;element.dataset.weatherPalette=String(palette.index);}
 const kind=weatherOutfitKind(weather,outdoors);element.classList.toggle('weather-umbrella',kind==='umbrella');element.classList.toggle('weather-coat',kind==='coat');
 let layer=element.querySelector(':scope > .weather-wear');if(kind&&!layer){layer=element.ownerDocument.createElement('span');layer.className='weather-wear';layer.setAttribute('aria-hidden','true');layer.innerHTML='<i class="weather-canopy"></i><i class="weather-shaft"></i><i class="weather-overcoat"></i>';element.append(layer);}if(layer)layer.hidden=!kind;return kind;
}
export function disposeWeatherOutfit2D(element){element.querySelector(':scope > .weather-wear')?.remove();element.classList.remove('weather-umbrella','weather-coat');}

/* Only the yard sparring pair opts into this controller. Source materials are never mutated. */
export function surfaceSnowPatches(T,target,parent,seeds){
 parent.updateWorldMatrix(true,true);const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0).transformDirection(parent.matrixWorld);
 return seeds.flatMap(p=>{const origin=parent.localToWorld(new T.Vector3(p.x,3,p.z));ray.set(origin,down);const hit=ray.intersectObject(target,true).find(h=>!h.object.userData.illustratedOutline&&!h.object.userData.isHull);if(!hit)return [];const local=parent.worldToLocal(hit.point.clone());return [{...p,y:local.y+.008}];});
}
export function createWeatherExposure(T,{target,snowParent=target,snowPatches=[]}={}){
 const originals=new Map(),wetMaterials=new Map(),reverse=new Map(),patches=new T.Group();patches.name='yard-sparring-snow';patches.userData.noOutline=true;snowParent.add(patches);
 const snowMaterial=new T.MeshStandardMaterial({color:0xf5f7fb,roughness:1}),snowGeometry=new T.SphereGeometry(1,8,4);
 for(const p of snowPatches){const mesh=new T.Mesh(snowGeometry,snowMaterial);mesh.position.set(p.x,p.y,p.z);mesh.scale.set(p.rx||.1,p.ry||.018,p.rz||.08);mesh.userData.noOutline=true;patches.add(mesh);}patches.visible=false;
 const eligible=o=>o.isMesh&&!o.userData.isHull&&!o.userData.illustratedOutline&&!o.userData.noLine&&o!==patches&&!patches.children.includes(o)&&!o.material?.transparent;
 const wetFor=source=>{if(wetMaterials.has(source))return wetMaterials.get(source);const m=new T.MeshPhysicalMaterial({color:source.color?.clone().multiplyScalar(.72)||0x777777,map:source.map||null,normalMap:source.normalMap||null,roughness:.19,metalness:0,clearcoat:.9,clearcoatRoughness:.12,side:source.side,skinning:source.skinning,morphTargets:source.morphTargets});if(source.emissive){m.emissive.copy(source.emissive);m.emissiveIntensity=source.emissiveIntensity;}wetMaterials.set(source,m);reverse.set(m,source);return m;};
 let disposed=false;
 return {snow:patches,update(weather,outdoors=true){if(disposed)return;const wet=outdoors&&(weather==='rain'||weather==='typhoon');patches.visible=outdoors&&weather==='snow';target.traverse(o=>{if(!eligible(o))return;const current=o.material,source=Array.isArray(current)?current.map(m=>reverse.get(m)||m):reverse.get(current)||current;originals.set(o,source);o.material=wet?(Array.isArray(source)?source.map(wetFor):wetFor(source)):source;if(wet){const a=Array.isArray(source)?source:[source],b=Array.isArray(o.material)?o.material:[o.material];a.forEach((m,i)=>{if(m.emissive)b[i].emissive.copy(m.emissive);});}});target.userData.weatherExposure=wet?'wet':patches.visible?'snow':'dry';},dispose(){if(disposed)return;disposed=true;for(const [o,material]of originals)o.material=material;patches.parent?.remove(patches);snowGeometry.dispose();snowMaterial.dispose();for(const m of wetMaterials.values())m.dispose();wetMaterials.clear();originals.clear();}};
}

import {shelfTypes,shelfKind,shelfModel} from './furniture.js?v=20261112-v31h';
import {decorDefinition,decorModel} from './decorations.js?v=20261112-v31h';
import {addIllustratedOutline} from './illustrated-outline.js?v=20261112-v31h';
import {createSphericalOrbRuntime} from './orb-spherical-runtime-v2.js?v=20261112-v31h';
import {hasRackModel,rackModel} from './rack-models.js?v=20261112-v31h';
export function createShelfView({T,assets,level=1,sh,label,box,onReady,onError}){
 if(sh.decoration){const root=new T.Group(),products=new T.Group(),definition=decorDefinition(sh),hit=box(definition.span||.92,definition.height,definition.span||.86,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,definition.height/2,0,root);hit.userData.ownedMaterial=true;hit.userData.pick={type:'shelf',id:sh.id};const view={root,products,kind:'decor:'+sh.type+(sh.type==='carpet'?':'+level:''),hit,tints:[],alive:true};assets.load(decorModel(sh.type,level)).then(g=>{if(!view.alive)return;const model=assets.clone(g.scene);root.add(model);if(!definition.ground){root.updateMatrixWorld(true);model.position.y+=.042-new T.Box3().setFromObject(model).min.y;}view.contour=addIllustratedOutline(T,model,{thickness:definition.ground?.002:.012});model.traverse(n=>{if(n.isMesh&&!n.userData.illustratedOutline)for(const material of Array.isArray(n.material)?n.material:[n.material])view.tints.push({material,color:material.color.clone(),emissive:material.emissive?.clone()});});onReady?.(view);}).catch(onError);return view;}
 const root=new T.Group(),products=new T.Group(),kind=shelfKind(sh),definition=shelfTypes.find(t=>t.id===kind);root.add(products);
 if(kind==='orbs'){
  const hit=box(.98,1.56,.98,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,.78,0,root);hit.userData.ownedMaterial=true;hit.userData.pick={type:'shelf',id:sh.id};
  const view={root,products,kind,hit,sku:null,tints:[],contour:null,alive:true};
  assets.load(shelfModel(kind)).then(g=>{if(!view.alive)return;const model=assets.clone(g.scene);const name=label(definition.name,0,1.435,-.181,.42,model);name.userData.noOutline=true;const runtime=createSphericalOrbRuntime(T,model);runtime.root.position.y+=.042;runtime.content.add(products);root.add(runtime.root);view.name=name;view.contour=runtime.contour;view.modelPath=shelfModel(kind);view.runtimeScale=.965;view.groundOffset=runtime.root.position.y;model.traverse(n=>{if(!n.isMesh||n.userData.illustratedOutline||n===name)return;for(const m of Array.isArray(n.material)?n.material:[n.material])view.tints.push({material:m,color:m.color.clone(),emissive:m.emissive?.clone()});});onReady?.(view);}).catch(onError);
  return view;
 }
 const plaque=new T.Group();root.add(plaque);const top=definition.top;
 const frameMaterial=new T.MeshStandardMaterial({color:0x76502e,roughness:.8});frameMaterial.color.convertSRGBToLinear();
 // The top plaque is physically mounted to the cornice, with brackets reaching the rack.
 box(.91,.19,.075,frameMaterial,0,top,.365,plaque).userData.ownedMaterial=true;
 for(const x of [-.39,.39])box(.045,.10,.52,frameMaterial,x,top-.075,.10,plaque);
 const name=label(definition.name,0,top,.408,.84,plaque),hit=box(1,top+.35,.82,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,(top+.35)/2,0,root);hit.userData.ownedMaterial=true;hit.userData.pick={type:'shelf',id:sh.id};
 const view={root,products,kind,name,hit,sku:null,tints:[],contour:null,alive:true};
 (hasRackModel(kind)?Promise.resolve(rackModel(T,kind)):assets.load(shelfModel(kind))).then(g=>{if(!view.alive)return;const object=assets.clone(g.scene);object.add(plaque);root.add(object);root.updateMatrixWorld(true);const offset=.042-new T.Box3().setFromObject(object).min.y;object.position.y+=offset;products.position.y=offset;view.groundOffset=offset;view.contour=addIllustratedOutline(T,object,{thickness:.012});object.traverse(n=>{if(!n.isMesh||n.userData.illustratedOutline||n===name)return;for(const m of Array.isArray(n.material)?n.material:[n.material])view.tints.push({material:m,color:m.color.clone(),emissive:m.emissive?.clone()});});onReady?.(view);}).catch(onError);
 return view;
}
export function tintShelf(view,selected){for(const {material,color,emissive}of view.tints){material.color.copy(color);if(emissive)material.emissive.copy(emissive);if(selected){material.color.lerp(new globalThis.THREE.Color(0xffc13b).convertSRGBToLinear(),.65);if(material.emissive){material.emissive.setHex(0x402606);material.emissiveIntensity=.3;}}}}

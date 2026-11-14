import{addRackInk}from'./rack-ink.js?v=20261114-v57r3';
import {fitFurniture} from './furniture-footprint.js?v=20261114-v57r3';
import {createTierModel,createOrbTrim} from './tier-models.js?v=20261114-v57r3';
import {addRackPlaque} from './rack-plaque.js?v=20261114-v57r3';
import {shelfKind,shelfDefinition,shelfModel} from './furniture.js?v=20261114-v57r3';
import {decorDefinition} from './decorations.js?v=20261114-v57r3';
import {addIllustratedOutline} from './illustrated-outline.js?v=20261114-v57r3';
import {createSphericalOrbRuntime} from './orb-spherical-runtime-v2.js?v=20261114-v57r3';
export function createShelfView({T,assets,level=1,sh,box,onReady,onError}){
 const tier=sh.tier||level,decoration=!!sh.decoration,type=decoration?sh.type:shelfKind(sh),definition=decoration?decorDefinition({...sh,tier}):shelfDefinition({...sh,tier}),kind=(decoration?'decor:':'')+type+':lv'+tier,root=new T.Group(),products=new T.Group();root.add(products);
 const h=definition.height||definition.top+.25,hit=box(definition.footprintWidth||.98,h,decoration&&definition.wall?.16:.98,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,h/2,0,root);hit.userData.ownedMaterial=true;hit.userData.pick={type:'shelf',id:sh.id};const view={root,products,kind,hit,sku:null,tints:[],alive:true};
 const promise=type==='orbs'&&!decoration?assets.load(shelfModel(type)):Promise.resolve(createTierModel(T,{type,tier,decoration}));
 promise.then(g=>{if(!view.alive)return;const model=assets.clone(g.scene);model.traverse(o=>{if(o.material){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.userData.ownedMaterial=true;}});if(type==='orbs'&&!decoration){model.add(createOrbTrim(T,tier));view.name=addRackPlaque(T,model,definition);const runtime=createSphericalOrbRuntime(T,model);runtime.root.position.y+=.042;runtime.content.add(products);root.add(runtime.root);view.contour=runtime.contour;view.runtimeScale=.965;}
 else{fitFurniture(T,model,definition);if(!decoration)view.name=addRackPlaque(T,model,definition);root.add(model);products.position.y=.042;view.contour=decoration?addIllustratedOutline(T,model,{thickness:definition.ground?.001333:.002667,color:0x16120e}):addRackInk(T,model);}
 model.traverse(n=>{if(!n.isMesh||n.userData.illustratedOutline||n===view.name)return;for(const m of Array.isArray(n.material)?n.material:[n.material])if(m?.color)view.tints.push({material:m,color:m.color.clone(),emissive:m.emissive?.clone()});});onReady?.(view);
 }).catch(onError);return view;
}
export function tintShelf(view,selected){for(const {material,color,emissive}of view.tints){material.color.copy(color);if(emissive)material.emissive.copy(emissive);if(selected){material.color.lerp(new globalThis.THREE.Color(0xffc13b).convertSRGBToLinear(),.65);if(material.emissive){material.emissive.setHex(0x402606);material.emissiveIntensity=.3;}}}}

import {addIllustratedOutline} from './illustrated-outline.js?v=20261114-v46';
import {addProductEdges} from './product-outlines.js?v=20261114-v46';
import {hasProcedural,productModel} from './product-models.js?v=20261114-v46';
export const loadProduct=(T,assets,sku)=>hasProcedural(sku)?Promise.resolve(productModel(T,sku)):assets.load(productPath(sku));
export function stockCount(available,capacity=30){return Math.max(0,Math.min(capacity,Math.floor(available||0)));}
/* 武器架：每排 6 把直立靠在掛桿上，三排掛滿後第二層疊在前方，共 36 格 */
const weaponSlot=index=>{const n=index%18,layer=Math.floor(index/18);return{x:(n%6-2.5)*.145,y:.18+Math.floor(n/6)*.42,z:-.08+layer*.13,tilt:-.14};};
export function productSlot(index,capacity=30,definition={}){if(definition.productLayout==='material-tray')return {x:(definition.materialSide==='wood'?.48:-.48)+(index%3-1)*.225,y:.25+Math.floor(index/9)*.12,z:(Math.floor(index%9/3)-1)*.18};if(definition.id==='limited-armory')return {x:(index%6-2.5)*.125,y:.31+Math.floor(index/12)*(1.22/Math.max(1,Math.ceil(capacity/12)-1)),z:-.08+Math.floor(index%12/6)*.20,tilt:-.14};if(definition.productLayout==='weapon-rack')return weaponSlot(index);if(definition.productLayout==='orb-v3')return {x:(index%5-2)*.12,y:.43+Math.floor(index/10)*(.65/Math.max(1,Math.ceil(capacity/10)-1)),z:(Math.floor(index%10/5)-.5)*.20};const cols=definition.columns||(capacity===36?6:5),depth=definition.depth||2,layer=cols*depth;return {x:(index%cols-(cols-1)/2)*(.70/cols),y:.23+Math.floor(index/layer)*(definition.spacing||.51),z:(Math.floor(index%layer/cols)-(depth-1)/2)*(depth===3?.22:.30)};}
export function productPath(sku){
 if(hasProcedural(sku))return 'procedural:'+sku;
 if(sku==='potion')return '@shop/assets/art-v9/potion-craft-v5/potion-craft-v5.glb';
 if(sku==='ball-basic')return 'models/props/core.glb';
 if(sku==='ball-great')return 'models/props/great_core.glb';
 if(sku==='ball-ultra')return 'models/props/master_core.glb';
 if(/sword|knife|blade|weapon|guns/.test(sku))return 'models/tower/kid-'+(/knife/.test(sku)?'knife':/blade/.test(sku)?'blade':/guns/.test(sku)?'gun':'sword')+'.glb';
 return /berry/.test(sku)?'models/props/berry.glb':/shop-|stone/.test(sku)?'models/props/evolution-stone.glb':'models/props/potion.glb';
}
// Shared source models, one instance per unit. The display count is exact, not a fullness bucket.
export function buildProducts(T,assets,gltf,capacity=30,definition={}){
 const group=new T.Group(),unit=assets.clone(gltf.scene);assets.normalize(unit,definition.productMaxSize||(capacity>=36?.10:.13),true);unit.updateMatrixWorld(true);if(definition.productLayout==='weapon-rack'){const size=new T.Box3().setFromObject(unit).getSize(new T.Vector3());if(size.z>size.y)unit.rotation.x=-Math.PI/2;unit.updateMatrixWorld(true);unit.position.y-=new T.Box3().setFromObject(unit).min.y;unit.updateMatrixWorld(true);}
 const center=new T.Box3().setFromObject(unit).getCenter(new T.Vector3());unit.position.x-=center.x;unit.position.z-=center.z;unit.updateMatrixWorld(true);
 unit.traverse(o=>{if(!o.isMesh)return;const batch=new T.InstancedMesh(o.geometry.clone(),o.material,capacity);batch.userData.ownedGeometry=true;batch.frustumCulled=false;batch.castShadow=true;for(let i=0;i<capacity;i++){const p=productSlot(i,capacity,definition),matrix=new T.Matrix4().makeTranslation(p.x,p.y,p.z);if(p.tilt)matrix.multiply(new T.Matrix4().makeRotationX(p.tilt));matrix.multiply(o.matrixWorld);batch.setMatrixAt(i,matrix);}batch.count=0;group.add(batch);});
 const contour=addIllustratedOutline(T,group,{thickness:.0015,color:0x573b29}),edges=addProductEdges(T,group);group.userData.release=()=>{edges.dispose();contour.dispose();};
 return group;
}
export function setProductCount(group,count){for(const batch of group.children){batch.count=count;batch.traverse(o=>{if(o.userData.instancedProductEdges)o.geometry.instanceCount=count;});}}

import {addIllustratedOutline} from './illustrated-outline.js?v=20261110-shop-r2';

// Shared safe derivative used by the approved local game integration and reviews.
export function createSphericalOrbRuntime(T,source){
 const root=new T.Group(),content=new T.Group();root.name='Spherical orb runtime v2 (0.965 + outline)';root.scale.setScalar(.965);root.add(content);content.add(source);
 const contour=addIllustratedOutline(T,source,{thickness:.012});
 root.updateMatrixWorld(true);
 const initial=new T.Box3().setFromObject(root);root.position.y=.012-initial.min.y;
 return {root,content,contour,metrics(){
  root.updateMatrixWorld(true);const geometry=new T.Box3().setFromObject(root),conservative=geometry.clone().expandByScalar(.012),size=conservative.getSize(new T.Vector3());
  const sides={minX:conservative.min.x,maxX:conservative.max.x,minZ:conservative.min.z,maxZ:conservative.max.z};
  return {sourceUnmodified:true,scale:.965,outlineThicknessWorld:.012,outlineMeshes:contour.count,geometryBounds:{min:geometry.min.toArray(),max:geometry.max.toArray()},conservativeExtrudedBounds:{min:conservative.min.toArray(),max:conservative.max.toArray(),size:size.toArray()},sides,perSideWithinCell:Object.values(sides).every(n=>Math.abs(n)<.5),adjacentGap:{x:1-size.x,z:1-size.z}};
 },dispose(){contour.dispose();}};
}

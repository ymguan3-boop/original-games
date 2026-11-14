import {wallItemWidth} from './architecture-reservations.js?v=20261114-v57';
export function fitFurniture(T,model,def={}){
 model.updateMatrixWorld(true);let b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3());const target=def.ground?{x:2.7,z:1.9}:def.wall?{x:wallItemWidth(def.id),z:.13}:{x:def.footprintWidth?def.footprintWidth-.06:.94,z:.94};
 if(size.x>0)model.scale.x*=def.ground?target.x/size.x:Math.min(1,target.x/size.x);if(size.z>0)model.scale.z*=def.ground?target.z/size.z:Math.min(1,target.z/size.z);
 model.updateMatrixWorld(true);b=new T.Box3().setFromObject(model);const center=b.getCenter(new T.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y+=.042-b.min.y;model.updateMatrixWorld(true);model.userData.placementFootprint={width:def.ground?2.7:def.wall?target.x:(def.footprintWidth||1),depth:def.ground?1.9:def.wall?.13:1};return model;
}

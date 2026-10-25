// The AI and renderer share the same camera-relative safe area.
export function createViewLimits(T){
 const camera=new T.PerspectiveCamera(45,1,.1,150),v=new T.Vector3();let key='';
 function prepare(hero,aspect,zoom){const k=[hero.x,hero.z,aspect,zoom].join(':');if(k===key)return;key=k;camera.aspect=aspect;camera.updateProjectionMatrix();const d=(aspect<.8?19:18)*zoom;camera.position.set(hero.x,d,hero.z+d*.78);camera.lookAt(hero.x,0,hero.z-1.2);camera.updateMatrixWorld(true);}
 function contains(p,height=2){const width=height*.25;for(const x of [-width,width])for(const y of [.05,height]){v.set(p.x+x,y,p.z).project(camera);if(v.z< -1||v.z>1||Math.abs(v.x)>.86||v.y< -.8||v.y>.8)return false;}return true;}
 function visible(p,height=1){v.set(p.x,height*.5,p.z).project(camera);return v.z>=-1&&v.z<=1&&Math.abs(v.x)<1.2&&Math.abs(v.y)<1.2;}
 function clamp(p,hero,height=2){if(contains(p,height))return{x:p.x,z:p.z};let lo=0,hi=1;const at={x:hero.x,z:hero.z};for(let i=0;i<12;i++){const mid=(lo+hi)/2;at.x=hero.x+(p.x-hero.x)*mid;at.z=hero.z+(p.z-hero.z)*mid;if(contains(at,height))lo=mid;else hi=mid;}return{x:hero.x+(p.x-hero.x)*lo,z:hero.z+(p.z-hero.z)*lo};}
 return{prepare,contains,visible,clamp};
}

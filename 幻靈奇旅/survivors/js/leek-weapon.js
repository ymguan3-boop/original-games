// Built once in the sword's existing local +Z blade direction, with the grip at zero.
// Drop clones share all geometry/materials with this mounted template.
export function createLeekSword(T){
 const root=new T.Group();root.name='cave-leek-sword';root.userData.appearance='leek';
 const material=color=>new T.MeshStandardMaterial({color,metalness:.32,roughness:.28});
 const white=material(0xf2f4d8),pale=material(0xb8dc7d),green=material(0x29923f),dark=material(0x116b37),gold=material(0xcbb46f);
 function part(geo,mat,x,y,z){const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);root.add(mesh);return mesh;}
 const stalk=new T.CylinderGeometry(.085,.105,.88,16,1);part(stalk,white,0,0,.16).rotation.x=Math.PI/2;
 const neck=new T.CylinderGeometry(.078,.085,.42,16,1);part(neck,pale,0,0,.78).rotation.x=Math.PI/2;
 part(new T.SphereGeometry(1,16,10),white,0,0,-.26).scale.set(.108,.1,.14);
 const leaf=new T.Shape();leaf.moveTo(0,0);leaf.quadraticCurveTo(-.17,.22,-.12,.68);leaf.quadraticCurveTo(-.08,1,.055,1.13);leaf.quadraticCurveTo(.15,.66,.1,.23);leaf.quadraticCurveTo(.09,.05,0,0);
 const blade=new T.ExtrudeGeometry(leaf,{depth:.028,bevelEnabled:true,bevelThickness:.014,bevelSize:.014,bevelSegments:2,curveSegments:5,steps:1});
 for(let i=0;i<3;i++){const mesh=part(blade,i===1?dark:green,(i-1)*.055,0,.73);mesh.rotation.set(Math.PI/2,0,(i-1)*.16);mesh.scale.set(1,i===1?1.07:.94,1);}
 const rootGeo=new T.CylinderGeometry(.009,.005,.15,5,1);
 for(let i=0;i<3;i++){const mesh=part(rootGeo,gold,(i-1)*.035,0,-.42);mesh.rotation.x=Math.PI/2;mesh.rotation.z=(i-1)*.2;}
 let triangles=0,meshes=0;root.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 root.userData.weaponBudget={meshes,triangles,textures:0,profile:'low-poly-runtime'};
 return root;
}

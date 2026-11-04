// An inverted hull follows each real mesh, including skeletal deformation.
// Geometry is shared, so the effect introduces no duplicate geometry buffers.
const activeRefs=new Set();
function reserveRef(){for(let i=1;i<255;i++)if(!activeRefs.has(i)){activeRefs.add(i);return i;}throw Error('輪廓群組超出上限');}
export function addIllustratedOutline(T,root,{color=0x503822,thickness=.016,perMesh=false}={}){
 const meshes=[];root.traverse(o=>{if(o.isMesh&&!o.userData.illustratedOutline&&!o.userData.noOutline)meshes.push(o)});
 // Stencil masks all original surfaces before the hull pass. Fine surface
 // details do not acquire noisy internal rings: only the outer silhouette shows.
 const material=new T.MeshBasicMaterial({color,side:T.BackSide,depthWrite:true,stencilWrite:true,stencilWriteMask:0,stencilRef:1,stencilFunc:T.NotEqualStencilFunc});
 // This bundled Three.js requires explicit flags for skinned/morphed hulls.
 material.skinning=true;material.morphTargets=true;material.morphNormals=true;
 material.color.convertSRGBToLinear();
 material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvec3 contourScale=vec3(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz),length(modelMatrix[2].xyz));\n#ifdef USE_INSTANCING\ncontourScale*=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));\n#endif\ntransformed += normalize(normal) * ${Number(thickness).toFixed(6)} / max(vec3(0.0001),contourScale);`)};
 material.customProgramCacheKey=()=>`storybook-outline-${thickness}`;
 const outlines=[],restores=[],materials=new Set(),refs=new Set(),sharedRef=perMesh?null:reserveRef();if(sharedRef)refs.add(sharedRef);
 for(const mesh of meshes){
  if((Array.isArray(mesh.material)?mesh.material:[mesh.material]).some(m=>m?.name==='outline'||m?.transparent))continue;
  const ref=sharedRef||reserveRef();refs.add(ref);const hull=material.clone();hull.onBeforeCompile=material.onBeforeCompile;hull.customProgramCacheKey=material.customProgramCacheKey;hull.stencilRef=ref;materials.add(hull);
  const original=mesh.material,mask=m=>{const c=m.clone();c.stencilWrite=true;c.stencilRef=ref;c.stencilFunc=T.AlwaysStencilFunc;c.stencilZPass=T.ReplaceStencilOp;materials.add(c);return c;};mesh.material=Array.isArray(original)?original.map(mask):mask(original);restores.push({mesh,original});
  const o=mesh.isInstancedMesh?new T.InstancedMesh(mesh.geometry,hull,mesh.count):mesh.isSkinnedMesh?new T.SkinnedMesh(mesh.geometry,hull):new T.Mesh(mesh.geometry,hull);if(mesh.isInstancedMesh){o.instanceMatrix=mesh.instanceMatrix;o.count=mesh.count;}
  o.userData.illustratedOutline=true;o.name='Storybook outer contour';o.position.copy(mesh.position);o.quaternion.copy(mesh.quaternion);o.scale.copy(mesh.scale);o.frustumCulled=false;o.visible=mesh.visible;
  if(mesh.isSkinnedMesh){o.bind(mesh.skeleton,mesh.bindMatrix);o.bindMode=mesh.bindMode;}
  o.renderOrder=10;mesh.parent.add(o);outlines.push({mesh,o});
 }
 return {sync(){for(const {mesh,o}of outlines){o.position.copy(mesh.position);o.quaternion.copy(mesh.quaternion);o.scale.copy(mesh.scale);o.visible=mesh.visible;if(mesh.isInstancedMesh)o.count=mesh.count;if(mesh.morphTargetInfluences)o.morphTargetInfluences=[...mesh.morphTargetInfluences];}},dispose(){for(const {o}of outlines)o.parent?.remove(o);for(const {mesh,original}of restores)mesh.material=original;for(const m of materials)m.dispose();for(const ref of refs)activeRefs.delete(ref);material.dispose();},count:outlines.length};
}

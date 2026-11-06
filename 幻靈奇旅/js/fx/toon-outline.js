/* 螢幕固定寬度的輪廓線：把模型外擴一圈背面。寬度算在螢幕空間，模型大小、縮放動畫都不影響線條粗細。
   藏在 0.0001 倍縮放的表情零件不外擴，顯示時才有線。淡出中的特效，線條跟著本體一起淡出。 */
(function(root){'use strict';
const VERT=`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
uniform float uWidth,uRest;
void main(){
#include <beginnormal_vertex>
#include <morphnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
#include <skinning_vertex>
#include <project_vertex>
if(length(modelMatrix[0].xyz)<uRest*.05){gl_Position=vec4(2.,2.,2.,1.);return;}
vec2 d=(projectionMatrix*vec4(normalize(normalMatrix*objectNormal),0.)).xy;float l=length(d);
if(l>1e-4)gl_Position.xy+=d/l*uWidth*gl_Position.w*vec2(projectionMatrix[0][0]/projectionMatrix[1][1],1.);
}`;
const FRAG=`uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor,uOpacity);}`;
const INK=0x2b1a12,WIDTH=.0052,HIDDEN=.02,MIN_SIZE=.07;
const flat=new Set(['PlaneGeometry','PlaneBufferGeometry','RingGeometry','RingBufferGeometry','CircleGeometry','CircleBufferGeometry','ShapeGeometry']);
const materials=new Map();
function material(T,skinned,morph,color=INK){const key=(skinned?'s':'')+(morph?'m':'')+color;if(!materials.has(key))materials.set(key,new T.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,side:T.BackSide,transparent:true,depthWrite:true,fog:false,toneMapped:false,skinning:skinned,morphTargets:morph,morphNormals:morph,uniforms:{uWidth:{value:WIDTH},uRest:{value:0},uColor:{value:new T.Color(color)},uOpacity:{value:1}}}));return materials.get(key);}
function restScale(o){let k=1;for(;o;o=o.parent){const s=(Math.abs(o.scale.x)+Math.abs(o.scale.y)+Math.abs(o.scale.z))/3;if(s>=HIDDEN)k*=s;}return k;}
/* 寫成子類別：模型被 clone 時描邊仍會跟著本體的透明度與縮放 */
const classes=new Map();
function hullClass(T,skinned){if(!classes.has(skinned)){const Base=skinned?T.SkinnedMesh:T.Mesh;classes.set(skinned,class extends Base{onBeforeRender(r,s,c,g,m){const owner=this.parent,base=Array.isArray(owner?.material)?owner.material[0]:owner?.material,u=m.uniforms;u.uOpacity.value=base?.opacity??1;u.uRest.value=this.userData.rest||0;u.uWidth.value=this.userData.width||WIDTH;m.uniformsNeedUpdate=true;}});}return classes.get(skinned);}
function hullFor(T,mesh,width,color){const skinned=!!mesh.isSkinnedMesh,morph=!!mesh.morphTargetInfluences,Hull=hullClass(T,skinned),hull=new Hull(mesh.geometry,material(T,skinned,morph,color));if(skinned)hull.bind(mesh.skeleton,mesh.bindMatrix);if(morph){hull.morphTargetInfluences=mesh.morphTargetInfluences;hull.morphTargetDictionary=mesh.morphTargetDictionary;}hull.name='toon-outline';hull.userData.isOutline=true;hull.castShadow=hull.receiveShadow=false;hull.frustumCulled=mesh.frustumCulled;hull.renderOrder=mesh.renderOrder;hull.raycast=()=>{};hull.userData.rest=restScale(mesh);hull.userData.width=width;mesh.add(hull);mesh.userData.toonOutlined=true;return hull;}
function eligible(m){if(!m.isMesh||m.isInstancedMesh||m.userData.isOutline||m.userData.toonOutlined||m.userData.noOutline)return false;const mat=Array.isArray(m.material)?m.material[0]:m.material,g=m.geometry;if(!mat||!g?.attributes?.normal||mat.isShaderMaterial||flat.has(g.type))return false;if(!g.boundingSphere)g.computeBoundingSphere();if(g.boundingSphere.radius*restScale(m)<MIN_SIZE)return false;return !(mat.transparent&&mat.opacity<.12);}
/* 掃過整棵樹，已描過的不重做；回傳新增數，可重複呼叫。 */
function add(T,root,{width=WIDTH,color=INK,skipRoots=[]}={}){let n=0;const walk=o=>{if(skipRoots.includes(o)||o.userData.isOutline)return;if(eligible(o)){hullFor(T,o,width,color);n++;}const kids=o.children;for(let i=0;i<kids.length;i++)walk(kids[i]);};walk(root);return n;}
root.ToonOutline={add,WIDTH,INK};
})(typeof globalThis!=='undefined'?globalThis:this);

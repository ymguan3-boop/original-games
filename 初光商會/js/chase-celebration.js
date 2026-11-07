export function createChaseCelebration(T,scene){
 const group=new T.Group(),geometry=new T.OctahedronGeometry(.055,0),material=new T.MeshBasicMaterial({color:0xffd85e,transparent:true,depthWrite:false});
 for(let i=0;i<14;i++){const particle=new T.Mesh(geometry,material);group.add(particle);}
 group.visible=false;scene.add(group);
 return {update(pose,position){group.visible=pose.active&&!!position;if(!group.visible)return;group.position.copy(position);group.children.forEach((p,i)=>{const angle=i*Math.PI*2/14+pose.progress*2,r=.3+pose.progress*.9;p.position.set(Math.cos(angle)*r,.3+Math.sin(pose.progress*Math.PI)*1.4+(i%3)*.12,Math.sin(angle)*r);p.rotation.set(angle,angle*2,angle);});material.opacity=1-pose.progress;},dispose(){scene.remove(group);geometry.dispose();material.dispose();}};
}
export function showChaseSuccess(info={},document=globalThis.document){
 let node=document.getElementById('chase-success-banner');if(!node){node=document.createElement('aside');node.id='chase-success-banner';node.className='chase-success-banner';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.innerHTML='<strong>✦ 追客成功！ ✦</strong><small>主管成功留住顧客，危機解除了！</small>';document.body.append(node);}
 node.querySelector('small').textContent=info.reason||'主管已追上顧客，完成顧客服務。';node.hidden=false;clearTimeout(node.hideTimer);node.hideTimer=setTimeout(()=>{node.hidden=true;},4200);
}

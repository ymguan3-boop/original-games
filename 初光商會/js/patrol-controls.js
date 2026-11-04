// Same left-thumb joystick interaction used by the original game's normal scene.
export function installPatrolControls({joystick,stick,scene}){
 let pointerId=null;
 const reset=()=>{pointerId=null;stick.style.transform='translate(0px,0px)';scene.setJoystick(0,0);};
 const move=e=>{if(e.pointerId!==pointerId)return;const r=joystick.getBoundingClientRect(),radius=r.width*.33,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=Math.min(1,radius/Math.max(1,len));stick.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;scene.setJoystick(len<radius*.18?0:dx*scale/radius,len<radius*.18?0:dy*scale/radius);};
 const down=e=>{if(pointerId!==null)return;e.preventDefault();pointerId=e.pointerId;joystick.setPointerCapture(e.pointerId);move(e);};
 const up=e=>{if(e.pointerId===pointerId)reset();};
 joystick.addEventListener('pointerdown',down);joystick.addEventListener('pointermove',move);joystick.addEventListener('pointerup',up);joystick.addEventListener('pointercancel',up);joystick.addEventListener('lostpointercapture',up);window.addEventListener('blur',reset);
 return {reset,dispose(){joystick.removeEventListener('pointerdown',down);joystick.removeEventListener('pointermove',move);joystick.removeEventListener('pointerup',up);joystick.removeEventListener('pointercancel',up);joystick.removeEventListener('lostpointercapture',up);window.removeEventListener('blur',reset);}};
}

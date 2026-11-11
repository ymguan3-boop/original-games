import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDecorPlacement,specialDecorPose,wallSlots} from '../js/decor-zones.js';
import {dimensions} from '../js/nav.js';
test('直接點牆面產生細緻掛點，舊掛點仍可讀取，避開窗與門',()=>{for(let l=1;l<=5;l++){const dense=wallSlots(l,true),legacy=wallSlots(l);assert(dense.length>legacy.length);for(const side of ['back','front','left','right']){const p=dense.find(s=>s.side===side);assert(p);const pose=resolveDecorPlacement({type:'clock'},{x:p.x,z:p.z},l);assert(pose.mount.includes('-free-'));assert(specialDecorPose(pose,l));}assert(specialDecorPose(legacy[0],l));}});
test('植栽能放在非預設花園座標、保留門前通道並可搬回室內',()=>{const l=3,{width,height}=dimensions(l),door=Math.round((width-1)/2);const p=resolveDecorPlacement({type:'fern'},{x:.75,z:height+2.25},l);assert.equal(p.garden,'garden-free');assert(specialDecorPose(p,l));assert.throws(()=>resolveDecorPlacement({type:'fern'},{x:door,z:height+2},l));assert.throws(()=>resolveDecorPlacement({type:'fern'},{x:-4,z:height+2},l));const inside=resolveDecorPlacement({type:'fern',...p},{x:3,z:4},l);assert(!inside.garden);});

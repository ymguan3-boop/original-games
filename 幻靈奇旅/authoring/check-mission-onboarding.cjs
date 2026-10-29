'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/mission-onboarding.js'),'utf8'),ctx);
const {prepare,next}=ctx.window.PhantomOnboarding;
function fresh(){const s={journeyGuide:{}};prepare(s);return s}
let s=fresh(),f=s.journeyGuide,p=f.onboarding;
assert.equal(next(s),'tasks');p.taskLocation=true;assert.equal(next(s),'starter');
// Completing step three first must not skip the first or second missions.
f.menuViewed=true;assert.equal(next(s),'starter');s.dreamLabLegendClaimed=true;assert.equal(next(s),'exit');
f.exitedLab=true;assert.equal(next(s),'claim');s.adventureClaimed=true;assert.equal(next(s),'equip');
f.outfitEquipped=true;assert.equal(next(s,{modal:true}),'close-controls');
// Clicking later controls first never silently completes an unclicked control.
p.controls.throw=true;p.controls.berry=true;f.firstWildCapture=true;
assert.equal(next(s),'control-move');p.controls.move=true;assert.equal(next(s),'control-roll');p.controls.roll=true;assert.equal(next(s),'control-lock');p.controls.lock=true;f.controlsPracticed=true;assert.equal(next(s),'done');
// Tour must explain both recommendations, then finish explicitly; opening a menu is not completion.
s=fresh();f=s.journeyGuide;p=f.onboarding;Object.assign(s,{dreamLabLegendClaimed:true,adventureClaimed:true});Object.assign(f,{exitedLab:true,outfitEquipped:true,firstWildCapture:true,controlsPracticed:true});p.taskLocation=true;
assert.equal(next(s),'menu');assert.equal(next(s,{modal:true,title:'旅人手冊'}),'gym');p.gym=true;assert.equal(next(s,{modal:true,title:'旅人手冊'}),'tower');p.tower=true;assert.equal(next(s,{modal:true,title:'旅人手冊'}),'finish');assert.equal(f.menuViewed,undefined);f.menuViewed=true;assert.equal(next(s),'done');
// Previously finished missions retain completion, while unfinished legacy saves still receive the coach.
s={dreamLabLegendClaimed:true,adventureClaimed:true,journeyGuide:{exitedLab:true,outfitEquipped:true,firstWildCapture:true,menuViewed:true}};prepare(s);assert.equal(next(s),'done');assert.equal(s.journeyGuide.controlsPracticed,true);
s=fresh();p=s.journeyGuide.onboarding;p.controls.move=true;const restored=JSON.parse(JSON.stringify(s));prepare(restored);assert.equal(restored.journeyGuide.onboarding.controls.move,true);assert.equal(restored.journeyGuide.controlsPracticed,undefined);
console.log('PASS: ordered and out-of-order missions, all-five-control requirement, explicit tour completion, legacy saves and resume.');
const game=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8');
const formula=game.match(/const chance=S\.state\.journeyGuide\?\.firstWildCapture\?([^;]+);if\(Math\.random\(\)<chance\)/)?.[1];
assert(formula,'Capture formula missing');
const chance=new Function('S','AvianRules','who','type','return S.state.journeyGuide?.firstWildCapture?'+formula);
assert.equal(chance({state:{journeyGuide:{firstWildCapture:false}}},{captureChance(){throw Error('First capture must bypass species capture caps')}},{species:{stage:3}},'normal'),1);
assert.equal(chance({state:{journeyGuide:{firstWildCapture:true}}},{captureChance(){return .17}},{species:{stage:1}},'normal'),.17);
console.log('PASS: first capture succeeds at 100%, subsequent captures retain normal species-specific odds.');

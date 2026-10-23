/* Run from anywhere: node authoring/check-journey-guide.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const context={
 window:{},
 document:{hidden:false,body:{append(){}},createElement(){return{hidden:true,innerHTML:'',setAttribute(){},addEventListener(){}};}},
 setInterval(){}
};
vm.runInNewContext(read('js/game-rules.js'),context);
vm.runInNewContext(read('js/new-player-guide.js'),context);
const guide=context.window.PhantomJourneyGuide;
assert(guide,'Journey guide module unavailable');
let inside=true,owned=0,saved=0;
const state={dreamLabLegendClaimed:false,adventureClaimed:false,costume:'trainer'};
guide.init({state,newPlayer:true,earlyStarter:false,inLab:()=>inside,inBuilding:()=>inside,blocked:()=>false,
 progress:()=>({owned,total:58}),save:()=>saved++,notice(){},navigate(){},showCostumes(){},showMenu(){}});
const step=id=>assert.equal(guide.stage,id,'Incorrect guide stage: '+id);
step('starter');
state.dreamLabLegendClaimed=true;guide.refresh();step('exit');
inside=false;guide.onLabExit();step('claim');
state.adventureClaimed=true;guide.refresh();step('equip');
guide.onCostume('adventure');step('capture');
guide.onWildCapture();step('tools');
assert.match(guide.menuHelpHtml(),/工具列使用指南/);
guide.onMenuOpened();step('collect30');
owned=18;guide.refresh();step('arena');
guide.onArenaFinished();step('collect50');
owned=29;guide.refresh();step('tower');
guide.onTowerChallengeStarted();step('done');
assert.equal(state.journeyGuide.firstWildCapture,true);
assert.equal(state.journeyGuide.outfitEquipped,true);
assert(saved>0,'Tutorial progress should be persisted');
const game=read('js/game.js'),mount=read('js/overworld-mounts.js'),index=read('index.html');
assert(game.includes("species.id==='meganium'?1.95"),'Wild deer ratio should be 1.5 × 1.3');
assert(game.includes('meganium:1.95'),'Arena deer ratio should be 1.5 × 1.3');
assert(mount.includes('DEER_SCALE=1.3'),'Mount scale should be 1.3');
assert(index.includes('js/new-player-guide.js')&&index.includes('css/new-player-guide.css'),'Guide resources must be linked');
console.log('OK: guide stages, 30%/50% of 58, challenge-start completion, persistence, and deer 1.3× scale');

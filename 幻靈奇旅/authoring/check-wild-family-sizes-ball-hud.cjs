/* Run: node authoring/check-wild-family-sizes-ball-hud.cjs
 * Confirms relative multipliers apply only to wild actors; all three ball inventories
 * remain uncapped, while HUD uses a red 99 only above 99.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
const sandbox={window:{}};vm.runInNewContext(load('js/game-rules.js'),sandbox);
const rules=sandbox.window.PhantomGameRules,spirits=JSON.parse(load('data/spirits.json'));
const roster=Array.isArray(spirits)?spirits:spirits.spirits;
const expectations={torchic:1.3,combusken:1.3,blaziken:1.5,turtwig:1.3,grotle:1.3,torterra:1.3,mudkip:1.3,marshtomp:1.3,swampert:1.5};
for(const [id,multiplier] of Object.entries(expectations)){
 const spirit=roster.find(s=>s.id===id);
 assert(spirit,'Missing spirit '+id);
 assert.equal(rules.wildScaleFor(spirit),multiplier,id);
}
assert.equal(rules.wildScaleFor(roster.find(s=>s.id==='meganium')),1,'Unrelated deer remains unchanged');
assert.equal(rules.wildScaleFor(roster.find(s=>s.id==='giratina')),1,'Unrelated yellow rare remains unchanged');
assert.equal(rules.wildScaleFor({id:'unknown'}),1,'Unknown family remains unchanged');
const checks=[[0,0,false],[17,17,false],[98,98,false],[99,99,false],[100,99,true],[111,99,true],[470,99,true],[10000,99,true]];
for(const [stock,display,overflow] of checks){
 const result=rules.ballHudValue(stock);
 assert.equal(result.actual,stock);assert.equal(result.display,display);assert.equal(result.overflow,overflow);
}
const game=load('js/game.js'),css=load('css/game.css'),index=load('index.html');
const wildLine=game.split('\n').find(line=>line.includes('const wildFactor='));
assert(wildLine&&wildLine.includes('*rules.wildScaleFor(species)')===false);
assert(wildLine.includes('*Rules.wildScaleFor(species)'),'Wild actors must use the new family multiplier');
assert(game.includes('a.worldSize.multiplyScalar(wildFactor)'),'Wild size metadata must scale as well');
assert(!game.includes('Math.min(99,S.state.pokeballs)'),'Inventory must never be capped to 99');
assert(css.includes('#hud .supply b.ballOver99')&&css.includes('#ff434e'),'Overstock styling must be red');
assert(index.includes('js/game-rules.js?v=20261023-ball99-wildscale-v1'));
assert(index.includes('js/game.js?v=20261023-ball99-wildscale-v1'));
assert(index.includes('css/game.css?v=20261023-ball99-wildscale-v1'));
const begin=game.indexOf('function hudBallCount('),end=game.indexOf('function owned(id)',begin);
assert(begin>0&&end>begin,'HUD source must be present');
const members={};
for(const id of ['dexCount','ballCount','greatCount','masterCount','berryCount']){
 const classes=new Set(),box={title:''};
 members[id]={textContent:'',classList:{toggle(n,v){if(v)classes.add(n);else classes.delete(n);},contains:n=>classes.has(n)},setAttribute(n,v){this[n]=v;},closest:()=>box,box};
}
const state={pokeballs:470,greatBallCount:99,masterBallCount:100,berryCount:522};
const S={state},roster58=roster.filter(s=>s.acquisition!=='tower'&&!['chimchar','monferno','infernape'].includes(s.id));
const hud=new Function('Rules','S','$','regularSpirits','owned',game.slice(begin,end)+'return hud;')(rules,S,id=>members[id]||null,()=>roster58,()=>false);
hud();
assert.equal(members.ballCount.textContent,'99');
assert.equal(members.greatCount.textContent,'99');
assert.equal(members.masterCount.textContent,'99');
assert.equal(String(members.berryCount.textContent),'522'); // DOM stringifies property writes; mock keeps assigned numeric type.
assert(members.ballCount.classList.contains('ballOver99'));
assert(!members.greatCount.classList.contains('ballOver99'));
assert(members.masterCount.classList.contains('ballOver99'));
assert.equal(state.pokeballs,470);assert.equal(state.greatBallCount,99);assert.equal(state.masterBallCount,100);
assert(members.ballCount.box.title.includes('470'),'Tooltip shows actual inventory');
state.pokeballs=99;state.masterBallCount=15;hud();
assert(!members.ballCount.classList.contains('ballOver99'),'At exactly 99, show normal text color');
assert(!members.masterCount.classList.contains('ballOver99'),'Overflow highlight clears after spending');
console.log('PASS: all 9 wild-only family multipliers; HUD 0/99/100/470, 3 uncapped ball types, berries unchanged, and inventory preserved.');

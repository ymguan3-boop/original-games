const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'../初光商會'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const load=async()=>{const src=read('js/first-day-guide.js');return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));};
const base=(extra={})=>({level:1,day:1,phase:'closed',totals:{sales:0,days:0},tutorialSeen:{},...extra});
test('the first day walks through goods, shelves, opening, a sale, closing and a wrap-up',async()=>{
 const {firstDayStep:step}=await load();
 assert.equal(step(base()).id,'goods');
 assert.equal(step(base({tutorialSeen:{'fd-goods':true}})).id,'shelves');
 assert.equal(step(base({tutorialSeen:{'fd-goods':true,'fd-shelves':true}})).id,'open');
 assert.equal(step(base({phase:'open'})).id,'sale');
 assert.equal(step(base({phase:'open',totals:{sales:1,days:0}})).id,'close');
 assert.equal(step(base({phase:'report',totals:{sales:1,days:1}})).id,'finish');
});
test('players past the first day never see the guide',async()=>{
 const {firstDayStep:step}=await load();
 assert.equal(step(base({tutorialSeen:{'first-day-done':true},phase:'report'})),null);
 assert.equal(step(base({day:3,totals:{sales:20,days:2}})),null);
 assert.equal(step(base({level:2})),null);
});
test('the return button sits in the header on every screen size',()=>{
 const nav=read('js/shop-navigation.js');
 assert.match(nav,/topbar\.querySelector\('\.brand'\)\.after\(button\)/);
 assert.match(nav,/button\.textContent='← 初光鎮'/);
 assert.match(read('first-day-guide.css'),/\.topbar>\.return-to-game\{position:static/);
});

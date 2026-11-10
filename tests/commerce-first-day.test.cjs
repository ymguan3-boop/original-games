const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'../初光商會'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const load=async()=>{const src=read('js/first-day-guide.js');return import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));};
const base=(extra={})=>({level:1,day:1,phase:'closed',totals:{sales:0,days:0},tutorialSeen:{},...extra});
test('the return button sits in the header on every screen size',()=>{
 const nav=read('js/shop-navigation.js');
 assert.match(nav,/row\.insertBefore\(button,row\.firstChild\)/);
 assert.match(nav,/button\.textContent='← 初光鎮'/);
 assert.match(read('first-day-guide.css'),/\.topbar>\.return-to-game\{position:static/);
});

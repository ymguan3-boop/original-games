const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const load=(file,expression,context={})=>vm.runInNewContext(read(file).replace(/^import .*?;\n/gm,'').replace(/\bexport\s+(?=(?:function|const|class))/g,'')+';this.output='+expression,context).output;
test('24 new funny events are unique and retain free resolution routes',()=>{
 const events=load('js/funny-events.js','funnyEvents');
 assert.equal(events.length,24);
 assert.equal(new Set(events.map(e=>e.id)).size,24);
 for(const e of events){assert.match(e.id,/^comic-\d+$/);assert.equal(e.emoji.length,3);assert.ok(e.animation);assert.ok(e.dialogue.length>=12);assert.ok(e.cooldown>=40);assert.ok(e.choices.some(x=>x.cost===0));assert.ok(e.choices.every(x=>x.mood>=0&&x.satisfaction>=0&&x.xp>=0));}
 const core=read('js/core.js');assert.match(core,/\.concat\(funnyEvents\)/);assert.match(core,/comicEventEligible\(s,ev\)/);
});
test('comic scenes render three escaped, animated glyphs',()=>{
 const sketch=load('js/incident-sketch.js','incidentSketch');
 const markup=sketch({id:'comic-1',role:'cashier',title:'唱歌事件',emoji:['🪙','🎵','😄'],animation:'dance',effectText:'收銀加快'},v=>String(v).replace(/[<>]/g,''));
 assert.match(markup,/incident-scene--dance/);assert.equal((markup.match(/incident-sprite--/g)||[]).length,3);
 const stylesheet=read('event-responsive-v10.css');for(const kind of ['chase','dance','spin','jelly','float','flutter','pop','sneak','sparkle'])assert.match(stylesheet,new RegExp('incident-scene--'+kind));
});
test('mood overlay is sharp HTML with distinct happy, angry, tired, question and training colors',()=>{
 const src=read('js/actor-visuals.js').replace(/\bexport\s+(?=(?:const|function))/g,'');
 const created=[],context={innerWidth:390,innerHeight:844,performance:{now:()=>2000},document:{createElement:()=>{const node={children:[],dataset:{},style:{},hidden:false,append(...els){this.children.push(...els);},remove(){this.removed=true;}};created.push(node);return node;}}};
 const overlays=vm.runInNewContext(src+';this.output=createActorVisuals;',context),host={append(){}};
 const ui=overlays(host);
 ui.render({actors:[{id:'happy',x:90,y:350,kind:'happy'},{id:'angry',x:180,y:350,kind:'angry'},{id:'tired',x:270,y:350,kind:'tired'}],notices:[]});
 assert.ok(created.some(e=>e.dataset.tone==='happy'));assert.ok(created.some(e=>e.dataset.tone==='angry'));assert.ok(created.some(e=>e.dataset.tone==='tired'));
 ui.render({actors:[{id:'happy',x:90,y:350,kind:'question'},{id:'angry',x:180,y:350,kind:'training'}],notices:[{id:'new',targetId:'happy',text:'滿意 +1',tone:'good'}]});
 assert.ok(created.some(e=>e.dataset.tone==='question'));assert.ok(created.some(e=>e.dataset.tone==='training'));assert.ok(created.some(e=>e.dataset.tone==='good'));
 ui.dispose();
 const css=read('event-responsive-v10.css');for(const tone of ['happy','angry','question','tired','training','funny'])assert.match(css,new RegExp('data-tone="'+tone+'"'));
 assert.match(css,/font:800 13px/);
});
test('event coach, management, confirmation and staff cards remain compact and movable',()=>{
 const html=read('index.html'),app=read('js/app.js'),coach=read('js/event-coach.js'),win=read('js/window-controls.js'),staff=read('js/staff-overlay.js'),css=read('event-responsive-v10.css');
 for(const id of ['event-coach','confirm-shield','actor-reactions'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const attr of ['data-coach-smaller','data-coach-larger','data-coach-reset'])assert.match(html,new RegExp(attr));
 assert.match(app,/confirmWindow\.open\(\)/);assert.doesNotMatch(app,/\$\('#confirm'\)\.showModal\(\)/);
 assert.match(win,/minWidth/);assert.match(coach,/setPointerCapture/);assert.match(coach,/resizeWindowRect/);
 assert.match(staff,/data-staff-larger/);assert.match(staff,/staff-card-detached/);
 assert.match(css,/max-height:min\(68dvh,555px\)/);assert.match(css,/max-height:min\(52dvh,335px\)/);
 assert.match(css,/event-coach-scroll/);
});

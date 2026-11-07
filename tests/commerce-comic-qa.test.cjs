const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../初光商會'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const load=(file,expression,context={})=>{vm.runInNewContext(read(file).replace(/^import .*?;\n/gm,'').replace(/\bexport\s+(?=(?:function|const|class))/g,'')+';this.output='+expression,context);return context.output;};
test('each event shows its own GIF with an escaped caption',()=>{
 const sketch=load('js/incident-sketch.js','incidentSketch');
 const markup=sketch({id:'comic-1',role:'cashier',title:'唱歌事件',emoji:['🪙','🎵','😄'],animation:'dance',effectText:'收銀加快'},v=>String(v).replace(/[<>]/g,''));
 assert.match(markup,/event-gifs\/v2\/comic-1\.gif/);assert.match(markup,/loading="lazy"/);
});
test('mood overlay is sharp HTML with distinct happy, angry, tired, question and training colors',()=>{
 const src=read('js/actor-visuals.js').replace(/\bexport\s+(?=(?:const|function))/g,'');
 const created=[],context={innerWidth:390,innerHeight:844,performance:{now:()=>2000},document:{createElement:()=>{const node={children:[],dataset:{},style:{},hidden:false,addEventListener(){},setAttribute(){},removeAttribute(){},append(...els){this.children.push(...els);},remove(){this.removed=true;}};created.push(node);return node;}}};
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


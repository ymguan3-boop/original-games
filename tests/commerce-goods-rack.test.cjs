const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'../初光商會'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
test('the recruit market hides hired spirits, including evolved ones',()=>{
 assert.match(read('js/app.js'),/d\.hirePool\.filter\(h=>!h\.evolutionOnly&&!s\.employees\.some\(e=>e\.baseId===h\.id\|\|e\.spiritId===h\.id\)\)/);
});
test('supplies and materials each get their own model and preview',()=>{
 const src=read('js/product-models.js');
 for(const sku of ['potion','revive','battery','vacuum-orb','pet-xp-double','buff-attack','buff-defense','buff-capture','buff-pickup','shop-iron','shop-wood','shop-crystal']){
  assert.ok(src.includes(sku),sku);assert.ok(fs.existsSync(path.join(ROOT,'assets/art-v10/previews/product-'+sku+'.webp')),sku);
 }
});
test('guns use the gun model and the armory hangs weapons on a real rack',()=>{
 const products=read('js/shelf-products.js');
 assert.match(products,/\/guns\/\.test\(sku\)\?'gun'/);assert.match(products,/productLayout==='weapon-rack'/);
 assert.match(read('js/furniture.js'),/productLayout:'weapon-rack'/);assert.match(read('js/rack-models.js'),/armoryRack\(T\)/);
});
test('shop BGM loops on its own volume, separate from the sound-effect switch',()=>{
 const src=read('js/shop-music.js');assert.match(src,/name==='bgm'/);assert.match(src,/setVolume\(value\)/);assert.match(read('js/app.js'),/installShopMusic\(\)/);assert.match(read('js/app.js'),/id="bgm-volume"/);
 for(const f of ['theme','bgm'])assert.ok(fs.statSync(path.join(ROOT,'assets/audio',f+'.mp3')).size<2500000);
});
test('the four upgraded racks are procedural, match their slots and have fresh previews',()=>{
 const racks=read('js/rack-models.js');
 for(const id of ['materials','arcane','relic','royal']){assert.match(racks,new RegExp('function '+id+'\\(b,S\\)'));assert.ok(fs.existsSync(path.join(ROOT,'assets/art-v10/previews/rack-'+id+'.webp')),id);}
 assert.ok(fs.existsSync(path.join(ROOT,'assets/art-v10/previews/rack-armory.webp')));
 assert.match(racks,/ys=\[\.23,\.74,1\.25\],h=1\.4/);assert.match(racks,/ys=\[\.23,\.62,1\.01,1\.4\]/);assert.match(racks,/ys=\[\.23,\.58,\.93,1\.28,1\.63\]/);
 assert.match(read('js/shelf-view.js'),/hasRackModel\(kind\)\?Promise\.resolve\(rackModel\(T,kind\)\)/);
});
test('招財 looks sad when daily goals are missed or the chase fails',()=>{
 assert.match(read('js/daily-presentations.js'),/d\.complete<d\.total\?[^\n]*zhaocai-sad\.gif/);
 assert.match(read('js/app.js'),/else showZhaocaiNote\('追客失敗了/);
});
test('shopping spirits use overworld proportions and birds stay on foot with folded wings',()=>{
 const scene=read('js/scene.js'),assets=read('js/asset-resolver.js');
 assert.ok(scene.includes('customerHeight=def=>Math.min(2.05,(Number(def?.height)||1.275)*1.65/2.55)'));
 assert.ok(scene.includes('walkingBird:true'));
 assert.ok(assets.includes("const foldWings=walkingBird&&/^(avian|light-phoenix):/.test(path)"));
 assert.ok(assets.indexOf("controller.update?.(.1);}normalize(object,height)")>0);
});
test('choice notes sit inside the green option button',()=>{
 assert.ok(read('js/incident-detail.js').includes('(hint?`<small class="incident-choice-hint">'));
 assert.ok(/<small class="incident-choice-hint">.*'resolveCustomerComplaint'/.test(read('js/customer-complaint-panel.js')));
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'../初光商會'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
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
test('the four upgraded racks are procedural, match their slots and have fresh previews',()=>{
 const racks=read('js/rack-models.js');
 for(const id of ['materials','arcane','relic','royal']){assert.match(racks,new RegExp('function '+id+'\\(b,S\\)'));assert.ok(fs.existsSync(path.join(ROOT,'assets/art-v10/previews/rack-'+id+'.webp')),id);}
 assert.ok(fs.existsSync(path.join(ROOT,'assets/art-v10/previews/rack-armory.webp')));
 assert.match(racks,/ys=\[\.23,\.74,1\.25\],h=1\.4/);assert.match(racks,/ys=\[\.23,\.62,1\.01,1\.4\]/);assert.match(racks,/ys=\[\.23,\.58,\.93,1\.28,1\.63\]/);
 assert.match(read('js/shelf-view.js'),/hasRackModel\(kind\)\?Promise\.resolve\(rackModel\(T,kind\)\)/);
});
test('shopping spirits use overworld proportions and birds stay on foot with folded wings',()=>{
 const scene=read('js/scene.js'),assets=read('js/asset-resolver.js');
 assert.ok(scene.includes('customerHeight=def=>Math.min(2.05,(Number(def?.height)||1.275)*1.65/2.55)'));
 assert.ok(scene.includes('walkingBird:true'));
 assert.ok(assets.includes("const foldWings=walkingBird&&/^(avian|light-phoenix):/.test(path)"));
 assert.ok(assets.indexOf("controller.update?.(.1);}normalize(object,height)")>0);
});
test('placing a rack previews the procedural model instead of downloading it',()=>{
 assert.ok(read('js/scene.js').includes('!decoration&&hasRackModel(type)?Promise.resolve(rackModel(T,type))'));
});

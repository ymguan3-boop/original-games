const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'../初光商會'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
test('supplies and materials each get their own model and preview',()=>{
 const src=read('js/product-models.js');
 /* 晶石已從商品目錄移除，不再需要 3D 商品模型 */
 assert.ok(!read('data/shop-catalog.json').includes('"shop-crystal"'));
 for(const sku of ['potion','revive','battery','vacuum-orb','pet-xp-double','buff-attack','buff-defense','buff-capture','buff-pickup','shop-iron','shop-wood']){
  assert.ok(src.includes(sku),sku);assert.ok(fs.existsSync(path.join(ROOT,'assets/icons-v12/product-'+sku+'.webp')),sku);
 }
});
test('guns use the gun model and the armory hangs weapons on a real rack',()=>{
 const products=read('js/shelf-products.js');
 assert.match(products,/\/guns\/\.test\(sku\)\?'gun'/);assert.match(products,/productLayout==='weapon-rack'/);
 assert.match(read('js/furniture.js'),/productLayout:'weapon-rack'/);/* 武器架改由分級模型建立：Lv.1 是工匠武器架 */assert.match(read('js/tier-models.js'),/type==='armory'&&n===1&&!decoration\)return artisanArmory\(T\)/);
});
test('the four upgraded racks are procedural, match their slots and have fresh previews',()=>{
 const racks=read('js/rack-models.js');
 for(const id of ['materials','arcane','relic','royal']){assert.match(racks,new RegExp('function '+id+'\\(b,S\\)'));assert.ok(fs.existsSync(path.join(ROOT,'assets/icons-v12/rack-'+id+'.webp')),id);}
 assert.ok(fs.existsSync(path.join(ROOT,'assets/icons-v12/rack-armory.webp')));
 assert.match(racks,/ys=\[\.23,\.74,1\.25\],h=1\.4/);assert.match(racks,/ys=\[\.23,\.62,1\.01,1\.4\]/);assert.match(racks,/ys=\[\.23,\.58,\.93,1\.28,1\.63\]/);
 /* 架子外觀全部由分級模型統一產生（球體櫃的舊專用模型已於繪本版移除） */assert.match(read('js/shelf-view.js'),/const promise=Promise\.resolve\(createTierModel\(T,\{type,tier,decoration\}\)\)/);assert.doesNotMatch(read('js/shelf-view.js'),/assets\.load\(shelfModel\(type\)\)/);
});
test('shopping spirits use overworld proportions and birds stay on foot with folded wings',()=>{
 const scene=read('js/scene.js'),assets=read('js/asset-resolver.js');
 assert.ok(scene.includes('customerHeight=def=>Math.min(2.05,(Number(def?.height)||1.275)*1.65/2.55)'));
 assert.ok(scene.includes('walkingBird:true'));
 assert.ok(assets.includes("const foldWings=walkingBird&&/^(avian|light-phoenix):/.test(path)"));
 assert.ok(assets.indexOf("controller.update?.(.1);}normalize(object,height)")>0);
});
test('placing a rack previews the procedural model instead of downloading it',()=>{
 assert.ok(read('js/scene.js').includes('createTierModel(T,{type,tier:'));
});

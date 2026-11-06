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
 assert.match(read('js/furniture.js'),/productLayout:'weapon-rack'/);assert.match(read('js/shelf-view.js'),/armoryRack\(T\)/);
});
test('shop music plays the theme once, then loops the BGM, and follows the sound setting',()=>{
 const src=read('js/shop-music.js');assert.match(src,/name==='bgm'/);assert.match(src,/enabled\(\)/);
 for(const f of ['theme','bgm'])assert.ok(fs.statSync(path.join(ROOT,'assets/audio',f+'.mp3')).size<2500000);
});

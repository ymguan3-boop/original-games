const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function api(values={}){const context={window:{},location:{href:'https://example.test/game/'},URL,localStorage:{getItem:k=>values[k]??null}};vm.runInNewContext(fs.readFileSync(new URL('../幻靈奇旅/js/commerce-hall.js','file://'+__filename.replaceAll('\\','/')),'utf8'),context);return context.window.PhantomCommerce;}
test('商會存檔為五級外觀依據，舊預覽碼不生效',()=>{
 assert.equal(api({'phantom-commerce-preview':'5'}).currentLevel(),1);
 for(let level=1;level<=5;level++)assert.equal(api({firstlight_shop_v1:JSON.stringify({level})}).currentLevel(),level);
 assert.equal(api({firstlight_shop_v1:'bad','firstlight-commerce-level-v1':'{"level":3}'}).currentLevel(),3);
 assert.equal(api({firstlight_shop_v1:'{"level":2}','firstlight-commerce-level-v1':'{"level":5}'}).currentLevel(),2);
});
test('獨立HTML入口保留部署前綴、同源返回及訪客路徑',()=>{
 const a=api();for(const [path,dest,back,guest]of [['/original-games/幻靈奇旅/','/original-games/初光商會/','/original-games/幻靈奇旅/',false],['/game/','/shop/','/game/',false],['/game/guest/','/shop/','/game/guest/',true]]){
  const u=new URL(a.shopURL('https://example.test'+path));assert.equal(decodeURIComponent(u.pathname),dest);assert.equal(decodeURIComponent(new URL(u.searchParams.get('return'),'https://example.test').pathname),back);assert.equal(u.searchParams.get('guest')==='1',guest);assert.equal(u.origin,'https://example.test');
 }
});

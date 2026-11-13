import test from 'node:test';import assert from 'node:assert/strict';
import{rollMerchantWeapon,addMerchantCargo,importMerchantCargo,merchantWeaponCatalog}from'../js/merchant-meadow.js';
import{CaveWorld}from'../js/world.js';
test('小魔王與大魔王必掉限定武器，每次1至4支，整疊入袋及轉入商會',()=>{
 for(const kind of ['elite','boss'])for(const quantity of[1,2,3,4]){let n=0;const drop=rollMerchantWeapon({kind},()=>[.999,.5,(quantity-.5)/4][n++]);assert(drop);assert.equal(drop.quantity,quantity);const cargo={},sku=addMerchantCargo(cargo,drop);assert.equal(cargo.merchantCargo[sku],quantity);const shop={inventory:{}};assert.equal(importMerchantCargo(shop,cargo.merchantCargo,merchantWeaponCatalog(),100).imported,quantity);assert.equal(shop.inventory[sku],quantity);}
 assert.equal(rollMerchantWeapon({kind:'normal'},()=>.99),null);assert.equal(rollMerchantWeapon({kind:'normal'},()=>0).quantity,1);
});
test('實際拾取整疊4支限定武器，HUD與採集袋同時計入4支',()=>{const drop=rollMerchantWeapon({kind:'boss'},()=>.99),s={merchantCargo:{},run:{id:'qa',time:1,hero:{x:0,z:0},buffs:{},pickups:[{...drop,id:'stack',x:0,z:0}]}};const fake={run:s.run,passives:{},merchantMeadow:true,store:{transact:(id,fn)=>({value:fn(s)})},emit(){}};CaveWorld.prototype.collectLoot.call(fake);assert.equal(s.run.weaponGoods,4);assert.equal(s.run.limitedWeaponGoods,4);assert.equal(Object.values(s.merchantCargo)[0],4);assert.equal(s.run.pickups.length,0);});

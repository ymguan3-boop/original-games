// One reset per device/account storage when this release is first loaded.
// Never bump this marker for ordinary cache or artwork revisions.
export const SHOP_RESET_VERSION='merchant-20261114-release52';
const PROGRESS_KEYS=['firstlight_shop_v1','firstlight-commerce-level-v1','firstlight-merchant-meadow-v1','firstlight-shop-seen-v1','firstlight-weapon-guide-v1'];
export function resetMerchantRelease(storage){const marker='firstlight-shop-reset-version';if(storage.getItem(marker)===SHOP_RESET_VERSION)return false;const old=storage.getItem('firstlight_shop_v1');for(const key of PROGRESS_KEYS){const value=storage.getItem(key);if(value!==null)storage.setItem(key+'.before-'+SHOP_RESET_VERSION,value);}for(const key of PROGRESS_KEYS)storage.removeItem(key);storage.setItem(marker,SHOP_RESET_VERSION);return !!old;}
export function resetMerchantOnly(storage){const stamp=new Date().toISOString().replace(/[:.]/g,'-');for(const key of PROGRESS_KEYS){const old=storage.getItem(key);if(old!==null)storage.setItem(key+'.before-manual-reset-'+stamp,old);}for(const key of PROGRESS_KEYS)storage.removeItem(key);storage.setItem('firstlight-shop-reset-version',SHOP_RESET_VERSION);return stamp;}

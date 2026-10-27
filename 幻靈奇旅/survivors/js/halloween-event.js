export const HALLOWEEN_WEAPON = 'staff-pumpkin';
export function claimHalloweenWeapon(store, password) {
  if (String(password) !== '1151031') throw new Error('活動密碼不正確，請重新輸入。');
  return store.transact(store.newId('halloween-2026'), state => {
    if (state.weapons.includes(HALLOWEEN_WEAPON)) return {claimed:false, weaponId:HALLOWEEN_WEAPON};
    state.weapons.push(HALLOWEEN_WEAPON);
    return {claimed:true, weaponId:HALLOWEEN_WEAPON};
  });
}

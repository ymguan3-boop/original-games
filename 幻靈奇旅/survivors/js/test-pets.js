import {makePet} from './pet-party.js';
import {dexSpecies} from './dex-evolution.js';
export function chooseTestPet(store,data,id){
 if(!dexSpecies(data.spirits,data.catalog).some(s=>s.id===id))throw Error('請選擇一般幻靈');
 return store.transact(store.newId('test-pet'),s=>{const r=s.run;if(r?.status!=='active')throw Error('請先開始一場探險');const index=r.activePet;r.pets[index]=makePet(id,data.spirits,s.training?.[id],s.growth?.[id]?.level||1);Object.assign(r.pets[index],{x:r.hero.x+1.2,z:r.hero.z+1});return{id,index};});
}

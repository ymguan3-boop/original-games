// Cave-only movement classification. Never infer anatomy from the legacy Pokémon ID.
// Deliberately exclude the stationary three-color egg and non-bird flying creatures.
export const CAVE_BIRD_IDS=Object.freeze(['charmander','charmeleon','charizard','piplup','prinplup','empoleon','treecko','grovyle','sceptile','palkia','blissey']);
const birdIds=new Set(CAVE_BIRD_IDS),birdFamilies=new Set(['pepper-chick','moon-owl','avian-evolution','light-phoenix']);
const nonBirdForms=new Set(['egg','frog','butterfly','caterpillar','bat','chest','book','elephant','dragon','waterdragon']);
const nativeFlyPaths=/^(?:avian:\/\/(?:treecko|grovyle|sceptile|palkia)|light-phoenix:\/\/blissey|native:\/\/(?:piplup|prinplup|empoleon))$/;
export function isCaveBird(spec){
 if(!spec||typeof spec!=='object'||nonBirdForms.has(spec.form)||spec.stationary||spec.motionType==='stationary')return false;
 const path=String(spec.model||'').split(/[?#]/)[0];
 if(['bird','chick','phoenix'].includes(spec.form))return true;
 if(birdFamilies.has(spec.family))return true;
 if(/(?:^|\/)pepper-chick-[123]\.glb$/.test(path)||nativeFlyPaths.test(path))return true;
 return !spec.family&&!spec.form&&!path&&birdIds.has(spec.id);
}
function clipNames(available){
 if(typeof available==='string')return[available];
 if(Array.isArray(available)||available instanceof Set)return[...available].map(clip=>typeof clip==='string'?clip:clip?.name).filter(Boolean);
 return available&&typeof available==='object'?Object.keys(available):[];
}
/**
 * Pass the actor's actual available clip/controller mode names when known.
 * Undefined permits verified native-controller Fly modes; [] means no available clips.
 * A null mode requires procedural lift/wing motion in the renderer; no walk clip is used.
 * Apply lift smoothly to the render root only, leaving battle coordinates unchanged.
 */
export function flightMotion(spec,availableClips){
 if(!isCaveBird(spec))return{bird:false,mode:null,procedural:false,lift:0};
 const names=clipNames(availableClips).map(name=>String(name).split('|').at(-1));
 const priority=['fly','flight','flyloop'];let mode=null;
 for(const kind of priority){mode=names.find(name=>name.replace(/[\s_-]/g,'').toLowerCase()===kind)||null;if(mode)break;}
 if(!mode&&availableClips===undefined&&nativeFlyPaths.test(String(spec.model||'').split(/[?#]/)[0]))mode='Fly';
 return{bird:true,mode,procedural:!mode,lift:mode?0:Math.min(.8,Math.max(.34,(Number(spec.height)||1.5)*.23))};
}

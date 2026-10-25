// Cave-only families, derived from data/evolution.json; verified against every evolution edge.
const families={
  "bulbasaur": [
    "bulbasaur",
    "ivysaur",
    "venusaur"
  ],
  "charmander": [
    "charmander",
    "charmeleon",
    "charizard"
  ],
  "squirtle": [
    "squirtle",
    "wartortle",
    "blastoise"
  ],
  "chikorita": [
    "chikorita",
    "bayleef",
    "meganium"
  ],
  "cyndaquil": [
    "cyndaquil",
    "quilava",
    "typhlosion"
  ],
  "totodile": [
    "totodile",
    "croconaw",
    "feraligatr"
  ],
  "jigglypuff": [
    "treecko",
    "grovyle",
    "sceptile",
    "palkia",
    "jigglypuff"
  ],
  "torchic": [
    "torchic",
    "combusken",
    "blaziken"
  ],
  "mudkip": [
    "mudkip",
    "marshtomp",
    "swampert"
  ],
  "turtwig": [
    "turtwig",
    "grotle",
    "torterra"
  ],
  "chimchar": [
    "chimchar"
  ],
  "monferno": [
    "monferno"
  ],
  "infernape": [
    "infernape"
  ],
  "piplup": [
    "piplup",
    "prinplup",
    "empoleon"
  ],
  "articuno": [
    "articuno",
    "moltres"
  ],
  "raikou": [
    "zapdos",
    "raikou"
  ],
  "entei": [
    "entei",
    "suicune"
  ],
  "kyogre": [
    "kyogre",
    "groudon",
    "rayquaza",
    "mewtwo"
  ],
  "dialga": [
    "dialga"
  ],
  "giratina": [
    "giratina",
    "raichu"
  ],
  "pikachu": [
    "pikachu"
  ],
  "mew": [
    "mew"
  ],
  "wigglytuff": [
    "wigglytuff"
  ],
  "blissey": [
    "blissey"
  ],
  "caterpie": [
    "caterpie",
    "metapod",
    "butterfree"
  ],
  "weedle": [
    "weedle",
    "kakuna",
    "beedrill"
  ],
  "forest": [
    "forest"
  ],
  "ice": [
    "ice"
  ],
  "fire": [
    "fire"
  ]
};
const roots=new Map(Object.entries(families).flatMap(([root,ids])=>ids.map(id=>[id,root])));
const excluded=new Set(['caterpie','weedle','forest','ice','fire']);
export const familyRoot=id=>roots.get(id)||id;
export const isTrainingBase=id=>roots.has(id)&&familyRoot(id)===id&&!excluded.has(id);
export const familyMembers=id=>families[familyRoot(id)]||[id];
export const ownsFamily=(state,id)=>state.owned.some(owned=>familyRoot(owned)===familyRoot(id));
export const trainingOf=(state,id)=>state.training?.[familyRoot(id)]||{};
export const familyGrowth=(state,id)=>state.growth?.[familyRoot(id)]||{level:1,xp:0};
const rankSpent=n=>100*n+25*n*(n-1);
function growthSpent(g){let level=1,xp=0,spent=0;for(let n=0;n<1000;n++){if(level>g.level||level===g.level&&xp>=g.xp)return spent;spent+=20+Math.floor(level/10)*10;xp+=25;while(level<50&&xp>=40+level*10){xp-=40+level*10;level++;}if(level===50)return spent;}return spent;}
// One-time consolidation preserves the best progress and refunds overlapping investment.
export function migrateFamilyProgress(state){
 if(state.familyProgressVersion===19)return;
 const before={training:structuredClone(state.training||{}),growth:structuredClone(state.growth||{})},training={},growth={};let refund=0;
 for(const [id,ranks]of Object.entries(state.training||{})){const root=familyRoot(id),t=training[root]||={hp:0,attack:0,defense:0};for(const key of ['hp','attack','defense']){const a=t[key],b=ranks[key]||0;refund+=rankSpent(Math.min(a,b));t[key]=Math.max(a,b);}}
 for(const [id,g]of Object.entries(state.growth||{})){const root=familyRoot(id),old=growth[root];if(!old){growth[root]={...g};continue;}const best=g.level>old.level||g.level===old.level&&g.xp>old.xp?g:old;refund+=growthSpent(best===g?old:g);growth[root]={...best};}
 state.training=training;state.growth=growth;state.points+=refund;
 state.familyProgressMigration={refund,before};state.familyProgressVersion=19;
 // Existing active pets retain HP ratios; the world's syncHealth recalculates maxima.
 if(state.run?.status==='active')for(const p of state.run.pets){p.training={...trainingOf(state,p.baseId)};p.growthLevel=familyGrowth(state,p.baseId).level;}
}

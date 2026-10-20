/* One deterministic contract sample for each requested group; no production save/browser writes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),base=path.resolve(__dirname,'..'),c={window:{}};c.window=c;vm.createContext(c);
for(const p of ['js/avian-rules.js','models/native/avian-spirits.js','js/spirit-catalog.js','js/spirit-combat.js'])vm.runInContext(fs.readFileSync(path.join(base,p),'utf8'),c);
const rules=c.AvianRules,spirits=JSON.parse(fs.readFileSync(path.join(base,'data/spirits.json'),'utf8')),byId=Object.fromEntries(spirits.map(s=>[s.id,s])),catalog=c.SpiritCatalog.create(JSON.parse(fs.readFileSync(path.join(base,'data/spirit-catalog.json'),'utf8')));
// Group 1: one encounter with three consecutive failures, and a three-card little eagle evolution.
let encounter={origin:'jigglypuff',failures:0},seen=[];for(let i=0;i<3;i++){encounter=rules.nextFailure(encounter);seen.push(encounter.speciesId);assert.equal(encounter.failures,i+1);assert.equal(encounter.origin,'jigglypuff');}
assert.deepEqual(seen,['treecko','grovyle','sceptile']);assert.equal(rules.nextFailure(encounter).failures,4);assert.equal(rules.nextFailure(encounter).speciesId,'sceptile');
for(const type of ['normal','great'])assert.equal(rules.captureChance({species:byId.jigglypuff,berry:true},type,.86),.05);assert.equal(rules.captureChance({species:byId.jigglypuff},'master',1),1);
for(const id of ['jigglypuff','treecko','grovyle'])assert.equal(rules.evolutionCost(byId[id]),Infinity);assert.equal(rules.evolutionCost(byId.sceptile),3);assert.equal(byId.sceptile.evolvesTo,'palkia');assert(2<rules.evolutionCost(byId.sceptile));assert(3>=rules.evolutionCost(byId.sceptile));
assert(byId.jigglypuff.stationary);assert.equal(byId.jigglypuff.cardFrame,'red');for(const id of ['treecko','grovyle','sceptile','palkia']){assert.equal(byId[id].rarity,'稀有');assert.equal(byId[id].cardFrame,'purple');assert.equal(byId[id].stageLabel,'特殊');assert(c.AvianSpirits.has(byId[id].model));}
const positions=rules.line.concat('palkia').map(id=>catalog.get(id).order);assert(positions.every((n,i)=>i===0||n===positions[i-1]+1));
// Group 2: armour applies once without stacking; heal cap and per-owner-turn cooldown survive switching.
const egg={s:byId.jigglypuff,hp:2,energy:5},enemy={s:byId.treecko,hp:90};const [armour,recover]=egg.s.skills;
rules.apply(egg,enemy,armour,1);rules.apply(egg,enemy,armour,1);assert.equal(enemy.attackMultiplier,.5);
const result=rules.apply(egg,enemy,recover,1);assert.equal(result.healed,81);assert.equal(egg.hp,83);assert.equal(egg.eggRecoverReadyTurn,3);assert(!rules.canUse(egg,recover,2));assert.equal(rules.apply(egg,enemy,recover,2),null);
// Switching changes the active index, never the egg's cooldown field.
const team=[egg,{s:byId.treecko}],switched=team[1];assert(switched!==egg);assert(!rules.canUse(team[0],recover,2));assert(rules.canUse(team[0],recover,3));egg.hp=89;rules.apply(egg,enemy,recover,3);assert.equal(egg.hp,90);
for(const id of rules.line.concat('palkia'))for(const skill of byId[id].skills){const binding=catalog.skill(id,skill),plan=c.SpiritCombat.attackPlan(byId[id],{path:byId[id].model,controller:{},actions:{}},skill,binding);assert.equal(plan.mode,binding.mode);assert.equal(plan.duration,binding.duration);assert(plan.nativeFx);}
const game=fs.readFileSync(path.join(base,'js/game.js'),'utf8');assert(game.includes('if(a.species?.stationary)'));assert(game.includes('if(who.eggEncounter)'));assert(game.includes('AvianRules.canUse(p,skill,b.turn)'));assert(game.includes('AvianRules.canUse(e,s,b.turn)'));
console.log(JSON.stringify({status:'AVIAN_RULES_PASS',sample1:{captureFailures:seen,evolution:'3 小鷹 → 大朋',eggCaptureRate:.05,stationary:true},sample2:{armourAttackMultiplier:enemy.attackMultiplier,healFraction:.9,healCap:egg.hp,cooldownAvailableRounds:[1,3,5]},limits:'Contract checks only; no browser playthrough or subjective art approval.'},null,2));

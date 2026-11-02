import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES} from '../js/stages.js';
import {BOSS_OPENINGS, openingFor} from '../js/boss-openings.js';
import {readFileSync} from 'node:fs';

test('ten islands each have one matching boss-specific playful opening line', () => {
  assert.equal(STAGES.length,10);
  assert.equal(Object.keys(BOSS_OPENINGS).length,10);
  for(const stage of STAGES){
    const intro=openingFor(stage);
    assert.ok(intro, stage.name + ' must have an opening');
    assert.equal(intro.boss,stage.boss);
    assert.ok(intro.line.length>=20,stage.name + ' needs an actual line');
    assert.ok(intro.name.length>=2);
  }
  assert.equal(openingFor({...STAGES[0],boss:'wrong'}),null,'do not assign another boss speech by mistake');
});

test('opening and first three cards are gated by the rendered, visible battle scene', () => {
  const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
  const rules=readFileSync(new URL('../js/rules.js',import.meta.url),'utf8');
  assert.match(main,/deferDeal: true/);
  assert.match(main,/view\?\.update\(running \? dt \* speed : 0\);[\s\S]*?beginDealing\(game\)/);
  assert.match(main,/if \(launched\) \{ handleEvents\(\); handSig = ''; hud\(\); showBossIntro\(game\.stage\); \}/);
  assert.match(main,/const running = visibleBattle &&/);
  assert.match(rules,/if \(!state\.started \|\| state\.result\) return/);
});

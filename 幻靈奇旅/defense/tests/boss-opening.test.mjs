import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES} from '../js/stages.js';
import {BOSS_OPENINGS, openingFor, MAX_OPENING_CHARS, OPENING_SECONDS} from '../js/boss-openings.js';
import {readFileSync} from 'node:fs';

test('ten islands each have one matching boss-specific playful opening line', () => {
  assert.equal(STAGES.length,10);
  assert.equal(Object.keys(BOSS_OPENINGS).length,10);
  for(const stage of STAGES){
    const intro=openingFor(stage);
    assert.ok(intro, stage.name + ' must have an opening');
    assert.equal(intro.boss,stage.boss);
    assert.ok(intro.line.length>=8 && intro.line.length<=MAX_OPENING_CHARS,stage.name + ' needs one short line of 8-18 characters, got ' + intro.line.length);
    assert.ok(intro.name.length>=2);
  }
  assert.equal(openingFor({...STAGES[0],boss:'wrong'}),null,'do not assign another boss speech by mistake');
});

test('opening and first three cards are gated by the rendered, visible battle scene', () => {
  const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
  const rules=readFileSync(new URL('../js/rules.js',import.meta.url),'utf8');
  assert.match(main,/deferDeal: true/);
  assert.match(main,/view\.update\(running \? dt \* speed : 0\);[\s\S]*?beginDealing\(game\)/);
  assert.match(main,/if \(launched\) \{ handleEvents\(\); handSig = ''; hud\(\); if \(!pk\) showBossIntro\(game\.stage\);/);
  assert.match(main,/const running = visibleBattle &&/);
  assert.match(main,/if \(\+\+visibleSceneFrames >= 2\)/,'battle must paint before initial cards');
  assert.match(rules,/if \(!state\.started \|\| state\.result\) return/);
});


test('each boss has a voice profile, a country-style colour theme and a generated 2D comic portrait', () => {
  for (const [id, b] of Object.entries(BOSS_OPENINGS)) {
    const v = b.voice;
    for (const k of ['voiceName', 'voiceKey', 'genderFeel', 'ageFeel', 'tone', 'speed', 'emotion', 'pitch', 'rate', 'notes', 'audioFile', 'ttsText']) assert.ok(v[k], id + ' voice.' + k);
    assert.equal(v.voiceKey, id);
    assert.equal(v.audioFile, 'audio/boss/' + id + '.mp3');
    assert.match(v.voiceName, /^zh-TW-(YunJhe|HsiaoChen)Neural$/);
    for (const k of ['wood', 'paper', 'accent', 'ink', 'glow']) assert.match(b.theme[k], /^#[0-9a-f]{6}$/i, id + ' theme.' + k);
    assert.equal(b.portrait, 'assets/boss-portraits/' + id + '.webp');
    const image = readFileSync(new URL('../' + b.portrait, import.meta.url));
    assert.equal(image.toString('ascii', 8, 12), 'WEBP');
    assert.ok(image.length > 10000);
  }
  assert.deepEqual(OPENING_SECONDS, [3.2, 4.2]);
  assert.equal(new Set(Object.values(BOSS_OPENINGS).map((b) => b.theme.wood)).size, 10, 'every boss gets its own frame colour');
});

test('the dialog shows the boss 2D comic portrait, plays the voice, and the theme song plays in the chart and the battle', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../js/view.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!view.includes('renderPortrait') && !view.includes('portraitRig'));
  assert.ok(main.includes("new URL('../' + speech.portrait, import.meta.url).href"));
  assert.ok(main.includes("' 關｜' + stage.name"));
  assert.ok(main.includes('playBossVoice(speech)'));
  assert.match(main, /const THEME_SCENE = 'theme'/);
  assert.ok(!main.includes("setScene?.('arena')"));
  assert.match(html, /bi-title/);
  assert.doesNotMatch(html, /class="fs-toggle hud-fs"/);
  assert.doesNotMatch(html, /class="tool fs-toggle chart-fs"/);
});

test('modal helpers used by the result, deck, rules and boatman dialogs are defined', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  assert.ok(main.includes('\nfunction openModal('));
  assert.ok(main.includes('\nconst ribbon = '));
});

test('island props exist for all ten islands in both the battle field and the sea chart', () => {
  const props = readFileSync(new URL('../js/island-props.js', import.meta.url), 'utf8');
  const env = readFileSync(new URL('../js/env.js', import.meta.url), 'utf8');
  const chart = readFileSync(new URL('../js/islands3d.js', import.meta.url), 'utf8');
  for (const p of ['mound', 'boardwalk', 'frogStatue', 'rainbow', 'daffodils', 'treehouse', 'ropeBridge', 'teslaCoil', 'speakerStack', 'wagon', 'magicCircle', 'floatRock', 'twistedTree', 'bats', 'starTower', 'plaza', 'dragonAltar', 'ruinArch', 'rift']) {
    assert.ok(props.includes('    ' + p + '('), p + ' prop');
    assert.ok((env + chart).includes('P.' + p), p + ' is placed');
  }
});

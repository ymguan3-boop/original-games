const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../初光商會');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('every chapterObjectives call in app.js has a named ES module import', () => {
  const source = read('js/app.js');
  assert.match(source, /import\s*\{\s*chapterObjectives\s*\}\s*from\s*['"]\.\/shop-chapters\.js['"]/);
  assert.ok((source.match(/\bchapterObjectives\s*\(/g) || []).length >= 1);
  assert.match(read('js/shop-chapters.js'), /export\s+function\s+chapterObjectives\s*\(/);
});

test('mobile page and core use fresh chapter-aware boot modules', () => {
  const html = read('index.html'), app = read('js/app.js'), core = read('js/core.js');
  assert.match(html, /app\.js\?v=20261105-(?:chapter-bootfix2|customer-chase1)/);
  assert.match(app, /core\.js\?v=20261105-(?:chapter-bootfix2|chase-daily1)/);
  assert.match(core, /shop-operations\.js\?v=20261105-(?:chapter-bootfix2|chase-daily1)/);
  assert.match(core, /import\s*\{[^}]*chapterObjectives[^}]*\}\s*from\s*['"]\.\/shop-chapters\.js['"]/);
  assert.match(read('js/shop-operations.js'), /import\s*\{[^}]*chapterObjectives[^}]*\}\s*from\s*['"]\.\/shop-chapters\.js['"]/);
});

test('chapter import is available before HUD and upgrade progress rendering', () => {
  const app = read('js/app.js'), chapter = read('js/shop-chapters.js');
  const chapterKeys = ['chapterObjectives','autoChapterConstruction','awardSideChapter','finishChapterConstruction'];
  for(const name of chapterKeys)assert.match(chapter,new RegExp('export\\s+function\\s+'+name+'\\s*\\('));
  assert.match(app, /function\s+renderHUD\s*\(/);
  assert.match(app, /chapterMissionPanel\(game,esc,money,btn/);
  assert.match(app, /if\(currentPanel==='upgrade'\)/);
});

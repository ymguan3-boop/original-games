const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../初光商會');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');


test('mobile page and core use fresh chapter-aware boot modules', () => {
  const html = read('index.html'), app = read('js/app.js'), core = read('js/core.js');
  assert.match(html, /app\.js\?v=\d{8}-/);
  assert.match(app, /core\.js\?v=\d{8}-/);
  assert.match(core, /shop-operations\.js\?v=\d{8}-/);
  assert.match(core, /import\s*\{[^}]*chapterObjectives[^}]*\}\s*from\s*['"]\.\/shop-chapters\.js['"]/);
  assert.match(read('js/shop-operations.js'), /import\s*\{[^}]*chapterObjectives[^}]*\}\s*from\s*['"]\.\/shop-chapters\.js['"]/);
});


// 把動作烘焙成 actions.baked.js（含武器穿透避讓，約需 30 秒）；網頁直接載入這個檔案
//   node bake-actions.js
const fs = require('fs');
require('./kid-model.js'); require('./props.js');
const k = require('./kid-actions.js');
const data = JSON.stringify({ ACTIONS: k.ACTIONS, FPS: k.FPS });
fs.writeFileSync(__dirname + '/actions.baked.js',
  '// 由 bake-actions.js 產生（kid-actions.js 的烘焙結果，已做武器穿透避讓）。請勿手改。\n' +
  'window.KID_BLUEPRINT = window.KID_BLUEPRINT || {};\nObject.assign(window.KID_BLUEPRINT, ' + data + ');\n');
console.log('actions.baked.js', (data.length / 1024).toFixed(0) + ' KB');

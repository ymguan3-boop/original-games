/* Generates defense/audio/boss/<key>.mp3 from the voice profiles in js/boss-openings.js using the Edge neural TTS
   (zh-TW-YunJheNeural 雲哲 for the males, zh-TW-HsiaoChenNeural for 水仙子). Needs `npm i ws` (NODE_PATH may point at it).
   Run:  node defense/tools/make-boss-voices.cjs [key ...]   */
const crypto = require('crypto'), fs = require('fs'), path = require('path'), {pathToFileURL} = require('url');
const WebSocket = require('ws');
const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4', VERSION = '1-130.0.2849.68';
const gec = () => { let t = Math.floor(Date.now() / 1000) + 11644473600; t -= t % 300; return crypto.createHash('sha256').update(Math.round(t * 1e7) + TOKEN, 'ascii').digest('hex').toUpperCase(); };
const stamp = () => new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)');
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]));

function synth(v) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID().replace(/-/g, '');
    const ws = new WebSocket(`wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}&ConnectionId=${id}&Sec-MS-GEC=${gec()}&Sec-MS-GEC-Version=${VERSION}`, {
      headers: {Pragma: 'no-cache', 'Cache-Control': 'no-cache', Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0', 'Accept-Language': 'en-US,en;q=0.9'}});
    const chunks = [];
    const timer = setTimeout(() => { ws.terminate(); reject(Error('timeout ' + v.voiceKey)); }, 30000);
    ws.on('open', () => {
      ws.send(`X-Timestamp:${stamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-96kbitrate-mono-mp3"}}}}\r\n`);
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-TW'><voice name='${v.voiceName}'><prosody pitch='${v.pitch}' rate='${v.rate}' volume='+0%'>${esc(v.ttsText)}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp()}Z\r\nPath:ssml\r\n\r\n${ssml}`);
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) { const n = data.readUInt16BE(0); if (/Path:audio/.test(data.slice(2, 2 + n).toString())) chunks.push(data.slice(2 + n)); }
      else if (/Path:turn\.end/.test(data.toString())) { clearTimeout(timer); ws.close(); resolve(Buffer.concat(chunks)); }
    });
    ws.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

(async () => {
  const root = path.join(__dirname, '..');
  const {BOSS_OPENINGS} = await import(pathToFileURL(path.join(root, 'js', 'boss-openings.js')).href);
  const only = process.argv.slice(2), out = path.join(root, 'audio', 'boss');
  fs.mkdirSync(out, {recursive: true});
  for (const [key, b] of Object.entries(BOSS_OPENINGS)) {
    if (only.length && !only.includes(key)) continue;
    const buf = await synth(b.voice);
    if (buf.length < 2000) throw Error('empty audio for ' + key);
    fs.writeFileSync(path.join(out, key + '.mp3'), buf);
    console.log(key, b.voice.voiceName, buf.length, 'bytes');
  }
})().catch((e) => { console.error(e); process.exit(1); });

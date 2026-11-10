/* Same-site HTTPS relay. Each page has its own bearer token; accounts and IPs
   never identify players. Host rules remain authoritative, just as with WebRTC. */
const initialized=new WeakMap();
const TTL=20*60*1000,CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const allowedOrigins=new Set(['https://hlqj.kyo1216kimo.chatgpt.site','https://ymguan3-boop.github.io']);
async function init(db){if(!initialized.has(db))initialized.set(db,db.batch([
 db.prepare('CREATE TABLE IF NOT EXISTS pk_relay_rooms (code TEXT PRIMARY KEY, host_token TEXT NOT NULL, guest_token TEXT, created INTEGER NOT NULL, touched INTEGER NOT NULL, closed INTEGER NOT NULL DEFAULT 0, snapshot TEXT, snap_seq INTEGER NOT NULL DEFAULT 0)'),
 db.prepare('CREATE TABLE IF NOT EXISTS pk_relay_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, sender TEXT NOT NULL, message_id TEXT NOT NULL, recipient TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(room,sender,message_id))'),
 db.prepare('CREATE INDEX IF NOT EXISTS pk_relay_inbox ON pk_relay_messages(room,recipient,id)')
 ]).catch(e=>{initialized.delete(db);throw e;}));await initialized.get(db);}
const token=()=>crypto.randomUUID().replaceAll('-','');
export async function handlePkRelay(req,db){
 const origin=req.headers.get('Origin'),cors=origin&&allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
 const reply=(body,status=200)=>Response.json(body,{status,headers:{...cors,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(origin&&!allowedOrigins.has(origin))return reply({error:'不允許這個網站連線'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'}});
 if(req.method!=='POST')return reply({error:'請使用 POST'},405);
 if(!db)return reply({error:'對戰中繼服務尚未設定'},503);
 try{
  const text=await req.text();if(text.length>128*1024)return reply({error:'對戰資料過大'},413);
  const b=JSON.parse(text),now=Date.now();await init(db);
  if(b.action==='create'){
   await db.batch([db.prepare('DELETE FROM pk_relay_messages WHERE room IN (SELECT code FROM pk_relay_rooms WHERE touched < ?)').bind(now-TTL),db.prepare('DELETE FROM pk_relay_rooms WHERE touched < ?').bind(now-TTL)]);
   const count=await db.prepare('SELECT COUNT(*) AS n FROM pk_relay_rooms').first();if(count.n>=2000)return reply({error:'房間已滿，請稍後再試'},503);
   for(let i=0;i<8;i++){const bytes=crypto.getRandomValues(new Uint8Array(4)),code=[...bytes].map(n=>CHARS[n%32]).join(''),key=token();const r=await db.prepare('INSERT OR IGNORE INTO pk_relay_rooms (code,host_token,created,touched) VALUES (?,?,?,?)').bind(code,key,now,now).run();if(r.meta.changes)return reply({code,token:key,role:'host'});}
   return reply({error:'暫時無法建立房間'},503);
  }
  const code=String(b.code||'').toUpperCase();if(!/^[A-HJ-NP-Z2-9]{4}$/.test(code))return reply({error:'請確認四碼房號'},400);
  if(b.action==='join'){
   const key=token(),r=await db.prepare('UPDATE pk_relay_rooms SET guest_token=?, touched=? WHERE code=? AND guest_token IS NULL AND closed=0 AND touched>=?').bind(key,now,code,now-TTL).run();
   if(!r.meta.changes){const room=await db.prepare('SELECT code,guest_token,closed FROM pk_relay_rooms WHERE code=? AND touched>=?').bind(code,now-TTL).first();return reply({error:room&&!room.closed?'這個房間已經有人了':'找不到房間，請確認房號'},room&&!room.closed?409:404);}
   return reply({code,token:key,role:'guest'});
  }
  const key=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
  const room=await db.prepare('SELECT * FROM pk_relay_rooms WHERE code=? AND touched>=?').bind(code,now-TTL).first();
  if(!room||!key||(room.host_token!==key&&room.guest_token!==key))return reply({error:'房間已失效，請重新建立'},403);
  const role=room.host_token===key?'host':'guest',other=role==='host'?'guest':'host';
  if(b.action==='close'){await db.prepare('UPDATE pk_relay_rooms SET closed=1 WHERE code=?').bind(code).run();return reply({closed:true});}
  if(b.action!=='exchange')return reply({error:'未知操作'},400);
  if(room.closed)return reply({closed:true});
  const messages=Array.isArray(b.messages)?b.messages:[];if(messages.length>32)return reply({error:'訊息過多'},400);
  const commands=[];
  for(const m of messages){if(typeof m.id!=='string'||m.id.length>64||!m.o||typeof m.o.t!=='string')return reply({error:'訊息格式不正確'},400);const payload=JSON.stringify(m.o);if(payload.length>64*1024)return reply({error:'訊息過大'},413);commands.push(db.prepare('INSERT OR IGNORE INTO pk_relay_messages (room,sender,message_id,recipient,payload) VALUES (?,?,?,?,?)').bind(code,role,m.id,other,payload));}
  if(b.snapshot&&role==='host'){const snap=JSON.stringify(b.snapshot);if(snap.length>96*1024)return reply({error:'畫面資料過大'},413);commands.push(db.prepare('UPDATE pk_relay_rooms SET snapshot=?,snap_seq=snap_seq+1 WHERE code=?').bind(snap,code));}
  const cursor=Number.isSafeInteger(b.cursor)&&b.cursor>=0?b.cursor:0;
  commands.push(db.prepare('DELETE FROM pk_relay_messages WHERE room=? AND recipient=? AND id<=?').bind(code,role,cursor));
  commands.push(db.prepare('UPDATE pk_relay_rooms SET touched=? WHERE code=?').bind(now,code));await db.batch(commands);
  const incoming=await db.prepare('SELECT id,payload FROM pk_relay_messages WHERE room=? AND recipient=? AND id>? ORDER BY id LIMIT 64').bind(code,role,cursor).all();
  return reply({paired:!!room.guest_token,closed:false,messages:incoming.results.map(m=>({id:m.id,o:JSON.parse(m.payload)})),...(role==='guest'&&room.snap_seq>(Number(b.snapSeq)||0)?{snapshot:JSON.parse(room.snapshot),snapSeq:room.snap_seq}:{})});
 }catch(e){console.error('PK relay request failed',e?.message);return reply({error:e instanceof SyntaxError?'對戰資料格式不正確':'中繼服務暫時無法使用，請重試'},e instanceof SyntaxError?400:503);}
}

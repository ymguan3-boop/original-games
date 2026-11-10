/* Reliable POST polling over ordinary HTTPS works behind UDP/WebRTC firewalls. */
const ENDPOINT='https://hlqj.kyo1216kimo.chatgpt.site/api/pk';
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
export function coalesceSnapshot(previous,next){if(!previous?.d?.ev||!next?.d?.ev)return next;return {...next,d:{...next.d,ev:[...previous.d.ev,...next.d.ev].slice(-160)}};}
export async function relayRequest(body,key,fetcher=fetch){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetcher(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(body),signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'對戰中繼暫時無法使用');return result;}catch(e){if(e.name==='AbortError')throw Error('對戰中繼回應逾時，請檢查網路後重試');throw e;}finally{clearTimeout(timer);}
}
export function relayChannel(info,makeChannel,{onPaired=()=>{},onStatus=()=>{},request=relayRequest,interval=180}={}){
 let stopped=false,inFlight=false,timer,cursor=0,snapSeq=0,paired=false,failures=0,lastSuccess=Date.now(),snapshot=null;const outbox=[];
 const close=()=>{if(stopped)return;stopped=true;clearTimeout(timer);void request({action:'close',code:info.code},info.token).catch(()=>{});};
 const wake=()=>{if(stopped||inFlight)return;clearTimeout(timer);timer=setTimeout(poll,0);};
 const ch=makeChannel('https-relay',o=>{if(o?.t==='snap')snapshot=coalesceSnapshot(snapshot,o);else if(outbox.length<256){outbox.push({id:id(),o});wake();}else ch._gone();},close);
 async function poll(){if(stopped||inFlight)return;inFlight=true;const started=Date.now(),batch=outbox.slice(0,32),frame=snapshot;snapshot=null;try{
   const r=await request({action:'exchange',code:info.code,cursor,snapSeq,messages:batch,...(frame?{snapshot:frame}:{})},info.token);
   if(stopped)return;if(r.closed){ch._gone();return;}lastSuccess=Date.now();failures=0;
   outbox.splice(0,batch.length);
   if(r.paired&&!paired){paired=true;onPaired(ch);}
   for(const m of r.messages||[])if(m.id>cursor){ch._recv(m.o);cursor=m.id;}
   if(r.snapshot&&r.snapSeq>snapSeq){snapSeq=r.snapSeq;ch._recv(r.snapshot);}
  }catch(e){if(stopped)return;if(frame)snapshot=snapshot?coalesceSnapshot(frame,snapshot):frame;failures++;onStatus(failures<3?'網路稍慢，正在重新連線…':e.message);if(Date.now()-lastSuccess>25000){ch._gone();return;}}
  finally{inFlight=false;}
  // Network time already counts toward the cadence. Never add a fixed pause
  // after a slow response; newly queued commands go in the next single request.
  if(!stopped)timer=setTimeout(poll,failures?Math.min(2000,interval*(1+failures)):outbox.length?0:Math.max(0,interval-(Date.now()-started)));
 }
 queueMicrotask(poll);return ch;
}
export async function hostHttps(makeChannel,{onStatus=()=>{}}={}){const info=await relayRequest({action:'create'});let resolve;const ready=new Promise(r=>{resolve=r;});const ch=relayChannel(info,makeChannel,{onPaired:resolve,onStatus});ch.onclose=()=>onStatus('連線已中斷，請重新建立房間');return {code:info.code,ready,cancel:()=>ch.close()};}
export async function joinHttps(code,makeChannel,{onStatus=()=>{}}={}){const info=await relayRequest({action:'join',code});return relayChannel(info,makeChannel,{onStatus});}

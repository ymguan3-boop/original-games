/* 店外環境：時段、天氣與季節。2D 與 3D 共用同一份結果，只差在怎麼畫。
 * 天氣每天開店時決定並存檔；市場事件「暴風雨」會強制變成颱風天。 */
import {clockMinutes} from './shop-clock.js?v=20261110-chibi3';
import {activeEvent} from './economy-v2.js?v=20261110-chibi3';
export const SEASONS=[
 {id:'spring',name:'春',grass:'#8fd06a',accent:'#ffc4dc',weights:{sunny:6,rain:3,typhoon:0}},
 {id:'summer',name:'夏',grass:'#5fae3a',accent:'#ffe36e',weights:{sunny:6,rain:2,typhoon:1.2}},
 {id:'autumn',name:'秋',grass:'#c9a24a',accent:'#e9783b',weights:{sunny:6,rain:2,typhoon:.4}},
 {id:'winter',name:'冬',grass:'#e8eef2',accent:'#ffffff',weights:{sunny:5,rain:2,typhoon:0,snow:3}}
];
export const WEATHER={sunny:{name:'晴天',icon:'☀️',traffic:1,light:1},rain:{name:'雨天',icon:'🌧️',traffic:.85,light:.75},typhoon:{name:'颱風天',icon:'🌀',traffic:.55,light:.55},snow:{name:'下雪',icon:'❄️',traffic:.9,light:.85}};
export const DAYS_PER_SEASON=7;
export const seasonOf=day=>SEASONS[Math.floor(((day||1)-1)/DAYS_PER_SEASON)%4];
export function rollWeather(g,s){
 const ev=activeEvent(s);if(ev?.weather==='storm'){s.weather={day:s.day,kind:'typhoon'};return s.weather;}
 if(s.weather?.day===s.day)return s.weather;const w=seasonOf(s.day).weights,entries=Object.entries(w).filter(e=>e[1]>0),total=entries.reduce((n,e)=>n+e[1],0);let r=g.random(s)*total,kind='sunny';for(const[k,v]of entries){r-=v;if(r<=0){kind=k;break;}}
 s.weather={day:s.day,kind};g.log(s,`今天天氣：${WEATHER[kind].name}`);return s.weather;
}
export const weatherTraffic=s=>WEATHER[s.weather?.day===s.day?s.weather.kind:'sunny']?.traffic||1;
/* 時段：早上偏暖、中午最亮、傍晚橘紅、打烊後夜色 */
const STOPS=[[7*60,{tint:'#ffcf8a',alpha:.16,sun:.75,sky:'#f6d6a8',angle:-.9}],[12*60,{tint:'#ffffff',alpha:0,sun:1.15,sky:'#b7dce9',angle:0}],[17*60,{tint:'#ff9a4a',alpha:.14,sun:.85,sky:'#f2b27a',angle:.8}],[20*60,{tint:'#2b3a6e',alpha:.38,sun:.25,sky:'#38446e',angle:1.1}]];
const mix=(a,b,t)=>{const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
export function environment(s,cfg){
 const m=clockMinutes(s,cfg);let i=0;while(i<STOPS.length-2&&m>STOPS[i+1][0])i++;const[a0,A]=STOPS[i],[b0,B]=STOPS[i+1],t=Math.max(0,Math.min(1,(m-a0)/(b0-a0)));
 const kind=s.weather?.day===s.day?s.weather.kind:'sunny',w=WEATHER[kind],season=seasonOf(s.day);
 const slot=m<10*60?'morning':m<16*60?'noon':m<19*60?'evening':'night';
 return {minutes:m,slot,season,weather:kind,weatherInfo:w,tint:mix(A.tint,B.tint,t),tintAlpha:A.alpha+(B.alpha-A.alpha)*t+(1-w.light)*.35,sun:(A.sun+(B.sun-A.sun)*t)*w.light,sky:kind==='sunny'?mix(A.sky,B.sky,t):mix(mix(A.sky,B.sky,t),'#6b7686',.55),angle:A.angle+(B.angle-A.angle)*t,beams:kind==='sunny'&&slot!=='night'};
}

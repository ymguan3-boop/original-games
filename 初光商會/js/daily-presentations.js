/* Small, original, accessible daily opening card and sequential counting settlement.
 * The display reads only persisted shop stats. No separate balance calculation. */
import {dailyProgress,dailyClosing} from './daily-objectives.js';
export function dailyOpeningHTML(game,esc,money){
 const data=dailyProgress(game.state,game.data.levels);
 return `<div class="daily-card-title">☀ 第 ${data.day} 天 · 今日營業目標</div>
 <div class="daily-chapter">Lv.${data.level}｜${esc(data.chapter)}</div>
 <div class="daily-goal-grid">${data.metrics.map((m,i)=>`<div class="daily-goal" style="--step:${i}"><small>${esc(m.label)}</small><strong>${m.target.toLocaleString('zh-TW')}${esc(m.unit)}</strong><span>目前 ${Math.round(m.value)}${esc(m.unit)}</span></div>`).join('')}</div>
 <p>用實際成交、營業收入和客人滿意度挑戰今日目標。完成後打烊可查看達標結果，章節任務會持續累積。</p>`;
}
export function dailySettlementHTML(game,esc,money){
 const d=dailyClosing(game.state,game.data.levels);
 return `<div class="daily-card-title">🧮 第 ${d.day} 天 · 打烊結算</div>
 <div class="daily-calculator-title">叮！今日營業帳單正在逐項核算</div>
 <div class="daily-receipt-lines">${d.figures.map((x,i)=>`<div class="daily-receipt-line ${i===d.figures.length-1?'total':''}" style="--step:${i}"><span>${esc(x.label)}</span><b class="${x.value<0?'negative':''}">${x.value<0?'−':'＋'}${money(Math.abs(x.value))}</b></div>`).join('')}</div>
 <div class="daily-goal-result"><strong>今日目標達成 ${d.complete}/${d.total} 項</strong><div>${d.metrics.map(m=>`<span class="${m.done?'met':'missed'}">${m.done?'✓':'△'} ${esc(m.label)} ${Math.round(m.value)}/${m.target}${esc(m.unit)}</span>`).join('')}</div></div>
 <div class="daily-closing-balance">結算後現金餘額 <b>${money(d.gold)}</b>${d.unpaid>0?`<small>尚有 ${money(d.unpaid)} 待支付，已列入帳本</small>`:''}</div>`;
}

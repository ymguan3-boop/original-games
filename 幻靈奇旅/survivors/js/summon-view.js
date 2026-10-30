import { createSummon } from './summon-canvas.js?v=20261030-reaper-v2';
export const summonDuration = rewards => 2467;
export function summonMarkup() {
  return '<div class="summon-stage summon-v07" data-frame="0" data-phase="ready" data-revealed="0" role="img" aria-label="靈核穿雲召喚動畫"><canvas class="summon-film" aria-hidden="true"></canvas><div class="summon-v07-caption" aria-live="polite">靈舟啟航 · 穿越雲海</div><div class="summon-v07-progress" aria-hidden="true"><i></i></div></div>';
}
export function startSummon(container, rewards, picture) {
  const stage = container.matches?.('.summon-v07') ? container : container.querySelector('.summon-v07');
  if (!stage) return { dispose() {}, pause() {} };
  stage._summon?.dispose();
  const controller = createSummon(stage, rewards, picture, summonDuration(rewards));
  stage._summon = controller;
  return controller;
}

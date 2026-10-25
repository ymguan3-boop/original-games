const DROP_ONLY=new Set(['caterpie','metapod','butterfree','weedle','kakuna','beedrill']);
export function canCaptureEnemy(enemy){return !!enemy&&!['chest','book'].includes(enemy.kind)&&!DROP_ONLY.has(enemy.speciesId);}

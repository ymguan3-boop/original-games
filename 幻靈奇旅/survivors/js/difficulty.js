export function waveScales(wave){const n=Math.max(0,Math.floor(Number(wave)||1)-1);return{hp:.5*Math.pow(1.08,n),attack:.5*Math.pow(1.08,n)};}

export const spawnInterval=wave=>Math.max(.32,2.8-(Math.max(1,wave)-1)*.12)/1.5;

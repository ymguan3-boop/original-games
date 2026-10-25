export function waveScales(wave){const n=Math.max(0,Math.floor(Number(wave)||1)-1);return{hp:.5*Math.pow(1.05,n),attack:.5*Math.pow(1.01,n)};}

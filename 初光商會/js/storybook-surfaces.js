// Brush-stroke color fields stay legible beneath the placement grid.
export function storyGrass(canvasTex) {
  return canvasTex(256,256,(c,w,h)=>{
    c.fillStyle='#a8b97a';c.fillRect(0,0,w,h);
    let n=347;const r=()=>((n=n*16807%2147483647)/2147483647);
    for(let i=0;i<185;i++){
      const x=r()*w,y=r()*h,k=1+r()*2.6;
      c.fillStyle=['#b3c182','#9caf76','#bac88c','#a1b57b'][i%4];c.beginPath();
      c.moveTo(x-k*3,y);c.bezierCurveTo(x-k*2,y-k,x,y-k*2,x+k*4,y-k*1.8);
      c.quadraticCurveTo(x+k,y,x-k*3,y);c.fill();
      if(i%26===0){
        c.fillStyle='#e6cf84';c.beginPath();c.ellipse(x,y,1.7,1.3,0,0,Math.PI*2);c.fill();
      }
    }
  });
}
export function storyFloor(canvasTex,level) {
  const pal=[null,['#eed9b4','#e6cea8','#d3b186','#f7e5bd'],['#dfbc89','#e8c99b','#bd956b','#efd5ae'],['#e6cdae','#eedbbd','#c5a78f','#f5e2c1'],['#e6ddd2','#f0e5d6','#b6b1ae','#e2cab6'],['#f3e3c4','#ead4af','#ccb589','#dfbd79']][level];
  return canvasTex(256,256,(c,w,h)=>{
    c.fillStyle=pal[2];c.fillRect(0,0,w,h);
    if(level<3){
      for(let j=0;j<4;j++)for(let i=-1;i<3;i++){
        const x=i*128+(j%2)*64,y=j*64;c.fillStyle=pal[(i+j+4)%2];c.fillRect(x+1,y+1,126,62);
        c.lineWidth=1.3;c.strokeStyle=pal[3];c.beginPath();c.moveTo(x+5,y+41);c.bezierCurveTo(x+40,y+28,x+77,y+49,x+118,y+36);c.stroke();
      }
    }else{
      for(let j=0;j<4;j++)for(let i=0;i<4;i++){
        const x=64*i,y=64*j;c.fillStyle=pal[(i+j)%2];c.fillRect(x+1,y+1,62,62);
        if(level>=4){c.strokeStyle=pal[3];c.lineWidth=1.7;c.strokeRect(x+5,y+5,54,54);}
        if(level===5&&(i+j)%2===0){c.fillStyle=pal[3];c.beginPath();c.moveTo(x+32,y+19);c.quadraticCurveTo(x+33,y+31,x+45,y+32);c.quadraticCurveTo(x+33,y+33,x+32,y+45);c.quadraticCurveTo(x+31,y+33,x+19,y+32);c.quadraticCurveTo(x+31,y+31,x+32,y+19);c.fill();}
      }
    }
  });
}

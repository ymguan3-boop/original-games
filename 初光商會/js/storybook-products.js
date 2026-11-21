// The three bottle contours and the faceted armoury pieces are readable as
// small shelf silhouettes. Exact stock counts continue to use instancing.
export function storyProduct(T,b,G,sku) {
  const bronze=0x94654b,gold=0xf6c778,ivory=0xffedc3,ink=0x483947;
  const put=(shape,color,...args)=>b.put(G[shape],color,...args);
  const bottle={
    potion:[0xc84b62,[[.16,.02],[.25,.08],[.33,.26],[.32,.41],[.16,.59],[.10,.63],[.10,.77]]],
    revive:[0x4e9983,[[.11,.02],[.25,.09],[.29,.20],[.24,.39],[.13,.55],[.09,.70],[.09,.78]]],
    'buff-attack':[0xce6046,[[.18,.02],[.26,.06],[.31,.20],[.21,.49],[.10,.68],[.10,.78]]],
    'buff-defense':[0x5392b5,[[.24,.02],[.30,.10],[.30,.48],[.14,.59],[.105,.70],[.105,.78]]],
    'buff-capture':[0xe9ae56,[[.09,.02],[.25,.09],[.33,.28],[.25,.47],[.09,.61],[.09,.78]]],
    'buff-pickup':[0x9a84b1,[[.16,.02],[.24,.07],[.19,.28],[.26,.49],[.22,.58],[.10,.65],[.10,.78]]]
  }[sku];
  if(bottle){
    const [color,points]=bottle,g=new T.LatheGeometry(points.map(([x,y])=>new T.Vector2(x,y)),sku==='buff-defense'?6:14);
    b.put(g,color);g.dispose();
    put('cyl',gold,0,.76,0,.14,.065,.14);
    put('cone',bronze,0,.848,0,.125,.13,.125);
    put('ring',ivory,0,.635,0,.117,.117,.115,Math.PI/2);
    put('ball',ivory,-.13,.38,.2,.028,.087,.022,0,0,-.35);
    const medallionZ=sku==='buff-pickup'?.20:.27;
    put('oct',gold,0,.26,medallionZ,.095,.104,.029);
    put('oct',ink,0,.26,medallionZ+.02,.056,.06,.022);
    return true;
  }
  if(sku.startsWith('ball-')){
    const c=sku==='ball-basic'?0xbe605d:sku==='ball-great'?0x589aaa:0x947ebe;
    put('ball',c,0,.45,0,.39);put('ring',bronze,0,.45,0,.37,.37,.37,Math.PI/2);
    put('ball',ivory,0,.45,.38,.092,.092,.045);put('ball',gold,0,.45,.42,.054,.054,.025);
    for(const side of [-1,1])put('ball',gold,side*.20,.62,.23,.057,.109,.035,0,0,-side*.65);
    return true;
  }
  if(sku==='berry'){
    for(const [x,y,z,c] of [[-.15,.23,.05,0xb74768],[.16,.22,.1,0xd85b70],[.02,.40,-.07,0x933e61]])put('ball',c,x,y,z,.207,.20,.19);
    for(const side of [-1,1])put('ball',0x689175,side*.09,.59,-.025,.067,.16,.043,0,0,-side*.89);
    put('ball',ivory,-.20,.30,.213,.03,.035,.02);
    return true;
  }
  if(/sword|knife|blade|guns|weapon/.test(sku)){
    const elite=/elite|boss/.test(sku),seed=[...sku].reduce((n,ch)=>(31*n+ch.charCodeAt(0))>>>0,0);
    const steels=elite?[0xa397c9,0x93b8c5,0xc19c9a,0x8cb7a8]:[0xbacbd0,0xadbdba,0xa3bac8,0xc4bfab];
    const c=steels[seed%steels.length],sweep=(seed%7-3)*.017;
    if(sku.includes('guns')){
      put('box',bronze,-.09,.22,0,.15,.30,.16,0,0,-.32);put('hex',c,.07,.47,0,.124,.54,.124,0,0,Math.PI/2);
      put('ring',gold,-.005,.32,0,.097,.075,.069);put('box',gold,.26,.50,0,.06,.18,.23);
      for(let i=0;i<2+seed%3;i++)put('box',gold,-.11+i*.066,.565,0,.029,.069,.14);
      if(elite)put('oct',0xc7779c,.045,.47,.12,.060,.049,.025);
    }else{
      const knife=sku.includes('knife'),paired=sku.includes('blade'),length=(knife?.52:.77)+(seed%5)*.025;
      const sh=new T.Shape();sh.moveTo(-.056,0);sh.quadraticCurveTo(-.084+sweep,length*.50,-.06+sweep,length*.75);sh.lineTo(.04+sweep,length);sh.quadraticCurveTo(.084+sweep,length*.54,.060,0);sh.closePath();
      const blade=new T.ExtrudeGeometry(sh,{depth:.033,bevelEnabled:false,curveSegments:4});
      for(const x of paired?[-.12,.12]:[0]){
        b.put(blade,c,x,.30,0);put('box',ivory,x,.30+length*.4,.038,.012,length*.68,.008);
        put('cyl',bronze,x,.16,.01,.045,.24,.045);put('box',gold,x,.30,.01,knife?.17:.26,.043,.08);
        put('oct',elite?0xbd5a74:gold,x,.035,.01,.052,.055,.052);
        if(elite)for(const side of [-1,1])put('ball',gold,x+side*.10,.33,.01,.028,.082,.024,0,0,-side*.66);
      }
      blade.dispose();
    }
    return true;
  }
  if(sku==='battery'||sku==='vacuum-orb'||sku==='pet-xp-double'){
    const colors={battery:0x428b96,'vacuum-orb':0x987ba8,'pet-xp-double':0xd16c84};
    put('hex',bronze,0,.08,0,.25,.12,.25);put('ring',gold,0,.16,0,.23,.23,.23,Math.PI/2);
    if(sku==='battery'){
      put('hex',colors[sku],0,.43,0,.23,.58,.23);put('hex',gold,0,.76,0,.24,.09,.24);put('cyl',ivory,0,.84,0,.09,.09,.09);
      for(const side of [-1,1])put('oct',ivory,side*.05,.46-side*.13,.216,.05,.13,.025,0,0,-.37);
    }else if(sku==='vacuum-orb'){
      put('ball',colors[sku],0,.48,0,.31);put('ring',gold,0,.48,0,.37,.37,.37,.99,0,.43);
      for(const side of [-1,1])put('oct',ivory,side*.22,.48+side*.15,.20,.043,.065,.04);
    }else{
      for(const side of [-1,1]){put('oct',side===1?gold:colors[sku],side*.14,.41,0,.17,side===1?.23:.32,.15);put('oct',ivory,side*.13,.46,.134,.029,.07,.022);}
    }
    return true;
  }
  if(sku==='shop-wood'){
    for(const [x,y] of [[-.17,.19],[.17,.19],[0,.46]]){
      put('cyl',0x9f6849,x,y,0,.167,.84,.167,Math.PI/2);
      for(const z of [-.425,.425]){put('cyl',0xebbd83,x,y,z,.147,.016,.147,Math.PI/2);put('ring',bronze,x,y,z*1.03,.078,.078,.055);}
    }
    for(const z of [-.22,.22])put('ring',gold,0,.28,z,.34,.31,.24);
    return true;
  }
  if(sku==='shop-iron'){
    for(const [x,y,z,s] of [[0,.19,0,.24],[-.25,.15,.1,.20],[.22,.15,.14,.19],[.02,.36,-.04,.15]]){
      put('rock',x<0?0x6b7788:0x667784,x,y,z,s,s*.85,s,.21,x*2,.11);
      put('oct',0xbfd3ce,x+s*.43,y+s*.51,z+s*.44,s*.31,s*.18,s*.19);
    }
    return true;
  }
  return false;
}

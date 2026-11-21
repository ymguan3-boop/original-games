// Geometry is batched per moving joint. A collar follows the chest, a hat follows the head.
export function ornament(T, name) {
  const positions = [], normals = [], colors = [];
  function put(geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const part = geometry.index ? geometry.toNonIndexed() : geometry;
    const matrix = new T.Matrix4().compose(new T.Vector3(x,y,z),
      new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)), new T.Vector3(sx,sy,sz));
    part.applyMatrix4(matrix);
    const tint = new T.Color(color).convertSRGBToLinear();
    for (let i=0; i<part.attributes.position.count; i++) {
      const p = part.attributes.position, n = part.attributes.normal;
      positions.push(p.getX(i),p.getY(i),p.getZ(i));
      normals.push(n.getX(i),n.getY(i),n.getZ(i));
      colors.push(tint.r,tint.g,tint.b);
    }
    part.dispose();
    if (part !== geometry) geometry.dispose();
  }
  function relief(shape, color, x, y, z, scale = 1, rotation = 0) {
    put(new T.ExtrudeGeometry(shape,{depth:.032,bevelEnabled:true,bevelThickness:.008,
      bevelSize:.008,bevelSegments:1,curveSegments:5}),color,x,y,z,scale,scale,scale,0,0,rotation);
  }
  function finish(parent) {
    if (!positions.length) return;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const mesh = new T.Mesh(geometry,new T.MeshLambertMaterial({vertexColors:true}));
    mesh.name=name; mesh.castShadow=true; mesh.receiveShadow=true;
    mesh.userData.noOutline=true;
    parent.add(mesh);
    return mesh;
  }
  return {put,relief,finish};
}

function ribbon(T) {
  const s=new T.Shape();
  s.moveTo(0,0); s.bezierCurveTo(-.16,.08,-.70,.50,-.87,.42);
  s.quadraticCurveTo(-1.02,.06,-.72,-.34); s.quadraticCurveTo(-.28,-.26,0,0);
  s.bezierCurveTo(.2,-.19,.63,-.30,.82,-.25);
  s.quadraticCurveTo(1.02,.12,.80,.48); s.quadraticCurveTo(.35,.32,0,0);
  return s;
}

function quill(T){
  const s=new T.Shape();
  s.moveTo(0,0); s.bezierCurveTo(-.13,.40,-.04,.82,.70,1.17);
  s.quadraticCurveTo(.63,.77,.40,.59); s.lineTo(.53,.62);
  s.quadraticCurveTo(.34,.28,.08,.18); s.closePath();
  return s;
}

const outfitColors=[0x9c3346,0x267771,0x3c618e,0xc47731,0x6a497f];
export function dressYardVisitor(T,body,head,o) {
  const i=Math.abs(o.seed||7), cloth=outfitColors[i%outfitColors.length], cream=0xffdfa1;
  const chest=ornament(T,'手縫翻領與絲緞領結');
  for(const side of [-1,1]) chest.put(new T.SphereGeometry(1,10,6),cream,side*.060,.728,.083,
    .083,.037,.083,0,0,side*.29);
  chest.relief(ribbon(T),cloth,0,.697,.138,.105);
  chest.put(new T.OctahedronGeometry(.026),0xf8b34c,0,.70,.153);
  for (const y of [.62,.56]) chest.put(new T.SphereGeometry(.013,6,4),0xe9ad52,.016,y,.17);
  chest.finish(body);
  if (o.seed===4242 || o.hat || o.flyers) return;
  const hat=ornament(T,'小鎮居民的帽飾');
  if (o.style==='pony'||o.style==='long'||o.style==='bun') {
    hat.relief(ribbon(T),cloth,-.15,.18,.17,.105,.36);
    hat.put(new T.SphereGeometry(.028,8,5),cream,-.15,.18,.18);
  } else if (o.style==='cap' || i%3===0) {
    if(o.style!=='cap'){
      hat.put(new T.CylinderGeometry(.27,.32,.045,16),cloth,0,.17,0,1,1,.94,0,0,.09);
      hat.put(new T.SphereGeometry(.23,14,8),cloth,0,.19,-.02,1,.52,.93,0,0,.09);
    }
    hat.relief(quill(T),cream,.165,.205,.12,.17,-.37);
  }
  hat.finish(head);
}

export function dressTownShopper(T,chest,head,type,variant) {
  const colors={commoner:0x268374,rich:0x993c5e,adventurer:0x376b83,mage:0x78558b};
  const cloth=colors[type]||colors.commoner, cream=0xffdfa6;
  const coat=ornament(T,'手繪童話訂製衣領');
  if(type==='mage' || type==='rich') {
    // An open-front mantle lets the character's existing arm and hand poses read.
    const length=type==='mage'?.41:.28;
    const cloak=new T.LatheGeometry([
      new T.Vector2(.17,.415),new T.Vector2(.25,.38),
      new T.Vector2(.325,.31),new T.Vector2(.365,.40-length)
    ].reverse(),20,.64,Math.PI*2-1.28);
    cloak.scale(1,1,.88);
    coat.put(cloak,cloth,0,0,-.013);
    const hem=new T.LatheGeometry([new T.Vector2(.363,.418-length),
      new T.Vector2(.369,.40-length)].reverse(),20,.64,Math.PI*2-1.28);
    hem.scale(1,1,.88);coat.put(hem,0xf1bd6c,0,0,-.013);
  }
  for (const side of [-1,1]) coat.put(new T.SphereGeometry(1,10,6),cream,side*.095,.372,.16,
    .113,.055,.085,0,0,side*.32);
  coat.relief(ribbon(T),cloth,0,.345,.227,.14);
  coat.put(new T.OctahedronGeometry(.039),0xefac42,0,.345,.24);
  if(type==='commoner' || type==='adventurer'){
    const flap=new T.Shape(); flap.moveTo(-.13,.03);flap.lineTo(.13,.03);
    flap.quadraticCurveTo(.12,-.10,0,-.13);flap.quadraticCurveTo(-.12,-.10,-.13,.03);
    coat.relief(flap,0xcf854b,-.12,.088,.27,.75,-.15);
    coat.put(new T.SphereGeometry(.016,6,4),cream,-.125,.032,.306);
  }
  coat.finish(chest);
  const trim=ornament(T,'童話職業頭飾');
  if(type==='mage') {
    trim.relief(quill(T),0xf6c979,.25,.60,.25,.27,-.34);
  } else if(type==='rich' && variant==='m') {
    trim.put(new T.CylinderGeometry(.37,.39,.034,20),0x44374a,0,.56,0,1,1,.89,0,0,-.09);
    trim.put(new T.CylinderGeometry(.26,.22,.30,18),0x44374a,.016,.70,-.01,1,1,.89,0,0,-.09);
    trim.put(new T.CylinderGeometry(.237,.232,.059,18),cloth,.01,.607,-.01,1,1,.91,0,0,-.09);
    trim.put(new T.OctahedronGeometry(.034),0xf1bc65,-.04,.61,.207);
  } else if(type==='adventurer' || (variant==='m' && type==='commoner')) {
    trim.put(new T.CylinderGeometry(.34,.42,.044,18),cloth,0,.57,0,1,1,.94,0,0,.11);
    trim.put(new T.SphereGeometry(.33,16,9),cloth,-.022,.59,-.03,1,.52,.94,0,0,.11);
    trim.put(new T.CylinderGeometry(.325,.34,.042,18),0xb77746,0,.60,-.02,1,1,.96,0,0,.11);
    trim.relief(quill(T),cream,.20,.59,.21,.23,-.18);
  } else {
    trim.relief(ribbon(T),cloth,-.25,.52,.17,.17,.32);
    trim.put(new T.SphereGeometry(.038,9,6),cream,-.25,.52,.19);
  }
  trim.finish(head);
}

// Attach a brooch in the actor's own coordinate system so a skinned or articulated
// spirit can keep its original face, proportions, skeleton and baked animation.
export function dressShopSpirit(T,object) {
  object.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(object), size=bounds.getSize(new T.Vector3());
  if(bounds.isEmpty() || size.y<.001) return;
  const pivot = new T.Group();
  pivot.position.set(bounds.min.x+size.x*.63,bounds.min.y+size.y*.43,bounds.max.z-size.z*.10);
  pivot.scale.setScalar(Math.min(size.x,size.y)*.20);
  const icon=ornament(T,'琥珀三葉胸針');
  for(let i=-1;i<=1;i++) icon.put(new T.SphereGeometry(1,9,5),i===0?0x4b9d82:0x2f7868,
    i*.12,.05-Math.abs(i)*.045,0,.12,.225,.047,0,0,-i*.72);
  icon.put(new T.SphereGeometry(.085,8,5),0xe7ab49,0,-.09,.03,1,1,.55);
  const mesh=icon.finish(pivot);
  let anchor=object;
  object.traverse(node=>{
    if(anchor===object && (node.isBone || node.isGroup) && /^(chest|body|torso|spine1)$/i.test(node.name))
      anchor=node;
  });
  anchor.attach(pivot);
  return mesh;
}

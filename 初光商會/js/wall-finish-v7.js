// Versioned albedo skins only: reuse the existing wall, columns and window geometry.
export const wallSkins = Object.freeze([
  null,
  {file:'wall-lv1.webp',name:'暖金手抹灰泥',roughness:.96},
  {file:'wall-lv2.webp',name:'鼠尾草藤葉壁紙',roughness:.9},
  {file:'wall-lv3.webp',name:'象牙金葉織錦',roughness:.82},
  {file:'wall-lv4.webp',name:'孔雀青星紋金線',roughness:.72},
  {file:'wall-lv5.webp',name:'皇家深青鎏金花織',roughness:.66}
]);

export function applyWallFinish({T,building,level,width,material,metrics}) {
  const spec=wallSkins[level];
  if(!spec)return;
  const path='./assets/art-v7/'+spec.file;
  const record=metrics.wallFinish={level,name:spec.name,path,width:512,height:512,addedTriangles:0,addedDrawCalls:0,status:'loading',wrapping:'mirrored-repeat',repeat:[width/3.4,1]};
  const fallbackColor=material.color.clone();
  const texture=new T.TextureLoader().load(path,()=>{record.status='ready';},undefined,()=>{
    record.status='error';
    metrics.errors.push('牆面貼圖載入失敗：'+path);
    material.map=null;material.color.copy(fallbackColor);material.needsUpdate=true;
    document.dispatchEvent(new CustomEvent('firstlight-asset-error',{detail:{message:'牆面貼圖載入失敗，已使用原牆面底色',path}}));
  });
  texture.encoding=T.sRGBEncoding;
  // Mirroring prevents a hard luminance seam without re-painting generated pixels.
  texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;
  texture.repeat.set(width/3.4,1);
  texture.anisotropy=2;
  material.map=texture;material.color.setHex(0xffffff);material.roughness=spec.roughness;
  material.addEventListener('dispose',()=>texture.dispose());
  material.needsUpdate=true;
  building.traverse(o=>{if(o.material===material){o.userData.ownedMaterial=true;o.userData.ownedTexture=true;o.userData.wallFinishV7=true;}});
}

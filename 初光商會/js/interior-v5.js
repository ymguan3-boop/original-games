// Wall art and carving add refinement without occupying another navigation cell.
export function decorateInterior({T,parent,level,width,box,cylinder,label,mats,metrics}){
 const {wood,dark,cream,gold,green,velvet,marble}=mats,loader=new T.TextureLoader();
 const art=(path,x,y,z,w,h,transparent=false)=>{const tex=loader.load(path,()=>{metrics.interiorTextures||=[];if(!metrics.interiorTextures.includes(path))metrics.interiorTextures.push(path);});tex.encoding=T.sRGBEncoding;const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent,alphaTest:transparent?.1:0,side:T.DoubleSide}));p.position.set(x,y,z);Object.assign(p.userData,{ownedGeometry:true,ownedMaterial:true,ownedTexture:true,noOutline:true});parent.add(p);return p;};
 const frame=(x,y,size)=>{box(size+.16,size+.16,.13,dark,x,y,.005,parent);box(size+.10,size+.10,.13,gold,x,y,.045,parent);box(size+.035,size+.035,.14,wood,x,y,.075,parent);art('./assets/art-v5/guild-valley.webp',x,y,.151,size,size);for(const dx of [-1,1])for(const dy of [-1,1]){const corner=box(.13,.13,.045,gold,x+dx*(size+.04)/2,y+dy*(size+.04)/2,.155,parent);corner.rotation.z=Math.PI/4;}};
 // Mount the entire sign in front of the structural posts, not in the wall plane.
 const sx=6.45;box(4.15,.62,.16,dark,sx,2.96,.13,parent);box(4.04,.51,.17,gold,sx,2.96,.17,parent);box(3.90,.43,.18,green,sx,2.96,.21,parent);
 label('初 光 商 會',sx,2.96,.307,3.75,parent);metrics.guildSign={x:sx,y:2.96,z:.307,postFront:-.075};
 art('./assets/art-v5/quest-prestige.webp',10,.32,2.493,.30,.33,true);
 metrics.upgradeDecor=['建築等級飾條'];return; // Portable decorations are bought and placed by the player.

 if(level>=2){frame(4.45,1.98,1.28);metrics.upgradeDecor.push('初光谷風景畫');for(const x of [4.45]){box(1.45,.07,.28,wood,x,1.20,.03,parent);}}
 if(level>=3){frame(13.50,2.00,1.45);metrics.upgradeDecor.push('黃銅畫框','拱形壁板');for(const x of [4.45,13.50])for(const d of [-.85,.85]){cylinder(.04,1.75,gold,x+d,2.05,.04,parent);}}
 if(level>=4){metrics.upgradeDecor.push('寶石藝術展示','絲絨壁飾');for(const x of [width-1.5]){box(1.5,2.25,.1,velvet,x,1.98,-.17,parent);box(1.7,.10,.24,gold,x,3.11,.0,parent);box(1.40,.13,.36,marble,x,1.13,.05,parent);const jewel=new T.Mesh(new T.OctahedronGeometry(.27),new T.MeshStandardMaterial({color:0x429e9a,metalness:.4,roughness:.2}));Object.assign(jewel.userData,{ownedGeometry:true,ownedMaterial:true});jewel.position.set(x,1.55,.1);parent.add(jewel);}}
 if(level>=5){metrics.upgradeDecor.push('傳奇商會壁章','金飾藝術長廊');art('./assets/art-v5/quest-prestige.webp',width-2.2,2.1,.05,1.55,1.8,true);for(let x=13.5;x<width-1;x+=3){box(2.2,.06,.16,gold,x,3.18,.04,parent);for(const d of [-1.06,1.06])cylinder(.055,2.9,cream,x+d,1.62,.035,parent);}}
}

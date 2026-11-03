/* Preview-only, joint-mounted Reaper cosplay for the existing hero. */
window.createReaperCostume=function(T,hero){
 const cloth=new T.MeshStandardMaterial({color:0x010205,roughness:.87,side:T.DoubleSide}),lining=new T.MeshStandardMaterial({color:0x030712,roughness:.7,side:T.DoubleSide}),silver=new T.MeshStandardMaterial({color:0x536875,metalness:.78,roughness:.3}),glow=new T.MeshStandardMaterial({color:0x57deed,emissive:0x168aa6,emissiveIntensity:.7,metalness:.35,roughness:.3}),belt=new T.MeshStandardMaterial({color:0x24202c,roughness:.8});
 const groups=[],original=[];
 hero.traverse(o=>{if(!o.isMesh)return;const key=o.userData.part?.m;if(['shirt','shirtLight','shorts','shoe','sole'].includes(key))original.push({o,material:o.material,key});});
 const node=n=>hero.getObjectByName(n),group=(n,name)=>{const g=new T.Group();g.name=name;node(n).add(g);groups.push(g);return g;};
 function mesh(g,geo,mat,pos,scale){const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;g.add(m);return m;}
 function line(g,points,mat,r=.007){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(g,new T.TubeGeometry(curve,48,r,8,false),mat);}
 const hood=group('head','死神兜帽');
 // Open face aperture, closed back, fitted around the existing head and hair.
 const vertices=[],indices=[],rings=18,segments=64;
 for(let j=0;j<=rings;j++){let t=j/rings,z=.23-.57*t;
 // Keep the full head width through the crown, then close over the back of the skull.
 const cap=t<.64?1:Math.sqrt(Math.max(0,1-((t-.64)/.36)**2));
 const rx=(.314+.018*Math.sin(Math.PI*t))*cap,ry=(.365+.012*Math.sin(Math.PI*t))*cap;
 for(let i=0;i<=segments;i++){let a=i/segments*Math.PI*2;vertices.push(rx*Math.cos(a),.33+ry*Math.sin(a),z);}}
 for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){let a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hg.setIndex(indices);hg.computeVertexNormals();mesh(hood,hg,cloth);
 line(hood,Array.from({length:65},(_,i)=>{let a=i/64*Math.PI*2;return [.313*Math.cos(a),.33+.368*Math.sin(a),.233]}),silver,.009);
 mesh(hood,new T.OctahedronGeometry(.055),glow,[0,.702,.235],[.65,1,.35]);
 const torso=group('chest','死神長袍胸甲');
 // Raised skull clasp covers the everyday shirt motif.
 mesh(torso,new T.SphereGeometry(.065,24,16),silver,[.14,.34,.204],[.85,1,.45]);
 for(const x of [.118,.162])mesh(torso,new T.SphereGeometry(.015,16,12),cloth,[x,.35,.235],[1,1,.4]);
 for(const x of [.12,.14,.16])mesh(torso,new T.BoxGeometry(.012,.027,.015),silver,[x,.282,.221]);
 mesh(torso,new T.CylinderGeometry(.275,.292,.13,48),belt,[0,.015,0],[1,1,.72]);
 mesh(torso,new T.OctahedronGeometry(.07),silver,[0,.025,.225],[1,.85,.35]);
 mesh(torso,new T.OctahedronGeometry(.044),glow,[0,.025,.25],[.7,1,.3]);
 for(const side of [-1,1]){line(torso,[[side*.22,.46,.13],[side*.13,.30,.208],[side*.035,.08,.225]],silver,.01);}
 // Back mantle, with its front left open for the hands and weapon.
 // The neck-to-shoulder yoke meets the hood hem and the torso before flaring.
 const bodyProfile=hero.userData.heroCostumeFit.profile;
 const fittedProfile=[new T.Vector2(.31,-.20),...bodyProfile.map(([r,y])=>new T.Vector2(r+.014,y))];
 const cape=new T.LatheGeometry(fittedProfile,64,Math.PI/2,Math.PI);cape.scale(1,1,.70);mesh(torso,cape,cloth);
 const collar=new T.LatheGeometry([...bodyProfile.filter(([,y])=>y>=.44).map(([r,y])=>new T.Vector2(r+.017,y)),new T.Vector2(.095,.59)],48);collar.scale(1,1,.72);mesh(torso,collar,cloth);
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,shoulder=group('upperArm'+side,'死神肩甲'+side);
 mesh(shoulder,new T.SphereGeometry(.13,32,20),silver,[0,-.035,0],[1.1,.62,1.1]);
 mesh(shoulder,new T.OctahedronGeometry(.035),glow,[sign*.08,-.025,.10],[1,1,.4]);
 const cuff=group('forearm'+side,'死神袖口'+side);
 // Build the sleeve along the real elbow-to-wrist axis, including the small lateral offset.
 const fore=node('forearm'+side),hand=node('hand'+side);hero.updateMatrixWorld(true);
 const end=fore.worldToLocal(hand.getWorldPosition(new T.Vector3())),length=end.length(),direction=end.clone().normalize();
 const sleeve=mesh(cuff,new T.CylinderGeometry(.068,.073,length-.014,32),cloth,end.clone().multiplyScalar(.47).toArray());sleeve.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
 const hem=mesh(cuff,new T.TorusGeometry(.067,.006,8,32),silver,end.clone().multiplyScalar(.91).toArray());hem.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);
 const skirt=group('thigh'+side,'分片袍尾'+side);
 const geo=new T.CylinderGeometry(.17,.23,.45,32,1,true,0,Math.PI*2);geo.scale(1,1,.88);
 mesh(skirt,geo,cloth,[0,-.09,0]);
 line(skirt,[[sign*.12,.13,.12],[sign*.16,-.10,.16],[sign*.18,-.31,.17]],glow,.006);
 const boot=group('shin'+side,'死神護脛'+side);mesh(boot,new T.CylinderGeometry(.074,.083,.20,24),lining,[0,-.10,0]);
 line(boot,[[0,-.02,.078],[0,-.16,.086]],silver,.009);
 }
 const button=document.createElement('button');button.textContent='死神套裝：開';let enabled=true;
 const label=document.createElement('div');label.className='title';label.textContent='COSPLAY · 星冥收割者';document.querySelector('.panel a').before(label,button);
 function setEnabled(on){enabled=on;groups.forEach(g=>g.visible=on);for(const x of original)x.o.material=on?(x.key==='shirtLight'?lining:cloth):x.material;button.textContent='死神套裝：'+(on?'開':'關');}
 button.onclick=()=>setEnabled(!enabled);
 return {setEnabled,groups};
};

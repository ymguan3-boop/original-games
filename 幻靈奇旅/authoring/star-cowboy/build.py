"""Blender-native character assets. Z up, -Y forward. Rebuild with Blender --background --python this file."""
import bpy, math, json, random
from math import sin, cos, pi
from mathutils import Vector, Quaternion
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
random.seed(11)

def material(name,color,metal=0,rough=.42,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emit
    m.diffuse_color=(*rgb,1);return m

def finish(o,name,m,bone,smooth=True):
    o.name=name;o.data.materials.append(m)
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for f in o.data.polygons:f.use_smooth=smooth
    o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE')
    parts.append(o);return o
def ell(name,p,s,m,b='chest',rot=(0,0,0),seg=40):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=24,location=p)
    o=bpy.context.object;o.scale=s;o.rotation_euler=rot;return finish(o,name,m,b)
def box(name,p,s,m,b='chest',r=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Tailored round edges','BEVEL');mod.width=r;mod.segments=3
    bpy.ops.object.modifier_apply(modifier=mod.name);return finish(o,name,m,b)
def tube(name,pts,r,m,b='chest'):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3
    sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
    for v,p in zip(sp.points,pts):v.co=(*p,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,m,b)
def limb(name,a,b,r,m,bone):
    a,b=Vector(a),Vector(b);o=ell(name,(a+b)/2,(r,r,(b-a).length/2+r*.35),m,bone)
    # Sphere already transformed, orient its actual coordinates about midpoint.
    q=(b-a).to_track_quat('Z','Y');mid=(a+b)/2
    for v in o.data.vertices:v.co=mid+q@(v.co-mid)
    return o
def mesh(name,vs,fs,m,b,solid=0):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    if solid:
        bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=solid;bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m,b)
def star(name,x,y,z,r,m,b='chest',n=5):
    vs=[(x,y-.015,z)]+[(x+sin(i*pi/n)*r*(1 if i%2==0 else .43),y,z+cos(i*pi/n)*r*(1 if i%2==0 else .43)) for i in range(n*2)]
    return mesh(name,vs,[(0,i+1,(i+1)%(2*n)+1) for i in range(2*n)],m,b,.014)
def jewel(name,p,s,b='chest'):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p);o=bpy.context.object;o.scale=s;finish(o,name,gold,b,False)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(p[0],p[1]-.014,p[2]));o=bpy.context.object;o.scale=tuple(a*.78 for a in s);finish(o,name+' sapphire',blue,b,False)
def ring(name,c,rx,rz,m,b='head',r=.009):
    return tube(name,[(c[0]+rx*cos(t*2*pi/64),c[1],c[2]+rz*sin(t*2*pi/64)) for t in range(65)],r,m,b)

def face(z,rx,ry,rz,female):
    ell('Soft sculpted face',(0,0,z),(rx,ry,rz),skin,'head')
    ell('Jaw',(0,-.035,z-rz*.41),(rx*.78,ry*.86,rz*.63),skin,'head')
    for s,sd in [(1,'L'),(-1,'R')]:
        ell('Ear'+sd,(s*rx*.97,.005,z-.015),(.065,.055,.105),skin,'head')
        ell('Ear inner'+sd,(s*rx*1.025,-.037,z-.015),(.031,.018,.064),blush,'head')
        x=s*rx*.43;ez=z+.015;y=-ry*.90
        ell('Eye white'+sd,(x,y,ez),(rx*.265,.035,rz*.18),white,'eye'+sd)
        ell('Amber iris'+sd,(x,y-.03,ez),(.043,.012,.057),iris,'eye'+sd)
        ell('Pupil'+sd,(x,y-.039,ez),(.024,.008,.039),black,'eye'+sd)
        ell('Catch light'+sd,(x-.012,y-.046,ez+.023),(.012,.006,.016),white,'eye'+sd)
        tube('Upper eyelash'+sd,[(x+(j-6)*rx*.045,y-.028,ez+.035+.029*sin(j*pi/12)) for j in range(13)],.008 if female else .006,hair,'eye'+sd)
        tube('Eyebrow'+sd,[(x+(j-5)*rx*.046,y+.018,ez+.105+.025*sin(j*pi/10)) for j in range(11)],.011,hair,'brow'+sd)
        ell('Cheek blush'+sd,(s*rx*.61,-ry*.82,z-.085),(.061,.012,.025),blush,'head')
    ell('Nose bridge',(0,-ry*.97,z-.035),(.033,.045,.071),skin,'head')
    ell('Nose tip',(0,-ry*1.09,z-.072),(.043,.038,.028),skin,'head')
    ell('Smile opening',(0,-ry*1.06,z-rz*.42),(.067 if female else .10,.008,.018 if female else .042),mouth,'mouth')
    ell('Smile teeth',(0,-ry*1.095,z-rz*.40),(.049 if female else .075,.006,.008 if female else .012),white,'mouth')
    # Back cap and overlapping sculpted locks keep forehead, glasses and eyes unobscured.
    ell('Hair back',(0,.075,z+.115),(rx*1.04,ry*.92,rz*.90),hair,'head')
    for i in range(11):
        x=(i-5)*rx*.18
        ell('Swept fringe',(x,-ry*.46,z+rz*.65-abs(i-5)*.013),(rx*.23,.10,rz*(.33 if female else .25)),hair2 if i%3==0 else hair,'head',rot=(0,-.35+(i-5)*.10,-.18))
    if female:
        for s in [-1,1]:
            ring('Fine gold spectacles',(s*rx*.43,-ry-.044,z+.015),rx*.34,rz*.225,gold)
            tube('Spectacle temple',[(s*rx*.78,-ry-.035,z+.03),(s*rx*.99,.02,z+.065)],.007,gold,'head')
            jewel('Earring',(s*rx*1.01,-.028,z-.23),(.036,.022,.080),'head')
        tube('Bridge',[(-.035,-ry-.045,z+.035),(0,-ry-.058,z+.05),(.035,-ry-.045,z+.035)],.007,gold,'head')
        ell('High bun',(0,.12,z+rz*.95),(.15,.14,.16),hair,'head')
        for i in range(8):
            x=(i-3.5)*.043
            tube('Ponytail strand',[(x+.015*sin(j*.6+i),.14+.17*sin(j*pi/18),z+.29-j*.058) for j in range(19)],.046,hair2 if i%3==0 else hair,'hairTail')
        star('Hair star',rx*.85,-.02,z+.29,.115,gold,'head',8)
        jewel('Hair sapphire',(rx*.85,-.043,z+.29),(.034,.02,.058),'head')

def fabric(name,rows,angles,m,b,folds=8):
    # Concentric elliptical rings, with a deliberate open front. Gold trim follows actual cloth edge.
    vs=[];n=65
    for k,(z,rx,ry) in enumerate(rows):
        for j in range(n):
            a=angles[0]+(angles[1]-angles[0])*j/(n-1)
            wave=1+.036*sin(a*folds+k*.45)
            vs.append((rx*sin(a)*wave,-ry*cos(a)*wave,z+.018*sin(a*folds)*(k/(len(rows)-1))))
    fs=[(k*n+j,k*n+j+1,(k+1)*n+j+1,(k+1)*n+j) for k in range(len(rows)-1) for j in range(n-1)]
    o=mesh(name,vs,fs,m,b,.012)
    for ids in [[k*n for k in range(len(rows))],[k*n+n-1 for k in range(len(rows))],list(range((len(rows)-1)*n,len(rows)*n))]:
        tube(name+' gold piping',[vs[i] for i in ids],.012,gold,b)
    return o,vs

def build(kind):
    global parts,skin,blush,white,iris,black,hair,hair2,mouth,gold,blue
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)
    parts=[];mage=kind=='starlight-mage';height=2.332 if mage else 1.7
    skin=material('Warm porcelain','edba91');blush=material('Rosy cheeks','d98e76');white=material('Warm ivory','fff2d9');iris=material('Amber iris','86502c');black=material('Pupil','16121b');mouth=material('Smile','7c3436')
    hair=material('Chestnut hair','39251e');hair2=material('Hair highlights','60402b');gold=material('Antique gold','dfb55b',.75,.25);blue=material('Sapphire','187eea',.45,.2,.25)
    navy=material('Midnight blue silk','172747',.1,.35);ivory=material('Ivory satin','eee3d3',.05,.47);brown=material('Saddle leather','80502c');light=material('Leather raised seams','bb8551');denim=material('Indigo denim','31577a');red=material('Crimson scarf','b72f28');steel=material('Revolver steel','45505a',.8,.23)
    hip=1.58 if mage else .91;chest=2.02 if mage else 1.22;shoulder=2.52 if mage else 1.52
    hz=2.96 if mage else 1.94;hw=.255 if mage else .32
    spec={'root':((0,0,0),(0,0,.15),None),'hips':((0,0,hip),(0,0,chest),'root'),'chest':((0,0,chest),(0,0,shoulder),'hips'),'head':((0,0,shoulder+.12),(0,0,hz+.30),'chest')}
    for s,sd in [(1,'L'),(-1,'R')]:
        sx=s*(.34 if mage else .31);ex=s*(.46 if mage else .43);wx=s*(.53 if mage else .49)
        spec['upperArm'+sd]=((sx,0,shoulder),(ex,0,shoulder-.34),'chest')
        spec['forearm'+sd]=((ex,0,shoulder-.34),(wx,-.045,shoulder-.65),'upperArm'+sd)
        spec['hand'+sd]=((wx,-.045,shoulder-.65),(wx,-.045,shoulder-.78),'forearm'+sd)
        if not mage:spec['weapon'+sd]=((wx,-.09,shoulder-.65),(wx,-.30,shoulder-.65),'hand'+sd)
        lx=s*(.15 if mage else .18);kz=.83 if mage else .48
        spec['thigh'+sd]=((lx,0,hip),(lx,-.025,kz),'hips')
        spec['shin'+sd]=((lx,-.025,kz),(lx,0,.20),'thigh'+sd)
        spec['foot'+sd]=((lx,0,.20),(lx,-.18,.10),'shin'+sd)
        for part,zz in [('eye',hz+.015),('brow',hz+.12)]:spec[part+sd]=((s*hw*.43,-.24,zz),(s*hw*.43,-.24,zz+.05),'head')
    spec['mouth']=((0,-.23,hz-.15),(0,-.23,hz-.10),'head')
    if mage:
        spec['skirt']=((0,0,hip),(0,0,.45),'hips');spec['cape']=((0,.12,shoulder),(0,.16,1.3),'chest');spec['hairTail']=((0,.15,hz+.2),(0,.22,hz-.7),'head')
    bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name=kind+'_Rig';rig.data.edit_bones.remove(rig.data.edit_bones[0])
    for n,(h,t,p) in spec.items():
        b=rig.data.edit_bones.new(n);b.head=h;b.tail=t
        if p:b.parent=rig.data.edit_bones[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    ell('Pelvis',(0,0,hip),(.24,.16,.20),ivory if mage else denim,'hips')
    ell('Tailored bodice',(0,0,(chest+shoulder)/2),(.28,.18,(shoulder-chest)*.62),ivory,'chest')
    ell('Waist continuous underlayer',(0,0,chest-.12),(.23,.16,.27),navy if mage else ivory,'chest')
    limb('Neck',(0,0,shoulder-.01),(0,0,hz-.24),.105,skin,'head')
    face(hz,hw,.225 if mage else .26,.32 if mage else .34,mage)
    # Voxel-union the facial volumes so chin and nose have no intersecting surface seams.
    facial=[o for o in parts if o.name in ['Soft sculpted face','Jaw','Nose bridge','Nose tip']]
    bpy.ops.object.select_all(action='DESELECT')
    for o in facial:o.select_set(True);parts.remove(o)
    bpy.context.view_layer.objects.active=facial[0];bpy.ops.object.join();o=bpy.context.object
    o.data.remesh_voxel_size=.008;bpy.ops.object.voxel_remesh()
    smooth=o.modifiers.new('Soft facial transitions','SMOOTH');smooth.factor=.7;smooth.iterations=6;bpy.ops.object.modifier_apply(modifier=smooth.name)
    o.vertex_groups.clear();o.vertex_groups.new(name='head').add(list(range(len(o.data.vertices))),1,'REPLACE')
    for f in o.data.polygons:f.use_smooth=True
    parts.append(o)
    for s,sd in [(1,'L'),(-1,'R')]:
        a,e,_=spec['upperArm'+sd];_,w,_=spec['forearm'+sd]
        limb('Upper arm'+sd,a,e,.09 if mage else .105,skin,'upperArm'+sd)
        ell('Elbow'+sd,e,(.085,.087,.09),skin,'forearm'+sd)
        limb('Forearm'+sd,e,w,.069 if mage else .086,skin,'forearm'+sd)
        ell('Shoulder sleeve'+sd,a,(.13,.14,.13),ivory,'upperArm'+sd)
        x,y,z=w
        # Mirrored palm planes: fingers curl around each handle, thumb lies forward (-Y).
        ell('Palm'+sd,(x,y,z-.075),(.065,.053,.095),skin if mage else brown,'hand'+sd)
        for j in range(4):
            ell('Curled finger'+sd+str(j),(x+s*.029,y-.018,z-.035-j*.032),(.042,.044,.019),skin if mage else brown,'hand'+sd)
        ell('Forward thumb'+sd,(x-s*.035,y-.066,z-.04),(.028,.04,.046),skin if mage else brown,'hand'+sd,rot=(.25,s*.30,0))
        h,k,_=spec['thigh'+sd];_,an,_=spec['shin'+sd]
        limb('Thigh'+sd,h,k,.115 if mage else .135,skin if mage else denim,'thigh'+sd)
        ell('Knee'+sd,k,(.096,.10,.105),skin if mage else denim,'shin'+sd)
        limb('Calf'+sd,k,an,.075 if mage else .10,skin if mage else denim,'shin'+sd)
        ell('Boot'+sd,(an[0],-.075,.13),(.092 if mage else .14,.19,.12),ivory if mage else brown,'foot'+sd)
        box('Sole'+sd,(an[0],-.065,.042),(.19 if mage else .28,.37,.055),gold if mage else hair,'foot'+sd,.02)
        if mage:
            jewel('Shoe jewel'+sd,(an[0],-.23,.15),(.041,.018,.05),'foot'+sd)
            tube('Gold ankle strap'+sd,[(an[0]+.082*cos(t*pi/16),.075*sin(t*pi/16),.22) for t in range(33)],.009,gold,'foot'+sd)
            # Flared bell sleeves, bound wholly to forearm, clear of wrist and fingers.
            for j in range(3):
                ell('Sleeve fold'+sd,(e[0]+s*.03*j,e[1]+.028,e[2]-.055-j*.05),(.125+j*.017,.13+j*.018,.08),ivory,'forearm'+sd)
            jewel('Sleeve gem'+sd,(e[0],-.14,e[2]),(.036,.017,.065),'forearm'+sd)
        else:
            ell('Boot shaft'+sd,(an[0],.015,.27),(.135,.12,.20),brown,'shin'+sd)
            tube('Boot cuff'+sd,[(an[0]+.14*cos(t*pi/24),.125*sin(t*pi/24),.43) for t in range(49)],.012,light,'shin'+sd)
            box('Boot strap'+sd,(an[0],-.12,.23),(.26,.035,.055),light,'foot'+sd)
            star('Spur'+sd,an[0]+s*.15,.09,.19,.065,gold,'foot'+sd,6)
            # Parallel forward barrels and mirror-image grips; muzzle never points into the body.
            gunx=x;gy=y-.045;gz=z-.005
            box('Revolver grip'+sd,(gunx,gy,gz-.075),(.075,.09,.15),brown,'hand'+sd)
            box('Revolver receiver'+sd,(gunx,gy-.055,gz+.055),(.10,.17,.095),steel,'hand'+sd)
            limb('Revolver barrel'+sd,(gunx,gy-.08,gz+.09),(gunx,gy-.37,gz+.09),.034,steel,'hand'+sd)
            ring('Muzzle rim'+sd,(gunx,gy-.39,gz+.09),.037,.037,gold,'hand'+sd,.007)
            ell('Muzzle bore'+sd,(gunx,gy-.392,gz+.09),(.025,.004,.025),black,'hand'+sd)
            limb('Cylinder'+sd,(gunx,gy-.04,gz+.046),(gunx,gy-.14,gz+.046),.055,steel,'hand'+sd)
            for q in range(6):
                xx=gunx+.05*cos(q*pi/3);zz=gz+.046+.05*sin(q*pi/3)
                tube('Cylinder flute'+sd,[(xx,gy-.045,zz),(xx,gy-.125,zz)],.006,gold,'hand'+sd)
            star('Grip star'+sd,gunx,gy-.047,gz-.09,.026,gold,'hand'+sd)
    if mage:
        # Layered gown leaves the centre leg slit open; cape stays behind the arms.
        fabric('Ivory pleated gown',[(hip+.1,.24,.17),(1.35,.36,.26),(1.0,.49,.35),(.65,.65,.44),(.34,.79,.51),(.09,.88,.57)],(.22,2*pi-.22),ivory,'skirt',12)
        # Diagonal front drape and ruffled hem give the skirt a layered, asymmetric silhouette.
        drape=[]
        for k in range(18):
            t=k/17
            for j in range(25):
                v=j/24;x=-.22+v*(.35+.30*t)-.36*t
                drape.append((x,-.20-.38*t-.028*sin(v*6*pi),hip+.12-1.42*t+.20*v*t+.025*sin(v*6*pi)))
        mesh('Diagonal ivory front drape',drape,[(k*25+j,k*25+j+1,(k+1)*25+j+1,(k+1)*25+j) for k in range(17) for j in range(24)],ivory,'skirt',.012)
        tube('Drape gold edge',[drape[k*25+24] for k in range(18)],.011,gold,'skirt')
        _,vs=fabric('Royal blue overskirt',[(hip+.24,.245,.18),(hip,.31,.22),(1.15,.47,.34),(.75,.66,.45),(.36,.83,.53),(.15,.93,.58)],(.82,2*pi-.82),navy,'skirt',8)
        fabric('Shoulder mantle',[(shoulder+.04,.34,.21),(shoulder-.20,.41,.26),(2.05,.42,.28),(1.6,.50,.36),(1.1,.65,.46),(.6,.77,.53),(.28,.86,.57)],(1.35,2*pi-1.35),navy,'cape',7)
        for idx in range(72,len(vs)-20,21):
            x,y,z=vs[idx]
            if y<.12:star('Gown constellation',x,y-.018,z,.029+(idx%3)*.005,gold,'skirt',4)
        for s in [-1,1]:
            constellation=[]
            for j in range(7):
                t=j/6;a=s*(1.04+.16*sin(j*1.8));rx=.34+.57*t;ry=.24+.34*t
                p=(rx*sin(a),-ry*cos(a)-.025,1.45-1.18*t)
                star('Blue skirt starwork',*p,.027 if j%2 else .043,gold,'skirt',4);constellation.append(p)
            tube('Constellation embroidery',constellation,.004,gold,'skirt')
        for z,rx,ry in [(chest-.06,.24,.175),(chest-.28,.25,.177)]:
            tube('Corset gold edging',[(rx*sin(t*2*pi/80),-ry*cos(t*2*pi/80),z+.035*cos(t*pi/20)) for t in range(81)],.012,gold)
        jewel('Waist sapphire',(0,-.195,chest-.17),(.09,.035,.15))
        jewel('Collar sapphire',(0,-.13,shoulder+.07),(.045,.025,.075),'head')
        tube('Necklace',[(-.21,-.14,shoulder),(-.15,-.20,shoulder-.14),(0,-.205,shoulder-.22),(.15,-.20,shoulder-.14),(.21,-.14,shoulder)],.009,gold)
        jewel('Bodice gem',(0,-.22,shoulder-.22),(.052,.022,.078))
        for s in [-1,1]:
            star('Shoulder brooch',s*.30,-.16,shoulder,.09,gold)
            tube('Bodice filigree',[(s*(.04+j*.015),-.183-.025*sin(j*pi/12),shoulder-.25+.045*sin(j*.8)) for j in range(13)],.006,gold)
        # Anatomical right hand (-X) holds the staff; left hand remains free for casting.
        x,y,z=spec['handR'][0];sy=y-.06
        limb('Staff shaft',(x,sy,.10),(x,sy,2.89),.028,navy,'handR')
        for zz in [.22,.38,1.72,1.87,2.57,2.76]:ring('Staff gold collar',(x,sy,zz),.037,.028,gold,'handR',.013)
        for tilt in [-.55,.55]:
            pts=[(x+.235*cos(t*pi/48)*cos(tilt),sy+.08*cos(t*pi/48)*sin(tilt),3.02+.32*sin(t*pi/48)) for t in range(97)]
            tube('Armillary staff crown',pts,.017,gold,'handR')
        ell('Celestial globe',(x,sy,3.02),(.145,.135,.17),blue,'handR')
        star('Staff north star',x,sy-.15,3.02,.19,gold,'handR',4)
        for s in [-1,1]:
            tube('Crown pendant',[(x+s*.20,sy,2.93),(x+s*.23,sy,2.70)],.007,gold,'handR')
            jewel('Hanging crystal',(x+s*.23,sy,2.66),(.043,.028,.087),'handR')
    else:
        # Sculpted cattleman hat with curled brim, recessed crown and stitched edge.
        vs=[];N=96
        for r in [.0,.25,.5,.75,1]:
            for j in range(N):
                a=j*2*pi/N;vs.append((.62*r*cos(a),.42*r*sin(a),2.19+.11*r*r*cos(a)**2-.045*r*sin(a)))
        mesh('Curled cowboy brim',vs,[(k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j) for k in range(4) for j in range(N)],brown,'head',.035)
        tube('Hat brim piping',vs[-N:]+[vs[-N]],.009,light,'head')
        ell('Cattleman crown',(0,.02,2.28),(.33,.28,.22),brown,'head')
        tube('Crown centre crease',[(0,-.15+j*.02,2.467+.014*sin(j*pi/15)) for j in range(16)],.013,light,'head')
        for j in range(24):
            a=j*2*pi/24;ell('Hat band rivet',(.33*cos(a),.283*sin(a),2.25),(.014,.014,.014),gold,'head',seg=16)
        star('Sheriff hat badge',0,-.279,2.34,.104,gold,'head')
        for s in [-1,1]:
            ell('Leather waistcoat',(s*.175,-.10,1.36),(.095,.103,.19),brown)
            tube('Vest stitch',[(s*(.10+j*.004),-.203,1.20+j*.024) for j in range(13)],.006,light)
            box('Hip holster',(s*.31,.025,.78),(.14,.14,.28),brown,'hips')
            tube('Holster seam',[(s*.32,-.051,.67),(s*.37,-.051,.76),(s*.35,-.051,.9)],.007,light,'hips')
        # Red triangular scarf and back knot.
        mesh('Red neckerchief',[(-.23,-.14,1.62),(.23,-.14,1.62),(0,-.255,1.30),(0,-.23,1.55)],[(0,1,3),(1,2,3),(2,0,3)],red,'chest',.025)
        ell('Scarf knot',(0,.18,1.58),(.075,.06,.065),red)
        for s in [-1,1]:ell('Scarf tails',(s*.09,.20,1.49),(.06,.035,.14),red,rot=(0,s*.5,0))
        star('Sheriff chest badge',.19,-.21,1.46,.07,gold)
        tube('Leather belt',[(.26*cos(t*2*pi/64),.18*sin(t*2*pi/64),1.04) for t in range(65)],.045,brown,'hips')
        box('Gold belt buckle',(0,-.205,1.04),(.145,.035,.095),gold,'hips',.018)
        box('Buckle inset',(0,-.225,1.04),(.10,.01,.055),brown,'hips',.01)
        for z in [1.15,1.24,1.33]:ell('Shirt button',(0,-.188,z),(.014,.01,.014),gold)
    # Separate gun bones let the greeting holster the left weapon before waving.
    if not mage:
        for o in parts:
            if any(o.name.startswith(n) for n in ['Revolver','Muzzle','Cylinder','Grip star']):
                for sd in ['L','R']:
                    vg=o.vertex_groups.get('hand'+sd)
                    if vg:vg.name='weapon'+sd
    # One skinned mesh keeps draw calls reasonable; editable named material slots remain.
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name=kind+'_Body'
    mod=body.modifiers.new('Character skin','ARMATURE');mod.object=rig;body.parent=rig
    # Soft blended joins on continuous torso volumes.
    chestidx=body.vertex_groups.find('chest');hi=body.vertex_groups.get('hips')
    for v in body.data.vertices:
        if any(g.group==chestidx for g in v.groups) and v.co.z<chest-.06:
            t=max(0,min(1,(chest-.06-v.co.z)/.24));hi.add([v.index],t,'REPLACE');body.vertex_groups['chest'].add([v.index],1-t,'REPLACE')
    rig.scale=(height/(3.43 if mage else 2.50),)*3
    scene=bpy.context.scene;scene.render.fps=30
    rest={n:rig.data.bones[n].matrix_local.to_quaternion() for n in spec}
    def rot(n,x=0,y=0,z=0):
        q=Quaternion((1,0,0),x)@Quaternion((0,1,0),y)@Quaternion((0,0,1),z)
        rig.pose.bones[n].rotation_quaternion=rest[n].inverted()@q@rest[n]
    times={'Idle':3,'Walk':1.2,'Run':.8,'Attack':1.0 if not mage else 1.2,'Ultimate':2.4 if not mage else 3.0,'Hurt':.75,'Wave':1.8,'React':1.5,'Jump':1.2}
    footids=[v.index for v in body.data.vertices if v.co.z<.32 or any(body.vertex_groups[g.group].name.startswith('foot') for g in v.groups)]
    for action,duration in times.items():
        rig.animation_data_create();ac=bpy.data.actions.new(action);rig.animation_data.action=ac;frames=round(duration*30)
        for f in range(frames+1):
            u=f/frames;t=u*duration;phase=u*2*pi;air=0
            for pb in rig.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
            rot('chest',.018*sin(phase));rot('head',-.012*sin(phase))
            if mage:rot('cape',.018*sin(phase),.025*sin(phase));rot('hairTail',.035*sin(phase+.3))
            if action in ['Walk','Run']:
                run=action=='Run';amp=(.60 if mage else .82) if run else .36
                air=(.085 if mage else .13)*sin(phase)**2 if run else 0
                for s,sd in [(1,'L'),(-1,'R')]:
                    p=phase+(0 if s==1 else pi);rot('thigh'+sd,-amp*sin(p));rot('shin'+sd,(.8 if run else .4)*max(0,-sin(p)));rot('foot'+sd,-.18*max(0,-sin(p)))
                    rot('upperArm'+sd,(.09 if mage and sd=='R' else amp*.48)*sin(p));rot('forearm'+sd,-(.24 if run else .08))
                rot('hips',.04,0,.05*sin(phase));rot('chest',.12 if run else .03,0,-.07*sin(phase));rot('head',-.07 if run else 0)
                if mage:rot('skirt',-.06,0,.025*sin(phase));rot('cape',-.10 if run else -.04,.035*sin(phase))
            elif action in ['Attack','Ultimate']:
                ultimate=action=='Ultimate';envelope=sin(pi*u)**2
                if mage:
                    rot('upperArmL',-1.15*envelope,0,-.25*envelope);rot('forearmL',-.35*envelope);rot('handL',-.35*envelope)
                    rot('upperArmR',-.12*envelope,0,-.08*envelope);rot('forearmR',-.08*envelope)
                    rot('chest',-.045*envelope,0,.10*envelope);rot('head',.04*envelope)
                    if ultimate:air=.22*sin(pi*u)**2;rot('cape',-.16*envelope);rot('skirt',-.035*envelope)
                else:
                    # Quick alternating hip-fire, then six-shot fan. Arms remain outside torso/hat.
                    aim=min(1,u/.16,(1-u)/.18);aim=max(0,aim)
                    for s,sd in [(1,'L'),(-1,'R')]:
                        kick=max(0,1-abs(t-(.34 if sd=='R' else .54))/.08)
                        if ultimate:kick=max(max(0,1-abs(t-at)/.07) for at in ([.48,.92,1.36] if sd=='R' else [.70,1.14,1.58]))
                        rot('upperArm'+sd,-.22*aim+.09*kick,0,-s*.10*aim);rot('forearm'+sd,-.16*aim-.12*kick)
                    rot('hips',.03,0,.07*sin(phase));rot('chest',-.06*envelope,0,-.09*sin(phase));rot('thighL',-.12*envelope,0,-.10*envelope);rot('thighR',-.12*envelope,0,.10*envelope);rot('shinL',.24*envelope);rot('shinR',.24*envelope)
            elif action=='Hurt':
                e=sin(pi*u)**2;rot('chest',-.20*e);rot('head',-.10*e);rot('upperArmL',.15*e);rot('upperArmR',.10*e)
            elif action in ['Wave','React']:
                e=sin(pi*u)**2
                # Cowboy salutes with gun hand kept below shoulder; mage waves with free left hand.
                rot('upperArmL',-.55*e,0,-.65*e);rot('forearmL',-.40*e);rot('handL',0,.18*sin(phase*3)*e,0);rot('head',0,.10*e,.06*sin(phase))
                if not mage:rig.pose.bones['weaponL'].scale=(.001,.001,.001)
            elif action=='Jump':
                air=.55*sin(pi*u)**2;rot('thighL',-.20*sin(pi*u));rot('thighR',-.20*sin(pi*u));rot('shinL',.40*sin(pi*u));rot('shinR',.40*sin(pi*u))
            angry=sin(pi*u)**2 if action in ['Attack','Ultimate','Hurt'] else 0
            for s,sd in [(1,'L'),(-1,'R')]:
                rot('brow'+sd,0,0,s*.18*angry)
                rig.pose.bones['eye'+sd].scale=(1,1-.5*angry-.85*max(0,1-abs(u-.78)/.025) if action=='Idle' else 1-.4*angry,1)
            rig.pose.bones['mouth'].scale=(1,1+.65*angry,1)
            bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
            minz=min(ev.data.vertices[i].co.z for i in footids)
            # Root's rest local Y axis is world Z.
            rig.pose.bones['root'].location=rest['root'].inverted()@Vector((0,0,.016-minz+air))
            for pb in rig.pose.bones:
                for channel in ['rotation_quaternion','location','scale']:pb.keyframe_insert(data_path=channel,frame=f+1,group=pb.name)
        ac.use_fake_user=True;rig.animation_data.action=None
        tr=rig.animation_data.nla_tracks.new();tr.name=action;st=tr.strips.new(action,1,ac);st.action_frame_end=frames+1;tr.mute=True
    scene.frame_set(1)
    for pb in rig.pose.bones:pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
    rig['front']='-Y; glTF +Z';rig['character']='藍金星輝法師' if mage else '阿宏牛仔';rig['heightTarget']=height
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(kind+'.blend')))
    for tr in rig.animation_data.nla_tracks:tr.mute=False
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);body.select_set(True)
    out=ROOT/'models'/'spirits'/(kind+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_cameras=False,export_lights=False)
    report={'name':rig['character'],'model':str(out.relative_to(ROOT)),'height':height,'bones':len(spec),'triangles':sum(len(p.vertices)-2 for p in body.data.polygons),'animations':times,'bytes':out.stat().st_size}
    (HERE/(kind+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(report)

for kind in ['ahong-cowboy','starlight-mage']:build(kind)

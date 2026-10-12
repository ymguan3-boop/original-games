"""Independent Blender-native mesh / armature study for the two approved subjects.
Coordinates in helpers are X right / Y up / Z front, converted once into Blender.
No Three.js meshes or GLBs are imported to build this version.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi

ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
PALETTE={
 'skin':0xEDB68A,'skinlight':0xF4C8A0,'skinshadow':0xCD906D,'blush':0xDDA082,
 'royal':0x0D5CC8,'sky':0x6DC7F3,'blueedge':0x356FAE,'white':0xF8F8F0,'sole':0xD6DADE,
 'gray':0xA8A5A4,'graydark':0x8D8C8F,'hair':0x151413,'hairlight':0x302B24,
 'eye':0x643A24,'black':0x161A23,'mouth':0x702F29,'tongue':0xDA837D,'gold':0xFFC83D,
 'orange':0xEC8434,'orangebright':0xF5A24D,'cream':0xFFE8BE,'peach':0xE5A27A,
 'amber':0xC9711B,'fire':0xF46E26,'yellow':0xFFBD38,'core':0xFFF0A3,
}
MATS={}
def linear(c):
    def f(v):
        x=v/255
        return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
    return (*(f((c>>b)&255) for b in (16,8,0)),1)
for name,color in PALETTE.items():
    m=bpy.data.materials.new(name);m.diffuse_color=linear(color);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=linear(color)
    bs.inputs['Roughness'].default_value=.67 if name not in ('eye','amber','black') else .32
    if name in ('skin','skinlight') and 'Subsurface Weight' in bs.inputs:
        bs.inputs['Subsurface Weight'].default_value=.045
    MATS[name]=m

def xyz(v):return (v[0],-v[2],v[1])
PARTS=[]
def surface(name,verts,faces,material,bone,weights=None,sub=0):
    me=bpy.data.meshes.new(name);me.from_pydata([xyz(p) for p in verts],[],faces);me.update()
    obj=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(obj);me.materials.append(MATS[material])
    for p in me.polygons:p.use_smooth=True
    assignments={}
    for i,p in enumerate(verts):
        for key,value in (weights(p) if weights else {bone:1.0}).items():
            if value>0:assignments.setdefault(key,[]).append((i,value))
    for key,items in assignments.items():
        vg=obj.vertex_groups.new(name=key)
        for index,w in items:vg.add([index],w,'REPLACE')
    if sub:
        mod=obj.modifiers.new('Editable subdivision surface','SUBSURF');mod.levels=sub;mod.render_levels=sub
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    PARTS.append(obj);return obj

def ell(name,c,p,s,bone,n=28,m=18):
    v=[];f=[]
    for j in range(m+1):
        a=pi*j/m
        for i in range(n):
            b=2*pi*i/n;v.append((p[0]+s[0]*sin(a)*sin(b),p[1]+s[1]*cos(a),p[2]+s[2]*sin(a)*cos(b)))
    for j in range(m):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c1=(j+1)*n+(i+1)%n;d=(j+1)*n+i;f.append((a,d,c1,b))
    return surface(name,v,f,c,bone)

def loft(name,c,rings,bone,sub=1,weights=None,n=32):
    if rings[-1][1]<rings[0][1]:rings=list(reversed(rings))
    v=[];f=[]
    for x,y,z,rx,rz in rings:
        for i in range(n):
            a=2*pi*i/n;v.append((x+rx*sin(a),y,z+rz*cos(a)))
    for j in range(len(rings)-1):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c1=(j+1)*n+(i+1)%n;d=(j+1)*n+i;f.append((a,b,c1,d))
    f.extend([tuple(range(n-1,-1,-1)),tuple((len(rings)-1)*n+i for i in range(n))])
    return surface(name,v,f,c,bone,weights=weights,sub=sub)

def curve(name,c,pts,r,bone,res=3):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=res;data.bevel_depth=r;data.bevel_resolution=2
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(pts)-1)
    for point,p in zip(spline.bezier_points,pts):point.co=xyz(p);point.handle_left_type='AUTO';point.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(MATS[c])
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    obj=bpy.context.object;vg=obj.vertex_groups.new(name=bone);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    for p in obj.data.polygons:p.use_smooth=True
    PARTS.append(obj);return obj

def panel(name,c,points,z,bone,thick=.008,bevel=.008):
    n=len(points);v=[(x,y,z) for x,y in points]+[(x,y,z+thick) for x,y in points]
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=surface(name,v,f,c,bone)
    mod=obj.modifiers.new('Soft sewn edge','BEVEL');mod.width=bevel;mod.segments=3
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def armature(name,bones):
    arm=bpy.data.armatures.new(name+' skeleton');obj=bpy.data.objects.new(name,arm);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for bone,head,tail,parent in bones:
        b=arm.edit_bones.new(bone);b.head=xyz(head);b.tail=xyz(tail)
        if parent:b.parent=arm.edit_bones[parent]
        b.align_roll(Vector((0,-1,0)))
    bpy.ops.object.mode_set(mode='OBJECT');obj.show_in_front=True;return obj

def bind_parts(name,rig):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in PARTS:obj.select_set(True)
    bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=name+' Skin and clothing'
    for v in obj.data.vertices:
        for g in v.groups:g.weight=max(0,min(1,g.weight))
    obj.data.validate(verbose=False,clean_customdata=False);obj.data.update()
    mod=obj.modifiers.new('Deforming character skeleton','ARMATURE');mod.object=rig;obj.parent=rig
    obj['authoring']='Independently constructed in Blender; no source GLB import'
    bpy.context.view_layer.update();lowest=min((obj.matrix_world@Vector(c)).z for c in obj.bound_box);rig.location.z=-lowest
    return obj

def animations(rig,kind):
    for label,duration in [('Idle',48),('Walk',24),('Run',18),('Wave',48),('Throw',24),('Attack',24),('Hurt',18),('Roll',18)]:
        if rig.animation_data:rig.animation_data.action=None
        for frame in range(1,duration+2,3):
            t=(frame-1)/duration*2*pi
            for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
            pb=rig.pose.bones
            pb['Root'].location.y=.006*sin(t)
            pb['Head'].rotation_euler.z=.025*sin(t)
            if kind=='hero':
                if label in ('Walk','Run'):
                    pb['Root'].location.y=.018*abs(sin(t))
                    for side,phase in [('L',0),('R',pi)]:
                        pb['Thigh'+side].rotation_euler.x=.36*sin(t+phase)
                        pb['Shin'+side].rotation_euler.x=-.42*max(0,-sin(t+phase))
                        pb['UpperArm'+side].rotation_euler.x=-.27*sin(t+phase)
                        pb['Forearm'+side].rotation_euler.x=-.06
                if label in ('Throw','Attack'):
                    pb['UpperArmR'].rotation_euler.x=-1.6*sin(t/2);pb['ForearmR'].rotation_euler.x=-.7*sin(t);pb['Torso'].rotation_euler.z=.12*sin(t)
                if label=='Hurt':pb['Torso'].rotation_euler.z=.11*sin(t)
                if label=='Wave':
                    pb['UpperArmR'].rotation_euler.z=1.65;pb['ForearmR'].rotation_euler.z=.65+.18*sin(t*3);pb['Head'].rotation_euler.z=-.055
                if label=='Roll':
                    tuck=sin(t/2)**2
                    pb['Root'].rotation_euler.x=t
                    pb['Root'].location.y=1.40*(1-cos(t))
                    pb['Root'].location.z=-1.40*sin(t)
                    pb['Torso'].rotation_euler.x=.25*tuck
                    pb['Head'].rotation_euler.x=.30*tuck
                    for side in ['L','R']:
                        pb['Thigh'+side].rotation_euler.x=1.10*tuck
                        pb['Shin'+side].rotation_euler.x=-1.65*tuck
                        pb['UpperArm'+side].rotation_euler.x=-1.0*tuck
                        pb['Forearm'+side].rotation_euler.x=-1.0*tuck
            else:
                pb['Tail'].rotation_euler.z=.16*sin(t);pb['TailTip'].rotation_euler.x=.12*sin(t+.7)
                if label in ('Walk','Run'):
                    pb['Root'].location.y=.018*abs(sin(t))
                    for i,key in enumerate(['FrontL','FrontR','BackL','BackR']):
                        phase=0 if i in (0,3) else pi;pb[key].rotation_euler.x=.32*sin(t+phase);pb[key+'Paw'].rotation_euler.x=-.28*max(0,-sin(t+phase))
                if label=='Wave':
                    pb['Root'].location.y=.11*max(0,sin(t));pb['FrontR'].rotation_euler.x=.62;pb['Head'].rotation_euler.z=-.1
            for bone in pb:
                bone.keyframe_insert('rotation_euler',frame=frame,group=bone.name);bone.keyframe_insert('location',frame=frame,group=bone.name)
        action=rig.animation_data.action;action.name=kind+'_'+label;action.use_fake_user=True
        track=rig.animation_data.nla_tracks.new();track.name=label;strip=track.strips.new(label,1,action);strip.name=label
        rig.animation_data.action=None;track.mute=True
    for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
    # The exporter uses muted NLA tracks too when exporting all tracks.
    bpy.context.scene.frame_set(1)

def add_hair_tufts(hair_point):
    # Solid overlapping tapered locks follow the skull but lift away from it.
    # No alpha cards: every lock has a volume and silhouette on a phone.
    for row in range(1,27):
        t=row/27;count=38+row*3
        for i in range(count):
            a=(i+.45*(row%2))/count*2*pi
            p=Vector(hair_point(a,t,.003));n=Vector((p.x/.389,(p.y-2.258)/.445,(p.z+.009)/.373)).normalized()
            tangent=Vector((cos(a),0,-sin(a)));cross=n.cross(tangent).normalized()
            length=.009+.010*(1-t)+.003*sin(i*5+row)
            verts=[];faces=[]
            for j,(h,r) in enumerate([(0,.009),(.35,.011),(.75,.006),(1,.0015)]):
                center=p+n*(h*length)+tangent*(h*h*.025)+cross*(h*.013)
                for k in range(7):verts.append(tuple(center+tangent*(cos(k*2*pi/7)*r)+cross*(sin(k*2*pi/7)*r*.60)))
            for j in range(3):
                for k in range(7):faces.append((j*7+k,j*7+(k+1)%7,(j+1)*7+(k+1)%7,(j+1)*7+k))
            faces.extend([tuple(range(6,-1,-1)),tuple(range(21,28))])
            surface('Lifted short hair lock',verts,faces,'hairlight' if i%13==0 else 'hair','Head',sub=0)

def hero():
    global PARTS;PARTS=[]
    bones=[('Root',(0,0,0),(0,.2,0),None),('Torso',(0,1.1,0),(0,1.79,0),'Root'),('Head',(0,1.83,0),(0,2.5,0),'Torso')]
    for s,side in [(-1,'L'),(1,'R')]:
        bones += [('UpperArm'+side,(s*.32,1.70,0),(s*.39,1.35,.01),'Torso'),('Forearm'+side,(s*.39,1.35,.01),(s*.395,1.04,.025),'UpperArm'+side),('Thigh'+side,(s*.167,1.09,0),(s*.178,.65,.015),'Root'),('Shin'+side,(s*.178,.65,.015),(s*.178,.26,.015),'Thigh'+side),('Foot'+side,(s*.178,.26,.015),(s*.178,.14,.19),'Shin'+side)]
    rig=armature('BlenderHero',bones)
    loft('Polo silhouette','royal',[(0,1.055,0,.30,.19),(0,1.09,0,.312,.197),(0,1.30,0,.30,.191),(0,1.52,0,.304,.18),(0,1.68,0,.32,.17),(0,1.77,0,.16,.115)],'Torso',sub=2)
    # The chest panel is a separate, subdivided shell on the shirt surface.
    for back in [False,True]:
        v=[];f=[];nx=30;ny=14
        for j in range(ny+1):
            for i in range(nx+1):
                u=i/nx;a=(u-.5)*2.7;lo=1.48-.20*u;hi=1.693+.055*(1-abs(u*2-1));y=lo+(hi-lo)*j/ny
                rz=.192 if y<1.4 else .184 if y<1.57 else .171
                rx=.307 if y<1.55 else .317
                if y>1.69:rx-=.14*(y-1.69)/.095;rz-=.047*(y-1.69)/.095
                v.append((sin(a)*(rx+.007),y,cos(a)*(rz+.007)*(-1 if back else 1)))
                if i and j:
                    k=j*(nx+1)+i;face=(k,k-1,k-nx-2,k-nx-1);f.append(face[::-1] if back else face)
        surface('Sky fabric panel',v,f,'sky','Torso',sub=1)
    loft('Neck','skin',[(0,1.72,0,.10,.09),(0,1.87,0,.11,.10),(0,1.91,0,.10,.09)],'Head',sub=1)
    for s in [-1,1]:panel('Polo folded collar','royal',[(s*.018,1.746),(s*.098,1.81),(s*.225,1.719),(s*.136,1.613)],.17,'Torso',.013,.011)
    panel('Button placket','royal',[(-.028,1.73),(.028,1.73),(.028,1.51),(-.028,1.51)],.209,'Torso',.011,.002)
    for y in [1.67,1.57]:ell('White shirt button','white',(0,y,.235),(.015,.015,.006),'Torso',20,12)
    ell('Emblem border','white',(.171,1.592,.175),(.059,.066,.011),'Torso');ell('Sun emblem','gold',(.171,1.599,.187),(.048,.046,.006),'Torso')
    curve('Mountain emblem','royal',[(.132,1.577,.195),(.157,1.605,.196),(.178,1.584,.197),(.192,1.60,.191),(.215,1.573,.18)],.008,'Torso')
    curve('Lower shirt seam','blueedge',[(-.27,1.077,.105),(-.15,1.065,.182),(0,1.063,.197),(.15,1.065,.182),(.27,1.077,.105)],.005,'Torso')
    # One continuous subdivided face mesh preserves rounded cheeks and chin.
    loft('Continuous head and cheeks','skin',[(0,1.805,.03,.09,.10),(0,1.855,.025,.18,.20),(0,1.96,.015,.28,.275),(0,2.09,0,.35,.311),(0,2.29,-.005,.36,.314),(0,2.47,-.009,.322,.295),(0,2.595,-.018,.23,.223),(0,2.652,-.025,.045,.06)],'Head',sub=2,n=40)
    for s in [-1,1]:
        ell('Ear','skin',(s*.349,2.15,-.012),(.073,.119,.062),'Head');ell('Ear inner','skinshadow',(s*.372,2.156,.031),(.031,.067,.014),'Head');ell('Ear ridge','skinlight',(s*.355,2.13,.043),(.029,.053,.015),'Head')
        ell('Almond eye white','white',(s*.141,2.284,.289),(.095,.062,.027),'Head');ell('Brown iris','eye',(s*.141,2.284,.313),(.046,.052,.019),'Head');ell('Dark pupil','black',(s*.141,2.288,.328),(.027,.038,.01),'Head');ell('Eye highlight','white',(s*.141-.014,2.308,.337),(.013,.015,.005),'Head',20,12)
        curve('Upper lid','hair',[(s*.055,2.29,.312),(s*.096,2.332,.305),(s*.166,2.338,.291),(s*.226,2.302,.264)],.008,'Head')
        curve('Soft eyebrow','hairlight',[(s*.073,2.396,.278),(s*.133,2.412,.269),(s*.207,2.394,.245)],.010,'Head')
        ell('Cheek blush','blush',(s*.237,2.162,.249),(.045,.023,.008),'Head')
    ell('Nose bridge','skin',(0,2.25,.301),(.044,.072,.027),'Head');ell('Nose tip','skinlight',(0,2.199,.330),(.057,.045,.047),'Head');
    for s in [-1,1]:ell('Nostril','skinshadow',(s*.027,2.182,.359),(.010,.006,.005),'Head',16,10)
    smile_pts=[(-.124,2.111),(-.083,2.099),(0,2.095),(.083,2.10),(.124,2.115),(.105,2.064),(.063,2.03),(0,2.022),(-.07,2.04),(-.109,2.071)]
    panel('Open smile','mouth',smile_pts,.297,'Head',.008,.006)
    panel('Upper teeth','white',[(-.096,2.10),(-.05,2.097),(0,2.095),(.095,2.107),(.077,2.078),(0,2.071),(-.079,2.078)],.312,'Head',.004,.003)
    ell('Tongue','tongue',(0,2.041,.309),(.047,.015,.008),'Head')
    # Natural short cap and flush direction strands, authored as editable curves.
    v=[];f=[];nu=56;nv=20
    def hair_point(a,t,extra=0):
        theta=(1.68-.58*cos(a))*t
        ct=cos(theta);rounded=(abs(ct)**.72)*(1 if ct>=0 else -1)
        return (sin(a)*(.397+extra)*sin(theta),2.258+(.435+extra)*rounded,-.009+cos(a)*(.382+extra)*sin(theta))
    for j in range(nv+1):
        for i in range(nu):
            v.append(hair_point(i/nu*2*pi,j/nv))
            if j:
                a=(j-1)*nu+i;b=(j-1)*nu+(i+1)%nu;c=j*nu+(i+1)%nu;d=j*nu+i;f.append((a,d,c,b))
    cap=surface('Thick closed hair shell',v,f,'hair','Head',sub=1)
    solid=cap.modifiers.new('Hair physical thickness','SOLIDIFY');solid.thickness=.018
    bpy.context.view_layer.objects.active=cap;bpy.ops.object.modifier_apply(modifier=solid.name)
    add_hair_tufts(hair_point)
    for i in range(66):
        a=i/66*2*pi;pts=[hair_point(a+.15*(1-t),t,.0015) for t in [.20,.42,.67,.89,.98]];curve('Cropped hair strand','hairlight' if i%4==0 else 'hair',pts,.0017,'Head')
    for s,side in [(-1,'L'),(1,'R')]:
        upper='UpperArm'+side;lower='Forearm'+side
        loft('Short sleeve','royal',[(s*.315,1.711,0,.123,.135),(s*.337,1.641,0,.127,.137),(s*.354,1.507,0,.112,.126),(s*.357,1.485,0,.115,.126)],upper,sub=1)
        def weights(p,upper=upper,lower=lower):
            w=max(0,min(1,(p[1]-1.30)/.13));return{upper:w,lower:1-w}
        loft('Continuous skinned arm','skin',[(s*.341,1.60,0,.082,.079),(s*.375,1.43,0,.08,.076),(s*.39,1.35,.01,.071,.07),(s*.393,1.27,.013,.071,.067),(s*.393,1.10,.022,.061,.056)],upper,sub=2,weights=weights)
        ell('Palm','skin',(s*.393,1.05,.033),(.072,.088,.053),lower)
        for i in range(4):ell('Finger','skinlight',(s*.393+(i-1.5)*.033,.985+(i in (0,3))*.010,.039),(.018,.048,.025),lower,20,12)
        ell('Thumb','skin',(s*.393-s*.067,1.048,.066),(.028,.05,.028),lower)
        if s<0:
            loft('Blue wrist strap','royal',[(s*.393,1.135,.018,.069,.065),(s*.393,1.083,.024,.069,.065)],lower,sub=0)
            panel('Wristband face','royal',[(s*.393-.047,1.132),(s*.393+.047,1.132),(s*.393+.047,1.086),(s*.393-.047,1.086)],.081,lower,.014,.006)
            panel('Wristband symbol','sky',[(s*.393-.018,1.122),(s*.393+.021,1.109),(s*.393-.018,1.096)],.10,lower,.004,.001)
        thigh='Thigh'+side;shin='Shin'+side;foot='Foot'+side;x=s*.167
        loft('Cargo short leg','gray',[(x,1.10,0,.153,.157),(x,1.03,0,.166,.162),(x+s*.01,.85,0,.164,.155),(x+s*.014,.742,0,.155,.149)],thigh,sub=1)
        curve('Short cuff seam','graydark',[(x-.131,.752,.062),(x-.080,.748,.130),(x,.747,.153),(x+.09,.75,.123),(x+.136,.754,.045)],.005,thigh)
        panel('Front cargo pocket','gray',[(x-.090,.966),(x+.085,.966),(x+.083,.809),(x-.082,.809)],.157,thigh,.016,.014)
        panel('Cargo flap','graydark',[(x-.093,.968),(x+.09,.968),(x+.092,.938),(x-.092,.938)],.177,thigh,.008,.004)
        def leg_weights(p,a=thigh,b=shin):
            w=max(0,min(1,(p[1]-.61)/.12));return{a:w,b:1-w}
        loft('Continuous leg','skin',[(s*.174,.80,.004,.100,.098),(s*.178,.67,.015,.096,.096),(s*.178,.58,.012,.091,.087),(s*.178,.41,.009,.077,.075),(s*.178,.26,.015,.069,.063)],thigh,sub=2,weights=leg_weights)
        loft('Ankle sock','white',[(s*.178,.33,.015,.073,.072),(s*.178,.245,.015,.075,.069)],shin,sub=1)
        ell('Sneaker sole','sole',(s*.178,.154,.082),(.131,.054,.214),foot);ell('White sneaker','white',(s*.178,.202,.084),(.123,.097,.203),foot);ell('Toe cap','white',(s*.178,.19,.22),(.119,.066,.077),foot)
        for i in range(4):curve('White shoe lace','white',[(s*.178-.068,.282-i*.012,.032+i*.034),(s*.178,.288-i*.012,.040+i*.034),(s*.178+.069,.282-i*.012,.032+i*.034)],.007,foot)
        curve('Shoe sole seam','sole',[(s*.178-.115,.16,.235),(s*.178-.129,.16,.08),(s*.178-.103,.17,-.083)],.004,foot)
    skin=bind_parts('Hero',rig);animations(rig,'hero');return rig,skin

def export(rig,skin,name):
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);skin.select_set(True);
    for child in rig.children:child.select_set(True)
    bpy.context.view_layer.objects.active=rig
    props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    options=dict(filepath=str(ROOT/'models'/name),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_frame_range=False,export_force_sampling=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    bpy.ops.export_scene.gltf(**{k:v for k,v in options.items() if k in props})

def costumes(rig):
    global PARTS
    for style in ['adventure','electric','mist','sound','healing']:
        PARTS=[]
        if style=='adventure':
            for s in [-1,1]:
                panel('Adventure vest','gold',[(s*.04,1.69),(s*.24,1.69),(s*.26,1.15),(s*.04,1.15)],.225,'Torso',.03,.015)
                curve('Backpack straps','graydark',[(s*.22,1.18,.25),(s*.21,1.65,.20),(s*.20,1.72,-.10),(s*.20,1.25,-.24)],.025,'Torso')
            ell('Adventure backpack','royal',(0,1.41,-.235),(.235,.25,.105),'Torso')
        if style=='electric':
            for s in [-1,1]:
                curve('Rabbit headband','gold',[(s*.35,2.22,-.02),(s*.32,2.52,-.01),(0,2.70,-.01)],.027,'Head')
                loft('Flash rabbit ear','gold',[(s*.18,2.62,-.015,.053,.03),(s*.22,2.86,-.01,.051,.028),(s*.20,2.97,-.01,.004,.005)],'Head',sub=1,n=14)
                panel('Electric shoulder armor','gold',[(s*.31,1.76),(s*.47,1.67),(s*.47,1.55),(s*.30,1.60)],.09,'UpperArm'+('L' if s<0 else 'R'),.09,.02)
            panel('Electric crest','gold',[(-.065,1.48),(.07,1.5),(.025,1.42),(.055,1.38),(-.06,1.36),(-.02,1.44)],.23,'Torso',.025,.003)
        if style=='mist':
            curve('Mist scarf','sky',[(-.14,1.76,.12),(0,1.72,.21),(.15,1.77,.10),(.18,1.67,-.10),(.21,1.35,-.19)],.045,'Torso')
            for s in [-1,1]:ell('Starlight scarf clasp','white',(s*.14,1.735,.145),(.025,.031,.025),'Torso')
        if style=='sound':
            for s in [-1,1]:
                ell('Sound ear cup','peach',(s*.383,2.14,.005),(.040,.12,.084),'Head')
                curve('Sound headband','mouth',[(s*.39,2.15,0),(s*.35,2.57,0),(0,2.72,0)],.024,'Head')
            curve('Sound microphone','graydark',[(.39,2.12,.01),(.31,2.02,.24),(.14,2.04,.34)],.008,'Head');ell('Microphone tip','mouth',(.14,2.04,.34),(.018,.018,.022),'Head')
            panel('Sound vest','peach',[(-.25,1.56),(.25,1.56),(.26,1.18),(-.26,1.18)],.228,'Torso',.015,.012)
        if style=='healing':
            panel('Healing apron','cream',[(-.16,1.70),(.16,1.70),(.26,1.04),(-.26,1.04)],.23,'Torso',.026,.01)
            curve('Care necklace','gold',[(-.14,1.78,.10),(0,1.53,.27),(.14,1.78,.1)],.009,'Torso')
            ell('Healing green crystal','sky',(0,1.53,.28),(.043,.058,.022),'Torso')
            for s in [-1,1]:loft('Deer hair charm','gold',[(s*.26,2.49,.06,.025,.018),(s*.29,2.63,.06,.02,.014),(s*.32,2.68,.06,.005,.005)],'Head',sub=1,n=12)
        bpy.ops.object.select_all(action='DESELECT')
        for o in PARTS:o.select_set(True)
        bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();o=bpy.context.object;o.name='Costume_'+style;o['costume']=style;o.parent=rig
        for v in o.data.vertices:
            for g in v.groups:g.weight=max(0,min(1,g.weight))
        o.data.validate(clean_customdata=False)
        m=o.modifiers.new('Shared protagonist skeleton','ARMATURE');m.object=rig

rig,skin=hero();costumes(rig)
# Reduce subdivision density while keeping facial features and silhouette.
bpy.context.view_layer.objects.active=skin
mod=skin.modifiers.new('Mobile mesh budget','DECIMATE');mod.ratio=.48
bpy.ops.object.modifier_apply(modifier=mod.name)
export(rig,skin,'hero.glb')
(ROOT/'authoring').mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'authoring'/'hero.blend'))
print('HERO_COMPLETE',len(skin.data.vertices),'vertices',len(rig.data.bones),'bones')

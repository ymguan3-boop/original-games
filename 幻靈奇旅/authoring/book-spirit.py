import bpy, math, os, json, struct, random
import numpy as np
from mathutils import Vector, Quaternion
from math import sin,cos,pi
from pathlib import Path
OUT=str(Path(__file__).resolve().parents[3]/'artifacts'/'book-spirit')
os.makedirs(OUT,exist_ok=True)

def material(name,c,metal=0,rough=.4,emit=0,trans=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit
 if trans:p.inputs['Transmission Weight'].default_value=trans;p.inputs['IOR'].default_value=1.65
 return m
def worn(m,c,stage):
 N=256;rng=np.random.default_rng(732+stage);y,x=np.mgrid[0:N,0:N]
 base=np.array([(.20,.075,.025),(.015,.11,.105),(.009,.02,.085)][stage-1]);grain=rng.uniform(.80,1.15,(N,N));grain*=1+.045*np.sin(x*2.5)*np.sin(y*2.5)
 a=np.ones((N,N,4),np.float32);a[:,:,:3]=base[None,None,:]*grain[:,:,None]
 im=bpy.data.images.new('Packed worn panel patina',N,N);im.pixels.foreach_set(a.ravel());im.filepath_raw=os.path.join(OUT,'panel-stage-%d.png'%stage);im.file_format='PNG';im.save();im.pack();n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=im;m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def bind(o,bone):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');md=o.modifiers.new('Chest articulated skeleton','ARMATURE');md.object=rig;o.parent=rig;parts.append(o);o.select_set(False);return o
def meshpart(name,vs,fs,m,bone='body',smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(m);uv=me.uv_layers.new()
 for p in me.polygons:
  p.use_smooth=smooth
  for li in p.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=((v.x+v.y*.7)*.6,v.z*.8+v.y*.3)
 return bind(o,bone)
def box(name,p,sz,m,bone='body',bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.scale=sz;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  md=o.modifiers.new('Rounded forged edges','BEVEL');md.width=bevel;md.segments=2;bpy.ops.object.modifier_apply(modifier=md.name)
 return bind(o,bone)
def sphere(name,p,sz,m,bone='body',seg=12,rings=8):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=p);o=bpy.context.object;o.name=name;o.scale=sz;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return bind(o,bone)
def tube(name,pts,rs,m,bone='body',sides=6):
 vs=[];fs=[]
 for i,p in enumerate(pts):
  d=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])).normalized();u=d.cross(Vector((0,1,0)))
  if u.length<.001:u=d.cross(Vector((0,0,1)))
  u.normalize();v=d.cross(u).normalized()
  for j in range(sides):a=j*2*pi/sides;vs.append(Vector(p)+rs[i]*(u*cos(a)+v*sin(a)))
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
 fs.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);return meshpart(name,vs,fs,m,bone,True)
def curl(name,p,u,v,r,m,bone='body',thick=.025):
 pts=[];rs=[]
 for k in range(25):t=k/24;a=t*2*pi*1.12;rr=r*(1-.87*t);pts.append(Vector(p)+Vector(u)*rr*cos(a)+Vector(v)*rr*sin(a));rs.append(thick*(1-.65*t))
 return tube(name,pts,rs,m,bone)
def gem(name,p,r,m,bone='body',normal=(0,-1,0)):
 n=Vector(normal);u=n.cross(Vector((0,0,1)))
 if u.length<.01:u=Vector((1,0,0))
 u.normalize();v=n.cross(u).normalized();p=Vector(p);vs=[p+n*r*.6,p-n*r*.18]
 for k in range(8):a=k*pi/4;vs.append(p+u*cos(a)*r*.7+v*sin(a)*r)
 fs=[]
 for k in range(8):fs.extend([(0,2+k,2+(k+1)%8),(1,2+(k+1)%8,2+k)])
 return meshpart(name,vs,fs,m,bone)
def badge(p,r,m,bone='body',normal=(0,-1,0)):
 gem('Thick diamond bezel',p,r*1.24,metal,bone,normal);gem('Inset faceted gemstone',Vector(p)+Vector(normal)*.045,r,m,bone,normal)
def arch(x1,x2,m,bone='lid',radius=.74,rz=.58):
 vs=[];fs=[];N=32
 for x in (x1,x2):
  for j in range(N+1):a=j*pi/N;vs.append((x,-radius*cos(a),1.10+rz*sin(a)))
 for j in range(N):fs.append((j,j+1,N+2+j,N+1+j))
 return meshpart('Continuous barrel arch',vs,fs,m,bone,True)
def reset():
 for p in rig.pose.bones:p.location=(0,0,0);p.rotation_quaternion=Quaternion();p.scale=(1,1,1)
 rig.pose.bones['lid'].rotation_quaternion=Quaternion((1,0,0),math.radians(-24))
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()


# Book geometry is authored in Blender +Z up / -Y forward, exported as glTF +Y/+Z.
def ring(name,p,rx,rz,m,bone='body',thick=.018):
 pts=[(p[0]+rx*cos(i*2*pi/48),p[1],p[2]+rz*sin(i*2*pi/48)) for i in range(49)]
 return tube(name,pts,[thick]*len(pts),m,bone,8)
def line(name,pts,m,bone='body',r=.012):return tube(name,pts,[r]*len(pts),m,bone,6)
def textmesh(char,x,y,z,size,m,bone):
 cv=bpy.data.curves.new('Traditional Chinese title','FONT');cv.body=char;cv.font=font;cv.size=size;cv.align_x='CENTER';cv.align_y='CENTER';cv.extrude=.0015;cv.resolution_u=3
 o=bpy.data.objects.new('Traditional title '+char,cv);bpy.context.collection.objects.link(o);o.location=(x,y,z);o.rotation_euler=(pi/2,0,0);o.data.materials.append(m)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return bind(bpy.context.object,bone)
def resetbook():
 for b in rig.pose.bones:b.location=(0,0,0);b.rotation_quaternion=Quaternion();b.scale=(1,1,1)
def star(x,y,z,r,bone='body'):
 vs=[(x,y-.035,z)]+[(x+sin(i*pi/4)*r*(1 if i%2==0 else .25),y,z+cos(i*pi/4)*r*(1 if i%2==0 else .25)) for i in range(8)]
 return meshpart('Raised compass star',vs,[(0,1+i,1+(i+1)%8) for i in range(8)],metal,bone)
def decor_panel(cx,y,w,bone,back=False):
 # All ornament is real mesh, retained in GLB.
 for z in (.13,2.77):line('Double gilt rules',[(cx-w/2+.04,y,z),(cx+w/2-.04,y,z)],metal,bone,.014)
 for x in (cx-w/2+.04,cx+w/2-.04):line('Vertical gilt rule',[(x,y,.15),(x,y,2.75)],metal,bone,.012)
 for x in (cx-w/2+.07,cx+w/2-.07):
  for z in (.22,2.68):
   box('Cast bronze corner guard',(x,y+.015,z),(.19,.055,.24),metal,bone,.032)
   sphere('Corner rivet',(x,y-.026,z),(.046,.025,.046),metal,bone)
   curl('Corner arabesque',(x+( .06 if x<cx else -.06),y-.022,z+(.1 if z<1 else -.1)),(1,0,0),(0,0,1),.12,metal,bone,.017)
   if stage==3:badge((x,y-.058,z),.073,blue,bone)
 if stage==1:
  # Distinct cracked leather strips, stitches and irregular parchment patches.
  for k in range(32 if back else 16):
   x=cx+random.uniform(-w*.40,w*.40);z=random.uniform(.35,2.55)
   pts=[(x+random.uniform(-.035,.035),y-.004,z+j*.045) for j in range(4)]
   line('Leather fracture',pts,crack,bone,.006)
  for k,z in enumerate((.50,2.28)):
   x=cx+(.08 if k else -.07);pw=min(.32,w*.65);hh=.32
   vs=[(x-pw/2,y-.035,z-hh/2),(x-pw*.54,y-.035,z+.07),(x-pw*.3,y-.035,z+hh/2),(x+.01,y-.035,z+.13),(x+pw*.45,y-.035,z+.19),(x+pw*.53,y-.035,z-.13)]
   meshpart('Torn parchment patch',vs,[(0,1,2,3,4,5)],page,bone)
   for j in range(4):line('Faded manuscript',[(x-pw*.30,y-.04,z-.08+j*.05),(x+pw*.25,y-.04,z-.075+j*.05)],ink,bone,.004)
  x=cx-.04;z=1.8
  box('Stitched leather repair',(x,y-.022,z),(min(.36,w*.6),.04,.29),patch,bone,.01)
  for j in range(5):
   xx=x-.12+j*.06;line('Linen hand stitching',[(xx-.01,y-.048,z-.16),(xx+.01,y-.052,z-.12)],cord,bone,.009)
  if back:
   ring('Compass bronze seal',(cx,y-.03,1.35),.38,.38,metal,bone,.025);star(cx,y-.055,1.35,.32,bone)
 elif stage==2:
  # Delicate bamboo, mountains and clouds in raised gold.
  for k in range(2 if not back else 4):
   x=cx-w*.32+k*w*.20
   line('Bamboo stem',[(x,y-.01,.46),(x+.035,y-.01,.85),(x+.025,y-.01,1.18)],metal,bone,.008)
   for j in range(4):
    z=.57+j*.14;sgn=1 if j%2 else -1
    line('Bamboo branch',[(x+.03,y-.012,z),(x+sgn*.13,y-.012,z+.12)],metal,bone,.006)
    for a in (0,.045):
     o=sphere('Bamboo gold leaf',(x+sgn*(.10+a),y-.013,z+.12+a),(.018,.008,.09),metal,bone,8,5);o.rotation_euler.y=sgn*.7
  for k in range(3):
   z=1.8+k*.23;curl('Auspicious cloud',(cx+(-.06 if k%2 else .06),y-.01,z),(1,0,0),(0,0,1),min(.15,w*.25),metal,bone,.008)
  if back:
   for k in range(3):
    z=.6+k*.20;line('Golden mountain ridge',[(cx-.72,y-.01,z),(cx-.4,y-.01,z+.26),(cx-.18,y-.01,z+.06),(cx+.12,y-.01,z+.45),(cx+.46,y-.01,z+.12),(cx+.7,y-.01,z)],metal,bone,.009)
 else:
  rr=.57 if back else .22;zc=1.45
  for r in (rr,rr*.85,rr*.58):ring('Astrolabe concentric gold ring',(cx,y-.025,zc),r,r,metal,bone,.012)
  star(cx,y-.045,zc,rr*.88,bone)
  for k in range(24):
   a=k*2*pi/24;r=rr*.93;line('Compass engraved index',[(cx+r*sin(a),y-.03,zc+r*cos(a)),(cx+rr*sin(a),y-.03,zc+rr*cos(a))],metal,bone,.007)
  for s in (-1,1):
   for k in range(5):
    x=cx+s*(w*.31-.04*sin(k));z=.52+k*.16
    o=sphere('Gilded laurel leaf',(x,y-.02,z),(.04,.014,.09),metal,bone,10,6);o.rotation_euler.y=s*.65
   curl('Gold acanthus curl',(cx+s*w*.25,y-.02,2.16),(s,0,0),(0,0,1),min(.19,w*.28),metal,bone,.016)
  for x,z in [(cx,2.38),(cx-w*.25,.4),(cx+w*.25,2.49)]:star(x,y-.03,z,.065,bone)

metadata=[]
font=bpy.data.fonts.load('C:/Windows/Fonts/kaiu.ttf')
for stage in (1,2,3):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 parts=[];random.seed(92+stage)
 metal=material('Antique bronze' if stage<3 else 'Royal gold',(.58,.30,.095) if stage<3 else (.83,.49,.10),.72,.29)
 cover=material(['Cracked brown leather','Teal woven silk','Midnight blue fine leather'][stage-1],[(.12,.055,.025),(.012,.13,.14),(.012,.026,.085)][stage-1],.05,.56)
 worn(cover,[(.14,.065,.030),(.015,.13,.14),(.014,.03,.085)][stage-1],stage)
 dark=material('Deep book interior',(.013,.007,.004),0,.95);fur=material('Velvety warm brown spirit',(.075,.035,.019),0,.92)
 page=material('Warm antique parchment',(.64,.44,.23),0,.8);pale=material('Ivory page edges',(.83,.65,.39),0,.85);ink=material('Sepia manuscript ink',(.05,.026,.012),0,.9)
 crack=material('Leather crack highlights',(.23,.13,.062),0,.9);patch=material('Leather repair patches',(.22,.085,.025),0,.9);cord=material('Natural binding thread',(.62,.45,.24),0,.8)
 eye=material('Golden amber iris',(1,.36,.006),.08,.25,.8);pupil=material('Deep pupils',(.012,.005,.001),.08,.2);white=material('Eye catchlight',(1,.94,.67),0,.15,1.5);blue=material('Cabochon sapphire',(.006,.034,.35),.4,.15)
 bones={'root':((0,0,0),None),'body':((0,0,.3),'root'),'coverL':((-1.08,-.28,1.4),'body'),'coverR':((1.08,-.28,1.4),'body'),'pagesL':((-.62,-.14,1.45),'coverL'),'pagesR':((.62,-.14,1.45),'coverR'),'face':((0,-.2,1.4),'body'),'eyeL':((-.255,-.59,1.44),'face'),'eyeR':((.255,-.59,1.44),'face')}
 arm=bpy.data.armatures.new('BookSpiritSkeleton');rig=bpy.data.objects.new('BookSpiritStage%d'%stage,arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n,(p,par) in bones.items():
  b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.1,0))
  if par:b.parent=arm.edit_bones[par]
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
 for b in rig.pose.bones:b.rotation_mode='QUATERNION'
 # Thick complete back and rounded outer spines make the silhouette readable at every angle.
 box('Unbroken back board',(0,.34,1.45),(2.16,.16,2.88),cover,bevel=.065)
 box('Dark inner cavity',(0,.23,1.44),(1.98,.13,2.70),dark,bevel=.05)
 for s in (-1,1):
  bn='coverL' if s<0 else 'coverR';pg='pagesL' if s<0 else 'pagesR';x=s*.80
  box('Thick split front cover',(x,-.48,1.45),(.63,.15,2.88),cover,bn,.045)
  box('Rounded leather spine',(s*1.04,-.02,1.45),(.15,.72,2.84),cover,bn,.065)
  # Dozens of actual layered pages, with irregular edges exposed in the central gap.
  for j in range(27):
   y=-.37+j*.021;dx=random.uniform(-.026,.026)
   box('Full height side page leaf',(s*.78+dx,y,1.45),(.46,.012,2.66+random.uniform(-.05,.02)),pale if j%3 else page,pg,.002)
   for top in (False,True):
    hh=random.uniform(.40,.66);z=2.76-hh/2 if top else .14+hh/2
    o=box('Ragged upper page' if top else 'Ragged lower page',(s*(.29+random.uniform(-.065,.065)),y,z),(.50+random.uniform(-.06,.04),.013,hh),pale if j%3 else page,pg,.002)
    o.rotation_euler.y=s*(1 if not top else -1)*(.28+j*.004+random.uniform(-.04,.04));o.rotation_euler.z=s*(j-13)*.009
  decor_panel(x,-.574,.62,bn)
  for z in (.38,.94,1.95,2.53):
   box('Raised spine binding band',(s*1.055,-.05,z),(.19,.78,.085),metal if stage==3 else cover,bn,.035)
   if stage==2:
    line('Continuous stitched binding',[(s*.51,-.59,z),(s*.62,-.61,z+.02),(s*.72,-.54,z),(s*1.1,-.40,z),(s*1.14,.27,z)],cord,bn,.021)
  # Rear hinge barrels are aligned with the real vertical pivot.
  for z in (.25,1.45,2.65):
   line('Vertical cover hinge',[(s*1.08,-.28,z-.11),(s*1.08,-.28,z+.11)],metal,'body',.045)
  if stage!=2 or s>0:
   box('Clasp strap',(s*.91,-.593,1.45),(.38,.07,.25),cover,bn,.025)
   box('Cast clasp plate',(s*.94,-.638,1.45),(.23,.035,.22),metal,bn,.025)
   sphere('Clasp boss',(s*.94,-.678,1.45),(.065,.037,.065),blue if stage==3 else metal,bn)
 # Back ornament faces outwards: geometry generated facing front, then mirrored around back surface.
 old=len(parts);decor_panel(0,-.574,2.03,'body',True)
 for o in parts[old:]:
  # Reflection about y=-.067 moves decorative face from -.574 to +.44.
  if o.type=='MESH':
   bpy.context.view_layer.update()
   for v in o.data.vertices:
    p=o.matrix_world@v.co;p.y=-.134-p.y;v.co=o.matrix_world.inverted()@p
   for poly in o.data.polygons:poly.flip()
 if stage==2:
  for x in (-.80,):
   box('Ivory calligraphy title slip',(x,-.615,1.65),(.39,.035,1.05),pale,'coverL',.008)
   for z,char in [(1.94,'論'),(1.58,'語')]:textmesh(char,x,-.638,z,.32,ink,'coverL')
   box('Vermilion seal',(x,-.641,1.28),(.105,.009,.12),material('Cinnabar seal',(.47,.025,.012),0,.8),'coverL',.003)
   textmesh('印',x,-.650,1.28,.085,pale,'coverL')
 # The spirit is one attached head, with cheeks and brow; eyewear has temples and bridge.
 sphere('Attached spirit head',(0,-.28,1.43),(.52,.30,.60),fur,'face',32,20)
 for s in (-1,1):
  sphere('Spirit cheek',(s*.32,-.49,1.18),(.18,.11,.17),fur,'face',16,10)
  sphere('Soft furry eyebrow',(s*.255,-.50,1.76),(.24,.11,.09),fur,'face',16,10)
  tag='eyeL' if s<0 else 'eyeR'
  sphere('Golden eye',(s*.255,-.57,1.47),(.19,.105,.245),eye,tag,24,16)
  sphere('Dark pupil',(s*.255,-.665,1.49),(.085,.025,.14),pupil,tag,20,12)
  sphere('Bright eye glint',(s*.255-.044,-.691,1.57),(.038,.012,.043),white,tag,12,8)
  ring('Solid round spectacle frame',(s*.255,-.708,1.47),.221,.282,metal,'face',.028)
  ring('Inner spectacle bevel',(s*.255,-.718,1.47),.196,.257,metal,'face',.009)
  line('Eyeglass connected temple',[(s*.475,-.70,1.51),(s*.50,-.48,1.51),(s*.46,-.25,1.50)],metal,'face',.019)
 line('Eyeglass connected bridge',[(-.035,-.715,1.51),(0,-.745,1.54),(.035,-.715,1.51)],metal,'face',.02)
 sphere('Small button nose',(0,-.605,1.21),(.071,.055,.055),ink,'face',16,10)
 line('Gentle smile',[(-.10,-.563,1.10),(0,-.58,1.06),(.10,-.563,1.10)],ink,'face',.012)
 if stage==3:
  # Crown is supported by the solid back rather than floating above the face.
  box('Crown base',(0,.25,2.91),(.70,.17,.12),metal,'body',.025)
  for k in range(5):
   x=-.30+k*.15;zz=3.14+(.10 if k==2 else 0)
   line('Crown point',[(x,.25,2.94),(x,.25,zz)],metal,'body',.032)
   sphere('Crown pearl',(x,.25,zz),(.049,.049,.049),metal,'body')
  badge((0,.13,2.99),.10,blue)
 # All geometry belongs to one skin with nine meaningful joints.
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='BookStage%d_SkinnedMesh'%stage
 for md in list(mesh.modifiers)[1:]:mesh.modifiers.remove(md)
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();clips=[]
 for name,end in [('Idle',121),('Walk',61),('React',91),('PageFlutter',61)]:
  resetbook();act=bpy.data.actions.new(name);rig.animation_data.action=act
  for f in range(1,end+1):
   scene.frame_set(f);resetbook();t=(f-1)/(end-1);body=rig.pose.bones['body'];wave=2*pi*t
   if name=='Walk':body.location.z=.075*(1-cos(2*wave));body.rotation_quaternion=Quaternion((0,1,0),.045*sin(wave));body.location.x=.024*sin(wave)
   elif name=='React':body.location.z=.15*sin(pi*t)**2;body.rotation_quaternion=Quaternion((0,0,1),.06*sin(2*wave)*sin(pi*t)**2)
   else:body.location.z=.008*(1-cos(wave))
   for s,bn,pg in [(-1,'coverL','pagesL'),(1,'coverR','pagesR')]:
    opening=.025*sin(wave)+( .08*sin(pi*t)**2 if name=='React' else 0)
    rig.pose.bones[bn].rotation_quaternion=Quaternion((0,0,1),s*opening)
    rig.pose.bones[pg].rotation_quaternion=Quaternion((0,0,1),s*(.022 if name=='PageFlutter' else .007)*sin(wave*3))
   blink=max(0,1-abs(t-.65)/.035) if name in ('Idle','React') else 0
   for tag in ('eyeL','eyeR'):rig.pose.bones[tag].scale.z=1-.95*blink
   for b in rig.pose.bones:
    b.keyframe_insert('location',frame=f);b.keyframe_insert('rotation_quaternion',frame=f);b.keyframe_insert('scale',frame=f)
  tr=rig.animation_data.nla_tracks.new();tr.name=name;strip=tr.strips.new(name,1,act);strip.action_frame_start=1;strip.action_frame_end=end;rig.animation_data.action=None;tr.mute=True;clips.append({'name':name,'duration':(end-1)/30})
 resetbook();scene.frame_set(1)
 for tr in rig.animation_data.nla_tracks:tr.mute=False
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
 path=os.path.join(OUT,'stage-%d.glb'%stage);bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_anim_slide_to_zero=True)
 for tr in rig.animation_data.nla_tracks:tr.mute=True
 resetbook();scene.frame_set(1)
 world=bpy.data.worlds.new('Book studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.23,.28,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.world=world
 for n,p,power,size in [('Warm key',(-3,-4,6),800,4),('Cool fill',(3,-2,4),500,3),('Rim',(1,3,5),1000,3)]:
  bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.size=size;aim(o,(0,0,1.45))
 bpy.ops.object.camera_add(location=(3,-7,3.2));cam=bpy.context.object;aim(cam,(0,-.05,1.5));cam.data.type='ORTHO';cam.data.ortho_scale=3.75;scene.camera=cam
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'preview-stage-%d.png'%stage)
 rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'stage-%d.blend'%stage));bpy.ops.render.render(write_still=True)
 # Read exported GLB rather than inferring successful animation export.
 with open(path,'rb') as fp:data=fp.read()
 sz=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+sz]);tris=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives']);anims=[a['name'] for a in gltf.get('animations',[])];assert set(anims)=={'Idle','Walk','React','PageFlutter'}
 assert len(gltf.get('skins',[]))==1
 # Sample original bone transforms at endpoints and midframes for loop and in-place checks.
 checks=[]
 for name in anims:
  rig.animation_data.action=bpy.data.actions[name];end={'Idle':121,'Walk':61,'React':91,'PageFlutter':61}[name];values=[]
  for f in (1,(end+1)//2,end):
   scene.frame_set(f);values.append({b.name:list(b.location)+list(b.rotation_quaternion)+list(b.scale) for b in rig.pose.bones})
  err=max(abs(a-b) for key in values[0] for a,b in zip(values[0][key],values[-1][key]));assert err<1e-5
  checks.append({'clip':name,'loopEndpointMaxError':err,'rootStationary':all(abs(v)<1e-7 for val in values for v in val['root'][:3])})
 metadata.append({'stage':stage,'name':['破書','論語','辭海'][stage-1],'triangles':tris,'bones':len(bones),'clips':clips,'exportedAnimations':anims,'glbBytes':len(data),'skins':1,'materials':len(gltf['materials']),'checks':checks,'pageLeafCount':162,'hasHandsOrFeet':False})
 with open(os.path.join(OUT,'model-meta.json'),'w',encoding='utf8') as fp:json.dump({'name':'書本幻靈','glbUp':'+Y','glbForward':'+Z','fps':30,'stages':metadata,'notes':['All clips are in place.','Glasses bridge and temples move together with the face bone.','Cover hinges rotate around the outer vertical spine.','Page leaves have real thickness and separate articulated page bones.','Traditional Chinese title uses Windows DFKai-SB font converted to mesh.','Stylized interpretation of supplied reference; no hands or feet.']},fp,ensure_ascii=False,indent=2)
 print('COMPLETED_STAGE',stage,'TRIANGLES',tris,flush=True)




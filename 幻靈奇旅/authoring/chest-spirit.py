import bpy, math, os, json, struct, random
import numpy as np
from mathutils import Vector, Quaternion
from math import sin,cos,pi
from pathlib import Path
OUT=str(Path(__file__).resolve().parents[3]/'artifacts'/'chest-spirit')
os.makedirs(OUT,exist_ok=True)

def material(name,c,metal=0,rough=.4,emit=0,trans=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit
 if trans:p.inputs['Transmission Weight'].default_value=trans;p.inputs['IOR'].default_value=1.65
 return m
def worn(m,c,stage):
 rng=np.random.default_rng(32+stage);N=256;yy,xx=np.mgrid[0:N,0:N];noise=np.zeros((N,N))
 for k in range(12):
  freq=rng.uniform(.018,.17);a=rng.uniform(0,2*pi);noise+=np.sin(xx*freq*cos(a)+yy*freq*sin(a)+rng.uniform(0,6.28))/(k+2)
 noise=(noise-noise.min())/(noise.max()-noise.min());a=np.ones((N,N,4),np.float32);patina=np.array([(.12,.18,.15),(.12,.2,.28),(.22,.12,.025)][stage-1]);base=np.array(c)
 for j in range(3):a[:,:,j]=np.clip(base[j]*(.55+.5*noise)+patina[j]*(noise>.64)*.55,0,1)
 speck=rng.random((N,N))>.985;a[speck,:3]*=.48
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

metadata=[]
for stage in (1,2,3):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 parts=[];random.seed(stage);cols=[(.44,.19,.055),(.57,.65,.74),(.83,.47,.055)];c=cols[stage-1]
 metal=material(['Antique bronze','Polished silver','Royal gold'][stage-1],c,.82,.28 if stage>1 else .37)
 panel=material('Mottled aged recessed panel',[ (.26,.17,.095),(.075,.16,.245),(.23,.12,.019)][stage-1],.48,.49);worn(panel,[ (.26,.17,.095),(.075,.16,.245),(.23,.12,.019)][stage-1],stage)
 dark=material('Unlit dark cavity',(.009,.006,.004),0,.98);eye=material('Golden luminous bean eyes without pupils',(1,.32,.003),0,.3,2.4);pink=material('Glossy pink tongue',(.84,.09,.20),0,.27);groove=material('Subtle tongue groove',(.48,.025,.07),0,.38)
 blue=material('Transparent sapphire',(.008,.28,.83),.18,.12,0,.55);red=material('Transparent ruby',(.65,.006,.022),.15,.11,0,.6);green=material('Transparent emerald',(.005,.46,.19),.12,.1,0,.65);clear=material('Transparent diamond',(.82,.92,1),.05,.09,0,.82)
 # Every bone uses global +Y as its local Y, so local X is the real horizontal hinge axis.
 bones={'root':((0,0,0),None),'body':((0,0,.5),'root'),'lid':((0,.72,1.10),'body'),'eyeL':((-.36,-.60,1.30),'body'),'eyeR':((.36,-.60,1.30),'body')}
 tonguepath=[(0,-.46,1.20),(0,-.74,1.23),(0,-1.00,1.09),(0,-1.22,.83),(0,-1.34,.60)]
 for i,p in enumerate(tonguepath):bones['tongue%d'%i]=(p,'body' if i==0 else 'tongue%d'%(i-1))
 arm=bpy.data.armatures.new('ChestSpiritSkeleton');rig=bpy.data.objects.new('ChestSpiritStage%d'%stage,arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n,(p,par) in bones.items():
  b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.12,0))
  if par:b.parent=arm.edit_bones[par]
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
 for b in rig.pose.bones:b.rotation_mode='QUATERNION'
 # A genuinely hollow short chest. Interior stays dark while the two eyes are visible.
 box('Chest floor',(0,0,.12),(1.92,1.42,.16),panel)
 for y in (-.68,.68):box('Inset front or rear panel',(0,y,.57),(1.88,.105,.87),panel)
 for x in (-.91,.91):box('Inset side panel',(x,0,.57),(.105,1.36,.87),panel)
 box('Shadow interior floor',(0,0,.25),(1.72,1.2,.09),dark)
 for y in (-.60,.60):box('Dark inner wall',(0,y,.65),(1.69,.035,.73),dark,bevel=.005)
 for x in (-.84,.84):box('Dark inner side',(x,0,.65),(.035,1.17,.73),dark,bevel=.005)
 for z in (.14,1.02):
  for y in (-.75,.75):box('Thick horizontal rim',(0,y,z),(2.06,.13,.14),metal)
  for x in (-.98,.98):box('Thick side rim',(x,0,z),(.13,1.52,.14),metal)
 for x in (-.87,.87):
  for y in (-.75,.75):
   box('Corner strap',(x,y,.58),(.17,.13,.88),metal)
   for z in (.19,.43,.73,.99):sphere('Forged rivet',(x,y+(-.075 if y<0 else .075),z),(.047,.022,.047),metal,seg=10,rings=6)
 for x in (-.9,.9):
  for y in (-.65,.65):box('Rounded foot',(x,y,.055),(.27,.28,.11),metal,bevel=.04)
 # Smooth half-cylinder shell; the complete lid is rigidly attached to the rear hinge.
 arch(-1,1,panel);arch(-.955,.955,dark,radius=.69,rz=.53)
 for x in (-.99,.99):
  vs=[(x,0,1.1)]+[(x,-.735*cos(j*pi/32),1.1+.575*sin(j*pi/32)) for j in range(33)];meshpart('Solid barrel endcap',vs,[(0,j+1,j+2) for j in range(32)],panel,'lid')
  pts=[(x,-.745*cos(j*pi/32),1.1+.585*sin(j*pi/32)) for j in range(33)];tube('Raised endcap arch',pts,[.045]*33,metal,'lid',8)
 for x in (-.89,0,.89):
  arch(x-.073,x+.073,metal,radius=.778,rz=.615)
  for j in range(1,10):
   a=j*pi/10;p=(x,-.79*cos(a),1.1+.627*sin(a));sphere('Lid strap rivet',p,(.040,.040,.033),metal,'lid',10,6)
   if stage>=2 and j in (2,5,8):badge(p,.058,blue if stage==2 else [red,green,clear][j%3],'lid',(0,-cos(a),sin(a)))
 for y in (-.75,.75):box('Lid lower lip',(0,y,1.1),(2.10,.14,.14),metal,'lid')
 for x in (-.98,.98):box('Lid end baseline',(x,0,1.1),(.14,1.52,.14),metal,'lid')
 for x in (-.65,.65):
  tube('True rear hinge barrel',[(x-.13,.74,1.1),(x+.13,.74,1.1)],[.09,.09],metal,'body',12)
  box('Hinge leaf',(x,.80,.92),(.2,.05,.24),metal)
 # Front shield with a black, clearly legible keyhole.
 outline=[(-.21,1.37),(-.31,1.22),(-.26,.98),(0,.80),(.26,.98),(.31,1.22),(.21,1.37),(0,1.46)]
 meshpart('Front lock shield',[(x,-.855,z) for x,z in outline],[tuple(range(8))],metal,'lid')
 tube('Raised shield border',[(x,-.887,z) for x,z in outline+[outline[0]]],[.028]*9,metal,'lid',8)
 sphere('Keyhole round opening',(0,-.903,1.20),(.081,.012,.081),dark,'lid',20,12)
 meshpart('Keyhole tapered slot',[(-.043,-.916,1.18),(-.063,-.916,1.02),(.063,-.916,1.02),(.043,-.916,1.18)],[(0,1,2,3)],dark,'lid')
 if stage>=2:
  for z in (.91,1.39):badge((0,-.91,z),.065,blue if stage==2 else red,'lid')
 # Forged scrolls on all four body panels and endcaps, escalating to gold foliage.
 for y in (-.825,.825):
  for s in (-1,1):
   for z in ([.48] if stage==1 else [.40,.76]):curl('Body scrolling metalwork',(s*.48,y,z),(s,0,0),(0,0,1),.20,metal,thick=.027)
 for x in (-1.015,1.015):
  for s in (-1,1):
   curl('Side scrolling metalwork',(x,s*.34,.57),(0,s,0),(0,0,1),.22,metal)
   curl('Lid endcap scroll',(x,s*.30,1.29),(0,s,0),(0,0,1),.15,metal,'lid',.022)
  if stage>1:badge((x,0,.58),.19,blue if stage==2 else green,normal=(1 if x>0 else -1,0,0));badge((x,0,1.39),.18,blue if stage==2 else red,'lid',(1 if x>0 else -1,0,0))
 for s in (-1,1):
  curl('Front lid scroll',(s*.50,-.64,1.39),(s,0,0),(0,.64,.60),.23,metal,'lid',.03)
  curl('Rear lid scroll',(s*.50,.64,1.39),(s,0,0),(0,-.64,.60),.23,metal,'lid',.03)
 # Top finial and the royal crown-like cluster.
 tube('Crown finial connected pedestal',[(0,0,1.66),(0,0,1.83)],[.075,.065],metal,'lid',12)
 gem('Crown finial setting',(0,0,1.83),.23,metal,'lid',(0,0,1))
 if stage>=2:gem('Crown central crystal',(0,-.01,1.92),.18,blue if stage==2 else red,'lid',(0,-1,0))
 if stage==3:
  for s in (-1,1):
   tube('Side crown crystal pedestal',[(s*.30,0,1.66),(s*.30,0,1.78)],[.05,.045],metal,'lid',10);badge((s*.30,0,1.78),.13,clear,'lid',(0,-.35,1));badge((s*.86,-.83,.6),.12,green)
  for y in (-.835,.835):
   badge((0,y,.58),.24,red,normal=(0,-1 if y<0 else 1,0))
   for z in (.15,1.02):
    for k in range(17):badge((-.78+k*.098,y,z),.034,clear,normal=(0,-1 if y<0 else 1,0))
   for s in (-1,1):
    for k in range(6):
     z=.30+k*.10;x=s*(.20+k*.065);p=(x,y,.30+k*.10);leaf=sphere('Raised gold acanthus leaf',p,(.095,.025,.035),metal,seg=10,rings=6);leaf.rotation_euler.y=s*(-.55)
  for x in (-.60,.60):
   for j in range(3):curl('Crown filigree',(x,-.36+j*.34,1.65),(1,0,0),(0,1,0),.17,metal,'lid',.024)
 # Exactly two single-color, emissive, pupil-free beans.
 for s,tag in [(-1,'L'),(1,'R')]:sphere('Golden bean eye '+tag,(s*.36,-.61,1.30),(.105,.065,.14),eye,'eye'+tag,24,16)
 # Continuous, rounded tongue mesh with overlapping linear weights across five bones.
 vs=[];fs=[];N=40;S=16
 def tonguecurve(t):
  q=min(4,max(0,t*4));k=min(3,int(q));u=q-k;p1=Vector(tonguepath[k]);p2=Vector(tonguepath[k+1]);p0=Vector(tonguepath[k-1]) if k>0 else 2*p1-p2;p3=Vector(tonguepath[k+2]) if k<3 else 2*p2-p1
  return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
 for i in range(N+1):
  t=i/N;p=tonguecurve(t);d=(tonguecurve(min(1,t+.001))-tonguecurve(max(0,t-.001))).normalized();n=Vector((0,d.z,-d.y));width=.29*(.86+.14*sin(t*pi))*(max(.002,1-((t-.78)/.22)**2)**.5 if t>.78 else 1);thick=.075*(.8+.2*sin(t*pi))*(max(.025,1-((t-.90)/.10)**2)**.5 if t>.90 else 1)
  for j in range(S):a=j*2*pi/S;vs.append(p+Vector((width*cos(a),0,0))+n*thick*sin(a))
 for i in range(N):
  for j in range(S):a=i*S+j;b=i*S+(j+1)%S;fs.append((a,b,b+S,a+S))
 fs.extend([tuple(reversed(range(S))),tuple(N*S+j for j in range(S))]);tongue=meshpart('Continuous five bone pink tongue',vs,fs,pink,'tongue0',True)
 tongue.vertex_groups.clear()
 for k in range(5):tongue.vertex_groups.new(name='tongue%d'%k)
 for i in range(N+1):
  q=i/N*4;k=min(3,int(q));u=q-k
  for j in range(S):tongue.vertex_groups[k].add([i*S+j],1-u,'REPLACE');tongue.vertex_groups[k+1].add([i*S+j],u,'REPLACE')
 # Merge the chest to one skinned object while preserving rigid and blended weights.
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='ChestStage%d_SkinnedMesh'%stage
 for md in list(mesh.modifiers)[1:]:mesh.modifiers.remove(md)
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();clips=[]
 for name,end in [('Idle',121),('Walk',61),('React',91),('TongueWiggle',61)]:
  reset();act=bpy.data.actions.new(name);rig.animation_data.action=act
  for f in range(1,end+1):
   scene.frame_set(f);reset();t=(f-1)/(end-1);body=rig.pose.bones['body'];lid=rig.pose.bones['lid'];freq=2 if name!='Idle' else 1;wave=2*pi*t*freq
   deg=24+2*sin(wave)
   if name=='Walk':body.location.z=.07*(1-cos(4*pi*t));body.location.y=.035*sin(4*pi*t);body.rotation_quaternion=Quaternion((0,1,0),.045*sin(2*pi*t));deg=25+6*sin(4*pi*t)
   elif name=='React':body.location.z=.13*sin(pi*t)**2;body.rotation_quaternion=Quaternion((0,0,1),.07*sin(4*pi*t)*sin(pi*t));deg=24+20*sin(pi*t)**2
   else:body.location.z=.008*(1-cos(2*pi*t))
   lid.rotation_quaternion=Quaternion((1,0,0),math.radians(-deg))
   for i in range(5):
    b=rig.pose.bones['tongue%d'%i];amp=(.025 if i==0 else .065)*(1.4 if name=='TongueWiggle' else 1);b.rotation_quaternion=Quaternion((1,0,0),amp*sin(wave*2-i*.7))@Quaternion((0,0,1),.035*sin(wave*2-i*.8))
   blink=max(0,1-abs(t-.65)/.028) if name in ('Idle','React') else 0
   for tag in ('L','R'):rig.pose.bones['eye'+tag].scale.z=1-.94*blink
   for b in rig.pose.bones:
    b.keyframe_insert('location',frame=f);b.keyframe_insert('rotation_quaternion',frame=f);b.keyframe_insert('scale',frame=f)
  tr=rig.animation_data.nla_tracks.new();tr.name=name;strip=tr.strips.new(name,1,act);strip.action_frame_start=1;strip.action_frame_end=end;rig.animation_data.action=None;tr.mute=True;clips.append({'name':name,'duration':(end-1)/30,'frames':end})
 reset();scene.frame_set(1)
 for tr in rig.animation_data.nla_tracks:tr.mute=False
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
 path=os.path.join(OUT,'stage-%d.glb'%stage);bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_anim_slide_to_zero=True)
 for tr in rig.animation_data.nla_tracks:tr.mute=True
 reset();scene.frame_set(1)
 world=bpy.data.worlds.new('Chest soft studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.19,.25,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
 for n,p,power,size in [('Warm key',(-3,-4,5),650,4),('Cool fill',(3,-2,3),450,3),('Rim',(1,3,4),850,3)]:
  bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.size=size;aim(o,(0,0,1.1))
 bpy.ops.object.camera_add(location=(3.1,-6.5,3.0));cam=bpy.context.object;aim(cam,(0,-.1,1.05));cam.data.type='ORTHO';cam.data.ortho_scale=3.15;scene.camera=cam
 scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'preview-stage-%d.png'%stage)
 rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'stage-%d.blend'%stage));bpy.ops.render.render(write_still=True)
 if stage==3:
  cam.data.ortho_scale=3.65;aim(cam,(0,-.1,1.22))
  for clip,frame in [('Walk',9),('React',46),('Idle',79)]:
   rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame);scene.render.filepath=os.path.join(OUT,'pose-%s.png'%('blink' if clip=='Idle' else clip.lower()));bpy.ops.render.render(write_still=True)
 with open(path,'rb') as fp:data=fp.read()
 sz=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+sz]);triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives']);anims=[a['name'] for a in gltf.get('animations',[])];assert set(anims)=={'Idle','Walk','React','TongueWiggle'}
 positions=[gltf['accessors'][p['attributes']['POSITION']] for m in gltf['meshes'] for p in m['primitives']];bounds={'min':[min(p['min'][i] for p in positions) for i in range(3)],'max':[max(p['max'][i] for p in positions) for i in range(3)]}
 metadata.append({'stage':stage,'name':['銅寶箱','銀寶箱','金寶箱'][stage-1],'triangles':triangles,'bones':len(bones),'clips':clips,'exportedAnimations':anims,'glbBytes':len(data),'boundsRestGLTF':bounds,'materials':len(gltf['materials']),'skins':len(gltf.get('skins',[])),'tongueContinuous':True,'tongueBones':5,'lidMinimumDegrees':19,'lidMaximumDegrees':44,'eyes':'exactly two emissive golden beans, no pupil or iris'})
 with open(os.path.join(OUT,'model-meta.json'),'w',encoding='utf8') as fp:json.dump({'name':'寶箱幻靈','glbUp':'+Y','glbForward':'+Z','fps':30,'stages':metadata,'notes':['All animations are in-place; viewer translates root in world space.','Tongue uses a continuous closed mesh with normalized linear weights across five joints.','Lid rotates about the real rear horizontal hinge.','Rest accessor bounds describe closed geometry; animated bounds must be sampled.','PNG previews include idle, walking, reaction and a blink pose.']},fp,ensure_ascii=False,indent=2)
 print('COMPLETED_STAGE',stage,'TRIANGLES',triangles,'ANIMATIONS',anims,flush=True)

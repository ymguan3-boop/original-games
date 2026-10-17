"""Four original native-Blender gym arenas. Y-up authored coordinates.
Run Blender -b -P authoring/gym-scenes.py; no imported geometry or modeling skill.
Main floor is y=0; thin inlays remain traversable. Landmark scenery stays outside the central combat corridor.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
from math import sin,cos,pi
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'models/gyms';OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/'qa/gym-scenes';QA.mkdir(parents=True,exist_ok=True)
PALETTE={'ink':'152342','gold':'F4B72F','copper':'BC673B','cyan':'13DCE9','violet':'7749CC','lilac':'CCA8EF','pink':'FC649C','cream':'FFF0D1','green':'197B65','mint':'8CE7AD','wood':'875642','blue':'216BAA','white':'EFFFFF','darkrose':'582549'}
THEMES={'electric':('閃角共鳴電場','ink','gold','cyan'),'mist':('小飯團紫波滾動庭','violet','lilac','cyan'),'sound':('小山木頭人驚跳庭','darkrose','pink','gold'),'healing':('暖巢森療花園','green','mint','cream')}
M={}
def xyz(p):return (p[0],-p[2],p[1])
def linear(h):
 v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v)+(1,)
def setup():
 global M
 bpy.ops.wm.read_factory_settings(use_empty=True);M={}
 for k,c in PALETTE.items():
  m=bpy.data.materials.new(k);m.diffuse_color=linear(c);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=linear(c);b.inputs['Roughness'].default_value=.54
  if k in ('gold','copper'):b.inputs['Metallic'].default_value=.52
  if k in ('cyan','pink','mint'):b.inputs['Emission Color'].default_value=linear(c);b.inputs['Emission Strength'].default_value=.18
  M[k]=m

def finish(o,name,c):
 o.name=name;o.data.materials.append(M[c]);return o

def cube(name,p,s,c,bevel=.07):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Sewn rounded stone edges','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
 return finish(o,name,c)
def cyl(name,p,r,h,c,r2=None,n=24):
 bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r if r2 is None else r2,depth=h,location=xyz(p));return finish(bpy.context.object,name,c)
def ell(name,p,s,c):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=xyz(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,c)
def line(name,a,b,r,c):
 va,vb=Vector(xyz(a)),Vector(xyz(b));mid=(va+vb)/2;bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=(vb-va).length,location=mid);o=bpy.context.object;o.rotation_euler=(vb-va).to_track_quat('Z','Y').to_euler();return finish(o,name,c)
def ring(name,p,r,t,c,front=False):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=8,major_radius=r,minor_radius=t,location=xyz(p));o=bpy.context.object
 if front:o.rotation_euler.x=pi/2
 return finish(o,name,c)
def path(name,points,r,c):
 for i in range(len(points)-1):line(name,points[i],points[i+1],r,c)
def floor_marks(accent):
 # Thin visible inlays sit 1 cm above the floor without obstructing walking.
 for z in (-6,6):
  cyl('Flush summon station',(0,.005,z),2.3,.01,accent,n=64)
  ring('Summon station fine rim',(0,.009,z),2.55,.012,'cream')
 for x in (-13.7,13.7):cube('Long boundary inlay',(x,.006,0),(.11,.012,27.3),accent,0)
 for z in (-13.7,13.7):cube('Short boundary inlay',(0,.006,z),(27.3,.012,.11),accent,0)
 ring('Central flush shared sigil',(0,.009,0),3,.018,accent)

def electric():
 for x,z in [(-12.9,-12.9),(12.9,-12.9),(-12.9,12.9),(12.9,12.9)]:
  cyl('Copper induction plinth',(x,.25,z),.82,.5,'copper',n=8);cyl('Insulated lightning pylon',(x,2.05,z),.30,3.6,'ink',n=12)
  for y in (.75,1.2,1.65,2.1,2.55,3):ring('Toroidal copper coil',(x,y,z),.62,.085,'gold')
  ell('Electric halo core',(x,3.8,z),(.38,.46,.38),'cyan')
  path('Split lightning prong',[(x-.35,4,z),(x-.75,4.6,z),(x-.4,5.05,z)],.085,'gold');path('Split lightning prong',[(x+.35,4,z),(x+.75,4.6,z),(x+.4,5.05,z)],.085,'gold')
 for s in (-1,1):
  for z in (-7,0,7):
   cube('Power cell housing',(s*13.25,.65,z),(.55,1.3,1.4),'copper');cube('Power cell luminous face',(s*12.94,.72,z),(.04,.8,.7),'cyan',.01)
  for z in (-11,11):path('Flush angular lightning circuit',[(s*3,.008,z),(s*5,.008,z-1),(s*4,.008,z+1),(s*7,.008,z)],.04,'gold')

def mist():
 for x in (-12.7,12.7):
  for z in (-11,0,11):
   cyl('Cloudstone lantern base',(x,.25,z),.62,.5,'lilac',n=8)
   cyl('Hanging prism stem',(x,1.4,z),.09,2.4,'cream');ell('Starlight lantern',(x,2.65,z),(.36,.58,.36),'cyan')
   for j in range(4):ell('Cloud collar',(x+cos(j*pi/2)*.31,2.2,z+sin(j*pi/2)*.25),(.34,.20,.28),'white')
 # Crescent portal hugs the rear boundary, open sky and arena sightline stay clear.
 for j in range(36):
  a=pi*.12+j/(35)*pi*1.76
  ell('Moon crescent stone',(cos(a)*2.9,3.3+sin(a)*2.9,-13.35),(.31,.31,.24),'lilac')
 for x in (-8,8):
  for j in range(5):cyl('Moon quartz cluster',(x+(j-2)*.34,.65+(.35 if j%2 else 0),-13.1),.24,1.3+(.7 if j%2 else 0),'cyan',r2=0,n=6)
 for s in (-1,1):
  path('Flush star-stream inlay',[(s*(8+.7*sin(j*.7)),.008,-11+j*.7) for j in range(33)],.045,'lilac')

def sound():
 for x in (-12.7,12.7):
  for z in (-10,0,10):
   cube('Rounded resonator cabinet',(x,1.75,z),(1.5,3.5,1.1),'darkrose',.2)
   for y,r in [(1.05,.48),(2.35,.35)]:
    ring('Brass resonator face',(x,y,z+.58),r,.065,'gold',True);ell('Rose speaker diaphragm',(x,y,z+.57),(r*.85,r*.85,.12),'pink')
   for j in range(5):cube('Level meter',(x-.5+j*.25,3.7+(j%3)*.14,z),(.1,.3+(j%3)*.28,.3),'cyan',.03)
 for x in (-7,0,7):
  cyl('Ceremonial side drum',(x,.75,-13),.82,1.5,'pink',n=20);cyl('Pale drum skin',(x,1.52,-13),.81,.05,'cream',n=24)
  for j in range(8):a=j*pi/4;line('Brass drum lacing',(x+sin(a)*.82,.1,-13+cos(a)*.82),(x+sin(a+.2)*.82,1.4,-13+cos(a+.2)*.82),.035,'gold')
 for s in (-1,1):
  for j in range(3):ring('Flush expanding sound wave',(0,.008,s*6),3.3+j*.5,.025,'pink')
  path('Outer musical ribbon',[(s*13.4,3.3+sin(j*.55)*.35,-11+j*.8) for j in range(28)],.07,'gold')

def healing():
 for x,z in [(-12.6,-12.6),(12.6,-12.6),(-12.6,12.6),(12.6,12.6)]:
  cyl('Medicinal garden planter',(x,.25,z),.95,.5,'cream',n=12);cyl('Warmwood branching trunk',(x,1.6,z),.22,2.7,'wood',r2=.13,n=10)
  for j in range(5):
   a=j*2*pi/5;tx=x+sin(a)*.6;tz=z+cos(a)*.6;line('Soft branching limb',(x,2.1,z),(tx,2.9,tz),.085,'wood');ell('Rounded healing canopy',(tx,3.2,tz),(.83,.65,.83),'mint' if j%2 else 'green')
  ell('Warm nest fruit',(x,2.45,z+.2),(.28,.33,.28),'gold')
 for s in (-1,1):
  for z in (-6,0,6):
   cube('Herbal raised bed',(s*13.1,.25,z),(.9,.5,2.3),'wood',.12)
   for j in range(5):
    zz=z-.85+j*.42;ell('Herb leaf',(s*13.1,.7,zz),(.35,.44,.24),'mint');ell('Healing flower',(s*13.1,1.05,zz),(.16,.16,.16),'pink' if j%2 else 'cream')
 for x in (-6,6):
  cyl('Care spring bowl',(x,.25,-13.1),.7,.5,'cream');cyl('Calm turquoise spring',(x,.52,-13.1),.58,.03,'cyan');ell('Spring seed pearl',(x,.9,-13.1),(.21,.35,.21),'gold')
 for s in (-1,1):
  for j in range(6):ell('Flush leaf mosaic',(s*(5.9+j*.52),.008,-8+j*2.9),(.45,.008,.72),'mint')

def near_boss_landmarks(key):
 # Phone portrait framing: theme-specific landmarks directly behind the boss.
 # Keep the combat corridor x +-2.6, z -7..7 entirely open.
 for sign in (-1,1):
  x=sign*3.7;z=-10.1
  if key=='electric':
   cyl('Near boss copper podium',(x,.2,z),.6,.4,'copper',n=8)
   cyl('Near boss insulated coil core',(x,1.55,z),.19,2.6,'ink',n=12)
   for y in (.65,1.0,1.35,1.7,2.05,2.4):ring('Near boss golden induction winding',(x,y,z),.43,.07,'gold')
   ell('Near boss electric beacon',(x,2.85,z),(.29,.32,.29),'cyan')
   for side in (-1,1):path('Near boss lightning fork',[(x+side*.25,2.7,z),(x+side*.48,3.0,z),(x+side*.28,3.2,z)],.065,'gold')
  elif key=='mist':
   cyl('Near boss cloudstone pedestal',(x,.2,z),.58,.4,'lilac',n=8)
   cyl('Near boss moon lantern post',(x,1.25,z),.085,2.1,'cream')
   ell('Near boss star prism',(x,2.4,z),(.34,.51,.34),'cyan')
   for j in range(4):ell('Near boss cloud collar',(x+cos(j*pi/2)*.28,2.03,z+sin(j*pi/2)*.24),(.32,.18,.27),'white')
  elif key=='sound':
   cube('Near boss resonant speaker',(x,1.25,z),(1.12,2.5,.90),'darkrose',.14)
   for y,r in ((.72,.36),(1.78,.29)):
    ring('Near boss speaker brass surround',(x,y,z+.48),r,.055,'gold',True)
    ell('Near boss pink diaphragm',(x,y,z+.47),(r*.84,r*.84,.1),'pink')
   for j in range(4):cube('Near boss sound meter',(x-.36+j*.24,2.65+(j%2)*.1,z),(.095,.3+(j%2)*.2,.22),'cyan',.02)
   drumx=sign*3.05;cyl('Near boss small resonance drum',(drumx,.5,-9.4),.42,1.0,'pink',n=18);cyl('Near boss drum head',(drumx,1.02,-9.4),.42,.04,'cream',n=24)
  else:
   cyl('Near boss healing tree planter',(x,.18,z),.65,.36,'cream',n=12)
   cyl('Near boss warmwood tree',(x,1.1,z),.15,1.85,'wood',r2=.09,n=10)
   for j in range(4):
    a=j*pi/2;tx=x+sin(a)*.38;tz=z+cos(a)*.38
    line('Near boss little healing branch',(x,1.65,z),(tx,2.0,tz),.07,'wood')
    ell('Near boss restorative crown',(tx,2.3,tz),(.58,.53,.58),'mint' if j%2 else 'green')
   poolx=sign*3.0;cyl('Near boss medicinal spring',(poolx,.2,-9.3),.48,.4,'cream');cyl('Near boss turquoise water',(poolx,.415,-9.3),.40,.025,'cyan');ell('Near boss golden spring seed',(poolx,.74,-9.3),(.15,.29,.15),'gold')
 if key=='mist':
  for j in range(28):
   a=pi*.12+j/27*pi*1.76
   ell('Near boss crescent gateway',(cos(a)*1.2,1.95+sin(a)*1.2,-10.8),(.14,.14,.12),'lilac')

def export_scene(key,title,base,accent,glow):
 setup();cube('Walkable arena floor',(0,-.30,0),(28,.60,28),base,.14);cube('Arena floating rim',(0,-.78,0),(28.6,.35,28.6),accent,.12);floor_marks(accent)
 globals()[key]();near_boss_landmarks(key)
 for o in bpy.context.scene.objects:
  if o.type=='MESH':o['gymTheme']=key
 # Preserve editable named source objects, then batch export to one draw per material.
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'authoring'/('gym-'+key+'.blend')))
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.join();joined=bpy.context.object;joined.name='Gym_'+key
 slots=list(joined.data.materials);unique=[];mapping={}
 for i,m in enumerate(slots):
  if m not in unique:unique.append(m)
  mapping[i]=unique.index(m)
 indexes=[mapping[p.material_index] for p in joined.data.polygons];joined.data.materials.clear()
 for m in unique:joined.data.materials.append(m)
 for p,i in zip(joined.data.polygons,indexes):p.material_index=i
 bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_yup=True)
 # Reimport the actual delivered GLB for bounds and visual proof.
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/(key+'.glb')))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];coords=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
 report={'id':key,'fileBytes':(OUT/(key+'.glb')).stat().st_size,'meshCount':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'boundsBlender':{'min':[min(p[i] for p in coords) for i in range(3)],'max':[max(p[i] for p in coords) for i in range(3)]},'importSuccess':True}
 sc=bpy.context.scene;sc.world=bpy.data.worlds.new('QA World');sc.world.color=(.12,.14,.18);sc.render.engine='BLENDER_WORKBENCH';sc.render.resolution_x=1000;sc.render.resolution_y=800;sc.render.resolution_percentage=100;sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL';sc.display.shading.show_shadows=True;sc.display.shading.show_cavity=True;sc.display.shading.background_type='WORLD'
 bpy.ops.object.camera_add(location=(26,-34,31));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=43;sc.camera=cam
 sc.render.filepath=str(QA/(key+'.png'));bpy.ops.render.render(write_still=True)
 return report
reports=[];manifest={}
for key,(title,base,accent,glow) in THEMES.items():
 reports.append(export_scene(key,title,base,accent,glow))
 manifest[key]={'model':f'models/gyms/{key}.glb','bounds':{'minX':-14,'maxX':14,'minZ':-14,'maxZ':14},'spawn':[0,0,6],'enemySpawn':[0,0,-6],'cameraDistance':18,'theme':title}
(ROOT/'data/gym-scenes.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');(QA/'import-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8');print('GYM_SCENES_COMPLETE',json.dumps(reports))

"""Native Blender tower weapons, crafting drops and replaceable portrait card.
X right/Y up/Z front; weapon grip is precisely author (0,0,0).
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from math import sin,cos,pi
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'models/tower';OUT.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
M={};PARTS=[];REPORT=[]
def xyz(p):return (p[0],-p[2],p[1])
def color(h):
 v=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v)+(1,)
for n,h,metal in [('steel','6EC4E1',.8),('edge','D5F5FA',.85),('gold','EBA825',.75),('dark','16465B',.65),('leather','582B20',0),('cyan','00C9CA',.35),('violet','842FD0',.4),('coral','ED466F',.22),('cream','FFF0C6',0),('cardArtwork','FFFFFF',0)]:
 m=bpy.data.materials.new(n);m.use_nodes=True;m.diffuse_color=color(h);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color(h);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.32 if metal else .65
 if n in ('cyan','violet','coral'):bs.inputs['Emission Color'].default_value=color(h);bs.inputs['Emission Strength'].default_value=.14
 M[n]=m

def finish(o,n,m):o.name=n;o.data.materials.append(M[m]);PARTS.append(o);return o

def mesh(n,v,f,m):
 me=bpy.data.meshes.new(n);me.from_pydata([xyz(p) for p in v],[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);return finish(o,n,m)
def cube(n,p,s,m,b=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if b:mod=o.modifiers.new('Rounded hard-surface edges','BEVEL');mod.width=b;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,n,m)
def cyl(n,p,r,h,m,vertices=12,r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=h,location=xyz(p));return finish(bpy.context.object,n,m)
def ell(n,p,s,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=xyz(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for q in o.data.polygons:q.use_smooth=True
 return finish(o,n,m)
def tube(n,pts,r,m,sides=8):
 v=[];f=[]
 for j,p in enumerate(pts):
  t=(Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(0,j-1)])).normalized();u=Vector((0,0,1));q=t.cross(u).normalized()
  for k in range(sides):v.append(tuple(Vector(p)+r*(u*cos(k*2*pi/sides)+q*sin(k*2*pi/sides))))
 for j in range(len(pts)-1):
  for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;f.append((a,b,b+sides,a+sides))
 f.extend([tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*sides+k for k in range(sides))]);return mesh(n,v,f,m)

def blade(n,base,tip,width):
 rings=[(base,width,.04),(tip-.14,width*.62,.032),(tip,.0,.0)];v=[];f=[]
 for y,w,d in rings:v.extend([(-w,y,0),(0,y,d),(w,y,0),(0,y,-d)])
 for j in range(2):
  for k in range(4):a=j*4+k;b=j*4+(k+1)%4;f.append((a,b,b+4,a+4))
 o=mesh(n,v,f,'steel');o.data.materials.append(M['edge'])
 for p in o.data.polygons:p.material_index=p.index%2
 return o

def greatsword():
 cyl('Leather grip',(0,-.02,0),.058,.38,'leather');cyl('Gold pommel',(0,-.245,0),.082,.09,'gold',8,r2=.065)
 for j in range(5):cyl('Wrapped grip band',(0,-.17+j*.065,0),.06,.015,'dark')
 cube('Greatsword swept crossguard',(0,.20,0),(.56,.095,.13),'gold');ell('Crossguard teal jewel',(0,.20,.075),(.08,.06,.025),'cyan')
 blade('Greatsword wide diamond blade',.25,1.70,.13);cube('Blade dark fuller',(0,.89,.043),(.022,1.18,.006),'dark',.002)

def dualblade():
 cyl('Short blade leather grip',(0,0,0),.045,.29,'leather');cyl('Short blade pommel',(0,-.17,0),.062,.055,'gold',8)
 cube('Short blade guard',(0,.16,0),(.30,.055,.09),'gold');blade('Single dual-wield blade',.20,.92,.073)
 ell('Amethyst hilt gem',(0,.16,.055),(.045,.035,.018),'violet')

def bow():
 pts=[(.30*sin(i/32*pi)-.30,.64*cos(i/32*pi),0) for i in range(33)];tube('Curved composite bow limbs',pts,.037,'gold',8)
 tube('Bow teal inlay',[(x,y,.034) for x,y,z in pts],.011,'cyan',6)
 tube('Taut bow string',[(-.30,-.64,0),(-.30,.64,0)],.006,'cream',6)
 cyl('Bow leather central grip',(0,0,0),.05,.24,'leather')
 for y in (-.63,.63):ell('Bow limb tip',(-.30,y,0),(.042,.045,.045),'dark')

def scaleplate():
 v=[]
 for z in (-.035,.035):v += [(-.18,.40,z),(0,.57,z),(.18,.40,z),(.13,.16,z),(0,.03,z),(-.13,.16,z),(0,.30,z*2)]
 f=[]
 for side in (0,7):
  for i in range(6):f.append((side+i,side+(i+1)%6,side+6))
 for i in range(6):f.append((i,(i+1)%6,(i+1)%6+7,i+7))
 mesh('Teal armored scale',v,f,'cyan');tube('Gold central scale ridge',[(0,.08,.06),(0,.29,.075),(0,.52,.055)],.012,'gold',6)

def crystalhorn():
 pts=[(0,.06,0),(.01,.19,0),(.055,.33,0),(.11,.46,0),(.17,.59,0)];v=[];f=[]
 for j,p in enumerate(pts):
  r=.095*(1-j/4)+.003
  for k in range(6):v.append((p[0]+r*cos(k*pi/3),p[1],p[2]+r*sin(k*pi/3)))
 for j in range(4):
  for k in range(6):a=j*6+k;b=j*6+(k+1)%6;f.append((a,b,b+6,a+6))
 mesh('Faceted violet crystal horn',v,f,'violet');cyl('Horn gold socket',(0,.065,0),.112,.11,'gold',8)

def essence():
 ell('Coral essence flask',(0,.23,0),(.15,.19,.15),'coral');cyl('Bottle neck',(0,.42,0),.068,.09,'dark');cyl('Gold stopper',(0,.49,0),.081,.07,'gold',12)
 cube('Essence label',(0,.23,.148),(.13,.17,.015),'cream',.015);ell('Essence cyan sigil',(0,.23,.165),(.035,.051,.008),'cyan')

def card():
 cube('Collectible gold card frame',(0,.33,0),(.43,.64,.045),'gold',.035)
 cube('Collectible dark card back',(0,.33,-.03),(.38,.59,.018),'dark',.025)
 o=mesh('cardFront',[(-.178,.074,.028),(.178,.074,.028),(.178,.586,.028),(-.178,.586,.028)],[(0,1,2,3)],'cardArtwork');o['cardFront']=True;o['replaceablePortrait']=True
 uv=o.data.uv_layers.new(name='PortraitUV')
 for i,p in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=p
 for x in (-.182,.182):ell('Corner cyan inset',(x,.604,.036),(.012,.012,.005),'cyan')

def export(key,fn):
 global PARTS
 PARTS=[];fn()
 # Keep artwork separate, batch other parts and deduplicate their material slots.
 artwork=[o for o in PARTS if o.get('cardFront')];other=[o for o in PARTS if not o.get('cardFront')]
 bpy.ops.object.select_all(action='DESELECT')
 for o in other:o.select_set(True)
 bpy.context.view_layer.objects.active=other[0];bpy.ops.object.join();o=bpy.context.object;o.name=key
 slots=list(o.data.materials);unique=[];mapping={}
 for i,m in enumerate(slots):
  if m not in unique:unique.append(m)
  mapping[i]=unique.index(m)
 ix=[mapping[p.material_index] for p in o.data.polygons];o.data.materials.clear()
 for m in unique:o.data.materials.append(m)
 for p,i in zip(o.data.polygons,ix):p.material_index=i
 # Bake object transforms so the arm socket origin is always exactly (0,0,0).
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 for a in artwork:a.select_set(True)
 objects=[o]+artwork
 bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
 triangles=0
 for obj in objects:obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
 REPORT.append({'id':key,'model':'models/tower/'+key+'.glb','triangles':triangles,'meshes':len(objects),'materials':len(unique)+len(artwork),'fileBytes':(OUT/(key+'.glb')).stat().st_size})
 for obj in objects:obj['assetKey']=key;obj.hide_set(True);obj.hide_render=True
for key,fn in [('greatsword',greatsword),('dualblade',dualblade),('bow',bow),('scale-plate',scaleplate),('crystal-horn',crystalhorn),('essence-vial',essence),('collectible-card',card)]:export(key,fn)
# The editable .blend displays a spaced asset library; exported GLBs retain grip-zero origins.
gallery={r['id']:(i-3)*.85 for i,r in enumerate(REPORT)}
for obj in bpy.context.scene.objects:
 if obj.type=='MESH':obj.hide_set(False);obj.hide_render=False;obj.location.x=gallery[obj['assetKey']]
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'authoring/tower-props.blend'))
manifest={'coordinateSystem':{'up':'+Y','front':'+Z','weaponGrip':[0,0,0]},'weapons':{k:{'model':f'models/tower/{k}.glb','grip':[0,0,0],'axis':'+Y','length':l} for k,l in [('greatsword',1.99),('dualblade',1.12),('bow',1.37)]},'drops':{'scale':{'model':'models/tower/scale-plate.glb','height':.57},'horn':{'model':'models/tower/crystal-horn.glb','height':.59},'essence':{'model':'models/tower/essence-vial.glb','height':.525},'card':{'model':'models/tower/collectible-card.glb','height':.65,'frontMesh':'cardFront','frontNormal':'+Z','portraitUV':'0..1'}} ,'assets':REPORT}
(ROOT/'data/tower-props.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print('TOWER_PROPS_COMPLETE',json.dumps(REPORT))

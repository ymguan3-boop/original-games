"""Native short grass patch: one vertex-color material, safe traversable town placements."""
import bpy,random,math,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];random.seed(439);bpy.ops.wm.read_factory_settings(use_empty=True)
verts=[];faces=[];colors=[]
palette=[(0.12,.32,.12,1),(.22,.46,.16,1),(.33,.56,.21,1),(.45,.62,.25,1),(.25,.49,.29,1)]
def vertex(p,c):verts.append((p[0],-p[2],p[1]));colors.append(c);return len(verts)-1
# Irregular low sod disk, thinner than gameplay footsteps.
center=vertex((0,.004,0),palette[0]);boundary=[]
for i in range(20):
 a=i/20*2*math.pi;r=1.32+random.random()*.18;boundary.append(vertex((math.cos(a)*r,.004,math.sin(a)*r),palette[random.randrange(2)]))
for i in range(20):faces.append((center,boundary[i],boundary[(i+1)%20]))
for i in range(240):
 a=random.random()*2*math.pi;r=math.sqrt(random.random())*1.35;x=math.cos(a)*r;z=math.sin(a)*r;h=random.uniform(.08,.22);w=random.uniform(.026,.048);turn=random.random()*math.pi;dx=math.cos(turn)*w;dz=math.sin(turn)*w;c=palette[random.randrange(5)];lean=random.uniform(-.045,.045)
 v=[vertex((x-dx,.008,z-dz),c),vertex((x+dx,.008,z+dz),c),vertex((x+dx*.45+lean,h*.57,z+dz*.45),c),vertex((x+lean*1.6,h,z),palette[3])]
 faces.extend([(v[0],v[1],v[2]),(v[0],v[2],v[3])])
me=bpy.data.meshes.new('Short grass vertex color geometry');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('ShortGrassPatch',me);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
attr=me.color_attributes.new(name='GrassColor',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors):attr.data[i].color=c
mat=bpy.data.materials.new('Five green shades in one vertex-color material');mat.use_nodes=True;mat.diffuse_color=palette[2];bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.86;node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='GrassColor';mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);mat.use_backface_culling=False;me.materials.append(mat)
o['collision']=False;o['traversable']=True;o['heightRange']=[.08,.22]
bpy.ops.wm.save_as_mainfile(filepath=str(R/'authoring/grass.blend'));bpy.ops.export_scene.gltf(filepath=str(R/'models/props/short-grass.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
world=json.loads((R/'data/world.json').read_text(encoding='utf-8-sig'));collisions=world['collisions'];candidates=[]
for x in [-32,-26,-20,-14,-8,8,14,20,26,32]:
 for z in [-32,-26,-20,-14,-8,8,14,20,26,32]:
  if abs(z-1)<5.5 or abs(z-29)<5 or ((x-20)/8)**2+((z+23)/7)**2<1 or (x+19)**2+(z+26)**2<9**2:continue
  if any(abs(x-c['x'])<c['w']/2+(.55 if c.get('kind')=='tree' else 2.3) and abs(z-c['z'])<c['d']/2+(.55 if c.get('kind')=='tree' else 2.3) for c in collisions):continue
  # Building door paths run from each south/front wall to a boulevard.
  if any(abs(x-c['x'])<3.8 and ((c['z']<0 and c['z']+c['d']/2-2<z<4) or (c['z']>0 and c['z']+c['d']/2-2<z<32)) for c in collisions if c.get('id') in ('care_center','ranger_station','dream_lab','gym_light','tower_starspire','house_resident_a')):continue
  candidates.append((x,z))
random.shuffle(candidates);patches=[]
for i,(x,z) in enumerate(candidates[:26]):patches.append({'id':f'short_grass_{i:02d}','position':[x,.025,z],'scale':[round(random.uniform(.85,1.15),3),1,round(random.uniform(.85,1.15),3)],'yaw':round(random.random()*2*math.pi,4)})
data={'model':'models/props/short-grass.glb','heightRange':[.08,.22],'footprint':[3,3],'collision':False,'traversable':True,'materialMode':'one material with COLOR_0 vertex colors','patches':patches}
(R/'data/grass-patches.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
# Reimport the delivered GLB, then render its actual native vertex colours.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(R/'models/props/short-grass.glb'));sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=16;sc.world=bpy.data.worlds.new('Soft daylight');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.72,.8,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='AREA',location=(1,-2,5));bpy.context.object.data.energy=280;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=5
bpy.ops.object.camera_add(location=(3,-4,3));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.06))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.9;sc.camera=cam;sc.render.resolution_x=900;sc.render.resolution_y=650;sc.render.resolution_percentage=100;(R/'qa/grass').mkdir(parents=True,exist_ok=True);sc.render.filepath=str(R/'qa/grass/short-grass.png');bpy.ops.render.render(write_still=True)
print('GRASS_COMPLETE',json.dumps({'patches':len(patches),'vertices':len(verts),'triangles':len(faces),'materialCount':1,'heightMin':.004,'heightMax':max(v[2] for v in verts),'importSuccess':True}))

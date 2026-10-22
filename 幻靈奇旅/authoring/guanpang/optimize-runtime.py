"""Create a lightweight skinned game derivative; keeps the source GLB intact."""
import bpy,json,struct,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'models/spirits/guanpang.glb'
MASTER=ROOT.parents[1]/'artifacts/guanpang-runtime-original/guanpang.glb'
DEST=ROOT/'models/spirits/guanpang.glb'
if not MASTER.exists():
 MASTER.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(SOURCE,MASTER)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(MASTER))
report={'sourceBytes':MASTER.stat().st_size,'beforeTriangles':0,'afterTriangles':0}
for ob in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 before=sum(len(p.vertices)-2 for p in ob.data.polygons);report['beforeTriangles']+=before
 bpy.context.view_layer.objects.active=ob
 # Keep facial topology and expression bones while reducing armor/limb tessellation.
 vg=ob.vertex_groups.new(name='RuntimeSimplification')
 for v in ob.data.vertices:
  facial=any(ob.vertex_groups[g.group].name in ['eyeL','eyeR','mouth','browL','browR'] and g.weight>.5 for g in v.groups)
  vg.add([v.index],0.0 if facial else 1.0,'REPLACE')
 mod=ob.modifiers.new('Game topology budget','DECIMATE');mod.ratio=.17;mod.vertex_group=vg.name;mod.vertex_group_factor=1.0;mod.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=mod.name)
 report['afterTriangles']+=sum(len(p.vertices)-2 for p in ob.data.polygons)
for ob in bpy.context.scene.objects:
 if ob.type=='ARMATURE' and ob.animation_data:
  ob.animation_data.action=None
  for tr in ob.animation_data.nla_tracks:tr.mute=False
bpy.ops.export_scene.gltf(filepath=str(DEST),export_format='GLB',export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
report['afterBytes']=DEST.stat().st_size
Path(__file__).with_name('runtime-optimization.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('RUNTIME_DONE',report)

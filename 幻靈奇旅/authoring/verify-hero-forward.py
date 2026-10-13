import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'authoring/hero.blend'))
r=bpy.data.objects['BlenderHero'];report={}
for label in ('Throw','Attack','Walk'):
    for tr in r.animation_data.nla_tracks:tr.mute=tr.name!=label
    r.animation_data.action=None
    frames=[]
    for f in [1,7,13,19,25]:
        bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
        def point(b):
            v=r.matrix_world@r.pose.bones[b].tail;return [round(v.x,5),round(v.z,5),round(-v.y,5)]
        frames.append(dict(frame=f,handR=point('ForearmR'),handL=point('ForearmL'),kneeR=point('ThighR'),kneeL=point('ThighL')))
    report[label]=frames
assert report['Throw'][2]['handR'][2]>.5 and report['Attack'][2]['handR'][2]>.5
assert report['Walk'][1]['handR'][2]*report['Walk'][1]['kneeR'][2]<0
for tr in r.animation_data.nla_tracks:tr.mute=tr.name!='Throw'
bpy.context.scene.frame_set(13)
for o in bpy.data.objects:
    if o.name.startswith('Costume_'):o.hide_render=True
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True
scene.world=bpy.data.worlds.new('QA studio');scene.world.color=(.8,.85,.9)
bpy.ops.object.camera_add(location=(5,-6,3.0));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.15,1.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.6;scene.camera=cam
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
(root/'qa').mkdir(exist_ok=True);scene.render.filepath=str(root/'qa/hero-forward-throw.png');bpy.ops.render.render(write_still=True)
(root/'qa/hero-forward-kinematics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('KINEMATICS_VERIFIED',json.dumps(report))

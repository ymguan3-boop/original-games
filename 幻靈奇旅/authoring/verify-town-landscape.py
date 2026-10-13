import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'authoring/town-landscape.blend'))
s=bpy.context.scene;s.render.engine='BLENDER_WORKBENCH';s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL';s.display.shading.show_shadows=True;s.display.shading.show_cavity=True
bpy.ops.object.camera_add(location=(63,-79,75));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=104;s.camera=cam
s.render.resolution_x=1400;s.render.resolution_y=1100;s.render.resolution_percentage=100
(root/'qa').mkdir(exist_ok=True);s.render.filepath=str(root/'qa/town-landscape.png');bpy.ops.render.render(write_still=True)

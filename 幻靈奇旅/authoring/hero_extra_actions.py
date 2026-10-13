"""Two additional native skeleton actions. Compatible with the original hero rest rig."""
import bpy,math
from mathutils import Vector
from pathlib import Path

def add_extra_hero_actions(rig):
    pb=rig.pose.bones
    skin=max((o for o in rig.children if o.type=='MESH'),key=lambda o:len(o.data.vertices))
    points={}
    for name in ('FootL','FootR','ForearmR'):
        idx=skin.vertex_groups[name].index
        points[name]=[v.co.copy() for v in skin.data.vertices if any(g.group==idx and g.weight>.99 for g in v.groups)]
    restinv={name:rig.data.bones[name].matrix_local.inverted() for name in points}
    def low(name):
        mat=rig.matrix_world@pb[name].matrix@restinv[name]
        return min((mat@v).z for v in points[name])
    def smooth(x):
        x=max(0,min(1,x));return x*x*(3-2*x)
    if rig.animation_data:
        rig.animation_data.action=None
        for tr in list(rig.animation_data.nla_tracks):
            if tr.name in ('JumpCelebrate','GroundPoundDisappointed'):rig.animation_data.nla_tracks.remove(tr)
            else:tr.mute=True
    for label in ('JumpCelebrate','GroundPoundDisappointed'):
        for frame in range(1,38):
            u=(frame-1)/36
            for b in pb:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
            if label=='JumpCelebrate':
                preload=math.sin(math.pi*min(1,u/.22))**2 if u<.22 else .28*math.sin(math.pi*min(1,max(0,(u-.72)/.28)))**2
                airborne=max(0,math.sin(math.pi*max(0,min(1,(u-.18)/.58))))*.62 if .18<u<.76 else 0
                cheer=smooth(u/.22)*smooth((1-u)/.2)
                for side in ('L','R'):
                    pb['Thigh'+side].rotation_euler.x=.50*preload
                    pb['Shin'+side].rotation_euler.x=-1.0*preload
                    pb['Foot'+side].rotation_euler.x=.50*preload
                pb['UpperArmR'].rotation_euler.z=2.7*cheer
                pb['ForearmR'].rotation_euler.x=.30*cheer
                pb['UpperArmL'].rotation_euler.z=-.36*cheer
                pb['ForearmL'].rotation_euler.x=.60*cheer
                pb['Torso'].rotation_euler.x=-.10*cheer
                pb['Head'].rotation_euler.x=-.08*cheer
            else:
                crouch=smooth(u/.28)*smooth((1-u)/.22)
                for side in ('L','R'):
                    pb['Thigh'+side].rotation_euler.x=1.35*crouch
                    pb['Shin'+side].rotation_euler.x=-2.5*crouch
                    pb['Foot'+side].rotation_euler.x=1.15*crouch
                pb['Torso'].rotation_euler.x=1.10*crouch
                pb['Head'].rotation_euler.x=.20*crouch
                pb['UpperArmL'].rotation_euler.x=-.40*crouch
                pb['ForearmL'].rotation_euler.x=.70*crouch
                pb['ForearmR'].rotation_euler.x=.10*crouch
                airborne=0
            # Solve planted shoe contact from actual rest mesh vertices, not a guessed hip drop.
            bpy.context.view_layer.update();pb['Root'].location.y=.003-min(low('FootL'),low('FootR'))+airborne;bpy.context.view_layer.update()
            if label=='GroundPoundDisappointed':
                # At impact, solve the right hand's actual lowest skin point against y=.012.
                lo=0;hi=None
                for a in range(1,23):
                    pb['UpperArmR'].rotation_euler.x=a*.1;bpy.context.view_layer.update()
                    if low('ForearmR')<=.012:hi=a*.1;break
                if hi is not None:
                    for _ in range(12):
                        mid=(lo+hi)/2;pb['UpperArmR'].rotation_euler.x=mid;bpy.context.view_layer.update()
                        if low('ForearmR')>.012:lo=mid
                        else:hi=mid
                    contact=lo
                else:contact=0
                strike=smooth((u-.32)/.18)*smooth((.87-u)/.19)
                windup=smooth(u/.18)*smooth((.49-u)/.20)
                pb['UpperArmR'].rotation_euler.x=contact*strike-.70*windup*(1-strike)
            for b in pb:
                b.keyframe_insert('rotation_euler',frame=frame,group=b.name);b.keyframe_insert('location',frame=frame,group=b.name)
        action=rig.animation_data.action;action.name='hero_'+label;action.use_fake_user=True
        tr=rig.animation_data.nla_tracks.new();tr.name=label;strip=tr.strips.new(label,1,action);strip.name=label;rig.animation_data.action=None;tr.mute=True
    for b in pb:b.rotation_euler=(0,0,0);b.location=(0,0,0)
    bpy.context.scene.frame_set(1)

if __name__=='__main__':
    R=Path(__file__).resolve().parents[1];bpy.ops.wm.open_mainfile(filepath=str(R/'authoring/hero.blend'));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');add_extra_hero_actions(rig)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for o in rig.children:o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(R/'models/hero.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_frame_range=False,export_force_sampling=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_cameras=False,export_lights=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(R/'authoring/hero.blend'));print('HERO_EXTRA_ACTIONS_COMPLETE',[tr.name for tr in rig.animation_data.nla_tracks])

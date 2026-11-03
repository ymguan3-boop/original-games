"""Build the review-only starlight scythe. Blender Z-up; glTF Y-up, grip near origin."""
import bpy, math
from mathutils import Vector
from pathlib import Path
from math import sin,cos,pi
HERE=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=.0,rough=.4,emit=0):
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emit:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emit
    return m
steel=mat('刃面｜深藍鍛鋼','526e86',.82,.26);edge=mat('刃緣｜亮銀','c6edf5',.88,.20);dark=mat('背脊｜夜藍','19293b',.68,.3);gold=mat('鑲邊｜古金','d4a961',.78,.26);leather=mat('握把｜深褐皮革','493127',.05,.75);leather2=mat('纏繩｜暖棕','a8734b',.1,.6);cyan=mat('星核｜青藍','42d2fb',.25,.2,1.1)
parts=[]
def finish(o,name,m):
    o.name=name;o.data.materials.append(m)
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    parts.append(o);return o
def cylinder(name,a,b,r1,r2,m,verts=24):
    a,b=Vector(a),Vector(b);d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();finish(o,name,m);bevel=o.modifiers.new('Rounded metal','BEVEL');bevel.width=.008;bevel.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def curve(name,pts,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3
    sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,v in zip(sp.points,pts):p.co=(*v,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,name,m);return o
def gem(name,p,scale,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p);o=bpy.context.object;o.scale=scale;finish(o,name,m);return o
def blade(name,top,bottom,width,material):
    # Each contour spans the same length from the collar to the curved point.
    # Narrow centre ridge and two outer surfaces create a genuine sharpened profile.
    n=len(top);v=[]
    for side in [-1,1]:
        for i in range(n):
            t=top[i];b=bottom[i];mid=((t[0]+b[0])/2,(t[1]+b[1])/2)
            for x,z,y in [(t[0],t[1],.006*side),(mid[0],mid[1],width*side*sin(pi*i/(n-1))+.012*side),(b[0],b[1],.004*side)]:v.append((x,y,z))
    faces=[]
    for side in range(2):
        ofs=side*n*3
        for i in range(n-1):
            for j in range(2):
                f=(ofs+i*3+j,ofs+(i+1)*3+j,ofs+(i+1)*3+j+1,ofs+i*3+j+1)
                faces.append(f if side else tuple(reversed(f)))
    for i in range(n-1):
        for j in [0,2]:faces.append((i*3+j,(i+1)*3+j,n*3+(i+1)*3+j,n*3+i*3+j))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,material);return o
def bezier(a,b,c,d,t):return tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i] for i in range(2))
# Long, tapered wood haft. Grip origin is centred for future hand attachment.
cylinder('木柄',(0,0,-.87),(0,0,1.06),.048,.041,leather)
cylinder('下握把',(0,0,-.83),(0,0,-.12),.054,.052,leather2)
cylinder('上握把',(0,0,.02),(0,0,.41),.052,.049,leather)
for z in [-.86,-.76,-.68,-.58,-.10,-.025,.41,.54,.97,1.04]:cylinder('金屬箍',(0,0,z),(0,0,z+.028),.060,.060,gold)
for lo,hi in [(-.80,-.12),(.02,.4)]:
    points=[];turns=10
    for j in range(161):
        t=j/160;a=t*turns*2*pi;points.append((.054*cos(a),.054*sin(a),lo+(hi-lo)*t))
    curve('交叉皮繩纏握',points,.007,leather2)
cylinder('柄尾護錐',(0,0,-.87),(0,0,-.98),.060,.008,gold)
cylinder('刃座',(0,0,.91),(0,0,1.16),.09,.07,dark)
cylinder('刃座金扣',(0,0,1.05),(0,0,1.13),.094,.08,gold)
# Swept crescent: broad shoulder, tapered hooked cutting tip.
n=57
top=[bezier((0,1.13),(.40,1.32),(1.13,1.08),(1.20,.31),i/(n-1)) for i in range(n)]
bottom=[bezier((0,1.06),(.29,.98),(.97,.87),(1.20,.31),i/(n-1)) for i in range(n)]
# Expand the crescent around its mounting point while keeping the shaft unchanged.
top=[(x*1.3, 1.10+(z-1.10)*1.3) for x,z in top]
bottom=[(x*1.3, 1.10+(z-1.10)*1.3) for x,z in bottom]
# Thin luminous polished edge follows the exact inner cutting contour.
inner=[]
for i,(a,b) in enumerate(zip(top,bottom)):
    width=.065*sin(pi*i/(n-1))**.6
    vec=Vector((a[0]-b[0],a[1]-b[1]));vec.normalize() if vec.length else None
    inner.append((b[0]+vec.x*width,b[1]+vec.y*width))
# Adjacent surfaces, rather than a silver overlay on the steel blade, prevent
# depth-buffer fighting as the character moves the weapon.
blade('月弧主刃',top,inner,.055,steel)
blade('磨亮內刃',inner,bottom,.018,edge)
curve('金色刃脊',[(x,-.012,z+.012) for x,z in top],.013,gold)
for y in [-.058,.058]:
    stripe=[]
    for i in range(3,45):
        a=top[i];b=bottom[i];stripe.append((a[0]*.65+b[0]*.35,y*sin(pi*i/(n-1)),a[1]*.65+b[1]*.35))
    curve('星光凹槽',stripe,.007,cyan)
for side in [-1,1]:
    gem('星核金座',(0,side*.092,1.08),(.10,.035,.135),gold)
    gem('星核青晶',(0,side*.126,1.08),(.062,.025,.084),cyan)
    for i in [9,23,36]:
        a=top[i];b=bottom[i];x=a[0]*.79+b[0]*.21;z=a[1]*.79+b[1]*.21
        gem('鑲鉚釘',(x,side*.054*sin(pi*i/(n-1)),z),(.016,.009,.016),gold)
# Small counter hook adds a balanced silhouette without another attack surface.
hooktop=[bezier((-.03,1.10),(-.20,1.21),(-.38,1.12),(-.42,.93),i/(n-1)) for i in range(n)]
hookbottom=[bezier((-.03,1.02),(-.18,1.02),(-.33,.98),(-.42,.93),i/(n-1)) for i in range(n)]
blade('短月鉤',hooktop,hookbottom,.025,dark);curve('短月金脊',[(x,-.008,z) for x,z in hooktop],.009,gold)
# Join through a root object while retaining editable pieces in Blender.
root=bpy.data.objects.new('StarlightScythe_Grip',None);bpy.context.collection.objects.link(root)
for o in parts:o.parent=root
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'starlight-scythe.blend'))
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(HERE/'starlight-scythe.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
print('SCYTHE_READY',len(parts))

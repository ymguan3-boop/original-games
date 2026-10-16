"""61 original spirits, authored natively in Blender. Rebuild: blender -b -P spirits.py
No imported Pokemon geometry. X/right, Y/up, Z/front author coordinates.
Each creature has six materials, a deforming armature and four gameplay clips.
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'models'/'spirits';OUT.mkdir(parents=True,exist_ok=True)
(ROOT/'data').mkdir(exist_ok=True)

# Existing save identifiers are deliberately retained; displayed identities are original.
FAMILIES=[
 ('grass','sprout-boar','boar',0x72AA5D,['bulbasaur','ivysaur','venusaur'],['青螺靈','紫羽螺','赤鎧螺王']),
 ('fire','fire-cat','cat',0xED873F,['charmander','charmeleon','charizard'],['剝皮辣椒雞','雙椒辣椒雞','豐椒辣椒雞王']),
 ('water','sesame-spirit','woolball',0x509FBF,['squirtle','wartortle','blastoise'],['小芝麻','絨芝麻','星冠芝麻']),
 ('grass','willow-deer','deer',0x8EA761,['chikorita','bayleef','meganium'],['嫩芽鹿','柳鈴鹿','森燈冠鹿']),
 ('fire','kiln-shell','hedgehog',0xB87C58,['cyndaquil','quilava','typhlosion'],['炭絨刺團','熔陶甲獸','赤窯守甲']),
 ('water','crystal-newt','newt',0x65B9BC,['totodile','croconaw','feraligatr'],['溪鈴螈','晶鰭螈','冰瀑翼螈']),
 ('grass','fern-gecko','lizard',0x4C9C77,['treecko','grovyle','sceptile'],['苔點蜥','蕨帆蜥','翠環森蜥']),
 ('fire','lantern-bird','bird',0xDA914F,['torchic','combusken','blaziken'],['燈茸雀','霞羽鶴','曦焰長羽']),
 ('water','lotus-frog','frog',0x6BB5A3,['mudkip','marshtomp','swampert'],['泡泡蛙','荷盞蛙','滄瀾角蛙']),
 ('grass','mountain-badger','badger',0x908E64,['turtwig','grotle','torterra'],['籽背鼴','石芽獾','嶺苔山獾']),
 ('fire','comet-ape','monkey',0xCE7D59,['chimchar','monferno','infernape'],['星火猿','銅爐猿','彗拳巨猿']),
 ('water','moon-owl','owl',0x849DBB,['piplup','prinplup','empoleon'],['霜絨鴞','雪幕鴞','月輪翼鴞']),
]
EXTRAS=[
 ('articuno','霜鏡天鰩','ice','manta',0x81C9DE,3,'legendary'),
 ('zapdos','雷紋巨蛾','electric','moth',0xD4B541,3,'legendary'),
 ('moltres','赤曜雙翼','fire','phoenix',0xE38555,3,'legendary'),
 ('raikou','轟角麒麟','electric','kirin',0xC5A550,3,'legendary'),
 ('entei','熔岩獅鷲','fire','griffin',0xAB654E,3,'legendary'),
 ('suicune','澄夢長頸鹿','water','longdeer',0x79B4BB,3,'legendary'),
 ('kyogre','星潮空鯨','water','whale',0x637AAF,3,'legendary'),
 ('groudon','大地晶甲龜','earth','turtle',0xA9876B,3,'legendary'),
 ('rayquaza','風環遊龍','wind','serpent',0x70ADAB,3,'legendary'),
 ('dialga','時砂巨象','metal','elephant',0x7A9BA3,3,'legendary'),
 ('palkia','月瀾海馬','water','seahorse',0xB68BBB,3,'legendary'),
 ('giratina','暮影六翼鹿','shadow','shadowdeer',0x827897,3,'legendary'),
 ('pikachu','閃角兔','electric','rabbit',0xE6C467,1,'gym'),
 ('mew','星霧雲靈','psychic','cloud',0xC6A8DD,1,'gym'),
 ('wigglytuff','絨心團獸','fairy','fluff',0xD793AC,1,'gym'),
 ('blissey','暖巢福鹿','fairy','nestdeer',0xD5AE8E,1,'gym'),
 ('raichu','霆冠躍兔','electric','rabbit',0xC0A650,2,'wild'),
 ('caterpie','銅寶箱','grass','chest',0x91B972,1,'wild'),
 ('metapod','銀寶箱','grass','chest',0xA5AF66,2,'wild'),
 ('butterfree','金寶箱','grass','chest',0x83BCAA,3,'wild'),
 ('weedle','砂角幼蟲','earth','grub',0xBBA57A,1,'wild'),
 ('kakuna','晶砂繭','earth','crystal',0xBB9C77,2,'wild'),
 ('beedrill','琥晶蜻靈','earth','dragonfly',0xB9A066,3,'wild'),
 ('mewtwo','紫晶念王','psychic','oracle',0x9E81BE,3,'reward'),
 ('jigglypuff','夢鈴絨球','fairy','fluff',0xE3ADBA,1,'reward'),
]
ELEMENT={'grass':('森',0xC7DB81),'fire':('焰',0xFFD673),'water':('潮',0xB7E5E7),'ice':('霜',0xDBFAFF),'electric':('雷',0xFFF29A),'earth':('岩',0xE6D4A5),'wind':('風',0xCAEEE3),'metal':('鋼',0xCBDFE5),'shadow':('影',0xCEBEE6),'psychic':('星',0xE5C8F4),'fairy':('夢',0xFFE2E8)}
DATA=[]
for element,family,form,color,ids,names in FAMILIES:
 for i,(id,name) in enumerate(zip(ids,names)):
  DATA.append(dict(id=id,speciesId=id,name=name,element=element,type=ELEMENT[element][0],stage=i+1,family=family,form=form,color=color,role='starter',previous=ids[i-1] if i else None,next=ids[i+1] if i<2 else None))
for id,name,element,form,color,stage,role in EXTRAS:DATA.append(dict(id=id,speciesId=id,name=name,element=element,type=ELEMENT[element][0],stage=stage,family=id,form=form,color=color,role=role,previous=None,next=None))
for chain in [['pikachu','raichu'],['caterpie','metapod','butterfree'],['weedle','kakuna','beedrill']]:
 for i,id in enumerate(chain):
  d=next(x for x in DATA if x['id']==id);d.update(family=chain[0],previous=chain[i-1] if i else None,next=chain[i+1] if i+1<len(chain) else None)
for d in DATA:
 d.update(model='models/spirits/'+d['id']+'.glb',height=round(1.275*1.3**(d['stage']-1),5),hp=55+35*d['stage']+(50 if d['role']=='legendary' else 0),attack=12+14*d['stage'],evolvesTo=d['next'],rarity='傳說' if d['role']=='legendary' else '稀有' if d['role'] in ('gym','reward') else ['普通','進階','珍稀'][d['stage']-1],motionType='fly' if d['form'] in ('owl','manta','moth','phoenix','griffin','dragonfly','whale') or d['form']=='bird' and d['stage']==3 else 'float' if d['form'] in ('cloud','serpent','seahorse','oracle') else 'walk')
 d['skills']=[dict(name=ELEMENT[d['element']][0]+'光輕擊',power=d['attack'],cost=1),dict(name=d['name'][:2]+'共鳴',power=d['attack']*2,cost=3)]
 d['description']=f"{d['name']}是初光之境的{d['type']}屬性幻靈。"+{'cat':'牠以溫暖的額焰辨認夥伴，尾尖的火光會隨心情搖曳。','deer':'枝角會在夜裡亮起，帶領迷路的旅人返回村莊。','owl':'寬闊的翅膀能安靜掠過樹梢，羽紋記錄著月光。','cloud':'柔軟雲絮包裹著星核，喜歡漂浮在信任的旅人身邊。','rabbit':'雙耳間的晶角儲存雷光，奔跑時留下明亮足跡。'}.get(d['form'],'牠具有獨特的輪廓與棲地習性，願意與真誠的旅人成為夥伴。')
# Gameplay data is owned separately. Model builds never overwrite spirits.json.

def xyz(p):return (p[0],-p[2],p[1])
def lin(c):
 def f(v):v=v/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 return tuple(f((c>>b)&255) for b in (16,8,0))+(1,)
PARTS=[];BONES={};MATS={}
def bone(name,p,parent='Body'):
 BONES[name]=(p,parent);return name
def mesh(name,verts,faces,mat,b='Body'):
 me=bpy.data.meshes.new(name);me.from_pydata([xyz(v) for v in verts],[],faces);me.update();me.validate()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(MATS[mat]);vg=o.vertex_groups.new(name=b);vg.add(list(range(len(verts))),1.0,'REPLACE')
 for p in me.polygons:p.use_smooth=True
 PARTS.append(o);return o
def ell(name,p,s,mat='base',b='Body',n=16,m=10):
 v=[];f=[]
 # True poles avoid coincident degenerate triangles.
 v.append((p[0],p[1]+s[1],p[2]))
 for j in range(1,m):
  a=pi*j/m
  for i in range(n):q=2*pi*i/n;v.append((p[0]+s[0]*sin(a)*sin(q),p[1]+s[1]*cos(a),p[2]+s[2]*sin(a)*cos(q)))
 bottom=len(v);v.append((p[0],p[1]-s[1],p[2]))
 for i in range(n):f.append((0,1+i,1+(i+1)%n));f.append((bottom,1+(m-2)*n+(i+1)%n,1+(m-2)*n+i))
 for j in range(m-2):
  for i in range(n):a=1+j*n+i;bb=1+j*n+(i+1)%n;c=1+(j+1)*n+(i+1)%n;dd=1+(j+1)*n+i;f.append((a,dd,c,bb))
 return mesh(name,v,f,mat,b)
def tube(name,points,radii,mat='base',b='Body',n=10):
 v=[];f=[]
 for j,p in enumerate(points):
  tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
  tangent.normalize();u=tangent.cross(Vector((0,0,1)))
  if u.length<.01:u=tangent.cross(Vector((0,1,0)))
  u.normalize();w=tangent.cross(u).normalized()
  for i in range(n):q=2*pi*i/n;v.append(tuple(Vector(p)+radii[j]*(cos(q)*u+sin(q)*w)))
 for j in range(len(points)-1):
  for i in range(n):a=j*n+i;bb=j*n+(i+1)%n;c=(j+1)*n+(i+1)%n;dd=(j+1)*n+i;f.append((a,bb,c,dd))
 f.extend([tuple(range(n-1,-1,-1)),tuple((len(points)-1)*n+i for i in range(n))]);return mesh(name,v,f,mat,b)
def spike(name,a,z,r=.08,mat='accent',b='Body'):
 mid=tuple((x+y)/2 for x,y in zip(a,z));return tube(name,[a,mid,z],[r,r*.62,.006],mat,b,10)
def blade(name,a,z,width,mat='light',b='Body'):
 center=tuple((x+y)/2 for x,y in zip(a,z));direction=Vector(z)-Vector(a);cross=direction.cross(Vector((0,0,1))).normalized()*width
 v=[a,tuple(Vector(center)+cross),z,tuple(Vector(center)-cross),(center[0],center[1],center[2]+width*.25),(center[0],center[1],center[2]-width*.25)]
 return mesh(name,v,[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(1,0,5),(2,1,5),(3,2,5),(0,3,5)],mat,b)
def face(center,width=.35,depth=.27,b='Head',beak=False):
 x,y,z=center
 for s in [-1,1]:
  ell('Eye cream',(x+s*width*.46,y+.04,z+depth*.85),(.095,.12,.045),'white',b,14,10)
  ell('Glossy iris',(x+s*width*.46,y+.035,z+depth*.99),(.060,.083,.025),'dark',b,14,10)
  ell('Eye sparkle',(x+s*width*.46-.018,y+.069,z+depth*1.055),(.022,.029,.009),'white',b,10,7)
 if beak:spike('Small beak',(x,y-.085,z+depth*.9),(x,y-.13,z+depth+ .18),.085,'accent',b)
 else:
  ell('Muzzle left',(x-.055,y-.12,z+depth*.86),(.094,.063,.049),'light',b,14,8);ell('Muzzle right',(x+.055,y-.12,z+depth*.86),(.094,.063,.049),'light',b,14,8)
  ell('Nose',(x,y-.094,z+depth*1.055),(.038,.025,.020),'dark',b,12,8)
  tube('Smile',[(x-.064,y-.174,z+depth*.93),(x,y-.193,z+depth),(x+.064,y-.174,z+depth*.93)],[.009]*3,'dark',b,6)
def legs(bodyY=.59,zfront=.25,zback=-.35,width=.24,thick=.11,long=.0):
 for j,z in enumerate([zfront,zback]):
  for s in [-1,1]:
   name=('Front' if j==0 else 'Back')+('L' if s<0 else 'R');bone(name,(s*width,bodyY,z))
   tube('Connected '+name,[(s*width,bodyY+.05,z),(s*(width+.025),.31+long,z-.02),(s*(width+.02),.10,z+.02)],[thick,thick*.8,thick*.72],'base',name)
   ell(name+' soft paw',(s*(width+.02),.10,z+.075),(thick*1.15,.10,thick*1.4),'light',name,14,8)
def tail(points,r=.07,mat='base'):
 bone('Tail',points[0]);tube('Flexible tail',points,[r*(1-i/(len(points)+1)) for i in range(len(points))],mat,'Tail');return points[-1]
def ears(y,z,width=.29,height=.38,round=False):
 for s in [-1,1]:
  if round:ell('Round ear',(s*width,y+.08,z),(.15,.17,.09),'base','Head');ell('Ear inset',(s*width,y+.09,z+.075),(.082,.10,.019),'light','Head')
  else:
   tube('Sculpted ear',[(s*width,y,z),(s*(width+.05),y+height*.6,z-.02),(s*(width+.1),y+height,z-.01)],[.12,.09,.008],'base','Head',12)
   blade('Ear inset',(s*width,y+.04,z+.104),(s*(width+.08),y+height*.87,z+.019),.055,'light','Head')
def crest(y,z,level=1,mat='accent',b='Head'):
 for j in range(level+1):
  x=(j-level/2)*.13;spike('Crown point',(x,y,z),(x+.03,y+.22+.08*(level-abs(j-level/2)),z-.035),.09,mat,b)
def wings(y,z,span=1.1,feathers=5,mat='base',insect=False):
 for s in [-1,1]:
  b='WingL' if s<0 else 'WingR';bone(b,(s*.24,y,z))
  if insect:
   for k,zz in enumerate([.16,-.28]):
    ell('Silken wing',(s*(.52+span*.18),y+.04,z+zz),(span*.47,.055,.28 if k==0 else .22),mat,b,20,12)
    ell('Wing eyespot',(s*(.63+span*.18),y+.095,z+zz),(.12,.018,.10),'accent',b,14,8)
  else:
   tube('Connected wing shoulder',[(s*.22,y,z),(s*.62,y+.08,z-.05),(s*span,y+.02,z-.12)],[.13,.11,.035],mat,b,12)
   for i in range(feathers):
    t=i/(feathers-1);a=(s*(.42+t*(span-.42)),y+.03,z-.03);tip=(s*(.56+t*(span-.32)),y-.04,z-.47-.14*t)
    blade('Overlapping flight feather',a,tip,.15,'light' if i%3==0 else mat,b)
def horns(y,z,width=.21,level=1,b='Head'):
 for s in [-1,1]:
  pts=[(s*width,y,z),(s*(width+.05),y+.23,z-.05),(s*(width+.15),y+.36+.1*level,z-.14)]
  tube('Branch antler',pts,[.055,.045,.008],'accent',b)
  for k in range(level):spike('Antler branch',(s*(width+.04),y+.19+k*.08,z-.04),(s*(width+.22),y+.30+k*.11,z+.08),.035,'accent',b)
def flame(p,b='Head',scale=1):
 x,y,z=p;tube('Sculpted flame',[(x,y,z),(x-.025*scale,y+.15*scale,z),(x+.03*scale,y+.32*scale,z-.01),(x+.065*scale,y+.45*scale,z-.035)],[.12*scale,.14*scale,.07*scale,.003],'accent',b,12)
 blade('Flame heart',(x,y+.025*scale,z+.09*scale),(x+.025*scale,y+.31*scale,z+.05*scale),.06*scale,'light',b)

def quadruped(d):
 form=d['form'];st=d['stage'];bulky=form in ('boar','badger','hedgehog','turtle','elephant');deer=form in ('deer','kirin','longdeer','shadowdeer','nestdeer')
 by=.70 if deer else .60;hc=(0,1.20 if deer else .96,.40);hs=(.28,.32,.28) if deer else (.36,.34,.29)
 if form=='longdeer':hc=(0,1.57,.35);tube('Long curved neck',[(0,.65,.25),(0,1.04,.26),hc],[.22,.16,.18],'base')
 else:ell('Soft neck',(0,by+.13,.28),(.25,.28,.24),'base')
 ell('Organic torso',(0,by,-.13),(.38 if bulky else .30,.35 if bulky else .30,.56),'base')
 bone('Head',hc);ell('Rounded face',hc,hs,'base','Head',20,14);face(hc,hs[0],hs[2])
 legs(by,.27,-.48,.25 if bulky else .21,.14 if bulky else .09,long=.07 if deer else 0)
 if form in ('cat','griffin'):
  ears(hc[1]+.19,hc[2]-.07,height=.33 if st==1 else .28);ell('Soft chest',(0,.63,.40),(.23,.26,.06),'light')
  tip=tail([(0,.67,-.60),(.25,.80,-.82),(.39,1.05,-.73),(.29,1.19,-.62)])
  flame(tip,'Tail',.9);flame((0,hc[1]+.26,hc[2]),scale=.55+st*.15)
  if st>1:
   for i in range(10+st*2):
    a=2*pi*i/(10+st*2);blade('Layered sun mane',(sin(a)*.22,hc[1]+cos(a)*.20,hc[2]-.06),(sin(a)*(.43+st*.035),hc[1]+cos(a)*(.43+st*.035),hc[2]-.08),.12,'accent' if i%2 else 'light','Head')
  if form=='griffin':wings(.94,-.15,1.4,7,'base');horns(1.18,.35,.18,2)
 elif deer:
  ears(hc[1]+.16,hc[2]-.045,.29,.18);horns(hc[1]+.24,hc[2]-.06,.16,st)
  tail([(0,.75,-.60),(.02,.83,-.83),(.02,.93,-.85)],.05,'light')
  for s in [-1,1]:
   for j in range(3):ell('Coat spot',(s*.285,.75-j*.11,-.10-j*.10),(.015,.035,.050),'light',n=12,m=8)
  if form in ('kirin','shadowdeer'):wings(.94,-.15,1.22,5,'accent')
  if form=='nestdeer':
   for i in range(8):a=i*pi/4;ell('Woven nest',(sin(a)*.24,1.02,-.24+cos(a)*.24),(.12,.08,.08),'accent',n=12,m=8)
   ell('Warm nest egg',(0,1.12,-.22),(.11,.17,.11),'light')
 elif form in ('otter','newt','lizard','frog'):
  if form=='otter':ears(hc[1]+.18,hc[2]-.07,.29,.1,True)
  tip=tail([(0,.61,-.56),(0,.55,-.85),(.13,.59,-1.06),(.20,.70,-1.14)],.13 if form=='otter' else .09)
  if form=='newt':
   for s in [-1,1]:
    for j in range(3):blade('External crystal gill',(s*.28,hc[1]+.06,hc[2]),(s*(.55+j*.03),hc[1]+.27-j*.17,hc[2]-.07),.10,'accent','Head')
  if form=='lizard':
   for j in range(4+st):blade('Fern dorsal sail',(0,.88,-.46+j*.12),(0,1.08+st*.06,-.50+j*.12),.10,'accent')
  if form=='frog':
   for s in [-1,1]:ell('Powerful folded thigh',(s*.34,.34,-.35),(.22,.22,.26),'base','BackL' if s<0 else 'BackR');ell('Webbed foot',(s*.37,.065,.37),(.19,.06,.18),'light','FrontL' if s<0 else 'FrontR')
  if st>=2:
   for s in [-1,1]:blade('Side fin',(s*.26,.67,-.13),(s*(.54+st*.035),.78,-.49),.18,'light')
  if st==3:horns(1.20,.35,.17,2)
 elif form=='elephant':
  for s in [-1,1]:ell('Large rounded ear',(s*.39,1.0,.28),(.23,.31,.07),'light','Head')
  tube('Curled trunk',[(0,.9,.65),(0,.65,.78),(.03,.32,.83),(.18,.30,.77)],[.13,.10,.075,.04],'base','Head')
  for s in [-1,1]:tube('Smooth ivory tusk',[(s*.22,.79,.63),(s*.26,.65,.77),(s*.28,.69,.90)],[.06,.035,.005],'light','Head')
  for j in range(3):ell('Time crystal',(0,1.01,-.40+j*.22),(.12,.18,.12),'accent')
 else:
  ears(hc[1]+.18,hc[2]-.08,.31,.16,form=='badger')
  tail([(0,.64,-.67),(.12,.69,-.86),(.15,.81,-.86)],.055)
  if form=='boar':
   ell('Broad snout',(0,.88,.69),(.18,.105,.07),'light','Head')
   for s in [-1,1]:ell('Nostril',(s*.064,.90,.75),(.025,.02,.007),'dark','Head',10,6)
   for j in range(2+st):
    z=-.48+j*.20;tube('Mushroom stem',[(0,.88,z),(0,1.05+st*.055,z)],[.055,.04],'light');ell('Forest cap',(0,1.08+st*.055,z),(.16+st*.025,.06+st*.02,.17),'accent')
  elif form in ('hedgehog','badger','turtle'):
   ell('Domed armor',(0,.78,-.20),(.40,.32,.48),'accent')
   for j in range(3+st):
    for s in [-1,0,1]:
     z=-.53+j*.15;x=s*.20;y=1.0-abs(s)*.055
     if form=='hedgehog':spike('Clay defensive spine',(x,y,z),(x*1.35,y+.17+st*.025,z-.055),.09,'light')
     else:ell('Armor crystal',(x,y,z),(.09,.075+st*.018,.105),'light',n=12,m=8)
   if form=='badger':
    for s in [-1,1]:blade('Face mask',(s*.07,1.21,.57),(s*.24,.84,.65),.065,'dark','Head')
   if st==3:crest(1.17,.4,2)

def upright(d):
 form=d['form'];st=d['stage'];rabbit=form=='rabbit';biped=form in ('monkey','oracle','rabbit')
 by=.73;ell('Soft belly',(0,by,-.05),(.34,.42,.29),'base');ell('Belly patch',(0,.70,.22),(.24,.28,.055),'light')
 hc=(0,1.24,.035);bone('Head',hc);ell('Round expressive head',hc,(.35,.33,.30),'base','Head',20,14);face(hc,.35,.30)
 if rabbit:ears(1.43,.01,.20,.62 if st==1 else .73);crest(1.52,.18,1 if st==1 else 3)
 elif form=='monkey':ears(1.26,0,.39,.1,True);crest(1.52,.02,st);tail([(0,.76,-.28),(.24,.77,-.52),(.35,1.05,-.56),(.20,1.12,-.45)],.065)
 else:
  horns(1.45,0,.20,2);ell('Floating chest crystal',(0,.84,.282),(.09,.13,.04),'accent');
  for s in [-1,1]:blade('Oracle robe',(s*.23,.72,0),(s*.49,.10,-.04),.24,'light')
  tail([(0,.7,-.30),(.23,.59,-.56),(.47,.79,-.64),(.42,1.11,-.55)],.06,'accent')
 for s in [-1,1]:
  arm='FrontL' if s<0 else 'FrontR';leg='BackL' if s<0 else 'BackR';bone(arm,(s*.29,.97,0));bone(leg,(s*.18,.43,0))
  tube('Connected forelimb',[(s*.29,.97,0),(s*.40,.74,.06),(s*.45,.54,.10)],[.12,.105,.11 if st<3 else .18],'base',arm)
  ell('Soft hand',(s*.45,.49,.10),(.115 if st<3 else .19,.14,.12),'light',arm)
  tube('Strong hindlimb',[(s*.18,.46,-.015),(s*.21,.26,.01),(s*.21,.12,.07)],[.14,.105,.075],'base',leg)
  ell('Rounded foot',(s*.22,.10,.17),(.14,.10,.20),'light',leg)
  if form=='monkey' and st>1:ell('Shoulder guard',(s*.31,.99,-.01),(.17,.15,.18),'accent',arm)
 if form=='oracle':
  for s in [-1,1]:ell('Orbiting crystal',(s*.62,1.05,.10),(.065,.12,.065),'accent','FrontL' if s<0 else 'FrontR',10,8)

def avian(d):
 form=d['form'];st=d['stage'];flying=d['motionType']=='fly';owl=form=='owl'
 if flying:
  ell('Horizontal flight torso',(0,.85,-.12),(.29,.24,.50),'base');hc=(0,.95,.41);bone('Head',hc);ell('Flight head',hc,(.27,.27,.27),'base','Head');face(hc,.27,.27,beak=True);wings(.9,-.1,1.04+st*.13,5+st,'base')
  for s in [-1,1]:
   b='BackL' if s<0 else 'BackR';bone(b,(s*.15,.69,-.20));tube('Attached folded bird leg',[(s*.15,.70,-.20),(s*.17,.50,-.23),(s*.18,.48,-.43)],[.07,.045,.036],'accent',b)
   for i in range(3):tube('Folded flight toe',[(s*.18,.48,-.43),(s*.18+(i-1)*.048,.47,-.53)],[.025,.006],'light',b,6)
  bone('Tail',(0,.86,-.49));
  for j in range(3+st):x=(j-(2+st)/2)*.10;blade('Tail streamer',(x*.4,.87,-.47),(x,.85,-1.01-st*.05),.10,'light' if j%2 else 'accent','Tail')
 else:
  ell('Upright downy body',(0,.53,-.05),(.33,.38,.29),'base');hc=(0,1.02,.10);bone('Head',hc);ell('Downy head',hc,(.32,.32,.28),'base','Head');face(hc,.32,.28,beak=True)
  for s in [-1,1]:
   b='BackL' if s<0 else 'BackR';bone(b,(s*.15,.34,-.035));tube('Attached standing bird leg',[(s*.15,.34,-.035),(s*.16,.15,.025),(s*.16,.07,.08)],[.09,.05,.035],'accent',b)
   for i in range(3):tube('Standing bird toe',[(s*.16,.07,.08),(s*.16+(i-1)*.07,.05,.23)],[.027,.008],'accent',b,6)
   b='WingL' if s<0 else 'WingR';bone(b,(s*.27,.68,-.01));ell('Folded wing',(s*.33,.52,-.08),(.12,.27,.15),'light',b)
 if owl:
  for s in [-1,1]:blade('Owl face rim',(s*.08,hc[1]+.25,hc[2]+.21),(s*.26,hc[1]-.14,hc[2]+.22),.095,'light','Head')
  ears(hc[1]+.22,hc[2]-.09,.23,.20+st*.025)
 else:crest(hc[1]+.24,hc[2],st)
 if form=='phoenix':
  for j in range(3):flame(((j-1)*.16,.83,-.94),'Tail',.70)

def ethereal(d):
 form=d['form'];st=d['stage']
 if form in ('cloud','fluff'):
  ell('Cloud core',(0,.69,0),(.43,.43,.34),'base');bone('Head',(0,.87,.08));ell('Soft face',(0,.84,.14),(.32,.31,.25),'base','Head');face((0,.86,.14),.32,.25)
  for i in range(9):a=2*pi*i/9;ell('Soft perimeter tuft',(sin(a)*.37,.71+cos(a)*.34,-.05),(.16,.17,.16),'light')
  for s in [-1,1]:
   b='FrontL' if s<0 else 'FrontR';bone(b,(s*.35,.70,0));ell('Waving mitten',(s*.45,.57,.03),(.13,.18,.11),'base',b)
   if form=='fluff':b='BackL' if s<0 else 'BackR';bone(b,(s*.18,.31,0));ell('Little foot',(s*.19,.15,.08),(.13,.12,.15),'light',b)
  if form=='cloud':crest(1.13,.06,2);tail([(0,.48,-.2),(.25,.39,-.35),(.38,.52,-.35)],.09,'light')
  elif d['id']=='wigglytuff':ears(1.05,-.04,.25,.35,True);ell('Heart jewel',(0,.66,.355),(.075,.08,.025),'accent')
  else:ears(1.06,0,.23,.29);tube('Dream curl',[(0,1.11,.03),(-.08,1.28,.07),(.04,1.35,.08),(.12,1.25,.09),(.055,1.22,.11)],[.065]*5,'accent','Head')
 elif form in ('manta','whale'):
  ell('Streamlined body',(0,.68,0),(.42 if form=='manta' else .42,.22 if form=='manta' else .34,.65),'base');hc=(0,.72,.40);bone('Head',hc);face(hc,.38,.22)
  wings(.70,0,1.22,4,'base',insect=form=='manta')
  tip=tail([(0,.69,-.53),(0,.70,-.92),(.06,.84,-1.14)],.095)
  for s in [-1,1]:blade('Tail fluke',tip,(s*.37,.86,-1.25),.20,'light','Tail')
  if form=='whale':
   for j in range(3):ell('Star marking',((j-1)*.15,1.0,-.15+j*.07),(.04,.022,.06),'accent')
  else:crest(.95,.08,3,'accent','Body')
 elif form in ('serpent','seahorse'):
  pts=[(0,.20,-.35),(-.25,.32,-.25),(-.28,.57,-.02),(0,.82,.03),(.15,1.05,0),(0,1.30,.1)]
  tube('Continuous curved body',pts,[.025,.10,.14,.18,.20,.18],'base');hc=(0,1.42,.18);bone('Head',hc);ell('Spirit head',hc,(.26,.28,.24),'base','Head');face(hc,.26,.24);horns(1.62,.14,.14,2)
  for j in range(4):blade('Ribbon fin',(-.1,.55+j*.19,-.1),(-.45,.55+j*.19,-.2),.12,'light')
  if form=='serpent':
   for s in [-1,1]:tube('Long whisker',[(s*.16,1.35,.4),(s*.34,1.30,.55),(s*.46,1.52,.50)],[.027,.017,.003],'accent','Head')
  bone('Tail',(0,.2,-.35));ell('Tail jewel',(0,.20,-.35),(.08,.08,.08),'accent','Tail')

def insect(d):
 form=d['form'];st=d['stage']
 if form in ('cocoon','crystal'):
  ell('Protective cocoon',(0,.73,0),(.35,.61,.30),'base',n=20,m=14);bone('Head',(0,1.04,.12));face((0,.99,.10),.28,.20)
  for j in range(5):
   a=-.3+j*.16;blade('Overlapping cocoon petal',(-.25,.40+j*.14,.10),(.19,.57+j*.14,.28),.105,'light' if j%2 else 'accent')
  if form=='crystal':crest(1.26,0,2,'accent','Body')
  bone('Tail',(0,.25,0));ell('Grounding tuft',(0,.12,0),(.25,.09,.22),'light','Tail')
 elif form in ('moth','dragonfly'):
  ell('Insect thorax',(0,.72,.02),(.15,.19,.38),'base');hc=(0,.84,.35);bone('Head',hc);ell('Insect head',hc,(.25,.24,.21),'base','Head');face(hc,.24,.20);wings(.80,-.10,1.17,4,'light',True)
  tail([(0,.74,-.27),(0,.75,-.59),(0,.82,-.88)],.10,'accent')
  for s in [-1,1]:
   tube('Curling antenna',[(s*.1,1.03,.33),(s*.17,1.25,.27),(s*.25,1.25,.36)],[.028,.018,.009],'accent','Head')
   for j in range(3):
    b=('Front' if j<2 else 'Back')+('L' if s<0 else 'R')
    if b not in BONES:bone(b,(s*.12,.68,-.12))
    tube('Attached insect leg',[(s*.10,.70,.04-j*.16),(s*.25,.52,.04-j*.16),(s*.27,.48,.15-j*.16)],[.035,.028,.016],'dark',b,6)
 elif form in ('caterpillar','grub'):
  for j in range(5):
   ell('Velvet body segment',(0,.33+j*.025,-.50+j*.21),(.23+j*.015,.26+j*.005,.21),'base' if j%2 else 'light')
   if j<4:
    for s in [-1,1]:
     b=('Front' if j>1 else 'Back')+('L' if s<0 else 'R')
     if b not in BONES:bone(b,(s*.19,.22,-.3+j*.15))
     ell('Tiny connected proleg',(s*.20,.13,-.5+j*.21),(.09,.11,.09),'accent',b,12,8)
  hc=(0,.66,.41);bone('Head',hc);ell('Cheerful larva head',hc,(.32,.32,.27),'base','Head');face(hc,.31,.27)
  for s in [-1,1]:tube('Soft antenna',[(s*.12,.89,.35),(s*.18,1.10,.33)],[.045,.026],'accent','Head');ell('Antenna tip',(s*.18,1.11,.33),(.06,.065,.06),'light','Head',12,8)
  if form=='grub':spike('Sand horn',(0,.95,.35),(0,1.25,.42),.09,'light','Head')

def rig_and_export(d):
 global PARTS,BONES,MATS
 bpy.ops.wm.read_factory_settings(use_empty=True);PARTS=[];BONES={'Root':((0,0,0),None),'Body':((0,.6,0),'Root')};MATS={}
 colors={'base':d['color'],'light':0xF2DEC4,'accent':ELEMENT[d['element']][1],'dark':0x2D2634,'white':0xFFF7E5,'glow':0xFCDE9D}
 for name,c in colors.items():
  m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=lin(c);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=lin(c);bs.inputs['Roughness'].default_value=.64 if name!='dark' else .25;MATS[name]=m
 form=d['form']
 if form in ('cat','boar','deer','hedgehog','otter','newt','lizard','frog','badger','kirin','griffin','longdeer','turtle','elephant','shadowdeer','nestdeer'):quadruped(d)
 elif form in ('rabbit','monkey','oracle'):upright(d)
 elif form in ('bird','owl','phoenix'):avian(d)
 elif form in ('cloud','fluff','manta','whale','serpent','seahorse'):ethereal(d)
 else:insect(d)
 # Apply a uniform vertex transform so every asset has an exact standing height and floor zero.
 allv=[v.co for o in PARTS for v in o.data.vertices];lo=min(v.z for v in allv);hi=max(v.z for v in allv);scale=d['height']/(hi-lo)
 for o in PARTS:
  for v in o.data.vertices:v.co.x*=scale;v.co.y*=scale;v.co.z=(v.co.z-lo)*scale
 arm=bpy.data.armatures.new(d['id']+' skeleton');rig=bpy.data.objects.new(d['id'],arm);bpy.context.collection.objects.link(rig);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for key,(p,parent) in BONES.items():
  b=arm.edit_bones.new(key);v=Vector(xyz(p));v.x*=scale;v.y*=scale;v.z=(v.z-lo)*scale;b.head=v;b.tail=v+Vector((0,0,.15*scale));
  if parent:b.parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');bpy.ops.object.select_all(action='DESELECT')
 for o in PARTS:o.select_set(True)
 bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();skin=bpy.context.object;skin.name=d['name']+' unified skin';skin.data.validate();skin.data.update();skin.parent=rig;mod=skin.modifiers.new('Spirit skeleton','ARMATURE');mod.object=rig
 # Recalculate coherent outward normals for ellipsoids, curves and closed decorative solids.
 bpy.context.view_layer.objects.active=skin;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 bpy.context.scene.render.fps=24
 clips=[('Idle',48),('Walk',24),('Attack',24),('Hurt',18)]
 if 'WingL' in BONES:clips.append(('Fly',24))
 for label,duration in clips:
  if rig.animation_data:rig.animation_data.action=None
  for frame in range(1,duration+2,3):
   phase=(frame-1)/duration*2*pi;pulse=max(0,sin(phase/2));pb=rig.pose.bones
   for b in pb:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
   pb['Body'].scale=(1+sin(phase)*.008,1+sin(phase)*.008,1+sin(phase)*.008)
   if 'Head' in pb:pb['Head'].rotation_euler.z=.06*sin(phase)
   if 'Tail' in pb:pb['Tail'].rotation_euler.z=.19*sin(phase+.5)
   if label=='Fly' or (label=='Idle' and d['motionType'] in ('fly','float')):pb['Root'].location.z=.045*scale*sin(phase)
   if label=='Walk':
    for key,offset in [('FrontL',0),('FrontR',pi),('BackL',pi),('BackR',0)]:
     if key in pb:pb[key].rotation_euler.x=.36*sin(phase+offset)
    pb['Body'].rotation_euler.y=.035*sin(phase)
   for key,s in [('WingL',-1),('WingR',1)]:
    if key in pb:
     # Bone local X points laterally; local Z rotation moves the wing vertically.
     # Body/wing bones point Blender Z, local Y is vertical, local Z is -Y.
     amplitude=.78 if label=='Fly' else .26 if label=='Walk' else .18
     pb[key].rotation_euler.z=s*amplitude*sin(phase)
     pb[key].rotation_euler.x=.12*sin(phase+.55) if label=='Fly' else 0
   if label=='Fly':
    pb['Body'].rotation_euler.x=-.06+.04*cos(phase)
    for key in ('BackL','BackR'):
     if key in pb:pb[key].rotation_euler.x=-.20

   if label=='Attack':
    pb['Body'].rotation_euler.x=-.22*pulse;pb['Root'].location.y=-.18*scale*pulse
    for key in ['FrontL','FrontR']:
     if key in pb:pb[key].rotation_euler.x=-.75*pulse
    if 'Head' in pb:pb['Head'].rotation_euler.x=.17*pulse
   if label=='Hurt':pb['Body'].rotation_euler.y=.15*sin(phase*3)*pulse;pb['Body'].rotation_euler.x=.15*pulse
   for b in pb:
    b.keyframe_insert('rotation_euler',frame=frame,group=b.name);b.keyframe_insert('location',frame=frame,group=b.name);b.keyframe_insert('scale',frame=frame,group=b.name)
  action=rig.animation_data.action;action.name=d['id']+'_'+label;action.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=label;strip=track.strips.new(label,1,action);strip.name=label;rig.animation_data.action=None;track.mute=True
 for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
 bpy.context.scene.frame_set(1);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);skin.select_set(True);bpy.context.view_layer.objects.active=rig
 props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys();opts=dict(filepath=str(OUT/(d['id']+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_frame_range=False,export_force_sampling=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
 bpy.ops.export_scene.gltf(**{k:v for k,v in opts.items() if k in props})
 skin.data.calc_loop_triangles();report=dict(id=d['id'],name=d['name'],vertices=len(skin.data.vertices),triangles=len(skin.data.loop_triangles),materials=len(skin.data.materials),bones=len(rig.data.bones),height=d['height'],animations=[t.name for t in rig.animation_data.nla_tracks],fileBytes=(OUT/(d['id']+'.glb')).stat().st_size,source='Blender native authored mesh and skeletal animation')
 # Keep editable exemplars, while all 61 are reproducible from this deterministic source.
 if d['id'] in ('charmander','mewtwo'):bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'authoring'/(d['id']+'-spirit.blend')))
 print('SPIRIT_DONE',json.dumps(report,ensure_ascii=False),flush=True);return report

if __name__=='__main__':
 args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 # These stable save IDs use the dedicated spiral-snail.py, pepper-chick.py, sesame-spirit.py and chest-spirit.py authoring pipelines.
 selected=[d for d in DATA if d['id'] not in ('bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise','caterpie','metapod','butterfree') and (not args or d['id'] in args)];reports=[]
 for d in selected:reports.append(rig_and_export(d))
 manifest=ROOT/'data'/'spirit-model-manifest.json'
 old=json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else []
 byid={r['id']:r for r in old};byid.update({r['id']:r for r in reports})
 manifest.write_text(json.dumps(list(byid.values()),ensure_ascii=False,indent=2),encoding='utf-8')
 print('SPIRIT_BUILD_COMPLETE',len(reports),flush=True)

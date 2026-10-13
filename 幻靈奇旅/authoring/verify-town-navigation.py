"""Validate exported town occluders and walkable 1m navigation from spawn."""
import json,struct,math
from pathlib import Path
from collections import deque
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'data/world.json').read_text(encoding='utf-8'));cs=d['collisions']
def blocked(x,z):return any(abs(x-c['x'])<c['w']/2+.38 and abs(z-c['z'])<c['d']/2+.38 for c in cs)
seen={(round(d['spawn'][0]),round(d['spawn'][2]))};q=deque(seen)
while q:
 x,z=q.popleft()
 for a,b in [(x+1,z),(x-1,z),(x,z+1),(x,z-1)]:
  if -35<=a<=35 and -35<=b<=35 and (a,b) not in seen and not blocked(a,b):seen.add((a,b));q.append((a,b))
r={'reachableCells':len(seen),'treeCollisions':sum(c.get('kind')=='tree' for c in cs),'lakeCollisions':sum(c.get('kind')=='water' for c in cs),'entrances':{b['id']:any((round(b['entrance'][0])+dx,round(b['entrance'][1])+dz) in seen for dx in [-1,0,1] for dz in [-1,0,1]) for b in d['buildings']}}
assert all(r['entrances'].values()),r
r['benchCollisions']=sum(c.get('kind')=='bench' for c in cs)
r['planterCollisions']=sum(c.get('kind')=='planter' for c in cs)
assert r['benchCollisions']==8 and r['planterCollisions']==12
samples=0
for i in range(101):
 z=-4.6+i*9.2/100;half=5.4*math.sqrt(max(0,1-(z/4.6)**2))
 for x in (-half,0,half):
  assert any(abs(20+x-c['x'])<=c['w']/2+1e-9 and abs(-23+z-c['z'])<=c['d']/2+1e-9 for c in cs if c.get('kind')=='water')
  samples+=1
r['lakeCoverageSamples']=samples
raw=(root/'models/world/town.glb').read_bytes();ln=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+ln]);oc=[n for n in g['nodes'] if n.get('extras',{}).get('occludable')];r['occluderCount']=len(oc);assert len(oc)==56;r['sampleExtras']=oc[0]['extras'];(root/'qa').mkdir(exist_ok=True);(root/'qa/town-navigation.json').write_text(json.dumps(r,indent=2),encoding='utf-8');print(r)

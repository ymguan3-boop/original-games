"""Mix licensed Kenney CC0 sources into compact, reproducible weapon cues. No paid API."""
from pathlib import Path
import array, hashlib, io, json, math, re, subprocess, urllib.request, zipfile
ROOT=Path(__file__).resolve().parents[1]; CACHE=ROOT/'survivors/qa/audio-source-v19'; OUT=ROOT/'assets/audio/weapons-v19'; RATE=22050
CACHE.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
packs={}; provenance=[]
for name in ['impact-sounds','rpg-audio','sci-fi-sounds']:
    page='https://kenney.nl/assets/'+name
    html=urllib.request.urlopen(page).read().decode()
    url=re.findall(r"href=['\"]([^'\"]+\.zip)['\"]",html)[0]
    archive=CACHE/(name+'.zip')
    if not archive.exists():archive.write_bytes(urllib.request.urlopen(url).read())
    raw=archive.read_bytes(); z=zipfile.ZipFile(io.BytesIO(raw)); packs[name]=z
    (OUT/(name+'-License.txt')).write_text('\n'.join(line.rstrip() for line in z.read('License.txt').decode('utf-8-sig').splitlines())+'\n',encoding='utf-8')
    provenance.append({'pack':name,'page':page,'archive':url,'sha256':hashlib.sha256(raw).hexdigest()})
used={}; decoded={}
def src(pack,file,rate=1):
    key=(pack,file,rate)
    if key in decoded:return decoded[key]
    raw=packs[pack].read('Audio/'+file+'.ogg'); used[pack+'/'+file+'.ogg']=hashlib.sha256(raw).hexdigest()
    filters=f'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.003,aresample={RATE},asetrate={int(RATE*rate)},aresample={RATE}'
    data=subprocess.check_output(['ffmpeg','-v','error','-i','pipe:0','-af',filters,'-ac','1','-f','f32le','pipe:1'],input=raw)
    result=array.array('f');result.frombytes(data);decoded[key]=result;return result
R='rpg-audio';I='impact-sounds';S='sci-fi-sounds'
def mix(name,duration,layers):
    n=int(duration*RATE); a=[0.0]*n
    for pack,file,rate,gain,delay in layers:
        b=src(pack,file,rate); start=int(delay*RATE)
        for j in range(min(len(b),n-start)):a[start+j]+=b[j]*gain
    # Tight fade avoids clicks; consistent peaks and usable RMS make weapon cues audible.
    for j in range(n):a[j]*=min(1,j/(RATE*.004),(n-j-1)/(RATE*.035))
    peak=max(abs(x)for x in a)or 1; a=[x*.9/peak for x in a]
    pcm=array.array('f',a).tobytes(); path=OUT/(name+'.ogg')
    subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(RATE),'-ac','1','-i','pipe:0','-c:a','libvorbis','-q:a','4',str(path)],input=pcm,check=True)
    return {'file':path.name,'seconds':duration,'bytes':path.stat().st_size,'peak':.9,'rms':math.sqrt(sum(x*x for x in a)/n),'layers':[dict(pack=p,file=f,rate=r,gain=g,delay=d)for p,f,r,g,d in layers]}
recipes=[
 ('sword-normal',.46,[(R,'knifeSlice',.70,1,0),(I,'impactMetal_medium_000',.86,.22,.09)]),
 ('sword-combo',.38,[(R,'knifeSlice2',.72,1,0),(I,'impactMetal_heavy_000',.90,.32,.045)]),
 ('sword-final',1.45,[(S,'explosionCrunch_000',.86,1,0),(S,'lowFrequency_explosion_000',.95,.65,.015),(I,'impactMetal_heavy_001',.7,.20,0)]),
 ('knife-normal',.24,[(R,'knifeSlice2',1.35,1,0),(I,'impactMetal_light_000',1.2,.24,.035)]),
 ('knife-combo',.20,[(R,'knifeSlice',1.55,1,0),(R,'drawKnife2',1.2,.15,.015)]),
 ('knife-final',.53,[(R,'knifeSlice2',.95,.8,0),(I,'impactMetal_heavy_002',1.25,.7,.025)]),
 ('blades-normal',.29,[(R,'knifeSlice',1.35,1,0),(R,'knifeSlice2',1.5,.8,.045)]),
 ('blades-combo',.17,[(R,'knifeSlice2',1.7,1,0),(I,'impactMetal_light_001',1.3,.16,.025)]),
 ('blades-final',.56,[(R,'knifeSlice',1.15,1,0),(R,'knifeSlice2',1.3,.8,.065),(I,'impactBell_heavy_001',1.7,.14,.08)]),
 ('guns-normal',.24,[(S,'laserSmall_001',1.15,1,0),(R,'metalClick',1.0,.18,0)]),
 ('guns-combo',.19,[(S,'laserSmall_000',1.35,1,0),(S,'laserRetro_000',1.65,.18,.01)]),
 ('guns-final',.68,[(S,'laserLarge_001',1.2,.9,0),(S,'explosionCrunch_001',1.6,.5,.025)]),
]
manifest={'version':19,'sampleRate':RATE,'license':'CC0-1.0','provenance':provenance,'outputs':[mix(*r)for r in recipes],'sourceFiles':used}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
(OUT/'README.md').write_text('# Weapon sound mixes v19\n\nDerived from Kenney CC0-1.0: [RPG Audio](https://kenney.nl/assets/rpg-audio), [Impact Sounds](https://kenney.nl/assets/impact-sounds), [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds). Original pack notices are included.\n\nRebuild with `python authoring/build-weapon-audio-v19.py` and FFmpeg. Sources, hashes, rates, layer gains, durations and output measurements are in manifest.json. Only these twelve OGG mixes ship; archives stay in ignored survivors/qa.\n',encoding='utf-8')
print(json.dumps({'files':len(recipes),'totalBytes':sum(x['bytes']for x in manifest['outputs']),'rms':[(x['file'],round(x['rms'],4))for x in manifest['outputs']]}))

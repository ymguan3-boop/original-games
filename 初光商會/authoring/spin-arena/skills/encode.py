from PIL import Image, ImageChops
from pathlib import Path
import json, math, shutil
root=Path(__file__).resolve().parents[3]
out=root/'assets/spin-arena/skills'; out.mkdir(parents=True,exist_ok=True)
author=root/'authoring/spin-arena/skills'; author.mkdir(parents=True,exist_ok=True)
sources=json.loads(Path(__file__).with_name('PROVENANCE.json').read_text(encoding='utf-8'))
manifest=[]
for item in sources:
    id=item['id']; source=Image.open(author/f'{id}-source.png').convert('RGBA')

    frames=[]; size=160
    # Sprite extraction/padding only; keep the generated artwork and alpha.
    mask=Image.new('L',(size,size))
    mask.putdata([round(255*max(0,min(1,(1-math.hypot((x-79.5)/79.5,(y-79.5)/79.5))/.18))) for y in range(size) for x in range(size)])
    for i in range(16):
        x=i%4;y=i//4;w,h=source.size
        tile=source.crop((round(x*w/4),round(y*h/4),round((x+1)*w/4),round((y+1)*h/4))).resize((size,size),Image.Resampling.LANCZOS)
        alpha=ImageChops.multiply(tile.getchannel('A'),mask)
        # Start/end dissolve prevents an abrupt jump at cue boundaries.
        fade=[.2,.55,.85]+[1]*10+[.8,.4,.1]
        alpha=alpha.point(lambda a:round(a*fade[i]));tile.putalpha(alpha)
        frame=Image.new('RGBA',(192,192));frame.alpha_composite(tile,(16,16));frames.append(frame)
    sheet=Image.new('RGBA',(768,768))
    for i,frame in enumerate(frames):sheet.alpha_composite(frame,((i%4)*192,(i//4)*192))
    sheet.save(out/f'{id}-sheet.webp',quality=90,method=6)
    indexed=[]
    for rgba in frames:
        p=rgba.convert('RGB').quantize(colors=255)
        alpha=list(rgba.getchannel('A').tobytes())
        bayer=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
        transparent=Image.new('L',rgba.size)
        transparent.putdata([255 if a<((bayer[(n//192)%4][n%4]+.5)*16) else 0 for n,a in enumerate(alpha)])
        p.paste(255,mask=transparent);p.info['transparency']=255;indexed.append(p)
    durations=[70,80]*8
    indexed[0].save(out/f'{id}.gif',save_all=True,append_images=indexed[1:],duration=durations,loop=0,transparency=255,disposal=2,optimize=False)
    gif=Image.open(out/f'{id}.gif'); assert gif.n_frames==16
    unique=set();duration=0
    for i in range(gif.n_frames):gif.seek(i);unique.add(gif.convert('RGBA').tobytes());duration+=gif.info['duration']
    assert len(unique)==16 and duration==1200
    manifest.append({'id':id,'frames':16,'durationMs':1200,'size':192,'sheetBytes':(out/f'{id}-sheet.webp').stat().st_size,'gifBytes':(out/f'{id}.gif').stat().st_size})
    print(id,manifest[-1])
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(author/'PROVENANCE.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')



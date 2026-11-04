"""Deterministic runtime image derivatives; never overwrite authoring sources."""
import json, sys, struct, io, hashlib
from PIL import Image
results=[]
for job in json.load(sys.stdin):
    if job['source'].endswith('.glb'):
        raw=open(job['source'],'rb').read()
        magic,version,total=struct.unpack_from('<III',raw)
        assert magic==0x46546c67 and version==2 and total==len(raw)
        length,kind=struct.unpack_from('<II',raw,12)
        assert kind==0x4e4f534a
        doc=json.loads(raw[20:20+length]); offset=20+length
        bin_length,bin_kind=struct.unpack_from('<II',raw,offset)
        assert bin_kind==0x004e4942 and len(doc['buffers'])==1
        binary=raw[offset+8:offset+8+bin_length]
        images={item['bufferView']:item for item in doc.get('images',[]) if 'bufferView' in item}
        rebuilt=bytearray(); unchanged=hashlib.sha256(); verification=hashlib.sha256(); changed=[]
        for index,view in enumerate(doc.get('bufferViews',[])):
            start=view.get('byteOffset',0); data=binary[start:start+view['byteLength']]
            assert len(data)==view['byteLength'] and view.get('buffer',0)==0
            if index in images and images[index].get('mimeType')=='image/png':
                with Image.open(io.BytesIO(data)) as image:
                    before=list(image.size)
                    image.thumbnail((1024,1024),Image.Resampling.LANCZOS)
                    output=io.BytesIO();image.save(output,'PNG',optimize=True)
                    candidate=output.getvalue()
                    if len(candidate)<len(data):
                        changed.append({'bufferView':index,'originalSize':before,'size':list(image.size),'savedBytes':len(data)-len(candidate)});data=candidate
            else:
                unchanged.update(struct.pack('<I',index));unchanged.update(data)
            rebuilt.extend(b'\0'*((-len(rebuilt))%4));view['byteOffset']=len(rebuilt);view['byteLength']=len(data);rebuilt.extend(data)
        doc['buffers'][0]['byteLength']=len(rebuilt)
        # Validate every non-image byte sequence after rebuilding, including geometry/animation.
        for index,view in enumerate(doc.get('bufferViews',[])):
            if index in images and images[index].get('mimeType')=='image/png':continue
            data=rebuilt[view['byteOffset']:view['byteOffset']+view['byteLength']]
            verification.update(struct.pack('<I',index));verification.update(data)
        assert unchanged.digest()==verification.digest()
        encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*((-len(encoded))%4)
        rebuilt.extend(b'\0'*((-len(rebuilt))%4))
        result=struct.pack('<III',magic,version,28+len(encoded)+len(rebuilt))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(rebuilt),0x004e4942)+rebuilt
        if len(result)>=len(raw)*.95:result=raw;changed=[]
        open(job['output'],'wb').write(result)
        results.append(dict(job,glb=True,changedImages=changed,nonImageBufferSha256=unchanged.hexdigest(),savedBytes=len(raw)-len(result)))
        continue
    with Image.open(job['source']) as image:
        original=list(image.size)
        image=image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in image.info else 'RGB')
        image.thumbnail((job['limit'],job['limit']),Image.Resampling.LANCZOS)
        image.save(job['output'],'WEBP',quality=88,method=6,exact=True)
        results.append(dict(job,originalSize=original,size=list(image.size)))
print(json.dumps(results))

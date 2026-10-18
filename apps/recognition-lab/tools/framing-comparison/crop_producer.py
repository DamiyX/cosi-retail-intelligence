"""Separately bound product-box producer. Fixed worker; no baseline mutation."""
from __future__ import annotations
import argparse,base64,hashlib,importlib.util,io,json,math,multiprocessing,os,platform,sys,time,warnings
from pathlib import Path
BASE_DIR=Path(__file__).resolve().parents[1]/'exploratory'
spec=importlib.util.spec_from_file_location('framing_baseline_producer',BASE_DIR/'producer.py')
baseline=importlib.util.module_from_spec(spec);spec.loader.exec_module(baseline)
Blocked=baseline.Blocked;packed=baseline.packed;digest=baseline.digest
buffered=baseline.buffered;checked_path=baseline.checked_path;exact=baseline.exact
cpu_interpreter=baseline.cpu_interpreter;valid_vector=baseline.valid_vector
RECIPE=dict(version='rgb-product-box5-letterbox-224-v1',baselineNumericPipeline=baseline.RECIPE,
    inputContainer='jpeg-primary+sef107-scalar-metadata-v1',
    order=['bounded-container','decode','EXIF-orient','RGB','full-resolution-box5-crop','letterbox','float32-div255'],
    boxConvention='integer-left-top-inclusive-right-bottom-exclusive',padding='ceil-box-dimension-div20-each-side-clamped')
RECIPE_SHA=digest(packed(RECIPE));RUNS=baseline.LAB/'runs/framing-comparison'

def integer(v,low=0,high=50000000):return type(v) is int and low<=v<=high
def effective_box(box,width,height):
    exact(box,['left','top','right','bottom'])
    if not integer(width,1) or not integer(height,1) or width*height>50000000 or not all(integer(v) for v in box.values()) or not (box['left']<box['right']<=width and box['top']<box['bottom']<=height):raise Blocked('INVALID_ORIENTED_BOX')
    x=(box['right']-box['left']+19)//20;y=(box['bottom']-box['top']+19)//20
    return dict(left=max(0,box['left']-x),top=max(0,box['top']-y),right=min(width,box['right']+x),bottom=min(height,box['bottom']+y))

def read_json(path,root=baseline.LAB):
    data=buffered(path,root,limit=4*1024*1024)
    def pairs(items):
        out={}
        for k,v in items:
            if k in out:raise Blocked('DUPLICATE_JSON_KEY')
            out[k]=v
        return out
    value=json.loads(data,object_pairs_hook=pairs,parse_constant=lambda _: (_ for _ in ()).throw(Blocked('NONFINITE_JSON')))
    return value,digest(data),data

def validate_comparison(c):
    exact(c,['schemaVersion','comparisonId','formalAdmission','primary','study','baseline','cropRecipeSha256','frames'])
    if type(c['schemaVersion']) is not int or c['schemaVersion']!=1 or c['formalAdmission'] is not False or c['primary']!='FF->CC' or not isinstance(c['comparisonId'],str) or not baseline.ID.fullmatch(c['comparisonId']) or c['cropRecipeSha256']!=RECIPE_SHA:raise Blocked('COMPARISON_BOUNDARY')
    baseline.validate_study(c['study'])
    if type(c['study']['schemaVersion']) is not int:raise Blocked('STUDY_NATIVE_TYPE')
    b=c['baseline'];exact(b,['studySha256','bundleSha256','setupSha256','softwareSha256','sourceSha256','runId'])
    if not all(type(b[k]) is str and baseline.HASH.fullmatch(b[k]) for k in b if k!='runId') or not isinstance(b['runId'],str) or not __import__('re').fullmatch(r'[a-zA-Z0-9_-]{1,64}',b['runId']):raise Blocked('BASELINE_BINDING')
    if not isinstance(c['frames'],list) or len(c['frames'])!=40:raise Blocked('FRAME_COUNT')
    seen=set()
    for f in c['frames']:
        exact(f,['id','assetSha256','width','height','orientation'])
        e=next((e for e in c['study']['entries'] if e['id']==f['id']),None)
        if not e or f['id'] in seen or f['assetSha256']!=e['asset']['sha256'] or not integer(f['width'],1) or not integer(f['height'],1) or f['width']*f['height']>50000000 or not integer(f['orientation'],1,8):raise Blocked('FRAME_BINDING')
        seen.add(f['id'])

def validate_annotations(c,a,comparison_hash,complete=True):
    exact(a,['schemaVersion','comparisonSha256','recipeSha256','entries'])
    if type(a['schemaVersion']) is not int or a['schemaVersion']!=1 or a['comparisonSha256']!=comparison_hash or a['recipeSha256']!=RECIPE_SHA or not isinstance(a['entries'],list) or len(a['entries'])!=40:raise Blocked('ANNOTATION_BINDING')
    seen=set()
    for e in a['entries']:
        exact(e,['id','assetSha256','width','height','orientation','confirmedIdentity','issue','markedBox','effectiveBox'])
        f=next((f for f in c['frames'] if f['id']==e['id']),None)
        if not f or e['id'] in seen or any(type(e[k]) is not type(f[k]) or e[k]!=f[k] for k in f) or type(e['confirmedIdentity']) is not bool or e['issue'] not in ['none','not-reviewed','identity','bounds']:raise Blocked('ANNOTATION_FRAME')
        expected=None if e['markedBox'] is None else effective_box(e['markedBox'],e['width'],e['height'])
        if e['effectiveBox'] is not None:
            exact(e['effectiveBox'],['left','top','right','bottom'])
            if not all(integer(v) for v in e['effectiveBox'].values()):raise Blocked('PADDING_TYPE')
        if e['effectiveBox']!=expected or complete and (not e['confirmedIdentity'] or e['issue']!='none' or e['markedBox'] is None):raise Blocked('INCOMPLETE_OR_PADDING')
        seen.add(e['id'])

def letterbox(pixels):
    from PIL import Image
    w,h=pixels.size;scale=min(224/w,224/h)
    fit=(max(1,min(224,math.floor(w*scale+.5))),max(1,min(224,math.floor(h*scale+.5))))
    canvas=Image.new('RGB',(224,224),(128,128,128));canvas.paste(pixels.resize(fit,Image.Resampling.LANCZOS),((224-fit[0])//2,(224-fit[1])//2))
    return canvas

def thumbnail(canvas):
    from PIL import Image
    out=io.BytesIO();Image.frombytes('RGB',(224,224),canvas.tobytes()).resize((112,112),Image.Resampling.LANCZOS).save(out,format='PNG')
    return out.getvalue()

def preprocess(data,annotation):
    from PIL import Image,ImageFile,ImageCms
    import numpy as np
    data=baseline.jpeg_container(data);Image.MAX_IMAGE_PIXELS=50000000;ImageFile.LOAD_TRUNCATED_IMAGES=False;t=time.perf_counter()
    with warnings.catch_warnings():
        warnings.simplefilter('error',Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(data),formats=['JPEG']) as image:
            if image.width*image.height>50000000 or image.mode not in ['RGB','L']:raise ValueError('PIXELS_OR_COLOUR')
            profile=image.info.get('icc_profile')
            if profile:
                if len(profile)>1024*1024:raise ValueError('PROFILE_SIZE')
                cms=ImageCms.ImageCmsProfile(io.BytesIO(profile))
                if cms.profile.xcolor_space.strip()!='RGB' or ImageCms.getProfileName(cms).strip().lower()!='srgb built-in':raise ValueError('UNSUPPORTED_PROFILE')
            orientation=image.getexif().get(274,1)
            if not integer(orientation,1,8):raise ValueError('ORIENTATION')
            image.load()
            transforms={2:Image.Transpose.FLIP_LEFT_RIGHT,3:Image.Transpose.ROTATE_180,4:Image.Transpose.FLIP_TOP_BOTTOM,5:Image.Transpose.TRANSPOSE,6:Image.Transpose.ROTATE_270,7:Image.Transpose.TRANSVERSE,8:Image.Transpose.ROTATE_90}
            # Orient before converting RGB and selecting full-resolution pixels.
            oriented=image.transpose(transforms[orientation]) if orientation in transforms else image
            pixels=oriented.convert('RGB')
    decoded=time.perf_counter();w,h=pixels.size
    if not integer(annotation['width'],1) or not integer(annotation['height'],1) or not integer(annotation['orientation'],1,8) or (w,h,orientation)!=(annotation['width'],annotation['height'],annotation['orientation']):raise ValueError('ORIENTED_DIMENSIONS_MISMATCH')
    b=effective_box(annotation['markedBox'],w,h)
    if annotation['effectiveBox']!=b:raise ValueError('PADDING_MISMATCH')
    selected=pixels.crop((b['left'],b['top'],b['right'],b['bottom']));canvas=letterbox(selected)
    tensor=np.ascontiguousarray((np.asarray(canvas,dtype=np.float32)/np.float32(255)).reshape(1,224,224,3),dtype='<f4')
    thumb=thumbnail(canvas);context=thumbnail(letterbox(pixels))
    return tensor,thumb,context,dict(pixelSha256=digest(canvas.tobytes()),tensorSha256=digest(tensor.tobytes()),decodeMs=(decoded-t)*1000,preprocessMs=(time.perf_counter()-decoded)*1000)

def worker(conn,model):
    try:
        t=time.perf_counter();interpreter,input_index,output_index=cpu_interpreter(model)
        conn.send_bytes(packed(dict(ready=True,loadMs=(time.perf_counter()-t)*1000)))
        while True:
            job=json.loads(conn.recv_bytes(16384))
            if job is None:break
            base=dict(id=job['id'],assetSha256=job['sha256'])
            try:
                start=time.perf_counter();data=buffered(job['path'],job['root'],job['sha256']);read_ms=(time.perf_counter()-start)*1000
                tensor,thumb,context,details=preprocess(data,job['annotation'])
            except Blocked:
                conn.send_bytes(packed(dict(**base,kind='failure',code='INPUT_CHANGED')));break
            except Exception:
                conn.send_bytes(packed(dict(**base,kind='failure',code='DECODE_ERROR')));continue
            t=time.perf_counter();interpreter.set_tensor(input_index,tensor);interpreter.invoke();values=valid_vector(interpreter.get_tensor(output_index));inference_ms=(time.perf_counter()-t)*1000
            record=dict(**base,kind='vector',values=values,pixelSha256=details['pixelSha256'],tensorSha256=details['tensorSha256'],thumbnailSha256=digest(thumb),contextThumbnailSha256=digest(context),timings=dict(readMs=read_ms,decodeMs=details['decodeMs'],preprocessMs=details['preprocessMs'],inferenceMs=inference_ms))
            conn.send_bytes(packed(dict(record=record,thumbnail=base64.b64encode(thumb).decode(),context=base64.b64encode(context).decode())))
    except Exception:
        try:conn.send_bytes(packed(dict(fatal='RUNTIME_ERROR')))
        except (OSError,BrokenPipeError):pass
    finally:conn.close()

def collect(conn,process,entries,annotations,root,out,per_image=60,total=900,cancelled=lambda:False):
    started=time.perf_counter();records=[];stopped=False
    for e in entries:
        base=dict(id=e['id'],assetSha256=e['asset']['sha256']);remaining=total-(time.perf_counter()-started)
        if stopped or remaining<=0 or cancelled():records.append(dict(**base,kind='failure',code='NOT_RUN'));stopped=True;continue
        try:
            annotation=next(a for a in annotations['entries'] if a['id']==e['id'])
            conn.send_bytes(packed(dict(id=e['id'],sha256=e['asset']['sha256'],path=str(root/e['asset']['path']),root=str(root),annotation=annotation)))
            # Cancellation checks share the existing deadline, never extend it.
            deadline=time.perf_counter()+min(per_image,remaining)
            while not conn.poll(min(.25,max(0,deadline-time.perf_counter()))):
                if cancelled() or time.perf_counter()>=deadline:
                    process.terminate();break
            if cancelled():records.append(dict(**base,kind='failure',code='NOT_RUN'));stopped=True;continue
            if time.perf_counter()>=deadline:records.append(dict(**base,kind='failure',code='TIMEOUT'));stopped=True;continue
            msg=json.loads(conn.recv_bytes(1024*1024))
            if 'fatal' in msg:records.append(dict(**base,kind='failure',code='RUNTIME_ERROR'));stopped=True;continue
            if msg.get('kind')=='failure':
                exact(msg,['id','assetSha256','kind','code'])
                if msg['id']!=base['id'] or msg['assetSha256']!=base['assetSha256'] or msg['code'] not in ['INPUT_CHANGED','DECODE_ERROR']:raise Blocked('WORKER_BINDING')
                records.append(msg);stopped=msg['code']=='INPUT_CHANGED';continue
            exact(msg,['record','thumbnail','context']);record=msg['record']
            if record['id']!=e['id'] or record['assetSha256']!=e['asset']['sha256']:raise Blocked('WORKER_BINDING')
            for key,name,hashkey in [('thumbnail','thumb-','thumbnailSha256'),('context','context-','contextThumbnailSha256')]:
                content=base64.b64decode(msg[key],validate=True)
                if len(content)>200000 or digest(content)!=record[hashkey]:raise Blocked('WORKER_DERIVATIVE')
                checked_path(out/(name+e['id']+'.png'),out,missing=True)
                with (out/(name+e['id']+'.png')).open('xb') as f:f.write(content)
            records.append(record)
        except (EOFError,OSError,Blocked,ValueError,KeyError,TypeError):records.append(dict(**base,kind='failure',code='RUNTIME_ERROR'));stopped=True
    return records,(time.perf_counter()-started)*1000

def encode_entries(entries,annotations,root,out,model,load_timeout=60,cancelled=lambda:False):
    context=multiprocessing.get_context('spawn');parent,child=context.Pipe();process=context.Process(target=worker,args=(child,model))
    started=time.perf_counter();started_process=False;encoding_ms=0;run_failure=None
    try:
        try:process.start();started_process=True;child.close();run_failure=baseline.wait_for_load(parent,load_timeout)
        except OSError:run_failure=dict(stage='load',reason='OS_ERROR')
        load_ms=(time.perf_counter()-started)*1000
        if run_failure or cancelled():records=[dict(id=e['id'],assetSha256=e['asset']['sha256'],kind='failure',code='NOT_RUN') for e in entries]
        else:records,encoding_ms=collect(parent,process,entries,annotations,root,out,total=max(0,900-(time.perf_counter()-started)),cancelled=cancelled)
    finally:
        child.close()
        if started_process:
            if process.is_alive():process.terminate()
            process.join(5)
            if process.is_alive():process.kill();process.join(5)
            if process.is_alive():raise Blocked('WORKER_DRAIN_UNCONFIRMED')
        parent.close()
    return records,load_ms,encoding_ms,(time.perf_counter()-started)*1000,run_failure

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preflight',action='store_true')
    for name in ['comparison','annotations','baseline','root','model','setup','software','source-manifest','out','run-id','approval']:parser.add_argument('--'+name,required=True)
    try:
        # The runtime imports this module. Direct script execution must share
        # the same Blocked class/helpers rather than load a second instance.
        if __name__=='__main__':sys.modules['crop_producer']=sys.modules[__name__]
        from crop_runtime import prepare,produce
        args=parser.parse_args();prepared=prepare(args)
        if args.preflight:print('CONNECTED_PREFLIGHT_PASSED',flush=True);return 0
        return produce(args,prepared)
    except Exception as error:
        print(str(error) if isinstance(error,Blocked) else 'SETUP_BLOCKED',file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())

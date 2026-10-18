"""Generated framing regression; never loads the real model or private photos."""
import io,json,math,multiprocessing,os,struct,subprocess,sys,time,unittest,uuid
from pathlib import Path
from unittest.mock import patch
import numpy as np
from PIL import Image
import crop_producer as crop
import crop_runtime as runtime

EVIDENCE=Path(os.environ.get('FC_EVIDENCE_ROOT',str(crop.RUNS/'generated-checks')))
EVIDENCE.mkdir(parents=True,exist_ok=True);RUN=EVIDENCE/('python-tests-'+uuid.uuid4().hex);RUN.mkdir()
def jpeg(orientation=1,progressive=False,size=(97,63),i=0,restart=False):
    y,x=np.indices((size[1],size[0]));a=np.stack(((x*7+y*3+i)%256,(x+y*11+i)%256,(x*13+y+i)%256),axis=-1).astype(np.uint8)
    exif=Image.Exif();exif[274]=orientation;out=io.BytesIO()
    Image.fromarray(a).save(out,format='JPEG',quality=94,subsampling=0,exif=exif,progressive=progressive,**({'restart_marker_blocks':2} if restart else {}));return out.getvalue()
def annotation(data,box=None):
    with Image.open(io.BytesIO(data)) as image:w,h=image.size;o=image.getexif().get(274,1)
    if o>=5:w,h=h,w
    b=box or dict(left=0,top=0,right=w,bottom=h)
    return dict(id='test',assetSha256=crop.digest(data),width=w,height=h,orientation=o,confirmedIdentity=True,issue='none',markedBox=b,effectiveBox=crop.effective_box(b,w,h))
def oracle(data,a):
    with Image.open(io.BytesIO(data)) as image:p=np.asarray(image.convert('RGB'))
    oriented={1:p,2:p[:,::-1],3:p[::-1,::-1],4:p[::-1],5:p.transpose(1,0,2),6:np.rot90(p,3),7:p.transpose(1,0,2)[::-1,::-1],8:np.rot90(p,1)}[a['orientation']]
    b=a['effectiveBox'];selected=oriented[b['top']:b['bottom'],b['left']:b['right']];h,w=selected.shape[:2];scale=min(224/w,224/h)
    fit=(max(1,min(224,int(w*scale+.5))),max(1,min(224,int(h*scale+.5))))
    canvas=np.full((224,224,3),128,np.uint8);resized=np.asarray(Image.fromarray(selected).resize(fit,Image.Resampling.LANCZOS))
    left=(224-fit[0])//2;top=(224-fit[1])//2;canvas[top:top+fit[1],left:left+fit[0]]=resized
    return canvas.astype(np.float32).reshape(1,224,224,3)/np.float32(255),canvas.tobytes()
def sef():
    tags=[(0xa01,b'Image_UTC_Data',b'0'*13),(0xaa1,b'MCC_Data',b'0'*3),(0xc61,b'Camera_Capture_Mode_Info',b'0')]
    records=[struct.pack('<HHI',0,t,len(n))+n+p for t,n,p in tags];total=sum(map(len,records));cursor=0;entries=[]
    for (t,_,_),r in zip(tags,records):entries.append(struct.pack('<HHII',0,t,total-cursor,len(r)));cursor+=len(r)
    directory=b'SEFH'+struct.pack('<II',107,3)+b''.join(entries)
    return b''.join(records)+directory+struct.pack('<I',len(directory))+b'SEFT'
def factory(root):
    root.mkdir();entries=[];frames=[];annotations=[]
    for i in range(40):
        data=jpeg(i=i,orientation=i%8+1);name='i'+str(i);path=root/(name+'.jpg');path.write_bytes(data);a=annotation(data);a['id']=name;annotations.append(a)
        entries.append(dict(id=name,productId='p'+str(i//4),physicalFamily='family'+str(i//4),exposure='e'+str(i),role='reference' if i%4<2 else 'query',asset=dict(path=name+'.jpg',sha256=crop.digest(data))))
        frames.append({k:a[k] for k in ['id','assetSha256','width','height','orientation']})
    study=dict(schemaVersion=1,studyId='same-instance-exploration-v1',kind='generated-fixture',formalAdmission=False,modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.baseline.RECIPE_SHA,products=[dict(id='p'+str(i),label='Product '+str(i),physicalFamily='family'+str(i)) for i in range(10)],entries=entries)
    c=dict(schemaVersion=1,comparisonId='generated-framing',formalAdmission=False,primary='FF->CC',study=study,baseline=dict(studySha256='1'*64,bundleSha256='2'*64,setupSha256='3'*64,softwareSha256='4'*64,sourceSha256=crop.baseline.source_fingerprint(),runId='generated-baseline'),cropRecipeSha256=crop.RECIPE_SHA,frames=frames)
    a=dict(schemaVersion=1,comparisonSha256=crop.digest(crop.packed(c)),recipeSha256=crop.RECIPE_SHA,entries=annotations)
    return c,a
class FakeInterpreter:
    def set_tensor(self,index,tensor):self.tensor=tensor
    def invoke(self):pass
    def get_tensor(self,index):return np.ones((1,1024),dtype=np.float32)
def fake_cpu(model):return FakeInterpreter(),0,0
def fake_worker(conn,model):
    crop.cpu_interpreter=fake_cpu;crop.worker(conn,model)
def fatal_worker(conn,model):conn.send_bytes(crop.packed(dict(fatal='RUNTIME_ERROR')));conn.close()
def disconnect_worker(conn,model):conn.close()
def hang_worker(conn,model):time.sleep(30)
def invalid_worker(conn,model):conn.send_bytes(crop.packed(dict(ready=True,loadMs=True)));conn.close()
def silent_after_ready(conn,model):
    conn.send_bytes(crop.packed(dict(ready=True,loadMs=1)));conn.recv_bytes(16384);time.sleep(30)

class Pixels(unittest.TestCase):
    def equal(self,o,p,full=False):
        data=jpeg(o,p);a=annotation(data,None if full else dict(left=7,top=11,right=42,bottom=51));tensor,thumb,context,detail=crop.preprocess(data,a)
        wanted,pixels=oracle(data,a);np.testing.assert_array_equal(tensor,wanted);self.assertEqual(detail['pixelSha256'],crop.digest(pixels));self.assertEqual(detail['tensorSha256'],crop.digest(wanted.tobytes()))
        self.assertEqual(tensor.dtype,np.dtype('<f4'));self.assertTrue(tensor.flags.c_contiguous);self.assertEqual(tensor.shape,(1,224,224,3))
        old,old_thumb,old_details=crop.baseline.preprocess(data)
        self.assertEqual(context,old_thumb)
        if full:np.testing.assert_array_equal(tensor,old);self.assertEqual(thumb,old_thumb);self.assertEqual(detail['tensorSha256'],old_details['tensorSha256'])
        for derivative in [thumb,context]:
            with Image.open(io.BytesIO(derivative)) as image:self.assertFalse(image.info)
    def test_odd_padding_portrait_landscape_small_full_frame(self):
        for size in [(83,224),(224,83),(1,1),(7,3),(320,479)]:
            data=jpeg(size=size);a=annotation(data);tensor,thumb,_,detail=crop.preprocess(data,a);old,old_thumb,old_detail=crop.baseline.preprocess(data)
            np.testing.assert_array_equal(tensor,old);self.assertEqual(thumb,old_thumb);self.assertEqual(detail['pixelSha256'],old_detail['pixelSha256'])
    def test_padding_hand_calculated_ceil_and_clamp(self):
        self.assertEqual(crop.effective_box(dict(left=10,top=20,right=31,bottom=62),200,100),dict(left=8,top=17,right=33,bottom=65))
        self.assertEqual(crop.effective_box(dict(left=0,top=0,right=1,bottom=1),200,100),dict(left=0,top=0,right=2,bottom=2))
    def test_crop_uses_original_pixels_not112_thumbnail(self):
        data=jpeg(size=(1600,900));a=annotation(data,dict(left=997,top=321,right=1041,bottom=389));tensor,_,_,d=crop.preprocess(data,a);expected,pixels=oracle(data,a)
        np.testing.assert_array_equal(tensor,expected);self.assertEqual(d['pixelSha256'],crop.digest(pixels));self.assertNotEqual(d['pixelSha256'],crop.baseline.preprocess(data)[2]['pixelSha256'])
    def test_tail_primary_equivalence_full_buffer_hash_preserved(self):
        data=jpeg(6,True);a=annotation(data);bare=crop.preprocess(data,a);wrapped=crop.preprocess(data+sef(),a)
        np.testing.assert_array_equal(bare[0],wrapped[0]);self.assertEqual(bare[1:3],wrapped[1:3]);self.assertNotEqual(crop.digest(data),crop.digest(data+sef()))
    def test_malformed_truncated_polyglot_reject(self):
        data=jpeg();a=annotation(data)
        for bad in [data[:-2],data+b'arbitrary',data+jpeg(i=9),b'\xff\xd8\xff\xd9',data+sef()+b'x',data+sef()[:-3]]:
            with self.assertRaises(Exception):crop.preprocess(bad,a)
    def test_restart_and_stuffing_inherited(self):
        data=jpeg(restart=True,size=(224,224));a=annotation(data);np.testing.assert_array_equal(crop.preprocess(data,a)[0],oracle(data,a)[0])
    def test_dimensions_orientation_native_types_reject(self):
        data=jpeg(6);a=annotation(data)
        for key,bad in [('width',True),('width',a['width']+1),('height',str(a['height'])),('orientation',6.0),('orientation',True),('orientation',1)]:
            changed=json.loads(json.dumps(a));changed[key]=bad
            with self.assertRaises(Exception):crop.preprocess(data,changed)
    def test_native_exif_bool_float_string_invalid_reject(self):
        data=jpeg();a=annotation(data)
        for value in [True,1.0,'1',0,9]:
            with patch.object(Image.Image,'getexif',return_value={274:value}):
                with self.assertRaises(Exception):crop.preprocess(data,a)
    def test_unsupported_profile_and_colour_do_not_fallback(self):
        data=jpeg();a=annotation(data)
        with Image.open(io.BytesIO(data)) as im:
            out=io.BytesIO();im.save(out,format='JPEG',icc_profile=b'invalid')
        with self.assertRaises(Exception):crop.preprocess(out.getvalue(),a)
        out=io.BytesIO();Image.new('CMYK',(97,63)).save(out,format='JPEG')
        with self.assertRaises(Exception):crop.preprocess(out.getvalue(),a)
    def test_padding_mismatch_and_native_marked_box_reject(self):
        data=jpeg();a=annotation(data);a['effectiveBox']['right']-=1
        with self.assertRaises(Exception):crop.preprocess(data,a)
        for bad in [True,'0',0.5,-1,None]:
            b=dict(left=bad,top=0,right=10,bottom=10)
            with self.assertRaises(Exception):crop.effective_box(b,100,100)

for orientation in range(1,9):
    for progressive in [False,True]:
        def full(self,o=orientation,p=progressive):self.equal(o,p,True)
        def selected(self,o=orientation,p=progressive):self.equal(o,p,False)
        setattr(Pixels,'test_full_frame_o%d_progressive%d'%(orientation,progressive),full)
        setattr(Pixels,'test_oriented_crop_o%d_progressive%d'%(orientation,progressive),selected)

class Boundaries(unittest.TestCase):
    def setUp(self):self.root=RUN/uuid.uuid4().hex;self.c,self.a=factory(self.root)
    def test_strict_comparison_annotation_generated_native_types(self):
        crop.validate_comparison(self.c);crop.validate_annotations(self.c,self.a,crop.digest(crop.packed(self.c)))
        for key,bad in [('width',True),('orientation',1.0),('height','97')]:
            c=json.loads(json.dumps(self.c));c['frames'][0][key]=bad
            with self.assertRaises(Exception):crop.validate_comparison(c)
        for mutate in [lambda a:a['entries'].pop(),lambda a:a['entries'][0].update(id=a['entries'][1]['id']),lambda a:a['entries'][0].update(confirmedIdentity='true'),lambda a:a['entries'][0].update(issue='identity'),lambda a:a['entries'][0]['effectiveBox'].update(left=True)]:
            a=json.loads(json.dumps(self.a));mutate(a)
            with self.assertRaises(Exception):crop.validate_annotations(self.c,a,crop.digest(crop.packed(self.c)))
    def test_partial_annotations_never_complete(self):
        a=json.loads(json.dumps(self.a));a['entries'][0].update(confirmedIdentity=False,issue='bounds')
        crop.validate_annotations(self.c,a,crop.digest(crop.packed(self.c)),complete=False)
        with self.assertRaises(Exception):crop.validate_annotations(self.c,a,crop.digest(crop.packed(self.c)))
    def test_strict_duplicate_and_nonfinite_json(self):
        path=self.root/'bad.json'
        for text in ['{"x":1,"x":2}','{"x":NaN}','{"x":Infinity}']:
            path.write_text(text)
            with self.assertRaises(Exception):crop.read_json(path,self.root)
    def test_safe_read_hash_hardlink_alias_and_no_overwrite(self):
        path=self.root/'i0.jpg';digest=self.c['study']['entries'][0]['asset']['sha256'];self.assertEqual(crop.digest(crop.buffered(path,self.root,digest)),digest)
        with self.assertRaises(Exception):crop.checked_path(path,self.root,missing=True)
        with self.assertRaises(Exception):crop.buffered(path,self.root,'0'*64)
        link=self.root/'hard.jpg';os.link(path,link)
        with self.assertRaises(Exception):crop.buffered(path,self.root)
        with self.assertRaises(Exception):crop.buffered(self.root/'../outside.jpg',self.root)
    def test_actual_windows_junction_reject(self):
        target=self.root/'target';target.mkdir();(target/'x.jpg').write_bytes(jpeg());link=self.root/'junction'
        r=subprocess.run(['cmd','/c','mklink','/J',str(link),str(target)],capture_output=True)
        self.assertEqual(r.returncode,0)
        with self.assertRaises(Exception):crop.buffered(link/'x.jpg',self.root)
    def test_changed_between_stat_and_open_reject(self):
        path=self.root/'i0.jpg';original_open=Path.open;swapped=[]
        def changed(p,*args,**kw):
            if p==path and args and args[0]=='rb' and not swapped:
                replacement=self.root/'replacement.jpg';replacement.write_bytes(jpeg(i=88));os.replace(replacement,path);swapped.append(True)
            return original_open(p,*args,**kw)
        with patch.object(Path,'open',changed):
            with self.assertRaises(crop.Blocked):crop.buffered(path,self.root)
        self.assertEqual(swapped,[True])
    def real_encode(self,target,load_timeout=10):
        out=self.root/('out-'+uuid.uuid4().hex);out.mkdir();created=[];context=multiprocessing.get_context('spawn');old_process=context.Process
        class WrappedContext:
            def Pipe(self):return context.Pipe()
            def Process(self,**kwargs):
                proc=old_process(target=target,args=kwargs['args']);created.append(proc);return proc
        with patch.object(crop.multiprocessing,'get_context',return_value=WrappedContext()):
            result=crop.encode_entries(self.c['study']['entries'],self.a,self.root,out,b'generated-no-real-model',load_timeout=load_timeout)
        self.assertEqual(len(created),1);self.assertFalse(created[0].is_alive());return result,out
    def test_actual_spawn_mock_interpreter40_vectors_two_derivatives_originals_preserved(self):
        result,out=self.real_encode(fake_worker);records,load,encoding,attempt,failure=result
        self.assertIsNone(failure);self.assertEqual(len(records),40);self.assertTrue(all(r['kind']=='vector' for r in records));self.assertGreaterEqual(attempt,load+encoding)
        self.assertEqual(len(list(out.glob('*.png'))),80)
        for e in self.c['study']['entries']:self.assertEqual(crop.digest((self.root/e['asset']['path']).read_bytes()),e['asset']['sha256'])
    def test_decode_failure_retains40_and_runs_other39(self):
        bad=self.root/'i2.jpg';bad.write_bytes(b'bad');self.c['study']['entries'][2]['asset']['sha256']=crop.digest(b'bad')
        result,_=self.real_encode(fake_worker);records=result[0];self.assertEqual(records[2]['code'],'DECODE_ERROR');self.assertEqual(sum(r['kind']=='vector' for r in records),39);self.assertEqual(len(records),40)
    def test_hash_change_stops_and_remaining_not_run(self):
        (self.root/'i0.jpg').write_bytes(jpeg(i=99));result,_=self.real_encode(fake_worker)
        self.assertEqual(result[0][0]['code'],'INPUT_CHANGED');self.assertTrue(all(r['code']=='NOT_RUN' for r in result[0][1:]));self.assertEqual(len(result[0]),40)
    def test_spawned_load_fatal_disconnect_invalid_keep40(self):
        for target,reason in [(fatal_worker,'WORKER_FATAL'),(disconnect_worker,'DISCONNECTED'),(invalid_worker,'INVALID_READY')]:
            result,_=self.real_encode(target);self.assertEqual(result[4],dict(stage='load',reason=reason));self.assertTrue(all(r['code']=='NOT_RUN' for r in result[0]));self.assertEqual(len(result[0]),40);self.assertGreater(result[1],0);self.assertEqual(result[2],0)
    def test_actual_spawn_load_timeout_drain(self):
        result,_=self.real_encode(hang_worker,load_timeout=.15);self.assertEqual(result[4],dict(stage='load',reason='TIMEOUT'));self.assertEqual(len(result[0]),40)
    def test_per_image_timeout_keeps40_and_terminates(self):
        context=multiprocessing.get_context('spawn');parent,child=context.Pipe();process=context.Process(target=silent_after_ready,args=(child,b'generated'));out=self.root/'timeout';out.mkdir()
        process.start();child.close()
        try:
            self.assertIsNone(crop.baseline.wait_for_load(parent,10));records,_=crop.collect(parent,process,self.c['study']['entries'],self.a,self.root,out,per_image=.1,total=2)
            self.assertEqual(records[0]['code'],'TIMEOUT');self.assertTrue(all(r['code']=='NOT_RUN' for r in records[1:]));self.assertEqual(len(records),40)
        finally:process.terminate();process.join(5);parent.close()
        self.assertFalse(process.is_alive())
    def test_total_budget_and_cancellation_keep40_without_sending(self):
        class NoConnection:
            def send_bytes(self,data):raise AssertionError('NO_JOBS_ALLOWED')
        class NoProcess:
            def terminate(self):raise AssertionError('NOT_STARTED')
        for total,cancelled in [(0,lambda:False),(900,lambda:True)]:
            records,_=crop.collect(NoConnection(),NoProcess(),self.c['study']['entries'],self.a,self.root,self.root,total=total,cancelled=cancelled)
            self.assertEqual(len(records),40);self.assertTrue(all(r['code']=='NOT_RUN' for r in records))
    def test_cpu_output_wrongshape_bool_nan_zero_is_fatal(self):
        for vector in [np.zeros((1,1024),np.float32),np.ones((1024,),np.float32),np.ones((1,1024),np.float64),np.ones((1,1024),np.bool_),np.full((1,1024),np.nan,np.float32)]:
            with self.assertRaises(Exception):crop.valid_vector(vector)
    def test_source_manifest_python_node_parity_and_baseline_unchanged(self):
        node=Path(r'C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64\node.EXE')
        result=subprocess.run([str(node),str(crop.baseline.LAB/'src/framingComparisonCli.ts'),'fingerprint'],capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr);self.assertEqual(result.stdout.strip(),crop.digest(crop.packed(runtime.source_manifest())))
        self.assertEqual(crop.baseline.source_fingerprint(),'e8a18df3c3961a9a8b98cd9db8f4612368a4e2174cda9d25cc1fe22ac15d33c2')
    def test_cancel_during_poll_terminates_and_keeps40(self):
        class Connection:
            def send_bytes(self,data):pass
            def poll(self,timeout):return False
        class Process:
            calls=0
            def terminate(self):self.calls+=1
        calls=[]
        def cancelled():calls.append(True);return len(calls)>=2
        process=Process();records,_=crop.collect(Connection(),process,self.c['study']['entries'],self.a,self.root,self.root,cancelled=cancelled)
        self.assertEqual(process.calls,1);self.assertEqual(len(records),40);self.assertTrue(all(r['code']=='NOT_RUN' for r in records))
    def test_invalid_child_identity_or_derivative_keeps40_failures(self):
        class Connection:
            def __init__(self,message):self.message=message
            def send_bytes(self,data):pass
            def poll(self,timeout):return True
            def recv_bytes(self,limit):return crop.packed(self.message)
        class Process:
            def terminate(self):pass
        for message in [dict(id='wrong',assetSha256='0'*64,kind='failure',code='DECODE_ERROR'),dict(record=dict(id='wrong',assetSha256='0'*64),thumbnail='',context='')]:
            records,_=crop.collect(Connection(message),Process(),self.c['study']['entries'],self.a,self.root,self.root)
            self.assertEqual(len(records),40);self.assertEqual(records[0]['code'],'RUNTIME_ERROR');self.assertTrue(all(r['code']=='NOT_RUN' for r in records[1:]))
    def test_new_output_revalidated_before_creation(self):
        from types import SimpleNamespace
        out=crop.RUNS/('fc-output-'+uuid.uuid4().hex);out.mkdir()
        with self.assertRaises(crop.Blocked):runtime.produce(SimpleNamespace(),dict(comparison=self.c,out=out,root=self.root))
        self.assertEqual(list(out.iterdir()),[])
    def test_strict_saved_baseline_record_provenance(self):
        c=json.loads(json.dumps(self.c));b=dict(schemaVersion=1,runId=c['baseline']['runId'],mode='GENERATED_FIXTURE',studySha256=c['baseline']['studySha256'],modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.baseline.RECIPE_SHA,sourceSha256=c['baseline']['sourceSha256'],setupSha256=c['baseline']['setupSha256'],softwareSha256=c['baseline']['softwareSha256'],loadMs=1,encodingMs=2,attemptMs=4,runFailure=None,environment=dict(python='fixture',os='fixture',cpu='mock',threads=1,memory='not-measured'),preservation=[dict(id=e['id'],before=e['asset']['sha256'],after=e['asset']['sha256']) for e in c['study']['entries']],records=[dict(id=e['id'],assetSha256=e['asset']['sha256'],kind='vector',values=[1.0]*1024,pixelSha256='1'*64,tensorSha256='2'*64,thumbnailSha256='3'*64,timings=dict(readMs=1,decodeMs=2,preprocessMs=3,inferenceMs=4)) for e in c['study']['entries']])
        c['baseline']['bundleSha256']=crop.digest(crop.packed(b));runtime.validate_baseline(c,b,c['baseline']['bundleSha256'])
        for mutate in [lambda b:b['records'][0]['values'].__setitem__(0,True),lambda b:b['records'][0].update(values=[0]*1024),lambda b:b['records'][0].update(id='missing'),lambda b:b['preservation'][0].update(after='0'*64),lambda b:b.update(recipeSha256=crop.RECIPE_SHA),lambda b:b.update(attemptMs=1)]:
            bad=json.loads(json.dumps(b));mutate(bad);digest=crop.digest(crop.packed(bad));c['baseline']['bundleSha256']=digest
            with self.assertRaises(Exception):runtime.validate_baseline(c,bad,digest)
    def test_actual_generated_preflight_no_pixels_no_model_creation_and_private_tag_denied(self):
        root=crop.RUNS/('fc-preflight-'+uuid.uuid4().hex);root.mkdir();c,a=factory(root/'originals');full=root/'full';full.mkdir()
        # Real installed software/model are READ/HASH inputs only. Baseline vectors
        # and metadata below are explicitly generated, never historical A5.
        software_path=crop.baseline.RUNS/'e01-e03-20261004/software.json';software=software_path.read_bytes();software_hash=crop.digest(software)
        old_setup=dict(schemaVersion=1,modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.baseline.RECIPE_SHA,softwareSha256=software_hash,rightsReviewed=True,preprocessingReviewed=True,networkReviewed=False,reviewer='generated-only',evidence=['generated metadata, no encoding'])
        study_bytes=crop.packed(c['study']);old_setup_bytes=crop.packed(old_setup)
        b=dict(schemaVersion=1,runId='generated-saved-baseline',mode='GENERATED_FIXTURE',studySha256=crop.digest(study_bytes),modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.baseline.RECIPE_SHA,sourceSha256=crop.baseline.source_fingerprint(),setupSha256=crop.digest(old_setup_bytes),softwareSha256=software_hash,loadMs=1,encodingMs=2,attemptMs=4,runFailure=None,environment=dict(python='generated',os='generated',cpu='mock-not-encoded',threads=1,memory='not-measured'),preservation=[dict(id=e['id'],before=e['asset']['sha256'],after=e['asset']['sha256']) for e in c['study']['entries']],records=[dict(id=e['id'],assetSha256=e['asset']['sha256'],kind='vector',values=[1.0]*1024,pixelSha256='1'*64,tensorSha256='2'*64,thumbnailSha256='3'*64,timings=dict(readMs=1,decodeMs=2,preprocessMs=3,inferenceMs=4)) for e in c['study']['entries']])
        c['baseline']=dict(studySha256=b['studySha256'],bundleSha256=crop.digest(crop.packed(b)),setupSha256=b['setupSha256'],softwareSha256=software_hash,sourceSha256=b['sourceSha256'],runId=b['runId'])
        c_hash=crop.digest(crop.packed(c));a['comparisonSha256']=c_hash;a_hash=crop.digest(crop.packed(a));manifest=runtime.source_manifest();source=crop.digest(crop.packed(manifest))
        setup=dict(schemaVersion=1,kind='FRAMING_SETUP',modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.RECIPE_SHA,softwareSha256=software_hash,sourceSha256=source,comparisonSha256=c_hash,annotationSha256=a_hash,baselineBundleSha256=c['baseline']['bundleSha256'],rightsReviewed=True,preprocessingReviewed=True,networkReviewed=False,reviewer='generated-only',evidence=['generated framing preflight only'])
        output=root/'never-created';run_id='framing-generated-preflight'
        permit=dict(status='GENERATED_FRAMING_FIXTURE_ONLY',authorThreadId='generated-test',runId=run_id,comparisonSha256=c_hash,annotationSha256=a_hash,baselineBundleSha256=c['baseline']['bundleSha256'],baselineSourceSha256=b['sourceSha256'],sourceSha256=source,setupSha256=crop.digest(crop.packed(setup)),softwareSha256=software_hash,modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.RECIPE_SHA,root=str(root/'originals'),out=str(output))
        for name,value in [('comparison',c),('annotations',a),('setup',setup),('source-manifest',manifest),('fixture-permit',permit)]: (root/(name+'.json')).write_bytes(crop.packed(value))
        (full/'bundle.json').write_bytes(crop.packed(b));(full/'study.json').write_bytes(study_bytes);(full/'setup.json').write_bytes(old_setup_bytes);(full/'software.json').write_bytes(software)
        argv=[sys.executable,'-B',str(Path(crop.__file__)),'--preflight','--comparison',str(root/'comparison.json'),'--annotations',str(root/'annotations.json'),'--baseline',str(full/'bundle.json'),'--root',str(root/'originals'),'--model',str(crop.baseline.RUNS/'e01-e03-20261004/mobilenet_v3_small.tflite'),'--setup',str(root/'setup.json'),'--software',str(software_path),'--source-manifest',str(root/'source-manifest.json'),'--out',str(output),'--run-id',run_id,'--approval',str(root/'fixture-permit.json')]
        result=subprocess.run(argv,capture_output=True,text=True,timeout=60)
        (RUN/'generated-preflight-result.json').write_text(json.dumps(dict(exit=result.returncode,stdout=result.stdout,stderr=result.stderr,fixtureRoot=str(root),modelReadOnly=True,noModelCreation=True,noPrivatePixels=True),indent=2)+'\n')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr);self.assertEqual(result.stdout.strip(),'CONNECTED_PREFLIGHT_PASSED');self.assertFalse(output.exists())
        # Private tag with generated permit MUST deny before model/filesystem work.
        c['study']['kind']='private-same-instance';b['mode']='PRIVATE_INFERENCE';old_setup['networkReviewed']=True;setup['networkReviewed']=True
        b['studySha256']=crop.digest(crop.packed(c['study']));b['setupSha256']=crop.digest(crop.packed(old_setup));c['baseline']['studySha256']=b['studySha256'];c['baseline']['setupSha256']=b['setupSha256'];c['baseline']['bundleSha256']=crop.digest(crop.packed(b))
        c_hash=crop.digest(crop.packed(c));a['comparisonSha256']=c_hash;setup.update(comparisonSha256=c_hash,annotationSha256=crop.digest(crop.packed(a)),baselineBundleSha256=c['baseline']['bundleSha256'])
        permit.update(comparisonSha256=c_hash,annotationSha256=setup['annotationSha256'],baselineBundleSha256=setup['baselineBundleSha256'],setupSha256=crop.digest(crop.packed(setup)))
        for path,value in [(root/'comparison.json',c),(root/'annotations.json',a),(root/'setup.json',setup),(root/'fixture-permit.json',permit),(full/'study.json',c['study']),(full/'setup.json',old_setup),(full/'bundle.json',b)]:path.write_bytes(crop.packed(value))
        rejected=subprocess.run(argv,capture_output=True,text=True,timeout=30);self.assertEqual(rejected.returncode,1);self.assertIn('NEW_E04_BINDING_REQUIRED',rejected.stderr);self.assertFalse(output.exists())
        (RUN/'private-tag-rejection.json').write_text(json.dumps(dict(exit=rejected.returncode,stderr=rejected.stderr,generatedMetadataOnly=True,privatePixels=False,newE04=False),indent=2)+'\n')

class PreflightLayout(unittest.TestCase):
    """Real CLI checks with generated inputs and forbidden pixel/model imports."""
    def setUp(self):
        self.root=crop.RUNS/('fc-c2-preflight-'+uuid.uuid4().hex);self.root.mkdir()
        c,a=factory(self.root/'originals');full=self.root/'full';full.mkdir()
        self.software_path=crop.baseline.RUNS/'e01-e03-20261004/software.json'
        software=self.software_path.read_bytes();software_hash=crop.digest(software)
        old_setup=dict(schemaVersion=1,modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.baseline.RECIPE_SHA,softwareSha256=software_hash,rightsReviewed=True,preprocessingReviewed=True,networkReviewed=False,reviewer='generated-only',evidence=['C2 generated metadata; no encoding'])
        study_bytes=crop.packed(c['study']);setup_bytes=crop.packed(old_setup)
        b=dict(schemaVersion=1,runId='generated-c2-baseline',mode='GENERATED_FIXTURE',studySha256=crop.digest(study_bytes),modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.baseline.RECIPE_SHA,sourceSha256=crop.baseline.source_fingerprint(),setupSha256=crop.digest(setup_bytes),softwareSha256=software_hash,loadMs=1,encodingMs=2,attemptMs=4,runFailure=None,environment=dict(python='generated',os='generated',cpu='mock-not-encoded',threads=1,memory='not-measured'),preservation=[dict(id=e['id'],before=e['asset']['sha256'],after=e['asset']['sha256']) for e in c['study']['entries']],records=[dict(id=e['id'],assetSha256=e['asset']['sha256'],kind='vector',values=[1.0]*1024,pixelSha256='1'*64,tensorSha256='2'*64,thumbnailSha256='3'*64,timings=dict(readMs=1,decodeMs=2,preprocessMs=3,inferenceMs=4)) for e in c['study']['entries']])
        c['baseline']=dict(studySha256=b['studySha256'],bundleSha256=crop.digest(crop.packed(b)),setupSha256=b['setupSha256'],softwareSha256=software_hash,sourceSha256=b['sourceSha256'],runId=b['runId'])
        ch=crop.digest(crop.packed(c));a['comparisonSha256']=ch;manifest=runtime.source_manifest();source=crop.digest(crop.packed(manifest))
        setup=dict(schemaVersion=1,kind='FRAMING_SETUP',modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.RECIPE_SHA,softwareSha256=software_hash,sourceSha256=source,comparisonSha256=ch,annotationSha256=crop.digest(crop.packed(a)),baselineBundleSha256=c['baseline']['bundleSha256'],rightsReviewed=True,preprocessingReviewed=True,networkReviewed=False,reviewer='generated-only',evidence=['C2 generated preflight only'])
        self.permit=dict(status='GENERATED_FRAMING_FIXTURE_ONLY',authorThreadId='generated-test',runId='framing-generated-c2',comparisonSha256=ch,annotationSha256=setup['annotationSha256'],baselineBundleSha256=c['baseline']['bundleSha256'],baselineSourceSha256=b['sourceSha256'],sourceSha256=source,setupSha256=crop.digest(crop.packed(setup)),softwareSha256=software_hash,modelSha256=crop.baseline.MODEL_SHA,recipeSha256=crop.RECIPE_SHA,root=str(self.root/'originals'),out='')
        for name,value in [('comparison',c),('annotations',a),('setup',setup),('source-manifest',manifest)]: (self.root/(name+'.json')).write_bytes(crop.packed(value))
        for name,data in [('bundle.json',crop.packed(b)),('study.json',study_bytes),('setup.json',setup_bytes),('software.json',software)]: (full/name).write_bytes(data)
        self.originals={str(self.root/'originals'/e['asset']['path']):e['asset']['sha256'] for e in c['study']['entries']}
        self.arguments=['--comparison',str(self.root/'comparison.json'),'--annotations',str(self.root/'annotations.json'),'--baseline',str(full/'bundle.json'),'--root',str(self.root/'originals'),'--model',str(crop.baseline.RUNS/'e01-e03-20261004/mobilenet_v3_small.tflite'),'--setup',str(self.root/'setup.json'),'--software',str(self.software_path),'--source-manifest',str(self.root/'source-manifest.json'),'--run-id',self.permit['runId'],'--approval',str(self.root/'fixture-permit.json')]
    def bind_output(self,out):
        self.permit['out']=str(out);(self.root/'fixture-permit.json').write_bytes(crop.packed(self.permit))
        return [*self.arguments,'--out',str(out)]
    def cli(self,out,preflight=True,expected=0):
        argv=self.bind_output(out);receipt=RUN/('c2-cli-'+uuid.uuid4().hex+'.json')
        # Execute the real script/main/argparse/prepare in a fresh process. A
        # successful preflight must not even import a decoder/model interpreter.
        guard="""import builtins,json,runpy,sys
from pathlib import Path
receipt=Path(sys.argv.pop(1));sys.argv=sys.argv[1:];sys.path.insert(0,str(Path(sys.argv[0]).parent))
original=builtins.__import__;forbidden=[]
def checked_import(name,*args,**kwargs):
    if name.split('.')[0] in ['PIL','tflite_runtime','tensorflow']:
        forbidden.append(name);raise AssertionError('PREFLIGHT_MUST_NOT_IMPORT_PIXELS_OR_MODEL')
    return original(name,*args,**kwargs)
builtins.__import__=checked_import
try:runpy.run_path(sys.argv[0],run_name='__main__')
finally:receipt.write_text(json.dumps(dict(forbiddenImports=forbidden,realScript=True))+'\\n')
"""
        r=subprocess.run([sys.executable,'-B','-c',guard,str(receipt),str(Path(crop.__file__)),*(['--preflight'] if preflight else []),*argv],capture_output=True,text=True,timeout=60)
        evidence=json.loads(receipt.read_bytes());evidence.update(exit=r.returncode,stdout=r.stdout,stderr=r.stderr,fixtureRoot=str(self.root),output=str(out),parentExists=out.parent.exists(),outputExists=out.exists(),expectedExit=expected,preflight=preflight,generatedOnly=True,realModel=False,privatePixels=False)
        receipt.write_text(json.dumps(evidence,indent=2)+'\n')
        self.assertEqual(evidence['forbiddenImports'],[]);self.assertEqual(r.returncode,expected,r.stdout+r.stderr)
        self.assertEqual(len(self.originals),40)
        for path,digest in self.originals.items():self.assertEqual(crop.digest(Path(path).read_bytes()),digest)
        if expected==0:self.assertEqual(r.stdout.strip(),'CONNECTED_PREFLIGHT_PASSED')
        else:self.assertNotEqual(r.stdout.strip(),'CONNECTED_PREFLIGHT_PASSED')
        return r
    def test_actual_cli_one_missing_parent_passes_without_creating_either_level(self):
        out=self.root/'future-private-output'/'producer';self.cli(out)
        self.assertFalse(out.exists());self.assertFalse(out.parent.exists())
    def test_existing_parent_preflight_and_normal_prepare_are_read_only(self):
        out=self.root/'producer';self.cli(out);self.assertFalse(out.exists())
        from types import SimpleNamespace
        argv=self.bind_output(out);values={k[2:].replace('-','_'):v for k,v in zip(argv[::2],argv[1::2])}
        prepared=runtime.prepare(SimpleNamespace(**values,preflight=False));self.assertEqual(prepared['out'],out);self.assertFalse(out.exists())
    def test_two_missing_levels_and_normal_missing_parent_reject(self):
        for out,preflight in [(self.root/'first-missing'/'second-missing'/'producer',True),(self.root/'future-normal'/'producer',False)]:
            r=self.cli(out,preflight,1);self.assertEqual(r.stderr.strip(),'INPUT_UNAVAILABLE');self.assertFalse(out.parent.exists());self.assertFalse(out.exists())
    def test_truthy_non_boolean_preflight_cannot_relax_parent_check(self):
        from types import SimpleNamespace
        out=self.root/'future-flag'/'producer';argv=self.bind_output(out);values={k[2:].replace('-','_'):v for k,v in zip(argv[::2],argv[1::2])}
        for value in [1,'true',[True],None,False]:
            with self.subTest(value=value),self.assertRaises(crop.Blocked) as error:runtime.prepare(SimpleNamespace(**values,preflight=value))
            self.assertEqual(str(error.exception),'INPUT_UNAVAILABLE');self.assertFalse(out.parent.exists())
    def test_file_parent_outside_ceiling_and_occupied_outputs_reject(self):
        parent=self.root/'file-parent';parent.write_text('generated')
        occupied=self.root/'occupied';occupied.mkdir();marker=occupied/'keep.txt';marker.write_text('preserve')
        occupied_file=self.root/'occupied-file';occupied_file.write_text('preserve')
        outside=crop.baseline.RUNS/('c2-outside-'+uuid.uuid4().hex)/'producer'
        for out in [parent/'producer',outside,occupied,occupied_file]:
            self.cli(out,expected=1)
        self.assertEqual(marker.read_text(),'preserve');self.assertEqual(occupied_file.read_text(),'preserve');self.assertFalse(outside.parent.exists())
    def test_symlink_and_dangling_symlink_guard_reject(self):
        # Native symlink creation on this host fails WinError1314, retained in
        # C2 focused-round1. Exercise the unchanged guard's symlink branches;
        # real Windows reparse/dangling-junction CLI tests are separate below.
        from types import SimpleNamespace
        import stat
        target=self.root/'target';target.mkdir();out=target/'producer'
        argv=self.bind_output(out);values={k[2:].replace('-','_'):v for k,v in zip(argv[::2],argv[1::2])}
        actual_lstat=Path.lstat
        def linked_stat(path,*args,**kwargs):
            if path==target:return SimpleNamespace(st_mode=stat.S_IFLNK,st_file_attributes=0)
            return actual_lstat(path,*args,**kwargs)
        with patch.object(Path,'lstat',linked_stat),self.assertRaises(crop.Blocked) as error:runtime.prepare(SimpleNamespace(**values,preflight=True))
        self.assertEqual(str(error.exception),'LINKED_PATH');self.assertFalse(out.exists())
        link=self.root/'dangling';out=link/'producer';argv=self.bind_output(out);values={k[2:].replace('-','_'):v for k,v in zip(argv[::2],argv[1::2])}
        actual_link=Path.is_symlink
        with patch.object(Path,'is_symlink',lambda path:path==link or actual_link(path)),self.assertRaises(crop.Blocked) as error:runtime.prepare(SimpleNamespace(**values,preflight=True))
        self.assertEqual(str(error.exception),'LINKED_PATH');self.assertFalse(link.exists())
    def test_actual_junction_and_alias_reject(self):
        target=self.root/'junction-target';target.mkdir();link=self.root/'junction'
        r=subprocess.run(['cmd','/d','/c','mklink','/J',str(link),str(target)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr)
        self.cli(link/'producer',expected=1);self.assertFalse((target/'producer').exists())
        dangling=self.root/'dangling-junction';destination=self.root/'absent-junction-target'
        r=subprocess.run(['cmd','/d','/c','mklink','/J',str(dangling),str(destination)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr)
        self.cli(dangling/'producer',expected=1);self.assertFalse(destination.exists())
        alias=(self.root.parent/self.root.name.upper())/'future'/'producer';self.cli(alias,expected=1)
    def test_fixed_command_plan_uses_same_absent_parent_layout(self):
        # Parse and invoke ONLY the actual package/command-plan functions. No
        # controller, helper, native query, runtime stage or library import runs.
        live=Path(r'C:\Users\doyew\AppData\Local\Temp\cosi-framing-manual-20261011-a1')
        script=RUN/'c2-fixed-layout-plan.ps1'
        script.write_text("$ErrorActionPreference='Stop';Set-StrictMode -Version Latest\nfunction Assert-Keys($Value,$Keys){if((($Value.PSObject.Properties.Name|Sort-Object)-join ',') -cne (($Keys|Sort-Object)-join ',')){throw 'GENERATED_PACKAGE_KEYS'}}\nfunction Import-OnlyFunction($Path,$Name){$tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($Path,[ref]$tokens,[ref]$errors);if($errors.Count){throw 'PARSE'};$items=@($ast.FindAll({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -ceq $Name},$false));if($items.Count -ne 1){throw 'FUNCTION_CARDINALITY'};$parameters=if($items[0].Parameters){'param('+($items[0].Parameters.Extent.Text -join ',')+')'}else{''};Set-Item -Path ('Function:script:'+$Name) -Value ([scriptblock]::Create($parameters+$items[0].Body.Extent.Text.Substring(1,$items[0].Body.Extent.Text.Length-2)))}\nImport-OnlyFunction '"+str(live/'Framing-Bindings.ps1')+"' 'Get-FramingFixedPackage'\nImport-OnlyFunction '"+str(crop.baseline.LAB/'tools/framing-comparison/Framing-Preparation.ps1')+"' 'Get-FramingCommandPlan'\n$p=Get-FramingFixedPackage;$plan=Get-FramingCommandPlan $p\n[pscustomobject]@{Package=$p;Preflight=$plan.Preflight;Producer=$plan.Producer;OutputRootExists=(Test-Path -LiteralPath $p.OutputRoot);GrandparentExists=(Test-Path -LiteralPath (Split-Path $p.OutputRoot) -PathType Container)}|ConvertTo-Json -Depth 8 -Compress\n",encoding='utf-8')
        pwsh=Path(r'C:\Users\doyew\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe')
        r=subprocess.run([str(pwsh),'-NoLogo','-NoProfile','-File',str(script)],capture_output=True,text=True,timeout=30);self.assertEqual(r.returncode,0,r.stdout+r.stderr)
        plan=json.loads(r.stdout);(RUN/'c2-fixed-layout-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
        self.assertFalse(plan['OutputRootExists']);self.assertTrue(plan['GrandparentExists'])
        preflight=plan['Preflight'];producer=plan['Producer'];actual=Path(preflight[preflight.index('--out')+1])
        self.assertEqual(preflight[:3],['-B',str(Path(crop.__file__)),'--preflight']);self.assertEqual(producer[:2],preflight[:2]);self.assertEqual(preflight[3:],producer[2:])
        self.assertEqual(actual.parent,Path(plan['Package']['OutputRoot']));self.assertEqual(actual.name,'producer')
        self.assertEqual(actual.parent.parent,crop.RUNS);self.assertEqual(actual.parent.name,'private-'+plan['Package']['RunId'])
        generated=self.root/'future-private-output'/actual.name;self.cli(generated);self.assertFalse(generated.parent.exists())

if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]);result=unittest.TextTestRunner(verbosity=2).run(suite)
    (RUN/'results.json').write_text(json.dumps(dict(tests=result.testsRun,failures=len(result.failures),errors=len(result.errors),skipped=len(result.skipped),producerSha256=crop.digest(Path(crop.__file__).read_bytes()),sourceFingerprint=crop.digest(crop.packed(runtime.source_manifest())),generatedOnly=True,realModel=False,privatePixels=False),indent=2)+'\n',encoding='utf-8')
    sys.exit(0 if result.wasSuccessful() else 1)

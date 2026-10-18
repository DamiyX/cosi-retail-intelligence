"""Strict crop setup/source/approval preflight; never grants execution authority."""
import importlib.metadata,json,math,os,re,sys,time
from pathlib import Path
import crop_producer as crop
base=crop.baseline
GUARDS={
 'Invoke-ManualExperiment.ps1':(Path(r'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a5-20261010\Invoke-ManualExperiment.ps1'),'dbe7abae4f931d7f75890a4b470521aea7dfedd1826cb81064d9223198401a67'),
 'Support-ReadOnly.ps1':(Path(r'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a5-20261010\Support-ReadOnly.ps1'),'e3a2f09fc5dbb542de8c9c95dd11d72e205fa380856930603ba39c25f5108a9c'),
 'Native.cs':(Path(r'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a5-20261010\Native.cs'),'d7792ec63f5bb5426a216ac917a614e5080f5986cdaac90cd95f7ecac8315067'),
 'Invoke-ExploratoryIsolation.ps1':(Path(r'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-isolation-ir01-ir02-20261004\Invoke-ExploratoryIsolation.ps1'),'a3b211813d896c56982756f12a7f88fb17c65828fc55c2253d4be5a5790b523f')}

def source_manifest():
    files=set()
    def visit(path):
        path=base.checked_path(path,base.LAB)
        if path in files:return
        files.add(path)
        if path.suffix=='.ts':
            for rel in re.findall(r'(?:from\s+|import\s*)[\'\"](\.\.?/[^\'\"]+)[\'\"]',path.read_text(encoding='utf-8')):visit(path.parent/rel)
    for f in (base.LAB/'src').glob('framingComparison*.ts'):visit(f)
    for directory in ['tools/exploratory','tools/framing-comparison']:
        for f in (base.LAB/directory).iterdir():
            if f.suffix in ['.py','.lock','.cjs','.js','.html','.ps1','.json','.cs']:visit(f)
    for name in ['exploratoryStudy','exploratoryEvaluation','exploratoryReport','exploratoryCli']:visit(base.LAB/'src'/(name+'.ts'))
    rows=[[f.relative_to(base.LAB).as_posix(),base.digest(base.buffered(f,base.LAB))] for f in files]
    for name,(path,expected) in GUARDS.items():
        if base.digest(base.buffered(path,path.parent))!=expected:raise base.Blocked('FROZEN_GUARD_DRIFT')
        rows.append(['frozen-guard/'+name,expected])
    return sorted(rows,key=lambda r:r[0])

def finite(value):return type(value) in [int,float] and math.isfinite(value) and value>=0
def validate_baseline(c,b,raw_hash):
    base.exact(b,['schemaVersion','runId','mode','studySha256','modelSha256','recipeSha256','sourceSha256','setupSha256','softwareSha256','loadMs','encodingMs','attemptMs','runFailure','environment','preservation','records'])
    expected=c['baseline']
    if raw_hash!=expected['bundleSha256'] or any(b[k]!=expected[k] for k in ['runId','studySha256','sourceSha256','setupSha256','softwareSha256']) or b['schemaVersion']!=1 or type(b['schemaVersion']) is not int or b['modelSha256']!=base.MODEL_SHA or b['recipeSha256']!=base.RECIPE_SHA or b['mode']!=('GENERATED_FIXTURE' if c['study']['kind']=='generated-fixture' else 'PRIVATE_INFERENCE') or not all(finite(b[k]) for k in ['loadMs','encodingMs','attemptMs']) or b['attemptMs']<b['loadMs']+b['encodingMs'] or b['runFailure'] is not None:raise base.Blocked('BASELINE_PROVENANCE_OR_INCOMPLETE')
    base.exact(b['environment'],['python','os','cpu','threads','memory'])
    if b['environment']['threads']!=1 or type(b['environment']['threads']) is not int or b['environment']['memory']!='not-measured' or not all(type(b['environment'][k]) is str for k in ['python','os','cpu']):raise base.Blocked('BASELINE_ENVIRONMENT')
    if not isinstance(b['records'],list) or not isinstance(b['preservation'],list) or len(b['records'])!=40 or len(b['preservation'])!=40:raise base.Blocked('BASELINE_CARDINALITY')
    ids=set();pres=set()
    for r in b['records']:
        base.exact(r,['id','assetSha256','kind','values','pixelSha256','tensorSha256','thumbnailSha256','timings'])
        e=next((e for e in c['study']['entries'] if e['id']==r['id']),None)
        if not e or r['id'] in ids or r['assetSha256']!=e['asset']['sha256'] or r['kind']!='vector' or not isinstance(r['values'],list) or len(r['values'])!=1024 or not all(type(v) in [int,float] and math.isfinite(v) for v in r['values']) or not any(r['values']) or any(type(r[k]) is not str or not base.HASH.fullmatch(r[k]) for k in ['pixelSha256','tensorSha256','thumbnailSha256']):raise base.Blocked('BASELINE_RECORD')
        base.exact(r['timings'],['readMs','decodeMs','preprocessMs','inferenceMs'])
        if not all(finite(v) for v in r['timings'].values()):raise base.Blocked('BASELINE_TIMING')
        ids.add(r['id'])
    for row in b['preservation']:
        base.exact(row,['id','before','after']);e=next((e for e in c['study']['entries'] if e['id']==row['id']),None)
        if not e or row['id'] in pres or row['before']!=e['asset']['sha256'] or row['after']!=row['before']:raise base.Blocked('BASELINE_PRESERVATION')
        pres.add(row['id'])

def prepare(args):
    c,ch,craw=crop.read_json(args.comparison);crop.validate_comparison(c)
    a,ah,araw=crop.read_json(args.annotations);crop.validate_annotations(c,a,ch)
    b,bh,_=crop.read_json(args.baseline);validate_baseline(c,b,bh)
    old_root=Path(args.baseline).parent
    old_study,old_study_hash,_=crop.read_json(old_root/'study.json')
    old_setup,old_setup_hash,_=crop.read_json(old_root/'setup.json')
    if old_study_hash!=c['baseline']['studySha256'] or old_study!=c['study'] or old_setup_hash!=c['baseline']['setupSha256']:raise base.Blocked('BASELINE_STUDY_SETUP_DRIFT')
    base.exact(old_setup,['schemaVersion','modelSha256','recipeSha256','softwareSha256','rightsReviewed','preprocessingReviewed','networkReviewed','reviewer','evidence'])
    if old_setup['modelSha256']!=base.MODEL_SHA or old_setup['recipeSha256']!=base.RECIPE_SHA or old_setup['softwareSha256']!=c['baseline']['softwareSha256'] or old_setup['rightsReviewed'] is not True or old_setup['preprocessingReviewed'] is not True or c['study']['kind']=='private-same-instance' and old_setup['networkReviewed'] is not True:raise base.Blocked('BASELINE_SETUP_BOUNDARY')
    base.buffered(old_root/'software.json',base.LAB,c['baseline']['softwareSha256'],limit=4*1024*1024)
    manifest,mh,mraw=crop.read_json(args.source_manifest)
    actual=source_manifest();source=base.digest(base.packed(actual))
    if manifest!=actual or mraw!=base.packed(actual) or mh!=source or base.source_fingerprint()!=c['baseline']['sourceSha256']:raise base.Blocked('SOURCE_BINDING')
    setup,sh,sraw=crop.read_json(args.setup)
    base.exact(setup,['schemaVersion','kind','modelSha256','recipeSha256','softwareSha256','sourceSha256','comparisonSha256','annotationSha256','baselineBundleSha256','rightsReviewed','preprocessingReviewed','networkReviewed','reviewer','evidence'])
    if type(setup['schemaVersion']) is not int or setup['schemaVersion']!=1 or setup['kind']!='FRAMING_SETUP' or setup['modelSha256']!=base.MODEL_SHA or setup['recipeSha256']!=crop.RECIPE_SHA or setup['softwareSha256']!=c['baseline']['softwareSha256'] or setup['sourceSha256']!=source or setup['comparisonSha256']!=ch or setup['annotationSha256']!=ah or setup['baselineBundleSha256']!=bh or setup['rightsReviewed'] is not True or setup['preprocessingReviewed'] is not True or type(setup['networkReviewed']) is not bool or not isinstance(setup['reviewer'],str) or not 1<=len(setup['reviewer'])<=120 or not isinstance(setup['evidence'],list) or not 1<=len(setup['evidence'])<=20 or not all(type(e) is str and e for e in setup['evidence']):raise base.Blocked('CROP_SETUP_BOUNDARY')
    if not re.fullmatch(r'framing-[a-zA-Z0-9_-]{1,48}',args.run_id):raise base.Blocked('NEW_FRAMING_RUN_ID_REQUIRED')
    approval,_,_=crop.read_json(args.approval)
    expected=dict(status='GENERATED_FRAMING_FIXTURE_ONLY' if c['study']['kind']=='generated-fixture' else 'APPROVED_FOR_FRAMING_COMPARISON_RUN',authorThreadId='generated-test' if c['study']['kind']=='generated-fixture' else '01a098ef-d830-7531-bca7-2d66b0a5b587',runId=args.run_id,comparisonSha256=ch,annotationSha256=ah,baselineBundleSha256=bh,baselineSourceSha256=c['baseline']['sourceSha256'],sourceSha256=source,setupSha256=sh,softwareSha256=setup['softwareSha256'],modelSha256=base.MODEL_SHA,recipeSha256=crop.RECIPE_SHA,root=str(Path(args.root)),out=str(Path(args.out)))
    base.exact(approval,list(expected))
    if approval!=expected or c['study']['kind']=='private-same-instance' and not setup['networkReviewed']:raise base.Blocked('NEW_E04_BINDING_REQUIRED')
    ceiling=base.LAB/'runs' if c['study']['kind']=='generated-fixture' else base.LAB/'private-data'
    root=base.checked_path(args.root,ceiling,directory=True);out=base.checked_path(args.out,crop.RUNS,missing=True)
    # Connected preflight precedes the offline stage that creates this parent.
    # Permit exactly one future directory level; production still requires it.
    if getattr(args,'preflight',False) is True and not out.parent.exists():
        base.checked_path(out.parent,crop.RUNS,missing=True)
        base.checked_path(out.parent.parent,crop.RUNS,directory=True)
    else:base.checked_path(out.parent,crop.RUNS,directory=True)
    software=base.buffered(args.software,base.RUNS,setup['softwareSha256'],limit=4*1024*1024)
    # Reuse unchanged installed-file inventory; imports come from its pinned path.
    sys.path.insert(0,str(crop.BASE_DIR))
    from inventory import inventory
    if software!=base.packed(inventory()):raise base.Blocked('INSTALLED_FILE_DRIFT')
    expected_versions={line.split()[0].split('==')[0] for line in (crop.BASE_DIR/'requirements.lock').read_text().splitlines()}
    installed={d.metadata['Name'].lower().replace('_','-') for d in importlib.metadata.distributions()}
    if installed-{n.lower().replace('_','-') for n in expected_versions}-{'pip','setuptools'}:raise base.Blocked('UNREVIEWED_PACKAGE')
    model=base.buffered(args.model,base.RUNS,base.MODEL_SHA,limit=8*1024*1024)
    if len(model)!=4117670:raise base.Blocked('MODEL_SIZE')
    identities=set()
    for e in c['study']['entries']:
        path=base.checked_path(root/e['asset']['path'],root);s=path.stat();identity=(s.st_dev,s.st_ino)
        if identity in identities:raise base.Blocked('PHYSICAL_ALIAS')
        identities.add(identity);base.buffered(path,root,e['asset']['sha256'])
    return dict(comparison=c,comparisonSha256=ch,annotations=a,annotationSha256=ah,sourceSha256=source,setupSha256=sh,softwareSha256=setup['softwareSha256'],root=root,out=out,model=model,comparisonBytes=craw,annotationBytes=araw,setupBytes=sraw,softwareBytes=software)

def produce(args,p):
    c=p['comparison'];out=p['out'];root=p['root']
    base.checked_path(out,crop.RUNS,missing=True);out.mkdir();base.checked_path(out,crop.RUNS,directory=True)
    entries=sorted(c['study']['entries'],key=lambda e:(0 if e['role']=='reference' else 1,e['id']))
    records,load_ms,encoding_ms,attempt_ms,failure=crop.encode_entries(entries,p['annotations'],root,out,p['model'])
    preservation=[]
    for e in entries:
        try:after=base.digest(base.buffered(root/e['asset']['path'],root))
        except (base.Blocked,OSError):after='0'*64
        preservation.append(dict(id=e['id'],before=e['asset']['sha256'],after=after))
    if base.digest(base.packed(source_manifest()))!=p['sourceSha256']:raise base.Blocked('SOURCE_CHANGED')
    bundle=dict(schemaVersion=1,kind='FRAMING_CROP_BUNDLE',runId=args.run_id,mode='GENERATED_FIXTURE' if c['study']['kind']=='generated-fixture' else 'PRIVATE_INFERENCE',studySha256=c['baseline']['studySha256'],modelSha256=base.MODEL_SHA,recipeSha256=crop.RECIPE_SHA,sourceSha256=p['sourceSha256'],setupSha256=p['setupSha256'],softwareSha256=p['softwareSha256'],comparisonSha256=p['comparisonSha256'],annotationSha256=p['annotationSha256'],baselineBundleSha256=c['baseline']['bundleSha256'],baselineSourceSha256=c['baseline']['sourceSha256'],loadMs=load_ms,encodingMs=encoding_ms,attemptMs=attempt_ms,runFailure=failure,environment=dict(python=sys.version.split()[0],os=sys.platform,cpu=__import__('platform').processor(),threads=1,memory='not-measured'),preservation=preservation,records=records)
    with (out/'bundle.json').open('xb') as f:f.write(base.packed(bundle))
    for name,data in [('comparison.json',p['comparisonBytes']),('annotations.json',p['annotationBytes']),('setup.json',p['setupBytes']),('software.json',p['softwareBytes'])]:
        with (out/name).open('xb') as f:f.write(data)
    complete=failure is None and all(r['kind']=='vector' for r in records) and all(x['before']==x['after'] for x in preservation)
    print(json.dumps(dict(total=40,vectors=sum(r['kind']=='vector' for r in records),complete=complete,denominator=20,runFailure=failure)),flush=True)
    return 0 if complete else 2

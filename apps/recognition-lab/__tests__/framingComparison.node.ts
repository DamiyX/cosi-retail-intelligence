import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateAnnotations, validateComparison, effectiveBox, cropRecipeSha256, validateCropBundle } from '../src/framingComparisonSchema.ts';
import { pairedEvaluation } from '../src/framingComparisonEvaluation.ts';
import { renderFramingReport, csvCell } from '../src/framingComparisonReport.ts';
import { annotationPage } from '../src/framingComparisonAnnotation.ts';
import { framingSourceFingerprint, framingSourceManifest } from '../src/framingComparisonSource.ts';
import { sha256 } from '../src/provenance.ts';
import { MODEL_SHA, recipeSha256, sourceFingerprint } from '../src/exploratoryStudy.ts';
import { retrievalLab } from '../src/retrievalPaths.ts';

const require = createRequire(import.meta.url);
const core = require(resolve(retrievalLab,'tools/framing-comparison/annotation-core.cjs'));
const runRoot = resolve(retrievalLab,'runs/framing-comparison');mkdirSync(runRoot,{recursive:true});
const fixtureRoot=resolve(runRoot,'fc-generated-'+randomUUID());
const py=resolve(retrievalLab,'runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe');
const generated=spawnSync(py,['-B',resolve(retrievalLab,'tools/framing-comparison/generate_fixtures.py'),'--out',fixtureRoot],{encoding:'utf8',timeout:30000});
assert.equal(generated.status,0,generated.stdout+generated.stderr);
const frames=JSON.parse(readFileSync(resolve(fixtureRoot,'index.json'),'utf8')) as {id:string;path:string;sha256:string;width:number;height:number;orientation:number;pixelSha256:string;tensorSha256:string;thumbnailSha256:string}[];
const hash=(v:unknown)=>sha256(JSON.stringify(v)),clone=<T>(v:T):T=>structuredClone(v);
const vector=(p:number):number[]=>Array.from({length:1024},(_,i)=>i===p?1:0);
function fixture() {
  const products=Array.from({length:10},(_,i)=>({id:'p'+i.toString().padStart(2,'0'),label:i===0?'CWAY750':i===1?'CWAY600':'Product '+i,physicalFamily:'family'+i}));
  const entries=frames.map((f,i)=>({id:f.id,productId:products[Math.floor(i/4)].id,physicalFamily:products[Math.floor(i/4)].physicalFamily,
    exposure:'exposure'+i,role:i%4<2?'reference' as const:'query' as const,asset:{path:f.path,sha256:f.sha256}}));
  const study={schemaVersion:1 as const,studyId:'same-instance-exploration-v1' as const,kind:'generated-fixture' as const,formalAdmission:false as const,modelSha256:MODEL_SHA,recipeSha256,products,entries};
  const softwareBytes=Buffer.from('{}'),softwareSha256=sha256(softwareBytes);
  const oldSetup={schemaVersion:1,modelSha256:MODEL_SHA,recipeSha256,softwareSha256,rightsReviewed:true,preprocessingReviewed:true,networkReviewed:false,reviewer:'generated',evidence:['generated']};
  const environment={python:'generated',os:'generated',cpu:'mock',threads:1 as const,memory:'not-measured' as const};
  const records=frames.map((f,i)=>({id:f.id,assetSha256:f.sha256,kind:'vector' as const,values:vector(i===2?1:Math.floor(i/4)),pixelSha256:f.pixelSha256,tensorSha256:f.tensorSha256,thumbnailSha256:f.thumbnailSha256,
    timings:{readMs:1,decodeMs:2,preprocessMs:3,inferenceMs:4}}));
  const full={schemaVersion:1 as const,runId:'baseline-fixture',mode:'GENERATED_FIXTURE' as const,studySha256:hash(study),modelSha256:MODEL_SHA,recipeSha256,
    sourceSha256:sourceFingerprint(),setupSha256:hash(oldSetup),softwareSha256,loadMs:1,encodingMs:2,attemptMs:4,runFailure:null,environment,
    preservation:frames.map(f=>({id:f.id,before:f.sha256,after:f.sha256})),records};
  const comparison=validateComparison({schemaVersion:1,comparisonId:'framing-fixture',formalAdmission:false,primary:'FF->CC',study,
    baseline:{studySha256:full.studySha256,bundleSha256:hash(full),setupSha256:full.setupSha256,sourceSha256:full.sourceSha256,softwareSha256,runId:full.runId},cropRecipeSha256,
    frames:frames.map(({id,sha256,width,height,orientation})=>({id,assetSha256:sha256,width,height,orientation}))});
  const annotations={schemaVersion:1 as const,comparisonSha256:hash(comparison),recipeSha256:cropRecipeSha256,entries:comparison.frames.map(f=>({...f,confirmedIdentity:true,issue:'none' as const,
    markedBox:{left:0,top:0,right:f.width,bottom:f.height},effectiveBox:{left:0,top:0,right:f.width,bottom:f.height}}))};
  const newSetup={schemaVersion:1,kind:'FRAMING_SETUP',modelSha256:MODEL_SHA,recipeSha256:cropRecipeSha256,softwareSha256,sourceSha256:framingSourceFingerprint(),comparisonSha256:hash(comparison),annotationSha256:hash(annotations),baselineBundleSha256:hash(full),rightsReviewed:true,preprocessingReviewed:true,networkReviewed:false,reviewer:'generated',evidence:['generated']};
  const crop={...clone(full),kind:'FRAMING_CROP_BUNDLE' as const,runId:'framing-fixture',recipeSha256:cropRecipeSha256,sourceSha256:newSetup.sourceSha256,setupSha256:hash(newSetup),comparisonSha256:hash(comparison),annotationSha256:hash(annotations),baselineBundleSha256:hash(full),baselineSourceSha256:full.sourceSha256,
    records:records.map((r,i)=>({...r,values:vector(i===6?2:Math.floor(i/4)),contextThumbnailSha256:r.thumbnailSha256}))};
  const expected={comparisonSha256:hash(comparison),annotationSha256:hash(annotations),sourceSha256:crop.sourceSha256,setupSha256:crop.setupSha256,softwareSha256,runId:crop.runId};
  return {comparison,annotations,full,crop,expected,oldSetup,newSetup,softwareBytes};
}
function evaluate(f:ReturnType<typeof fixture>) {return pairedEvaluation(f.comparison,f.full,hash(f.full),f.crop,f.expected);}
test('generated input provenance:40 unique files; all8 orientations; baseline fingerprint unchanged',()=>{
  assert.equal(frames.length,40);assert.equal(new Set(frames.map(f=>f.sha256)).size,40);assert.equal(new Set(frames.map(f=>f.orientation)).size,8);
  assert.equal(sourceFingerprint(),'e8a18df3c3961a9a8b98cd9db8f4612368a4e2174cda9d25cc1fe22ac15d33c2');
});
test('strict spec IDs/hashes/cardinality/dimensions/native types reject',()=>{
  const f=fixture();for(const mutate of [(c:any)=>c.frames.pop(),(c:any)=>c.frames[0].id=c.frames[1].id,(c:any)=>c.frames[0].assetSha256='0'.repeat(64),
    (c:any)=>c.frames[0].width=true,(c:any)=>c.frames[0].height=0,(c:any)=>c.frames[0].width=50000000,(c:any)=>c.extra='x',
    (c:any)=>c.study.entries[0].role='query',(c:any)=>c.study.products[0].id=c.study.products[1].id]){const c=clone(f.comparison);mutate(c);assert.throws(()=>validateComparison(c));}
});
test('fixed5% ceil padding:small boxes,clamping,full frame; browser/Node same exact fields',()=>{
  for(const b of [{left:10,top:20,right:31,bottom:62},{left:0,top:0,right:1,bottom:1},{left:0,top:0,right:200,bottom:100}]){
    assert.deepEqual(effectiveBox(b,200,100),core.effectiveBox(b,200,100));}
  assert.deepEqual(effectiveBox({left:10,top:20,right:31,bottom:62},200,100),{left:8,top:17,right:33,bottom:65});
});
test('bad boxes:strings,bool,float,null,zeroarea,bounds,overflow and extra keys reject',()=>{
  const box={left:0,top:0,right:10,bottom:20};
  for(const b of [null,{...box,left:'0'},{...box,left:false},{...box,right:1.5},{...box,right:0},{...box,top:20},{...box,right:201},{...box,top:-1},{...box,right:1e20},{...box,path:'x'}]){
    assert.throws(()=>effectiveBox(b as any,200,100));assert.throws(()=>core.effectiveBox(b,200,100));}
});
test('CSS scale full-resolution coordinates and clamp known markers',()=>{
  for(const scale of [.25,.5,1,2]){const rect={left:13,top:17,width:400*scale,height:600*scale};
    assert.deepEqual(core.imagePoint(13+100*scale,17+200*scale,rect,400,600),{x:100,y:200});
    assert.deepEqual(core.imagePoint(-500,5000,rect,400,600),{x:0,y:600});}
});
test('progress roundtrip and partial state;complete rejects ambiguity',()=>{
  const f=fixture(),a=clone(f.annotations);a.entries[0].confirmedIdentity=false;
  assert.equal(validateAnnotations(f.comparison,a,hash(f.comparison),false).entries.length,40);assert.throws(()=>validateAnnotations(f.comparison,a,hash(f.comparison)));
  for(const issue of ['identity','bounds','not-reviewed']){const p=clone(f.annotations);(p.entries[0] as any).issue=issue;assert.throws(()=>validateAnnotations(f.comparison,p,hash(f.comparison)));}
  assert.equal(core.validateProgress(core.strictJson(JSON.stringify(a)),f.comparison,hash(f.comparison),cropRecipeSha256).entries.length,40);
});
test('progress forged keys,dimensions,orientation,hash,padding and duplicate IDs reject',()=>{
  const f=fixture();for(const mutate of [(a:any)=>a.entries.pop(),(a:any)=>a.entries[0].id=a.entries[1].id,(a:any)=>a.entries[0].width++,
    (a:any)=>a.entries[0].orientation=true,(a:any)=>a.entries[0].assetSha256='0'.repeat(64),(a:any)=>a.comparisonSha256='0'.repeat(64),
    (a:any)=>a.entries[0].effectiveBox.right--,(a:any)=>a.imageBase64='unsafe']){const a=clone(f.annotations);mutate(a);
    assert.throws(()=>validateAnnotations(f.comparison,a,hash(f.comparison),false));assert.throws(()=>core.validateProgress(a,f.comparison,hash(f.comparison),cropRecipeSha256));}
});
test('strict progress JSON rejects duplicate keys/nonfinite/malformed',()=>{
  for(const text of ['{"x":1,"x":2}','{"x":{"y":1,"y":2}}','[NaN]','[1e999]','[01]','[1,]','{"x":1,}','{}x','{"x":"bad\n"}'])assert.throws(()=>core.strictJson(text));
  assert.equal(core.strictJson('{"__proto__":{"x":1},"a":[true,null,-2.3e2]}').a[2],-230);
});
test('page embeds no images or scores;CSP hashed scripts,escaped labels,offline only',()=>{
  const f=fixture();f.comparison.study.products[0].label='</script><script>alert(1)</script>';
  const html=annotationPage(f.comparison,hash(f.comparison));assert.ok(html.includes('\\u003c/script>'));assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(html.includes("connect-src 'none'"));assert.ok(html.includes("script-src 'sha256-"));assert.ok(!html.includes('data:image'));assert.ok(!html.includes('http://') || html.includes('http://www.w3.org/2000/svg'));
  assert.ok(!html.includes('values":['));assert.ok(!html.includes('topIdentity'));assert.ok(html.includes('type="number"'));assert.ok(html.includes('aria-live="polite"'));
});
test('paired primary fixed;one gained first choice and one lost;all20 denominators',()=>{
  const r=evaluate(fixture());assert.equal(r.primary,'FF->CC');assert.deepEqual(r.conditions.map(c=>c.condition),['FF','CC','FC','CF']);
  assert.deepEqual(r.conditions.map(c=>[c.denominator,c.scored]),[[20,20],[20,20],[20,20],[20,20]]);
  assert.equal(r.conditions[0].first,19);assert.equal(r.conditions[1].first,19);assert.equal(r.primarySummary.firstChoiceWins,1);assert.equal(r.primarySummary.firstChoiceLosses,1);
  assert.equal(r.primarySummary.rankImproved,1);assert.equal(r.primarySummary.rankRegressed,1);assert.equal(r.primarySummary.rankUnchanged,18);
});
test('distinct10 identities;max overtwo references;nearestreference;deterministic exact ties',()=>{
  const f=fixture();f.full.records[0].values=vector(2);f.comparison.baseline.bundleSha256=hash(f.full);f.crop.baselineBundleSha256=hash(f.full);
  f.full.records[2].values=vector(0);f.comparison.baseline.bundleSha256=hash(f.full);f.crop.baselineBundleSha256=hash(f.full);
  const r=evaluate(f);assert.equal(r.conditions[0].rows[0].candidates.length,10);assert.equal(r.conditions[0].rows[0].candidates[0].productId,'p00');
  assert.equal(r.conditions[0].rows[0].candidates[0].nearestReferenceId,'img-01');assert.equal(r.conditions[0].rows[0].candidates[0].score,1);
  const t=fixture();t.crop.records[2].values=vector(0).map((v,i)=>v+(i===1?1:0));const row=evaluate(t).conditions[1].rows[0];
  assert.deepEqual(row.topTie,['p00','p01']);assert.equal(row.candidates[0].productId,'p00');assert.equal(row.margin,0);
});
test('wrong size identity remains wrong,no package/label collapse',()=>{
  const r=evaluate(fixture()).conditions[0].rows[0];assert.equal(r.truth,'p00');assert.equal(r.candidates[0].productId,'p01');assert.equal(r.first,false);
});
test('query failure retained in CC/FC denominators;CF unchanged',()=>{
  const f=fixture();(f.crop.records as any[])[2]={id:'img-02',assetSha256:frames[2].sha256,kind:'failure',code:'DECODE_ERROR'};
  const r=evaluate(f);assert.deepEqual(r.conditions.map(c=>c.scored),[20,19,19,20]);assert.equal(r.conditions[1].rows[0].correctRank,null);
  assert.deepEqual(r.conditions[1].rows[0].failures,['DECODE_ERROR']);assert.equal(r.complete,false);assert.equal(r.primarySummary.unscoredPairs,1);
});
test('reference failure makes CC/CF entire gallery incomplete,never drops hard ref',()=>{
  const f=fixture();(f.crop.records as any[])[0]={id:'img-00',assetSha256:frames[0].sha256,kind:'failure',code:'RUNTIME_ERROR'};
  const r=evaluate(f);assert.deepEqual(r.conditions.map(c=>c.scored),[20,0,20,0]);assert.equal(r.conditions[1].rows.length,20);
  assert.ok(r.conditions[1].rows.every(r=>r.failures.includes('INCOMPLETE_GALLERY')));assert.equal(r.conditions[1].failedReferences[0].id,'img-00');
});
test('both query and gallery reasons retained;perproduct unscored2',()=>{
  const f=fixture();for(const i of [0,2])(f.crop.records as any[])[i]={id:frames[i].id,assetSha256:frames[i].sha256,kind:'failure',code:'DECODE_ERROR'};
  const r=evaluate(f);assert.deepEqual(r.conditions[1].rows[0].failures,['DECODE_ERROR','INCOMPLETE_GALLERY']);assert.ok(r.conditions[1].perProduct.every(p=>p.unscored===2));
});
test('crop recipe separate;crossrecipes explicit;diagnostics encodezero;no calibrated status',()=>{
  const r=evaluate(fixture());assert.notEqual(cropRecipeSha256,recipeSha256);
  assert.deepEqual(r.conditions.map(c=>[c.referenceRecipeSha256,c.queryRecipeSha256]),[[recipeSha256,recipeSha256],[cropRecipeSha256,cropRecipeSha256],[recipeSha256,cropRecipeSha256],[cropRecipeSha256,recipeSha256]]);
  assert.equal(r.resources.diagnosticNewEncodings,0);assert.equal(r.resources.newEncodingsBudget,40);assert.ok(!JSON.stringify(r.conditions).includes('"status"'));
});
test('stale hashes/recipe/source/software/run/record/preservation/vector reject',()=>{
  const f=fixture();for(const mutate of [(b:any)=>b.recipeSha256=recipeSha256,(b:any)=>b.annotationSha256='0'.repeat(64),(b:any)=>b.baselineBundleSha256='0'.repeat(64),
    (b:any)=>b.sourceSha256='0'.repeat(64),(b:any)=>b.softwareSha256='0'.repeat(64),(b:any)=>b.runId='old',(b:any)=>b.records[0].assetSha256='0'.repeat(64),
    (b:any)=>b.records[0].id=b.records[1].id,(b:any)=>b.records[0].values=vector(0).fill(0),(b:any)=>b.records[0].values[0]=Infinity,(b:any)=>b.preservation[0].after='0'.repeat(64),
    (b:any)=>b.attemptMs=1,(b:any)=>b.records.pop(),(b:any)=>b.records[0].values[0]=true]){const b=clone(f.crop);mutate(b);assert.throws(()=>validateCropBundle(f.comparison,b,f.expected));}
});
test('transitive fingerprint coversimported ranking/schemas/paths/Python/UI/guardand ownCLI',()=>{
  const names=framingSourceManifest().map(x=>x[0]);for(const name of ['src/ranking.ts','src/schema.ts','src/exploratoryStudy.ts','src/retrievalPaths.ts','src/framingComparisonCli.ts',
    'tools/exploratory/producer.py','tools/exploratory/inventory.py','tools/framing-comparison/crop_producer.py','tools/framing-comparison/crop_runtime.py',
    'tools/framing-comparison/annotation-core.cjs','tools/framing-comparison/annotation-ui.js','tools/framing-comparison/Framing-Preparation.ps1','frozen-guard/Native.cs'])assert.ok(names.includes(name),name);
});
test('CSV formula and HTML labels escaped',()=>{
  for(const v of ['=1+1',' +cmd','-1','@x','\t=cmd'])assert.ok(csvCell(v).startsWith('"\''));assert.equal(csvCell('a"b'),'"a""b"');
  const f=fixture();f.comparison.study.products[0].label='<img src=x onerror=alert(1)>';const out=resolve(fixtureRoot,'report-'+randomUUID());
  const cropRoot=resolve(fixtureRoot,'crop-'+randomUUID());mkdirSync(cropRoot);
  for(const frame of frames){copyFileSync(resolve(fixtureRoot,'full','thumb-'+frame.id+'.png'),resolve(cropRoot,'thumb-'+frame.id+'.png'));copyFileSync(resolve(fixtureRoot,'full','thumb-'+frame.id+'.png'),resolve(cropRoot,'context-'+frame.id+'.png'));}
  renderFramingReport(f.comparison,f.annotations,f.full,f.crop,evaluate(f),resolve(fixtureRoot,'full'),cropRoot,out,[]);
  const html=readFileSync(resolve(out,'report.html'),'utf8');assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!html.includes('<img src=x'));
  assert.equal(readFileSync(resolve(out,'queries.csv'),'utf8').trim().split('\r\n').length,81);assert.equal(readFileSync(resolve(out,'pairs.csv'),'utf8').trim().split('\r\n').length,21);
  const before=sha256(readFileSync(resolve(out,'report.html')));assert.throws(()=>renderFramingReport(f.comparison,f.annotations,f.full,f.crop,evaluate(f),resolve(fixtureRoot,'full'),cropRoot,out,[]));assert.equal(sha256(readFileSync(resolve(out,'report.html'))),before);
});
function writeFixture(f:ReturnType<typeof fixture>) {
  const root=resolve(fixtureRoot,'cli-'+randomUUID());mkdirSync(root);const fullRoot=resolve(root,'full'),cropRoot=resolve(root,'crop');mkdirSync(fullRoot);mkdirSync(cropRoot);
  for(const frame of frames){copyFileSync(resolve(fixtureRoot,'full','thumb-'+frame.id+'.png'),resolve(fullRoot,'thumb-'+frame.id+'.png'));copyFileSync(resolve(fixtureRoot,'full','thumb-'+frame.id+'.png'),resolve(cropRoot,'thumb-'+frame.id+'.png'));copyFileSync(resolve(fixtureRoot,'full','thumb-'+frame.id+'.png'),resolve(cropRoot,'context-'+frame.id+'.png'));}
  for(const [name,value] of [['comparison',f.comparison],['annotations',f.annotations],['setup',f.newSetup],['source-manifest',framingSourceManifest()]] as const)writeFileSync(resolve(root,name+'.json'),JSON.stringify(value));
  writeFileSync(resolve(fullRoot,'bundle.json'),JSON.stringify(f.full));writeFileSync(resolve(fullRoot,'study.json'),JSON.stringify(f.comparison.study));writeFileSync(resolve(fullRoot,'setup.json'),JSON.stringify(f.oldSetup));writeFileSync(resolve(fullRoot,'software.json'),f.softwareBytes);writeFileSync(resolve(cropRoot,'bundle.json'),JSON.stringify(f.crop));
  return {root,fullRoot,cropRoot};
}
const cli=(args:string[])=>spawnSync(process.execPath,[resolve(retrievalLab,'src/framingComparisonCli.ts'),...args],{encoding:'utf8',timeout:30000});
function args(x:ReturnType<typeof writeFixture>,out:string) {return ['evaluate','--comparison',resolve(x.root,'comparison.json'),'--annotations',resolve(x.root,'annotations.json'),'--baseline',resolve(x.fullRoot,'bundle.json'),
  '--crop',resolve(x.cropRoot,'bundle.json'),'--setup',resolve(x.root,'setup.json'),'--source-manifest',resolve(x.root,'source-manifest.json'),'--original-root',fixtureRoot,'--full-root',x.fullRoot,'--crop-root',x.cropRoot,'--out',out,'--run-id','framing-fixture'];}
test('actualCLI complete0,incomplete2;nooverwrite1;retainsallrows and originals',()=>{
  const f=fixture(),x=writeFixture(f),out=resolve(x.root,'report');let result=cli(args(x,out));assert.equal(result.status,0,result.stdout+result.stderr);
  assert.equal(JSON.parse(readFileSync(resolve(out,'comparison.json'),'utf8')).conditions.length,4);result=cli(args(x,out));assert.equal(result.status,1);assert.ok(result.stderr.includes('OUTPUT_EXISTS'));
  const bad=fixture();(bad.crop.records as any[])[2]={id:'img-02',assetSha256:frames[2].sha256,kind:'failure',code:'DECODE_ERROR'};const y=writeFixture(bad);result=cli(args(y,resolve(y.root,'report')));assert.equal(result.status,2,result.stdout+result.stderr);
  for(const frame of frames)assert.equal(sha256(readFileSync(resolve(fixtureRoot,frame.path))),frame.sha256);
});
test('actualCLI strict malformed/stale/source/hash/substitution/no passthrough rejectsbeforeoutput',()=>{
  const f=fixture();for(const mutate of [(x:any)=>writeFileSync(resolve(x.root,'annotations.json'),'{"schemaVersion":1,"schemaVersion":1}'),
    (x:any)=>writeFileSync(resolve(x.root,'source-manifest.json'),'[]'),(x:any)=>writeFileSync(resolve(x.fullRoot,'bundle.json'),'{}'),
    (x:any)=>writeFileSync(resolve(x.fullRoot,'study.json'),'{}'),(x:any)=>writeFileSync(resolve(x.root,'annotations.json'),JSON.stringify({...f.annotations,recipeSha256:recipeSha256}))]){
    const x=writeFixture(f);mutate(x);const out=resolve(x.root,'report'),r=cli(args(x,out));assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(!existsSync(out));}
  const x=writeFixture(f);assert.equal(cli([...args(x,resolve(x.root,'report')),'--arbitrary','evil']).status,1);
});
test('actualCLI annotation generatedpage,nooverwrite and malformed approval cannotadmitprivate',()=>{
  const f=fixture(),x=writeFixture(f),out=resolve(x.root,'page');const command=['annotate','--comparison',resolve(x.root,'comparison.json'),'--baseline',resolve(x.fullRoot,'bundle.json'),'--full-root',x.fullRoot,'--out',out];
  const r=cli(command);assert.equal(r.status,0,r.stdout+r.stderr);assert.ok(existsSync(resolve(out,'annotate.html')));assert.equal(cli(command).status,1);
  const p=fixture();(p.comparison.study as any).kind='private-same-instance';p.oldSetup.networkReviewed=true;(p.full as any).mode='PRIVATE_INFERENCE';p.full.studySha256=hash(p.comparison.study);p.full.setupSha256=hash(p.oldSetup);
  p.comparison.baseline.studySha256=p.full.studySha256;p.comparison.baseline.setupSha256=p.full.setupSha256;p.comparison.baseline.bundleSha256=hash(p.full);
  const y=writeFixture(p),dest=resolve(y.root,'page');const denied=cli(['annotate','--comparison',resolve(y.root,'comparison.json'),'--baseline',resolve(y.fullRoot,'bundle.json'),'--full-root',y.fullRoot,'--out',dest]);assert.equal(denied.status,1);assert.ok(!existsSync(dest));
});
test('real generated junction outputs reject',()=>{
  const f=fixture(),x=writeFixture(f),target=resolve(x.root,'target'),link=resolve(x.root,'junction');mkdirSync(target);symlinkSync(target,link,'junction');
  assert.equal(cli(args(x,resolve(link,'report'))).status,1);assert.ok(!existsSync(resolve(target,'report')));
});
test('resource reports keep encoding/evaluation separate and allperproduct denominators2',()=>{
  const r=evaluate(fixture());assert.equal(r.resources.full.encodingMs,2);assert.equal(r.resources.crop.encodingMs,2);assert.ok(r.resources.evaluationMs>=0);
  assert.ok(r.conditions.every(c=>c.perProduct.length===10&&c.perProduct.every(p=>p.queries===2)));assert.equal(r.pairs.length,20);
});
if(process.env.FC_EVIDENCE_ROOT)writeFileSync(resolve(process.env.FC_EVIDENCE_ROOT,'node-fixtures-'+randomUUID()+'.json'),JSON.stringify({fixtureRoot,generated:true,noPrivatePixels:true,noRealModel:true})+'\n',{flag:'wx'});

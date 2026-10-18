import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const rows=[
 ['ref-a','a','single','reference','development',true,[1,0,0]],
 ['ref-b','b','single-b','reference','development',true,[0,1,0]],
 ['q-a','a','single','query','development',true,[1,0,0]],
 ['q-u','unknown','single-u','query','development',false,[-1,-1,0]],
 ['q-error','a','single','query','development',true,'ADAPTER_ERROR'],
 ['ref-a-view2','a','single','reference','development',true,[1,0,0]],
 ['ref-a-view3','a','single','reference','development',true,[1,0,0]],
 ['ref-a-pack','a','pack','reference','development',true,[0,0,1]],
 ['ref-c','c','single-c','reference','development',true,[0.6,0.8,0]],
 ['cal-a','a','single','query','calibration',true,[1,0,0]],
 ['cal-lookalike','unknown','single-u','query','calibration',false,[1,0,0]],
 ['cal-unknown','unknown','single-u','query','calibration',false,[-1,-1,0]],
 ['hold-a','a','single','query','holdout',true,[1,0,0]],
 ['hold-wrong-package','a','pack','query','holdout',true,[1,0,0]],
 ['hold-lookalike','unknown','single-u','query','holdout',false,[1,0,0]],
 ['hold-unknown','unknown','single-u','query','holdout',false,[-1,-1,0]],
 ['hold-b','b','single-b','query','holdout',true,[0,1,0]],
 ['hold-tie','b','single-b','query','holdout',true,[0.8944271909999159,0.4472135954999579,0]],
 ['hold-timeout','a','single','query','holdout',true,'TIMEOUT'],
 ['hold-package-tie','a','single','query','holdout',true,[1,0,1]],
];
mkdirSync(resolve(root,'assets'),{recursive:true});
const entries=rows.map(([id,productId,packageId,role,split,known,vector])=>{
 const text='Synthetic tooling-only asset '+id+'; no photo or recognition evidence.\n';
 writeFileSync(resolve(root,'assets',id+'.txt'),text);
 return {id,productId,packageId,role,split,known,captureSession:'session-'+id,packagingGeneration:'toy-generation',asset:{path:'assets/'+id+'.txt',sha256:createHash('sha256').update(text).digest('hex')},capture:{device:'synthetic-node',lighting:'synthetic',view:'synthetic',occlusion:'none'},rights:{permissionId:'authored-fixture',provenance:'authored-no-private-data'},observation:typeof vector==='string'?{kind:'failure',code:vector}:{kind:'vector',vector:{space:'synthetic-v1',values:vector}}};
});
writeFileSync(resolve(root,'dataset.json'),JSON.stringify({schemaVersion:1,datasetId:'r0-fixture',version:'v2',kind:'synthetic-tooling-only',storeScope:'synthetic-store',adapter:{id:'authored-vector-v1',preprocessingId:'identity-v1',space:'synthetic-v1',dimension:3},products:[{id:'a',packages:['single','pack']},{id:'b',packages:['single-b']},{id:'c',packages:['single-c']},{id:'unknown',packages:['single-u']}],entries},null,2)+'\n');

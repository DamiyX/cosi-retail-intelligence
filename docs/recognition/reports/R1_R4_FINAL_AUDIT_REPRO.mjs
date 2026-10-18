import {readFileSync,writeFileSync,mkdirSync,linkSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {importDataset} from '../../../apps/recognition-lab/src/importer.ts';
import {createRetrieval} from '../../../apps/recognition-lab/src/retrieval.ts';
import {calibrateRetrieval,evaluateRetrieval,retrievalHoldoutConfig} from '../../../apps/recognition-lab/src/retrievalEvaluation.ts';
import {gallerySource} from '../../../apps/recognition-lab/src/retrievalGallery.ts';
const f='apps/recognition-lab/fixtures/';const read=p=>JSON.parse(readFileSync(p,'utf8'));
const out=mkdtempSync(resolve('apps/recognition-lab/runs/final-audit-'));
const {dataset,manifestHash}=importDataset(resolve(f+'dataset.json'),resolve(f));
const input={dataset,manifestHash,candidate:read(f+'r2/toy-a.json'),bundle:read(f+'r2/toy-a-calibration.json'),split:'calibration',selection:read(f+'r4/selection.json'),currentStore:'synthetic-store'};
const cal=calibrateRetrieval(input,read(f+'configs.json'),0);
const changed={...input,bundle:read(f+'r2/toy-a-holdout.json'),split:'holdout',selection:{...input.selection,revision:'changed',products:input.selection.products.slice(1)},frozen:cal.frozen.r2Frozen};
let strict;try{retrievalHoldoutConfig(cal.frozen,gallerySource(changed));strict='accepted'}catch(e){strict=e.code}
const ev=await evaluateRetrieval(changed,cal.sweeps[0].config);
const dev={...input,bundle:read(f+'r2/toy-a-development.json'),split:'development'};
const a=createRetrieval(dev,cal.sweeps[0].config,'same-session');const old=a.context();a.close();
const b=createRetrieval({...dev,selection:changed.selection},cal.sweeps[0].config,'same-session');const sameContext=JSON.stringify(old)===JSON.stringify(b.context());const stale=await b.query('q-a',old);b.close();
const result={holdout:{strict,publicEvaluator:ev.status,evaluated:ev.queryAccounting.evaluated},stale:{contextsIdentical:sameContext,outcome:stale.status},writes:[]};
for(const stage of ['r2','r3']){
 const dir=resolve(out,stage);mkdirSync(dir);const sentinel=resolve(out,stage+'-sentinel.txt');writeFileSync(sentinel,'DO NOT OVERWRITE');linkSync(sentinel,resolve(dir,stage==='r2'?'calibration.json':'device-benchmark.json'));
 const common=['--manifest',f+'dataset.json','--dataset-root',f];
 const args=stage==='r2'?['apps/recognition-lab/src/comparisonCli.ts','calibrate',...common,'--split','calibration','--candidate',f+'r2/toy-a.json','--bundle',f+'r2/toy-a-calibration.json','--configs',f+'configs.json','--choose','0','--out',dir]:['apps/recognition-lab/src/deviceBenchmarkCli.ts','analyze',...common,'--candidate',f+'r2/toy-a.json','--target',f+'r3/target.json','--record',f+'r3/paired-benchmark.json','--reference-bundle',f+'r2/toy-a-development.json','--pairs',f+'r3/paired-equivalence.json','--out',dir];
 const run=spawnSync(process.execPath,args,{encoding:'utf8'});result.writes.push({stage,exit:run.status,sentinelOverwritten:readFileSync(sentinel,'utf8')!=='DO NOT OVERWRITE'});
}
writeFileSync(resolve(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({out,...result}));

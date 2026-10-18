import { evaluatePortability, portabilityParity } from '../src/phonePortabilityEvaluation.ts';
import { parsePortabilityJson, type PortabilityInput } from '../src/phonePortabilitySchema.ts';
function fixture(): PortabilityInput {
  const vector = (p: number) => Array.from({ length: 1024 }, (_, i) => i === p ? 1 : 0), hash='a'.repeat(64);
  const frames=Array.from({length:10},(_,p)=>['reference','query'].flatMap(role=>[1,2].map(n=>({id:`p${p}-${role}-${n}`,role:role as 'reference'|'query',productId:`p${p}`,tensorSha256:hash})))).flat();
  return {schemaVersion:1,kind:'PRIVATE_PORTABILITY_NUMERICAL_COMPARISON',manifestSha256:hash,replaySourceSha256:hash,packetSha256:hash,resultSha256:hash,
    modelSha256:'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40',frames,
    baseline:frames.map(f=>({id:f.id,values:vector(Number(f.productId.slice(1)))})),
    observations:(['control','phone'] as const).flatMap(lane=>frames.map(f=>({id:f.id,lane,kind:'vector' as const,values:vector(Number(f.productId.slice(1))),tensorSha256:hash}))),
    tensorComparisons:frames.map(f=>({id:f.id,unequalComponents:0,maxAbsoluteDifference:0,meanAbsoluteDifference:0}))};
}
test('all 80 records, 20 query ranks and 10 candidates remain separate and agree with the original arithmetic',()=>{
  const p=fixture(),r=evaluatePortability(p);expect(r.runtimeParityPassed).toBe(true);expect(r.control.first).toBe(20);expect(r.phone.first).toBe(20);
  expect(r.control.queries).toHaveLength(20);expect(r.control.queries.every(q=>q.candidates.length===10)).toBe(true);expect(r.baselineToControl.every(p=>p.candidateOrderEqual)).toBe(true);
  const changed=p.observations.find(o=>o.lane==='phone'&&o.id==='p0-query-1')!;if(changed.kind==='vector')changed.values=p.baseline.find(b=>b.id==='p1-query-1')!.values;
  const after=evaluatePortability(p);expect(after.control.first).toBe(20);expect(after.phone.first).toBe(19);expect(after.controlToPhone.filter(p=>p.outcome==='REGRESSED')).toHaveLength(1);
});
test('failed reference invalidates the whole affected gallery and failed query stays in the denominator',()=>{
  const p=fixture();p.observations[0]={id:p.frames[0].id,lane:'control',kind:'failure',code:'CANCELLED'};p.tensorComparisons=p.tensorComparisons.filter(t=>t.id!==p.frames[0].id);
  const r=evaluatePortability(p);expect(r.control.denominator).toBe(20);expect(r.control.first).toBe(0);expect(r.control.queries.every(q=>q.failure==='INCOMPLETE_GALLERY')).toBe(true);expect(r.phone.first).toBe(20);expect(r.runtimeParityPassed).toBe(false);
  const q=fixture();const i=q.observations.findIndex(o=>o.lane==='phone'&&o.id==='p0-query-1');q.observations[i]={id:'p0-query-1',lane:'phone',kind:'failure',code:'TIMEOUT'};q.tensorComparisons=q.tensorComparisons.filter(t=>t.id!=='p0-query-1');
  expect(evaluatePortability(q).phone.first).toBe(19);expect(evaluatePortability(q).phone.queries).toHaveLength(20);
});
test('exact ties use ASCII order; near ties use actual scores and are reported without relabeling as exact ties',()=>{
  const p=fixture();for(const o of p.observations)if(o.kind==='vector')o.values=p.baseline[0].values.slice();
  let r=evaluatePortability(p);expect(r.control.queries[0].exactTopTie).toHaveLength(10);expect(r.control.queries[0].candidates.map(c=>c.productId)).toEqual(['p0','p1','p2','p3','p4','p5','p6','p7','p8','p9']);
  for(const o of p.observations)if(o.kind==='vector'&&o.id.startsWith('p0-reference'))o.values[1]=1e-7;
  r=evaluatePortability(p);expect(r.control.queries[0].candidates[0].productId).toBe('p1');expect(r.control.queries[0].nearTopTie).toHaveLength(10);expect(r.control.queries[0].exactTopTie).toHaveLength(9);
});
test('raw scale differences are retained even when normalized runtime parity passes',()=>{
  const base=fixture().baseline[0].values;const p=portabilityParity(base,base.map(v=>v*2));expect(p.passesFrozenTolerance).toBe(true);expect(p.rawMaxAbsoluteDifference).toBe(1);
});
test('rejects stale structure, missing/reordered records, nonfinite/zero vectors, recipe tensor mismatch and duplicate JSON keys',()=>{
  for(const mutate of [(p:PortabilityInput)=>p.observations.pop(),(p:PortabilityInput)=>p.observations.reverse(),(p:PortabilityInput)=>{p.frames[0].id=p.frames[1].id;},
    (p:PortabilityInput)=>{const o=p.observations[0];if(o.kind==='vector')o.values[0]=NaN;},(p:PortabilityInput)=>{const o=p.observations[0];if(o.kind==='vector')o.values.fill(0);},
    (p:PortabilityInput)=>{const o=p.observations[0];if(o.kind==='vector')o.tensorSha256='b'.repeat(64);},(p:PortabilityInput)=>p.tensorComparisons.pop()]){const p=fixture();mutate(p);expect(()=>evaluatePortability(p)).toThrow();}
  for(const text of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{} true','[1,]'])expect(()=>parsePortabilityJson(Buffer.from(text))).toThrow();
  expect(parsePortabilityJson(Buffer.from('{"a":[true,null,1.2e-3]}'))).toEqual({a:[true,null,.0012]});
});

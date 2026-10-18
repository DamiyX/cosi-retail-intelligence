"""Compile/test the actual Java gate and characterize private Kotlin bindings; no Android execution."""
import pathlib,hashlib,json,subprocess,re
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c2-20261014-a1'
JAVA=pathlib.Path(r'C:/Users/doyew/.cache/cosi-p1-20261012-a1/jdk17/bin')
base=ROOT/'apps/mobile/recognition-native/recognition-experiment/android';source=base/'cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhoneOfflineGate.java';tests=base/'cpu-runtime/src/test/java/expo/modules/recognitioncpu/PhoneOfflineGateChecks.java'
sha=lambda b:hashlib.sha256(b).hexdigest()
def main():
 assert not (RUN/'stopped.json').exists() and not (RUN/'gate-checks.json').exists()
 rows=[]
 for label,mutant in [('after',False)]:
  target=RUN/('gate-'+label);target.mkdir();compiled=target/'classes';compiled.mkdir();used=source
  if mutant:
   raw=source.read_text().replace('!(w==0 || w==3)','w!=0').replace('!(b==0 || b==2)','b!=0')
   used=target/'PhoneOfflineGate.java';used.write_text(raw)
  result=subprocess.run([str(JAVA/'javac.exe'),'-d',str(compiled),str(used),str(tests),str(RUN/'ActualPolicyRegression.java')],capture_output=True,text=True)
  (target/'compile.stdout.log').write_text(result.stdout);(target/'compile.stderr.log').write_text(result.stderr);assert result.returncode==0
  result=subprocess.run([str(JAVA/'java.exe'),'-cp',str(compiled),'expo.modules.recognitioncpu.PhoneOfflineGateChecks'],capture_output=True,text=True)
  (target/'test.stdout.log').write_text(result.stdout);(target/'test.stderr.log').write_text(result.stderr)
  if mutant:assert result.returncode==1 and 'synthetic optional nfc/wimax 1/3/2' in result.stderr
  else:assert result.returncode==0 and result.stdout.startswith('PASS ')
  rows.append(dict(stage=label,exit=result.returncode,expectedFailure=mutant,actualProductionHelper=True,stdout=result.stdout))
  exact=subprocess.run([str(JAVA/'java.exe'),'-cp',str(compiled),'expo.modules.recognitioncpu.ActualPolicyRegression'],capture_output=True,text=True)
  (target/'actual-policy.stdout.log').write_text(exact.stdout);(target/'actual-policy.stderr.log').write_text(exact.stderr)
  assert exact.returncode==0 and 'reason=ELIGIBLE' in exact.stdout
  observed_path=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-offline-gate-c1-independent-audit-20261014-a1/actual-policy.json'
  assert json.loads(observed_path.read_bytes())==dict(airplane_mode_on='1',wifi_on='3',bluetooth_on='2',airplane_mode_radios='cell,bluetooth,uwb,wifi,wimax')
  before=json.loads((RUN/'actual-policy-before.json').read_bytes());assert before['checks'][0]['exit']==0 and before['checks'][1]['exit']==1 and 'POLICY_UNSUPPORTED' in before['checks'][1]['stdout']
  (RUN/'actual-policy-after.json').write_text(json.dumps(dict(observedPolicySha256=sha(observed_path.read_bytes()),exactFullPolicy='cell,bluetooth,uwb,wifi,wimax',beforeProductionSha256=before['productionSha256'],afterProductionSha256=sha(source.read_bytes()),beforeRefused=True,afterEligible=True,evaluateCheckStatusTested=True,cancellationUsesSharedCheck=True,exit=exact.returncode,stdout=exact.stdout,phoneExecuted=False),indent=2)+'\n')
 wrapper=base/'src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt';text=wrapper.read_text()
 status=text.split('  private fun privateOfflineStatus()',1)[1].split('  private fun finishPrivate',1)[0]
 for forbidden in ['privateStore','privateOperations','privateResult','PhonePortabilityReplay','worker.execute','busy.set','cancelPrivate']:assert forbidden not in status,forbidden
 assert 'PhoneOfflineGate.status(privateOfflineReader()' in status
 assert text.count('privateOfflinePolicy().eligible')==3
 block=text.split('AsyncFunction("runPrivatePortability")',1)[1].split('AsyncFunction("runGeneratedProbe")',1)[0]
 assert block.index('!privateOfflinePolicy().eligible')<block.index('privateOperations.begin')<block.index('PhonePortabilityReplay.run')
 assert '{ closed.get() || captured.cancelled.get() || !privateOfflinePolicy().eligible }' in block
 before=json.loads((RUN/'source-before.json').read_bytes());row=next(r for r in before if r['path'].replace('\\','/')==str(wrapper.relative_to(ROOT)).replace('\\','/'))
 original=(RUN/row['snapshot']).read_text()
 for begin,end in [('    AsyncFunction("runGeneratedProbe")','    OnActivityResult'),('  private fun cancelExport(', '  private val fixtures'),('      if (payload.requestCode == exportCode)','    OnActivityDestroys')]:assert original.split(begin,1)[1].split(end,1)[0]==text.split(begin,1)[1].split(end,1)[0]
 receipt=dict(checks=rows,productionSha256=sha(source.read_bytes()),wrapperSha256=sha(wrapper.read_bytes()),statusPrivateStateTouches=0,sameAdmissionAndCancellationPredicate=True,preAdmissionBeforeStoreAndRequest=True,generatedCodeUnchanged=True,androidExecuted=False,modelExecuted=False)
 (RUN/'gate-checks.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
if __name__=='__main__':main()

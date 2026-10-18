"""C1 actual production state regression and old-semantics differential, generated only."""
import pathlib,sys,subprocess,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=pathlib.Path(sys.argv[1]).resolve()
assert RUN.parent==ROOT/'apps/recognition-lab/runs/phone-experiment' and (RUN.name=='p1-portability-c1-20261012-a1' or RUN.name.startswith('p1-portability-audit-'))
assert RUN.is_dir() and not (RUN/'stopped.json').exists()
JAVA=pathlib.Path(r'C:/Users/doyew/.cache/cosi-p1-20261012-a1/jdk17/bin')
src=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src'
production=src/'main/java/expo/modules/recognitioncpu/PhonePortabilityState.java';test=src/'test/java/expo/modules/recognitioncpu/PhonePortabilityStateChecks.java'
out=RUN/'state-regressions';out.mkdir(exist_ok=True);before=out/'before';after=out/'after';before.mkdir(exist_ok=True);after.mkdir(exist_ok=True)
# Restore the exact bad semantic: expected identity is ignored and cancellation targets current.
text=production.read_text();old=text.replace('if(current!=expected || expected==null) return false;\n    expected.cancelled.set(true);','if(current==null) return false;\n    expected=current;\n    expected.cancelled.set(true);',1)
assert old!=text;mutant=out/'PhonePortabilityState.java';mutant.write_text(old)
records=[]
for label,file,target,wanted in [('before',mutant,before,False),('after',production,after,True)]:
 compile=subprocess.run([str(JAVA/'javac.exe'),'-d',str(target),str(file),str(test)],capture_output=True,text=True);(out/(label+'-compile.log')).write_text(compile.stdout+compile.stderr);assert compile.returncode==0
 execute=subprocess.run([str(JAVA/'java.exe'),'-cp',str(target),'expo.modules.recognitioncpu.PhonePortabilityStateChecks'],capture_output=True,text=True);(out/(label+'.stdout.log')).write_text(execute.stdout);(out/(label+'.stderr.log')).write_text(execute.stderr)
 assert (execute.returncode==0)==wanted
 if label=='before':assert 'queued A must not cancel B' in execute.stderr
 records.append(dict(stage=label,exit=execute.returncode,expectedPass=wanted))
wrapper=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt'
body=wrapper.read_text();assert 'private val privateOperations = PhonePortabilityState<Promise>(busy, closed)' in body and 'privateCancelled' not in body and 'privateRequest' not in body
assert body.count('cancelPrivate("')==3 # Explicit user/activity/module cancellation only.
receipt=dict(checks=records,productionSha256=hashlib.sha256(production.read_bytes()).hexdigest(),testSha256=hashlib.sha256(test.read_bytes()).hexdigest(),wrapperSha256=hashlib.sha256(wrapper.read_bytes()).hexdigest(),actualProductionHelperConsumedByKotlin=True,oldStructuralProbePreserved=True,androidExecuted=False,modelExecuted=False)
(RUN/'state-regressions.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(dict(beforeFailedAsExpected=True,afterPassed=True,actualProductionHelper=True)))

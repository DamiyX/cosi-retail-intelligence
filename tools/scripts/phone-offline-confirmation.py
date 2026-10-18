"""One new, explicitly authorized P1 verification. No installs or radio writes."""
import argparse
import datetime
import hashlib
import importlib.util
import json
import pathlib
import re
import subprocess
import sys
import time

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('offline_observer',pathlib.Path(__file__).with_name('phone-offline-observer.py'))
o=importlib.util.module_from_spec(spec);spec.loader.exec_module(o)
RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-offline-confirmation-device-20261015-a1'
OLD=o.BASE/'direct-replay-20261015-a1'
PIN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c2-20261014-a1/replay-source-pin.json'
APK_SHA='c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b'
SOURCE_SHA='cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d'
INPUT_SHA='059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e'
OLD_SHA='b72de75bbf1195a3c0cd4d3f649e45f190e7709894b394da85b9fe452e84e80e'
REMOTE_INPUT='/sdcard/Download/cosi-p1-private-portability-c4-20261014-a1.zip'
OLD_EXPORT='/sdcard/Download/private-portability-10001.zip'
UI_LOCK=o.BASE/'single-phone-ui-owner.lock'

def sha(path):
    with pathlib.Path(path).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

def verify_sources():
    assert sha(PIN)==SOURCE_SHA
    rows=o.load(PIN);assert len(rows)==24
    for row in rows:
        p=ROOT/row['path'];assert p.stat().st_size==row['bytes'] and sha(p)==row['sha256']

def named(nodes,label):
    result=[n for n in nodes if n.get('content-desc')==label]
    assert len(result)==1,'Expected private control not visible: '+label
    return result[0]

def texts(nodes):return [n.get('text','') for n in nodes if n.get('text')]

def seek(device,labels,limit=6):
    for index in range(limit+1):
        nodes=device.snapshot()
        if any(n.get('content-desc') in labels for n in nodes):return nodes
        assert index<limit,'Private panel not reached in bounded navigation'
        device.shell('input','swipe','540','1850','540','650','150')
    raise RuntimeError('Unreachable')

def summary(device,label):
    collected=[]
    for index in range(7):
        nodes=device.snapshot();collected.extend(texts(nodes));joined='\n'.join(collected)
        count=re.search(r'(\d+)/80 inference attempts\s*\u00b7\s*(\d+) saved bytes',joined)
        digest=re.search(r'Private ZIP SHA256:\s*([a-f0-9]{64})',joined)
        lanes=sorted(set(re.findall(r'(control|phone): first (\d+)/20\s*\u00b7\s*first three (\d+)/20\s*\u00b7\s*(complete|incomplete)',joined)))
        exporters=[n for n in nodes if n.get('content-desc')=='Export saved private numerical evidence' and n.get('enabled')=='true']
        if count and digest and len(lanes)==2 and exporters:
            assert not any(n.get('content-desc')=='Cancel private operation' for n in nodes)
            result=dict(at=o.now(),attemptedInferences=int(count[1]),bundleBytes=int(count[2]),bundleSha256=digest[1],lanes=lanes)
            assert result['attemptedInferences']<=80 and 22<result['bundleBytes']<=48*1024*1024
            o.write_new(RUN/(label+'.json'),result);return result
        assert index<6,'Result metadata not reached in bounded navigation'
        device.shell('input','swipe','540','1800','540','650','150')

def preflight():
    RUN.mkdir(exist_ok=False)
    verify_sources()
    assert sha(OLD/'private-portability-10001.zip')==OLD_SHA
    prior=[]
    for p in sorted(OLD.rglob('*')):
        if p.is_file():prior.append(dict(path=p.relative_to(OLD).as_posix(),bytes=p.stat().st_size,sha256=sha(p)))
    o.write_new(RUN/'prior-evidence-inventory.json',prior)
    source_paths=[pathlib.Path(__file__).resolve(),pathlib.Path(__file__).with_name('phone-offline-observer.py'),pathlib.Path(__file__).with_name('phone-offline-observer.test.py')]
    o.write_new(RUN/'host-tools-pin.json',[dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in source_paths])
    device=o.ScopedDevice(RUN/'preflight')
    try:
        actual=subprocess.run([str(device.helper.ADB),'-d','get-serialno'],capture_output=True,timeout=15)
        assert actual.returncode==0 and actual.stdout.decode().strip()==device.helper.SERIAL,'Selected device is not the authorized USB device'
        assert device.helper.installed()==APK_SHA
        facts={k:device.shell('getprop',k) for k in ['ro.product.model','ro.product.cpu.abilist','ro.build.version.sdk']}
        assert facts['ro.product.model']=='SM-A156E' and facts['ro.build.version.sdk']=='36' and 'arm64-v8a' in facts['ro.product.cpu.abilist']
        assert device.shell('toybox','sha256sum',REMOTE_INPUT).split()[0]==INPUT_SHA
        assert int(device.shell('toybox','stat','-c','%s',REMOTE_INPUT))==131901810
        assert device.shell('toybox','sha256sum',OLD_EXPORT).split()[0]==OLD_SHA
        assert int(device.shell('toybox','stat','-c','%s',OLD_EXPORT))==48607330
        o.write_new(RUN/'preflight-result.json',dict(at=o.now(),status='PASS',selectedUsb=True,facts=facts,sourceRecords=24,apkSha256=APK_SHA,inputSha256=INPUT_SHA,originalExportPreservedBothLocations=True,priorEvidenceFiles=len(prior),newInputTransfer=False,install=False))
        print('Preflight passed: frozen sources/build/input and both original exports verified.',flush=True)
    finally:device.close()

def probe():
    assert o.load(RUN/'preflight-result.json')['status']=='PASS'
    verify_sources();directory=RUN/'monitor-probe';directory.mkdir(exist_ok=False)
    with o.UiOwner(UI_LOCK) as owner:
        device=o.ScopedDevice(directory/'ui',owner);monitor=o.MonitorProcess(directory,120)
        try:
            monitor.ready()
            nodes=seek(device,{'Export saved private numerical evidence','Import reviewed private packet','Cancel private operation'})
            assert not any(n.get('content-desc')=='Cancel private operation' for n in nodes)
            assert named(nodes,'Import reviewed private packet').get('enabled')=='true'
            before=len((directory/'monitor-samples.jsonl').read_text(encoding='utf8').splitlines())
            try:raise RuntimeError('GENERATED_HOST_UI_EXCEPTION_FIXTURE')
            except RuntimeError as exc:o.write_new(directory/'generated-ui-failure.json',dict(at=o.now(),error=str(exc),noDeviceOperation=True))
            start=time.monotonic()
            while time.monotonic()-start<20:
                monitor.require_healthy();time.sleep(.25)
            after=len((directory/'monitor-samples.jsonl').read_text(encoding='utf8').splitlines())
            assert after-before>=5,'Monitor did not continue after generated UI error'
            result=monitor.close_after_observed_closure('No private/model/picker operation requested; generated host exception only')
            o.write_new(RUN/'probe-result.json',dict(at=o.now(),status='PASS',monitorSamples=result['samples'],samplesAfterGeneratedUiError=after-before,modelCalls=0,privateWorkStarted=False,noRadioWrites=True))
            print('Physical monitor probe passed; generated UI exception did not interrupt actual-state observation.',flush=True)
        finally:device.close()

def verify_tool_pin():
    for row in o.load(RUN/'host-tools-pin.json'):
        p=ROOT/row['path'];assert p.stat().st_size==row['bytes'] and sha(p)==row['sha256'],'Host tool changed after preflight'

def wait_admission(device,monitor,start):
    for _ in range(60):
        assert time.monotonic()-start<=120,'Import120s expired; no repeat import'
        monitor.require_healthy()
        packages,nodes=device.picker_nodes()
        if device.helper.PKG in packages:
            own=device.snapshot()
            if 'Exact 40-record packet admitted. No image decoded or inference run.' in texts(own):return own
        time.sleep(.5)
    raise RuntimeError('Existing import did not resolve')

def import_once(device,monitor):
    nodes=seek(device,{'Import reviewed private packet'})
    assert not any(n.get('content-desc')=='Cancel private operation' for n in nodes)
    o.write_new(RUN/'import-start.json',dict(at=o.now(),oneNewImport=True,exactInputSha256=INPUT_SHA,priorEvidencePreserved=True))
    start=time.monotonic();device.tap(named(nodes,'Import reviewed private packet'),'new-import-tap')
    filename=REMOTE_INPUT.rsplit('/',1)[1]
    for _ in range(60):
        assert time.monotonic()-start<=120,'Import picker120s expired; no second request'
        monitor.require_healthy();packages,picker=device.picker_nodes(filename)
        matches=[n for n in picker if n.get('verifiedFilename')==filename]
        if matches:
            assert 'com.google.android.documentsui' in packages
            assert any(n.get('text')=='Downloads' and 'breadcrumb' in n.get('resource-id','') for n in picker)
            assert len(matches)==1
            device.tap(matches[0],'exact-c4-input-selection');break
        time.sleep(.5)
    else:raise RuntimeError('Exact local import selection unavailable')
    admitted=wait_admission(device,monitor,start)
    o.write_new(RUN/'import-result.json',dict(at=o.now(),admittedRecords=40,elapsedMs=(time.monotonic()-start)*1000,oneRequest=True,inputSha256=INPUT_SHA))
    return admitted

def cancel_and_close(device,monitor,reason):
    """No second operation. Monitoring remains active throughout navigation/drain."""
    o.write_new(RUN/'execution-failure.json',dict(at=o.now(),reason=str(reason),noInferenceRetry=True,keepPhoneOffline=True))
    nodes=seek(device,{'Cancel private operation','Export saved private numerical evidence','Import reviewed private packet'})
    cancel=[n for n in nodes if n.get('content-desc')=='Cancel private operation' and n.get('enabled')=='true']
    if cancel:
        assert len(cancel)==1
        o.write_new(RUN/'cancel-request.json',dict(at=o.now(),oneRequest=True))
        device.tap(cancel[0],'one-cancel-tap');start=time.monotonic()
        for _ in range(40):
            assert time.monotonic()-start<=120,'Owned drain unconfirmed; keep offline, no force-stop'
            nodes=device.snapshot()
            if not any(n.get('content-desc')=='Cancel private operation' for n in nodes):break
            time.sleep(.5)
        else:raise RuntimeError('Owned drain unconfirmed')
    assert any(n.get('enabled')=='true' and n.get('content-desc') in {'Import reviewed private packet','Export saved private numerical evidence','Check private offline gate'} for n in nodes),'App UI closure not observed'
    monitor.close_after_observed_closure('Existing operation UI settled; no active cancellation; source-bound closure only')

def replay():
    assert o.load(RUN/'probe-result.json')['status']=='PASS'
    verify_sources();verify_tool_pin()
    with o.UiOwner(UI_LOCK) as owner:
        device=o.ScopedDevice(RUN/'replay-ui',owner);monitor=o.MonitorProcess(RUN,1800)
        try:
            monitor.ready()
            nodes=import_once(device,monitor)
            switch=named(nodes,'Confirm device offline state');assert switch.get('checked')=='false'
            monitor.require_healthy();device.tap(switch,'fresh-offline-confirmation')
            nodes=device.snapshot();assert named(nodes,'Confirm device offline state').get('checked')=='true'
            button=named(nodes,'Run one private replay');assert button.get('enabled')=='true'
            o.write_new(RUN/'replay-start.json',dict(at=o.now(),oneNewVerificationReplay=True,maxInferenceAttempts=80,freshHumanOfflineConfirmation=True,previousRunPreserved=True,hostOnlyCorrection=True))
            started=time.monotonic();device.tap(button,'one-new-verification-replay')
            print('New recorded verification replay started; separate actual-state monitor owns continuous observations.',flush=True)
            index=0
            while time.monotonic()-started<=1500:
                monitor.require_healthy()
                nodes=seek(device,{'Cancel private operation','Export saved private numerical evidence'})
                visible=texts(nodes)
                if index%4==0:print(json.dumps(dict(elapsedSeconds=round(time.monotonic()-started,1),progress=[t for t in visible if '/80 records' in t or 'inference attempts' in t])),flush=True)
                if any(t in visible for t in ['Both lanes completed. Quality acceptance requires independent comparison.','Failure evidence saved. The full batch did not complete.']):break
                index+=1;time.sleep(1)
            else:raise RuntimeError('1500-second observation expired')
            result=summary(device,'completed-result')
            offline=monitor.close_after_observed_closure('Saved numerical result/export enabled, no active cancel; app promise closed')
            o.write_new(RUN/'replay-result.json',dict(at=o.now(),status='COMPLETED_WITH_CONTINUOUS_ACTUAL_OFF_EVIDENCE',result=result,monitorSamples=offline['samples'],elapsedMs=(time.monotonic()-started)*1000,oneReplay=True))
            print(json.dumps(dict(status='REPLAY_AND_OFFLINE_OBSERVATION_COMPLETE',**result)),flush=True)
        except Exception as exc:
            if not (RUN/'owned-work-closed.json').exists():
                try:cancel_and_close(device,monitor,exc)
                except Exception as drain_error:
                    o.write_new(RUN/'closure-unconfirmed.json',dict(at=o.now(),error=str(drain_error),monitorContinuesToFiniteDeadline=True,keepPhoneOffline=True))
            raise
        finally:
            # Deliberately no monitor stop/kill here: UI failure does not end
            # actual-state evidence while native work may still be active.
            device.close()

def finish():
    verify_sources();verify_tool_pin()
    replay=o.load(RUN/'replay-result.json');assert replay['status']=='COMPLETED_WITH_CONTINUOUS_ACTUAL_OFF_EVIDENCE'
    assert o.load(RUN/'monitor-summary.json')['status']=='PASS'
    before=replay['result']
    with o.UiOwner(UI_LOCK) as owner:
        device=o.ScopedDevice(RUN/'finish-ui',owner)
        try:
            device.offline('before-restart')
            current=summary(device,'before-restart')
            for key in ['bundleSha256','bundleBytes','attemptedInferences','lanes']:assert current[key]==before[key]
            o.write_new(RUN/'restart-start.json',dict(at=o.now(),oneIsolatedRestart=True,ownedWorkClosed=True))
            device.shell('am','force-stop',device.helper.PKG,name='one-isolated-stop')
            device.shell('am','start','-W','-n',device.helper.PKG+'/.MainActivity',name='one-isolated-relaunch')
            nodes=seek(device,{'Verify saved private evidence'})
            o.write_new(RUN/'recovery-start.json',dict(at=o.now(),oneExplicitRecovery=True,noReplay=True))
            start=time.monotonic();device.tap(named(nodes,'Verify saved private evidence'),'one-recovery-tap')
            for _ in range(40):
                assert time.monotonic()-start<=120,'Recovery observation expired'
                nodes=device.snapshot()
                if 'Saved packet verified; no replay performed.' in texts(nodes):break
                time.sleep(.5)
            else:raise RuntimeError('Recovery did not settle')
            after=summary(device,'after-recovery')
            for key in ['bundleSha256','bundleBytes','attemptedInferences','lanes']:assert after[key]==before[key]
            o.write_new(RUN/'recovery-result.json',dict(at=o.now(),status='SAME_RESULT_RECOVERED',result=after,noNewReplay=True))
            device.offline('before-export')
            nodes=device.snapshot();button=named(nodes,'Export saved private numerical evidence')
            o.write_new(RUN/'export-start.json',dict(at=o.now(),oneNumericalExport=True,observationSeconds=120))
            start=time.monotonic();device.tap(button,'one-export-request')
            for _ in range(40):
                assert time.monotonic()-start<=120,'Export picker observation expired; no second request'
                packages,picker=device.picker_nodes()
                names=[n for n in picker if n.get('class')=='android.widget.EditText']
                saves=[n for n in picker if n.get('text','').lower()=='save' and n.get('enabled')=='true']
                downloads=[n for n in picker if n.get('text')=='Downloads' and 'breadcrumb' in n.get('resource-id','')]
                if len(names)==1 and len(saves)==1 and downloads:break
                time.sleep(.5)
            else:raise RuntimeError('Local save controls unavailable')
            filename=names[0]['text'];assert re.fullmatch(r'private-portability-\d+\.zip',filename)
            remote='/sdcard/Download/'+filename;host=RUN/filename
            assert not host.exists()
            absent=device.shell('sh','-c',"'if [ -e "+remote+" ]; then echo EXISTS; else echo ABSENT; fi'")
            assert absent=='ABSENT','Export would overwrite an existing destination'
            o.write_new(RUN/'new-export-destination.json',dict(at=o.now(),remote=remote,hostName=filename,absentBothLocations=True))
            device.tap(saves[0],'save-new-numerical-zip')
            for _ in range(40):
                assert time.monotonic()-start<=120,'Export observation expired; no second export'
                packages,_=device.picker_nodes()
                if device.helper.PKG in packages:
                    nodes=device.snapshot()
                    if 'Complete saved numerical ZIP written. Verify its hash and all records independently.' in texts(nodes):break
                time.sleep(.5)
            else:raise RuntimeError('Export did not resolve')
            digest=device.shell('toybox','sha256sum',remote).split()[0]
            size=int(device.shell('toybox','stat','-c','%s',remote))
            assert digest==after['bundleSha256'] and size==after['bundleBytes'] and size<=48*1024*1024
            o.write_new(RUN/'device-export-result.json',dict(at=o.now(),sha256=digest,bytes=size,remote=remote,elapsedMs=(time.monotonic()-start)*1000))
            device.call(['pull',remote,str(host)],name='exact-numerical-transfer',timeout=120)
            assert sha(host)==digest and host.stat().st_size==size
            device.offline('after-transfer')
            o.write_new(RUN/'export-result.json',dict(at=o.now(),status='ONE_EXPORT_HASH_MATCH',hostName=filename,remote=remote,sha256=digest,bytes=size,noImageExport=True))
            print(json.dumps(dict(status='RECOVERY_EXPORT_TRANSFER_PASS',hostName=filename,sha256=digest,bytes=size)),flush=True)
        finally:device.close()

def main():
    global RUN
    parser=argparse.ArgumentParser();parser.add_argument('stage',choices=['preflight','probe','replay','finish']);parser.add_argument('--offline-confirmed',action='store_true');parser.add_argument('--attempt',choices=['a1','b1'],default='a1');args=parser.parse_args()
    if args.attempt=='b1':
        failed=o.load(RUN/'attempt-result.json')
        assert failed['status']=='IMPORT_OBSERVATION_FAILED_ZERO_REPLAY' and failed['replayRequests']==0
        assert (RUN/'monitor-summary.json').exists() and o.load(RUN/'monitor-summary.json')['ownedWorkClosed']
        RUN=RUN.with_name('p1-offline-confirmation-device-20261015-b1')
    if args.stage in ['probe','replay'] and not args.offline_confirmed:raise SystemExit('Fresh human offline readiness required')
    {'preflight':preflight,'probe':probe,'replay':replay,'finish':finish}[args.stage]()

if __name__=='__main__':main()

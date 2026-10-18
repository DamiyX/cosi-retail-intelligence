"""Continue b1 after a pre-restart host tuple/list comparison error.

No inference or import action. JSON-equivalent lane representations compare
equally; changed counts, ranks, hash, bytes or ordering still refuse.
"""
import importlib.util,json,pathlib,re,sys,time
spec=importlib.util.spec_from_file_location('confirmation',pathlib.Path(__file__).with_name('phone-offline-confirmation.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.RUN=m.RUN.with_name('p1-offline-confirmation-device-20261015-b1')
o=m.o;RUN=m.RUN

def canonical(result):
    return json.loads(json.dumps({k:result[k] for k in ['bundleSha256','bundleBytes','attemptedInferences','lanes']}))

def checks():
    a=dict(bundleSha256='a'*64,bundleBytes=100,attemptedInferences=80,lanes=[('control','17','20','complete'),('phone','19','20','complete')])
    b=json.loads(json.dumps(a));assert canonical(a)==canonical(b)
    b['lanes'][1][1]='18';assert canonical(a)!=canonical(b)
    print('Canonical JSON equality and changed-rank refusal PASS; no device commands.')

def main():
    m.verify_sources();m.verify_tool_pin()
    assert not (RUN/'restart-start.json').exists(), 'Restart already consumed'
    before=o.load(RUN/'replay-result.json')['result']
    assert canonical(before)==canonical(o.load(RUN/'before-restart.json'))
    assert o.load(RUN/'monitor-summary.json')['status']=='PASS'
    o.write_new(RUN/'finish-c1-review.json',dict(at=o.now(),cause='Saved JSON lanes are lists; fresh UI regex lanes are tuples. Strict field values agree before any restart. Normalize JSON representation, retain all values/order.',tests=['JSON tuple/list equivalence','Changed rank still refuses'],originalHostToolsUnchanged=True,noReplay=True,noPriorRestart=True))
    with o.UiOwner(m.UI_LOCK) as owner:
        d=o.ScopedDevice(RUN/'finish-c1-ui',owner)
        try:
            d.offline('before-restart')
            assert canonical(m.summary(d,'before-restart-c1'))==canonical(before)
            o.write_new(RUN/'restart-start.json',dict(at=o.now(),oneIsolatedRestart=True,ownedWorkClosed=True))
            d.shell('am','force-stop',d.helper.PKG,name='one-isolated-stop')
            d.shell('am','start','-W','-n',d.helper.PKG+'/.MainActivity',name='one-isolated-relaunch')
            ns=m.seek(d,{'Verify saved private evidence'})
            o.write_new(RUN/'recovery-start.json',dict(at=o.now(),oneExplicitRecovery=True,noReplay=True))
            start=time.monotonic();d.tap(m.named(ns,'Verify saved private evidence'),'one-recovery')
            for _ in range(40):
                assert time.monotonic()-start<=120
                ns=d.snapshot()
                if 'Saved packet verified; no replay performed.' in m.texts(ns):break
                time.sleep(.5)
            else:raise RuntimeError('Recovery observation incomplete')
            after=m.summary(d,'after-recovery')
            assert canonical(after)==canonical(before),'Recovered result changed'
            o.write_new(RUN/'recovery-result.json',dict(at=o.now(),status='SAME_RESULT_RECOVERED',result=canonical(after),noNewReplay=True))
            d.offline('before-export');ns=d.snapshot()
            o.write_new(RUN/'export-start.json',dict(at=o.now(),oneNumericalExport=True,observationSeconds=120))
            start=time.monotonic();d.tap(m.named(ns,'Export saved private numerical evidence'),'one-export')
            for _ in range(40):
                assert time.monotonic()-start<=120,'Save picker exceeded bound'
                packages,controls=d.picker_nodes()
                fields=[n for n in controls if n.get('class')=='android.widget.EditText']
                saves=[n for n in controls if n.get('text','').lower()=='save' and n.get('enabled')=='true']
                if len(fields)==len(saves)==1 and any(n.get('text')=='Downloads' and 'breadcrumb' in n.get('resource-id','') for n in controls):break
                time.sleep(.5)
            else:raise RuntimeError('Save controls unavailable')
            name=fields[0]['text'];assert re.fullmatch(r'private-portability-\d+\.zip',name)
            remote='/sdcard/Download/'+name;host=RUN/name;assert not host.exists()
            assert d.shell('sh','-c',"'if [ -e "+remote+" ]; then echo EXISTS; else echo ABSENT; fi'")=='ABSENT'
            o.write_new(RUN/'new-export-destination.json',dict(at=o.now(),remote=remote,hostName=name,absentBothLocations=True))
            d.tap(saves[0],'save-new-numerical-export')
            for _ in range(40):
                assert time.monotonic()-start<=120,'Export exceeded bound'
                packages,_=d.picker_nodes()
                if d.helper.PKG in packages and 'Complete saved numerical ZIP written. Verify its hash and all records independently.' in m.texts(d.snapshot()):break
                time.sleep(.5)
            else:raise RuntimeError('Export did not settle')
            digest=d.shell('toybox','sha256sum',remote).split()[0];size=int(d.shell('toybox','stat','-c','%s',remote))
            assert digest==after['bundleSha256'] and size==after['bundleBytes'] and size<=48*1024*1024
            o.write_new(RUN/'device-export-result.json',dict(at=o.now(),sha256=digest,bytes=size,remote=remote,elapsedMs=(time.monotonic()-start)*1000))
            d.call(['pull',remote,str(host)],name='exact-numerical-transfer',timeout=120)
            assert m.sha(host)==digest and host.stat().st_size==size
            d.offline('after-transfer')
            o.write_new(RUN/'export-result.json',dict(at=o.now(),status='ONE_EXPORT_HASH_MATCH',hostName=name,remote=remote,sha256=digest,bytes=size,noImageExport=True))
            print(json.dumps(dict(status='RECOVERY_EXPORT_TRANSFER_PASS',hostName=name,sha256=digest,bytes=size)),flush=True)
        finally:d.close()

if __name__=='__main__':
    if sys.argv[1:]==['--self-test']:checks()
    elif not sys.argv[1:]:main()
    else:raise SystemExit('Unknown arguments')

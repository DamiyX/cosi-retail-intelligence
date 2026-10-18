"""Bounded host observer. No radio writes, decoder, model or phone picker actions.

The monitor is a separate process. Its lifetime is controlled by explicit owned
work closure, never by a UI worker's exception/finally block.
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
import pathlib
import re
import subprocess
import sys
import threading
import time
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = ROOT / 'apps/recognition-lab/runs/phone-experiment/p1-private-portability-device-20261013-a1/offline-gate-c2-replacement'
HELPER = BASE / 'c2-device.py'
HELPER_SHA = '640cbd937f55c694f7db9d34aead2d9cd8430a9c7718993f9e7595548cffa5c4'


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def write_new(path, value):
    path=pathlib.Path(path)
    pending=path.with_name(path.name+'.pending-'+str(os.getpid())+'-'+str(threading.get_ident()))
    with pending.open('x', encoding='utf8', newline='\n') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')
        stream.flush();os.fsync(stream.fileno())
    # Atomic publication with no replacement, including on Windows. Readers
    # cannot observe half-written readiness or owned-work closure JSON.
    os.link(pending,path)
    pending.unlink() # Only the temporary file created by this invocation.


def load(path):
    return json.loads(pathlib.Path(path).read_bytes())


def local_picker_controls(tree,target=None):
    """Bind a shortened card title to its exact accessibility filename.

    Select the clickable file card, never its separate Preview action.
    """
    safe=[];selected=set()
    def visit(element,parents):
        n=dict(element.attrib)
        if n.get('package')=='com.google.android.documentsui':
            text=n.get('text','')
            if (n.get('class')=='android.widget.EditText' and re.fullmatch(r'private-portability-\d+\.zip',text) or text.lower()=='save' or text=='Downloads' and 'breadcrumb' in n.get('resource-id','')):
                safe.append(n)
            exact=target is not None and (text==target or n.get('content-desc')=='Preview the file '+target)
            if exact:
                rows=[p for p in parents if p.get('package')=='com.google.android.documentsui' and p.get('resource-id')=='com.google.android.documentsui:id/item_root' and p.get('clickable')=='true']
                if rows:
                    row=dict(rows[-1].attrib)
                    key=row.get('bounds')
                    if key not in selected:
                        selected.add(key)
                        row.update(verifiedFilename=target,filenameProof='EXACT_ACCESSIBILITY_OR_TEXT_DESCENDANT',previewActionNotSelected=True)
                        safe.append(row)
        for child in element:visit(child,parents+[element])
    visit(tree,[])
    return safe


class UiOwner:
    """A cooperating second UI driver fails before issuing a phone command."""
    def __init__(self, path):
        self.path = pathlib.Path(path)
        self.stream = None

    def __enter__(self):
        import msvcrt
        self.stream = self.path.open('a+b')
        self.stream.seek(0, 2)
        if self.stream.tell() == 0:
            self.stream.write(b'0')
            self.stream.flush()
        self.stream.seek(0)
        try:
            msvcrt.locking(self.stream.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            self.stream.close()
            self.stream = None
            raise RuntimeError('UI_OWNER_BUSY: no second UI inspector permitted') from None
        return self

    def __exit__(self, *_):
        import msvcrt
        self.stream.seek(0)
        msvcrt.locking(self.stream.fileno(), msvcrt.LK_UNLCK, 1)
        self.stream.close()
        self.stream = None


class ScopedDevice:
    def __init__(self, directory, ui_owner=None):
        self.directory = pathlib.Path(directory)
        self.directory.mkdir(exist_ok=False)
        if hashlib.sha256(HELPER.read_bytes()).hexdigest() != HELPER_SHA:
            raise RuntimeError('Accepted actual-state parser changed')
        spec = importlib.util.spec_from_file_location('frozen_c2_parser_' + str(os.getpid()), HELPER)
        self.helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.helper)
        self.helper.RUN = self.directory
        self.helper.call = self.call
        self.ui_owner = ui_owner
        self.log_lock = threading.Lock()
        self.log = (self.directory/'commands.jsonl').open('x', encoding='utf8', newline='\n')
        self.sequence = 0

    def close(self):
        self.log.close()

    def sanitize(self, text):
        text = text.replace(self.helper.SERIAL, '<selected-device>')
        text = re.sub(r'(?i)\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b', '<redacted-mac>', text)
        text = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '<redacted-ip>', text)
        return text[:2400]

    def call(self, args, name=None, timeout=30):
        began = time.monotonic()
        record = dict(at=now(),operation=args[:3],tag=name,timeoutSeconds=timeout)
        try:
            result = subprocess.run([str(self.helper.ADB), '-s', self.helper.SERIAL, *args], capture_output=True, timeout=timeout)
            record.update(exit=result.returncode, stdoutBytes=len(result.stdout), stdoutSha256=hashlib.sha256(result.stdout).hexdigest(), stderr=self.sanitize(result.stderr.decode(errors='replace')))
        except subprocess.TimeoutExpired as exc:
            record.update(exit=None, failure='TIMEOUT', stderr=self.sanitize((exc.stderr or b'').decode(errors='replace')))
            result = None
        finally:
            record['elapsedMs'] = (time.monotonic()-began)*1000
            with self.log_lock:
                self.log.write(json.dumps(record)+'\n')
                self.log.flush()
        if result is None or result.returncode:
            raise RuntimeError('Selected-device command failed; retained command diagnostics; no operation retry')
        return result.stdout.decode(errors='replace').replace(self.helper.SERIAL, '<selected-device>').strip()

    def shell(self, *args, **kwargs):
        return self.call(['shell', *args], **kwargs)

    def offline(self, tag):
        facts = self.helper.live(tag)
        if facts['readWindowMs'] > 3000:
            raise RuntimeError('Actual-state read exceeded 3 seconds')
        expected = dict(airplane_mode_on='1', wifi_on='0', bluetooth_on='0', mobile_data='0')
        if any(facts['settings'].get(k) != v for k, v in expected.items()):
            raise RuntimeError('Saved offline settings changed or unknown')
        return facts

    def snapshot(self):
        if self.ui_owner is None or self.ui_owner.stream is None:
            raise RuntimeError('No exclusive UI ownership')
        self.sequence += 1
        return self.helper.dump('owned-ui-' + str(self.sequence).zfill(4))

    def picker_nodes(self, target=None):
        """Only expected local picker controls are retained, never other filenames."""
        if self.ui_owner is None or self.ui_owner.stream is None:
            raise RuntimeError('No exclusive UI ownership')
        self.sequence += 1
        remote='/data/local/tmp/cosi-observer-picker-'+str(os.getpid())+'-'+str(self.sequence)+'.xml'
        self.shell('uiautomator','dump',remote,timeout=15)
        tree=ET.fromstring(self.call(['exec-out','cat',remote],timeout=15))
        nodes=[dict(n.attrib) for n in tree.iter('node')]
        packages=sorted(set(n.get('package','') for n in nodes if n.get('package')))
        safe=local_picker_controls(tree,target)
        self.helper.save('picker-'+str(self.sequence),dict(at=now(),packages=packages,controls=safe))
        return packages,safe

    def tap(self, node, tag):
        if self.ui_owner is None or self.ui_owner.stream is None:
            raise RuntimeError('No exclusive UI ownership')
        self.helper.tap(node, tag)


def monitor_loop(sample, closure, deadline, record, latch_failure, clock=time.monotonic, wait=time.sleep):
    """Continue safety observation after errors; every breach remains latched."""
    last_end = None
    index = 0
    failures = []
    while clock() < deadline:
        start = clock()
        gap = 0 if last_end is None else start-last_end
        if gap > 5:
            failure = dict(at=now(),index=index,error='Actual-state observation gap exceeded 5 seconds')
            failures.append(failure)
            latch_failure(failure)
        try:
            facts = sample(index)
            if facts['readWindowMs'] > 3000:
                raise RuntimeError('Actual-state read exceeded 3 seconds')
            end = clock()
            record(dict(index=index, at=facts['at'], startMonotonic=start, endMonotonic=end, readWindowMs=facts['readWindowMs'], gapSeconds=gap, valid=gap<=5))
            last_end = end
        except Exception as error:
            message = str(error)
            failures.append(dict(at=now(),index=index,error=message))
            latch_failure(failures[-1])
            record(dict(index=index,at=now(),valid=False,error=message,gapSeconds=gap))
        index += 1
        # Closure may only be supplied by the owner after positively observed
        # no-active-work state. Even then retain a final actual-state sample.
        if closure():
            return dict(status='PASS' if not failures else 'INVALID',samples=index,failures=failures,ownedWorkClosed=True,at=now())
        wait(1)
    expired = dict(at=now(),index=index,error='Finite monitor deadline expired before owned-work closure')
    failures.append(expired)
    latch_failure(expired)
    return dict(status='INVALID',samples=index,failures=failures,ownedWorkClosed=False,at=now())


def monitor_main(run, seconds):
    run = pathlib.Path(run)
    device = ScopedDevice(run/'actual-state')
    output = (run/'monitor-samples.jsonl').open('x',encoding='utf8',newline='\n')
    def record(value):
        output.write(json.dumps(value)+'\n'); output.flush()
        if value['valid'] and not (run/'monitor-ready.json').exists():
            write_new(run/'monitor-ready.json',dict(at=now(),firstSample=value,processId=os.getpid()))
    def fail(value):
        if not (run/'monitor-failure.json').exists():
            write_new(run/'monitor-failure.json',value)
    def closed():
        path = run/'owned-work-closed.json'
        return path.exists() and load(path).get('ownedWorkClosed') is True
    try:
        summary = monitor_loop(lambda i:device.offline('actual-'+str(i).zfill(4)),closed,time.monotonic()+seconds,record,fail)
        write_new(run/'monitor-summary.json',summary)
    finally:
        output.close();device.close()


class MonitorProcess:
    def __init__(self, run, seconds=1800):
        self.run = pathlib.Path(run)
        self.stdout = (self.run/'monitor.stdout.log').open('xb')
        self.stderr = (self.run/'monitor.stderr.log').open('xb')
        self.process = subprocess.Popen([sys.executable,'-B',str(pathlib.Path(__file__).resolve()),'--monitor','--run',str(self.run),'--seconds',str(seconds)],stdin=subprocess.DEVNULL,stdout=self.stdout,stderr=self.stderr,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
        write_new(self.run/'monitor-process.json',dict(at=now(),processId=self.process.pid,seconds=seconds,independentOfUiFinally=True))

    def ready(self):
        end = time.monotonic()+15
        while time.monotonic()<end:
            self.require_healthy()
            if (self.run/'monitor-ready.json').exists():
                return
            time.sleep(.1)
        raise RuntimeError('Monitor did not establish initial actual OFF state')

    def require_healthy(self):
        if (self.run/'monitor-failure.json').exists() or self.process.poll() is not None:
            raise RuntimeError('Actual-state monitor failed; cancel once and preserve invalid evidence')

    def close_after_observed_closure(self, evidence):
        write_new(self.run/'owned-work-closed.json',dict(at=now(),ownedWorkClosed=True,evidence=evidence))
        self.process.wait(timeout=15)
        self.stdout.close();self.stderr.close()
        summary=load(self.run/'monitor-summary.json')
        if self.process.returncode or summary['status']!='PASS':
            raise RuntimeError('Offline proof invalid; never retry inference')
        return summary


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--monitor',action='store_true',required=True)
    parser.add_argument('--run',required=True,type=pathlib.Path)
    parser.add_argument('--seconds',type=int,required=True)
    args=parser.parse_args()
    if not 10<=args.seconds<=1800:
        raise SystemExit('Finite monitor bound required')
    monitor_main(args.run,args.seconds)

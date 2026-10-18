"""Host-only fault checks. No ADB, photos, model or radio operations."""
import importlib.util
import pathlib
import tempfile
import threading
import time
import unittest
import xml.etree.ElementTree as ET

spec=importlib.util.spec_from_file_location('observer',pathlib.Path(__file__).with_name('phone-offline-observer.py'))
observer=importlib.util.module_from_spec(spec);spec.loader.exec_module(observer)

class Clock:
    def __init__(self):self.value=0
    def read(self):return self.value
    def wait(self,seconds):self.value+=seconds

class Tests(unittest.TestCase):
    def simulate(self,durations=None,delays=None,errors=None,close=4,deadline=20):
        clock=Clock();records=[];failures=[];calls=[]
        def sample(index):
            calls.append(index)
            clock.wait((durations or {}).get(index,.1))
            if index in (errors or {}):raise RuntimeError(errors[index])
            return dict(at=str(clock.value),readWindowMs=(durations or {}).get(index,.1)*1000)
        def wait(seconds):clock.wait((delays or {}).get(len(calls),seconds))
        result=observer.monitor_loop(sample,lambda:len(calls)>=close,deadline,records.append,failures.append,clock.read,wait)
        return result,records,failures,calls

    def test_clean_windows_and_closure(self):
        result,records,_,_=self.simulate()
        self.assertEqual(result['status'],'PASS');self.assertEqual(len(records),4)
        self.assertTrue(result['ownedWorkClosed'])

    def test_gap_is_latched_but_safety_samples_continue(self):
        result,records,failures,calls=self.simulate(delays={1:6})
        self.assertEqual(result['status'],'INVALID');self.assertEqual(len(calls),4)
        self.assertTrue(any('gap' in f['error'] for f in failures))
        self.assertTrue(records[-1]['valid']) # A later good sample never clears INVALID.

    def test_slow_read_refuses_acceptance(self):
        result,_,failures,calls=self.simulate(durations={1:3.01})
        self.assertEqual(result['status'],'INVALID');self.assertEqual(len(calls),4)
        self.assertTrue(any('3 seconds' in f['error'] for f in failures))

    def test_read_failure_is_not_hidden_by_recovery(self):
        result,_,failures,calls=self.simulate(errors={1:'USB observation unknown'})
        self.assertEqual(result['status'],'INVALID');self.assertEqual(len(calls),4)
        self.assertIn('USB observation',failures[0]['error'])

    def test_deadline_without_closure_is_invalid(self):
        result,_,_,_=self.simulate(close=100,deadline=4)
        self.assertEqual(result['status'],'INVALID');self.assertFalse(result['ownedWorkClosed'])

    def test_ui_exception_does_not_stop_monitor(self):
        closed=threading.Event();seen=threading.Event();samples=[];result=[]
        def sample(index):
            if index>=2:seen.set()
            return dict(at=observer.now(),readWindowMs=1)
        thread=threading.Thread(target=lambda:result.append(observer.monitor_loop(sample,closed.is_set,time.monotonic()+2,samples.append,lambda _:None,wait=lambda _:time.sleep(.02))))
        thread.start()
        try:
            raise RuntimeError('generated UI inspector failure')
        except RuntimeError:
            self.assertTrue(seen.wait(1));self.assertTrue(thread.is_alive())
        closed.set();thread.join(1)
        self.assertEqual(result[0]['status'],'PASS');self.assertGreaterEqual(len(samples),4)

    def test_second_ui_owner_refused_until_release(self):
        with tempfile.TemporaryDirectory() as directory:
            path=pathlib.Path(directory)/'ui.lock'
            with observer.UiOwner(path):
                with self.assertRaisesRegex(RuntimeError,'UI_OWNER_BUSY'):
                    with observer.UiOwner(path):pass
            with observer.UiOwner(path):pass

    def test_atomic_readiness_never_replaces_existing_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            path=pathlib.Path(directory)/'ready.json'
            observer.write_new(path,dict(ownedWorkClosed=False))
            with self.assertRaises(FileExistsError):observer.write_new(path,dict(ownedWorkClosed=True))
            self.assertFalse(observer.load(path)['ownedWorkClosed'])

    def picker_fixture(self,filename):
        tree=ET.Element('hierarchy')
        row=ET.SubElement(tree,'node',{'package':'com.google.android.documentsui','resource-id':'com.google.android.documentsui:id/item_root','clickable':'true','bounds':'[551,2069][1013,2340]','enabled':'true'})
        ET.SubElement(row,'node',{'package':'com.google.android.documentsui','text':'cosi-p1-private-portability...','resource-id':'android:id/title'})
        ET.SubElement(row,'node',{'package':'com.google.android.documentsui','content-desc':'Preview the file '+filename,'resource-id':'com.google.android.documentsui:id/preview_icon','clickable':'true'})
        return tree

    def test_shortened_filename_selects_exact_bound_file_card(self):
        filename='cosi-p1-private-portability-c4-20261014-a1.zip'
        controls=observer.local_picker_controls(self.picker_fixture(filename),filename)
        self.assertEqual(len(controls),1)
        self.assertEqual(controls[0]['verifiedFilename'],filename)
        self.assertTrue(controls[0]['previewActionNotSelected'])
        self.assertTrue(controls[0]['resource-id'].endswith('/item_root'))

    def test_similar_filename_is_not_selected(self):
        filename='cosi-p1-private-portability-c4-20261014-a1.zip'
        self.assertEqual(observer.local_picker_controls(self.picker_fixture(filename+'.wrong'),filename),[])

if __name__=='__main__':unittest.main(verbosity=2)

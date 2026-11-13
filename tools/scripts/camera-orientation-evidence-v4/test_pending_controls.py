"""Actual V3/V4 differential and asynchronous own-UI regression; no device."""
import copy,importlib.util,json,sys,tempfile,unittest
from pathlib import Path
import controller_v4 as c
from test_controller_v4 import Clock,Phone,packet
ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('preserved_v3',ROOT/'tools/scripts/camera-orientation-evidence-v3/controller_v3.py')
v3=importlib.util.module_from_spec(spec);sys.modules[spec.name]=v3;spec.loader.exec_module(v3)

class PendingPhone(Phone):
    def __init__(self,clock,out):
        super().__init__(clock,out)
        self.state['marker']['nonce']=None
        self.pending=None;self.ack_pending=None;self.mutate=None
    def tap(self,action,**kwargs):
        result=super().tap(action,**kwargs)
        if action=='inspect':
            self.state['marker']['nonce']=None
            self.pending=[(None,False),(None,True),('c0000000-0000-4000-8000-000000000001',True),('c0000000-0000-4000-8000-000000000001',False)]
        if action=='ack':self.ack_pending=[False,False,True]
        return result
    def observe(self,deadline=None):
        self.clock.advance(.5)
        if self.pending:
            nonce,busy=self.pending.pop(0);self.state['marker'].update(nonce=nonce,busy=busy)
        state=super().observe(deadline)
        if self.ack_pending:state['captureControlEnabled']=self.ack_pending.pop(0)
        if self.mutate and 'inspect' in self.events:self.mutate(state)
        return state

class PendingTests(unittest.TestCase):
    def setup_case(self,cls=c.CaptureTail):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        out=Path(temp.name);clock=Clock();phone=PendingPhone(clock,out)
        tail=cls(phone,packet(),out,clock.now,clock.advance)
        return clock,phone,tail,out
    def test_old_refuses_legitimate_pending_new_waits_without_second_inspect(self):
        outcomes={}
        for name,cls in [('old',v3.CaptureTail),('new',c.CaptureTail)]:
            clock,phone,tail,out=self.setup_case(cls);ready=clock.now();clock.advance(15)
            try:
                pre=tail.prepare(ready);outcome=tail.run(ready,pre['sha256'])
            except ValueError as error:outcome=str(error)
            outcomes[name]=outcome
            self.assertEqual(phone.events.count('inspect'),1)
            if name=='old':self.assertNotIn('screenshot',phone.events)
            else:
                self.assertEqual(phone.events.count('capture'),1)
                self.assertEqual(phone.events.count('screenshot'),2)
                self.assertEqual(phone.events.count('close'),1)
                self.assertGreaterEqual(len(list(out.glob('inspect-observation-*.json'))),4)
                self.assertGreaterEqual(len(list(out.glob('ack-observation-*.json'))),3)
        self.assertEqual(outcomes,{'old':'INSPECT_DID_NOT_ISSUE_NEW_NONCE','new':'PUBLISHED'})
    def test_pending_forever_stops_no_ack_pre_or_capture_and_keeps_snapshot(self):
        clock,p,t,out=self.setup_case()
        p.mutate=lambda s:s['marker'].update(nonce=None,busy=False)
        with self.assertRaisesRegex(ValueError,'INSPECT_COMPLETION_NOT_OBSERVED'):t.prepare(clock.now())
        self.assertEqual(p.events,['preflight','inspect'])
        self.assertEqual(len(list(out.glob('inspect-observation-*.json'))),32)
        self.assertFalse((out/'pre-intent.json').exists())
    def test_actual_deadline_not_extended_by_pending_work(self):
        clock,p,t,out=self.setup_case()
        def delayed(s):clock.advance(25);s['marker'].update(nonce=None,busy=True)
        p.mutate=delayed
        with self.assertRaisesRegex(ValueError,'NO_LATE_SHUTTER|SETUP_COMPLETION_DEADLINE'):t.prepare(clock.now())
        self.assertNotIn('ack',p.events);self.assertNotIn('screenshot',p.events)
    def test_process_or_view_change_during_pending_refuses_without_effect_retry(self):
        for field,value in [('process','f0000000-0000-4000-8000-000000000001'),('viewGeneration',99),('previewMounted',False)]:
            with self.subTest(field=field):
                clock,p,t,out=self.setup_case();p.mutate=lambda s,k=field,v=value:s['marker'].update({k:v})
                with self.assertRaisesRegex(ValueError,'INSPECT_VIEW_OR_PROCESS_CHANGED'):t.prepare(clock.now())
                self.assertEqual(p.events.count('inspect'),1);self.assertNotIn('ack',p.events)
                self.assertTrue((out/'inspect-observation-00.json').exists())
    def test_ack_control_pending_never_saves_pre_or_taps_ack_twice(self):
        clock,p,t,out=self.setup_case()
        def pending_ack(s):
            if 'ack' in p.events:s['captureControlEnabled']=False
        p.mutate=pending_ack
        with self.assertRaisesRegex(ValueError,'ACK_COMPLETION_NOT_OBSERVED'):t.prepare(clock.now())
        self.assertEqual(p.events.count('inspect'),1);self.assertEqual(p.events.count('ack'),1)
        self.assertNotIn('screenshot',p.events);self.assertNotIn('capture',p.events)

if __name__=='__main__':unittest.main(verbosity=2)

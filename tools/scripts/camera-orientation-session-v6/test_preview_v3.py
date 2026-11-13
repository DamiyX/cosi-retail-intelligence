"""New namespace binding, actual controller/adapter, no phone or new allowance."""
from pathlib import Path
import hashlib
import sys
import tempfile
import unittest
import uuid
from unittest.mock import patch
import controller_v6 as c
import main_session as m

sys.path.append(str(c.ROOT / 'tools/scripts/camera-orientation-session-v5'))
from test_session import Clock, Device, packet as old_packet


def packet():
    p=old_packet();p['run']=c.v4.RUN
    p['job']=str(uuid.UUID(bytes=hashlib.md5((p['run']+':'+p['case']).encode()).digest(),version=3))
    return p


class PreviewV3Tests(unittest.TestCase):
    def test_eight_jobs_are_new_fixed_namespace_and_not_old_jobs(self):
        old='p203-orientation-20261027-readiness-v2'
        for case in c.v4.CASES:
            job=lambda run:str(uuid.UUID(bytes=hashlib.md5((run+':'+case).encode()).digest(),version=3))
            self.assertNotEqual(job(c.v4.RUN),job(old))
        self.assertEqual(c.v4.RUN,'p203-orientation-20261027-preview-v3')
    def test_disabled_or_unbuilt_packet_never_constructs_device_adapter(self):
        cfg=c.load(m.PREP/'capture-charter.disabled.json');p=m.approved_packet()
        with patch.object(c,'PinnedAdb',side_effect=AssertionError('DEVICE_FORBIDDEN')) as adapter:
            with self.assertRaisesRegex(ValueError,'V6_NOT_ACTIVATED'):m.guards(cfg,p)
            with self.assertRaisesRegex(ValueError,'REVIEWED_BUILT_APK_REQUIRED'):m.guards(dict(cfg,executionApproved=True),p)
            adapter.assert_not_called()
    def test_original_slot_and_consumed_predecessors_remain_exact(self):
        m.verify_predecessors(c.load(m.PREP/'predecessors.json',1024*1024))
        self.assertFalse(m.OUTPUT.exists())
    def test_new_namespace_tail_uses_single_capture_and_two_images(self):
        with tempfile.TemporaryDirectory() as out:
            clock=Clock();p=packet();d=Device(clock,p);a=d.adapter(c.PinnedAdb)
            s=c.Session(a,p,out,clock.now,clock.advance)
            with patch.object(c.time,'monotonic',clock.now):
                pre=s.prepare(clock.now());self.assertEqual(s.run(pre['sha256']),'PUBLISHED')
            result=c.load(Path(out)/'session-result.json')
            self.assertEqual(result['hostCaptureDispatches'],1);self.assertEqual(result['screenshotAttempts'],2)
            self.assertEqual(result['budgetRefund'],0);self.assertEqual(d.inputs.count('restore'),1)
    def test_old_run_or_job_cannot_be_adopted_by_new_controller(self):
        for field,value in [('run','p203-orientation-20261027-readiness-v2'),('jobId','e8d64430-d293-3224-a6fc-0db577e5d517')]:
            with self.subTest(field=field),tempfile.TemporaryDirectory() as out:
                clock=Clock();p=packet();d=Device(clock,p);d.state['marker'][field]=value
                s=c.Session(d.adapter(c.PinnedAdb),p,out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now),self.assertRaisesRegex(ValueError,'SETUP_ROW_OR_ARTIFACT_CHANGED'):
                    s.prepare(clock.now())
                self.assertEqual(d.inputs,[])
    def test_caps_preserve_original_amendment_without_refund(self):
        cfg=c.load(m.PREP/'capture-charter.disabled.json')
        self.assertEqual(cfg['budgetAmendment']['consumedRecovery']['hostCaptureCommands'],1)
        self.assertEqual(cfg['budgetAmendment']['consumedRecovery']['screenshotAttempts'],2)
        self.assertEqual(cfg['budgetAmendment']['proposedCumulative'],dict(hostCaptureCommands=9,screenshotAttempts=18))


if __name__=='__main__':unittest.main(verbosity=2)

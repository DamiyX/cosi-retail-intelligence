"""Actual offline predecessor/review/allowance guards; never constructs ADB."""
import copy
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import controller_v5 as c
import main_session as m


class PacketTests(unittest.TestCase):
    def setUp(self):
        self.packet = m.approved_packet()
        self.manifest = c.load(m.PREP / 'predecessors.json', 1024 * 1024)
    def test_disabled_packet_refuses_before_adapter(self):
        cfg = c.load(m.PREP / 'capture-charter.disabled.json')
        with patch.object(c, 'PinnedAdb', side_effect=AssertionError('DEVICE_FORBIDDEN')) as adapter:
            with self.assertRaisesRegex(ValueError, 'V5_NOT_ACTIVATED'): m.guards(cfg, self.packet)
            adapter.assert_not_called()
    def test_original_predecessors_consumed_hashes_and_ledger(self):
        m.verify_predecessors(self.manifest)
        self.assertFalse(m.OUTPUT.exists())
        self.assertEqual(self.manifest['accounting']['refund'], 0)
    def test_added_or_changed_predecessor_or_old_photo_intent_blocks(self):
        for mutation in ['extra', 'changed']:
            with self.subTest(mutation=mutation):
                original = m.hashes
                def wrong(root):
                    result = original(root)
                    result['unexpected'] = '0'*64
                    return result
                with patch.object(m, 'hashes', wrong), self.assertRaisesRegex(ValueError, 'PREDECESSOR_TREE_CHANGED'):
                    m.verify_predecessors(self.manifest)
        exists = Path.exists
        def old_input(p):
            return True if p == m.PARENT / 'M00-A000/main-continuation-c1/capture-intent.json' else exists(p)
        with patch.object(Path,'exists',old_input), self.assertRaisesRegex(ValueError,'PREDECESSOR_PHOTO_STAGE_CONSUMED'):
            m.verify_predecessors(self.manifest)
    def test_budget_no_refund_or_extra_screenshot(self):
        for key in ['screenshotAttempts','hostCaptureCommands','futureScreenshotMaximum','refund']:
            manifest=copy.deepcopy(self.manifest);manifest['accounting'][key]+=1
            with self.subTest(key=key), self.assertRaisesRegex(ValueError,'UNCHANGED_ALLOWANCE_REQUIRED'):
                m.verify_predecessors(manifest)
    def activated(self):
        cfg=c.load(m.PREP/'capture-charter.disabled.json');cfg.update(executionApproved=True,
            packetSha256=c.digest(c.canonical(self.packet)),lease=dict(holder=m.HOLDER),reviewSha256='review')
        review=dict(accepted=True,packetSha256=cfg['packetSha256'])
        original=c.load
        def loads(path,*args):
            if Path(path)==m.PREP/'accepted-review.json':return review
            if Path(path)==m.STATE:return dict(lease=cfg['lease'])
            return original(path,*args)
        return cfg, review, loads
    def test_accepted_exact_disabled_successor_can_only_pass_with_current_owner_review(self):
        cfg,review,loads=self.activated()
        read=Path.read_bytes
        def reads(p):return b'review' if p==m.PREP/'accepted-review.json' else read(p)
        cfg['reviewSha256']=c.digest(b'review')
        with patch.object(c,'load',side_effect=loads),patch.object(Path,'read_bytes',reads):m.guards(cfg,self.packet)
    def test_changed_packet_or_budget_or_path_or_owner_or_review_rejected(self):
        cfg,review,loads=self.activated();read=Path.read_bytes
        def reads(p):return b'review' if p==m.PREP/'accepted-review.json' else read(p)
        cfg['reviewSha256']=c.digest(b'review')
        with patch.object(c,'load',side_effect=loads),patch.object(Path,'read_bytes',reads):
            for key,value in [('budgetAmendment',{}),('executionDir','other'),('lease',dict(holder='other')),('reviewSha256','0'*64)]:
                with self.subTest(key=key),self.assertRaises(ValueError):m.guards(dict(cfg,**{key:value}),self.packet)
            with self.assertRaisesRegex(ValueError,'EXACT_SUCCESSOR_PACKET'):m.guards(cfg,dict(self.packet,apk='0'*64))
    def test_release_never_clears_other_lease(self):
        with patch.object(c,'load',return_value=dict(lease=dict(holder='other'))),patch.object(Path,'write_bytes') as write:
            m.release_lease(dict(lease=dict(holder=m.HOLDER)));write.assert_not_called()
    def test_live_ready_not_loaded_from_charter(self):
        from test_session import Clock,Device,packet
        with tempfile.TemporaryDirectory() as out:
            clock=Clock();d=Device(clock,packet());s=c.Session(d.adapter(),packet(),out,clock.now,clock.advance)
            with patch.object(c.time,'monotonic',clock.now):
                result=m.execute(s,lambda pre,deadline:pre['sha256'])
            self.assertEqual(result,'PUBLISHED');self.assertEqual(s.ready,100)
    def test_qualification_timeout_uses_single_finalizer(self):
        from test_session import Clock,Device,packet
        with tempfile.TemporaryDirectory() as out:
            clock=Clock();d=Device(clock,packet());s=c.Session(d.adapter(),packet(),out,clock.now,clock.advance)
            def late(pre,deadline):clock.advance(deadline-clock.now());raise ValueError('NO_TIMELY_PRE_QUALIFICATION')
            with patch.object(c.time,'monotonic',clock.now),self.assertRaisesRegex(ValueError,'NO_TIMELY_PRE_QUALIFICATION'):
                m.execute(s,late)
            result=c.load(Path(out)/'session-result.json')
            self.assertEqual(result['hostCaptureDispatches'],0);self.assertEqual(result['screenshotAttempts'],1)


if __name__=='__main__':unittest.main(verbosity=2)

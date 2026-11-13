"""Continuation authority/resource tests. No phone adapter is constructed."""
from pathlib import Path
import json,tempfile,unittest
from unittest.mock import patch
import main_session as m

class ContinuationTests(unittest.TestCase):
    def setUp(self):
        self.load=m.c.load;self.read=Path.read_bytes;self.packet=m.approved_packet()
        old=m.PARENT/'M00-A000'
        self.review=dict(accepted=True,controllerSha256=self.packet['controllerSha256'],sessionSha256=self.packet['sessionSha256'],
            priorPins={name:m.c.digest((old/name).read_bytes()) for name in ['row-slot-intent.json','inspect-intent.json','inspect-done.json']})
        self.review_bytes=m.c.canonical(self.review)
        self.cfg=dict(executionApproved=True,packetSha256=m.c.digest(m.c.canonical(self.packet)),
            reviewSha256=m.c.digest(self.review_bytes),budgetAmendment=self.load(m.APPROVAL)['budgetAmendment'],
            executionDir=str(m.OUTPUT),lease=dict(holder=m.HOLDER),readyMonotonic=100)
        def load(p,*args):
            return self.review if Path(p)==m.REVIEW/'review.json' else self.load(p,*args)
        def read(p):
            return self.review_bytes if p==m.REVIEW/'review.json' else self.read(p)
        self.patches=[patch.object(m.c,'load',side_effect=load),patch.object(Path,'read_bytes',read)]
        for item in self.patches:item.start();self.addCleanup(item.stop)
    def test_disabled_refuses_before_any_adapter_or_new_slot(self):
        self.cfg['executionApproved']=False
        with self.assertRaisesRegex(ValueError,'MAIN_CONTINUATION_NOT_ACTIVATED'):m.guards(self.cfg,self.packet,lambda:101)
    def test_exact_approved_continuation_preserves_old_consumed_setup(self):
        self.assertEqual(m.guards(self.cfg,self.packet,lambda:101),self.cfg)
        self.assertFalse((m.PARENT/'M00-A000/capture-intent.json').exists())
    def test_wrong_owner_path_budget_or_review_cannot_expand_authority(self):
        for key,value in [('executionDir','other'),('lease',dict(holder='other')),('budgetAmendment',{}),('reviewSha256','0'*64)]:
            with self.subTest(key=key),self.assertRaises(ValueError):m.guards(dict(self.cfg,**{key:value}),self.packet,lambda:101)
    def test_existing_photo_intent_blocks_slot_continuation(self):
        exists=Path.exists
        def check(p):return True if p==m.PARENT/'M00-A000/capture-intent.json' else exists(p)
        with patch.object(Path,'exists',check),self.assertRaisesRegex(ValueError,'ORIGINAL_PHOTO_STAGE_ALREADY_CONSUMED'):
            m.guards(self.cfg,self.packet,lambda:101)
    def test_old_ready_or_other_packet_refuses(self):
        with self.assertRaisesRegex(ValueError,'FRESH_HUMAN_READY_REQUIRED'):m.guards(self.cfg,self.packet,lambda:221)
        with self.assertRaisesRegex(ValueError,'EXACT_MAIN_CONTINUATION_PACKET'):m.guards(self.cfg,dict(self.packet,case='M01-A090'),lambda:101)

if __name__=='__main__':unittest.main(verbosity=2)

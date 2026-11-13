"""Main-owned M00 continuation. Preserve the allocated row, never reset/replay it."""
from pathlib import Path
import json,math,sys,time
import controller_v4 as c

ROOT=c.ROOT
PARENT=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-device-execution-20261027-a1'
PREP=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-device-preparation-20261027-a1'
REVIEW=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-main-host-wait-20261027-a1'
OUTPUT=PARENT/'M00-A000/main-continuation-c1'
HOLDER='01a098ef-d830-7531-bca7-2d66b0a5b587'
APPROVAL=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-packet-review-20261027-a1/founder-amendment-approved.json'

def approved_packet():
    original=c.load(PREP/'packet-M00-A000.json')
    return dict(original,hostProtocol=c.PROTOCOL,
        controllerSha256=c.digest(Path(c.__file__).read_bytes()),
        sessionSha256=c.digest(Path(__file__).read_bytes()))

def guards(cfg,packet,now=time.monotonic):
    c.require(cfg.get('executionApproved') is True,'MAIN_CONTINUATION_NOT_ACTIVATED')
    c.require(packet==approved_packet(),'EXACT_MAIN_CONTINUATION_PACKET')
    c.require(cfg.get('packetSha256')==c.digest(c.canonical(packet)),'MAIN_PACKET_BYTE_PIN')
    review=c.load(REVIEW/'review.json')
    c.require(review.get('accepted') is True and cfg.get('reviewSha256')==c.digest((REVIEW/'review.json').read_bytes())
        and review.get('controllerSha256')==packet['controllerSha256'] and review.get('sessionSha256')==packet['sessionSha256'],
        'MAIN_REVIEW_REQUIRED')
    c.require(cfg.get('budgetAmendment')==c.load(APPROVAL)['budgetAmendment']
        and cfg['budgetAmendment']['amendmentApproved'] is True,'UNCHANGED_FOUNDER_BUDGET_REQUIRED')
    c.require(cfg.get('executionDir')==str(OUTPUT) and cfg.get('lease',{}).get('holder')==HOLDER,
        'MAIN_OWNER_AND_FIXED_CONTINUATION_ROOT')
    ready=cfg.get('readyMonotonic')
    c.require(type(ready) in (int,float) and math.isfinite(ready) and 0<=now()-ready<120,'FRESH_HUMAN_READY_REQUIRED')
    # The existing slot and one Inspect remain consumed. No new row allocation,
    # no image/shutter refund, and no authorization inferred from native count0.
    old=PARENT/'M00-A000'
    for name in ['row-slot-intent.json','inspect-intent.json','inspect-done.json']:
        c.require(c.digest((old/name).read_bytes())==review['priorPins'][name],'ORIGINAL_SETUP_INTENT_CHANGED')
    for name in ['ack-intent.json','pre-intent.json','capture-intent.json','post-intent.json','pre.png','post.png']:
        c.require(not (old/name).exists(),'ORIGINAL_PHOTO_STAGE_ALREADY_CONSUMED')
    slot=c.load(old/'row-slot-intent.json')
    c.require(slot['case']=='M00-A000' and slot['run']==packet['run'] and slot['source']==packet['source']
        and slot['apk']==packet['apk'] and slot['hostInputMaximum']==1 and slot['screenshotMaximum']==2,
        'ORIGINAL_ROW_SLOT_BINDING')
    c.require(c.digest((PARENT/'received-fixture.zip').read_bytes())==c.load(PREP/'expected.json')['fixtureSha256'],
        'EXISTING_GENERATED_BYTES_CHANGED')
    return cfg

def configured(packet_path,charter_path):
    packet,cfg=c.load(packet_path),c.load(charter_path);guards(cfg,packet)
    c.require(OUTPUT.is_dir() and not OUTPUT.is_symlink() and OUTPUT==OUTPUT.resolve(),'OWN_CONTINUATION_DIRECTORY')
    adapter=c.PinnedAdb(packet_path,charter_path)
    c.exclusive(OUTPUT/'continuation-intent.json',c.canonical(dict(
        owner=HOLDER,case='M00-A000',reusesExistingRowSlot=True,newRowSlots=0,
        extraCaptureAllowance=0,extraScreenshotAllowance=0,noReplay=True,
        originalSetupPins=c.load(REVIEW/'review.json')['priorPins'])))
    return c.CaptureTail(adapter,packet,OUTPUT),cfg,packet

def main():
    c.require(len(sys.argv)==3,'EXACT_PACKET_AND_CHARTER_REQUIRED')
    tail,cfg,packet=configured(Path(sys.argv[1]),Path(sys.argv[2]));ready=cfg['readyMonotonic']
    time.sleep(max(0,ready+15-time.monotonic()))
    pre=tail.prepare(ready)
    print(json.dumps(dict(status='PRE_REVIEW_REQUIRED',path=str(OUTPUT/'pre.png'),sha256=pre['sha256'],
        qualificationDeadlineMonotonic=pre['monotonic']+30)),flush=True)
    decision=OUTPUT/'pre-qualified.json'
    while not decision.exists() and time.monotonic()-pre['monotonic']<=30:time.sleep(.1)
    c.require(decision.exists() and not decision.is_symlink(),'NO_TIMELY_PRE_SCENE_QUALIFICATION')
    q=c.load(decision)
    c.require(q.get('sceneQualified') is True and q.get('preSha256')==pre['sha256']
        and q.get('packetSha256')==cfg['packetSha256'],'EXACT_PRE_QUALIFICATION')
    print(json.dumps(dict(status=tail.run(ready,pre['sha256']),cameraProofAccepted=False)),flush=True)

if __name__=='__main__':main()

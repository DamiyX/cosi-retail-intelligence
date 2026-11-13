"""Preserve the installed build and create a host-only completion-wait repair."""
from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[2]
W=R/'apps/recognition-lab/runs/phone-experiment/p203-main-host-wait-20261027-a1'
OLD=R/'tools/scripts/camera-orientation-evidence-v3/controller_v3.py'
BUILD=R/'apps/recognition-lab/runs/phone-experiment/p203-readiness-build-20261027-a1'
EXEC=R/'apps/recognition-lab/runs/phone-experiment/p203-readiness-device-execution-20261027-a1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 assert not W.exists();W.mkdir()
 assert sha(EXEC/'evidence-index.json')=='17e06c62bf091472bb576fe167da064a0ebd4e4d6423f8f80014266112306571'
 rows=json.loads((EXEC/'evidence-index.json').read_text(encoding='utf-8'))
 for row in rows:
  p=Path(row['path']);p=p if p.is_absolute() else EXEC/p
  assert sha(p)==row['sha256'],str(p)
 for row in json.loads((BUILD/'source-index.json').read_text(encoding='utf-8')):
  assert sha(R/row['path'])==row['sha256'],row['path']
 (W/'preservation-before.json').write_text(json.dumps(dict(physicalRecords=len(rows),physicalIndexSha256=sha(EXEC/'evidence-index.json'),frozenSourceFiles=729,originalV3Sha256=sha(OLD),noDeviceEffect=True),indent=2)+'\n',encoding='utf-8')
 d=R/'tools/scripts/camera-orientation-evidence-v4';d.mkdir(exist_ok=False)
 text=OLD.read_text(encoding='utf-8').replace('FRESH_INSPECT_ACK_PRE_V3','OBSERVED_INSPECT_AND_ACK_V4')
 text=text.replace('lease["holder"] == self.transport.HOLDER','lease["holder"] == "01a098ef-d830-7531-bca7-2d66b0a5b587"')
 (d/'controller_v4.py').write_text(text,encoding='utf-8',newline='\n')
 print(json.dumps(dict(verifiedPhysicalRecords=len(rows),hostOnlyRepair=True,noApkChange=True)))
if __name__=='__main__':main()

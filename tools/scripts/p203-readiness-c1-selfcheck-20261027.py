"""Recheck the exact reported host guard defect; no phone operations."""
from pathlib import Path
import hashlib,json,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-main-implementation-20261027-a1/c1-current-gates'
start=time.monotonic()
p=subprocess.run([sys.executable,'-B','-m','unittest','-v','test_controller_v3'],cwd=ROOT/'tools/scripts/camera-orientation-evidence-v3',capture_output=True,timeout=60)
result=dict(exitCode=p.returncode,seconds=time.monotonic()-start,stdout=p.stdout.decode('utf-8',errors='replace'),stderr=p.stderr.decode('utf-8',errors='replace'))
(OUT/'existing-24-tests.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
records=json.loads((OUT.parent/'implementation-files.json').read_text(encoding='utf-8'))
changed=[]
for item in records:
 raw=(ROOT/item['path']).read_bytes();sha=hashlib.sha256(raw).hexdigest()
 if sha!=item['sha256']:changed.append(item['path'])
 item.update(bytes=len(raw),sha256=sha)
assert changed==['tools/scripts/camera-orientation-evidence-v3/controller_v3.py'],changed
(OUT/'implementation-files.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(exitCode=p.returncode,seconds=result['seconds'],changed=changed)))
sys.exit(p.returncode)

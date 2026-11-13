from pathlib import Path
import json,datetime,hashlib,os
R=Path.cwd();W=R/'apps/recognition-lab/runs/phone-experiment/p203-native-capture-host-controls-c1-20261029-a1';W.mkdir();p=R/'.agents/workflows/recognition-track-b.json';d=json.loads(p.read_bytes());assert d['lease'] is None;lease=dict(holder='01a17d25-9d2c-7e81-9680-9e04af83d0e9',expires_at=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=2)).isoformat());d['lease']=lease;raw=(json.dumps(d,ensure_ascii=True,indent=2)+'\n').encode('utf-8');tmp=p.with_suffix('.host-controls-lease.tmp');tmp.write_bytes(raw);os.replace(tmp,p);(W/'lease.json').write_bytes((json.dumps(lease,indent=2)+'\n').encode('utf-8'))
P=W.parent/'p203-native-capture-bound-build-20261029-a1';D=W.parent/'p203-native-capture-bound-device-20261029-a1';O=W.parent/'p203-native-capture-diagnostic-device-20261029-a1'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def tree(p):
 result={}
 for q in sorted(p.rglob('*')):
  assert not q.is_symlink() and not (getattr(q.lstat(),'st_file_attributes',0)&0x400),str(q)
  if q.is_file():result[q.relative_to(R).as_posix()]=dict(bytes=q.stat().st_size,sha256=sha(q))
 return result
pins=dict(trees={str(P.relative_to(R).as_posix()):tree(P),str(O.relative_to(R).as_posix()):tree(O)},files={str((D/n).relative_to(R).as_posix()):dict(bytes=(D/n).stat().st_size,sha256=sha(D/n)) for n in ['HOST_CONTROL_REFUSAL.md','host-ready-refusal-own-ui.json','host-ready-refusal-native-status.json','read-only-host-prerequisites.json','installed-identity.json']})
(W/'predecessor-pins.json').write_bytes((json.dumps(pins,ensure_ascii=True,indent=2)+'\n').encode('utf-8'));(W/'expected-native-initial.json').write_bytes((D/'host-ready-refusal-native-status.json').read_bytes())
for n in ['host_base.py','host_session.py','pre_delivery.py','activate-host.py','delivery_in_one_tool.example.js.txt']:(W/n).write_bytes((P/n).read_bytes())
(W/'CHARTER.md').write_text('''# Host-only uppercase-control successor

Authorized correction: exact observed Android uppercase button selectors, new immutable helper/packet/output, original refused zero-effect attempt preserved. No APK/native/camera source/build/dependency/network/phone/ADB/capture/screenshot/Git/CI effects by builder. Main owns state and phone. This is a continuation of the original unused one-photo/two-screen allowance; no replay, reset, refund or replacement budget.

Use exact predecessor tree/file pins and exact same native SETTLED process/PID/geometry/event state with ready0/busyfalse/savedfalse/JPEG0 before allocating successor output and again before native READY. Refuse changed/extra predecessor files or unknown effects. Keep120/30/20/10 timing, fresh human READY after new PREPARED, actual main visual prequalification and one pre/photo/post thenSTOP. Focused actual supplied UI positive/negative lookups and zero-effect guard tests only. Preserve original helper/packet/intent/output bytes. STOP/release own lease/direct main handoff. Main retains installation/physical ownership.
''',encoding='utf-8')
print(json.dumps(dict(successor=str(W),predecessorTreeFiles=[len(x) for x in pins['trees'].values()],pinnedDeviceEvidence=len(pins['files']),lease=lease)))

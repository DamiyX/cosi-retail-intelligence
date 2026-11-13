"""Small fake-transport implementation smoke; independent regressions follow."""
from pathlib import Path
import importlib.util, json, sys, tempfile
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-main-implementation-20261027-a1'
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path)
 value=importlib.util.module_from_spec(spec);sys.modules[name]=value;spec.loader.exec_module(value)
 return value
c=module('controller',ROOT/'tools/scripts/camera-orientation-evidence-v3/controller_v3.py')
f=module('old_fake_fixture_definitions',ROOT/'tools/scripts/camera-orientation-evidence/test_controller.py')
class Phone(f.FakePhone):
 def __init__(self,clock):
  super().__init__(clock)
  self.state['marker'].update(geometryReady=True,generatedExportVerified=True,firstExportVerified=False)
 def tap(self,action,before_dispatch=None,deadline=None):
  assert deadline is None or self.clock.now()<deadline
  result=super().tap(action,before_dispatch)
  if action=='inspect':self.state['marker']['nonce']='c0000000-0000-4000-8000-000000000001'
  return result

results=[]
for mode in ('published','unknown','stale-native-age'):
 with tempfile.TemporaryDirectory() as temp:
  clock=f.Clock();phone=Phone(clock);phone.output=Path(temp)
  tail=c.CaptureTail(phone,f.packet(),temp,clock.now,clock.advance)
  ready=clock.now();sha=tail.prepare(ready)['sha256'];clock.advance(16)
  if mode=='unknown':phone.terminal_phase='UNKNOWN'
  if mode=='stale-native-age':tail.readiness['issuedStart']=clock.now()-132.078
  try: result=tail.run(ready,sha)
  except ValueError as error:result=str(error)
  if mode=='published':
   assert result=='PUBLISHED' and phone.events.count('capture')==1 and phone.events.count('close')==1
  elif mode=='unknown':
   assert result=='UNCONFIRMED' and phone.events.count('screenshot')==2 and 'close' not in phone.events
  else:
   assert result=='NATIVE_READINESS_STALE_OR_OTHER_READY' and 'capture' not in phone.events
  results.append(dict(case=mode,result=result,effects=[x for x in phone.events if x in ('inspect','ack','screenshot','capture','close')]))
receipt=OUT/'fake-smoke.json';assert not receipt.exists()
receipt.write_text(json.dumps(dict(noDeviceCalls=True,cases=results),indent=2)+'\n',encoding='utf-8')
print(json.dumps(results))

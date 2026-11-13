"""Create a separate reviewed-protocol candidate; preserves historical helpers."""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parents[2]
old=ROOT/'tools/scripts/camera-orientation-evidence/controller.py'
assert hashlib.sha256(old.read_bytes()).hexdigest()=='89257163307e476fcb0c243d6c69e4f9a7a222347cca2aa04ebea49e2580670a'
out=ROOT/'tools/scripts/camera-orientation-evidence-v3'
out.mkdir(exist_ok=False)
text=old.read_text(encoding='utf-8').replace('20261026-evidence-v2','20261027-readiness-v2')
text=text.replace('LABELS = {"ack":','LABELS = {"inspect": "Inspect new geometry run", "ack":',1)
text=text.replace('def tap(self, action, before_dispatch=None):','def tap(self, action, before_dispatch=None, deadline=None):',1)
start=text.index('    def tap(self, action, before_dispatch=None, deadline=None):')
end=text.index('    def screenshot(self):',start)
part=text[start:end].replace('self.observe()','self.observe(deadline=deadline)').replace('self._own_focus()','self._own_focus(deadline)').replace('str(y)], 8192)','str(y)], 8192, deadline)')
text=text[:start]+part+text[end:]
# Every subclass keeps packet/runtime run identities local to this module.
text=text.replace('UI = "/data/local/tmp/p203-evidence-capture-ui.xml"','UI = "/data/local/tmp/p203-readiness-capture-ui.xml"')
(out/'controller_v3.py').write_text(text,encoding='utf-8',newline='\n')
session=(ROOT/'tools/scripts/camera-orientation-evidence-v2/session.py').read_text(encoding='utf-8')
session=session.replace('controller_v2','controller_v3').replace('PROTOCOL, BASE_SHA','PROTOCOL').replace('            and packet.get("baseControllerSha256") == BASE_SHA\n','')
(out/'session.py').write_text(session,encoding='utf-8',newline='\n')
print('Separate V3 helper scaffold written; not executed on any device.')

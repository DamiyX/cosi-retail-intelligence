"""Create independent host-only regressions from preserved V3 scenarios."""
from pathlib import Path
R=Path(__file__).resolve().parents[2]
old=R/'tools/scripts/camera-orientation-evidence-v3/test_controller_v3.py'
new=R/'tools/scripts/camera-orientation-evidence-v4/test_controller_v4.py'
assert not new.exists()
text=old.read_text(encoding='utf-8').replace('import controller_v3 as c','import controller_v4 as c')
text=text.replace('        return copy.deepcopy(self.state)','        state = copy.deepcopy(self.state)\n        state["captureControlEnabled"] = "ack" in self.events\n        return state',1)
text=text.replace("'INSPECT_DID_NOT_ISSUE_NEW_NONCE'","'INSPECT_COMPLETION_NOT_OBSERVED'")
new.write_text(text,encoding='utf-8',newline='\n')
print('Preserved30 V3 scenarios copied; fake exposes ACK control and new bounded-wait error.')

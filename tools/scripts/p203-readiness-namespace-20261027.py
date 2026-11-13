"""Apply the finite planned namespace and exact old-empty-run retention changes."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
JAVA=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'

def edit(path, old, new, count=None):
 text=path.read_text(encoding='utf-8')
 assert old in text, (path.name,old)
 if count is not None: assert text.count(old)==count,(path.name,text.count(old),count)
 path.write_text(text.replace(old,new),encoding='utf-8',newline='\n')

for rel in [JAVA/'CameraOrientationPlan.java',JAVA/'CameraMatrixRecoveryPlan.java',
 ROOT/'apps/mobile/src/recognitionExperiment/cameraOrientationProof.ts',
 JAVA.parent.parent/'cpp/camera_proof_publish.c']:
 # cpp lives under src/main, rather than the Java package hierarchy.
 if rel.suffix=='.c': rel=JAVA.parents[3]/'cpp/camera_proof_publish.c'
 if '20261026-evidence-v2' in rel.read_text(encoding='utf-8'):
  edit(rel,'20261026-evidence-v2','20261027-readiness-v2')
 else: assert '20261027-readiness-v2' in rel.read_text(encoding='utf-8')
 if rel.name in ('CameraOrientationPlan.java','camera_proof_publish.c'):
  text=rel.read_text(encoding='utf-8')
  if 'camera-proof-orientation-evidence-v2' in text:
   rel.write_text(text.replace('camera-proof-orientation-evidence-v2','camera-proof-orientation-readiness-v2'),encoding='utf-8',newline='\n')

old=(JAVA/'CameraOrientationRetained.java').read_text(encoding='utf-8')
new=old.replace('CameraOrientationRetained','CameraOrientationEvidenceRetained')
for a,b in {
 'unused C2':'unused evidence-v2', '20261024-v2':'20261026-evidence-v2',
 'camera-proof-orientation-v2':'camera-proof-orientation-evidence-v2',
 '5df65a511d61d63cb798a7a844628a49d636306bb8a82b2967c8741282c19716':'7dd7a58bd8c08320d63efb91de8eb058184bb3b052574e18af09e945605d7376',
 'ba5cffdb4b143e89e2412637dc8670e3ece40090ba7493836801cb5f4a3710c2':'9b1fbf3eb755bdd4244d09003cd5d8a1e9d4571713dde63f03756c20a25dc896',
 '171420cd214e7fa87130ecd1378491d646e904c092de309d4524d43eb1911fc6':'c45216eb78bb29b58bc66b2c317172e7de49c60a5cf1b88b1e929d4b6546658f',
 '65e45bd27de6c2ef4f40073d32ede7c538a7b2c77910c0018828ec74a0d43b26':'0f17147380946fbcdc794e1f3721aea40eb968b66d105b765c6fe343201377aa',
 'RETAINED_ORIENTATION_':'RETAINED_EVIDENCE_ORIENTATION_',
 'ORIENTATION_RETAINED_':'ORIENTATION_EVIDENCE_RETAINED_',
}.items(): new=new.replace(a,b)
target=JAVA/'CameraOrientationEvidenceRetained.java'
assert not target.exists()
target.write_text(new,encoding='utf-8',newline='\n')
lane=JAVA/'CameraMatrixRecoveryPlan.java'
edit(lane,'    RETAINED_UI_ORIENTATION_FIRST(',
 '''    RETAINED_EVIDENCE_ORIENTATION_FIRST("camera-orientation-export-first-20261026-evidence-v2","p203-orientation-20261026-evidence-v2-first.zip",CameraOrientationPlan.OUTPUT,1),
    RETAINED_EVIDENCE_ORIENTATION_FINAL("camera-orientation-export-final-20261026-evidence-v2","p203-orientation-20261026-evidence-v2-final.zip",CameraOrientationPlan.OUTPUT,8),
    RETAINED_EVIDENCE_ORIENTATION_FIXTURE("camera-orientation-export-fixture-20261026-evidence-v2","p203-orientation-20261026-evidence-v2-fixture.zip",64*1024,-1),
    RETAINED_UI_ORIENTATION_FIRST(''',1)
edit(lane,'    public boolean retainedUi()', '    public boolean retainedEvidence(){return name().startsWith("RETAINED_EVIDENCE_");}\n    public boolean retainedUi()',1)
edit(lane,'return retainedUi()?name().substring(12):', 'return retainedEvidence()?name().substring(18):retainedUi()?name().substring(12):',1)
edit(lane,'return retainedUi()?CameraOrientationUiRetained.RUN:', 'return retainedEvidence()?CameraOrientationEvidenceRetained.RUN:retainedUi()?CameraOrientationUiRetained.RUN:',1)
files=JAVA/'CameraOrientationFiles.java'
edit(files,'      return retained;', '''      retained=Math.addExact(retained,CameraOrientationEvidenceRetained.emptyClaims(parent,delegate));
      CameraMatrixRecoveryPlan.Lane evidence=CameraMatrixRecoveryPlan.Lane.RETAINED_EVIDENCE_ORIENTATION_FIXTURE;
      File evidenceRoot=delegate.recoveryRoot(evidence,false);
      CameraProofFrame.require(evidenceRoot!=null,"ORIENTATION_EVIDENCE_RETAINED_FIXTURE_REQUIRED");
      try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(evidence,evidenceRoot,false)){
        for(android.content.UriPermission grant:context.getContentResolver().getPersistedUriPermissions())CameraProofFrame.require(!CameraMatrixRecoveryPlan.fixedUri(evidence,grant.getUri().toString()),"ORIENTATION_EVIDENCE_RETAINED_FIXTURE_GRANT");
        CameraMatrixRecoveryStore oldStore=new CameraMatrixRecoveryStore(evidenceRoot,delegate,evidence,lock,CameraOrientationEvidenceRetained.SOURCE,CameraOrientationEvidenceRetained.APK);
        retained=Math.addExact(retained,CameraOrientationEvidenceRetained.settledFixtureClaims(evidenceRoot,delegate,oldStore));
      }
      return retained;''',1)
# A new freeze is produced only after regression review; the current source is
# deliberately disabled rather than falsely claiming the installed build's pin.
edit(JAVA/'CameraOrientationSource.java','7dd7a58bd8c08320d63efb91de8eb058184bb3b052574e18af09e945605d7376','0'*64,1)
print('Finite namespace/retention source changes applied; source pin intentionally disabled.')

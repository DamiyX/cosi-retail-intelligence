"""Exercise entry validation with TWO synthetic hash pins in an isolated source copy only."""
import hashlib, json, os, pathlib, subprocess
from importlib.machinery import SourceFileLoader

R = pathlib.Path(__file__).resolve().parents[2]
checks = SourceFileLoader('c9_checks', str(R / 'tools/scripts/phone-camera-export-c9-checks.py')).load_module()
W, M, J = checks.W, checks.M, checks.J


def main():
    checks.live(); out = W / 'f1'; out.mkdir(); receipts = []
    # Same generated JPEG header fixture as CameraProofChecks.jpeg(3,2,6); no decoder/pixels.
    header = [255,216,255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0,255,192,0,17,8,0,2,0,3,3,1,17,0,2,17,0,3,17,0,255,218,0,2,0,255,217]
    raw, preview = bytes(header), b'generated-preview-header-test-only'
    digest = lambda b: hashlib.sha256(b).hexdigest()
    source = (M / 'CameraEvidenceExport.java').read_text()
    actual = json.loads((W / 'capture-profile.json').read_text())
    replaced = source
    for name, original, generated in [('JPEG', actual['jpegSha256'], digest(raw)), ('PREVIEW', actual['previewSha256'], digest(preview))]:
        before = 'public static final String ' + name + '="' + original + '";'
        after = 'public static final String ' + name + '="' + generated + '";'
        assert replaced.count(before) == 1
        replaced = replaced.replace(before, after)
    restored = replaced.replace('JPEG="' + digest(raw) + '"', 'JPEG="' + actual['jpegSha256'] + '"').replace('PREVIEW="' + digest(preview) + '"', 'PREVIEW="' + actual['previewSha256'] + '"')
    assert restored == source
    (out / 'CameraEvidenceExport.java').write_text(replaced, encoding='utf-8')
    (out / 'fixture-binding.json').write_text(json.dumps(dict(kind='GENERATED_ONLY_TWO_HASH_PIN_COPY_NOT_PRODUCTION_OR_ORIGINAL_PHOTO', productionSourceSha256=digest(source.encode()), generatedSourceSha256=digest(replaced.encode()), onlyPinsReplaced=['JPEG', 'PREVIEW'], generatedJpegSha256=digest(raw), generatedPreviewSha256=digest(preview), actualPrivateOriginalRead=False), indent=2)+'\n', encoding='utf-8')
    test = r'''package expo.modules.recognitioncpu;
import java.util.*;import java.nio.charset.StandardCharsets;
public final class C9FixtureChecks {
 static int count;static byte[] utf(String s){return s.getBytes(StandardCharsets.UTF_8);}
 static void ok(boolean b){count++;if(!b)throw new AssertionError("fixture assertion");}
 interface Work{void run()throws Exception;}
 static void refuses(String code,Work w)throws Exception{try{w.run();throw new AssertionError("missing "+code);}catch(IllegalArgumentException e){ok(e.getMessage().equals("CAMERA_EXPORT_"+code));}}
 static Map<String,byte[]> saved()throws Exception{
  Map<String,byte[]> m=new LinkedHashMap<>();for(String role:CameraEvidenceExport.ROLES)m.put(role,utf("generated-"+role));
  m.put("raw.jpg",CameraProofChecks.jpeg(3,2,6));m.put("preview.png",utf("generated-preview-header-test-only"));
  String n="{\"jobId\":\""+CameraEvidenceExport.JOB+"\",\"jpegSha256\":\""+CameraEvidenceExport.JPEG+"\",\"previewSha256\":\""+CameraEvidenceExport.PREVIEW+"\",\"sourceSha256\":\""+"a".repeat(64)+"\",\"modelSha256\":\""+CameraProofFrame.MODEL+"\",\"recipe\":\""+CameraProofFrame.RECIPE+"\",\"geometryStatus\":\"INCONCLUSIVE\",\"cameraProofAccepted\":false,\"width\":3,\"height\":2,\"orientation\":6,\"jpegBytes\":"+m.get("raw.jpg").length+"}";
  m.put("numerical.json",utf(n));m.put("receipt.json",utf(n));m.put("request.json",utf("{\"sourceSha256\":\""+"a".repeat(64)+"\"}"));m.put("reservation",utf("a".repeat(64)+"\ngenerated\n"));return m;
 }
 public static void main(String[] args)throws Exception{
  Map<String,byte[]> s=saved();Map<String,byte[]> out=CameraEvidenceExport.entries(s,"d".repeat(64),"e".repeat(64));ok(out.size()==9);
  for(String role:CameraEvidenceExport.ROLES)ok(Arrays.equals(s.get(role),out.get(role)));
  Map<String,Object> manifest=PhonePortabilityJson.object(PhonePortabilityJson.parse(out.get("manifest.json")));
  ok(manifest.get("captureApkSha256").equals(CameraEvidenceExport.CAPTURE_APK)&&manifest.get("captureSourceIndexSha256").equals(CameraEvidenceExport.CAPTURE_SOURCE));
  ok(manifest.get("exporterApkSha256").equals("e".repeat(64))&&manifest.get("exporterSourceIndexSha256").equals("d".repeat(64)));
  ok(manifest.get("geometryStatus").equals("INCONCLUSIVE"));
  CameraEvidenceC9Checks.Target target=new CameraEvidenceC9Checks.Target();CameraEvidenceExport.writeSaved(out,target,()->false);ok(target.size()>0&&target.size()<1048576);
  for(String job:new String[]{CameraEvidenceC9.LEGACY_JOB,"76d28e3f-cdcd-4d1a-a86e-026e2568ce5e","a9d4ffa8-85cc-4145-bc5c-31a57a327f09","78cf411b-25e1-4dc2-ac8d-80caaacb2de6"}){
   Map<String,byte[]> bad=saved();String n=new String(bad.get("numerical.json"),StandardCharsets.UTF_8).replace(CameraEvidenceExport.JOB,job);bad.put("numerical.json",utf(n));bad.put("receipt.json",utf(n));refuses("RECEIPT_BINDING",()->CameraEvidenceExport.entries(bad,"d".repeat(64),"e".repeat(64)));
  }
  for(String role:new String[]{"raw.jpg","preview.png"}){Map<String,byte[]> bad=saved();bad.get(role)[0]^=1;refuses("ORIGINAL_HASH",()->CameraEvidenceExport.entries(bad,"d".repeat(64),"e".repeat(64)));}
  for(String pin:new String[]{CameraEvidenceExport.JPEG,CameraEvidenceExport.PREVIEW}){Map<String,byte[]> bad=saved();String n=new String(bad.get("numerical.json"),StandardCharsets.UTF_8).replace(pin,"b".repeat(64));bad.put("numerical.json",utf(n));bad.put("receipt.json",utf(n));refuses("RECEIPT_BINDING",()->CameraEvidenceExport.entries(bad,"d".repeat(64),"e".repeat(64)));}
  Map<String,byte[]> owner=saved();owner.put("request.json",utf("{\"sourceSha256\":\""+"c".repeat(64)+"\"}"));refuses("OWNER_BINDING",()->CameraEvidenceExport.entries(owner,"d".repeat(64),"e".repeat(64)));
  Map<String,byte[]> extra=saved();extra.put("../other",utf("wrong"));refuses("ALLOWLIST",()->CameraEvidenceExport.entries(extra,"d".repeat(64),"e".repeat(64)));
  System.out.println("C9FixtureChecks assertions="+count+"; TWO GENERATED HASH PINS IN ISOLATED COPY; not original-photo validation");
 }
}'''
    (out / 'C9FixtureChecks.java').write_text(test, encoding='utf-8')
    for args in [[J/'javac.exe', '-Xlint:all', '-cp', W/'h1/classes', '-d', out/'classes', out/'CameraEvidenceExport.java', out/'C9FixtureChecks.java'],
                 [J/'java.exe', '-cp', os.pathsep.join([str(out/'classes'), str(W/'h1/classes')]), 'expo.modules.recognitioncpu.C9FixtureChecks']]:
        checks.live(); p=subprocess.run([str(a) for a in args], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
        receipts.append(dict(command=[str(a) for a in args],exitCode=p.returncode,stdout=p.stdout,stderr=p.stderr))
        (out/'result.json').write_text(json.dumps(receipts,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(receipts[-1]),flush=True)
        if p.returncode:raise SystemExit(p.returncode)


if __name__=='__main__':
    main()

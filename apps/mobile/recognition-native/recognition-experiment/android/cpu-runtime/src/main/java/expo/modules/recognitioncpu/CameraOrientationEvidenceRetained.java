package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Read-only retirement gate for exactly the unused evidence-v2 camera namespace. Never adopts a job. */
public final class CameraOrientationEvidenceRetained {
  private CameraOrientationEvidenceRetained(){}
  public static final String RUN="p203-orientation-20261026-evidence-v2",ROOT="camera-orientation-20261026-evidence-v2",CAMERA="camera-proof-orientation-evidence-v2";
  public static final String SOURCE="7dd7a58bd8c08320d63efb91de8eb058184bb3b052574e18af09e945605d7376",APK="9b1fbf3eb755bdd4244d09003cd5d8a1e9d4571713dde63f03756c20a25dc896";
  public static final String FIXTURE_SHA="c45216eb78bb29b58bc66b2c317172e7de49c60a5cf1b88b1e929d4b6546658f",INPUTS="0f17147380946fbcdc794e1f3721aea40eb968b66d105b765c6fe343201377aa";
  static byte[] cameraOwner(){return bytes("CAMERA_PROOF_OWNED_V2\n"+SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n");}
  static byte[] runOwner(){return bytes(json(map("run",RUN,"source",SOURCE,"apk",APK,"model",CameraProofFrame.MODEL,"recipe",CameraOrientationGeometry.RECIPE,"profileVersion",2)));}
  static byte[] registry(){
    List<Object> rows=new ArrayList<>();for(CameraOrientationPlan.Case c:CameraOrientationPlan.CASES)rows.add(map("caseId",c.id,"jobId",UUID.nameUUIDFromBytes((RUN+":"+c.id).getBytes(StandardCharsets.UTF_8)).toString(),"targetSha256",c.target,"layout",c.layout,"sdkLimit",1));
    Map<String,Object> payload=map("run",RUN,"cases",rows,"profileVersion",2,"recipe",CameraOrientationGeometry.RECIPE,"jpegLimit",CameraMatrixPlan.JPEG,"sharedOutputLimit",CameraOrientationPlan.OUTPUT,"automaticRetakes",0);
    Map<String,Object> base=map("name","registry","ownerSha256",CameraProofFrame.hash(runOwner()),"payload",payload);Map<String,Object> record=new TreeMap<>(base);record.put("digest",CameraProofFrame.hash(bytes(json(base))));return bytes(json(record));
  }
  private static long exact(File root,CameraProofStore.IO io,String name,byte[] expected)throws Exception{
    File file=new File(root,name);require(io.size(file)==expected.length&&Arrays.equals(io.read(file,expected.length),expected),"ORIENTATION_EVIDENCE_RETAINED_BINDING");return expected.length;
  }
  public static long emptyClaims(File parent,CameraProofStore.IO io)throws Exception{
    Set<String> roots=new HashSet<>(io.list(parent));
    require(!roots.contains(CameraMatrixRecoveryPlan.Lane.RETAINED_EVIDENCE_ORIENTATION_FIRST.root)&&!roots.contains(CameraMatrixRecoveryPlan.Lane.RETAINED_EVIDENCE_ORIENTATION_FINAL.root),"ORIENTATION_EVIDENCE_RETAINED_EXPORT_CONSUMED");
    long claimed=0;
    if(roots.contains(CAMERA)){
      File root=new File(parent,CAMERA);require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("owner","refusals"))),"ORIENTATION_EVIDENCE_RETAINED_CAPTURE_CONSUMED");io.syncDirectory(root);
      claimed=Math.addExact(claimed,exact(root,io,"owner",cameraOwner()));File refusals=new File(root,"refusals");require(io.size(refusals)==CameraProofStore.REFUSALS,"ORIENTATION_EVIDENCE_RETAINED_REFUSALS");CameraProofStore.validateRefusals(io.read(refusals,CameraProofStore.REFUSALS));claimed=Math.addExact(claimed,CameraProofStore.REFUSALS);
    }
    if(roots.contains(ROOT)){
      File root=new File(parent,ROOT);require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("owner","registry"))),"ORIENTATION_EVIDENCE_RETAINED_CASE_CONSUMED");io.syncDirectory(root);claimed=Math.addExact(claimed,exact(root,io,"owner",runOwner()));claimed=Math.addExact(claimed,exact(root,io,"registry",registry()));
    }
    return claimed;
  }
  /** Caller holds the actual OS recovery lock; the immutable old chain is validated by the store. */
  public static long settledFixtureClaims(File root,CameraProofStore.IO io,CameraMatrixRecoveryStore store)throws Exception{
    require(root.getName().equals(CameraMatrixRecoveryPlan.Lane.RETAINED_EVIDENCE_ORIENTATION_FIXTURE.root)&&store.state().equals("TERMINAL"),"ORIENTATION_EVIDENCE_RETAINED_FIXTURE_UNSETTLED");
    Map<String,Object> owner=store.payload("owner"),terminal=store.payload("terminal"),result=PhonePortabilityJson.object(terminal.get("result"));
    require(SOURCE.equals(owner.get("exporterSource"))&&APK.equals(owner.get("exporterApk"))&&INPUTS.equals(owner.get("inputs"))&&"READBACK_VERIFIED".equals(terminal.get("status"))&&number(result.get("bytes"),1,65536)==2796&&FIXTURE_SHA.equals(result.get("sha256")),"ORIENTATION_EVIDENCE_RETAINED_FIXTURE_BINDING");
    long claimed=2796;for(String name:io.list(root))claimed=Math.addExact(claimed,io.size(new File(root,name)));require(claimed<=2796+CameraMatrixRecoveryPlan.JOURNAL,"ORIENTATION_EVIDENCE_RETAINED_FIXTURE_CAP");return claimed;
  }
}

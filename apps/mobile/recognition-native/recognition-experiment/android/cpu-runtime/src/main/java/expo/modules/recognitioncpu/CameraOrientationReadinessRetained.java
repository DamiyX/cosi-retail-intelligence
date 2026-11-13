package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Read-only retirement gate for exactly the unused readiness-v2 camera namespace. Never adopts a job. */
public final class CameraOrientationReadinessRetained {
  private CameraOrientationReadinessRetained(){}
  public static final String RUN="p203-orientation-20261027-readiness-v2",ROOT="camera-orientation-20261027-readiness-v2",CAMERA="camera-proof-orientation-readiness-v2";
  public static final String SOURCE="3aeff06cadd724ddd7be4a8085613392fac8cde7c9cdf2a212d08351e5662b66",APK="0055ef13bbd18d363ccc6a00c4cee97925e2cef45dbb5ac0ab8a5685584eaefa";
  public static final String FIXTURE_SHA="b9991e85b14ecd87f868bfa888e59178830f366c84fd4b20c0963fa9e70b5ff8",INPUTS="7724e9d7bea782f8ee4e8c0f2a430f3ec65f7d596b5dc3e037f38d87330283a9";
  static byte[] cameraOwner(){return bytes("CAMERA_PROOF_OWNED_V2\n"+SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n");}
  static byte[] runOwner(){return bytes(json(map("run",RUN,"source",SOURCE,"apk",APK,"model",CameraProofFrame.MODEL,"recipe",CameraOrientationGeometry.RECIPE,"profileVersion",2)));}
  static byte[] registry(){
    List<Object> rows=new ArrayList<>();for(CameraOrientationPlan.Case c:CameraOrientationPlan.CASES)rows.add(map("caseId",c.id,"jobId",UUID.nameUUIDFromBytes((RUN+":"+c.id).getBytes(StandardCharsets.UTF_8)).toString(),"targetSha256",c.target,"layout",c.layout,"sdkLimit",1));
    Map<String,Object> payload=map("run",RUN,"cases",rows,"profileVersion",2,"recipe",CameraOrientationGeometry.RECIPE,"jpegLimit",CameraMatrixPlan.JPEG,"sharedOutputLimit",CameraOrientationPlan.OUTPUT,"automaticRetakes",0);
    Map<String,Object> base=map("name","registry","ownerSha256",CameraProofFrame.hash(runOwner()),"payload",payload);Map<String,Object> record=new TreeMap<>(base);record.put("digest",CameraProofFrame.hash(bytes(json(base))));return bytes(json(record));
  }
  private static long exact(File root,CameraProofStore.IO io,String name,byte[] expected)throws Exception{
    File file=new File(root,name);require(io.size(file)==expected.length&&Arrays.equals(io.read(file,expected.length),expected),"ORIENTATION_READINESS_RETAINED_BINDING");return expected.length;
  }
  public static long emptyClaims(File parent,CameraProofStore.IO io)throws Exception{
    Set<String> roots=new HashSet<>(io.list(parent));
    require(roots.contains(CAMERA),"ORIENTATION_READINESS_RETAINED_CAMERA_REQUIRED");
    require(!roots.contains(CameraMatrixRecoveryPlan.Lane.RETAINED_READINESS_ORIENTATION_FIRST.root)&&!roots.contains(CameraMatrixRecoveryPlan.Lane.RETAINED_READINESS_ORIENTATION_FINAL.root),"ORIENTATION_READINESS_RETAINED_EXPORT_CONSUMED");
    long claimed=0;
    if(roots.contains(CAMERA)){
      File root=new File(parent,CAMERA);require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("owner","refusals"))),"ORIENTATION_READINESS_RETAINED_CAPTURE_CONSUMED");io.syncDirectory(root);
      claimed=Math.addExact(claimed,exact(root,io,"owner",cameraOwner()));File refusals=new File(root,"refusals");require(io.size(refusals)==CameraProofStore.REFUSALS,"ORIENTATION_READINESS_RETAINED_REFUSALS");CameraProofStore.validateRefusals(io.read(refusals,CameraProofStore.REFUSALS));claimed=Math.addExact(claimed,CameraProofStore.REFUSALS);
    }
    if(roots.contains(ROOT)){
      File root=new File(parent,ROOT);require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("owner","registry"))),"ORIENTATION_READINESS_RETAINED_CASE_CONSUMED");io.syncDirectory(root);claimed=Math.addExact(claimed,exact(root,io,"owner",runOwner()));claimed=Math.addExact(claimed,exact(root,io,"registry",registry()));
    }
    return claimed;
  }
  /** Caller holds the actual OS recovery lock; the immutable old chain is validated by the store. */
  public static long settledFixtureClaims(File root,CameraProofStore.IO io,CameraMatrixRecoveryStore store)throws Exception{
    require(root.getName().equals(CameraMatrixRecoveryPlan.Lane.RETAINED_READINESS_ORIENTATION_FIXTURE.root)&&store.state().equals("TERMINAL"),"ORIENTATION_READINESS_RETAINED_FIXTURE_UNSETTLED");
    Map<String,Object> owner=store.payload("owner"),terminal=store.payload("terminal"),result=PhonePortabilityJson.object(terminal.get("result"));
    require(SOURCE.equals(owner.get("exporterSource"))&&APK.equals(owner.get("exporterApk"))&&INPUTS.equals(owner.get("inputs"))&&"READBACK_VERIFIED".equals(terminal.get("status"))&&number(result.get("bytes"),1,65536)==2796&&FIXTURE_SHA.equals(result.get("sha256")),"ORIENTATION_READINESS_RETAINED_FIXTURE_BINDING");
    long claimed=2796;for(String name:io.list(root))claimed=Math.addExact(claimed,io.size(new File(root,name)));require(claimed<=2796+CameraMatrixRecoveryPlan.JOURNAL,"ORIENTATION_READINESS_RETAINED_FIXTURE_CAP");return claimed;
  }
}

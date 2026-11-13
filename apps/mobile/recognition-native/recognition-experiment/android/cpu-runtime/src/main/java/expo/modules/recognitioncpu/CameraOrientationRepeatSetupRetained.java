package expo.modules.recognitioncpu;
import java.io.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Read-only source753 initialization residue; staged owner is never completed or adopted. */
public final class CameraOrientationRepeatSetupRetained {
  private CameraOrientationRepeatSetupRetained(){}
  public static final String RUN="p203-m00-repeat-20261029-a1",ROOT="camera-orientation-m00-repeat-20261029-a1",CAMERA="camera-proof-m00-repeat-20261029-a1";
  public static final String SOURCE="02ef19a2d3bfc36d4df9c420b96bdd4133423e98a56bb4bb1d3e5ec6447609ab",APK="33637edb7c7afca1e778eea681fd32cc14e35bcc74eb7a8bcc604f527d3b063c";
  public static final String JOB="626a0912-65af-3d6b-be11-09f63d294bf8",INPUTS="d4f8c1180451a2ef918be7b46410453c30456fa0b9c6c7cb3cb9898406177670";
  public static final long BOOK=256L*1024;
  static byte[] cameraOwner(){return bytes("CAMERA_PROOF_OWNED_V2\n"+SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n");}
  static byte[] runOwner(){return bytes(json(map("run",RUN,"source",SOURCE,"apk",APK,"model",CameraProofFrame.MODEL,"recipe",CameraOrientationGeometry.RECIPE,"profileVersion",2)));}
  static byte[] registry(){
    CameraOrientationPlan.Case c=CameraOrientationPlan.CASES.get(0);
    Map<String,Object> payload=map("run",RUN,"cases",Arrays.asList(map("caseId",c.id,"jobId",JOB,"targetSha256",c.target,"layout",c.layout,"sdkLimit",1)),"profileVersion",2,"recipe",CameraOrientationGeometry.RECIPE,"jpegLimit",CameraMatrixPlan.JPEG,"sharedOutputLimit",16*1024*1024,"automaticRetakes",0);
    Map<String,Object> base=map("name","registry","ownerSha256",CameraProofFrame.hash(runOwner()),"payload",payload);Map<String,Object> result=new TreeMap<>(base);result.put("digest",CameraProofFrame.hash(bytes(json(base))));return bytes(json(result));
  }
  private static void exact(File root,CameraProofStore.IO io,String name,byte[] expected)throws Exception{
    File f=new File(root,name);require(io.size(f)==expected.length&&Arrays.equals(io.read(f,expected.length),expected),"REPEAT753_RETAINED_BINDING");
  }
  static void ownerRecord(byte[] raw)throws Exception{
    Map<String,Object> envelope=parse(raw,CameraMatrixRecoveryPlan.RECORD);keys(envelope,"step","previous","owner","payload","digest");
    require("owner".equals(envelope.get("step"))&&CameraMatrixRecoveryPlan.ZERO.equals(envelope.get("previous"))&&CameraMatrixRecoveryPlan.ZERO.equals(envelope.get("owner")),"REPEAT753_OWNER_STAGE");
    Map<String,Object> base=new TreeMap<>(envelope);Object digest=base.remove("digest");
    require(CameraProofFrame.hash(bytes(json(base))).equals(digest)&&Arrays.equals(raw,bytes(json(envelope))),"REPEAT753_OWNER_DIGEST");
    Map<String,Object> p=PhonePortabilityJson.object(envelope.get("payload"));keys(p,"lane","run","captureSource","captureApk","exporterSource","exporterApk","serializer","inputs","operation");
    require("ORIENTATION_FIXTURE".equals(p.get("lane"))&&RUN.equals(p.get("run"))&&SOURCE.equals(p.get("captureSource"))&&SOURCE.equals(p.get("exporterSource"))&&APK.equals(p.get("captureApk"))&&APK.equals(p.get("exporterApk"))
      &&CameraMatrixRecoveryPlan.SERIALIZER.equals(p.get("serializer"))&&INPUTS.equals(p.get("inputs")),"REPEAT753_OWNER_BINDING");uuid(p.get("operation"));
  }
  /** Caller holds the existing old fixture OS lock. Unknown/torn/consumed states refuse. */
  public static long claims(File parent,CameraProofStore.IO io)throws Exception{
    Set<String> roots=new HashSet<>(io.list(parent));
    CameraMatrixRecoveryPlan.Lane first=CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIRST,last=CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FINAL,fixture=CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE;
    Set<String> allowed=new HashSet<>(Arrays.asList(ROOT,CAMERA,fixture.root));
    for(String name:roots){
      require(!name.startsWith(first.root)&&!name.startsWith(last.root),"REPEAT753_EXPORT_CONSUMED");
      if(name.startsWith(ROOT)||name.startsWith(CAMERA)||name.startsWith(fixture.root))require(allowed.contains(name),"REPEAT753_UNKNOWN_ROOT");
    }
    File camera=new File(parent,CAMERA);require(roots.contains(CAMERA)&&new HashSet<>(io.list(camera)).equals(new HashSet<>(Arrays.asList("owner","refusals"))),"REPEAT753_CAPTURE_OR_UNKNOWN");
    io.syncDirectory(camera);exact(camera,io,"owner",cameraOwner());File refusals=new File(camera,"refusals");require(io.size(refusals)==CameraProofStore.REFUSALS,"REPEAT753_REFUSALS");CameraProofStore.validateRefusals(io.read(refusals,CameraProofStore.REFUSALS));
    if(roots.contains(ROOT)){
      File run=new File(parent,ROOT);require(new HashSet<>(io.list(run)).equals(new HashSet<>(Arrays.asList("owner","registry"))),"REPEAT753_RUN_CONSUMED_OR_TORN");io.syncDirectory(run);exact(run,io,"owner",runOwner());exact(run,io,"registry",registry());
    }
    require(roots.contains(fixture.root),"REPEAT753_FIXTURE_ROOT_REQUIRED");File old=new File(parent,fixture.root);Set<String> names=new HashSet<>(io.list(old));
    require(names.equals(Collections.singleton("lock"))||names.equals(new HashSet<>(Arrays.asList("lock","owner")))||names.equals(new HashSet<>(Arrays.asList("lock","owner.new"))),"REPEAT753_FIXTURE_CONSUMED_OR_UNKNOWN");
    io.syncDirectory(old);require(io.size(new File(old,"lock"))==0,"REPEAT753_LOCK");
    if(names.contains("owner"))ownerRecord(io.read(new File(old,"owner"),CameraMatrixRecoveryPlan.RECORD));
    if(names.contains("owner.new"))ownerRecord(io.read(new File(old,"owner.new"),CameraMatrixRecoveryPlan.RECORD));
    // Keep the entire consumed book/fixture allowance, not merely the few visible bytes.
    require(CameraOrientationStore.JOURNAL+64L*1024+3L*CameraMatrixRecoveryPlan.JOURNAL<=BOOK,"REPEAT753_BOOK_CAP");
    return Math.addExact(cameraOwner().length+(long)CameraProofStore.REFUSALS,BOOK);
  }
}

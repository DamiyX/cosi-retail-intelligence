package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Exact abandoned preview-v3 selection. Read-only; no inferred private-record hashes or refunds. */
public final class CameraOrientationPreviewRetained {
  private CameraOrientationPreviewRetained(){}
  public static final String RUN="p203-orientation-20261027-preview-v3",ROOT="camera-orientation-20261027-preview-v3",CAMERA="camera-proof-orientation-preview-v3";
  public static final String SOURCE="12b2e028ca2a868aca86d0f7d82c232fed54033270052dba7adffbea3dc2beed",APK="33a4f08ff67706f8d0016c60ce17b33f303f8b41b091e82c19ee3a320d5f48a3";
  public static final String FIXTURE_SHA="08fa9b3baed2dd3b73cd4ba5a483f73f7764f0f0272aafc9a8f302fba039b014",INPUTS="1abd9a9a7c184823d7a97a9acb03467b78dfa25bcd4b379ffc337ef5f50cb20e";
  public static final String PROCESS="0120f4aa-9aeb-454e-b7ba-9640b94f4b8c";
  public static final long CONSUMED_ALLOWANCE=64L*1024+CameraMatrixRecoveryPlan.JOURNAL;
  static byte[] cameraOwner(){return bytes("CAMERA_PROOF_OWNED_V2\n"+SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n");}
  static byte[] runOwner(){return bytes(json(map("run",RUN,"source",SOURCE,"apk",APK,"model",CameraProofFrame.MODEL,"recipe",CameraOrientationGeometry.RECIPE,"profileVersion",2)));}
  static byte[] registry(){
    List<Object> rows=new ArrayList<>();for(CameraOrientationPlan.Case c:CameraOrientationPlan.CASES)rows.add(map("caseId",c.id,"jobId",UUID.nameUUIDFromBytes((RUN+":"+c.id).getBytes(StandardCharsets.UTF_8)).toString(),"targetSha256",c.target,"layout",c.layout,"sdkLimit",1));
    Map<String,Object> payload=map("run",RUN,"cases",rows,"profileVersion",2,"recipe",CameraOrientationGeometry.RECIPE,"jpegLimit",CameraMatrixPlan.JPEG,"sharedOutputLimit",CameraOrientationPlan.OUTPUT,"automaticRetakes",0);
    Map<String,Object> base=map("name","registry","ownerSha256",CameraProofFrame.hash(runOwner()),"payload",payload);Map<String,Object> record=new TreeMap<>(base);record.put("digest",CameraProofFrame.hash(bytes(json(base))));return bytes(json(record));
  }
  private static long exact(File root,CameraProofStore.IO io,String name,byte[] expected)throws Exception{
    File file=new File(root,name);require(io.size(file)==expected.length&&Arrays.equals(io.read(file,expected.length),expected),"ORIENTATION_PREVIEW_RETAINED_BINDING");return expected.length;
  }
  public static long emptyClaims(File parent,CameraProofStore.IO io)throws Exception{
    Set<String> roots=new HashSet<>(io.list(parent));
    // Inspect initializes the camera store, but open(false) leaves an unstarted run absent.
    // A present run must still be the exact owned, empty journal; never create it here.
    require(roots.contains(CAMERA),"ORIENTATION_PREVIEW_RETAINED_CAMERA_REQUIRED");
    require(!roots.contains(CameraMatrixRecoveryPlan.Lane.RETAINED_PREVIEW_ORIENTATION_FIRST.root)&&!roots.contains(CameraMatrixRecoveryPlan.Lane.RETAINED_PREVIEW_ORIENTATION_FINAL.root),"ORIENTATION_PREVIEW_RETAINED_EXPORT_CONSUMED");
    long claimed=0;
    if(roots.contains(CAMERA)){
      File root=new File(parent,CAMERA);require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("owner","refusals"))),"ORIENTATION_PREVIEW_RETAINED_CAPTURE_CONSUMED");io.syncDirectory(root);
      claimed=Math.addExact(claimed,exact(root,io,"owner",cameraOwner()));File refusals=new File(root,"refusals");require(io.size(refusals)==CameraProofStore.REFUSALS,"ORIENTATION_PREVIEW_RETAINED_REFUSALS");CameraProofStore.validateRefusals(io.read(refusals,CameraProofStore.REFUSALS));claimed=Math.addExact(claimed,CameraProofStore.REFUSALS);
    }
    if(roots.contains(ROOT)){
      File root=new File(parent,ROOT);require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("owner","registry"))),"ORIENTATION_PREVIEW_RETAINED_CASE_CONSUMED");io.syncDirectory(root);claimed=Math.addExact(claimed,exact(root,io,"owner",runOwner()));claimed=Math.addExact(claimed,exact(root,io,"registry",registry()));
    }
    return claimed;
  }
  public static void rejectGrant(String uri){
    for(CameraMatrixRecoveryPlan.Lane lane:new CameraMatrixRecoveryPlan.Lane[]{CameraMatrixRecoveryPlan.Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE,CameraMatrixRecoveryPlan.Lane.RETAINED_PREVIEW_ORIENTATION_FIRST,CameraMatrixRecoveryPlan.Lane.RETAINED_PREVIEW_ORIENTATION_FINAL})require(!CameraMatrixRecoveryPlan.fixedUri(lane,uri),"ORIENTATION_PREVIEW_RETAINED_GRANT");
  }
  /** Caller holds the existing OS lock. Physical record hashes are observed at runtime, not guessed. */
  public static Map<String,Object> pendingSnapshot(File root,CameraProofStore.IO io,CameraMatrixRecoveryStore store)throws Exception{
    require(root.getName().equals(CameraMatrixRecoveryPlan.Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE.root)&&store.state().equals("SELECTION"),"ORIENTATION_PREVIEW_RETAINED_NOT_SELECTION");
    require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("lock","owner","selection"))),"ORIENTATION_PREVIEW_RETAINED_LEAVES");
    Map<String,Object> owner=store.payload("owner"),selection=store.payload("selection");
    require(SOURCE.equals(owner.get("exporterSource"))&&APK.equals(owner.get("exporterApk"))&&INPUTS.equals(owner.get("inputs"))&&PROCESS.equals(selection.get("process")),"ORIENTATION_PREVIEW_RETAINED_BINDING");
    long actual=0;for(String name:io.list(root))actual=Math.addExact(actual,io.size(new File(root,name)));
    require(actual<=CameraMatrixRecoveryPlan.JOURNAL,"ORIENTATION_PREVIEW_RETAINED_JOURNAL_CAP");
    return map("run",RUN,"source",SOURCE,"apk",APK,"state","SELECTION","writeConsumed",false,"ownerSha256",store.recordHash("owner"),"selectionSha256",store.recordHash("selection"),"operation",owner.get("operation"),"selection",selection.get("selection"),"selectionProcess",PROCESS,"actualJournalBytes",actual,"permanentAllowanceBytes",CONSUMED_ALLOWANCE,"incomplete",true);
  }
}

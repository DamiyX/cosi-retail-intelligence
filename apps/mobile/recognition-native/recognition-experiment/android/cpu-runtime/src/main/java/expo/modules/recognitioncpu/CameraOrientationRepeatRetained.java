package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Exact source750 pending snapshot. No recovery, promotion, image readout or writable old IO. */
public final class CameraOrientationRepeatRetained {
  private CameraOrientationRepeatRetained(){}
  public static final String RUN="p203-orientation-20261028-preview-v4",ROOT="camera-orientation-20261028-preview-v4",CAMERA="camera-proof-orientation-preview-v4";
  public static final String SOURCE="f9b49a9d7f20d7f4da86b46e6a91b06cfd6f65cc66db8502a1c2344b0ab9bd27",APK="4649de1d72aab95d108e77af45098ef5aa3b1b23b23308729f4f87c30071de71";
  public static final String JOB="6a28812d-494d-3361-b35e-9238c00afaaf",CASE="M00-A000";
  public static final String FIXTURE_SHA="a9500076a1948457a13588ff0b225674c8fcb388ca87b037ef0ceea688949012",INPUTS="f0115d106719c35b225e7ca90eedb00e9f102ffec131bc8a7ec1a265a8101e7e";
  public static final long LEGACY_CLAIMS=12248654L,PENDING_CLAIMS=26075378L,OLD_BOOK=256L*1024;

  static byte[] cameraOwner(){return bytes("CAMERA_PROOF_OWNED_V2\n"+SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n");}
  static byte[] runOwner(){return bytes(json(map("run",RUN,"source",SOURCE,"apk",APK,"model",CameraProofFrame.MODEL,"recipe",CameraOrientationGeometry.RECIPE,"profileVersion",2)));}
  static byte[] record(String name,Map<String,Object> payload){
    Map<String,Object> base=map("name",name,"ownerSha256",CameraProofFrame.hash(runOwner()),"payload",payload);
    Map<String,Object> result=new TreeMap<>(base);result.put("digest",CameraProofFrame.hash(bytes(json(base))));return bytes(json(result));
  }
  static byte[] registry(){
    List<Object> rows=new ArrayList<>();
    for(CameraOrientationPlan.Case c:CameraOrientationPlan.CASES)rows.add(map("caseId",c.id,"jobId",UUID.nameUUIDFromBytes((RUN+":"+c.id).getBytes(StandardCharsets.UTF_8)).toString(),"targetSha256",c.target,"layout",c.layout,"sdkLimit",1));
    return record("registry",map("run",RUN,"cases",rows,"profileVersion",2,"recipe",CameraOrientationGeometry.RECIPE,"jpegLimit",CameraMatrixPlan.JPEG,"sharedOutputLimit",90*1024*1024,"automaticRetakes",0));
  }
  private static Map<String,String> pins(String... pairs){Map<String,String> m=new TreeMap<>();for(int i=0;i<pairs.length;i+=2)m.put(pairs[i],pairs[i+1]);return Collections.unmodifiableMap(m);}
  private static final Map<String,String> FILES=pins(
    "raw.jpg","813650:6da738ae1e549b27a6f2cb585b04a4553b741db141c8e24bf5e6e5d97c49e72b",
    "request.json","771:07a1c8ebcbc22f8a3fad38d89c32df06300ff547f56234f98baa80cd47e9ff31",
    "reservation","148:99d76960c83bb73c602430fc4d66d05a029a137ab6fa9383251971fbf72fafdd");

  /** Absence, not firstExportVerified=false, retires the single shared old envelope. */
  public static void unusedExports(File parent,CameraProofStore.IO io)throws Exception{
    String first=CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIRST.root;
    String last=CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FINAL.root;
    Set<String> allowed=new HashSet<>(Arrays.asList(ROOT,CAMERA,CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIXTURE.root));
    for(String name:io.list(parent)){
      require(!name.startsWith(first)&&!name.startsWith(last),"REPEAT_RETAINED_EXPORT_CONSUMED");
      if(name.contains("20261028-preview-v4")||name.startsWith(CAMERA))require(allowed.contains(name),"REPEAT_RETAINED_UNKNOWN_FOOTPRINT");
    }
  }
  public static void rejectGrant(String uri){
    for(CameraMatrixRecoveryPlan.Lane lane:Arrays.asList(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIRST,CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FINAL,CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIXTURE))
      require(!CameraMatrixRecoveryPlan.fixedUri(lane,uri),"REPEAT_RETAINED_EXPORT_GRANT");
    require(CameraMatrixRecoveryPlan.fixedUri(CameraMatrixRecoveryPlan.Lane.ORIENTATION_FIXTURE,uri)
      ||CameraMatrixRecoveryPlan.fixedUri(CameraMatrixRecoveryPlan.Lane.ORIENTATION_FIRST,uri),"REPEAT_UNKNOWN_PERSISTED_GRANT");
  }
  private static void exact(File root,CameraProofStore.IO io,String name,byte[] expected)throws Exception{
    File f=new File(root,name);require(io.size(f)==expected.length&&Arrays.equals(io.read(f,expected.length),expected),"REPEAT_RETAINED_BINDING");
  }
  private static Map<String,Object> intent(File root,CameraProofStore.IO io)throws Exception{
    Map<String,Object> envelope=parse(io.read(new File(root,CASE+".intent"),4096),4096);
    keys(envelope,"name","ownerSha256","payload","digest");Map<String,Object> payload=PhonePortabilityJson.object(envelope.get("payload"));
    require(Arrays.equals(bytes(json(envelope)),record(CASE+".intent",payload)),"REPEAT_RETAINED_INTENT_DIGEST");
    keys(payload,"caseId","jobId","targetSha256","source","apk","request","requestSha256","nonce","process");
    require(CASE.equals(payload.get("caseId"))&&JOB.equals(payload.get("jobId"))&&CameraOrientationPlan.CASES.get(0).target.equals(payload.get("targetSha256"))&&SOURCE.equals(payload.get("source"))&&APK.equals(payload.get("apk")),"REPEAT_RETAINED_INTENT_OWNER");
    uuid(payload.get("nonce"));uuid(payload.get("process"));
    Map<String,Object> request=CameraMatrixPlan.request(json(payload.get("request")),CameraMatrixPlan.get(CASE),1080,2340);
    require(CameraProofFrame.hash(bytes(json(request))).equals(payload.get("requestSha256")),"REPEAT_RETAINED_REQUEST_DIGEST");return payload;
  }
  public static long pendingClaims(File parent,CameraProofStore.IO io,long legacy)throws Exception{return pendingClaims(parent,io,legacy,FILES);}

  // Package-only fixture seam: production always supplies the immutable observed source750 pins above.
  static long pendingClaims(File parent,CameraProofStore.IO io,long legacy,Map<String,String> expected)throws Exception{
    require(legacy==LEGACY_CLAIMS,"REPEAT_RETAINED_LEGACY_CLAIM");unusedExports(parent,io);
    File camera=new File(parent,CAMERA),run=new File(parent,ROOT);
    Set<String> names=new HashSet<>(Arrays.asList("owner","refusals"));for(String role:expected.keySet())names.add(JOB+"."+role);
    require(new HashSet<>(io.list(camera)).equals(names)&&new HashSet<>(io.list(run)).equals(new HashSet<>(Arrays.asList("owner","registry",CASE+".intent"))),"REPEAT_RETAINED_EXACT_LEAVES");
    io.syncDirectory(camera);io.syncDirectory(run);exact(camera,io,"owner",cameraOwner());exact(run,io,"owner",runOwner());exact(run,io,"registry",registry());
    Map<String,Object> oldIntent=intent(run,io);
    for(Map.Entry<String,String> entry:expected.entrySet()){
      String[] pin=entry.getValue().split(":");int size=Integer.parseInt(pin[0]);File f=new File(camera,JOB+"."+entry.getKey());
      require(io.size(f)==size&&CameraProofFrame.hash(io.read(f,size)).equals(pin[1]),"REPEAT_RETAINED_FILE_HASH");
    }
    Map<String,Object> request=parse(io.read(new File(camera,JOB+".request.json"),4096),4096);
    require(SOURCE.equals(request.get("sourceSha256"))&&RUN.equals(request.get("matrixRun"))&&CASE.equals(request.get("matrixCase"))&&APK.equals(request.get("matrixApk"))
      &&SOURCE.equals(request.get("matrixSource"))&&oldIntent.get("requestSha256").equals(request.get("matrixRequestSha256"))
      &&oldIntent.get("nonce").equals(request.get("matrixNonce")),"REPEAT_RETAINED_CAMERA_REQUEST");
    CameraProofStore.IO readOnly=new CameraProofStore.IO(){
      public void root(File root,boolean create)throws IOException{require(!create&&root.equals(camera),"REPEAT_RETAINED_READ_ONLY");io.list(root);}
      public void syncDirectory(File f)throws IOException{io.syncDirectory(f);}public List<String> list(File f)throws IOException{return io.list(f);}
      public long size(File f)throws IOException{return io.size(f);}public byte[] read(File f,int cap)throws IOException{return io.read(f,cap);}
      public long available(File f)throws IOException{return io.available(f);}public long matrixAllowance(){return io.matrixAllowance();}
      // Reconstruct the OLD cap for validation only; no new allocation or claim release occurs here.
      public long retainedCameraClaimBytes(){return legacy+CameraOrientationPlan.OUTPUT-CameraOrientationPlan.ACTIVE_OUTPUT;}
      public void writeNew(File f,byte[] b)throws IOException{throw new IOException("REPEAT_RETAINED_READ_ONLY");}
      public void publish(File a,File b)throws IOException{throw new IOException("REPEAT_RETAINED_READ_ONLY");}
      public void writeAt(File f,int at,byte[] b)throws IOException{throw new IOException("REPEAT_RETAINED_READ_ONLY");}
    };
    CameraProofStore old=CameraProofStore.readOrientation(camera,readOnly,SOURCE,CameraProofLifecycle.PROCESS);
    Map<String,Object> status=old.status();long claimed=number(status.get("claimedBytes"),1,CameraProofStore.CAP);
    require(claimed==PENDING_CLAIMS&&number(status.get("captureCount"),1,1)==1,"REPEAT_RETAINED_FULL_PENDING_CLAIM");
    List<Map<String,Object>> interrupted=old.inspectInterrupted();require(interrupted.size()==1&&JOB.equals(interrupted.get(0).get("ticket"))&&Boolean.TRUE.equals(interrupted.get(0).get("reservationValid"))&&Boolean.FALSE.equals(interrupted.get(0).get("ownerIsCurrentProcess")),"REPEAT_RETAINED_PENDING_OWNER");
    String[] reservation=new String(io.read(new File(camera,JOB+".reservation"),4096),StandardCharsets.UTF_8).split("\n");
    require(reservation.length==4&&oldIntent.get("process").equals(reservation[2]),"REPEAT_RETAINED_PROCESS_BINDING");
    long runBytes=0;for(String n:io.list(run))runBytes+=io.size(new File(run,n));
    require(runBytes<=CameraOrientationStore.JOURNAL&&CameraOrientationStore.JOURNAL+64L*1024+3L*CameraMatrixRecoveryPlan.JOURNAL<=OLD_BOOK,"REPEAT_RETAINED_BOOK_CAP");
    return Math.addExact(claimed,OLD_BOOK);
  }
  /** Caller holds the existing old fixture lock; this validates without resuming its engine. */
  public static void settledFixture(File root,CameraProofStore.IO io,CameraMatrixRecoveryStore store)throws Exception{
    require(root.getName().equals(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIXTURE.root)&&store.state().equals("TERMINAL"),"REPEAT_RETAINED_FIXTURE_REQUIRED");
    Map<String,Object> owner=store.payload("owner"),terminal=store.payload("terminal"),result=PhonePortabilityJson.object(terminal.get("result"));
    require(SOURCE.equals(owner.get("exporterSource"))&&APK.equals(owner.get("exporterApk"))&&INPUTS.equals(owner.get("inputs"))&&"READBACK_VERIFIED".equals(terminal.get("status"))
      &&number(result.get("bytes"),1,65536)==2796&&FIXTURE_SHA.equals(result.get("sha256")),"REPEAT_RETAINED_FIXTURE_BINDING");
    long size=0;for(String n:io.list(root))size+=io.size(new File(root,n));require(size<=CameraMatrixRecoveryPlan.JOURNAL,"REPEAT_RETAINED_FIXTURE_CAP");
  }
}

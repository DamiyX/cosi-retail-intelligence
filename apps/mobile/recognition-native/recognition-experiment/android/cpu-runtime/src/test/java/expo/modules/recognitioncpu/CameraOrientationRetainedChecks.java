package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;
/** Fixed old empty history and settled fixture admission; no Android, image decode or model. */
public final class CameraOrientationRetainedChecks {
 static int checks;static final String P="11111111-1111-1111-1111-111111111111";
 static void ok(boolean b,String why){checks++;if(!b)throw new AssertionError(why);}
 interface Work{void run()throws Exception;}
 static void no(Work work)throws Exception{try{work.run();throw new AssertionError("missing refusal");}catch(IOException|IllegalArgumentException|IllegalStateException expected){checks++;}}
 static final class IO extends CameraMatrixRecoveryChecks.IO{long retained;public long retainedCameraClaimBytes(){return retained;}public long matrixAllowance(){return CameraMatrixPlan.OUTPUT+(long)CameraMatrixPlan.BOOK+FIXTURE_ALLOWANCE;}}
 static void write(Path root,String n,byte[] bytes)throws Exception{Files.write(root.resolve(n),bytes,StandardOpenOption.CREATE_NEW);}
 static Path empty(Path parent,String name)throws Exception{Path p=parent.resolve(name);Files.createDirectories(p);return p;}
 static long size(Path root)throws Exception{long n=0;try(var stream=Files.list(root)){for(Path p:(Iterable<Path>)stream::iterator)n+=Files.size(p);}return n;}
 static Path fixture(Path parent,boolean completed)throws Exception{
  Path root=empty(parent,Lane.RETAINED_ORIENTATION_FIXTURE.root);write(root,"lock",new byte[0]);String previous=ZERO,owner=ZERO;Map<String,Object> verified=map("bytes",2796,"sha256",CameraOrientationRetained.FIXTURE_SHA,"reconciledReadOnly",false,"powerLossDurabilityProven",false,"providerDirectoryDurabilityProven",false,"process",P);
  for(String step:STEPS){
   Map<String,Object> payload;
   switch(step){
    case "owner":payload=map("lane","ORIENTATION_FIXTURE","run",CameraOrientationRetained.RUN,"captureSource",CameraOrientationRetained.SOURCE,"captureApk",CameraOrientationRetained.APK,"exporterSource",CameraOrientationRetained.SOURCE,"exporterApk",CameraOrientationRetained.APK,"serializer",SERIALIZER,"inputs",CameraOrientationRetained.INPUTS,"operation",P);break;
    case "selection":payload=map("selection",P,"documentId",Lane.RETAINED_ORIENTATION_FIXTURE.documentId,"outputCap",65536,"process",P);break;
    case "destination":payload=map("uri",Lane.RETAINED_ORIENTATION_FIXTURE.uri,"grants",3,"offeredFlags",67,"identity",map("device","1","inode","2"),"historicalInodeAttested",false,"process",P);break;
    case "write":payload=map("bytes",2796,"sha256",CameraOrientationRetained.FIXTURE_SHA,"inputs",CameraOrientationRetained.INPUTS,"serializer",SERIALIZER,"destination",previous,"process",P);break;
    case "verified":payload=verified;break;
    default:payload=map("status","READBACK_VERIFIED","reason","COMPLETE","result",verified,"originalExportResultUnchanged",true);
   }
   if(!completed&&step.equals("verified"))break;
   Map<String,Object> base=map("step",step,"previous",previous,"owner",owner,"payload",payload),record=new TreeMap<>(base);record.put("digest",CameraProofFrame.hash(bytes(json(base))));byte[] raw=bytes(json(record));write(root,step,raw);previous=CameraProofFrame.hash(raw);if(step.equals("owner"))owner=previous;
  }return root;
 }
 public static void main(String[] args)throws Exception{
  Path parent=empty(Path.of(args[0]),"empty");IO io=new IO();ok(CameraOrientationRetained.emptyClaims(parent.toFile(),io)==0,"absent prior namespace creates nothing");
  Path camera=empty(parent,CameraOrientationRetained.CAMERA);write(camera,"owner",CameraOrientationRetained.cameraOwner());write(camera,"refusals",new byte[CameraProofStore.REFUSALS]);Path run=empty(parent,CameraOrientationRetained.ROOT);write(run,"owner",CameraOrientationRetained.runOwner());write(run,"registry",CameraOrientationRetained.registry());long claimed=CameraOrientationRetained.emptyClaims(parent.toFile(),io);ok(claimed==size(camera)+size(run),"all old owner/registry/refusals bytes retained exactly");
  Map<String,byte[]> originals=new TreeMap<>();for(Path root:Arrays.asList(camera,run))try(var stream=Files.list(root)){for(Path p:(Iterable<Path>)stream::iterator)originals.put(p.toString(),Files.readAllBytes(p));}
  for(String name:Arrays.asList("M00-A000.intent","M00-A000.intent.new","seal")){write(run,name,new byte[]{1});no(()->CameraOrientationRetained.emptyClaims(parent.toFile(),io));Files.delete(run.resolve(name));}
  for(String tail:Arrays.asList("reservation","reservation.new","raw.jpg","resolution")){String name=P+"."+tail;write(camera,name,new byte[]{1});no(()->CameraOrientationRetained.emptyClaims(parent.toFile(),io));Files.delete(camera.resolve(name));}
  for(Lane lane:Arrays.asList(Lane.RETAINED_ORIENTATION_FIRST,Lane.RETAINED_ORIENTATION_FINAL)){Path forbidden=empty(parent,lane.root);no(()->CameraOrientationRetained.emptyClaims(parent.toFile(),io));Files.delete(forbidden);}
  byte[] owner=Files.readAllBytes(run.resolve("owner"));Files.write(run.resolve("owner"),bytes(new String(owner,java.nio.charset.StandardCharsets.UTF_8).replace(CameraOrientationRetained.APK,"c".repeat(64))));no(()->CameraOrientationRetained.emptyClaims(parent.toFile(),io));Files.write(run.resolve("owner"),owner);
  byte[] camOwner=Files.readAllBytes(camera.resolve("owner"));Files.write(camera.resolve("owner"),bytes(new String(camOwner,java.nio.charset.StandardCharsets.UTF_8).replace(CameraOrientationRetained.SOURCE,"d".repeat(64))));no(()->CameraOrientationRetained.emptyClaims(parent.toFile(),io));Files.write(camera.resolve("owner"),camOwner);
  byte[] registry=Files.readAllBytes(run.resolve("registry"));Files.write(run.resolve("registry"),new byte[]{1});no(()->CameraOrientationRetained.emptyClaims(parent.toFile(),io));Files.write(run.resolve("registry"),registry);
  Path f=fixture(parent,true);CameraMatrixRecoveryStore store=new CameraMatrixRecoveryStore(f.toFile(),io,Lane.RETAINED_ORIENTATION_FIXTURE,()->{},CameraOrientationRetained.SOURCE,CameraOrientationRetained.APK,P);long fixtureClaim=CameraOrientationRetained.settledFixtureClaims(f.toFile(),io,store);ok(fixtureClaim==size(f)+2796,"settled original fixture output and bookkeeping remain charged");no(()->store.selection());no(()->store.terminal("UNVERIFIED","NONE"));no(()->new CameraMatrixRecoveryStore(f.toFile(),io,Lane.RETAINED_ORIENTATION_FIXTURE,()->{},"e".repeat(64),CameraOrientationRetained.APK,P));
  Path pending=fixture(empty(parent,"pending"),false);CameraMatrixRecoveryStore inFlight=new CameraMatrixRecoveryStore(pending.toFile(),io,Lane.RETAINED_ORIENTATION_FIXTURE,()->{},CameraOrientationRetained.SOURCE,CameraOrientationRetained.APK,P);no(()->CameraOrientationRetained.settledFixtureClaims(pending.toFile(),io,inFlight));no(()->inFlight.verified(2796,CameraOrientationRetained.FIXTURE_SHA,true));
  io.retained=10L*1024*1024+claimed+fixtureClaim;Path current=empty(parent,CameraOrientationPlan.CAMERA_ROOT);CameraProofStore fresh=CameraProofStore.orientation(current.toFile(),io,"f".repeat(64),P);Map<String,Object> status=fresh.status();long expected=CameraProofStore.CAMERA_CAP-io.matrixAllowance()-io.retained-CameraOrientationPlan.OUTPUT-CameraOrientationPlan.BOOK;ok(((Number)status.get("cameraCapBytes")).longValue()==expected,"independent combined old/new cap arithmetic");ok(((Number)status.get("aggregateClaimedBytes")).longValue()<=CameraProofStore.CAP,"256MiB aggregate unchanged");io.retained=CameraProofStore.CAP;no(fresh::status);
  for(Map.Entry<String,byte[]> e:originals.entrySet())ok(Arrays.equals(Files.readAllBytes(Path.of(e.getKey())),e.getValue()),"old bytes never rewritten by validation");
  ok(!CameraOrientationPlan.RUN.equals(CameraOrientationRetained.RUN)&&!CameraOrientationPlan.CAMERA_ROOT.equals(CameraOrientationRetained.CAMERA),"fresh namespace distinct");ok(!CameraOrientationPlan.CASES.get(0).job.equals(UUID.nameUUIDFromBytes((CameraOrientationRetained.RUN+":M00-A000").getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString()),"fresh job identities");
  System.out.println("CameraOrientationRetainedChecks assertions="+checks+"; fixed generated histories only");
 }
}

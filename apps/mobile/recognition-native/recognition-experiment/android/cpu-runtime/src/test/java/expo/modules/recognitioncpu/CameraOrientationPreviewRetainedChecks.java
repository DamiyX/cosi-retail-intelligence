package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.channels.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Reconstructed source fixtures ONLY; actual phone owner/selection hashes are unavailable. */
public final class CameraOrientationPreviewRetainedChecks {
  static final String OLD="p203-orientation-20261027-preview-v3", SOURCE="12b2e028ca2a868aca86d0f7d82c232fed54033270052dba7adffbea3dc2beed", APK="33a4f08ff67706f8d0016c60ce17b33f303f8b41b091e82c19ee3a320d5f48a3";
  static final String PROCESS="0120f4aa-9aeb-454e-b7ba-9640b94f4b8c", INPUTS="1abd9a9a7c184823d7a97a9acb03467b78dfa25bcd4b379ffc337ef5f50cb20e", SHA="08fa9b3baed2dd3b73cd4ba5a483f73f7764f0f0272aafc9a8f302fba039b014";
  static final String CAMERA="camera-proof-orientation-preview-v3", RUN="camera-orientation-20261027-preview-v3";
  static int checks;
  interface Work { void run() throws Exception; }
  static void ok(boolean value,String why){checks++;if(!value)throw new AssertionError(why);}
  static void no(String why,Work work)throws Exception{try{work.run();throw new AssertionError("missing refusal: "+why);}catch(IOException|IllegalArgumentException|IllegalStateException expected){checks++;}}
  static final class IO extends CameraMatrixRecoveryChecks.IO {
    int mutations;long retained;
    @Override public void writeNew(File file,byte[] data)throws IOException{mutations++;super.writeNew(file,data);}
    @Override public void publish(File a,File b)throws IOException{mutations++;super.publish(a,b);}
    @Override public void writeAt(File file,int at,byte[] data)throws IOException{mutations++;super.writeAt(file,at,data);}
    @Override public long retainedCameraClaimBytes(){return retained;}
    @Override public long matrixAllowance(){return CameraMatrixPlan.OUTPUT+(long)CameraMatrixPlan.BOOK+FIXTURE_ALLOWANCE;}
  }
  static Path dir(Path parent,String name)throws Exception{Path p=parent.resolve(name);Files.createDirectories(p);return p;}
  static void put(Path root,String name,byte[] data)throws Exception{Files.write(root.resolve(name),data,StandardOpenOption.CREATE_NEW);}
  static long size(Path root)throws Exception{try(var paths=Files.list(root)){long n=0;for(Path p:(Iterable<Path>)paths::iterator)n+=Files.size(p);return n;}}
  static Map<String,String> hashes(Path parent)throws Exception{
    Map<String,String> out=new TreeMap<>();try(var paths=Files.walk(parent)){for(Path p:(Iterable<Path>)paths::iterator)if(Files.isRegularFile(p))out.put(parent.relativize(p).toString(),CameraProofFrame.hash(p.getFileName().toString().equals("lock")&&Files.size(p)==0?new byte[0]:Files.readAllBytes(p)));}return out;
  }
  // Reconstruct the archived CameraOrientationStore owner/envelope format, not the retained validator's factories.
  static void empty(Path parent,boolean camera,boolean run)throws Exception{
    if(camera){Path p=dir(parent,CAMERA);put(p,"owner",bytes("CAMERA_PROOF_OWNED_V2\n"+SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n"));put(p,"refusals",new byte[CameraProofStore.REFUSALS]);}
    if(run){Path p=dir(parent,RUN);byte[] owner=bytes(json(map("run",OLD,"source",SOURCE,"apk",APK,"model",CameraProofFrame.MODEL,"recipe",CameraOrientationGeometry.RECIPE,"profileVersion",2)));put(p,"owner",owner);
      List<Object> rows=new ArrayList<>();for(int i=4;i<12;i++){CameraMatrixPlan.Case c=CameraMatrixPlan.CASES.get(i);rows.add(map("caseId",c.id,"jobId",UUID.nameUUIDFromBytes((OLD+":"+c.id).getBytes(StandardCharsets.UTF_8)).toString(),"targetSha256",c.target,"layout",c.layout,"sdkLimit",1));}
      Map<String,Object> payload=map("run",OLD,"cases",rows,"profileVersion",2,"recipe",CameraOrientationGeometry.RECIPE,"jpegLimit",CameraMatrixPlan.JPEG,"sharedOutputLimit",90*1024*1024,"automaticRetakes",0);
      Map<String,Object> base=map("name","registry","ownerSha256",CameraProofFrame.hash(owner),"payload",payload),envelope=new TreeMap<>(base);envelope.put("digest",CameraProofFrame.hash(bytes(json(base))));put(p,"registry",bytes(json(envelope)));
    }
  }
  static Path chain(Path parent,String through,String inputs,String sha,long count,String ownerSource,String ownerApk)throws Exception{
    Lane lane=Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE;Path root=dir(parent,lane.root);put(root,"lock",new byte[0]);String previous=ZERO,owner=ZERO;
    Map<String,Object> verified=map("bytes",count,"sha256",sha,"reconciledReadOnly",false,"powerLossDurabilityProven",false,"providerDirectoryDurabilityProven",false,"process",PROCESS);
    for(String step:STEPS){Map<String,Object> payload;
      switch(step){
        case "owner":payload=map("lane","ORIENTATION_FIXTURE","run",OLD,"captureSource",ownerSource,"captureApk",ownerApk,"exporterSource",ownerSource,"exporterApk",ownerApk,"serializer",SERIALIZER,"inputs",inputs,"operation","11111111-1111-4111-8111-111111111111");break;
        case "selection":payload=map("selection","22222222-2222-4222-8222-222222222222","documentId",lane.documentId,"outputCap",65536,"process",PROCESS);break;
        case "destination":payload=map("uri",lane.uri,"grants",3,"offeredFlags",67,"identity",map("device","1","inode","2"),"historicalInodeAttested",false,"process",PROCESS);break;
        case "write":payload=map("bytes",count,"sha256",sha,"inputs",inputs,"serializer",SERIALIZER,"destination",previous,"process",PROCESS);break;
        case "verified":payload=verified;break;
        default:payload=map("status","READBACK_VERIFIED","reason","COMPLETE","result",verified,"originalExportResultUnchanged",true);
      }
      Map<String,Object> base=map("step",step,"previous",previous,"owner",owner,"payload",payload),record=new TreeMap<>(base);record.put("digest",CameraProofFrame.hash(bytes(json(base))));byte[] raw=bytes(json(record));put(root,step,raw);previous=CameraProofFrame.hash(raw);if(step.equals("owner"))owner=previous;if(step.equals(through))break;
    }return root;
  }
  static Path chain(Path parent,String through)throws Exception{return chain(parent,through,INPUTS,SHA,2796,SOURCE,APK);}
  static final class Held implements AutoCloseable {
    final FileChannel channel;final FileLock lock;
    Held(Path root)throws Exception{channel=FileChannel.open(root.resolve("lock"),StandardOpenOption.WRITE);lock=channel.tryLock();ok(lock!=null,"actual host lock acquired");}
    CameraMatrixRecoveryStore store(Path root,IO io)throws Exception{return new CameraMatrixRecoveryStore(root.toFile(),io,Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE,()->requireRecovery(lock.isValid(),"HOST_LOCK_REQUIRED"),SOURCE,APK,PROCESS);}
    public void close()throws IOException{lock.release();channel.close();}
  }
  public static void main(String[] args)throws Exception{
    Path parent=dir(Path.of(args[0]),"pending-preview-source-fixtures");IO io=new IO();
    Path good=dir(parent,"good");empty(good,true,true);long metadata=CameraOrientationPreviewRetained.emptyClaims(good.toFile(),io);ok(metadata==size(good.resolve(CAMERA))+size(good.resolve(RUN)),"actual validated camera/run metadata once");
    for(int bits:new int[]{0,2}){Path p=dir(parent,"missing-"+bits);empty(p,(bits&1)!=0,(bits&2)!=0);no("required camera",()->CameraOrientationPreviewRetained.emptyClaims(p.toFile(),io));}
    for(String leaf:List.of("M00-A000.intent","M00-A000.intent.new","M00-A000.terminal","seal","unknown")){Path p=dir(parent,"run-"+leaf);empty(p,true,true);put(p.resolve(RUN),leaf,new byte[]{1});no("old case consumed/torn",()->CameraOrientationPreviewRetained.emptyClaims(p.toFile(),io));}
    for(String leaf:List.of(PROCESS+".reservation",PROCESS+".raw.jpg",PROCESS+".resolution","unknown")){Path p=dir(parent,"camera-"+leaf);empty(p,true,true);put(p.resolve(CAMERA),leaf,new byte[]{1});no("old camera consumed",()->CameraOrientationPreviewRetained.emptyClaims(p.toFile(),io));}
    for(Lane lane:List.of(Lane.RETAINED_PREVIEW_ORIENTATION_FIRST,Lane.RETAINED_PREVIEW_ORIENTATION_FINAL)){Path p=dir(parent,"export-"+lane.name());empty(p,true,true);dir(p,lane.root);no("even empty old export consumed",()->CameraOrientationPreviewRetained.emptyClaims(p.toFile(),io));}
    Path root=chain(dir(parent,"selection"),"selection");Map<String,String> before=hashes(root);long allowance;
    try(Held held=new Held(root)){
      CameraMatrixRecoveryStore store=held.store(root,io);Map<String,Object> snapshot=CameraOrientationPreviewRetained.pendingSnapshot(root.toFile(),io,store);allowance=((Number)snapshot.get("permanentAllowanceBytes")).longValue();
      ok(allowance==65536L+14*1024,"full consumed78KiB not just physical bytes");ok(((Number)snapshot.get("actualJournalBytes")).longValue()==size(root),"physical bytes reported within allowance, not added twice");
      ok(snapshot.get("ownerSha256").equals(CameraProofFrame.hash(Files.readAllBytes(root.resolve("owner"))))&&snapshot.get("selectionSha256").equals(CameraProofFrame.hash(Files.readAllBytes(root.resolve("selection")))),"runtime hashes from fixture bytes, not constants");
      no("old destination forbidden",()->store.destination(Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE.uri,67,map("device","1","inode","2")));no("no fabricated cancellation",()->store.terminal("CANCELLED","LOST_ROUTE"));ok(before.equals(hashes(root))&&io.mutations==0,"old selection byte identical/unwritable");
    }
    for(String phase:List.of("owner","destination","write","verified","terminal")){Path p=chain(dir(parent,"phase-"+phase),phase);try(Held held=new Held(p)){no("only SELECTION accepted",()->CameraOrientationPreviewRetained.pendingSnapshot(p.toFile(),io,held.store(p,io)));}}
    for(String mismatch:List.of("source","apk","inputs")){Path p=chain(dir(parent,"wrong-"+mismatch),"selection",mismatch.equals("inputs")?"f".repeat(64):INPUTS,SHA,2796,mismatch.equals("source")?"e".repeat(64):SOURCE,mismatch.equals("apk")?"d".repeat(64):APK);try(Held held=new Held(p)){no("wrong tuple",()->CameraOrientationPreviewRetained.pendingSnapshot(p.toFile(),io,held.store(p,io)));}}
    for(String leaf:List.of("destination.new","unknown")){Path p=chain(dir(parent,"bad-leaf-"+leaf),"selection");put(p,leaf,new byte[]{1});try(Held held=new Held(p)){no("torn/unknown untouched",()->held.store(p,io));}}
    Path badProcess=chain(dir(parent,"bad-process"),"selection");String raw=Files.readString(badProcess.resolve("selection")).replace(PROCESS,"99999999-9999-4999-8999-999999999999");Map<String,Object> record=parse(bytes(raw),RECORD);Map<String,Object> base=new TreeMap<>(record);base.remove("digest");record.put("digest",CameraProofFrame.hash(bytes(json(base))));Files.write(badProcess.resolve("selection"),bytes(json(record)));try(Held held=new Held(badProcess)){no("wrong observed selection process",()->CameraOrientationPreviewRetained.pendingSnapshot(badProcess.toFile(),io,held.store(badProcess,io)));}
    for(Lane lane:List.of(Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE,Lane.RETAINED_PREVIEW_ORIENTATION_FIRST,Lane.RETAINED_PREVIEW_ORIENTATION_FINAL)){no("any matching grant including read-only",()->CameraOrientationPreviewRetained.rejectGrant(lane.uri));}
    CameraOrientationPreviewRetained.rejectGrant(Lane.ORIENTATION_FIXTURE.uri);ok(io.mutations==0,"grant/retention checks never write");
    long matrix=90L*1024*1024+192L*1024+64L*1024;long required=CameraProofStore.RESERVATION+CameraProofStore.REFUSALS+1024L;long boundary=CameraProofStore.CAMERA_CAP-matrix-CameraOrientationPlan.OUTPUT-CameraOrientationPlan.BOOK-required;
    ok(CameraOrientationPlan.cameraCap(matrix,boundary)==required,"exact admission boundary");ok(CameraOrientationPlan.cameraCap(matrix,boundary+1)==required-1,"one byte less refuses admission");ok(CameraOrientationPlan.cameraCap(matrix,boundary+allowance)==required-allowance,"pending consumed allowance not refunded");
    ok(CameraOrientationPlan.activeBookCoverage()==234L*1024&&CameraOrientationPlan.activeBookCoverage()<=CameraOrientationPlan.BOOK,"run128+fixture64+3journals42 inside256");
    ok(CameraProofStore.CAP==256L*1024*1024&&CameraOrientationPlan.OUTPUT==90*1024*1024,"caps unchanged");ok(!CameraOrientationPlan.RUN.equals(OLD),"distinct new operation namespace");
    System.out.println("CameraOrientationPreviewRetainedChecks assertions="+checks+"; source fixtures/host locks only; actual private record hashes and Android grants unavailable");
  }
}

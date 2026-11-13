package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.channels.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Real recovered generated-chart bytes, synthetic host journals and actual host file locks. No Android/model. */
public final class CameraOrientationUiRetainedChecks {
  static final String P="11111111-1111-1111-1111-111111111111", OLD_JOB="c284d019-040d-3517-846c-3f4407bda993";
  static int checks;
  interface Work {void run()throws Exception;}
  static void ok(boolean b,String why){checks++;if(!b)throw new AssertionError(why);}
  static void no(String why,Work work)throws Exception{try{work.run();throw new AssertionError("missing refusal: "+why);}catch(IOException|IllegalArgumentException|IllegalStateException expected){checks++;}}
  static final class IO extends CameraMatrixRecoveryChecks.IO {
    int mutations;long retained;
    @Override public void writeNew(File f,byte[] b)throws IOException{mutations++;super.writeNew(f,b);}
    @Override public void publish(File a,File b)throws IOException{mutations++;super.publish(a,b);}
    @Override public void writeAt(File f,int at,byte[] b)throws IOException{mutations++;super.writeAt(f,at,b);}
    @Override public long retainedCameraClaimBytes(){return retained;}
    @Override public long matrixAllowance(){return CameraMatrixPlan.OUTPUT+(long)CameraMatrixPlan.BOOK+FIXTURE_ALLOWANCE;}
  }
  static final class Held implements AutoCloseable {
    final FileChannel channel;final FileLock lock;
    Held(Path root)throws Exception{channel=FileChannel.open(root.resolve("lock"),StandardOpenOption.WRITE);lock=channel.tryLock();ok(lock!=null,"actual host export lock acquired");}
    CameraMatrixRecoveryStore store(Path root,IO io,Lane lane)throws Exception{return new CameraMatrixRecoveryStore(root.toFile(),io,lane,()->requireRecovery(lock.isValid(),"TEST_LOCK_RELEASED"),CameraOrientationUiRetained.SOURCE,CameraOrientationUiRetained.APK,P);}
    public void close()throws IOException{lock.release();channel.close();}
  }
  static void put(Path root,String name,byte[] b)throws Exception{Files.write(root.resolve(name),b,StandardOpenOption.CREATE_NEW);}
  static Path dir(Path parent,String name)throws Exception{Path p=parent.resolve(name);Files.createDirectories(p);return p;}
  static long size(Path root)throws Exception{try(var stream=Files.list(root)){long total=0;for(Path p:(Iterable<Path>)stream::iterator)total+=Files.size(p);return total;}}
  // Windows mandatory locks prohibit even an empty read of a held lock file.
  // The validated zero-length lock has the empty-byte digest without a data read.
  static Map<String,String> hashes(Path parent)throws Exception{Map<String,String> result=new TreeMap<>();try(var stream=Files.walk(parent)){for(Path p:(Iterable<Path>)stream::iterator)if(Files.isRegularFile(p)){byte[] value=p.getFileName().toString().equals("lock")&&Files.size(p)==0?new byte[0]:Files.readAllBytes(p);result.put(parent.relativize(p).toString(),CameraProofFrame.hash(value));}}return result;}
  static Path snapshot(Path parent,Path archive)throws Exception{
    Path camera=dir(parent,CameraOrientationUiRetained.CAMERA),run=dir(parent,CameraOrientationUiRetained.ROOT);
    try(ZipInputStream z=new ZipInputStream(Files.newInputStream(archive))){ZipEntry entry;while((entry=z.getNextEntry())!=null){String n=entry.getName();byte[] b=z.readAllBytes();if(n.startsWith("M00-A000/"))put(camera,OLD_JOB+"."+n.substring(9),b);else if(n.startsWith("run/"))put(run,n.substring(4),b);}}
    put(camera,"owner",bytes("CAMERA_PROOF_OWNED_V2\n"+CameraOrientationUiRetained.SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n"));put(camera,"refusals",new byte[CameraProofStore.REFUSALS]);return parent;
  }
  static Path chain(Path parent,Lane lane,String through,String inputs,String sha,long output)throws Exception{
    Path root=dir(parent,lane.root);put(root,"lock",new byte[0]);String previous=ZERO,owner=ZERO;
    Map<String,Object> verified=map("bytes",output,"sha256",sha,"reconciledReadOnly",false,"powerLossDurabilityProven",false,"providerDirectoryDurabilityProven",false,"process",P);
    for(String step:STEPS){Map<String,Object> payload;
      switch(step){
        case "owner":payload=map("lane",lane.recordName(),"run",lane.run(),"captureSource",CameraOrientationUiRetained.SOURCE,"captureApk",CameraOrientationUiRetained.APK,"exporterSource",CameraOrientationUiRetained.SOURCE,"exporterApk",CameraOrientationUiRetained.APK,"serializer",SERIALIZER,"inputs",inputs,"operation",P);break;
        case "selection":payload=map("selection",P,"documentId",lane.documentId,"outputCap",lane.outputCap,"process",P);break;
        case "destination":payload=map("uri",lane.uri,"grants",3,"offeredFlags",67,"identity",map("device","1","inode","2"),"historicalInodeAttested",false,"process",P);break;
        case "write":payload=map("bytes",output,"sha256",sha,"inputs",inputs,"serializer",SERIALIZER,"destination",previous,"process",P);break;
        case "verified":payload=verified;break;
        default:payload=map("status","READBACK_VERIFIED","reason","COMPLETE","result",verified,"originalExportResultUnchanged",true);
      }
      Map<String,Object> base=map("step",step,"previous",previous,"owner",owner,"payload",payload),record=new TreeMap<>(base);record.put("digest",CameraProofFrame.hash(bytes(json(base))));byte[] raw=bytes(json(record));put(root,step,raw);previous=CameraProofFrame.hash(raw);if(step.equals("owner"))owner=previous;if(step.equals(through))break;
    }return root;
  }
  static Path chain(Path p,Lane lane,String through)throws Exception{boolean first=lane==Lane.RETAINED_UI_ORIENTATION_FIRST;return chain(p,lane,through,first?CameraOrientationUiRetained.FIRST_INPUTS:CameraOrientationUiRetained.FIXTURE_INPUTS,first?CameraOrientationUiRetained.FIRST_SHA:CameraOrientationUiRetained.FIXTURE_SHA,first?673055:2796);}
  public static void main(String[] args)throws Exception{
    Path parent=dir(Path.of(args[0]),"ui-retained"),archive=Path.of(args[1]);IO io=new IO();String archiveSha=CameraProofFrame.hash(Files.readAllBytes(archive));
    Path exact=snapshot(dir(parent,"exact"),archive);Map<String,String> original=hashes(exact);long claim=CameraOrientationUiRetained.cameraClaims(exact.toFile(),io);ok(claim==size(exact.resolve(CameraOrientationUiRetained.CAMERA))+size(exact.resolve(CameraOrientationUiRetained.ROOT)),"camera plus run bytes both charged");ok(io.mutations==0&&hashes(exact).equals(original),"exact published old M00 validation is read only");
    for(String leaf:Arrays.asList("M01-A090.intent","M00-A000.intent.new","seal")){Path bad=snapshot(dir(parent,"extra-"+leaf),archive);put(bad.resolve(CameraOrientationUiRetained.ROOT),leaf,new byte[]{1});no("extra or torn old run "+leaf,()->CameraOrientationUiRetained.cameraClaims(bad.toFile(),io));}
    for(String leaf:Arrays.asList("raw.jpg","receipt.json","request.json","resolution")){Path bad=snapshot(dir(parent,"tamper-"+leaf),archive);Path file=bad.resolve(CameraOrientationUiRetained.CAMERA).resolve(OLD_JOB+"."+leaf);byte[] b=Files.readAllBytes(file);b[0]^=1;Files.write(file,b);no("same-size hash tamper "+leaf,()->CameraOrientationUiRetained.cameraClaims(bad.toFile(),io));}
    Path missing=snapshot(dir(parent,"missing-terminal"),archive);Files.delete(missing.resolve(CameraOrientationUiRetained.ROOT).resolve("M00-A000.terminal"));no("missing old terminal",()->CameraOrientationUiRetained.cameraClaims(missing.toFile(),io));
    Path wrongOwner=snapshot(dir(parent,"wrong-owner"),archive);Files.write(wrongOwner.resolve(CameraOrientationUiRetained.CAMERA).resolve("owner"),bytes("wrong identity"));no("wrong old camera identity",()->CameraOrientationUiRetained.cameraClaims(wrongOwner.toFile(),io));
    Path badRefusals=snapshot(dir(parent,"bad-refusals"),archive);byte[] refusal=new byte[CameraProofStore.REFUSALS];refusal[0]=1;Files.write(badRefusals.resolve(CameraOrientationUiRetained.CAMERA).resolve("refusals"),refusal);no("malformed retained refusal bytes",()->CameraOrientationUiRetained.cameraClaims(badRefusals.toFile(),io));
    Path finalLane=snapshot(dir(parent,"unexpected-final"),archive);dir(finalLane,Lane.RETAINED_UI_ORIENTATION_FINAL.root);no("unapproved old final lane",()->CameraOrientationUiRetained.cameraClaims(finalLane.toFile(),io));
    long exports=0;
    for(Lane lane:Arrays.asList(Lane.RETAINED_UI_ORIENTATION_FIRST,Lane.RETAINED_UI_ORIENTATION_FIXTURE)){
      Path complete=chain(dir(parent,"complete-"+lane.name()),lane,"terminal");Map<String,String> before=hashes(complete);CameraMatrixRecoveryStore store;
      try(Held held=new Held(complete)){store=held.store(complete,io,lane);long value=CameraOrientationUiRetained.exportClaim(complete.toFile(),io,lane,store);exports+=value;ok(value==size(complete)+(lane==Lane.RETAINED_UI_ORIENTATION_FIRST?673055:2796),"old output AND journal are charged");no("cannot append terminal",()->store.terminal("UNVERIFIED","NONE"));no("wrong retained exporter source",()->new CameraMatrixRecoveryStore(complete.toFile(),io,lane,()->requireRecovery(held.lock.isValid(),"TEST_LOCK_RELEASED"),"e".repeat(64),CameraOrientationUiRetained.APK,P));no("wrong retained exporter APK",()->new CameraMatrixRecoveryStore(complete.toFile(),io,lane,()->requireRecovery(held.lock.isValid(),"TEST_LOCK_RELEASED"),CameraOrientationUiRetained.SOURCE,"e".repeat(64),P));ok(hashes(complete).equals(before),"settled old export bytes unchanged");}
      CameraMatrixRecoveryStore released=store;no("released OS-lock guard refuses reads",released::state);
      for(String phase:Arrays.asList("owner","selection","destination","write","verified")){
        Path pending=chain(dir(parent,"pending-"+lane.name()+"-"+phase),lane,phase);Map<String,String> saved=hashes(pending);
        try(Held held=new Held(pending)){CameraMatrixRecoveryStore active=held.store(pending,io,lane);no("pending export not accepted "+phase,()->CameraOrientationUiRetained.exportClaim(pending.toFile(),io,lane,active));if(phase.equals("owner"))no("retained lane cannot select",active::selection);if(phase.equals("write"))no("retained lane cannot append verification",()->active.verified(lane==Lane.RETAINED_UI_ORIENTATION_FIRST?673055:2796,lane==Lane.RETAINED_UI_ORIENTATION_FIRST?CameraOrientationUiRetained.FIRST_SHA:CameraOrientationUiRetained.FIXTURE_SHA,true));ok(hashes(pending).equals(saved),"pending old lane remains immutable");}
      }
      Path torn=chain(dir(parent,"torn-"+lane.name()),lane,"write");put(torn,"verified.new",new byte[]{1});try(Held held=new Held(torn)){no("torn export refused",()->held.store(torn,io,lane));}
      Path wrong=chain(dir(parent,"wrong-inputs-"+lane.name()),lane,"terminal","f".repeat(64),lane==Lane.RETAINED_UI_ORIENTATION_FIRST?CameraOrientationUiRetained.FIRST_SHA:CameraOrientationUiRetained.FIXTURE_SHA,lane==Lane.RETAINED_UI_ORIENTATION_FIRST?673055:2796);try(Held held=new Held(wrong)){CameraMatrixRecoveryStore bad=held.store(wrong,io,lane);no("settled wrong inputs refused",()->CameraOrientationUiRetained.exportClaim(wrong.toFile(),io,lane,bad));}
      Path corrupt=chain(dir(parent,"corrupt-"+lane.name()),lane,"terminal");Files.write(corrupt.resolve("terminal"),bytes("torn"));try(Held held=new Held(corrupt)){no("bad terminal envelope refused",()->held.store(corrupt,io,lane));}
      Path wrongSha=chain(dir(parent,"wrong-hash-"+lane.name()),lane,"terminal",lane==Lane.RETAINED_UI_ORIENTATION_FIRST?CameraOrientationUiRetained.FIRST_INPUTS:CameraOrientationUiRetained.FIXTURE_INPUTS,"e".repeat(64),lane==Lane.RETAINED_UI_ORIENTATION_FIRST?673055:2796);try(Held held=new Held(wrongSha)){CameraMatrixRecoveryStore bad=held.store(wrongSha,io,lane);no("valid chain with wrong output digest refused",()->CameraOrientationUiRetained.exportClaim(wrongSha.toFile(),io,lane,bad));}
      Path wrongBytes=chain(dir(parent,"wrong-count-"+lane.name()),lane,"terminal",lane==Lane.RETAINED_UI_ORIENTATION_FIRST?CameraOrientationUiRetained.FIRST_INPUTS:CameraOrientationUiRetained.FIXTURE_INPUTS,lane==Lane.RETAINED_UI_ORIENTATION_FIRST?CameraOrientationUiRetained.FIRST_SHA:CameraOrientationUiRetained.FIXTURE_SHA,lane==Lane.RETAINED_UI_ORIENTATION_FIRST?673054:2795);try(Held held=new Held(wrongBytes)){CameraMatrixRecoveryStore bad=held.store(wrongBytes,io,lane);no("valid chain with off-by-one output bytes refused",()->CameraOrientationUiRetained.exportClaim(wrongBytes.toFile(),io,lane,bad));}
    }
    ok(io.mutations==0,"retained admission and refused append paths never invoke IO mutation");
    io.retained=10L*1024*1024+claim+exports;long independent=CameraProofStore.CAMERA_CAP-io.matrixAllowance()-io.retained-CameraOrientationPlan.OUTPUT-CameraOrientationPlan.BOOK;ok(CameraOrientationPlan.cameraCap(io.matrixAllowance(),io.retained)==independent,"all retained bytes reduce remaining capacity");
    Path current=dir(parent,CameraOrientationPlan.CAMERA_ROOT);CameraProofStore fresh=CameraProofStore.orientation(current.toFile(),io,"a".repeat(64),P);ok(((Number)fresh.status().get("aggregateClaimedBytes")).longValue()<=256L*1024*1024,"aggregate256MiB remains unchanged");io.retained=CameraProofStore.CAP;no("retained cap overflow cannot admit camera",fresh::status);no("negative retained claims refused",()->CameraOrientationPlan.cameraCap(0,-1));no("oversized retained claims refused",()->CameraOrientationPlan.cameraCap(0,CameraProofStore.CAP+1));
    ok(hashes(exact).equals(original),"all original old snapshot bytes unchanged after entire suite");ok(CameraProofFrame.hash(Files.readAllBytes(archive)).equals(archiveSha),"recovered ZIP never modified");
    System.out.println("CameraOrientationUiRetainedChecks assertions="+checks+"; host recovered-chart snapshot/lock/retention only; no Android grants, decoder or model");
  }
}

package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.channels.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Old evidence-v2 bytes and actual host locks; no Android grant or camera proof. */
public final class CameraOrientationEvidenceRetainedChecks {
  static final String OLD="p203-orientation-20261026-evidence-v2", SOURCE="7dd7a58bd8c08320d63efb91de8eb058184bb3b052574e18af09e945605d7376", APK="9b1fbf3eb755bdd4244d09003cd5d8a1e9d4571713dde63f03756c20a25dc896";
  static final String PROCESS="11111111-1111-1111-1111-111111111111", INPUTS="0f17147380946fbcdc794e1f3721aea40eb968b66d105b765c6fe343201377aa", SHA="c45216eb78bb29b58bc66b2c317172e7de49c60a5cf1b88b1e929d4b6546658f";
  static final String CAMERA="camera-proof-orientation-evidence-v2", RUN="camera-orientation-20261026-evidence-v2";
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
    Lane lane=Lane.RETAINED_EVIDENCE_ORIENTATION_FIXTURE;Path root=dir(parent,lane.root);put(root,"lock",new byte[0]);String previous=ZERO,owner=ZERO;
    Map<String,Object> verified=map("bytes",count,"sha256",sha,"reconciledReadOnly",false,"powerLossDurabilityProven",false,"providerDirectoryDurabilityProven",false,"process",PROCESS);
    for(String step:STEPS){Map<String,Object> payload;
      switch(step){
        case "owner":payload=map("lane","ORIENTATION_FIXTURE","run",OLD,"captureSource",ownerSource,"captureApk",ownerApk,"exporterSource",ownerSource,"exporterApk",ownerApk,"serializer",SERIALIZER,"inputs",inputs,"operation",PROCESS);break;
        case "selection":payload=map("selection",PROCESS,"documentId",lane.documentId,"outputCap",65536,"process",PROCESS);break;
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
    CameraMatrixRecoveryStore store(Path root,IO io)throws Exception{return new CameraMatrixRecoveryStore(root.toFile(),io,Lane.RETAINED_EVIDENCE_ORIENTATION_FIXTURE,()->requireRecovery(lock.isValid(),"HOST_LOCK_REQUIRED"),SOURCE,APK,PROCESS);}
    public void close()throws IOException{lock.release();channel.close();}
  }
  public static void main(String[] args)throws Exception{
    Path parent=dir(Path.of(args[0]),"evidence-retained"),archive=Path.of(args[1]);IO io=new IO();byte[] zip=Files.readAllBytes(archive);ok(zip.length==2796&&CameraProofFrame.hash(zip).equals(SHA),"actual exported old fixture bytes/hash");
    Set<String> entries=new TreeSet<>();try(ZipInputStream in=new ZipInputStream(new ByteArrayInputStream(zip))){ZipEntry entry;while((entry=in.getNextEntry())!=null){entries.add(entry.getName());if(entry.getName().equals("fixture.json")){Map<String,Object> fixture=parse(in.readAllBytes(),1024);ok(SOURCE.equals(fixture.get("source"))&&APK.equals(fixture.get("apk"))&&number(fixture.get("modelCalls"),0,0)==0&&number(fixture.get("originalPhotos"),0,0)==0,"actual archived generated source/APK and no-photo/no-model provenance");}}}ok(entries.equals(new TreeSet<>(Arrays.asList("fixture.json","generated-buffer-header.jpg","geometry.json","manifest.json"))),"exact old generated archive roles");
    ok(CameraOrientationFixture.source(SOURCE,APK).fingerprint().equals(INPUTS),"old fixture input fingerprint independently reconstructed");
    long emptyClaim=0;
    for(int bits=0;bits<4;bits++){Path p=dir(parent,"optional-"+bits);empty(p,(bits&1)!=0,(bits&2)!=0);Map<String,String> before=hashes(p);long claim=CameraOrientationEvidenceRetained.emptyClaims(p.toFile(),io);long expected=((bits&1)!=0?size(p.resolve(CAMERA)):0)+((bits&2)!=0?size(p.resolve(RUN)):0);ok(claim==expected,"optional empty camera/run exact byte charge");ok(before.equals(hashes(p))&&io.mutations==0,"read-only validation does not create optional old leaves");if(bits==3)emptyClaim=claim;}
    for(String leaf:Arrays.asList("M00-A000.intent","M00-A000.intent.new","M00-A000.terminal","seal")){Path p=dir(parent,"run-extra-"+leaf);empty(p,true,true);put(p.resolve(RUN),leaf,new byte[]{1});no("old run consumed/torn "+leaf,()->CameraOrientationEvidenceRetained.emptyClaims(p.toFile(),io));}
    for(String leaf:Arrays.asList(PROCESS+".reservation",PROCESS+".reservation.new",PROCESS+".raw.jpg",PROCESS+".resolution")){Path p=dir(parent,"camera-extra-"+leaf);empty(p,true,true);put(p.resolve(CAMERA),leaf,new byte[]{1});no("old camera active/consumed "+leaf,()->CameraOrientationEvidenceRetained.emptyClaims(p.toFile(),io));}
    for(String leaf:Arrays.asList("owner","registry")){Path p=dir(parent,"tamper-run-"+leaf);empty(p,false,true);Path f=p.resolve(RUN).resolve(leaf);byte[] data=Files.readAllBytes(f);data[0]^=1;Files.write(f,data);no("old run wrong bytes "+leaf,()->CameraOrientationEvidenceRetained.emptyClaims(p.toFile(),io));}
    for(String leaf:Arrays.asList("owner","refusals")){Path p=dir(parent,"tamper-camera-"+leaf);empty(p,true,false);Path f=p.resolve(CAMERA).resolve(leaf);byte[] data=Files.readAllBytes(f);data[0]^=1;Files.write(f,data);no("old camera wrong bytes "+leaf,()->CameraOrientationEvidenceRetained.emptyClaims(p.toFile(),io));}
    for(Lane lane:Arrays.asList(Lane.RETAINED_EVIDENCE_ORIENTATION_FIRST,Lane.RETAINED_EVIDENCE_ORIENTATION_FINAL)){Path p=dir(parent,"unexpected-"+lane.name());dir(p,lane.root);no("old photo export consumed",()->CameraOrientationEvidenceRetained.emptyClaims(p.toFile(),io));}
    Path exact=chain(dir(parent,"complete"),"terminal");Map<String,String> original=hashes(exact);long fixtureClaim;CameraMatrixRecoveryStore closed;
    try(Held held=new Held(exact)){closed=held.store(exact,io);fixtureClaim=CameraOrientationEvidenceRetained.settledFixtureClaims(exact.toFile(),io,closed);ok(fixtureClaim==size(exact)+2796,"old output AND bookkeeping charged");no("retained select read-only",closed::selection);no("retained terminal append read-only",()->closed.terminal("UNVERIFIED","NONE"));ok(io.mutations==0&&hashes(exact).equals(original),"retained validation and refused writes preserve all bytes");}
    CameraMatrixRecoveryStore released=closed;no("released lock refuses",released::state);
    for(String phase:Arrays.asList("owner","selection","destination","write","verified")){Path p=chain(dir(parent,"pending-"+phase),phase);Map<String,String> before=hashes(p);try(Held held=new Held(p)){CameraMatrixRecoveryStore store=held.store(p,io);no("pending fixture "+phase,()->CameraOrientationEvidenceRetained.settledFixtureClaims(p.toFile(),io,store));if(phase.equals("owner"))no("no retained selection append",store::selection);if(phase.equals("write"))no("no retained verification append",()->store.verified(2796,SHA,true));ok(before.equals(hashes(p)),"pending old fixture remains untouched");}}
    for(String mismatch:Arrays.asList("inputs","sha","bytes","source","apk")){Path p=chain(dir(parent,"wrong-"+mismatch),"terminal",mismatch.equals("inputs")?"f".repeat(64):INPUTS,mismatch.equals("sha")?"e".repeat(64):SHA,mismatch.equals("bytes")?2795:2796,mismatch.equals("source")?"d".repeat(64):SOURCE,mismatch.equals("apk")?"c".repeat(64):APK);try(Held held=new Held(p)){no("wrong fixture "+mismatch,()->CameraOrientationEvidenceRetained.settledFixtureClaims(p.toFile(),io,held.store(p,io)));}}
    Path torn=chain(dir(parent,"torn"),"write");put(torn,"verified.new",new byte[]{1});try(Held held=new Held(torn)){no("torn old export",()->held.store(torn,io));}
    Path extra=chain(dir(parent,"extra-leaf"),"terminal");put(extra,"grant",new byte[]{1});try(Held held=new Held(extra)){no("unknown persisted bookkeeping",()->held.store(extra,io));}
    ok(io.mutations==0,"all retirement checks are read-only");io.retained=10L*1024*1024+emptyClaim+fixtureClaim;
    long independent=CameraProofStore.CAMERA_CAP-io.matrixAllowance()-io.retained-90L*1024*1024-256L*1024;
    ok(CameraOrientationPlan.cameraCap(io.matrixAllowance(),io.retained)==independent,"retained outputs/records reduce current cap");Path current=dir(parent,CameraOrientationPlan.CAMERA_ROOT);CameraProofStore fresh=CameraProofStore.orientation(current.toFile(),io,"f".repeat(64),PROCESS);ok(((Number)fresh.status().get("aggregateClaimedBytes")).longValue()<=256L*1024*1024,"unchanged256MiB aggregate");io.retained=CameraProofStore.CAP;no("retained cap overflow",fresh::status);no("negative claim",()->CameraOrientationPlan.cameraCap(0,-1));no("oversized claim",()->CameraOrientationPlan.cameraCap(0,CameraProofStore.CAP+1));
    ok(hashes(exact).equals(original)&&CameraProofFrame.hash(Files.readAllBytes(archive)).equals(SHA),"original fixture and records unchanged through suite");ok(!CameraOrientationPlan.RUN.equals(OLD),"new owner namespace cannot impersonate old");
    System.out.println("CameraOrientationEvidenceRetainedChecks assertions="+checks+"; exported old fixture and synthetic host records/locks; Android persisted grants NOT exercised");
  }
}

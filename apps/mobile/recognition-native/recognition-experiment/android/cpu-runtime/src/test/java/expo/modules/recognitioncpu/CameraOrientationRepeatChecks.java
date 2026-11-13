package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Synthetic opaque-byte pending snapshot; no private image or model execution. */
public final class CameraOrientationRepeatChecks {
  static int checks;
  static void ok(boolean value,String message){checks++;if(!value)throw new AssertionError(message);}
  interface Work{void run()throws Exception;}
  static void no(Work work)throws Exception{boolean refused=false;try{work.run();}catch(IllegalArgumentException expected){refused=true;}ok(refused,"invalid boundary refused");}
  static final class IO implements CameraProofStore.IO {
    int writes;final boolean writable;IO(boolean value){writable=value;}
    public void root(File f,boolean create)throws IOException{if(create&&!writable)throw new IOException("READ_ONLY");if(create)Files.createDirectories(f.toPath());list(f);}
    public List<String> list(File f)throws IOException{if(Files.isSymbolicLink(f.toPath())||!f.isDirectory())throw new IOException("DIRECTORY");String[] names=f.list();if(names==null)throw new IOException("LIST");return Arrays.asList(names);}
    public long size(File f)throws IOException{if(!f.exists())return -1;if(Files.isSymbolicLink(f.toPath())||!f.isFile())throw new IOException("FILE");return f.length();}
    public byte[] read(File f,int cap)throws IOException{long n=size(f);if(n<0||n>cap)throw new IOException("CAP");return Files.readAllBytes(f.toPath());}
    public void syncDirectory(File f)throws IOException{list(f);}public long available(File f){return 1024L*1024*1024;}
    public long matrixAllowance(){return 94633984L;}
    public void writeNew(File f,byte[] b)throws IOException{writes++;if(!writable)throw new IOException("READ_ONLY");Files.write(f.toPath(),b,StandardOpenOption.CREATE_NEW);}
    public void publish(File a,File b)throws IOException{writes++;if(!writable||b.exists())throw new IOException("READ_ONLY_OR_CONSUMED");Files.move(a.toPath(),b.toPath());}
    public void writeAt(File f,int p,byte[] b)throws IOException{writes++;throw new IOException("READ_ONLY");}
  }
  static Map<String,String> hashes(Path parent)throws Exception{Map<String,String> result=new TreeMap<>();try(var paths=Files.walk(parent)){for(Path p:(Iterable<Path>)paths.filter(Files::isRegularFile)::iterator)result.put(parent.relativize(p).toString(),CameraProofFrame.hash(Files.readAllBytes(p)));}return result;}
  static Map<String,String> fixture(Path parent)throws Exception{
    Path camera=parent.resolve(CameraOrientationRepeatRetained.CAMERA),run=parent.resolve(CameraOrientationRepeatRetained.ROOT);Files.createDirectories(camera);Files.createDirectories(run);
    String oldProcess="f274775c-fc26-485a-9bbf-48d007b77016",nonce="914cbd5f-1d03-458e-a90d-efd15de9becd";
    Map<String,Object> request=map("camera",map("reportedWidth",640,"reportedHeight",480,"previewWidth",608,"previewHeight",304,"layout","A","contentMode","FILL"),"previewRectPhysical",map("left",45,"top",418,"right",653,"bottom",722),"viewGeneration",17);
    String requestHash=CameraProofFrame.hash(bytes(json(request)));
    Map<String,Object> payload=map("caseId",CameraOrientationRepeatRetained.CASE,"jobId",CameraOrientationRepeatRetained.JOB,"targetSha256",CameraOrientationPlan.CASES.get(0).target,"source",CameraOrientationRepeatRetained.SOURCE,"apk",CameraOrientationRepeatRetained.APK,"request",request,"requestSha256",requestHash,"nonce",nonce,"process",oldProcess);
    Files.write(run.resolve("owner"),CameraOrientationRepeatRetained.runOwner());Files.write(run.resolve("registry"),CameraOrientationRepeatRetained.registry());Files.write(run.resolve("M00-A000.intent"),CameraOrientationRepeatRetained.record("M00-A000.intent",payload));
    Files.write(camera.resolve("owner"),CameraOrientationRepeatRetained.cameraOwner());Files.write(camera.resolve("refusals"),new byte[CameraProofStore.REFUSALS]);
    Map<String,byte[]> data=new TreeMap<>();data.put("raw.jpg",bytes("opaque synthetic host fixture, no image decoding"));
    data.put("reservation",bytes(CameraOrientationRepeatRetained.SOURCE+"\n"+CameraOrientationRepeatRetained.JOB+"\n"+oldProcess+"\n"+CameraProofStore.RESERVATION+"\n"));
    data.put("request.json",bytes(json(map("sourceSha256",CameraOrientationRepeatRetained.SOURCE,"matrixRun",CameraOrientationRepeatRetained.RUN,"matrixCase","M00-A000","matrixApk",CameraOrientationRepeatRetained.APK,"matrixSource",CameraOrientationRepeatRetained.SOURCE,"matrixRequestSha256",requestHash,"matrixNonce",nonce))));
    Map<String,String> pins=new TreeMap<>();for(Map.Entry<String,byte[]> e:data.entrySet()){Files.write(camera.resolve(CameraOrientationRepeatRetained.JOB+"."+e.getKey()),e.getValue());pins.put(e.getKey(),e.getValue().length+":"+CameraProofFrame.hash(e.getValue()));}return pins;
  }
  static void unchangedRefusal(Path p,IO io,Work action)throws Exception{Map<String,String> before=hashes(p);no(action);ok(io.writes==0&&before.equals(hashes(p)),"refusal preserves old bytes");}
  public static void main(String[] args)throws Exception{
    Path base=Path.of(args[0]);Files.createDirectories(base);IO io=new IO(false);Path p=base.resolve("valid");Map<String,String> pins=fixture(p);Map<String,String> before=hashes(p);
    long retained=CameraOrientationRepeatRetained.pendingClaims(p.toFile(),io,12248654L,pins);
    ok(retained==26075378L+262144,"full pending claim plus full old book, not raw actual size");ok(io.writes==0&&before.equals(hashes(p)),"valid read-only admission preserves bytes");
    long newRetained=12248654L+retained,newCap=CameraOrientationPlan.cameraCap(94633984L,newRetained);
    long aggregate=26075378L+33816576L+94633984L+newRetained+CameraOrientationPlan.ACTIVE_OUTPUT+CameraOrientationPlan.BOOK;
    ok(aggregate==210151474L&&aggregate<=CameraProofStore.CAP,"conditional conservative256MiB bound");ok(newCap>=CameraProofStore.RESERVATION+65536+1024,"new claim fits");
    no(()->CameraOrientationPlan.cameraCap(94633984L,CameraProofStore.CAP+1));
    unchangedRefusal(p,io,()->CameraOrientationRepeatRetained.pendingClaims(p.toFile(),io,12248653L,pins));
    unchangedRefusal(p,io,()->CameraOrientationRepeatRetained.pendingClaims(p.toFile(),io,12248654L));
    for(String role:Arrays.asList("owner","raw.jpg","request.json","reservation")){
      Path q=base.resolve("changed-"+role);Map<String,String> expected=fixture(q);Path f=q.resolve(CameraOrientationRepeatRetained.CAMERA).resolve(role.equals("owner")?role:CameraOrientationRepeatRetained.JOB+"."+role);byte[] b=Files.readAllBytes(f);b[0]^=1;Files.write(f,b);unchangedRefusal(q,io,()->CameraOrientationRepeatRetained.pendingClaims(q.toFile(),io,12248654L,expected));
    }
    for(String leaf:Arrays.asList("M00-A000.terminal","M01-A090.intent","unknown.new")){
      Path q=base.resolve("run-"+leaf);Map<String,String> expected=fixture(q);Files.write(q.resolve(CameraOrientationRepeatRetained.ROOT).resolve(leaf),new byte[]{1});unchangedRefusal(q,io,()->CameraOrientationRepeatRetained.pendingClaims(q.toFile(),io,12248654L,expected));
    }
    for(CameraMatrixRecoveryPlan.Lane lane:Arrays.asList(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIRST,CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FINAL)){
      Path q=base.resolve("consumed-"+lane.name());Map<String,String> expected=fixture(q);Files.createDirectory(q.resolve(lane.root));unchangedRefusal(q,io,()->CameraOrientationRepeatRetained.pendingClaims(q.toFile(),io,12248654L,expected));
      no(()->CameraOrientationRepeatRetained.rejectGrant(lane.uri));ok(lane.retained()&&lane.outputCap==90*1024*1024&&lane.run().equals(CameraOrientationRepeatRetained.RUN),"old lane remains frozen/read-only");
    }
    no(()->CameraOrientationRepeatRetained.rejectGrant(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIXTURE.uri));
    no(()->CameraOrientationRepeatRetained.rejectGrant("content://com.android.externalstorage.documents/tree/primary%3ADownload"));
    no(()->CameraOrientationRepeatRetained.rejectGrant(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIRST.uri+"?unknown=1"));
    CameraOrientationRepeatRetained.rejectGrant(CameraMatrixRecoveryPlan.Lane.ORIENTATION_FIXTURE.uri);
    ok(CameraOrientationPlan.CASES.size()==8&&CameraOrientationPlan.ACTIVE_CASES.size()==1&&CameraOrientationPlan.MAX_CASES==1,"old registry eight/current one");no(()->CameraOrientationPlan.get("M01-A090"));
    ok(!CameraOrientationPlan.get("M00-A000").job.equals(CameraOrientationRepeatRetained.JOB),"fresh job identity");
    Path fresh=base.resolve(CameraOrientationPlan.ROOT);Files.createDirectory(fresh);IO write=new IO(true);CameraOrientationStore store=new CameraOrientationStore(fresh.toFile(),write,"1".repeat(64),"2".repeat(64),UUID.randomUUID().toString(),true);
    Map<String,Object> request=map("camera",map("reportedWidth",640,"reportedHeight",480,"previewWidth",608,"previewHeight",304,"layout","A","contentMode","FILL"),"previewRectPhysical",map("left",45,"top",418,"right",653,"bottom",722),"viewGeneration",17);
    store.consume(CameraOrientationPlan.get("M00-A000"),request,UUID.randomUUID().toString());ok(store.next().equals("UNRESOLVED"),"new intent one use");no(()->store.consume(CameraOrientationPlan.get("M00-A000"),request,UUID.randomUUID().toString()));no(()->store.exportable(8));
    ok(!CameraOrientationFixture.source("1".repeat(64),"2".repeat(64)).fingerprint().equals(CameraOrientationFixture.source(CameraOrientationRepeatRetained.SOURCE,CameraOrientationRepeatRetained.APK).fingerprint()),"current fixture cannot use historical identity");
    System.out.println("CameraOrientationRepeatChecks assertions="+checks+"; synthetic opaque bytes; no phone/images/model; full old pending charge preserved");
  }
}

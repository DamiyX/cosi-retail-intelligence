package expo.modules.recognitioncpu;
import java.nio.file.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Recognized source753 pre-exposure residues only; opaque metadata, no phone or image. */
public final class CameraOrientationRepeatSetupChecks {
  static int checks;
  static void ok(boolean value,String why){checks++;if(!value)throw new AssertionError(why);}
  interface Work{void run()throws Exception;}
  static void no(Work work)throws Exception{boolean stopped=false;try{work.run();}catch(IllegalArgumentException expected){stopped=true;}ok(stopped,"unsafe residue refused");}
  static byte[] owner(String source){
    Map<String,Object> payload=map("lane","ORIENTATION_FIXTURE","run",CameraOrientationRepeatSetupRetained.RUN,"captureSource",source,"captureApk",CameraOrientationRepeatSetupRetained.APK,"exporterSource",source,"exporterApk",CameraOrientationRepeatSetupRetained.APK,"serializer",CameraMatrixRecoveryPlan.SERIALIZER,"inputs",CameraOrientationRepeatSetupRetained.INPUTS,"operation","e0000000-0000-4000-8000-000000000011");
    Map<String,Object> base=map("step","owner","previous",CameraMatrixRecoveryPlan.ZERO,"owner",CameraMatrixRecoveryPlan.ZERO,"payload",payload);Map<String,Object> record=new TreeMap<>(base);record.put("digest",CameraProofFrame.hash(bytes(json(base))));return bytes(json(record));
  }
  static Path fixture(Path base,String name,String shape,boolean run)throws Exception{
    Path p=base.resolve(name),camera=p.resolve(CameraOrientationRepeatSetupRetained.CAMERA);Files.createDirectories(camera);Files.write(camera.resolve("owner"),CameraOrientationRepeatSetupRetained.cameraOwner());Files.write(camera.resolve("refusals"),new byte[CameraProofStore.REFUSALS]);
    if(run){Path root=p.resolve(CameraOrientationRepeatSetupRetained.ROOT);Files.createDirectory(root);Files.write(root.resolve("owner"),CameraOrientationRepeatSetupRetained.runOwner());Files.write(root.resolve("registry"),CameraOrientationRepeatSetupRetained.registry());}
    Path old=p.resolve(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE.root);Files.createDirectory(old);Files.write(old.resolve("lock"),new byte[0]);
    if(!shape.equals("empty"))Files.write(old.resolve(shape),owner(CameraOrientationRepeatSetupRetained.SOURCE));return p;
  }
  static void unchangedNo(Path p,CameraOrientationRepeatChecks.IO io)throws Exception{
    Map<String,String> before=CameraOrientationRepeatChecks.hashes(p);no(()->CameraOrientationRepeatSetupRetained.claims(p.toFile(),io));ok(io.writes==0&&before.equals(CameraOrientationRepeatChecks.hashes(p)),"read-only refusal preserves residue");
  }
  public static void main(String[] args)throws Exception{
    Path base=Path.of(args[0]);Files.createDirectories(base);CameraOrientationRepeatChecks.IO io=new CameraOrientationRepeatChecks.IO(false);
    for(String shape:Arrays.asList("empty","owner.new","owner"))for(boolean run:Arrays.asList(false,true)){
      Path p=fixture(base,"valid-"+shape+"-"+run,shape,run);Map<String,String> before=CameraOrientationRepeatChecks.hashes(p);long n=CameraOrientationRepeatSetupRetained.claims(p.toFile(),io);
      ok(n==327922,"full753 base+256KiB book kept");ok(io.writes==0&&before.equals(CameraOrientationRepeatChecks.hashes(p)),"valid residue never completed/adopted/rewritten");
    }
    ok(210151474L+327922L==210479396L&&210479396L<CameraProofStore.CAP,"additional retained book/base charged, cap not enlarged");
    for(String name:Arrays.asList("M00-A000.intent","M00-A000.terminal","owner.new")){
      Path p=fixture(base,"run-"+name,"owner.new",true);Files.write(p.resolve(CameraOrientationRepeatSetupRetained.ROOT).resolve(name),new byte[]{1});unchangedNo(p,io);
    }
    for(String name:Arrays.asList(CameraOrientationRepeatSetupRetained.JOB+".reservation",CameraOrientationRepeatSetupRetained.JOB+".raw.jpg","unknown")){
      Path p=fixture(base,"camera-"+name,"owner.new",false);Files.write(p.resolve(CameraOrientationRepeatSetupRetained.CAMERA).resolve(name),new byte[]{1});unchangedNo(p,io);
    }
    for(String name:Arrays.asList("selection","selection.new","destination","write","verified","terminal","unknown")){
      Path p=fixture(base,"export-"+name,"owner.new",false);Files.write(p.resolve(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE.root).resolve(name),new byte[]{1});unchangedNo(p,io);
    }
    for(CameraMatrixRecoveryPlan.Lane lane:Arrays.asList(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIRST,CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FINAL)){
      Path p=fixture(base,"other-"+lane.name(),"owner.new",false);Files.createDirectory(p.resolve(lane.root));unchangedNo(p,io);no(()->CameraOrientationRepeatRetained.rejectGrant(lane.uri));ok(lane.retained()&&lane.outputCap==16*1024*1024&&lane.run().equals(CameraOrientationRepeatSetupRetained.RUN),"753 lane frozen/read-only");
    }
    no(()->CameraOrientationRepeatRetained.rejectGrant(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE.uri));
    Path p=fixture(base,"wrong-source","owner.new",false);Files.write(p.resolve(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE.root).resolve("owner.new"),owner("3".repeat(64)));unchangedNo(p,io);
    p=fixture(base,"torn","owner.new",false);Files.write(p.resolve(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE.root).resolve("owner.new"),new byte[]{'{'});boolean refused=false;Map<String,String> before=CameraOrientationRepeatChecks.hashes(p);try{CameraOrientationRepeatSetupRetained.claims(p.toFile(),io);}catch(Exception expected){refused=true;}ok(refused&&before.equals(CameraOrientationRepeatChecks.hashes(p)),"torn owner is preserved/refused");
    p=fixture(base,"both","owner.new",false);Files.write(p.resolve(CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE.root).resolve("owner"),owner(CameraOrientationRepeatSetupRetained.SOURCE));unchangedNo(p,io);
    System.out.println("CameraOrientationRepeatSetupChecks assertions="+checks+"; recognized753 initialization only; no mutation/image/model");
  }
}

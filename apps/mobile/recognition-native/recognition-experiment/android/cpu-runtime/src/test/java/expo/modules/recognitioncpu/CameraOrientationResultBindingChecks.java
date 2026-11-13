package expo.modules.recognitioncpu;
import java.nio.file.*;
import java.nio.channels.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;
/** Current-operation binding and unchanged native one-WRITE engine. Host only. */
public final class CameraOrientationResultBindingChecks {
  static int checks;interface Work{void run()throws Exception;}
  static void ok(boolean v,String why){checks++;if(!v)throw new AssertionError(why);}
  static void no(Work w)throws Exception{try{w.run();throw new AssertionError("Expected refusal");}catch(IllegalArgumentException|IllegalStateException expected){checks++;}}
  static final class Fixture implements AutoCloseable {
    final Path root;final CameraOrientationPreviewRetainedChecks.IO io=new CameraOrientationPreviewRetainedChecks.IO();final FileChannel channel;final FileLock lock;final CameraMatrixRecoveryStore store;final CameraMatrixRecoveryEngine.StreamSource source;final CameraMatrixRecoveryChecks.Output output=new CameraMatrixRecoveryChecks.Output();
    Fixture(Path parent,String name,String apk)throws Exception{Path p=parent.resolve(name);Files.createDirectories(p);root=p.resolve(Lane.ORIENTATION_FIXTURE.root);Files.createDirectory(root);Files.createFile(root.resolve("lock"));channel=FileChannel.open(root.resolve("lock"),StandardOpenOption.WRITE);lock=channel.tryLock();store=new CameraMatrixRecoveryStore(root.toFile(),io,Lane.ORIENTATION_FIXTURE,()->requireRecovery(lock.isValid(),"LOCK"),CameraOrientationSource.SHA256,apk,"77777777-7777-4777-8777-777777777777");source=CameraOrientationFixture.source(CameraOrientationSource.SHA256,apk);store.initialize(source.fingerprint(),true);store.selection();}
    public void close()throws java.io.IOException{lock.release();channel.close();}
  }
  public static void main(String[] args)throws Exception{
    Path parent=Path.of(args[0]);Files.createDirectories(parent);
    try(Fixture a=new Fixture(parent,"a","a".repeat(64));Fixture b=new Fixture(parent,"b","a".repeat(64));Fixture c=new Fixture(parent,"c","b".repeat(64))){
      String route=CameraOrientationResultBinding.create(a.store,Lane.ORIENTATION_FIXTURE);CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIXTURE,route);ok(route.contains(CameraOrientationPlan.RUN),"fixed current namespace in route");
      no(()->CameraOrientationResultBinding.verify(b.store,Lane.ORIENTATION_FIXTURE,route));no(()->CameraOrientationResultBinding.verify(c.store,Lane.ORIENTATION_FIXTURE,route));no(()->CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIRST,route));
      no(()->CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIXTURE,null));no(()->CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIXTURE,"x".repeat(4097)));no(()->CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIXTURE,route.replace(CameraOrientationPlan.RUN,CameraOrientationPreviewRetained.RUN)));no(()->CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIXTURE,route+" "));
      int before=a.io.mutations;a.store.status();ok(a.io.mutations==before&&a.output.writes==0&&!a.store.has("write"),"selection status has no effects");no(a.store::selection);
      a.store.destination(Lane.ORIENTATION_FIXTURE.uri,67,a.output.identity());a.store.status();ok(a.output.writes==0&&!a.store.has("write"),"destination status does not auto-continue");no(()->CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIXTURE,route));
      new CameraMatrixRecoveryEngine(a.store,a.source,Lane.ORIENTATION_FIXTURE).continueSelected(a.output);ok(a.store.state().equals("TERMINAL")&&a.store.payload("terminal").get("status").equals("READBACK_VERIFIED"),"explicit continuation writes/verifies");int writes=a.output.writes;
      new CameraMatrixRecoveryEngine(a.store,a.source,Lane.ORIENTATION_FIXTURE).continueSelected(a.output);ok(a.output.writes==writes,"terminal repeated continuation never rewrites");no(()->CameraOrientationResultBinding.verify(a.store,Lane.ORIENTATION_FIXTURE,route));
      ok(!Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE.uri.equals(Lane.ORIENTATION_FIXTURE.uri),"old output cannot be current destination");
    }
    System.out.println("CameraOrientationResultBindingChecks assertions="+checks+"; current host operation tokens; Android route/grants not exercised");
  }
}

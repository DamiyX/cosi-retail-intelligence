package expo.modules.recognitioncpu;
import java.nio.file.*;
import java.nio.channels.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryChecks.*;
public final class CameraMatrixRecoveryLifecycleChecks {
  public static void main(String[] args)throws Exception{
    // Actual old pure session: a fresh instance has no callback ticket after process recreation.
    AtomicBoolean busy=new AtomicBoolean(),closed=new AtomicBoolean();var old=new CameraMatrixStore.ExportSession<String>(busy,closed);var ticket=old.begin("old",()->null);old.dispatch(ticket,()->{});var restored=new CameraMatrixStore.ExportSession<String>(new AtomicBoolean(),closed);ok(restored.callback(REQUEST)==null,"failure-before: old callback ticket is memory-only");
    Path root=Path.of(args[0]);Files.createDirectories(root);Fixture f=new Fixture(root,"new-instance");f.selected();CameraMatrixEvidence prepared=f.source.archive(f.source.fingerprint());ok(prepared!=null,"archive existed before generated death");prepared=null;f.restart();new CameraMatrixRecoveryEngine(f.store,CameraMatrixRecoveryEngine.fixture(SOURCE,APK),Lane.FIXTURE).continueSelected(f.out);ok(f.store.state().equals("TERMINAL"),"correction reconstructs source/archive with no previous prepared object");no("second recovery owner",()->f.store.initialize(f.source.fingerprint(),false));no("duplicate selection result",()->f.store.destination(Lane.FIXTURE.uri,67,f.out.identity()));
    Fixture noPersist=new Fixture(root,"offered-grants");noPersist.store.selection();no("read/write without offered persistable flag",()->noPersist.store.destination(Lane.FIXTURE.uri,3,noPersist.out.identity()));ok(!noPersist.store.has("destination"),"missing offered grant persists no destination");
    Fixture permit=new Fixture(root,"write-permit");permit.selected();var expected=CameraMatrixRecoveryEngine.expected(permit.source.archive(permit.source.fingerprint()),FIXTURE_OUTPUT);var p=permit.store.claimWrite(expected.bytes,expected.sha256,permit.source.fingerprint());permit.store.use(p);no("ephemeral permit single use",()->permit.store.use(p));no("persistent second WRITE",()->permit.store.claimWrite(expected.bytes,expected.sha256,permit.source.fingerprint()));permit.restart();no("old permit cannot authorize restored store",()->permit.store.use(p));
    Path file=root.resolve("os-lock");Files.createFile(file);try(FileChannel one=FileChannel.open(file,StandardOpenOption.WRITE);FileLock held=one.tryLock();FileChannel two=FileChannel.open(file,StandardOpenOption.WRITE)){
      ok(held!=null,"host OS exclusive lock acquired");try{var second=two.tryLock();ok(second==null,"other channel cannot acquire");}catch(OverlappingFileLockException expectedLock){ok(true,"concurrent owner rejected by host OS lock");}
    }
    Fixture tooLarge=new Fixture(root,"oversized");Files.write(tooLarge.root.resolve("selection.new"),new byte[RECORD+1]);no("oversized/torn records",()->tooLarge.restart());ok(Files.size(tooLarge.root.resolve("selection.new"))==RECORD+1,"oversize residue preserved");
    System.out.println("CameraMatrixRecoveryLifecycleChecks assertions="+checks+"; host reconstruction/lock checks; Android Activity result/grant lifetime pending S3");
  }
}

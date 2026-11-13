package expo.modules.recognitioncpu;
import java.nio.file.*;
import java.nio.channels.FileChannel;
import java.nio.ByteBuffer;
import java.util.*;

/** Production journal/profile through real host files; native closure observations are synthetic. */
public final class CameraCaptureDiagnosticRecoveryChecks {
 static int checks;interface Work{void run()throws Exception;}static void ok(boolean value){if(!value)throw new AssertionError();checks++;}
 static void refuses(Work w)throws Exception{boolean failed=false;try{w.run();}catch(Exception e){failed=true;}ok(failed);}
 static final class IO implements CameraCaptureDiagnosticSetup.IO {
  final Path root;int syncs;IO(Path root){this.root=root;}
  public void createFresh()throws Exception{Files.createDirectory(root);}
  public Set<String> names()throws Exception{Set<String> out=new HashSet<>();try(var paths=Files.list(root)){paths.forEach(p->out.add(p.getFileName().toString()));}return out;}
  public byte[] read(String name,int cap)throws Exception{Path p=root.resolve(name);if(Files.isSymbolicLink(p)||!Files.isRegularFile(p)||Files.size(p)>cap)throw new IllegalStateException();return Files.readAllBytes(p);}
  public void writeNew(String name,byte[] bytes)throws Exception{try(FileChannel out=FileChannel.open(root.resolve(name),StandardOpenOption.WRITE,StandardOpenOption.CREATE_NEW)){ByteBuffer data=ByteBuffer.wrap(bytes);while(data.hasRemaining())out.write(data);out.force(true);}}
  public void syncDirectory(){syncs++;} // Host force-directory differs from Android; never claim an Android fsync proof.
 }
 static CameraCaptureDiagnosticSetup.Owner owner(int epoch){return new CameraCaptureDiagnosticSetup.Owner(CameraCaptureDiagnosticProfile.RUN,epoch,CameraCaptureDiagnosticProfile.EXECUTOR_SOURCE_SHA256,"b".repeat(64),CameraCaptureDiagnosticProfile.RETAINED_SHA256,"22222222-2222-4222-8222-222222222222");}
 public static void main(String[] args)throws Exception{
  String hash="2af362b5900ee09b592a478ff3202c27e3459cd11be213f0ef558142ffb40c78";
  ok(CameraCaptureDiagnosticProfile.RETAINED_SHA256.equals(hash));ok(CameraCaptureDiagnosticProfile.bound());
  ok(CameraCaptureDiagnosticProfile.root(1).equals("camera-capture-diagnostic-setup-20261029-b1-e01"));ok(CameraCaptureDiagnosticProfile.ownedRoot(CameraCaptureDiagnosticProfile.root(3)));refuses(()->CameraCaptureDiagnosticProfile.root(4));
  for(String bad:List.of("camera-capture-diagnostic-20261029-a1",CameraCaptureDiagnosticProfile.RUN,CameraCaptureDiagnosticProfile.RUN+"-e04",CameraCaptureDiagnosticProfile.RUN+"-e01/child","unknown"))ok(!CameraCaptureDiagnosticProfile.ownedRoot(bad));
  CameraCaptureDiagnosticSession.Admission admission=CameraCaptureDiagnosticProfile.admit(hash,hash,221227300L,0,true);ok(admission.retainedClaims+admission.newClaim==253471012L);
  refuses(()->CameraCaptureDiagnosticProfile.admit(hash,hash,210479396L,0,true));refuses(()->CameraCaptureDiagnosticProfile.admit(hash,hash,221227300L,0,false));refuses(()->CameraCaptureDiagnosticProfile.admit(hash,"a".repeat(64),221227300L,0,true));refuses(()->CameraCaptureDiagnosticProfile.admit(hash,hash,221227300L,30_000_000_000L,true));
  ok(CameraCaptureDiagnosticSession.hash(Files.readAllBytes(Path.of(args[0]))).equals(hash));
  Path temp=Files.createTempDirectory("diagnostic-epoch-real-files-");
  try{
   IO io=new IO(temp.resolve("e01"));var setup=CameraCaptureDiagnosticSetup.create(io,owner(1));ok(io.names().equals(Set.of("setup-owner")));ok(io.syncs==1);ok(CameraCaptureDiagnosticSetup.Owner.parse(io.read("setup-owner",1024)).process.equals(owner(1).process));
   ok(setup.interruptBeforeReady());refuses(()->setup.commitPreReadyClosed(new CameraCaptureDiagnosticSetup.ReleaseObservation(false,true,true)));ok(!io.names().contains("pre-ready-closed"));
   setup.commitPreReadyClosed(new CameraCaptureDiagnosticSetup.ReleaseObservation(true,true,true));var old=CameraCaptureDiagnosticSetup.readClosed(io,owner(1));ok(io.names().equals(Set.of("setup-owner","pre-ready-closed")));
   CameraCaptureDiagnosticSetup.admitNext(List.of(old),owner(2),221227300L,true,new CameraCaptureDiagnosticSetup.ReleaseObservation(true,true,true));ok(true);
   byte[] before=Files.readAllBytes(io.root.resolve("setup-owner"));refuses(()->CameraCaptureDiagnosticSetup.create(io,owner(1)));ok(Arrays.equals(before,Files.readAllBytes(io.root.resolve("setup-owner"))));
   Files.write(io.root.resolve("capture.jpeg"),new byte[0],StandardOpenOption.CREATE_NEW);refuses(()->CameraCaptureDiagnosticSetup.readClosed(io,owner(1)));Files.delete(io.root.resolve("capture.jpeg"));
   Files.write(io.root.resolve("pre-ready-closed"),new byte[]{0},StandardOpenOption.TRUNCATE_EXISTING);refuses(()->CameraCaptureDiagnosticSetup.readClosed(io,owner(1)));
   IO readyIO=new IO(temp.resolve("e02"));var ready=CameraCaptureDiagnosticSetup.create(readyIO,owner(2));ready.claimReadyAttempt();ok(!ready.interruptBeforeReady());ready.persistReadyAttempt();ok(readyIO.names().contains("ready-attempt"));refuses(()->CameraCaptureDiagnosticSetup.readClosed(readyIO,owner(2)));refuses(()->ready.commitPreReadyClosed(new CameraCaptureDiagnosticSetup.ReleaseObservation(true,true,true)));
   refuses(()->CameraCaptureDiagnosticSetup.Owner.parse("SETUP2|bad".getBytes()));refuses(()->CameraCaptureDiagnosticSetup.Owner.parse(new String(owner(1).bytes()).replace("|1|","|01|").getBytes()));
  }finally{try(var paths=Files.walk(temp)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(p);}}
  System.out.println("PASS "+checks+" real-host-file/profile/quarantine/READY checks; no Android release/fsync evidence");
 }
}

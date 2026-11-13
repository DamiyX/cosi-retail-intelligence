package expo.modules.recognitioncpu;

import java.util.*;
import java.util.concurrent.*;

/** Real production protocol exercised with synthetic IO/native release observations. No phone proof. */
public final class CameraCaptureDiagnosticSetupChecks {
  static int checks;
  interface Work { void run() throws Exception; }
  static void ok(boolean value) { if(!value)throw new AssertionError();checks++; }
  static void refuses(Work work)throws Exception { boolean refused=false;try{work.run();}catch(IllegalStateException expected){refused=true;}ok(refused); }
  static final String A="a".repeat(64),B="b".repeat(64),C="c".repeat(64),PROCESS="11111111-1111-4111-8111-111111111111";
  static CameraCaptureDiagnosticSetup.Owner owner(int epoch) { return new CameraCaptureDiagnosticSetup.Owner("camera-capture-diagnostic-setup-20261029-b1",epoch,A,B,C,PROCESS); }
  static CameraCaptureDiagnosticSetup.ReleaseObservation release(boolean closed,boolean absent,boolean held) { return new CameraCaptureDiagnosticSetup.ReleaseObservation(closed,absent,held); }
  static final class IO implements CameraCaptureDiagnosticSetup.IO {
    boolean exists; String fail,hold;CountDownLatch entered=new CountDownLatch(1),resume=new CountDownLatch(1);
    Map<String,byte[]> files=new ConcurrentHashMap<>();
    public void createFresh(){if(exists)throw new IllegalStateException("EXISTING");exists=true;}
    public Set<String> names(){return new HashSet<>(files.keySet());}
    public byte[] read(String name,int cap){byte[] bytes=files.get(name);if(bytes==null||bytes.length>cap)throw new IllegalStateException("MISSING_OR_CAP");return bytes.clone();}
    public void writeNew(String name,byte[] value)throws Exception {
      if(name.equals(hold)){entered.countDown();if(!resume.await(2,TimeUnit.SECONDS))throw new AssertionError("TEST_TIMEOUT");}
      if(name.equals(fail))throw new IllegalStateException("INJECTED_IO");
      if(files.putIfAbsent(name,value.clone())!=null)throw new IllegalStateException("EXCLUSIVE");
    }
    public void syncDirectory(){}
  }
  static CameraCaptureDiagnosticSetup.RetainedClosed interrupted(IO io,int epoch)throws Exception {
    CameraCaptureDiagnosticSetup setup=CameraCaptureDiagnosticSetup.create(io,owner(epoch));ok(setup.interruptBeforeReady());setup.commitPreReadyClosed(release(true,true,true));return CameraCaptureDiagnosticSetup.readClosed(io,owner(epoch));
  }
  public static void main(String[] args)throws Exception {
    // Original session mechanism: pre-READY lifecycle invalidation permanently cancels it.
    CameraCaptureDiagnosticSession original=new CameraCaptureDiagnosticSession(new CameraCaptureDiagnosticSession.Sink(){public void record(String n,String v){}public void save(byte[] b){}},b->{});
    ok(original.invalidate("LIFECYCLE"));refuses(()->original.ready(new CameraCaptureDiagnosticSession.Admission(true,true,0,CameraCaptureDiagnosticSetup.CLAIM),"geometry",1));
    IO first=new IO();CameraCaptureDiagnosticSetup setup=CameraCaptureDiagnosticSetup.create(first,owner(1));ok(first.names().equals(Set.of(CameraCaptureDiagnosticSetup.OWNER)));
    refuses(()->CameraCaptureDiagnosticSetup.readClosed(first,owner(1)));ok(setup.interruptBeforeReady());ok(!setup.interruptBeforeReady());
    for(CameraCaptureDiagnosticSetup.ReleaseObservation bad:List.of(release(false,true,true),release(true,false,true),release(true,true,false)))refuses(()->setup.commitPreReadyClosed(bad));
    ok(!first.files.containsKey(CameraCaptureDiagnosticSetup.CLOSED));setup.commitPreReadyClosed(release(true,true,true));
    CameraCaptureDiagnosticSetup.RetainedClosed prior=CameraCaptureDiagnosticSetup.readClosed(first,owner(1));ok(true);
    CameraCaptureDiagnosticSetup.admitNext(List.of(prior),owner(2),221227300L,true,release(true,true,true));ok(true);
    refuses(()->CameraCaptureDiagnosticSetup.create(first,owner(1)));refuses(setup::beginReady);
    IO second=new IO();CameraCaptureDiagnosticSetup.RetainedClosed prior2=interrupted(second,2);CameraCaptureDiagnosticSetup.admitNext(List.of(prior,prior2),owner(3),221227300L,true,release(true,true,true));ok(true);
    refuses(()->owner(4));refuses(()->CameraCaptureDiagnosticSetup.admitNext(List.of(prior),owner(3),221227300L,true,release(true,true,true)));
    refuses(()->CameraCaptureDiagnosticSetup.admitNext(List.of(prior),owner(2),221227300L,false,release(true,true,true)));
    refuses(()->CameraCaptureDiagnosticSetup.admitNext(List.of(prior),owner(2),221227300L,true,release(false,true,true)));
    CameraCaptureDiagnosticSetup.Owner wrong=new CameraCaptureDiagnosticSetup.Owner(owner(2).run,2,B,B,C,PROCESS);
    refuses(()->CameraCaptureDiagnosticSetup.admitNext(List.of(prior),wrong,221227300L,true,release(true,true,true)));
    // Empty A1 has no durable owner and is NEVER accepted by this future protocol.
    IO legacy=new IO();legacy.exists=true;refuses(()->CameraCaptureDiagnosticSetup.readClosed(legacy,owner(1)));
    for(String unknown:List.of("ready-attempt","capture.jpeg","event-000","unexpected")){
      first.files.put(unknown,new byte[0]);refuses(()->CameraCaptureDiagnosticSetup.readClosed(first,owner(1)));first.files.remove(unknown);
    }
    byte[] closed=first.files.get(CameraCaptureDiagnosticSetup.CLOSED);first.files.put(CameraCaptureDiagnosticSetup.CLOSED,new byte[]{1});refuses(()->CameraCaptureDiagnosticSetup.readClosed(first,owner(1)));first.files.put(CameraCaptureDiagnosticSetup.CLOSED,closed);
    byte[] own=first.files.get(CameraCaptureDiagnosticSetup.OWNER);first.files.put(CameraCaptureDiagnosticSetup.OWNER,owner(2).bytes());refuses(()->CameraCaptureDiagnosticSetup.readClosed(first,owner(1)));first.files.put(CameraCaptureDiagnosticSetup.OWNER,own);
    ok(CameraCaptureDiagnosticSetup.reserveAll(221227300L)==253471012L);
    ok(CameraCaptureDiagnosticSetup.reserveAll(CameraCaptureDiagnosticSession.CAP-3*CameraCaptureDiagnosticSetup.CLAIM)==CameraCaptureDiagnosticSession.CAP);
    refuses(()->CameraCaptureDiagnosticSetup.reserveAll(CameraCaptureDiagnosticSession.CAP-3*CameraCaptureDiagnosticSetup.CLAIM+1));refuses(()->CameraCaptureDiagnosticSetup.reserveAll(-1));refuses(()->CameraCaptureDiagnosticSetup.reserveAll(Long.MAX_VALUE));
    IO readyIO=new IO();CameraCaptureDiagnosticSetup ready=CameraCaptureDiagnosticSetup.create(readyIO,owner(1));ready.beginReady();ok(!ready.interruptBeforeReady());refuses(()->ready.commitPreReadyClosed(release(true,true,true)));refuses(()->CameraCaptureDiagnosticSetup.readClosed(readyIO,owner(1)));
    IO failure=new IO();CameraCaptureDiagnosticSetup failed=CameraCaptureDiagnosticSetup.create(failure,owner(1));failure.fail=CameraCaptureDiagnosticSetup.READY;refuses(failed::beginReady);ok(!failed.interruptBeforeReady());refuses(()->failed.commitPreReadyClosed(release(true,true,true)));
    // READY attempt wins BEFORE its IO: concurrent lifecycle cannot make a successor eligible.
    IO raceIO=new IO();CameraCaptureDiagnosticSetup raced=CameraCaptureDiagnosticSetup.create(raceIO,owner(1));raceIO.hold=CameraCaptureDiagnosticSetup.READY;
    ExecutorService worker=Executors.newSingleThreadExecutor();Future<?> writing=worker.submit(()->{try{raced.beginReady();}catch(Exception e){throw new RuntimeException(e);}});
    ok(raceIO.entered.await(2,TimeUnit.SECONDS));long t=System.nanoTime();ok(!raced.interruptBeforeReady());ok(System.nanoTime()-t<100_000_000L);raceIO.resume.countDown();writing.get(2,TimeUnit.SECONDS);refuses(()->CameraCaptureDiagnosticSetup.readClosed(raceIO,owner(1)));worker.shutdown();ok(worker.awaitTermination(2,TimeUnit.SECONDS));
    System.out.println("PASS "+checks+" setup/retention/READY-race assertions; synthetic IO/native observations, no Android evidence");
  }
}

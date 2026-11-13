package expo.modules.recognitioncpu;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
public final class CameraCaptureDiagnosticLifecycleChecks {
 static int assertions;
 static void check(boolean b){assertions++;if(!b)throw new AssertionError();}
 static void await(CountDownLatch l)throws Exception{check(l.await(3,TimeUnit.SECONDS));}
 static CameraCaptureDiagnosticSession start(CameraCaptureDiagnosticSession.Sink sink)throws Exception{
  CameraCaptureDiagnosticSession s=new CameraCaptureDiagnosticSession(sink,b->{});
  s.ready(new CameraCaptureDiagnosticSession.Admission(true,true,0,CameraCaptureDiagnosticSession.JPEG+CameraCaptureDiagnosticSession.BOOK),"g",1);s.invoke("g",2,()->{});return s;
 }
 static CameraCaptureDiagnosticSession.Frame frame(){return new CameraCaptureDiagnosticSession.Frame(){public byte[] bytes(){return new byte[]{1};}public void close(){}};}
 static void terminalRace(boolean atTerminal,boolean failTerminal)throws Exception{
  CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1);AtomicInteger terminals=new AtomicInteger();
  CameraCaptureDiagnosticSession.Sink sink=new CameraCaptureDiagnosticSession.Sink(){public void save(byte[]b){}public void record(String n,String v)throws Exception{
   if(v.startsWith("DIAGNOSTIC_SAVED_"))terminals.incrementAndGet();
   if(v.startsWith(atTerminal?"DIAGNOSTIC_SAVED_":"SAVE_COMPLETE_")){entered.countDown();if(!release.await(3,TimeUnit.SECONDS))throw new Exception("TIMEOUT");}
   if(failTerminal&&v.startsWith("DIAGNOSTIC_SAVED_"))throw new Exception("DISK_WRITE_FAILED");
  }};
  CameraCaptureDiagnosticSession s=start(sink);AtomicReference<Throwable> failure=new AtomicReference<>();
  Thread writer=new Thread(()->{try{s.accept(frame(),"g",()->"g");}catch(Throwable e){failure.set(e);}});writer.start();await(entered);
  // Cancellation runs in a DIFFERENT thread while real writer is blocked in IO.
  ExecutorService lifecycle=Executors.newSingleThreadExecutor();
  try{check(lifecycle.submit(()->s.invalidate("LIFECYCLE")).get(1,TimeUnit.SECONDS)==!atTerminal);}
  finally{release.countDown();lifecycle.shutdown();}
  writer.join(3000);check(!writer.isAlive());check(s.saved()==(atTerminal&&!failTerminal));check((failure.get()!=null)==(!atTerminal||failTerminal));check(terminals.get()==(atTerminal?1:0));
 }
 static void delivery()throws Exception{
  CameraCaptureDiagnosticDelivery d=new CameraCaptureDiagnosticDelivery();AtomicInteger copies=new AtomicInteger(),closes=new AtomicInteger(),work=new AtomicInteger();Object one=new Object(),two=new Object();
  ExecutorService stopped=Executors.newSingleThreadExecutor();stopped.shutdown();
  check(d.deliver(one,()->{copies.incrementAndGet();return new byte[]{1};},closes::incrementAndGet,stopped,b->work.incrementAndGet()).equals("REJECTED_PROXY_ALREADY_CLOSED"));
  check(closes.get()==1&&copies.get()==1&&work.get()==0);
  d.deliver(one,()->{throw new AssertionError();},closes::incrementAndGet,stopped,b->work.incrementAndGet());check(closes.get()==1);
  d.destroy();d.deliver(two,()->{throw new AssertionError();},closes::incrementAndGet,stopped,b->work.incrementAndGet());
  d.deliver(two,()->{throw new AssertionError();},closes::incrementAndGet,stopped,b->work.incrementAndGet());check(closes.get()==2&&work.get()==0);
  // A queued task has ONLY owned bytes. Shutdown/destroy cannot strand a proxy.
  CameraCaptureDiagnosticDelivery queued=new CameraCaptureDiagnosticDelivery();ExecutorService q=Executors.newSingleThreadExecutor();CountDownLatch blocking=new CountDownLatch(1),unblock=new CountDownLatch(1);
  q.execute(()->{blocking.countDown();try{unblock.await();}catch(InterruptedException e){Thread.currentThread().interrupt();}});await(blocking);
  AtomicInteger queuedClose=new AtomicInteger();queued.deliver(new Object(),()->new byte[]{2},queuedClose::incrementAndGet,q,b->work.incrementAndGet());check(queuedClose.get()==1);
  queued.destroy();q.shutdown();unblock.countDown();check(q.awaitTermination(3,TimeUnit.SECONDS));check(queuedClose.get()==1);
  CameraCaptureDiagnosticDelivery badCopy=new CameraCaptureDiagnosticDelivery();AtomicInteger badClose=new AtomicInteger();boolean rejected=false;
  try{badCopy.deliver(new Object(),()->{throw new Exception("BAD_COPY");},badClose::incrementAndGet,Runnable::run,b->{throw new AssertionError();});}catch(Exception e){rejected=true;}
  check(rejected&&badClose.get()==1);
 }
 public static void main(String[]a)throws Exception{terminalRace(false,false);terminalRace(true,false);terminalRace(true,true);delivery();System.out.println("PASS "+assertions+" coordinated lifecycle/delivery assertions");}
}

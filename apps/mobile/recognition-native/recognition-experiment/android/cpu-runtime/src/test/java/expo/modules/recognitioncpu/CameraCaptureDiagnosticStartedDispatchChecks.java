package expo.modules.recognitioncpu;
import java.util.concurrent.*;import java.util.concurrent.atomic.*;
public class CameraCaptureDiagnosticStartedDispatchChecks {
 public static void main(String[]args)throws Exception{
  ExecutorService closed=Executors.newSingleThreadExecutor();closed.shutdown();AtomicInteger ran=new AtomicInteger();
  if(CameraCaptureDiagnosticDelivery.dispatchStarted(closed,ran::incrementAndGet)||ran.get()!=0)throw new AssertionError("Rejected event must be nonfatal and never run");
  ExecutorService live=Executors.newSingleThreadExecutor();CountDownLatch done=new CountDownLatch(1);
  if(!CameraCaptureDiagnosticDelivery.dispatchStarted(live,()->{ran.incrementAndGet();done.countDown();}))throw new AssertionError("Accepted event lost");
  if(!done.await(2,TimeUnit.SECONDS)||ran.get()!=1)throw new AssertionError("Accepted event count");live.shutdown();if(!live.awaitTermination(2,TimeUnit.SECONDS))throw new AssertionError("worker drain");
  if(CameraCaptureDiagnosticDelivery.dispatchStarted(command->{throw new RejectedExecutionException("injected");},ran::incrementAndGet)||ran.get()!=1)throw new AssertionError("Injected rejection ran");
  System.out.println("PASS 6 actual production dispatch/shutdown/rejection checks; no Android callback delivery claimed");
 }
}

package expo.modules.recognitioncpu;

import java.util.IdentityHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

/** Callback-thread ownership. A queue never owns a live SDK proxy. */
public final class CameraCaptureDiagnosticDelivery {
  public static boolean dispatchStarted(Executor executor,Runnable work) { try { executor.execute(work);return true; } catch(RejectedExecutionException rejected) { return false; } }
  public interface Copy { byte[] read() throws Exception; }
  public interface Close { void close() throws Exception; }
  public interface Work { void run(byte[] bytes); }
  private final IdentityHashMap<Object, Boolean> delivered = new IdentityHashMap<>();
  private boolean primary, destroyed;
  public synchronized void destroy(){destroyed=true;}
  public String deliver(Object identity, Copy copy, Close close, Executor executor, Work work)throws Exception {
    final boolean take;
    synchronized(this){
      if(delivered.containsKey(identity))return "DUPLICATE_IDENTITY";
      delivered.put(identity,Boolean.TRUE);
      take=!primary&&!destroyed;primary=true;
    }
    byte[] bytes=null;
    // Both the successful primary and every late distinct proxy close HERE,
    // independently of queue acceptance, shutdown or later worker execution.
    try{if(take)bytes=copy.read();}finally{close.close();}
    if(!take)return "CLOSED_LATE_OR_DISTINCT";
    final byte[] owned=bytes;
    try{executor.execute(()->work.run(owned));return "QUEUED_CLOSED_BYTES";}
    catch(RejectedExecutionException error){return "REJECTED_PROXY_ALREADY_CLOSED";}
  }
}

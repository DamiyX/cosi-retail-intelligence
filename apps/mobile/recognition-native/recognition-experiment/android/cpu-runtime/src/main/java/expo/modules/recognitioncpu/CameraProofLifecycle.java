package expo.modules.recognitioncpu;

import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicBoolean;

/** One process-wide camera owner. Cancellation invalidates publication, not ownership. */
public final class CameraProofLifecycle {
  public static final AtomicBoolean SHARED_BUSY=new AtomicBoolean(false);
  public static final String PROCESS=java.util.UUID.randomUUID().toString();
  public static final CameraProofLifecycle INSTANCE=new CameraProofLifecycle();
  public static final class Ticket {
    public final String id;public final long startedNanos=System.nanoTime();
    public volatile boolean cancelled,finished;public boolean captureReturned,nativeStarted;public int cancellationSignals;public String reason;
    public volatile String phase="ACTIVE",primaryFailure,finalizationFailure;
    private Ticket(String id){this.id=id;}
  }
  private volatile Ticket owner;
  public synchronized Ticket begin(Callable<String> reserve,AtomicBoolean closed)throws Exception{
    CameraProofFrame.require(owner==null&&!closed.get()&&SHARED_BUSY.compareAndSet(false,true),"CAMERA_BUSY_OR_CLOSED");
    try{String id=reserve.call();CameraProofFrame.require(!closed.get(),"CAMERA_CLOSED_AFTER_RESERVATION");owner=new Ticket(id);return owner;}catch(Exception e){SHARED_BUSY.set(false);throw e;}
  }
  public synchronized Ticket current(String id){CameraProofFrame.require(owner!=null&&owner.id.equals(id)&&!owner.finished,"CAMERA_STALE_JOB");return owner;}
  public synchronized boolean mayPublish(Ticket t){return owner==t&&!t.cancelled&&!t.finished&&t.phase.equals("ACTIVE");}
  public synchronized void captureReturned(Ticket t){
    CameraProofFrame.require(owner==t&&!t.captureReturned&&!t.finished,"CAMERA_DUPLICATE_CAPTURE");t.captureReturned=true;t.nativeStarted=true;
  }
  public boolean cancel(String id,String reason){
    Ticket t=owner;if(t==null||!t.id.equals(id)||t.finished||t.cancelled)return false;
    // Never wait on the gate/store commit monitor. Repeated cancellation exits above.
    synchronized(t){if(owner!=t||t.finished||t.cancelled||t.phase.equals("PUBLISHING")||t.phase.equals("BLOCKED_PUBLISHING"))return false;t.cancelled=true;t.reason=reason;t.cancellationSignals++;return true;}
  }
  /** A short linearization decision only; no IO while holding the ticket monitor. */
  public boolean claimFinalization(Ticket t,boolean success){
    synchronized(t){CameraProofFrame.require(owner==t&&t.captureReturned&&!t.finished&&t.phase.equals("ACTIVE"),"CAMERA_FINALIZATION_ALREADY_CLAIMED");boolean publish=success&&!t.cancelled;t.phase=publish?"PUBLISHING":"REJECTING";return publish;}
  }
  public void block(Ticket t,String primary,String finalization){synchronized(t){if(owner==t&&!t.finished){t.phase=t.phase.equals("PUBLISHING")||t.phase.equals("BLOCKED_PUBLISHING")?"BLOCKED_PUBLISHING":"BLOCKED_REJECTING";if(t.primaryFailure==null)t.primaryFailure=primary;if(t.finalizationFailure==null)t.finalizationFailure=finalization;}}}
  public String activeId(){Ticket t=owner;return t==null?null:t.id;}
  public java.util.Map<String,Object> state(){java.util.Map<String,Object> m=new java.util.LinkedHashMap<>();Ticket t=owner;m.put("activeJob",t==null?null:t.id);if(t!=null)synchronized(t){m.put("phase",t.phase);m.put("primaryFailure",t.primaryFailure);m.put("finalizationFailure",t.finalizationFailure);}return m;}
  public synchronized void finish(Ticket t){
    synchronized(t){CameraProofFrame.require(owner==t&&t.captureReturned&&!t.finished&&(t.phase.equals("PUBLISHING")||t.phase.equals("REJECTING")),"CAMERA_DRAIN_NOT_ACKNOWLEDGED");
    t.finished=true;t.phase="FINISHED";owner=null;SHARED_BUSY.set(false);}
  }
}

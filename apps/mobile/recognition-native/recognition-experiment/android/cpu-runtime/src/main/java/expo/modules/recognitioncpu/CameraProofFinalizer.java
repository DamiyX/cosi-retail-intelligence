package expo.modules.recognitioncpu;

import java.util.Objects;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

/** Actual native task boundary: finalization precedes settlement; no finally IO can escape. */
public final class CameraProofFinalizer {
  private CameraProofFinalizer(){}
  public interface Work<T> {T run()throws Throwable;}
  public interface Completion<T> {
    /** true publishes/acknowledges the value; false is a durably rejected cancellation. */
    boolean finish(T value,Throwable primary)throws Throwable;
    /** Record diagnostics only. Never release an unresolved owner here. */
    void blocked(Throwable primary,Throwable finalization);
  }
  public interface Sink<T> {void resolve(T value);void reject(Failure failure);}
  public interface Facts {byte[] failure(String code)throws Exception;}
  public static String code(Throwable error){
    if(error==null)return "NONE";if(error instanceof OutOfMemoryError)return "CAMERA_RESOURCE_FAILURE";if(error instanceof LinkageError)return "CAMERA_RUNTIME_LINKAGE";if(error instanceof java.util.concurrent.RejectedExecutionException)return "CAMERA_CLOSED";
    String message=error.getMessage();return message!=null&&message.matches("CAMERA_[A-Z0-9_]+")?message:"CAMERA_OPERATION_FAILED";
  }
  /** Production durable completion shared by Android and generated host checks. */
  public static final class Durable<T> implements Completion<T> {
    private final CameraProofLifecycle gate;private final CameraProofStore store;private final CameraProofLifecycle.Ticket ticket;
    private final Facts facts;private final Runnable beforeDecision,onRelease;private final String captureFailure;
    public Durable(CameraProofLifecycle gate,CameraProofStore store,CameraProofLifecycle.Ticket ticket,Facts facts,Runnable beforeDecision,Runnable onRelease,String captureFailure){this.gate=gate;this.store=store;this.ticket=ticket;this.facts=facts;this.beforeDecision=beforeDecision;this.onRelease=onRelease;this.captureFailure=captureFailure;}
    @Override public boolean finish(T value,Throwable primary)throws Exception{
      beforeDecision.run();boolean publish=gate.claimFinalization(ticket,primary==null&&captureFailure==null);
      if(publish)store.resolve(ticket.id,"PUBLISHED","NONE");
      else {String reason=primary!=null?code(primary):captureFailure!=null?captureFailure:"CAMERA_CANCELLED";store.reject(ticket.id,ticket.cancelled?"CANCELLED":"FAILED",reason,facts.failure(reason));}
      // Both durable resolution and local finalization must succeed before release/settlement.
      onRelease.run();gate.finish(ticket);return primary==null&&(publish||captureFailure!=null);
    }
    @Override public void blocked(Throwable primary,Throwable finalization){gate.block(ticket,code(primary),code(finalization));}
  }
  public static final class Failure extends Exception {
    private static final long serialVersionUID=1L;
    public final Throwable primary,finalization;public final boolean scheduled;
    public Throwable diagnosticFailure;
    Failure(Throwable primary,Throwable finalization,boolean scheduled){super("Camera work/finalization failed",finalization!=null?finalization:primary);this.primary=primary;this.finalization=finalization;this.scheduled=scheduled;}
  }
  public static final class Run<T> implements Runnable {
    private final AtomicBoolean started=new AtomicBoolean();private final Work<T> work;private final Completion<T> completion;private final Sink<T> sink;
    public volatile boolean settled;public volatile Failure failure;public volatile Throwable deliveryFailure,schedulingFailure;
    private Run(Work<T> work,Completion<T> completion,Sink<T> sink){this.work=Objects.requireNonNull(work);this.completion=Objects.requireNonNull(completion);this.sink=Objects.requireNonNull(sink);}
    @Override public void run(){if(!started.compareAndSet(false,true))return;T value=null;Throwable primary=null;try{value=work.run();}catch(Throwable e){primary=e;}settle(value,primary,true);}
    private void rejected(Throwable error){schedulingFailure=error;if(started.compareAndSet(false,true))settle(null,error,false);}
    private void settle(T value,Throwable primary,boolean scheduled){
      boolean ready=false;Throwable finalization=null;
      try{ready=completion.finish(value,primary);}catch(Throwable e){finalization=e;}
      if(primary!=null||finalization!=null||!ready){
        if(primary==null&&finalization==null)primary=new IllegalStateException("CAMERA_CANCELLED");
        failure=new Failure(primary,finalization,scheduled);
        if(finalization!=null)try{completion.blocked(primary,finalization);}catch(Throwable e){failure.diagnosticFailure=e;}
      }
      // A sink that throws is also contained. It is never called for a second settlement.
      settled=true;try{if(failure==null)sink.resolve(value);else sink.reject(failure);}catch(Throwable e){deliveryFailure=e;}
    }
  }
  public static <T> Run<T> dispatch(Executor executor,Work<T> work,Completion<T> completion,Sink<T> sink){
    Run<T> task=new Run<>(work,completion,sink);try{executor.execute(task);}catch(Throwable error){task.rejected(error);}return task;
  }
}

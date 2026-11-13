package expo.modules.recognitioncpu;

import java.util.concurrent.Callable;

/** Early observations are live-only, never a durable owner or successful admission. */
public final class GraphicsAdmissionTrace {
  public interface Clock { long now(); }
  public interface Sink { void emit(Event event); }
  public static final class Event {
    public final boolean durable=false;
    public final String provenance="LIVE_ADMISSION_NOT_DURABLE";
    public final int streamSequence,earlySequence;
    public final String event,stage,code;
    public final long observedMillis;
    Event(int stream,int early,String event,String stage,String code,long observed){this.streamSequence=stream;this.earlySequence=early;this.event=event;this.stage=stage;this.code=code;this.observedMillis=observed;}
  }
  private final Clock clock;private final Sink sink;
  private int stream,early,durable,completed;private boolean failed,rootIntended;
  private static final String[] STEPS={"IDENTITY","LEGACY_METADATA","B1_METADATA","CAMERA_CLOSED"};
  private String stage="BRIDGE";
  public GraphicsAdmissionTrace(Clock clock,Sink sink){this.clock=clock;this.sink=sink;}
  private synchronized void emit(String event,String code,long observed){
    if(early>=12||stream>=32)throw new IllegalStateException("CAMERA_ADMISSION_TRACE_CAP");
    sink.emit(new Event(stream++,early++,event,stage,code,observed));
  }
  public void received(long observed){if(observed<0||observed>clock.now()||stream!=0)throw new IllegalStateException("CAMERA_ADMISSION_TIME");emit("BRIDGE_RECEIVED","NONE",observed);}
  public <T>T step(String label,Callable<T> action)throws Exception {
    if(completed>=STEPS.length||!STEPS[completed].equals(label)||failed||stream==0)throw new IllegalStateException("CAMERA_ADMISSION_STAGE");
    stage=label;emit(label+"_INTENT","NONE",clock.now());
    try{T value=action.call();emit(label+"_VALIDATED","NONE",clock.now());completed++;return value;}
    catch(Exception error){refused(error);throw error;}
  }
  public void rootIntent(){if(completed!=STEPS.length||rootIntended||failed)throw new IllegalStateException("CAMERA_ADMISSION_STAGE");rootIntended=true;stage="PROBE_ROOT";emit("PROBE_ROOT_INTENT","NONE",clock.now());}
  public void alias(){emit("DIRECTORY_ALIAS_REFUSED","CAMERA_DIRECTORY_ALIAS",clock.now());}
  public synchronized void refused(Throwable error){
    if(failed)return;failed=true;
    String code=error.getMessage();if(code==null||!code.matches("CAMERA_[A-Z0-9_]{1,120}"))code="CAMERA_OPERATION_FAILED";
    emit("ADMISSION_REFUSED",code,clock.now());
  }
  public synchronized int nextDurable(){if(!rootIntended||failed||durable>=20||stream>=32)throw new IllegalStateException("CAMERA_ADMISSION_TRACE_CAP");durable++;return stream++;}
  public int earlyCount(){return early;}
}

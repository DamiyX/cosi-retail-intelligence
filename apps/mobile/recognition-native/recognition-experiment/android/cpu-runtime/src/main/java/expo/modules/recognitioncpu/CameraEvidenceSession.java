package expo.modules.recognitioncpu;

import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicBoolean;

/** New camera-only request code; no ownership release until a callback/worker drains. */
public final class CameraEvidenceSession<T> {
  public static final int REQUEST=31007;
  public static final class Ticket<T>{
    public final String id=java.util.UUID.randomUUID().toString();public final T payload;
    public volatile boolean cancelled;private boolean dispatched,writing,finished;
    private final AtomicBoolean settled=new AtomicBoolean();
    private Ticket(T p){payload=p;}public boolean settle(){return settled.compareAndSet(false,true);}
  }
  private final AtomicBoolean busy,closed;private Ticket<T> active;private final int request;
  public CameraEvidenceSession(AtomicBoolean busy,AtomicBoolean closed){this(busy,closed,REQUEST);}
  CameraEvidenceSession(AtomicBoolean busy,AtomicBoolean closed,int request){CameraEvidenceExport.require(request==REQUEST||request==31008,"REQUEST_CODE");this.busy=busy;this.closed=closed;this.request=request;}
  public static <T> CameraEvidenceSession<T> stationary(AtomicBoolean busy,AtomicBoolean closed){return new CameraEvidenceSession<T>(busy,closed,31008);}
  public interface StationaryConsume {void consume(String requestTicket)throws Exception;}
  public synchronized Ticket<T> beginStationary(T payload,StationaryConsume consume)throws Exception{
    CameraEvidenceExport.require(request==31008&&active==null&&!closed.get()&&busy.compareAndSet(false,true),"BUSY_OR_CLOSED");
    try{Ticket<T> t=new Ticket<>(payload);consume.consume(t.id);CameraEvidenceExport.require(!closed.get(),"CLOSED");active=t;return t;}
    catch(Exception|Error e){busy.set(false);throw e;}
  }
  public synchronized Ticket<T> begin(T payload,Callable<Void> consume)throws Exception{
    CameraEvidenceExport.require(active==null&&!closed.get()&&busy.compareAndSet(false,true),"BUSY_OR_CLOSED");
    try{consume.call();CameraEvidenceExport.require(!closed.get(),"CLOSED");active=new Ticket<>(payload);return active;}
    catch(Exception|Error e){busy.set(false);throw e;}
  }
  public synchronized void dispatch(Ticket<T> t,Runnable launch){
    CameraEvidenceExport.require(active==t&&!t.dispatched&&!t.cancelled&&!closed.get(),"STALE_OR_CANCELLED");
    // Mark before launch. Even a throwing launch may have registered a callback.
    t.dispatched=true;launch.run();
  }
  public synchronized Ticket<T> callback(int code){
    Ticket<T> t=active;if(code!=request||t==null||!t.dispatched||t.writing||t.finished)return null;t.writing=true;return t;
  }
  public synchronized void cancel(){if(active!=null)active.cancelled=true;}
  public synchronized void finish(Ticket<T> t){CameraEvidenceExport.require(active==t&&!t.finished&&t.writing,"DRAIN_UNKNOWN");t.finished=true;active=null;busy.set(false);}
  public synchronized void failBeforeDispatch(Ticket<T> t){
    if(active==t&&!t.dispatched&&!t.writing){t.finished=true;active=null;busy.set(false);}
    else if(active==t)t.cancelled=true;
  }
}

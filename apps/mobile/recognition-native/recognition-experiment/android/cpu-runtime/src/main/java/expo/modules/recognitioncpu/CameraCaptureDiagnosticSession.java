package expo.modules.recognitioncpu;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.Arrays;

/** Capture/save only. No model, recovery, export or orientation publication authority. */
public final class CameraCaptureDiagnosticSession {
  public static final long CAP=268435456L, JPEG=10485760L, BOOK=262144L;
  public interface Sink { void record(String name, String value)throws Exception; void save(byte[] jpeg)throws Exception; }
  public interface Frame { byte[] bytes()throws Exception; void close()throws Exception; }
  public interface Header { void validate(byte[] bytes)throws Exception; }
  public static final class Admission {
    public final boolean exactRetainedSnapshot, priorOwnerReleased;
    public final long retainedClaims, newClaim;
    public Admission(boolean snapshot,boolean released,long retained,long claim){exactRetainedSnapshot=snapshot;priorOwnerReleased=released;retainedClaims=retained;newClaim=claim;}
    public void check(){require(exactRetainedSnapshot&&priorOwnerReleased,"DIAGNOSTIC_BINDING_UNAVAILABLE");require(retainedClaims>=0&&newClaim>=JPEG+BOOK&&newClaim<=CAP&&retainedClaims<=CAP-newClaim,"DIAGNOSTIC_CAPACITY");}
  }
  private final Sink sink; private final Header header;
  private boolean consumed, callback; private volatile boolean saved;
  // CAS is the terminal linearization boundary; no lock/IO in lifecycle invalidation.
  private final java.util.concurrent.atomic.AtomicInteger terminal = new java.util.concurrent.atomic.AtomicInteger();
  private boolean invalid(){return terminal.get()==1||terminal.get()==4;} private int sequence;
  private String geometry; private double ready;
  public CameraCaptureDiagnosticSession(Sink sink,Header header){this.sink=sink;this.header=header;}
  private synchronized void event(String kind)throws Exception{require(sequence<128,"DIAGNOSTIC_JOURNAL_CAP");sink.record(String.format(java.util.Locale.ROOT,"event-%03d",sequence++),kind);}
  public synchronized void ready(Admission admission,String geometry,double now)throws Exception{
    require(!consumed&&!invalid()&&this.geometry==null,"DIAGNOSTIC_NO_REPLAY");admission.check();require(geometry!=null&&!geometry.isEmpty()&&geometry.length()<=512&&Double.isFinite(now),"DIAGNOSTIC_GEOMETRY");
    event("READY_"+geometry);this.geometry=geometry;ready=now;
  }
  public synchronized void invoke(String current,double now,Runnable exposure)throws Exception{
    require(!consumed&&!invalid()&&geometry!=null,"DIAGNOSTIC_NO_REPLAY");require(Double.isFinite(now)&&now>=ready&&now-ready<120&&geometry.equals(current),"DIAGNOSTIC_STALE");
    consumed=true;event("INTENT");event("INVOKE");exposure.run();
  }
  public synchronized void started()throws Exception{require(consumed&&!invalid()&&!callback,"DIAGNOSTIC_CALLBACK_STATE");event("STARTED");}
  /** True means cancellation won before terminal commitment. Never waits for disk or UI. */
  public boolean invalidate(String reason){return terminal.compareAndSet(0,1);}
  public void accept(Frame frame,String current,java.util.function.Supplier<String> savedGeometry)throws Exception{
    // Frame.close must be idempotent for the underlying proxy, including duplicate callback identity.
    byte[] bytes=null;Exception failure=null;
    try{synchronized(this){require(consumed&&!callback&&!invalid(),"DIAGNOSTIC_CALLBACK_STATE");callback=true;}event("CALLBACK_"+current);require(geometry.equals(current),"DIAGNOSTIC_GEOMETRY_CHANGED");bytes=frame.bytes();require(bytes!=null&&bytes.length>0&&bytes.length<=JPEG,"DIAGNOSTIC_JPEG_BOUND");header.validate(bytes);}
    catch(Exception e){terminal.compareAndSet(0,1);failure=e;}
    finally{try{frame.close();event("PROXY_CLOSED");}catch(Exception e){terminal.compareAndSet(0,1);if(failure==null)failure=e;else failure.addSuppressed(e);}}
    if(failure!=null)throw failure;
    require(!invalid()&&geometry.equals(savedGeometry.get()),"DIAGNOSTIC_GEOMETRY_CHANGED");
    sink.save(bytes);require(!invalid()&&geometry.equals(savedGeometry.get()),"DIAGNOSTIC_GEOMETRY_CHANGED");event("SAVE_COMPLETE_"+hash(bytes));
    require(terminal.compareAndSet(0,2),"DIAGNOSTIC_CANCELLED_BEFORE_TERMINAL");
    // Cancellation after this CAS is later than the terminal boundary. A failed
    // durable write still never becomes saved. No UI request occurs in this block.
    try{event("DIAGNOSTIC_SAVED_"+geometry);saved=true;terminal.set(3);}
    catch(Exception error){terminal.set(4);throw error;}
  }
  public synchronized boolean saved(){return saved;}
  public static String hash(byte[] bytes)throws Exception{StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
  public static void require(boolean value,String code){if(!value)throw new IllegalStateException(code);}
}

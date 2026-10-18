package expo.modules.recognitioncpu;

import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicBoolean;

/** Owns private operation identity across Expo's async queue, main picker and worker. */
public final class PhonePortabilityState<T> {
  public interface Action { void run() throws Exception; }
  public interface Callback<T> { void run(Ticket<T> ticket) throws Exception; }
  public static final class BusyOrClosed extends IllegalStateException {
    public BusyOrClosed() { super("BUSY_OR_CLOSED"); }
  }
  public static final class Ticket<T> {
    public final int code, purpose;
    public final T payload;
    public final AtomicBoolean cancelled = new AtomicBoolean(false);
    private boolean writing, settled;
    private Ticket(int code, int purpose, T payload, boolean writing) {
      this.code=code;this.purpose=purpose;this.payload=payload;this.writing=writing;
    }
  }
  private final AtomicBoolean busy, closed;
  private Ticket<T> current;
  public PhonePortabilityState(AtomicBoolean busy, AtomicBoolean closed) {
    this.busy=busy;this.closed=closed;
  }
  public synchronized Ticket<T> begin(int purpose, boolean writing, T payload,
      Callable<Integer> reserve, Action admission) throws Exception {
    if(closed.get() || !busy.compareAndSet(false,true)) throw new BusyOrClosed();
    try {
      admission.run();
      int code=reserve.call();
      if(closed.get()) throw new BusyOrClosed();
      if(purpose<0 || purpose>3 || (purpose==1 || purpose==2) && (code<10000 || code>23000))
        throw new IllegalArgumentException("PRIVATE_REQUEST_IDENTITY");
      current=new Ticket<>(code,purpose,payload,writing);
      return current;
    } catch(Exception | Error error) { busy.set(false);throw error; }
  }
  public synchronized Ticket<T> request(int code) {
    return current!=null && (current.purpose==1 || current.purpose==2) && current.code==code ? current : null;
  }
  public synchronized boolean act(Ticket<T> expected, Action action) throws Exception {
    if(current!=expected || expected==null || expected.cancelled.get() || closed.get()) return false;
    action.run();return true;
  }
  public synchronized boolean startWriting(Ticket<T> expected) {
    if(current!=expected || expected==null || expected.cancelled.get() || closed.get() || expected.writing) return false;
    expected.writing=true;return true;
  }
  public synchronized boolean resolve(Ticket<T> expected, Callback<T> action) throws Exception {
    if(current!=expected || expected==null || expected.cancelled.get() || closed.get() || expected.settled) return false;
    expected.settled=true;action.run(expected);return true;
  }
  public synchronized boolean reject(Ticket<T> expected, Callback<T> action) throws Exception {
    if(current!=expected || expected==null || expected.settled) return false;
    expected.settled=true;action.run(expected);return true;
  }
  public synchronized boolean cancel(Ticket<T> expected, Callback<T> notify, Callback<T> cleanup) throws Exception {
    // Ownership is checked before flags, settlement, cleanup or shared busy state change.
    if(current!=expected || expected==null) return false;
    expected.cancelled.set(true);
    try {
      if(!expected.settled) { expected.settled=true;notify.run(expected); }
    } finally {
      if(!expected.writing) finish(expected,cleanup);
    }
    return true;
  }
  public synchronized boolean cancelCurrent(Callback<T> notify, Callback<T> cleanup) throws Exception {
    return cancel(current,notify,cleanup);
  }
  public synchronized boolean finish(Ticket<T> expected, Callback<T> cleanup) throws Exception {
    if(current!=expected || expected==null) return false;
    try { cleanup.run(expected); }
    finally { current=null;busy.set(false); }
    return true;
  }
}

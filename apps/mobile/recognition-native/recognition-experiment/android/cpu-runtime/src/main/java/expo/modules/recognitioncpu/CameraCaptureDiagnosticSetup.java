package expo.modules.recognitioncpu;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Durable future setup protocol. Not an adoption path for the receipt-less A1 root.
 * Call blocking journal methods on IO; lifecycle interruption is a nonblocking CAS.
 * Activity integration remains disabled until an actual retained descriptor is reviewed.
 */
public final class CameraCaptureDiagnosticSetup {
  public static final int MAX_EPOCHS = 3;
  public static final long CLAIM = CameraCaptureDiagnosticSession.JPEG + CameraCaptureDiagnosticSession.BOOK;
  public static final String OWNER = "setup-owner", READY = "ready-attempt", CLOSED = "pre-ready-closed";
  public interface IO {
    /** Must exclusively create and sync a new directory and its parent; existing, linked or torn roots refuse. */
    void createFresh() throws Exception;
    Set<String> names() throws Exception;
    byte[] read(String name, int cap) throws Exception;
    void writeNew(String name, byte[] value) throws Exception;
    void syncDirectory() throws Exception;
  }
  public static final class Owner {
    public final String run, source, apk, retained, process;
    public final int epoch;
    public Owner(String run, int epoch, String source, String apk, String retained, String process) {
      require(run != null && run.matches("[a-z0-9-]{1,96}") && epoch >= 1 && epoch <= MAX_EPOCHS, "SETUP_PROFILE");
      for (String hash : new String[]{source, apk, retained}) require(hash != null && hash.matches("[a-f0-9]{64}"), "SETUP_IDENTITY");
      require(process != null && process.matches("[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}"), "SETUP_PROCESS");
      this.run=run; this.epoch=epoch; this.source=source; this.apk=apk; this.retained=retained; this.process=process;
    }
    public byte[] bytes() { return ("SETUP2|"+run+"|"+epoch+"|"+source+"|"+apk+"|"+retained+"|"+process+"|"+CLAIM).getBytes(StandardCharsets.US_ASCII); }
    public static Owner parse(byte[] bytes) {
      require(bytes!=null&&bytes.length<=1024,"SETUP_OWNER_BOUND");
      String[] fields=new String(bytes,StandardCharsets.US_ASCII).split("\\|",-1);
      require(fields.length==8&&fields[0].equals("SETUP2")&&fields[7].equals(Long.toString(CLAIM)),"SETUP_OWNER_FORMAT");
      Owner owner=new Owner(fields[1],Integer.parseInt(fields[2]),fields[3],fields[4],fields[5],fields[6]);
      require(Arrays.equals(bytes,owner.bytes()),"SETUP_OWNER_NONCANONICAL");return owner;
    }
    private byte[] closedBytes() { return (new String(bytes(),StandardCharsets.US_ASCII)+"|PRE_READY_CLOSED").getBytes(StandardCharsets.US_ASCII); }
    private boolean sameProfile(Owner other) { return run.equals(other.run)&&source.equals(other.source)&&apk.equals(other.apk)&&retained.equals(other.retained); }
  }
  /** Requires real native observations at integration; neither UI status nor a default true is evidence. */
  public static final class ReleaseObservation {
    private final boolean allCameraInfosClosed, previousPreviewAbsent, exclusiveOwnerHeld;
    public ReleaseObservation(boolean closed, boolean absent, boolean held) { allCameraInfosClosed=closed;previousPreviewAbsent=absent;exclusiveOwnerHeld=held; }
    public boolean released() { return allCameraInfosClosed&&previousPreviewAbsent&&exclusiveOwnerHeld; }
    private void check() { require(released(),"SETUP_RELEASE_NOT_OBSERVED"); }
  }
  public static final class RetainedClosed {
    private final Owner owner;
    private RetainedClosed(Owner owner) { this.owner=owner; }
  }
  private final IO io;
  private final Owner owner;
  // 0 setup, 1 READY attempted, 2 interrupted pre-READY, 3 durably closed, 4 unknown.
  private final AtomicInteger state = new AtomicInteger();
  private CameraCaptureDiagnosticSetup(IO io, Owner owner) { this.io=io;this.owner=owner; }
  public static CameraCaptureDiagnosticSetup create(IO io, Owner owner) throws Exception {
    Objects.requireNonNull(io);Objects.requireNonNull(owner);
    io.createFresh();require(io.names().isEmpty(),"SETUP_NEW_ROOT_NOT_EMPTY");
    io.writeNew(OWNER,owner.bytes());io.syncDirectory();
    return new CameraCaptureDiagnosticSetup(io,owner);
  }
  /** Persist before Session.ready or enabling exposure; failure/torn write never recovers. */
  public void beginReady() throws Exception {
    claimReadyAttempt();persistReadyAttempt();
  }
  /** Main-thread short CAS, before queuing any READY IO. */
  public void claimReadyAttempt() { require(state.compareAndSet(0,1),"SETUP_READY_OR_INTERRUPTED"); }
  public void persistReadyAttempt() throws Exception {
    require(state.get()==1,"SETUP_READY_NOT_CLAIMED");
    try { io.writeNew(READY,owner.bytes());io.syncDirectory(); }
    catch (Exception error) { state.set(4);throw error; }
  }
  public boolean interruptBeforeReady() { return state.compareAndSet(0,2); }
  /** Worker only, after actual native closure. Never call this merely on onStop(). */
  public void commitPreReadyClosed(ReleaseObservation observed) throws Exception {
    Objects.requireNonNull(observed).check();require(state.get()==2,"SETUP_NOT_PRE_READY_INTERRUPTED");
    try { io.writeNew(CLOSED,owner.closedBytes());io.syncDirectory();require(state.compareAndSet(2,3),"SETUP_CLOSE_STATE_CHANGED"); }
    catch (Exception error) { state.set(4);throw error; }
  }
  /** Read-only exact owner + exact closed journal. Any READY, unknown or torn leaf refuses. */
  public static RetainedClosed readClosed(IO io, Owner expected) throws Exception {
    require(io.names().equals(closedNames()),"SETUP_READY_UNKNOWN_OR_TORN");
    require(Arrays.equals(io.read(OWNER,1024),expected.bytes()),"SETUP_OWNER_CHANGED");
    require(Arrays.equals(io.read(CLOSED,1024),expected.closedBytes()),"SETUP_CLOSED_RECORD_CHANGED");
    require(io.names().equals(closedNames()),"SETUP_RETAINED_CHANGED");
    return new RetainedClosed(expected);
  }
  /** All three allowances reserved up front, including empty interrupted epochs. No refund. */
  public static long reserveAll(long retainedIncludingLegacyA1) {
    long added=MAX_EPOCHS*CLAIM;
    require(retainedIncludingLegacyA1>=0&&retainedIncludingLegacyA1<=CameraCaptureDiagnosticSession.CAP-added,"SETUP_CAPACITY");
    return retainedIncludingLegacyA1+added;
  }
  public static void admitNext(List<RetainedClosed> prior, Owner next, long retainedIncludingLegacyA1,
      boolean exactReviewedLegacyDescriptor, ReleaseObservation freshRelease) {
    require(exactReviewedLegacyDescriptor,"SETUP_LEGACY_DESCRIPTOR_UNREVIEWED");Objects.requireNonNull(freshRelease).check();
    require(next.epoch==prior.size()+1&&next.epoch<=MAX_EPOCHS,"SETUP_EPOCH_LIMIT_OR_GAP");
    for (int i=0;i<prior.size();i++) {
      Owner old=prior.get(i).owner;
      require(old.epoch==i+1&&old.sameProfile(next),"SETUP_PRIOR_PROFILE_OR_ORDER");
    }
    reserveAll(retainedIncludingLegacyA1);
  }
  private static Set<String> closedNames() { return new HashSet<>(Arrays.asList(OWNER,CLOSED)); }
  private static void require(boolean value,String code) { CameraCaptureDiagnosticSession.require(value,code); }
}

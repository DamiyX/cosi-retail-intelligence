package expo.modules.recognitioncpu;

/** Unforgeable process-local native reservation. Never returned through a bridge. */
public final class CameraCaptureDiagnosticReservation {
  public static final class Token { private Token() {} }
  private static Token owner;
  public static synchronized Token claim() {
    CameraCaptureDiagnosticSession.require(owner==null&&CameraProofLifecycle.SHARED_BUSY.compareAndSet(false,true),"SETUP_NATIVE_OWNER_BUSY");
    owner=new Token();return owner;
  }
  public static synchronized void require(Token token) {
    CameraCaptureDiagnosticSession.require(token!=null&&token==owner&&CameraProofLifecycle.SHARED_BUSY.get(),"SETUP_NATIVE_OWNER_CHANGED");
  }
  public static synchronized boolean reserved() { return owner!=null; }
}

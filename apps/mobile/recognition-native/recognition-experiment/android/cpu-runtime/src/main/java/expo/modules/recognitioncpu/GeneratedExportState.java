package expo.modules.recognitioncpu;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.IntSupplier;

/** One pending generated-only export. Cancellation stops admission, not native preemption. */
public final class GeneratedExportState {
  public static final int MAX_BYTES=48*1024*1024;
  public static final class Ticket {
    public final int bytesCount;
    public final String sha256;
    public final int requestCode;
    public volatile boolean cancelled=false;
    public volatile boolean writing=false;
    private final AtomicBoolean settled=new AtomicBoolean(false);
    private Ticket(int bytes,String sha,int code){bytesCount=bytes;sha256=sha;requestCode=code;}
    public boolean settle(){return settled.compareAndSet(false,true);}
  }
  private Ticket active;
  private final IntSupplier durableRequestId;
  public GeneratedExportState(IntSupplier allocator){durableRequestId=allocator;}
  public static boolean localDocument(String scheme,String authority,String documentId) {
    if(!"content".equals(scheme)||documentId==null||documentId.isEmpty()||documentId.length()>512||documentId.indexOf('\0')>=0||documentId.contains(".."))return false;
    return "com.android.providers.downloads.documents".equals(authority) ||
      ("com.android.externalstorage.documents".equals(authority) && documentId.startsWith("primary:Download/"));
  }
  public synchronized Ticket begin(int bytes,String hash) {
    GeneratedImageGeometry.check(active==null,"GENERATED_EXPORT_PENDING");
    GeneratedImageGeometry.check(bytes>0 && bytes<=MAX_BYTES && hash!=null && hash.matches("[a-f0-9]{64}"),"GENERATED_EXPORT_BOUND");
    int code=durableRequestId.getAsInt();GeneratedImageGeometry.check(code>=GeneratedEvidenceStore.FIRST_REQUEST && code<=65535,"GENERATED_EXPORT_REQUEST_LIMIT");
    active=new Ticket(bytes,hash,code);return active;
  }
  public synchronized boolean start(Ticket t) {
    if(active!=t||t==null||t.cancelled||t.writing)return false;
    t.writing=true;return true;
  }
  public synchronized Ticket cancel() {
    Ticket t=active;active=null;if(t!=null)t.cancelled=true;return t;
  }
  public synchronized void finish(Ticket t) {if(active==t)active=null;}
}

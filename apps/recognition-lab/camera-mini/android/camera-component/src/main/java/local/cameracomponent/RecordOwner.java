package local.cameracomponent;
import java.util.concurrent.*;
/** One process owner shared across Activity recreation. No camera/Activity reference. */
public final class RecordOwner {
 public final Evidence evidence;
 public final Session session=new Session();
 public final ExecutorService worker=Executors.newSingleThreadExecutor();
 private Object cameraToken;
 /** Tokens have no Activity/camera reference. One binding survives until actual drain. */
 public synchronized boolean claimCamera(Object token){if(cameraToken!=null&&cameraToken!=token)return false;cameraToken=token;return true;}
 public synchronized void releaseCamera(Object token){if(cameraToken==token&&!session.busy())cameraToken=null;}
 public RecordOwner(Evidence.Disk disk){evidence=new Evidence(disk);}
}

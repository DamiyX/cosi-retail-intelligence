package local.cameracomponent;
import java.util.concurrent.Executor;
import static local.cameracomponent.Failure.*;
/** The SDK proxy is closed on every branch before scheduling owned bytes. */
public final class Delivery {
 public interface Proxy { byte[] copy()throws Exception; void close(); }
 public interface Work { void accept(byte[] bytes)throws Exception; }
 public interface Done { void complete(Exception error); }
 public static void send(Proxy proxy,Executor worker,Work work,Done done) {
  byte[] bytes=null; Exception error=null;
  try { bytes=proxy.copy(); } catch(Exception e){error=e;} finally {try{proxy.close();}catch(Exception e){if(error==null)error=e;}}
  if(error!=null){done.complete(error);return;} final byte[] owned=bytes;
  try {worker.execute(()->{Exception failure=null;try{work.accept(owned);}catch(Exception e){failure=e;}done.complete(failure);});}
  catch(java.util.concurrent.RejectedExecutionException e){done.complete(new Failure(Code.SCHEDULING,"worker"));}
 }
}

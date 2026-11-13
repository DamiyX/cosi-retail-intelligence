package expo.modules.recognitioncpu;

import android.os.Build;
import android.system.ErrnoException;
import android.system.OsConstants;
import java.io.IOException;

/** Camera-only no-replace adapter. No static initializer or API30 linker dependency. */
final class CameraProofRename {
  private CameraProofRename(){}
  private static boolean loaded;
  private static synchronized void load()throws IOException{
    if(Build.VERSION.SDK_INT<30)throw new IOException("CAMERA_PUBLISH_API_UNSUPPORTED");
    if(!loaded)try{System.loadLibrary("camera_proof_publish");loaded=true;}
    catch(LinkageError|SecurityException e){throw new IOException("CAMERA_PUBLISH_ADAPTER_UNAVAILABLE",e);}
  }
  static void publish(String directory,String from,String to,long[] identity)throws IOException{
    load();long result=publishNative(directory,from,to,identity);if(result==0)return;
    int stage=(int)(result>>>32),errno=(int)result;
    CameraProofFinalizer.IoStage operation;
    switch(stage){
      case 1:operation=CameraProofFinalizer.IoStage.DIRECTORY_OPEN;break;
      case 2:operation=CameraProofFinalizer.IoStage.DIRECTORY_STAT;break;
      case 4:operation=CameraProofFinalizer.IoStage.FILE_SYNC;break;
      case 5:operation=CameraProofFinalizer.IoStage.RENAME;break;
      case 6:operation=CameraProofFinalizer.IoStage.DIRECTORY_SYNC;break;
      case 8:operation=CameraProofFinalizer.IoStage.DIRECTORY_CLOSE;break;
      case 9:operation=CameraProofFinalizer.IoStage.FILE_CLOSE;break;
      default:operation=CameraProofFinalizer.IoStage.PUBLISH;break;
    }
    throw CameraProofFinalizer.ioFailure(operation,errno,OsConstants.errnoName(errno),new ErrnoException(operation.name(),errno));
  }
  // Packed result: high32 safe stage identifier, low32 errno. No native path/message returned.
  private static native long publishNative(String directory,String from,String to,long[] identity);
}

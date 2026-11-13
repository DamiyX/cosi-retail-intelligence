package expo.modules.recognitioncpu;
import java.io.IOException;
import java.util.concurrent.ExecutionException;

public final class CameraOrientationErrorsChecks {
  static int checks;
  static void ok(boolean value,String why){checks++;if(!value)throw new AssertionError(why);}
  public static void main(String[] args){
    String leaf="CAMERA_MATRIX_ORIENTATION_PREVIEW_RETAINED_CAMERA_REQUIRED";
    Throwable wrapped=new ExecutionException(new IllegalArgumentException("CAMERA_ORIENTATION_RETAINED_CAPACITY",new IllegalArgumentException(leaf)));
    ok(CameraOrientationErrors.code(wrapped).equals(leaf),"safe inner reason survives Future and capacity wrappers");
    IllegalArgumentException status=CameraOrientationErrors.statusException(wrapped);
    ok(status.getMessage().equals(leaf)&&status.getCause()==null,"bridge sees only bounded code, not raw cause chain");
    Throwable privateMessage=new IOException("/private/example-owner-file synthetic secret=123");
    ok(CameraOrientationErrors.code(privateMessage).equals("CAMERA_OPERATION_FAILED"),"raw path/field never surfaced");
    ok(CameraOrientationErrors.statusException(privateMessage).getCause()==null,"raw private Throwable not exported");
    ok(CameraOrientationErrors.code(new IllegalArgumentException("CAMERA_ORIENTATION_RETAINED_CAPACITY",privateMessage)).equals("CAMERA_ORIENTATION_RETAINED_CAPACITY"),"unknown inner failure retains safe category");
    ok(CameraOrientationErrors.code(new IllegalArgumentException("CAMERA_"+"X".repeat(200))).equals("CAMERA_OPERATION_FAILED"),"oversized code rejected");
    ok(CameraOrientationErrors.code(new IllegalArgumentException("CAMERA_PATH:/private/example")).equals("CAMERA_OPERATION_FAILED"),"punctuated path is not a code");
    ok(CameraOrientationErrors.code(new OutOfMemoryError("private detail")).equals("CAMERA_RESOURCE_FAILURE"),"existing resource category preserved");
    ok(CameraOrientationErrors.code(null).equals("CAMERA_OPERATION_FAILED"),"missing error remains bounded");
    final int[] calls={0};Throwable cycle=new RuntimeException("CAMERA_MATRIX_RECOVERY_TORN"){
      private static final long serialVersionUID=1L;
      @Override public synchronized Throwable getCause(){calls[0]++;return this;}
    };
    ok(CameraOrientationErrors.code(cycle).equals("CAMERA_MATRIX_RECOVERY_TORN")&&calls[0]==1,"self cause cannot loop");
    Throwable deep=new IllegalArgumentException(leaf);for(int n=0;n<12;n++)deep=new RuntimeException("raw",deep);
    ok(CameraOrientationErrors.code(deep).equals("CAMERA_OPERATION_FAILED"),"bounded traversal does not inspect arbitrarily deep causes");
    System.out.println("CameraOrientationErrorsChecks assertions="+checks+"; safe code mapping only; no Android bridge execution");
  }
}

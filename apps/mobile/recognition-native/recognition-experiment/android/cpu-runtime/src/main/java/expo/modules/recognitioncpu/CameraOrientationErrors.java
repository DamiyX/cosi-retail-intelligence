package expo.modules.recognitioncpu;

/** Bounded diagnostic codes only. Never expose a raw exception message, path or private record. */
public final class CameraOrientationErrors {
  private CameraOrientationErrors(){}
  public static String code(Throwable error){
    String selected="CAMERA_OPERATION_FAILED";
    for(int depth=0;error!=null&&depth<8;depth++){
      String candidate=CameraProofFinalizer.code(error);
      if(candidate.length()<=96&&candidate.matches("CAMERA_[A-Z0-9_]+")&&!candidate.equals("CAMERA_OPERATION_FAILED"))selected=candidate;
      Throwable next=error.getCause();if(next==error)break;error=next;
    }
    return selected;
  }
  /** The bridge receives only the safe code, not the Future wrapper or its raw cause chain. */
  public static IllegalArgumentException statusException(Throwable error){return new IllegalArgumentException(code(error));}
}

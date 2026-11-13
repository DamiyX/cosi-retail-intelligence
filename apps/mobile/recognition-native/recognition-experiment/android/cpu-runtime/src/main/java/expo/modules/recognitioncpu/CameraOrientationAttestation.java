package expo.modules.recognitioncpu;
/** Exact optional native camera capability, kept by @Keep; no compile dependency or caller class name. */
public final class CameraOrientationAttestation {
  private CameraOrientationAttestation(){}
  private static Class<?> registry()throws ClassNotFoundException{return Class.forName("expo.modules.camera.CosiGeometryRegistry");}
  public static String claim(String job,String uri,String sha256,String token)throws Exception{
    Object value=registry().getMethod("claim",String.class,String.class,String.class,String.class).invoke(null,job,uri,sha256,token);
    CameraProofFrame.require(value instanceof String&&((String)value).getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=CameraOrientationGeometry.MAX_BYTES,"CAMERA_GEOMETRY_NATIVE_ATTESTATION");return (String)value;
  }
  public static void discard(String job)throws Exception{try{registry().getMethod("discard",String.class).invoke(null,job);}catch(ClassNotFoundException absent){/* No camera registry can be retained in this unamended process. Ingress still refuses. */}}
}

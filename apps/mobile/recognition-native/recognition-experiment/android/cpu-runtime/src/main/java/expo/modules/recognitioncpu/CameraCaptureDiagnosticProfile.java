package expo.modules.recognitioncpu;
/** Reviewed constants only. Neither JS nor Intent extras can populate this profile. */
public final class CameraCaptureDiagnosticProfile {
 public static final String RUN="camera-capture-diagnostic-setup-20261029-b1";
 public static final String RETAINED_SHA256="2af362b5900ee09b592a478ff3202c27e3459cd11be213f0ef558142ffb40c78", EXECUTOR_SOURCE_SHA256=CameraCaptureDiagnosticSource.SHA256;
 public static final long RETAINED_CLAIM=221227300L, NEW_CLAIM=3*CameraCaptureDiagnosticSetup.CLAIM;
 public static String root(int epoch){CameraCaptureDiagnosticSession.require(epoch>=1&&epoch<=3,"SETUP_EPOCH_LIMIT");return RUN+"-e0"+epoch;}
 public static boolean ownedRoot(String name){for(int i=1;i<=3;i++)if(root(i).equals(name))return true;return false;}
 public static boolean bound(){return RETAINED_SHA256.matches("[a-f0-9]{64}")&&EXECUTOR_SOURCE_SHA256.matches("[a-f0-9]{64}")&&!RUN.contains("unbound");}
 public static CameraCaptureDiagnosticSession.Admission admit(String expected,String observed,long aggregate,long ageNanos,boolean released){
  CameraCaptureDiagnosticSession.require(expected!=null&&expected.matches("[a-f0-9]{64}")&&expected.equals(observed),"DIAGNOSTIC_RETAINED_CHANGED");
  CameraCaptureDiagnosticSession.require(ageNanos>=0&&ageNanos<30_000_000_000L&&released,"DIAGNOSTIC_RELEASE_STALE");
  CameraCaptureDiagnosticSession.require(aggregate==RETAINED_CLAIM,"SETUP_LEGACY_CLAIM_CHANGED");
  CameraCaptureDiagnosticSession.Admission a=new CameraCaptureDiagnosticSession.Admission(true,true,aggregate,NEW_CLAIM);a.check();return a;
 }
}

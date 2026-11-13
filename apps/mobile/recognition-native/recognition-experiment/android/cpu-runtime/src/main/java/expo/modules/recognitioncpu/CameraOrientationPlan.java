package expo.modules.recognitioncpu;
import java.util.*;
import java.nio.charset.StandardCharsets;

/** New fixed evidence namespace. Pose labels describe the later test; never enter the transform. */
public final class CameraOrientationPlan {
  private CameraOrientationPlan(){}
  public static final String RUN="p203-m00-repeat-20261029-c1",ROOT="camera-orientation-m00-repeat-20261029-c1",CAMERA_ROOT="camera-proof-m00-repeat-20261029-c1";
  public static final int OUTPUT=90*1024*1024,ACTIVE_OUTPUT=16*1024*1024,BOOK=256*1024,MAX_CASES=1;
  // One active budget only: run128KiB + fixture64KiB + three14KiB journals =234KiB <= BOOK256KiB.
  public static final int FIXTURE_OUTPUT=64*1024,EXPORT_JOURNALS=3*CameraMatrixRecoveryPlan.JOURNAL;
  public static long activeBookCoverage(){return CameraOrientationStore.JOURNAL+(long)FIXTURE_OUTPUT+EXPORT_JOURNALS;}
  public static long cameraCap(long oldMatrixAllowance,long retainedCameraClaims){CameraProofFrame.require(retainedCameraClaims>=0&&retainedCameraClaims<=CameraProofStore.CAP,"CAMERA_RETAINED_CLAIM");CameraProofFrame.require(oldMatrixAllowance>=0&&oldMatrixAllowance<=CameraProofStore.CAP&&activeBookCoverage()<=BOOK,"CAMERA_ORIENTATION_ALLOWANCE");return CameraProofStore.CAMERA_CAP-oldMatrixAllowance-retainedCameraClaims-ACTIVE_OUTPUT-BOOK;}
  public static final class Case {
    public final String id,job,target,layout;public final int index;
    private Case(int n,CameraMatrixPlan.Case old){index=n;id=old.id;target=old.target;layout=old.layout;job=UUID.nameUUIDFromBytes((RUN+":"+id).getBytes(StandardCharsets.UTF_8)).toString();}
  }
  // CASES/OUTPUT remain the frozen eight-row profile for historical validators.
  public static final List<Case> CASES;
  public static final List<Case> ACTIVE_CASES;
  static {List<Case> a=new ArrayList<>();for(int n=0;n<8;n++)a.add(new Case(n,CameraMatrixPlan.CASES.get(n+4)));CASES=Collections.unmodifiableList(a);ACTIVE_CASES=Collections.singletonList(CASES.get(0));}
  public static Case get(String id){for(Case c:ACTIVE_CASES)if(c.id.equals(id))return c;throw new IllegalArgumentException("CAMERA_ORIENTATION_CASE");}
  public static Case byJob(String job){for(Case c:ACTIVE_CASES)if(c.job.equals(job))return c;return null;}
}

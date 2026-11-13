package expo.modules.recognitioncpu;
import android.content.Context;
import java.io.*;
import java.util.*;
/** Fixed V2 IO adapter. Private old camera bytes and settled history stays charged; unused C2 future exports retire only after fixed empty-history validation. */
public final class CameraOrientationFiles implements CameraProofStore.IO {
  private Map<String,Object> pendingSnapshot;
  public Map<String,Object> retainedPendingSnapshot(){CameraProofFrame.require(pendingSnapshot!=null,"PENDING_PREVIEW_VALIDATION_REQUIRED");return new TreeMap<>(pendingSnapshot);}
  private final Context context;private final CameraProofFiles delegate;
  public CameraOrientationFiles(Context context)throws IOException{this.context=context;delegate=new CameraProofFiles(context);}
  public void root(File root,boolean create)throws IOException{
    // Validate transfer even after a crash left an empty new directory, before owner/refusal writes.
    if(create){long cap=CameraOrientationPlan.cameraCap(matrixAllowance(),retainedCameraClaimBytes());CameraProofFrame.require(cap>=CameraProofStore.RESERVATION+CameraProofStore.REFUSALS+1024,"CAMERA_ORIENTATION_INITIAL_CAPACITY");}
    File actual=delegate.orientationRoot(CameraOrientationPlan.CAMERA_ROOT,create);CameraProofFrame.require(actual!=null&&actual.equals(root),"CAMERA_ORIENTATION_ROOT");
  }
  private void owned(File f)throws IOException{CameraProofFrame.require(f.getParentFile().equals(new File(context.getFilesDir().getCanonicalFile(),CameraOrientationPlan.CAMERA_ROOT)),"CAMERA_ORIENTATION_WRITE_NAMESPACE");}
  public void syncDirectory(File root)throws IOException{delegate.syncDirectory(root);}
  public List<String> list(File root)throws IOException{return delegate.list(root);}
  public long size(File f)throws IOException{return delegate.size(f);}
  public byte[] read(File f,int cap)throws IOException{return delegate.read(f,cap);}
  public void writeNew(File f,byte[] b)throws IOException{owned(f);delegate.writeNew(f,b);}
  public void publish(File a,File b)throws IOException{owned(a);owned(b);delegate.publish(a,b);}
  public void writeAt(File f,int at,byte[] b)throws IOException{owned(f);delegate.writeAt(f,at,b);}
  public long available(File root)throws IOException{return delegate.available(root);}
  public long matrixAllowance(){return delegate.matrixAllowance();}
  public long retainedCameraClaimBytes(){
    try{
      File parent=context.getFilesDir().getCanonicalFile();
      long retained=((Number)CameraProofStore.readOnly(new File(parent,"camera-proof-v1"),delegate,CameraProofSource.SHA256,CameraProofLifecycle.PROCESS).status().get("claimedBytes")).longValue();
      retained=Math.addExact(retained,CameraOrientationRetained.emptyClaims(parent,delegate));
      retained=Math.addExact(retained,CameraOrientationUiRetained.cameraClaims(parent,delegate));
      CameraMatrixRecoveryPlan.Lane lane=CameraMatrixRecoveryPlan.Lane.RETAINED_ORIENTATION_FIXTURE;
      File root=delegate.recoveryRoot(lane,false);
      if(root!=null)try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(lane,root,false)){
        for(android.content.UriPermission grant:context.getContentResolver().getPersistedUriPermissions())CameraProofFrame.require(!CameraMatrixRecoveryPlan.fixedUri(lane,grant.getUri().toString()),"ORIENTATION_RETAINED_FIXTURE_GRANT");
        CameraMatrixRecoveryStore store=new CameraMatrixRecoveryStore(root,delegate,lane,lock,CameraOrientationRetained.SOURCE,CameraOrientationRetained.APK);
        retained=Math.addExact(retained,CameraOrientationRetained.settledFixtureClaims(root,delegate,store));
      }
      for(CameraMatrixRecoveryPlan.Lane old:new CameraMatrixRecoveryPlan.Lane[]{CameraMatrixRecoveryPlan.Lane.RETAINED_UI_ORIENTATION_FIXTURE,CameraMatrixRecoveryPlan.Lane.RETAINED_UI_ORIENTATION_FIRST}){
        File oldRoot=delegate.recoveryRoot(old,false);CameraProofFrame.require(oldRoot!=null,"ORIENTATION_UI_RETAINED_EXPORT_REQUIRED");
        try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(old,oldRoot,false)){
          for(android.content.UriPermission grant:context.getContentResolver().getPersistedUriPermissions())CameraProofFrame.require(!CameraMatrixRecoveryPlan.fixedUri(old,grant.getUri().toString()),"ORIENTATION_UI_RETAINED_EXPORT_GRANT");
          CameraMatrixRecoveryStore oldStore=new CameraMatrixRecoveryStore(oldRoot,delegate,old,lock,CameraOrientationUiRetained.SOURCE,CameraOrientationUiRetained.APK);
          retained=Math.addExact(retained,CameraOrientationUiRetained.exportClaim(oldRoot,delegate,old,oldStore));
        }
      }
      retained=Math.addExact(retained,CameraOrientationEvidenceRetained.emptyClaims(parent,delegate));
      CameraMatrixRecoveryPlan.Lane evidence=CameraMatrixRecoveryPlan.Lane.RETAINED_EVIDENCE_ORIENTATION_FIXTURE;
      File evidenceRoot=delegate.recoveryRoot(evidence,false);
      CameraProofFrame.require(evidenceRoot!=null,"ORIENTATION_EVIDENCE_RETAINED_FIXTURE_REQUIRED");
      try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(evidence,evidenceRoot,false)){
        for(android.content.UriPermission grant:context.getContentResolver().getPersistedUriPermissions())CameraProofFrame.require(!CameraMatrixRecoveryPlan.fixedUri(evidence,grant.getUri().toString()),"ORIENTATION_EVIDENCE_RETAINED_FIXTURE_GRANT");
        CameraMatrixRecoveryStore oldStore=new CameraMatrixRecoveryStore(evidenceRoot,delegate,evidence,lock,CameraOrientationEvidenceRetained.SOURCE,CameraOrientationEvidenceRetained.APK);
        retained=Math.addExact(retained,CameraOrientationEvidenceRetained.settledFixtureClaims(evidenceRoot,delegate,oldStore));
      }
      retained=Math.addExact(retained,CameraOrientationReadinessRetained.emptyClaims(parent,delegate));
      CameraMatrixRecoveryPlan.Lane readiness=CameraMatrixRecoveryPlan.Lane.RETAINED_READINESS_ORIENTATION_FIXTURE;
      File readinessRoot=delegate.recoveryRoot(readiness,false);
      CameraProofFrame.require(readinessRoot!=null,"ORIENTATION_READINESS_RETAINED_FIXTURE_REQUIRED");
      try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(readiness,readinessRoot,false)){
        for(android.content.UriPermission grant:context.getContentResolver().getPersistedUriPermissions())CameraProofFrame.require(!CameraMatrixRecoveryPlan.fixedUri(readiness,grant.getUri().toString()),"ORIENTATION_READINESS_RETAINED_FIXTURE_GRANT");
        CameraMatrixRecoveryStore oldStore=new CameraMatrixRecoveryStore(readinessRoot,delegate,readiness,lock,CameraOrientationReadinessRetained.SOURCE,CameraOrientationReadinessRetained.APK);
        retained=Math.addExact(retained,CameraOrientationReadinessRetained.settledFixtureClaims(readinessRoot,delegate,oldStore));
      }
      retained=Math.addExact(retained,CameraOrientationPreviewRetained.emptyClaims(parent,delegate));
      List<android.content.UriPermission> pendingGrants=context.getContentResolver().getPersistedUriPermissions();CameraProofFrame.require(pendingGrants.size()<=128,"ORIENTATION_PREVIEW_GRANT_COUNT");
      for(android.content.UriPermission grant:pendingGrants){
        CameraOrientationPreviewRetained.rejectGrant(grant.getUri().toString());
      }
      CameraMatrixRecoveryPlan.Lane pending=CameraMatrixRecoveryPlan.Lane.RETAINED_PREVIEW_ORIENTATION_FIXTURE;
      File pendingRoot=delegate.recoveryRoot(pending,false);CameraProofFrame.require(pendingRoot!=null,"ORIENTATION_PREVIEW_RETAINED_FIXTURE_REQUIRED");
      try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(pending,pendingRoot,false)){
        CameraMatrixRecoveryStore oldStore=new CameraMatrixRecoveryStore(pendingRoot,delegate,pending,lock,CameraOrientationPreviewRetained.SOURCE,CameraOrientationPreviewRetained.APK);
        pendingSnapshot=CameraOrientationPreviewRetained.pendingSnapshot(pendingRoot,delegate,oldStore);
        retained=Math.addExact(retained,CameraOrientationPreviewRetained.CONSUMED_ALLOWANCE);
      }
      for(android.content.UriPermission grant:pendingGrants)CameraOrientationRepeatRetained.rejectGrant(grant.getUri().toString());
      CameraMatrixRecoveryPlan.Lane source750=CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE750_ORIENTATION_FIXTURE;
      File source750Root=delegate.recoveryRoot(source750,false);CameraProofFrame.require(source750Root!=null,"REPEAT_RETAINED_FIXTURE_REQUIRED");
      try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(source750,source750Root,false)){
        CameraMatrixRecoveryStore oldStore=new CameraMatrixRecoveryStore(source750Root,delegate,source750,lock,CameraOrientationRepeatRetained.SOURCE,CameraOrientationRepeatRetained.APK);
        CameraOrientationRepeatRetained.settledFixture(source750Root,delegate,oldStore);
      }
      long prior750=CameraOrientationRepeatRetained.pendingClaims(parent,delegate,retained);
      CameraMatrixRecoveryPlan.Lane source753=CameraMatrixRecoveryPlan.Lane.RETAINED_SOURCE753_ORIENTATION_FIXTURE;
      File source753Root=delegate.recoveryRoot(source753,false);CameraProofFrame.require(source753Root!=null,"REPEAT753_FIXTURE_ROOT_REQUIRED");
      long prior753;
      try(CameraProofFiles.RecoveryLock lock=delegate.recoveryLock(source753,source753Root,false)){
        prior753=CameraOrientationRepeatSetupRetained.claims(parent,delegate);
      }
      return Math.addExact(Math.addExact(retained,prior750),prior753);
    }
    catch(Exception error){throw new IllegalArgumentException("CAMERA_ORIENTATION_RETAINED_CAPACITY",error);}
  }
}

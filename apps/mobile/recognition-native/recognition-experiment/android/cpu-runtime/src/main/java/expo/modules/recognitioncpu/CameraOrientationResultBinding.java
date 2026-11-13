package expo.modules.recognitioncpu;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Receiver state, never a nonce echoed by a provider. Exact current operation and selection only. */
public final class CameraOrientationResultBinding {
  private CameraOrientationResultBinding(){}
  public static String create(CameraMatrixRecoveryStore store,Lane lane)throws Exception{
    require(lane==Lane.ORIENTATION_FIXTURE||lane==Lane.ORIENTATION_FIRST||lane==Lane.ORIENTATION_FINAL,"ORIENTATION_CURRENT_LANE_REQUIRED");
    require(store.state().equals("SELECTION"),"ORIENTATION_PENDING_SELECTION_REQUIRED");
    Map<String,Object> owner=store.payload("owner"),selection=store.payload("selection");
    require(CameraOrientationPlan.RUN.equals(owner.get("run"))&&CameraOrientationSource.SHA256.equals(owner.get("exporterSource"))&&lane.recordName().equals(owner.get("lane")),"ORIENTATION_CURRENT_OPERATION_REQUIRED");
    return json(map("run",CameraOrientationPlan.RUN,"lane",lane.recordName(),"source",owner.get("exporterSource"),"apk",owner.get("exporterApk"),"operation",owner.get("operation"),"selection",selection.get("selection"),"ownerSha256",store.recordHash("owner"),"selectionSha256",store.recordHash("selection")));
  }
  public static void verify(CameraMatrixRecoveryStore store,Lane lane,String binding)throws Exception{
    require(binding!=null&&binding.length()<=4096&&create(store,lane).equals(binding),"ORIENTATION_STALE_RESULT_BINDING");
  }
  /** Narrow receiver boundary: Android destination/access effects are reachable only after both checks. */
  public interface Receiver {
    boolean hasAnyPersistedGrant()throws Exception;
    Map<String,Object> accept()throws Exception;
  }
  public static Map<String,Object> receive(CameraMatrixRecoveryStore store,Lane lane,String binding,Receiver receiver)throws Exception{
    verify(store,lane,binding);
    require(!receiver.hasAnyPersistedGrant(),"ORIENTATION_ORPHAN_GRANT");
    return receiver.accept();
  }
}

package expo.modules.recognitioncpu;

import android.content.Context;
import android.system.Os;
import android.system.OsConstants;
import android.system.StructStat;
import java.io.File;
import java.util.*;

/** Read-only collector for main review. Never declares A1 ownership or grants recovery. */
public final class CameraCaptureDiagnosticSetupSnapshot {
  public static final String LEGACY_ROOT="camera-capture-diagnostic-20261029-a1";
  public static final String LEGACY_SOURCE="96dac6d879f1875beb6f4cf5e7a44422936d814d6266103fc596cb3b15b05ffb";
  public static final String LEGACY_APK="5fa7de0d61c4603e3d8ad17e48b52819de67d302ad6b7ed1248bac2faffc19aa";
  public static Map<String,Object> collect(Context context)throws Exception {return collect(context,null,false);}
  public static Map<String,Object> collectForRecovery(Context context,CameraCaptureDiagnosticReservation.Token token)throws Exception {return collect(context,token,true);}
  private static Map<String,Object> baseline(Context context,CameraCaptureDiagnosticReservation.Token token)throws Exception{return token==null?CameraCaptureDiagnosticSnapshot.collect(context):CameraCaptureDiagnosticSnapshot.collectReserved(context,token);}
  private static Map<String,Object> collect(Context context,CameraCaptureDiagnosticReservation.Token token,boolean ownedRoots)throws Exception {
    Map<String,Object> base=baseline(context,token);
    Map<String,Object> first=once(context,base,ownedRoots),second=once(context,baseline(context,token),ownedRoots);
    CameraCaptureDiagnosticSession.require(CameraMatrixPlan.json(first).equals(CameraMatrixPlan.json(second)),"SETUP_METADATA_CHANGED");
    byte[] canonical=CameraMatrixPlan.bytes(CameraMatrixPlan.json(first));
    if(token!=null)CameraCaptureDiagnosticReservation.require(token);
    CameraCaptureDiagnosticSession.require(canonical.length<=65536&&(token!=null||!CameraProofLifecycle.SHARED_BUSY.get()),"SETUP_METADATA_CAP_OR_BUSY");
    Map<String,Object> out=new TreeMap<>();out.put("kind","DIAGNOSTIC_SETUP_RETAINED_METADATA");out.put("schemaVersion",1);out.put("payload",first);
    out.put("sha256",CameraProofFrame.hash(canonical));out.put("writeAuthority","NONE");out.put("captureAuthority",false);out.put("recoveryAuthorized",false);
    out.put("producerSourceSha256",CameraCaptureDiagnosticSource.SHA256);out.put("executorApkSha256",CameraOrientationAndroid.apkHash(context));return out;
  }
  private static Map<String,Object> once(Context context,Map<String,Object> base,boolean ownedRoots)throws Exception {
    CameraProofFiles io=new CameraProofFiles(context);File parent=context.getFilesDir().getCanonicalFile();
    List<String> names=io.list(parent);
    for(String name:names)if(name.startsWith("camera-capture-diagnostic-"))CameraCaptureDiagnosticSession.require((name.equals(LEGACY_ROOT)||(ownedRoots&&CameraCaptureDiagnosticProfile.ownedRoot(name))),"SETUP_UNKNOWN_DIAGNOSTIC_ROOT");
    CameraCaptureDiagnosticSession.require(names.contains(LEGACY_ROOT),"SETUP_LEGACY_ROOT_MISSING");
    File root=new File(parent,LEGACY_ROOT);StructStat before=Os.lstat(root.getPath());
    CameraCaptureDiagnosticSession.require(OsConstants.S_ISDIR(before.st_mode)&&before.st_uid==android.os.Process.myUid(),"SETUP_ROOT_OWNER_OR_TYPE");
    List<String> leaves=new ArrayList<>(io.list(root));Collections.sort(leaves);CameraCaptureDiagnosticSession.require(leaves.size()<=128,"SETUP_METADATA_FILE_CAP");
    List<Object> files=new ArrayList<>();long observed=0;
    for(String leaf:leaves){Map<String,Object> entry=CameraCaptureDiagnosticSnapshot.entry(root,leaf,io);observed=Math.addExact(observed,((Number)entry.get("bytes")).longValue());CameraCaptureDiagnosticSession.require(observed<=CameraCaptureDiagnosticSetup.CLAIM,"SETUP_RETAINED_BYTES_EXCEED_FULL_CLAIM");files.add(entry);}
    StructStat after=Os.lstat(root.getPath());
    CameraCaptureDiagnosticSession.require(before.st_dev==after.st_dev&&before.st_ino==after.st_ino&&before.st_uid==after.st_uid&&before.st_mode==after.st_mode&&before.st_size==after.st_size&&before.st_nlink==after.st_nlink&&before.st_mtime==after.st_mtime&&before.st_ctime==after.st_ctime&&leaves.equals(sorted(io.list(root))),"SETUP_ROOT_CHANGED");
    Map<String,Object> descriptor=new TreeMap<>();descriptor.put("root",LEGACY_ROOT);descriptor.put("device",before.st_dev);descriptor.put("inode",before.st_ino);descriptor.put("uid",before.st_uid);descriptor.put("mode",before.st_mode);descriptor.put("links",before.st_nlink);descriptor.put("directoryBytes",before.st_size);descriptor.put("mtime",before.st_mtime);descriptor.put("ctime",before.st_ctime);descriptor.put("files",files);descriptor.put("observedFileBytes",observed);
    Map<String,Object> payload=new TreeMap<>();payload.put("baseline",base.get("payload"));payload.put("baselineSha256",base.get("sha256"));payload.put("legacyRoot",descriptor);
    payload.put("expectedLegacySourceReference",LEGACY_SOURCE);payload.put("expectedLegacyApkReference",LEGACY_APK);
    payload.put("legacyFileShape",leaves.isEmpty()?"EMPTY_DIRECTORY":"NONEMPTY_REFUSE_RECOVERY");payload.put("legacyOwnerProven",false);
    payload.put("validation","METADATA_ONLY_REVIEW_REQUIRED_NO_A1_SETUP_OWNER_RECEIPT");payload.put("legacyFullClaim",CameraCaptureDiagnosticSetup.CLAIM);
    @SuppressWarnings("unchecked") Map<String,Object> old=(Map<String,Object>)base.get("payload");
    if("VALIDATED".equals(old.get("validation"))&&Boolean.TRUE.equals(old.get("noPersistedGrants"))){
      long baseline=((Number)old.get("aggregateClaims")).longValue();long retained=Math.addExact(baseline,CameraCaptureDiagnosticSetup.CLAIM);
      payload.put("retainedIncludingLegacyA1",retained);payload.put("prospectiveThreeEpochTotal",CameraCaptureDiagnosticSetup.reserveAll(retained));payload.put("capacityOnlyNotAdmission",true);
    }
    return payload;
  }
  private static List<String> sorted(List<String> values){List<String> out=new ArrayList<>(values);Collections.sort(out);return out;}
}

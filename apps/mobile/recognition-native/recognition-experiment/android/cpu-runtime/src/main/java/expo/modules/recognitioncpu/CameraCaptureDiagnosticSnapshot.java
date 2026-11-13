package expo.modules.recognitioncpu;
import android.content.Context;
import java.io.*;
import java.util.*;
/** Metadata only. Never initializes, recovers, publishes, deletes or returns file bytes. */
public final class CameraCaptureDiagnosticSnapshot {
 public static final String SOURCE="ec262db0d6f2347bec53cd9748b6c2edc1e417783adc974c09226cfba17ad680", APK="61dd47700c45b89307d0b9e5aa30d5abf1ae235166580e8a7630ba361f042b4a";
 public static Map<String,Object> collect(Context context)throws Exception{return collect(context,null);}
 static Map<String,Object> collectReserved(Context context,CameraCaptureDiagnosticReservation.Token token)throws Exception{CameraCaptureDiagnosticReservation.require(token);return collect(context,token);}
 private static void ownership(CameraCaptureDiagnosticReservation.Token token){if(token==null)CameraProofFrame.require(!CameraProofLifecycle.SHARED_BUSY.get(),"DIAGNOSTIC_NATIVE_BUSY");else CameraCaptureDiagnosticReservation.require(token);}
 private static Map<String,Object> collect(Context context,CameraCaptureDiagnosticReservation.Token token)throws Exception{
  CameraProofFrame.require(CameraOrientationAndroid.enabled(context)&&CameraOrientationPlan.RUN.equals("p203-m00-repeat-20261029-c1"),"DIAGNOSTIC_BASELINE_PROFILE");
  ownership(token);
  Map<String,Object> first=once(context),second=once(context);
  CameraProofFrame.require(CameraMatrixPlan.json(first).equals(CameraMatrixPlan.json(second)),"DIAGNOSTIC_SNAPSHOT_CHANGED");
  ownership(token);CameraProofFrame.require(CameraMatrixPlan.bytes(CameraMatrixPlan.json(first)).length<=65536,"DIAGNOSTIC_METADATA_CAP");
  Map<String,Object> result=new TreeMap<>();result.put("schemaVersion",1);result.put("kind","CAPTURE_DIAGNOSTIC_RETAINED_METADATA");result.put("payload",first);result.put("sha256",CameraProofFrame.hash(CameraMatrixPlan.bytes(CameraMatrixPlan.json(first))));result.put("writeAuthority","NONE");result.put("captureAuthority",false);result.put("executorApkSha256",CameraOrientationAndroid.apkHash(context));return result;
 }
 private static Map<String,Object> once(Context context)throws Exception{
  File parent=context.getFilesDir().getCanonicalFile();CameraOrientationFiles io=new CameraOrientationFiles(context);CameraProofFiles files=new CameraProofFiles(context);
  Set<String> roots=new TreeSet<>(Arrays.asList(CameraOrientationPlan.CAMERA_ROOT,CameraOrientationPlan.ROOT));
  for(CameraMatrixRecoveryPlan.Lane lane:CameraMatrixRecoveryPlan.Lane.values())if(lane.root.contains("m00-repeat")&&lane.root.endsWith("20261029-c1"))roots.add(lane.root);
  for(String name:files.list(parent))if(name.contains("m00-repeat")&&name.contains("20261029-c1"))CameraProofFrame.require(roots.contains(name),"DIAGNOSTIC_UNKNOWN_C1_ROOT");
  List<Object> entries=new ArrayList<>();long actual=0;
  for(String name:roots){File root=new File(parent,name);if(!files.list(parent).contains(name))continue;List<String> leaves=new ArrayList<>(files.list(root));Collections.sort(leaves);CameraProofFrame.require(leaves.size()<=128,"DIAGNOSTIC_FILE_COUNT");
   for(String leaf:leaves){CameraProofFrame.require(leaf.matches("[A-Za-z0-9.-]{1,128}"),"DIAGNOSTIC_LEAF");Map<String,Object> e=entry(root,leaf,files);long size=((Number)e.get("bytes")).longValue();actual=Math.addExact(actual,size);CameraProofFrame.require(actual<=CameraCaptureDiagnosticSession.CAP,"DIAGNOSTIC_SNAPSHOT_CAP");CameraProofFrame.require(entries.size()<128,"DIAGNOSTIC_TOTAL_FILES");entries.add(e);}
  }
  // Charge ALL current output/book allowances even if apparently unconsumed.
  Map<String,Object> out=new TreeMap<>();out.put("baselineSource",SOURCE);out.put("baselineApk",APK);out.put("c1Files",entries);
  try {
  // Reuse immutable source750/753 and all earlier exact ownership/retention predicates.
  long old=io.retainedCameraClaimBytes();
  CameraProofStore current=CameraProofStore.readOrientation(new File(parent,CameraOrientationPlan.CAMERA_ROOT),io,SOURCE,CameraProofLifecycle.PROCESS);
  Map<String,Object> camera=current.status();
  new CameraOrientationStore(new File(parent,CameraOrientationPlan.ROOT),io,SOURCE,APK,CameraProofLifecycle.PROCESS,false);
  for(CameraMatrixRecoveryPlan.Lane lane:CameraMatrixRecoveryPlan.Lane.values())if(roots.contains(lane.root)){
   File root=files.recoveryRoot(lane,false);if(root!=null)try(CameraProofFiles.RecoveryLock lock=files.recoveryLock(lane,root,false)){new CameraMatrixRecoveryStore(root,files,lane,lock,SOURCE,APK);}
  }
   out.put("legacyRetainedClaims",old);out.put("aggregateClaims",camera.get("aggregateClaimedBytes"));out.put("camera",camera);out.put("validation","VALIDATED");
  }catch(Exception error){out.put("validation","REFUSED");out.put("validationError",CameraOrientationErrors.code(error));}

  List<String> grants=new ArrayList<>();CameraProofFrame.require(context.getContentResolver().getPersistedUriPermissions().size()<=128,"DIAGNOSTIC_GRANT_CAP");
  for(android.content.UriPermission grant:context.getContentResolver().getPersistedUriPermissions()){
   // Existing historical validators reject old forbidden grants. For C1, never
   // enable capture with a grant still held; preserve it and refuse admission.
   String uri=grant.getUri().toString();grants.add(CameraProofFrame.hash(CameraMatrixPlan.bytes(uri)));
  }Collections.sort(grants);out.put("persistedGrantHashes",grants);out.put("noPersistedGrants",grants.isEmpty());return out;
 }
 static Map<String,Object> entry(File root,String leaf,CameraProofStore.IO io)throws Exception{
  CameraProofFrame.require(leaf.matches("[A-Za-z0-9.-]{1,128}")&&!leaf.equals(".")&&!leaf.equals(".."),"DIAGNOSTIC_LEAF");
  File f=new File(root,leaf);long size=io.size(f);CameraProofFrame.require(size>=0&&size<=CameraCaptureDiagnosticSession.JPEG,"DIAGNOSTIC_FILE_BOUND");
  byte[] data=io.read(f,(int)CameraCaptureDiagnosticSession.JPEG);CameraProofFrame.require(data.length==size,"DIAGNOSTIC_FILE_CHANGED");
  Map<String,Object> e=new TreeMap<>();e.put("root",root.getName());e.put("leaf",leaf);e.put("bytes",size);e.put("sha256",CameraProofFrame.hash(data));return e;
 }

}

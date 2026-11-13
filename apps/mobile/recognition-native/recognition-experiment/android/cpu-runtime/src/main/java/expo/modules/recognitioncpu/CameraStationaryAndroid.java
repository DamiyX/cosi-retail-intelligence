package expo.modules.recognitioncpu;

import android.content.Context;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.system.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.BooleanSupplier;

/** One C8 capture/export authority; no arbitrary IDs/paths or camera/model execution here. */
public final class CameraStationaryAndroid {
  private final Context context;private final CameraProofFiles files;private final CameraProofStore store;
  private CameraStationarySlot exportSlot;private Map<String,byte[]> entries;
  public CameraStationaryAndroid(Context context)throws Exception{
    CameraProofFrame.require(CameraProofAndroid.enabled(context),"CAMERA_C8_VARIANT");this.context=context;files=new CameraProofFiles(context);
    store=new CameraProofStore(new File(context.getFilesDir().getCanonicalFile(),"camera-proof-v1"),files,CameraProofSource.SHA256,CameraProofLifecycle.PROCESS);
  }
  public static String installedApk(Context context)throws Exception{
    MessageDigest hash=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(context.getApplicationInfo().sourceDir)){
      byte[] b=new byte[8192];long total=0;int n;while((n=in.read(b))!=-1){total+=n;CameraProofFrame.require(total<=64L*1024*1024,"CAMERA_C8_APK_BOUND");hash.update(b,0,n);}}
    StringBuilder s=new StringBuilder();for(byte b:hash.digest())s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();
  }
  public byte[] consumeIntent(String acknowledgement)throws Exception{
    // Called inside the actual CameraProofLifecycle.begin reservation callback.
    CameraProofFrame.require(!store.stationarySlotExists(),"CAMERA_C8_CONSUMED");
    File root=files.stationaryRoot(true);CameraStationarySlot slot=new CameraStationarySlot(root,files);
    return slot.intent(CameraStationarySource.SHA256,installedApk(context),CameraProofSource.SHA256,CameraProofLifecycle.PROCESS,android.os.SystemClock.elapsedRealtimeNanos(),acknowledgement);
  }
  public byte[] currentIntent()throws IOException{File root=files.stationaryRoot(false);CameraProofFrame.require(root!=null,"CAMERA_C8_INTENT_MISSING");return new CameraStationarySlot(root,files).readIntent();}
  public Map<String,Object> status()throws Exception{
    store.status();File root=files.stationaryRoot(false);String state=root==null?(store.stationarySlotExists()?"CONSUMED_INCOMPLETE":"AVAILABLE"):new CameraStationarySlot(root,files).status();
    Map<String,Object> m=new LinkedHashMap<>();m.put("kind","STATIONARY_SLOT_STATUS");m.put("jobId",CameraStationarySlot.JOB);m.put("targetId",CameraStationarySlot.TARGET);m.put("targetSha256",CameraStationarySlot.TARGET_SHA);m.put("state",state);m.put("captureAvailable",state.equals("AVAILABLE"));m.put("exportEligible",false);
    if(root!=null&&state.equals("CAPTURE_CONSUMED"))try{CameraStationarySlot.validateSaved(store.stationaryEvidence(),currentIntent());m.put("exportEligible",true);}catch(IllegalArgumentException|IllegalStateException e){/* Unknown/incomplete is never ready. IO failure still refuses status. */}
    m.put("geometryStatus","INCONCLUSIVE");return m;
  }
  public void consumeExport(String requestTicket)throws Exception{
    CameraProofFrame.require(exportSlot==null&&entries==null,"CAMERA_C8_EXPORT_CONSUMED");File root=files.stationaryRoot(false);CameraProofFrame.require(root!=null,"CAMERA_C8_INTENT_MISSING");
    exportSlot=new CameraStationarySlot(root,files);Map<String,byte[]> saved=store.stationaryEvidence();byte[] intent=exportSlot.readIntent();String apk=installedApk(context);
    entries=CameraStationarySlot.entries(saved,intent,CameraStationarySource.SHA256,apk);
    exportSlot.attempt(saved,requestTicket,CameraStationarySource.SHA256,apk);
  }
  public void terminal(String status,Map<String,Object> result)throws IOException{CameraProofFrame.require(exportSlot!=null,"CAMERA_C8_NO_EXPORT");exportSlot.terminal(status,result);entries=null;}
  public Map<String,Object> write(Uri uri,BooleanSupplier cancelled)throws Exception{
    CameraProofFrame.require(uri!=null&&uri.getUserInfo()==null&&uri.getQuery()==null&&uri.getFragment()==null&&DocumentsContract.isDocumentUri(context,uri)&&CameraEvidenceExport.localDocument(uri.getScheme(),uri.getAuthority(),DocumentsContract.getDocumentId(uri)),"CAMERA_C8_DESTINATION");
    CameraProofFrame.require(exportSlot!=null&&entries!=null&&!cancelled.getAsBoolean(),"CAMERA_C8_CANCELLED");Map<String,byte[]> saved=store.stationaryEvidence();exportSlot.verifyAttempt(saved);
    String apk=installedApk(context);Map<String,byte[]> current=CameraStationarySlot.entries(saved,exportSlot.readIntent(),CameraStationarySource.SHA256,apk);for(String role:current.keySet())CameraProofFrame.require(Arrays.equals(current.get(role),entries.get(role)),"CAMERA_C8_CHANGED");
    Map<String,Object> result;
    try(ParcelFileDescriptor p=context.getContentResolver().openFileDescriptor(uri,"rw")){
      CameraProofFrame.require(p!=null,"CAMERA_C8_OPEN");FileDescriptor fd=p.getFileDescriptor();StructStat before=Os.fstat(fd);CameraProofFrame.require(OsConstants.S_ISREG(before.st_mode)&&before.st_nlink==1&&before.st_size==0,"CAMERA_C8_NONEMPTY_OR_TYPE");Os.lseek(fd,0,OsConstants.SEEK_SET);
      result=CameraEvidenceExport.write(entries,new CameraEvidenceExport.Destination(){
        private void identity()throws Exception{StructStat s=Os.fstat(fd);CameraProofFrame.require(s.st_dev==before.st_dev&&s.st_ino==before.st_ino&&OsConstants.S_ISREG(s.st_mode)&&s.st_nlink==1,"CAMERA_C8_DESTINATION_CHANGED");}
        public long size()throws Exception{identity();return Os.fstat(fd).st_size;}
        public int write(byte[] b,int at,int n)throws Exception{identity();return Os.write(fd,b,at,n);}
        public void sync()throws Exception{identity();Os.fsync(fd);}
        public void rewind()throws Exception{identity();Os.lseek(fd,0,OsConstants.SEEK_SET);}
        public int read(byte[] b)throws Exception{identity();int n=Os.read(fd,b,0,b.length);return n==0?-1:n;}
      },cancelled);
    }
    CameraProofFrame.require(!cancelled.getAsBoolean(),"CAMERA_C8_CANCELLED");result.put("kind","STATIONARY_CHART_EVIDENCE_EXPORT");result.put("jobId",CameraStationarySlot.JOB);result.put("targetId",CameraStationarySlot.TARGET);result.put("targetSha256",CameraStationarySlot.TARGET_SHA);result.put("exporterSourceIndexSha256",CameraStationarySource.SHA256);result.put("exporterApkSha256",apk);return result;
  }
}

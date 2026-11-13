package expo.modules.recognitioncpu;
import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.os.Environment;
import android.os.StatFs;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.database.Cursor;
import android.system.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
/** Native owns finite cases; bridge never selects arbitrary files/jobs/bytes. */
public final class CameraMatrixAndroid {
  private final Context context;private final CameraProofAndroid proof;private final CameraProofFiles files;private CameraMatrixStore store;private CameraMatrixEvidence evidence;
  private final String apk;private final CameraMatrixPlan.Readiness readiness=new CameraMatrixPlan.Readiness();
  public CameraMatrixAndroid(Context context,CameraProofAndroid proof)throws Exception{require(CameraProofAndroid.enabled(context),"VARIANT");require(!CameraMatrixSource.SHA256.equals("0".repeat(64)),"SOURCE_UNBOUND");this.context=context;this.proof=proof;files=new CameraProofFiles(context);apk=apkHash(context);open(false);}
  private static String apkHash(Context context)throws Exception{MessageDigest d=MessageDigest.getInstance("SHA-256");long total=0;try(InputStream in=new FileInputStream(context.getApplicationInfo().sourceDir)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){total+=n;require(total<=64L*1024*1024,"APK_CAP");d.update(b,0,n);}}StringBuilder s=new StringBuilder();for(byte b:d.digest())s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
  private CameraMatrixStore open(boolean create)throws Exception{if(store!=null)return store;File root=files.matrixRoot(false);boolean fresh=root==null;if(fresh&&!create)return null;if(fresh)root=files.matrixRoot(true);store=new CameraMatrixStore(root,files,CameraMatrixSource.SHA256,apk,CameraProofLifecycle.PROCESS,fresh);return store;}
  private boolean granted(){return context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED;}
  private boolean idle(){return proof.gate.activeId()==null&&!CameraProofLifecycle.SHARED_BUSY.get();}
  public synchronized Map<String,Object> inspect()throws Exception{
    CameraMatrixStore s=open(false);Map<String,Object> status=s==null?map("kind","CAMERA_MATRIX_STATUS","run",RUN,"next",PERMISSIONS[0],"source",CameraMatrixSource.SHA256,"apk",apk,"exportConsumed",false):s.status();String next=(String)status.get("next");
    readiness.clear();String nonce=null;for(Case c:CASES)if(c.id.equals(next)&&granted()&&idle())nonce=readiness.issue(c,System.nanoTime());
    status.put("retainedInitializationBytes",files.retainedMatrixInitialization());status.put("retainedInitializationReserveBytes",RETAINED_INIT_MAX);
    status.put("readinessNonce",nonce);status.put("camera",proof.status());status.put("permissionGranted",granted());status.put("idle",idle());return status;
  }
  public synchronized Map<String,Object> permission(String id,boolean previewReady)throws Exception{require(idle(),"OWNER_ACTIVE");open(true).permission(id,granted(),true,previewReady);return inspect();}
  public synchronized Map<String,Object> begin(String id,String request,String token,AtomicBoolean closed)throws Exception{
    Case c=get(id);require(idle()&&granted()&&!closed.get(),"READINESS_STALE");
    android.util.DisplayMetrics dm=context.getResources().getDisplayMetrics();Map<String,Object> req=CameraMatrixPlan.request(request,c,dm.widthPixels,dm.heightPixels);CameraMatrixStore s=open(false);require(s!=null,"NO_PERMISSION_FACTS");String used=readiness.consume(c,token,System.nanoTime());s.consume(c,req,used);
    String requestHash=CameraProofFrame.hash(bytes(json(req)));Map<String,Object> facts=map("matrixRun",RUN,"matrixCase",c.id,"matrixTarget",c.target,"matrixSource",CameraMatrixSource.SHA256,"matrixApk",apk,"matrixRequestSha256",requestHash,"matrixNonce",used,"matrixViewGeneration",req.get("viewGeneration"),"matrixPreviewRect",req.get("previewRectPhysical"));
    CameraProofLifecycle.Ticket t;try{t=proof.beginMatrix(json(req.get("camera")),closed,c,facts);}catch(Exception error){if(idle()){try{s.terminal(c,proof.matrixStore().matrixEvidence(c),false,!granted(),false);}catch(Exception secondary){error.addSuppressed(secondary);}}throw error;}return map("jobId",t.id,"sourceSha256",proof.source(),"matrixSource",CameraMatrixSource.SHA256,"caseId",c.id,"requestSha256",requestHash);
  }
  private Case current(String id)throws Exception{Case c=byJob(id);require(c!=null&&id.equals(proof.gate.activeId()),"STALE_TICKET");require(open(false)!=null&&store.outstanding()==c,"CASE_OWNER");return c;}
  public synchronized boolean invocation(String job,long at)throws Exception{Case c=current(job);store.invoke(c,at);return true;}
  public synchronized boolean phase(String job,String input)throws Exception{Case c=current(job);CameraProofLifecycle.Ticket ticket=proof.gate.current(job);require(ticket.cancelled,"CANCEL_NOT_OBSERVED");store.phaseObserved(c,parse(bytes(input),4096),ticket.reason,granted());return true;}
  public synchronized void complete(String job,String failure)throws Exception{
    Case c=byJob(job);if(c==null)return;require(idle(),"DRAIN_UNKNOWN");CameraMatrixStore s=open(false);require(s!=null,"CASE_OWNER");Map<String,byte[]> profile=proof.matrixStore().matrixEvidence(c);CameraMatrixEvidence.validateNative(c,profile,CameraMatrixSource.SHA256,apk,s.read(c.id+".intent"));s.terminal(c,profile,false,!granted(),!"CAMERA_CAPTURE_NOT_STARTED".equals(failure));
  }
  public synchronized Map<String,Object> recover()throws Exception{
    require(idle(),"DRAIN_UNKNOWN");CameraMatrixStore s=open(false);require(s!=null,"NO_RUN");Case c=s.outstanding();require(c!=null&&!CameraProofLifecycle.PROCESS.equals(s.read(c.id+".intent").get("process"))&&proof.matrixStore().matrixRecoverableOnly(c),"OLD_PROCESS_PROFILE");proof.recover();s.terminal(c,proof.matrixStore().matrixEvidence(c),true,!granted(),false);return inspect();
  }
  public synchronized Map<String,Object> seal()throws Exception{require(idle(),"DRAIN_UNKNOWN");require(open(false)!=null,"NO_RUN");store.seal();return inspect();}
  public synchronized void consumeExport()throws Exception{
    require(proof.gate.activeId()==null&&open(false)!=null&&evidence==null,"EXPORT_STATE");store.consumeExport();try{evidence=new CameraMatrixEvidence(store,c->proof.matrixStore().matrixEvidence(c),CameraMatrixSource.SHA256,apk);}catch(Exception e){store.exportTerminal("FAILED_UNVERIFIED",null);throw e;}
  }
  public synchronized void exportTerminal(String status,Map<String,Object> result)throws Exception{require(store!=null,"NO_RUN");store.exportTerminal(status,result);evidence=null;}
  public Map<String,Object> write(Uri uri,BooleanSupplier cancelled)throws Exception{
    require(uri!=null&&uri.getUserInfo()==null&&uri.getQuery()==null&&uri.getFragment()==null&&DocumentsContract.isDocumentUri(context,uri)&&CameraEvidenceExport.localDocument(uri.getScheme(),uri.getAuthority(),DocumentsContract.getDocumentId(uri)),"DESTINATION");
    try(Cursor cursor=context.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){require(cursor!=null&&cursor.moveToFirst()&&FILENAME.equals(cursor.getString(0))&&!cursor.moveToNext(),"DESTINATION_NAME");}
    require(new StatFs(Environment.getExternalStorageDirectory().getPath()).getAvailableBytes()>=OUTPUT+24L*1024*1024,"OUTPUT_FREE_SPACE");
    CameraMatrixEvidence prepared; synchronized(this){require(evidence!=null&&!cancelled.getAsBoolean(),"EXPORT_CONSUMED_OR_CANCELLED");prepared=evidence;}
    try(ParcelFileDescriptor p=context.getContentResolver().openFileDescriptor(uri,"rw")){
      require(p!=null,"DESTINATION_OPEN");FileDescriptor fd=p.getFileDescriptor();StructStat before=Os.fstat(fd);require(OsConstants.S_ISREG(before.st_mode)&&before.st_nlink==1&&before.st_size==0,"DESTINATION_NONEMPTY");
      return prepared.write(new CameraEvidenceExport.Destination(){private void identity()throws Exception{StructStat now=Os.fstat(fd);require(now.st_dev==before.st_dev&&now.st_ino==before.st_ino&&now.st_nlink==1&&OsConstants.S_ISREG(now.st_mode),"DESTINATION_CHANGED");}public long size()throws Exception{identity();return Os.fstat(fd).st_size;}public int write(byte[] b,int at,int n)throws Exception{identity();return Os.write(fd,b,at,n);}public void sync()throws Exception{identity();Os.fsync(fd);}public void rewind()throws Exception{identity();Os.lseek(fd,0,OsConstants.SEEK_SET);}public int read(byte[] b)throws Exception{identity();int n=Os.read(fd,b,0,b.length);return n==0?-1:n;}},cancelled);
    }
  }
}

package expo.modules.recognitioncpu;
import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** V2 fixed eight-image lane. V1 capture and recovery endpoints keep their existing bindings. */
public final class CameraOrientationAndroid {
  private final Context context;private final CameraProofAndroid proof;private final CameraProofFiles files;private final String apk;
  private CameraOrientationStore store;private final CameraMatrixPlan.Readiness readiness=new CameraMatrixPlan.Readiness();
  public static boolean enabled(Context context){try{return CameraProofAndroid.enabled(context)&&context.getPackageManager().getApplicationInfo(context.getPackageName(),PackageManager.GET_META_DATA).metaData.getBoolean("com.damiyx.recognition.ORIENTATION_V2",false);}catch(Exception error){return false;}}
  public static String apkHash(Context context)throws Exception{MessageDigest d=MessageDigest.getInstance("SHA-256");long count=0;try(InputStream in=new FileInputStream(context.getApplicationInfo().sourceDir)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){require(n>0&&count+n<=64L*1024*1024,"ORIENTATION_APK_CAP");d.update(b,0,n);count+=n;}}StringBuilder s=new StringBuilder();for(byte b:d.digest())s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
  public CameraOrientationAndroid(Context context,CameraProofAndroid proof)throws Exception{require(enabled(context)&&!CameraOrientationSource.SHA256.equals("0".repeat(64)),"ORIENTATION_DISABLED_OR_UNBOUND");this.context=context;this.proof=proof;files=new CameraProofFiles(context);apk=apkHash(context);open(false);}
  private CameraOrientationStore open(boolean create)throws Exception{if(store!=null)return store;File root=files.orientationRoot(CameraOrientationPlan.ROOT,false);boolean fresh=root==null;if(fresh&&!create)return null;if(fresh)root=files.orientationRoot(CameraOrientationPlan.ROOT,true);store=new CameraOrientationStore(root,files,CameraOrientationSource.SHA256,apk,CameraProofLifecycle.PROCESS,fresh);return store;}
  private boolean granted(){return context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED;}
  private boolean idle(){return proof.gate.activeId()==null&&!CameraProofLifecycle.SHARED_BUSY.get();}
  public synchronized Map<String,Object> inspect()throws Exception{
    CameraOrientationStore s=open(false);Map<String,Object> status=s==null?map("kind","CAMERA_ORIENTATION_STATUS","run",CameraOrientationPlan.RUN,"next",CameraOrientationPlan.ACTIVE_CASES.get(0).id,"source",CameraOrientationSource.SHA256,"apk",apk,"profileVersion",2):s.status();String next=(String)status.get("next");readiness.clear();String nonce=null;
    for(CameraOrientationPlan.Case c:CameraOrientationPlan.ACTIVE_CASES)if(c.id.equals(next)&&granted()&&idle()&&CameraOrientationExportAndroid.fixturePassed(context)&&(c.index==0||CameraOrientationExportAndroid.firstPassed(context)))nonce=readiness.issue(CameraMatrixPlan.get(c.id),System.nanoTime());
    status.put("process",CameraProofLifecycle.PROCESS);if(s==null)status.put("nextJobId",CameraOrientationPlan.ACTIVE_CASES.get(0).job);
    status.put("readinessNonce",nonce);status.put("idle",idle());status.put("permissionGranted",granted());status.put("camera",proof.status());status.put("firstExportVerified",s!=null&&CameraOrientationExportAndroid.firstPassed(context));status.put("generatedExportVerified",CameraOrientationExportAndroid.fixturePassed(context));return status;
  }
  public synchronized Map<String,Object> begin(String id,String input,String nonce,AtomicBoolean closed)throws Exception{
    CameraOrientationPlan.Case c=CameraOrientationPlan.get(id);require(idle()&&granted()&&!closed.get(),"ORIENTATION_READINESS_STALE");require(CameraOrientationExportAndroid.fixturePassed(context),"ORIENTATION_GENERATED_EXPORT_REQUIRED");require(c.index==0||CameraOrientationExportAndroid.firstPassed(context),"ORIENTATION_FIRST_EXPORT_REQUIRED");
    android.util.DisplayMetrics dm=context.getResources().getDisplayMetrics();Map<String,Object> request=CameraMatrixPlan.request(input,CameraMatrixPlan.get(id),dm.widthPixels,dm.heightPixels);String used=readiness.consume(CameraMatrixPlan.get(id),nonce,System.nanoTime());CameraOrientationStore s=open(true);s.consume(c,request,used);String requestHash=CameraProofFrame.hash(bytes(json(request)));
    Map<String,Object> facts=map("matrixRun",CameraOrientationPlan.RUN,"matrixCase",c.id,"matrixTarget",c.target,"matrixSource",CameraOrientationSource.SHA256,"matrixApk",apk,"matrixRequestSha256",requestHash,"matrixNonce",used,"matrixViewGeneration",request.get("viewGeneration"),"matrixPreviewRect",request.get("previewRectPhysical"));
    CameraProofLifecycle.Ticket t;try{t=proof.beginOrientation(json(request.get("camera")),closed,c,facts);}catch(Exception error){if(idle())try{s.terminal(c,proof.matrixStore().orientationEvidence(c));}catch(Exception secondary){error.addSuppressed(secondary);}throw error;}
    return map("jobId",t.id,"sourceSha256",CameraOrientationSource.SHA256,"profileVersion",2,"caseId",c.id,"matrixSource",CameraOrientationSource.SHA256);
  }
  public synchronized void complete(String job)throws Exception{CameraOrientationPlan.Case c=CameraOrientationPlan.byJob(job);require(c!=null&&idle()&&open(false)!=null,"ORIENTATION_FINALIZATION_OWNER");store.terminal(c,proof.matrixStore().orientationEvidence(c));}
  public synchronized Map<String,Object> seal()throws Exception{require(idle()&&open(false)!=null,"ORIENTATION_SEAL_OWNER");store.seal();return inspect();}
}

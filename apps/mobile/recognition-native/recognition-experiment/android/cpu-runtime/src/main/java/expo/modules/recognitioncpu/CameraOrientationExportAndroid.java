package expo.modules.recognitioncpu;
import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import java.io.*;
import java.lang.ref.WeakReference;
import java.util.*;
import java.util.concurrent.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Application-owned V2 exports reuse the accepted immutable WRITE/read-only restart engine. */
public final class CameraOrientationExportAndroid {
  private CameraOrientationExportAndroid(){}
  private static final ExecutorService WORKER=Executors.newSingleThreadExecutor();private static final Handler MAIN=new Handler(Looper.getMainLooper());
  private static Held active;
  private interface Work {Map<String,Object> run()throws Exception;}
  private static final class Held {
    final Context context;final Lane lane;final CameraProofFiles files;final CameraProofFiles.RecoveryLock lock;final CameraMatrixRecoveryStore store;
    Held(Context c,Lane l,CameraProofFiles f,CameraProofFiles.RecoveryLock k,CameraMatrixRecoveryStore s){context=c;lane=l;files=f;lock=k;store=s;}
  }
  public static Lane lane(int prefix){require(prefix==0||prefix==1,"ORIENTATION_EXPORT_PREFIX");return prefix==0?Lane.ORIENTATION_FIXTURE:prefix==1?Lane.ORIENTATION_FIRST:Lane.ORIENTATION_FINAL;}
  private static int prefix(Lane lane){return lane==Lane.ORIENTATION_FIXTURE?0:lane.orientationPrefix;}
  private static Map<String,Object> gate(Context c){
    require(CameraOrientationAndroid.enabled(c)&&!CameraOrientationSource.SHA256.equals(ZERO),"ORIENTATION_DISABLED_OR_UNBOUND");
    try{CameraOrientationFiles files=new CameraOrientationFiles(c);long cap=CameraOrientationPlan.cameraCap(files.matrixAllowance(),files.retainedCameraClaimBytes());require(cap>=CameraProofStore.RESERVATION+CameraProofStore.REFUSALS+1024,"CAMERA_ORIENTATION_INITIAL_CAPACITY");return files.retainedPendingSnapshot();}
    catch(IOException error){throw new IllegalArgumentException("ORIENTATION_RETAINED_CAPACITY",error);}
  }
  private static long verifiedBytes(Context context,Lane required)throws Exception{
    CameraProofFiles files=new CameraProofFiles(context);File root=files.recoveryRoot(required,false);require(root!=null,"ORIENTATION_FIRST_EXPORT_REQUIRED");try(CameraProofFiles.RecoveryLock lock=files.recoveryLock(required,root,false)){CameraMatrixRecoveryStore store=new CameraMatrixRecoveryStore(root,files,required,lock,CameraOrientationSource.SHA256,CameraOrientationAndroid.apkHash(context));require(store.state().equals("TERMINAL")&&"READBACK_VERIFIED".equals(store.payload("terminal").get("status")),"ORIENTATION_FIRST_EXPORT_REQUIRED");return number(store.payload("write").get("bytes"),1,required.outputCap);}
  }
  private static long firstBytes(Context c)throws Exception{return verifiedBytes(c,Lane.ORIENTATION_FIRST);}
  public static boolean firstPassed(Context context){try{gate(context);return firstBytes(context)>0;}catch(Exception e){return false;}}
  public static boolean fixturePassed(Context context){try{gate(context);return verifiedBytes(context,Lane.ORIENTATION_FIXTURE)>0;}catch(Exception e){return false;}}
  private static int remaining(Context c,Lane lane)throws Exception{return lane==Lane.ORIENTATION_FIXTURE?lane.outputCap:lane==Lane.ORIENTATION_FIRST?CameraOrientationPlan.ACTIVE_OUTPUT:(int)(CameraOrientationPlan.ACTIVE_OUTPUT-firstBytes(c));}
  private static CameraMatrixRecoveryEngine.StreamSource source(Held h)throws Exception{return h.lane==Lane.ORIENTATION_FIXTURE?CameraOrientationFixture.source(CameraOrientationSource.SHA256,CameraOrientationAndroid.apkHash(h.context)):new CameraOrientationReader(h.context,h.lane.orientationPrefix,remaining(h.context,h.lane));}
  private static Held acquire(Context context,Lane lane,boolean create)throws Exception{
    gate(context);if(active!=null){require(active.lane==lane,"ORIENTATION_OTHER_EXPORT_OWNED");active.lock.assertHeld();return active;}
    require(CameraProofLifecycle.SHARED_BUSY.compareAndSet(false,true),"ORIENTATION_BUSY");CameraProofFiles.RecoveryLock lock=null;
    try{CameraProofFiles files=new CameraProofFiles(context);File root=files.recoveryRoot(lane,false);boolean fresh=root==null;if(fresh&&!create){CameraProofLifecycle.SHARED_BUSY.set(false);return null;}if(fresh)root=files.recoveryRoot(lane,true);lock=files.recoveryLock(lane,root,fresh);CameraMatrixRecoveryStore store=new CameraMatrixRecoveryStore(root,files,lane,lock,CameraOrientationSource.SHA256,CameraOrientationAndroid.apkHash(context));Held h=new Held(context,lane,files,lock,store);if(fresh)store.initialize(source(h).fingerprint(),true);else require(!store.state().equals("EMPTY"),"ORIENTATION_EMPTY_CONSUMED_EXPORT");active=h;return h;}
    catch(Exception error){if(lock!=null)try{lock.close();}catch(IOException close){error.addSuppressed(close);}CameraProofLifecycle.SHARED_BUSY.set(false);throw error;}
  }
  private static Map<String,Object> status(Held h)throws Exception{Map<String,Object> result=h.store.status();result.put("kind","CAMERA_ORIENTATION_EXPORT_STATUS");result.put("prefix",prefix(h.lane));result.put("filename",h.lane.filename);result.put("processId",android.os.Process.myPid());result.put("currentProcess",CameraProofLifecycle.PROCESS);result.put("cameraMounted",false);result.put("modelCalls",0);result.put("originalV1EvidenceUnchanged",true);return result;}
  private static Map<String,Object> terminal(Held h)throws Exception{
    boolean pending=CameraMatrixRecoveryAndroid.releaseGrants(h.context,h.lane);Map<String,Object> result=status(h);result.put("grantReleasePending",pending);if(!pending){active=null;try{h.lock.close();}finally{CameraProofLifecycle.SHARED_BUSY.set(false);}}return result;
  }
  private static Map<String,Object> inspectInternal(Context c,Lane lane,boolean resume)throws Exception{
    Held h=acquire(c,lane,false);if(h==null)return map("kind","CAMERA_ORIENTATION_EXPORT_STATUS","prefix",prefix(lane),"state","AVAILABLE","filename",lane.filename,"cameraMounted",false,"modelCalls",0);String state=h.store.state();if(state.equals("TERMINAL"))return terminal(h);
    if(resume&&state.equals("SELECTION")&&hasAnyGrant(c,lane)){h.store.terminal("UNVERIFIED","GRANT_NOT_JOURNALED");return terminal(h);}
    if(resume&&Arrays.asList("DESTINATION","WRITE","VERIFIED").contains(state))return continueInternal(h);return status(h);
  }
  private static Map<String,Object> continueInternal(Held h)throws Exception{String state=h.store.state(),uri=(String)h.store.payload("destination").get("uri");try(CameraMatrixRecoveryAndroid.Output output=new CameraMatrixRecoveryAndroid.Output(h.context,h.lane,uri,state.equals("DESTINATION"),true)){new CameraMatrixRecoveryEngine(h.store,source(h),h.lane).continueSelected(output);}return h.store.state().equals("TERMINAL")?terminal(h):status(h);}
  private static void submit(Context context,int prefix,CameraMatrixRecoveryAndroid.Listener listener,Work work){Context app=context.getApplicationContext();WeakReference<CameraMatrixRecoveryAndroid.Listener> weak=new WeakReference<>(listener);WORKER.execute(()->{Map<String,Object> result;try{gate(app);result=work.run();}catch(Exception error){result=map("kind","CAMERA_ORIENTATION_EXPORT_STATUS","prefix",prefix,"state","BLOCKED","error",CameraOrientationErrors.code(error),"writeAuthority","NONE","noReplay",true);try{if(active!=null)result.put("durableState",active.store.state());}catch(Exception ignored){result.put("durableState","UNKNOWN_OR_TORN");}}Map<String,Object> delivered=result;MAIN.post(()->{CameraMatrixRecoveryAndroid.Listener target=weak.get();if(target!=null)target.update(delivered);});});}
  public static void inspect(Context c,int prefix,boolean resume,CameraMatrixRecoveryAndroid.Listener listener){Context app=c.getApplicationContext();Lane lane=lane(prefix);submit(app,prefix,listener,()->inspectInternal(app,lane,resume));}
  private static boolean hasAnyGrant(Context c,Lane lane){
    List<android.content.UriPermission> grants=c.getContentResolver().getPersistedUriPermissions();require(grants.size()<=128,"ORIENTATION_GRANT_COUNT");
    for(android.content.UriPermission grant:grants)if(fixedUri(lane,grant.getUri().toString()))return true;return false;
  }
  public static void prepare(Context c,int prefix,CameraMatrixRecoveryAndroid.Listener listener){Context app=c.getApplicationContext();Lane lane=lane(prefix);submit(app,prefix,listener,()->{require(!hasAnyGrant(app,lane),"ORIENTATION_ORPHAN_GRANT");Held h=acquire(app,lane,true);require(h.store.state().equals("OWNER"),"ORIENTATION_SELECTION_ALREADY_CONSUMED");require(!hasAnyGrant(app,lane),"ORIENTATION_ORPHAN_GRANT");require(h.store.payload("owner").get("inputs").equals(source(h).fingerprint()),"ORIENTATION_INPUT_CHANGED");h.store.selection();Map<String,Object> result=status(h);result.put("resultBinding",CameraOrientationResultBinding.create(h.store,lane));result.put("launchPicker",true);return result;});}

  public static void receive(Context c,int prefix,String binding,String uri,int flags,boolean cancelled,CameraMatrixRecoveryAndroid.Listener listener){Context app=c.getApplicationContext();Lane lane=lane(prefix);submit(app,prefix,listener,()->{Held h=acquire(app,lane,false);require(h!=null,"ORIENTATION_NO_SELECTION");return CameraOrientationResultBinding.receive(h.store,lane,binding,new CameraOrientationResultBinding.Receiver(){public boolean hasAnyPersistedGrant(){return hasAnyGrant(app,lane);}public Map<String,Object> accept()throws Exception{if(cancelled){h.store.terminal("CANCELLED","PICKER_CANCELLED");return terminal(h);}if(!fixedUri(lane,uri)||(flags&67)!=67){h.store.terminal("UNVERIFIED","INVALID_URI_OR_OFFERED_GRANTS");return terminal(h);}try(CameraMatrixRecoveryAndroid.Output output=new CameraMatrixRecoveryAndroid.Output(app,lane,uri,true,false)){require(output.size()==0,"ORIENTATION_DESTINATION_NONEMPTY");app.getContentResolver().takePersistableUriPermission(Uri.parse(uri),flags&3);require(CameraMatrixRecoveryAndroid.hasGrant(app,lane,uri,true),"ORIENTATION_GRANT_MISSING");h.store.destination(uri,flags&67,output.identity());}return continueInternal(h);}});});}
  /** Pure status: no initialize, continuation, terminal append or grant release. */
  private static Map<String,Object> readStatusInternal(Context app,Lane lane,int prefix)throws Exception{
    Map<String,Object> retained=gate(app),result;
    if(active!=null)result=active.lane==lane?status(active):map("kind","CAMERA_ORIENTATION_EXPORT_STATUS","prefix",prefix,"state","BUSY");
    else{
      CameraProofFiles files=new CameraProofFiles(app);File root=files.recoveryRoot(lane,false);
      if(root==null)result=map("kind","CAMERA_ORIENTATION_EXPORT_STATUS","prefix",prefix,"state","AVAILABLE","filename",lane.filename,"cameraMounted",false,"modelCalls",0);
      else{
        require(CameraProofLifecycle.SHARED_BUSY.compareAndSet(false,true),"ORIENTATION_BUSY");
        try(CameraProofFiles.RecoveryLock lock=files.recoveryLock(lane,root,false)){
          result=new CameraMatrixRecoveryStore(root,files,lane,lock,CameraOrientationSource.SHA256,CameraOrientationAndroid.apkHash(app)).status();
          result.put("kind","CAMERA_ORIENTATION_EXPORT_STATUS");result.put("prefix",prefix);result.put("filename",lane.filename);result.put("processId",android.os.Process.myPid());result.put("currentProcess",CameraProofLifecycle.PROCESS);result.put("cameraMounted",false);result.put("modelCalls",0);
        }finally{CameraProofLifecycle.SHARED_BUSY.set(false);}
      }
    }
    result.put("retainedPreviewV3",retained);return result;
  }
  public static void observe(Context context,int prefix,CameraMatrixRecoveryAndroid.Listener listener){Context app=context.getApplicationContext();Lane lane=lane(prefix);submit(app,prefix,listener,()->readStatusInternal(app,lane,prefix));}
  public static Map<String,Object> readStatus(Context context,int prefix)throws Exception{Context app=context.getApplicationContext();Lane lane=lane(prefix);try{return WORKER.submit(()->readStatusInternal(app,lane,prefix)).get(15,TimeUnit.SECONDS);}catch(ExecutionException error){throw CameraOrientationErrors.statusException(error);}}
}

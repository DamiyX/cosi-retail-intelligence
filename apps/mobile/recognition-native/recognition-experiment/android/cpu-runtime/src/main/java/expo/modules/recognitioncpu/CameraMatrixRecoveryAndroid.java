package expo.modules.recognitioncpu;

import android.content.Context;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.os.Environment;
import android.os.StatFs;
import android.provider.OpenableColumns;
import android.system.*;
import java.io.*;
import java.lang.ref.WeakReference;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Application-owned native recovery. Neither a JS promise nor an Activity owns output execution. */
public final class CameraMatrixRecoveryAndroid {
  private CameraMatrixRecoveryAndroid(){}
  public interface Listener {void update(Map<String,Object> status);}
  private interface Work {Map<String,Object> run()throws Exception;}
  private static final ExecutorService WORKER=Executors.newSingleThreadExecutor();
  private static final Handler MAIN=new Handler(Looper.getMainLooper());
  private static Held active;
  private static String apk;
  private static final class Held {
    final Context context;final Lane lane;final CameraProofFiles files;
    final CameraProofFiles.RecoveryLock lock;final CameraMatrixRecoveryStore store;final CameraMatrixFixtureLifecycle lifecycle;
    Held(Context context,Lane lane,CameraProofFiles files,CameraProofFiles.RecoveryLock lock,CameraMatrixRecoveryStore store){this.context=context;this.lane=lane;this.files=files;this.lock=lock;this.store=store;this.lifecycle=lane==Lane.FIXTURE?store.fixtureLifecycle():null;}
  }
  private static void gate(Context context){requireRecovery(CameraProofAndroid.enabled(context),"VARIANT");requireRecovery(!CameraMatrixRecoverySource.SHA256.equals(ZERO),"SOURCE_UNBOUND");}
  private static String apk(Context context)throws Exception{
    if(apk!=null)return apk;MessageDigest digest=MessageDigest.getInstance("SHA-256");long total=0;
    try(InputStream in=new FileInputStream(context.getApplicationInfo().sourceDir)){byte[] bytes=new byte[8192];int n;while((n=in.read(bytes))!=-1){total+=n;requireRecovery(total<=64L*1024*1024,"APK_BOUND");digest.update(bytes,0,n);}}
    StringBuilder hex=new StringBuilder();for(byte value:digest.digest())hex.append(String.format(Locale.ROOT,"%02x",value&255));apk=hex.toString();return apk;
  }
  private static Held acquire(Context context,Lane lane,boolean create)throws Exception{
    gate(context);if(active!=null){requireRecovery(active.lane==lane,"OTHER_LANE_OWNED");active.lock.assertHeld();return active;}
    requireRecovery(CameraProofLifecycle.SHARED_BUSY.compareAndSet(false,true),"BUSY");CameraProofFiles.RecoveryLock lock=null;
    try{
      CameraProofFiles files=new CameraProofFiles(context);File root=files.recoveryRoot(lane,false);boolean fresh=root==null;
      if(fresh&&!create){CameraProofLifecycle.SHARED_BUSY.set(false);return null;}
      if(fresh)root=files.recoveryRoot(lane,true);lock=files.recoveryLock(lane,root,fresh);
      CameraMatrixRecoveryStore store=new CameraMatrixRecoveryStore(root,files,lane,lock,CameraMatrixRecoverySource.SHA256,apk(context));
      if(fresh){CameraMatrixRecoveryEngine.Source source=source(context,files,lane);store.initialize(source.fingerprint(),true);}
      else requireRecovery(!store.state().equals("EMPTY"),"EMPTY_CONSUMED_ROOT");
      active=new Held(context,lane,files,lock,store);return active;
    }catch(Exception error){if(lock!=null)try{lock.close();}catch(IOException close){error.addSuppressed(close);}CameraProofLifecycle.SHARED_BUSY.set(false);throw error;}
  }
  private static CameraMatrixRecoveryEngine.Source source(Context context,CameraProofFiles files,Lane lane)throws Exception{
    if(lane==Lane.FIXTURE)return CameraMatrixRecoveryEngine.fixture(CameraMatrixRecoverySource.SHA256,apk(context));
    return new CameraMatrixHistoricalReader(context.getFilesDir().getCanonicalFile(),files,CameraMatrixRecoverySource.SHA256,apk(context));
  }
  private static Map<String,Object> capacity(Context context,CameraProofFiles files)throws Exception{
    CameraProofStore readOnly=CameraProofStore.readOnly(new File(context.getFilesDir().getCanonicalFile(),"camera-proof-v1"),new CameraMatrixHistoricalReader.ReadOnlyIO(files),CAMERA_OWNER,CameraProofLifecycle.PROCESS);
    return readOnly.status();
  }
  private static void releaseOwner()throws Exception{Held old=active;active=null;if(old!=null)try{old.lock.close();}finally{CameraProofLifecycle.SHARED_BUSY.set(false);}}
  private static List<UriPermission> grants(Context context)throws Exception{List<UriPermission> permissions=context.getContentResolver().getPersistedUriPermissions();requireRecovery(permissions.size()<=128,"GRANT_COUNT");return permissions;}
  static boolean hasGrant(Context context,Lane lane,String uri,boolean writing)throws Exception{
    for(UriPermission permission:grants(context))if(permission.getUri().toString().equals(uri)&&fixedUri(lane,uri))return permission.isReadPermission()&&(!writing||permission.isWritePermission());return false;
  }
  private static boolean orphanGrant(Context context,Lane lane)throws Exception{for(UriPermission permission:grants(context))if(fixedUri(lane,permission.getUri().toString()))return true;return false;}
  static boolean releaseGrants(Context context,Lane lane)throws Exception{
    boolean remaining=false;for(UriPermission permission:grants(context))if(fixedUri(lane,permission.getUri().toString())){
      int flags=(permission.isReadPermission()?Intent.FLAG_GRANT_READ_URI_PERMISSION:0)|(permission.isWritePermission()?Intent.FLAG_GRANT_WRITE_URI_PERMISSION:0);
      try{context.getContentResolver().releasePersistableUriPermission(permission.getUri(),flags);}catch(SecurityException refused){remaining=true;}
    }return remaining;
  }
  private static Map<String,Object> status(Held held)throws Exception{
    Map<String,Object> result=held.store.status();result.put("filename",held.lane.filename);result.put("processId",android.os.Process.myPid());result.put("cameraMounted",false);result.put("modelCalls",0);result.put("originalExportResultUnchanged",true);if(held.lane==Lane.FIXTURE)result.put("currentProcess",CameraProofLifecycle.PROCESS);return result;
  }
  private static Map<String,Object> terminal(Held held)throws Exception{
    Map<String,Object> result=status(held);try{result.put("grantReleasePending",releaseGrants(held.context,held.lane));}catch(Exception cleanup){result.put("grantReleasePending",true);result.put("cleanupError",CameraProofFinalizer.code(cleanup));}finally{releaseOwner();}return result;
  }
  private static void fixturePassed(Context context)throws Exception{
    CameraProofFiles files=new CameraProofFiles(context);File root=files.recoveryRoot(Lane.FIXTURE,false);requireRecovery(root!=null,"GENERATED_CHECK_REQUIRED");
    try(CameraProofFiles.RecoveryLock lock=files.recoveryLock(Lane.FIXTURE,root,false)){
      CameraMatrixRecoveryStore fixture=new CameraMatrixRecoveryStore(root,files,Lane.FIXTURE,lock,CameraMatrixRecoverySource.SHA256,apk(context));requireRecovery(fixture.state().equals("TERMINAL")&&"READBACK_VERIFIED".equals(fixture.payload("terminal").get("status")),"GENERATED_CHECK_REQUIRED");fixture.fixtureLifecycle().requireSuccessfulFixture();
    }
  }
  private static Map<String,Object> inspectInternal(Context context,Lane lane,boolean resume)throws Exception{
    Held held=acquire(context,lane,false);if(held==null)return map("kind","P203_EXPORT_RECOVERY_STATUS","lane",lane.name(),"state","AVAILABLE","filename",lane.filename,"cameraMounted",false,"modelCalls",0);
    String state=held.store.state();if(state.equals("TERMINAL"))return terminal(held);
    if(resume&&state.equals("SELECTION")&&orphanGrant(context,lane)){held.store.terminal("UNVERIFIED","GRANT_NOT_JOURNALED");return terminal(held);}
    if(resume&&(state.equals("DESTINATION")||state.equals("WRITE")||state.equals("VERIFIED")))return continueInternal(held);
    return status(held);
  }
  private static Map<String,Object> prepareInternal(Context context,Lane lane,String instance)throws Exception{
    gate(context);if(lane==Lane.ACTUAL)fixturePassed(context);Held held=acquire(context,lane,true);
    requireRecovery(held.store.state().equals("OWNER"),"SELECTION_ALREADY_CONSUMED");capacity(context,held.files);String expected=(String)held.store.payload("owner").get("inputs");requireRecovery(expected.equals(source(context,held.files,lane).fingerprint()),"INPUT_CHANGED");held.store.selection();if(lane==Lane.FIXTURE)held.lifecycle.claim(instance,CameraProofLifecycle.PROCESS,android.os.Process.myPid());Map<String,Object> result=status(held);result.put("launchPicker",true);return result;
  }
  private static Map<String,Object> receiveInternal(Context context,Lane lane,String selected,int offered,boolean cancelled)throws Exception{
    Held held=acquire(context,lane,false);requireRecovery(held!=null,"NO_SELECTION");String state=held.store.state();
    if(!state.equals("SELECTION"))return inspectInternal(context,lane,false); // duplicate/stale result never gains write authority
    if(cancelled){held.store.terminal("CANCELLED","PICKER_CANCELLED");return terminal(held);}
    if(lane==Lane.FIXTURE){try{held.lifecycle.requireDestinationProcess(CameraProofLifecycle.PROCESS,android.os.Process.myPid());}catch(Exception missing){held.store.terminal("UNVERIFIED","FIXTURE_LIFECYCLE_NOT_PROVEN");return terminal(held);}}
    if(!fixedUri(lane,selected)||(offered&67)!=67){held.store.terminal("UNVERIFIED","INVALID_URI_OR_OFFERED_GRANTS");return terminal(held);}
    try(Output output=new Output(context,lane,selected,true,false)){
      requireRecovery(output.size()==0,"DESTINATION_NONEMPTY");context.getContentResolver().takePersistableUriPermission(Uri.parse(selected),offered&3);
      requireRecovery(hasGrant(context,lane,selected,true),"PERSISTABLE_GRANT_MISSING");held.store.destination(selected,offered&67,output.identity(),android.os.Process.myPid());
    }catch(Exception error){
      // A definitely rejected selection may end; torn/ambiguous destination publication remains preserved.
      try{if(held.store.state().equals("SELECTION")){held.store.terminal("UNVERIFIED","DESTINATION_NOT_PERSISTED");terminal(held);}}catch(Exception finalization){error.addSuppressed(finalization);}throw error;
    }
    return continueInternal(held);
  }
  private static Map<String,Object> continueInternal(Held held)throws Exception{
    String state=held.store.state();if(state.equals("TERMINAL"))return terminal(held);requireRecovery(Arrays.asList("DESTINATION","WRITE","VERIFIED").contains(state),"NO_SELECTED_OPERATION");
    boolean writing=state.equals("DESTINATION");String uri=(String)held.store.payload("destination").get("uri");CameraMatrixRecoveryEngine.Source source=source(held.context,held.files,held.lane);CameraMatrixRecoveryEngine engine=new CameraMatrixRecoveryEngine(held.store,source,held.lane);
    try(Output output=new Output(held.context,held.lane,uri,writing,true)){engine.continueSelected(output);}
    return held.store.state().equals("TERMINAL")?terminal(held):status(held);
  }
  private static void submit(Context context,Lane lane,WeakReference<Listener> listener,Work task){
    Context app=context.getApplicationContext();WORKER.execute(()->{
      Map<String,Object> result;
      try{gate(app);result=task.run();}catch(Exception error){result=map("kind","P203_EXPORT_RECOVERY_STATUS","lane",lane.name(),"state","BLOCKED","error",CameraProofFinalizer.code(error),"writeAuthority","NONE","noReplay",true);try{if(active!=null&&active.lane==lane)result.put("durableState",active.store.state());}catch(Exception ignored){result.put("durableState","UNKNOWN_OR_TORN");}}
      Map<String,Object> delivered=result;MAIN.post(()->{Listener target=listener.get();if(target!=null)target.update(delivered);});
    });
  }

  /** Bridge status is read-only: it never resumes, releases grants, creates roots or publishes records. */
  public static Map<String,Object> readStatus(Context context,boolean fixture)throws Exception{
    Context app=context.getApplicationContext();Lane lane=fixture?Lane.FIXTURE:Lane.ACTUAL;
    return WORKER.submit(()->{
      gate(app);if(active!=null){if(active.lane==lane)return status(active);return map("kind","P203_EXPORT_RECOVERY_STATUS","lane",lane.name(),"state","BUSY");}
      CameraProofFiles files=new CameraProofFiles(app);File root=files.recoveryRoot(lane,false);if(root==null)return map("kind","P203_EXPORT_RECOVERY_STATUS","lane",lane.name(),"state","AVAILABLE","filename",lane.filename);
      requireRecovery(CameraProofLifecycle.SHARED_BUSY.compareAndSet(false,true),"BUSY");
      try(CameraProofFiles.RecoveryLock lock=files.recoveryLock(lane,root,false)){Map<String,Object> result=new CameraMatrixRecoveryStore(root,files,lane,lock,CameraMatrixRecoverySource.SHA256,apk(app)).status();if(lane==Lane.FIXTURE){result.put("processId",android.os.Process.myPid());result.put("currentProcess",CameraProofLifecycle.PROCESS);}return result;}
      finally{CameraProofLifecycle.SHARED_BUSY.set(false);}
    }).get(15,java.util.concurrent.TimeUnit.SECONDS);
  }
  public static void inspect(Context context,boolean fixture,boolean resume,Listener listener){Context app=context.getApplicationContext();Lane lane=fixture?Lane.FIXTURE:Lane.ACTUAL;submit(app,lane,new WeakReference<>(listener),()->inspectInternal(app,lane,resume));}
  public static void prepare(Context context,boolean fixture,String instance,Listener listener){Context app=context.getApplicationContext();Lane lane=fixture?Lane.FIXTURE:Lane.ACTUAL;submit(app,lane,new WeakReference<>(listener),()->prepareInternal(app,lane,instance));}
  public static void receive(Context context,boolean fixture,String uri,int flags,boolean cancelled,Listener listener){Context app=context.getApplicationContext();Lane lane=fixture?Lane.FIXTURE:Lane.ACTUAL;submit(app,lane,new WeakReference<>(listener),()->receiveInternal(app,lane,uri,flags,cancelled));}

  private interface FixtureEvent {void run(Held held,Map<String,Object> result)throws Exception;}
  private static void fixtureEvent(Context context,Listener listener,FixtureEvent event){Context app=context.getApplicationContext();submit(app,Lane.FIXTURE,new WeakReference<>(listener),()->{
    Held held=active;if(held==null||held.lane!=Lane.FIXTURE)return map("kind","P203_EXPORT_RECOVERY_STATUS","lane","FIXTURE","state","BUSY","detail","Await native inspection; lifecycle events do not open a root.");
    held.lock.assertHeld();Map<String,Object> flags=new LinkedHashMap<>();event.run(held,flags);Map<String,Object> result=status(held);result.putAll(flags);return result;
  });}
  public static void fixturePickerStopped(Context context,String instance,Listener listener){fixtureEvent(context,listener,(held,flags)->{
    if(held.lifecycle.request(instance,CameraProofLifecycle.PROCESS,android.os.Process.myPid()))flags.put("fixtureRecreateNow",true);
  });}
  public static void fixtureRecreateInvoked(Context context,String instance,Listener listener){fixtureEvent(context,listener,(held,flags)->held.lifecycle.invoked(instance,CameraProofLifecycle.PROCESS,android.os.Process.myPid()));}
  public static void fixtureActivityDestroyed(Context context,String instance,Listener listener){fixtureEvent(context,listener,(held,flags)->held.lifecycle.destroyed(instance,CameraProofLifecycle.PROCESS,android.os.Process.myPid()));}
  public static void fixtureActivityCreated(Context context,String instance,String previous,Listener listener){fixtureEvent(context,listener,(held,flags)->{
    if(held.lifecycle.created(instance,previous,CameraProofLifecycle.PROCESS,android.os.Process.myPid(),true)){
      flags.put("fixtureRecreatedNow",true);android.util.Log.i("P203FixtureLife",json(map("event","FIXTURE_ACTIVITY_RECREATED","pid",android.os.Process.myPid(),"process",CameraProofLifecycle.PROCESS,"proof",held.store.status().get("fixtureRecreation"))));
    }
  });}

  /** Fixed-provider descriptor: rw never truncates; identity is rechecked on every IO and by URI at boundaries. */
  static final class Output implements CameraMatrixRecoveryEngine.Output,AutoCloseable {
    private final Context context;private final Lane lane;private final String uri;private final ParcelFileDescriptor parcel;private final FileDescriptor fd;private final StructStat original;
    Output(Context context,Lane lane,String uri,boolean writing,boolean persisted)throws Exception{
      requireRecovery(fixedUri(lane,uri),"FIXED_URI");this.context=context;this.lane=lane;this.uri=uri;
      if(persisted)requireRecovery(hasGrant(context,lane,uri,writing),"PERSISTED_ACCESS");
      try(Cursor cursor=context.getContentResolver().query(Uri.parse(uri),new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE},null,null,null)){
        requireRecovery(cursor!=null&&cursor.moveToFirst()&&lane.filename.equals(cursor.getString(0))&&!cursor.isNull(1)&&(!writing||cursor.getLong(1)==0)&&!cursor.moveToNext(),"DOCUMENT_METADATA");
      }
      ParcelFileDescriptor selected=context.getContentResolver().openFileDescriptor(Uri.parse(uri),writing?"rw":"r");requireRecovery(selected!=null,"OPEN");
      try{StructStat stat=Os.fstat(selected.getFileDescriptor());requireRecovery(OsConstants.S_ISREG(stat.st_mode)&&stat.st_nlink==1&&(!writing||stat.st_size==0),"FILE_TYPE_OR_SIZE");parcel=selected;fd=selected.getFileDescriptor();original=stat;}catch(Exception error){selected.close();throw error;}
    }
    private void descriptor()throws Exception{StructStat current=Os.fstat(fd);requireRecovery(current.st_dev==original.st_dev&&current.st_ino==original.st_ino&&current.st_nlink==1&&OsConstants.S_ISREG(current.st_mode),"DESCRIPTOR_CHANGED");}
    public Map<String,Object> identity()throws Exception{descriptor();try(ParcelFileDescriptor check=context.getContentResolver().openFileDescriptor(Uri.parse(uri),"r")){requireRecovery(check!=null,"PATH_CHECK");StructStat current=Os.fstat(check.getFileDescriptor());requireRecovery(current.st_dev==original.st_dev&&current.st_ino==original.st_ino&&current.st_nlink==1&&OsConstants.S_ISREG(current.st_mode),"PATH_CHANGED");}requireRecovery(original.st_dev>=0&&original.st_ino>=0,"UNSUPPORTED_IDENTITY_RANGE");return map("device",Long.toString(original.st_dev),"inode",Long.toString(original.st_ino));}
    public boolean grants(boolean writing)throws Exception{return hasGrant(context,lane,uri,writing);}
    public long available(){return new StatFs(Environment.getExternalStorageDirectory().getPath()).getAvailableBytes();}
    public long size()throws Exception{descriptor();return Os.fstat(fd).st_size;}
    public int write(byte[] bytes,int at,int count)throws Exception{descriptor();return Os.write(fd,bytes,at,count);}
    public void sync()throws Exception{descriptor();Os.fsync(fd);}
    public void rewind()throws Exception{descriptor();Os.lseek(fd,0,OsConstants.SEEK_SET);}
    public int read(byte[] bytes)throws Exception{descriptor();int n=Os.read(fd,bytes,0,bytes.length);return n==0?-1:n;}
    public void close()throws IOException{parcel.close();}
  }
}

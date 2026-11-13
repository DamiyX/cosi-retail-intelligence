package expo.modules.recognitioncpu;

import android.content.Context;
import android.system.Os;
import android.system.OsConstants;
import android.system.StructStat;
import android.system.ErrnoException;
import java.io.*;
import java.util.*;

/** Android app-private IO. Opened descriptors, not caller URI membership, establish file identity. */
public final class CameraProofFiles implements CameraProofStore.IO {
  private final File parent;private final int uid;private final boolean contextFilesCanonical;
  public CameraProofFiles(Context context)throws IOException{parent=context.getFilesDir().getCanonicalFile();uid=android.os.Process.myUid();contextFilesCanonical=context.getFilesDir().getAbsoluteFile().equals(parent);}
  public interface AliasObserver {void mismatch(String location,boolean absoluteUnderFiles,boolean canonicalUnderFiles,boolean contextFilesCanonical);}
  private static final ThreadLocal<AliasObserver> ALIAS_OBSERVER=new ThreadLocal<>();
  /** Scoped, observation-only hook. It cannot approve or replace a failed predicate. */
  public static AutoCloseable observeAliases(AliasObserver observer){CameraProofFrame.require(ALIAS_OBSERVER.get()==null,"CAMERA_ALIAS_OBSERVER_NESTED");ALIAS_OBSERVER.set(observer);return ()->ALIAS_OBSERVER.remove();}
  private String aliasLocation(File p)throws IOException{
    if(p.getAbsoluteFile().equals(parent)||p.getCanonicalFile().equals(parent))return "FILES_PARENT";
    String name=p.getName();
    if(name.equals(CameraOrientationPlan.CAMERA_ROOT))return "C1_CAMERA";
    if(name.equals(CameraOrientationPlan.ROOT))return "C1_RUN";
    if(name.equals(CameraCaptureDiagnosticSetupSnapshot.LEGACY_ROOT))return "LEGACY_A1";
    if(name.equals(GraphicsEntryProtocol.ROOT))return "GRAPHICS_PROBE";
    if(name.equals(GraphicsEntryRetained.ROOT))return "GRAPHICS_RETAINED_A1";
    if(name.equals("camera-proof-v1"))return "CORE_CAMERA";
    for(int i=1;i<=3;i++)if(name.equals(CameraCaptureDiagnosticProfile.root(i)))return "B1_E0"+i;
    for(CameraMatrixRecoveryPlan.Lane lane:CameraMatrixRecoveryPlan.Lane.values())if(name.equals(lane.root))return "RECOVERY_"+lane.name();
    return "OTHER_FIXED_READER";
  }
  private static IOException error(CameraProofFinalizer.IoStage stage,ErrnoException e){return CameraProofFinalizer.ioFailure(stage,e.errno,OsConstants.errnoName(e.errno),e);}
  private static boolean same(StructStat a,StructStat b){return a.st_dev==b.st_dev&&a.st_ino==b.st_ino&&a.st_size==b.st_size&&a.st_mtim.tv_sec==b.st_mtim.tv_sec&&a.st_mtim.tv_nsec==b.st_mtim.tv_nsec&&a.st_ctim.tv_sec==b.st_ctim.tv_sec&&a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;}
  private StructStat stat(File p)throws IOException{
    try{return Os.lstat(p.getPath());}catch(ErrnoException e){if(e.errno==OsConstants.ENOENT)return null;throw error(CameraProofFinalizer.IoStage.STAT,e);}
  }
  private void directory(File p)throws IOException{
    try{CameraDirectoryPath.requireCanonical(p);}catch(IllegalArgumentException error){
      AliasObserver observer=ALIAS_OBSERVER.get();
      if(observer!=null)try{String prefix=parent.getPath()+File.separator;observer.mismatch(aliasLocation(p),p.getAbsolutePath().startsWith(prefix),p.getCanonicalPath().startsWith(prefix),contextFilesCanonical);}catch(Exception ignored){/* Diagnostics never weaken the original refusal. */}
      throw error;
    }
    StructStat s=stat(p);CameraProofFrame.require(s!=null&&OsConstants.S_ISDIR(s.st_mode)&&s.st_uid==uid,"CAMERA_DIRECTORY_TYPE");
  }
  private StructStat regular(File p)throws IOException{
    directory(p.getParentFile());CameraProofFrame.require(p.getAbsoluteFile().equals(p.getCanonicalFile()),"CAMERA_FILE_ALIAS");
    StructStat s=stat(p);if(s==null)return null;
    CameraProofFrame.require(OsConstants.S_ISREG(s.st_mode)&&s.st_nlink==1&&s.st_uid==uid,"CAMERA_FILE_TYPE_OR_LINK");return s;
  }
  @Override public void root(File r,boolean create)throws IOException{
    directory(parent);CameraProofFrame.require(r.getParentFile().equals(parent)&&r.getName().equals("camera-proof-v1"),"CAMERA_STORE_ROOT");
    CameraEvidenceC9.validateFootprints(parent,this,stat(new File(parent,CameraEvidenceC9.LEGACY_ROOT))!=null,stat(new File(parent,CameraEvidenceC9.ROOT))!=null);
    retainedMatrixInitialization();
    File matrix=new File(parent,CameraMatrixPlan.ROOT);if(stat(matrix)!=null){directory(matrix);try{CameraMatrixStore.footprint(matrix,this);}catch(IOException e){throw e;}catch(Exception e){throw new IOException("CAMERA_MATRIX_FOOTPRINT",e);}}
    for(CameraMatrixRecoveryPlan.Lane lane:CameraMatrixRecoveryPlan.Lane.values()){
      File recovery=new File(parent,lane.root);if(stat(recovery)!=null){directory(recovery);try{CameraMatrixRecoveryPlan.footprint(recovery,this,lane);}catch(IOException e){throw e;}catch(Exception e){throw new IOException("CAMERA_RECOVERY_FOOTPRINT",e);}}
    }
    if(stat(new File(parent,CameraMatrixRecoveryPlan.Lane.ACTUAL.root))!=null){
      long original=0;for(String n:list(matrix))original=Math.addExact(original,size(new File(matrix,n)));
      CameraProofFrame.require(original<=CameraMatrixRecoveryPlan.ORIGINAL_CANONICAL,"CAMERA_RECOVERY_ORIGINAL_BOOK");
    }
    File stationary=new File(parent,"camera-geometry-c8-v1");
    if(stat(stationary)!=null){directory(stationary);CameraStationarySlot.validateFootprint(stationary,this);}
    if(stat(r)==null&&create)CameraProofFrame.require(r.mkdir(),"CAMERA_STORE_MKDIR");directory(r);
  }
  /** One sidecar root creation itself consumes availability, including an empty crash residue. */
  public File newExportRoot()throws IOException{
    directory(parent);File r=new File(parent,"camera-evidence-export-v1");
    CameraProofFrame.require(stat(r)==null,"CAMERA_EXPORT_ATTEMPT_CONSUMED");
    CameraProofFrame.require(r.mkdir(),"CAMERA_EXPORT_ROOT_CREATE");directory(r);syncDirectory(parent);return r;
  }
  /** Fixed C9 admission shares C7's existing reserve; old roots are never reused. */
  public File newC9ExportRoot()throws IOException{
    directory(parent);File r=new File(parent,CameraEvidenceC9.ROOT);
    CameraEvidenceC9.admit(parent,this,stat(r)!=null);
    CameraProofFrame.require(r.mkdir(),"CAMERA_C9_EXPORT_ROOT_CREATE");directory(r);syncDirectory(parent);return r;
  }
  public File stationaryRoot(boolean create)throws IOException{
    directory(parent);File r=new File(parent,"camera-geometry-c8-v1");
    if(create){CameraProofFrame.require(stat(r)==null,"CAMERA_C8_CONSUMED");CameraProofFrame.require(r.mkdir(),"CAMERA_C8_MKDIR");directory(r);syncDirectory(parent);}
    else if(stat(r)==null)return null;
    directory(r);return r;
  }
  public long retainedMatrixInitialization()throws IOException{
    File old=new File(parent,CameraMatrixPlan.RETAINED_ROOT);directory(old);
    try{return CameraMatrixStore.retainedInitialization(old,this);}catch(IOException e){throw e;}catch(Exception e){throw new IOException("CAMERA_MATRIX_RETAINED_INITIALIZATION",e);}
  }
  public File matrixRoot(boolean create)throws IOException{
    directory(parent);File r=new File(parent,CameraMatrixPlan.ROOT);if(stat(r)==null){if(!create)return null;CameraProofFrame.require(r.mkdir(),"CAMERA_MATRIX_ROOT_CREATE");directory(r);syncDirectory(parent);}else{directory(r);CameraProofFrame.require(!create,"CAMERA_MATRIX_ROOT_CONSUMED");}return r;
  }
  /** Separate fixed V2 namespace; all V1 roots remain read-only from the new capture lane. */
  public File orientationRoot(String name,boolean create)throws IOException{
    CameraProofFrame.require(name.equals(CameraOrientationPlan.CAMERA_ROOT)||name.equals(CameraOrientationPlan.ROOT),"CAMERA_ORIENTATION_ROOT");
    root(new File(parent,"camera-proof-v1"),false);File r=new File(parent,name);
    if(stat(r)==null){if(!create)return null;CameraProofFrame.require(r.mkdir(),"CAMERA_ORIENTATION_ROOT_CREATE");directory(r);syncDirectory(parent);}else directory(r);return r;
  }

  public File recoveryRoot(CameraMatrixRecoveryPlan.Lane lane,boolean create)throws IOException{
    CameraProofFrame.require(!create||!lane.retained(),"CAMERA_RETAINED_READ_ONLY");directory(parent);File r=new File(parent,lane.root);StructStat existing=stat(r);
    if(existing==null){if(!create)return null;CameraProofFrame.require(r.mkdir(),"CAMERA_RECOVERY_MKDIR");directory(r);syncDirectory(parent);}else{directory(r);CameraProofFrame.require(!create,"CAMERA_RECOVERY_ROOT_CONSUMED");}return r;
  }
  /** OS lock is held by the application controller, never an Activity instance. */
  public final class RecoveryLock implements AutoCloseable,CameraMatrixRecoveryStore.Guard {
    private final File root,leaf;private final StructStat identity,rootIdentity;private final FileOutputStream stream;private final java.nio.channels.FileLock lock;private boolean closed;
    private RecoveryLock(File root,boolean create)throws IOException{
      this.root=root;directory(root);rootIdentity=stat(root);leaf=new File(root,"lock");StructStat old=regular(leaf);CameraProofFrame.require(create?old==null:old!=null,"CAMERA_RECOVERY_LOCK_STATE");FileDescriptor fd;
      try{fd=Os.open(leaf.getPath(),OsConstants.O_RDWR|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC|(create?OsConstants.O_CREAT|OsConstants.O_EXCL:0),0600);}catch(ErrnoException e){throw error(CameraProofFinalizer.IoStage.DIRECTORY_OPEN,e);}
      FileOutputStream output=new FileOutputStream(fd);java.nio.channels.FileLock acquired=null;
      try{StructStat opened=Os.fstat(fd);CameraProofFrame.require(OsConstants.S_ISREG(opened.st_mode)&&opened.st_uid==uid&&opened.st_nlink==1&&opened.st_size==0,"CAMERA_RECOVERY_LOCK_FILE");if(old!=null)CameraProofFrame.require(old.st_dev==opened.st_dev&&old.st_ino==opened.st_ino,"CAMERA_RECOVERY_LOCK_CHANGED");acquired=output.getChannel().tryLock();CameraProofFrame.require(acquired!=null,"CAMERA_RECOVERY_BUSY");if(create){Os.fsync(fd);syncDirectory(root);}identity=opened;stream=output;lock=acquired;assertHeld();}
      catch(Exception e){if(acquired!=null)try{acquired.release();}catch(IOException close){e.addSuppressed(close);}try{output.close();}catch(IOException close){e.addSuppressed(close);}if(e instanceof IOException)throw (IOException)e;throw new IOException("CAMERA_RECOVERY_LOCK",e);}
    }
    public void assertHeld()throws IOException{CameraProofFrame.require(!closed&&lock.isValid(),"CAMERA_RECOVERY_LOCK_LOST");directory(root);StructStat currentRoot=stat(root),file=regular(leaf);CameraProofFrame.require(currentRoot.st_dev==rootIdentity.st_dev&&currentRoot.st_ino==rootIdentity.st_ino&&file!=null&&file.st_dev==identity.st_dev&&file.st_ino==identity.st_ino&&file.st_size==0,"CAMERA_RECOVERY_LOCK_IDENTITY");}
    public void close()throws IOException{if(closed)return;closed=true;try{lock.release();}finally{stream.close();}}
  }
  public RecoveryLock recoveryLock(CameraMatrixRecoveryPlan.Lane lane,File root,boolean create)throws IOException{CameraProofFrame.require(root.getParentFile().equals(parent)&&root.getName().equals(lane.root),"CAMERA_RECOVERY_LOCK_ROOT");return new RecoveryLock(root,create);}
  @Override public List<String> list(File r)throws IOException{directory(r);String[] names=r.list();CameraProofFrame.require(names!=null,"CAMERA_DIRECTORY_READ");return Arrays.asList(names);}
  @Override public void syncDirectory(File dir)throws IOException{
    directory(dir);StructStat before=stat(dir);CameraProofFrame.require(before!=null,"CAMERA_DIRECTORY_SUBSTITUTION");
    FileDescriptor fd;
    // Java's public OsConstants omits O_DIRECTORY. NONBLOCK avoids FIFO blocking;
    // the opened descriptor must prove directory type/owner/identity before fsync.
    try{fd=Os.open(dir.getPath(),OsConstants.O_RDONLY|OsConstants.O_NONBLOCK|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC,0);}
    catch(ErrnoException e){throw error(CameraProofFinalizer.IoStage.DIRECTORY_OPEN,e);}
    Throwable primary=null;
    try{
      StructStat opened;
      try{opened=Os.fstat(fd);}catch(ErrnoException e){throw error(CameraProofFinalizer.IoStage.DIRECTORY_STAT,e);}
      CameraProofFrame.require(OsConstants.S_ISDIR(opened.st_mode)&&opened.st_uid==uid&&opened.st_dev==before.st_dev&&opened.st_ino==before.st_ino,"CAMERA_DIRECTORY_SUBSTITUTION");
      try{Os.fsync(fd);}catch(ErrnoException e){throw error(CameraProofFinalizer.IoStage.DIRECTORY_SYNC,e);}
      directory(dir);StructStat path=stat(dir);
      CameraProofFrame.require(path!=null&&opened.st_dev==path.st_dev&&opened.st_ino==path.st_ino,"CAMERA_DIRECTORY_SUBSTITUTION");
    }catch(IOException|RuntimeException|Error e){primary=e;throw e;}
    finally{
      try{Os.close(fd);}catch(ErrnoException e){IOException close=error(CameraProofFinalizer.IoStage.DIRECTORY_CLOSE,e);if(primary==null)throw close;primary.addSuppressed(close);}
    }
  }
  @Override public long size(File f)throws IOException{StructStat s=regular(f);return s==null?-1:s.st_size;}
  private byte[] readFile(File f,int cap)throws IOException{
    StructStat before=regular(f);CameraProofFrame.require(before!=null,"CAMERA_READ_MISSING");
    CameraProofFrame.require(before.st_size>=0,"CAMERA_READ_SIZE_INVALID");CameraProofFrame.require(before.st_size<=cap,"CAMERA_READ_OVERSIZED");
    try{
      FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC,0);
      try(FileInputStream in=new FileInputStream(fd)){
        StructStat opened=Os.fstat(fd);CameraProofFrame.require(same(before,opened)&&opened.st_nlink==1,"CAMERA_OPEN_SUBSTITUTION");
        ByteArrayOutputStream out=new ByteArrayOutputStream((int)opened.st_size);byte[] chunk=new byte[8192];int n;
        while((n=in.read(chunk))!=-1){CameraProofFrame.require(out.size()+(long)n<=cap,"CAMERA_READ_OVERSIZED");out.write(chunk,0,n);}
        StructStat after=Os.fstat(fd),path=regular(f);
        CameraProofFrame.require(path!=null&&same(opened,after)&&same(opened,path)&&out.size()==opened.st_size,"CAMERA_READ_SUBSTITUTION");return out.toByteArray();
      }
    }catch(ErrnoException e){throw error(CameraProofFinalizer.IoStage.READ,e);}
  }
  @Override public byte[] read(File f,int cap)throws IOException{return readFile(f,cap);}
  @Override public void writeNew(File f,byte[] b)throws IOException{
    CameraProofFrame.require(regular(f)==null,"CAMERA_WRITE_EXISTS");
    try{
      FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_WRONLY|OsConstants.O_CREAT|OsConstants.O_EXCL|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC,0600);
      try(FileOutputStream out=new FileOutputStream(fd)){out.write(b);out.flush();Os.fsync(fd);StructStat s=Os.fstat(fd);CameraProofFrame.require(s.st_size==b.length&&s.st_nlink==1,"CAMERA_WRITE_CHANGED");}
      CameraProofFrame.require(Arrays.equals(readFile(f,b.length),b),"CAMERA_WRITE_HASH");
    }catch(ErrnoException e){throw error(CameraProofFinalizer.IoStage.WRITE_NEW,e);}
  }
  @Override public void publish(File staged,File destination)throws IOException{
    StructStat s=regular(staged);CameraProofFrame.require(s!=null&&regular(destination)==null&&staged.getParentFile().equals(destination.getParentFile()),"CAMERA_PUBLISH_PATH");
    File dir=staged.getParentFile();directory(dir);StructStat parentIdentity=stat(dir);
    CameraProofRename.publish(dir.getPath(),staged.getName(),destination.getName(),new long[]{
      parentIdentity.st_dev,parentIdentity.st_ino,s.st_dev,s.st_ino,s.st_size,
      s.st_mtim.tv_sec,s.st_mtim.tv_nsec,s.st_ctim.tv_sec,s.st_ctim.tv_nsec});
    StructStat done=regular(destination);CameraProofFrame.require(regular(staged)==null&&done!=null&&s.st_dev==done.st_dev&&s.st_ino==done.st_ino&&s.st_size==done.st_size&&s.st_mtim.tv_sec==done.st_mtim.tv_sec&&s.st_mtim.tv_nsec==done.st_mtim.tv_nsec,"CAMERA_PUBLISH_CHANGED");
  }
  @Override public void writeAt(File f,int at,byte[] b)throws IOException{
    StructStat before=regular(f);CameraProofFrame.require(before!=null&&at>=0&&at+(long)b.length<=before.st_size,"CAMERA_PREALLOCATED_BOUND");
    try{
      FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDWR|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC,0);
      try(FileOutputStream out=new FileOutputStream(fd)){
        CameraProofFrame.require(same(before,Os.fstat(fd)),"CAMERA_WRITE_SUBSTITUTION");Os.lseek(fd,at,OsConstants.SEEK_SET);out.write(b);out.flush();Os.fsync(fd);
        StructStat after=Os.fstat(fd),path=regular(f);
        CameraProofFrame.require(after.st_size==before.st_size&&path!=null&&same(after,path)&&before.st_ino==after.st_ino&&before.st_dev==after.st_dev,"CAMERA_PREALLOCATED_GROWTH_OR_SUBSTITUTION");
      }
    }catch(ErrnoException e){throw error(CameraProofFinalizer.IoStage.WRITE_AT,e);}
  }
  @Override public long matrixAllowance(){return CameraMatrixPlan.OUTPUT+(long)CameraMatrixPlan.BOOK+CameraMatrixRecoveryPlan.FIXTURE_ALLOWANCE;}
  @Override public long available(File root)throws IOException{directory(root);return root.getUsableSpace();}
  public static final class Capture {public final byte[] bytes;public final long observedSdkBytes;Capture(byte[] b,long n){bytes=b;observedSdkBytes=n;}}
  public Set<String> existingCameraLeaves(Context context)throws IOException{
    File cache=context.getCacheDir().getCanonicalFile();directory(cache);File camera=new File(cache,"Camera");
    if(stat(camera)==null)return Collections.emptySet();directory(camera);List<String> names=list(camera);CameraProofFrame.require(names.size()<=2000,"CAMERA_SDK_FILE_COUNT");
    for(String name:names)CameraProofFrame.require(size(new File(camera,name))>=0,"CAMERA_SDK_CHANGED");
    return Collections.unmodifiableSet(new HashSet<>(names));
  }
  public Capture capture(Context context,String uri,Set<String> before,java.util.function.BiConsumer<String,Object> observe)throws IOException{
    return captureBounded(context,uri,before,observe,CameraProofFrame.JPEG_LIMIT);
  }
  Capture captureMatrix(Context context,String uri,Set<String> before,java.util.function.BiConsumer<String,Object> observe)throws IOException{return captureBounded(context,uri,before,observe,CameraMatrixPlan.JPEG);}
  private Capture captureBounded(Context context,String uri,Set<String> before,java.util.function.BiConsumer<String,Object> observe,int limit)throws IOException{
    File lexical=new File(context.getCacheDir(),"Camera"),canonical=new File(context.getCacheDir().getCanonicalFile(),"Camera");
    String leaf=CameraProofFrame.freshCameraLeaf(uri,lexical.getAbsolutePath(),before);directory(canonical);File f=new File(canonical,leaf);
    List<String> names=list(canonical);CameraProofFrame.require(names.size()<=2000,"CAMERA_SDK_FILE_COUNT");
    long observed=0;for(String n:names){long size=size(new File(canonical,n));CameraProofFrame.require(size>=0,"CAMERA_SDK_CHANGED");observed=Math.addExact(observed,size);observe.accept("sdkObservedCacheBytes",observed);}
    StructStat candidate=regular(f);CameraProofFrame.require(candidate!=null,"CAMERA_SDK_OUTPUT_MISSING");
    observe.accept("sdkCandidateBytes",candidate.st_size);observe.accept("sdkCandidateDevice",Long.toString(candidate.st_dev));observe.accept("sdkCandidateInode",Long.toString(candidate.st_ino));observe.accept("sdkCandidateMtimeSeconds",candidate.st_mtim.tv_sec);observe.accept("sdkCandidateMtimeNanos",candidate.st_mtim.tv_nsec);observe.accept("sdkObservationComplete",true);
    CameraProofFrame.inputSize(candidate.st_size);if(limit==CameraMatrixPlan.JPEG)CameraMatrixPlan.inputSize(candidate.st_size);
    byte[] bytes=readFile(f,limit);observe.accept("sdkOpenedIdentityValidated",true);
    return new Capture(bytes,observed);
  }
}

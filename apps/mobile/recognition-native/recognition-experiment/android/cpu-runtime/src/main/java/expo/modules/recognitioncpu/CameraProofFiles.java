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
  private final File parent;private final int uid;
  public CameraProofFiles(Context context)throws IOException{parent=context.getFilesDir().getCanonicalFile();uid=android.os.Process.myUid();}
  private static IOException error(Exception e){return new IOException(e);}
  private static boolean same(StructStat a,StructStat b){return a.st_dev==b.st_dev&&a.st_ino==b.st_ino&&a.st_size==b.st_size&&a.st_mtim.tv_sec==b.st_mtim.tv_sec&&a.st_mtim.tv_nsec==b.st_mtim.tv_nsec&&a.st_ctim.tv_sec==b.st_ctim.tv_sec&&a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;}
  private StructStat stat(File p)throws IOException{
    try{return Os.lstat(p.getPath());}catch(ErrnoException e){if(e.errno==OsConstants.ENOENT)return null;throw error(e);}
  }
  private void directory(File p)throws IOException{
    CameraProofFrame.require(p.getAbsoluteFile().equals(p.getCanonicalFile()),"CAMERA_DIRECTORY_ALIAS");
    StructStat s=stat(p);CameraProofFrame.require(s!=null&&OsConstants.S_ISDIR(s.st_mode)&&s.st_uid==uid,"CAMERA_DIRECTORY_TYPE");
  }
  private StructStat regular(File p)throws IOException{
    directory(p.getParentFile());CameraProofFrame.require(p.getAbsoluteFile().equals(p.getCanonicalFile()),"CAMERA_FILE_ALIAS");
    StructStat s=stat(p);if(s==null)return null;
    CameraProofFrame.require(OsConstants.S_ISREG(s.st_mode)&&s.st_nlink==1&&s.st_uid==uid,"CAMERA_FILE_TYPE_OR_LINK");return s;
  }
  @Override public void root(File r,boolean create)throws IOException{
    directory(parent);CameraProofFrame.require(r.getParentFile().equals(parent)&&r.getName().equals("camera-proof-v1"),"CAMERA_STORE_ROOT");
    if(stat(r)==null&&create)CameraProofFrame.require(r.mkdir(),"CAMERA_STORE_MKDIR");directory(r);
  }
  @Override public List<String> list(File r)throws IOException{directory(r);String[] names=r.list();CameraProofFrame.require(names!=null,"CAMERA_DIRECTORY_READ");return Arrays.asList(names);}
  @Override public long size(File f)throws IOException{StructStat s=regular(f);return s==null?-1:s.st_size;}
  private byte[] readFile(File f,int cap)throws IOException{
    StructStat before=regular(f);CameraProofFrame.require(before!=null&&before.st_size>=0&&before.st_size<=cap,"CAMERA_READ_BOUND");
    try{
      FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC,0);
      try(FileInputStream in=new FileInputStream(fd)){
        StructStat opened=Os.fstat(fd);CameraProofFrame.require(same(before,opened)&&opened.st_nlink==1,"CAMERA_OPEN_SUBSTITUTION");
        ByteArrayOutputStream out=new ByteArrayOutputStream((int)opened.st_size);byte[] chunk=new byte[8192];int n;
        while((n=in.read(chunk))!=-1){CameraProofFrame.require(out.size()+(long)n<=cap,"CAMERA_READ_BOUND");out.write(chunk,0,n);}
        StructStat after=Os.fstat(fd),path=regular(f);
        CameraProofFrame.require(path!=null&&same(opened,after)&&same(opened,path)&&out.size()==opened.st_size,"CAMERA_READ_SUBSTITUTION");return out.toByteArray();
      }
    }catch(ErrnoException e){throw error(e);}
  }
  @Override public byte[] read(File f,int cap)throws IOException{return readFile(f,cap);}
  @Override public void writeNew(File f,byte[] b)throws IOException{
    CameraProofFrame.require(regular(f)==null,"CAMERA_WRITE_EXISTS");
    try{
      FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_WRONLY|OsConstants.O_CREAT|OsConstants.O_EXCL|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC,0600);
      try(FileOutputStream out=new FileOutputStream(fd)){out.write(b);out.flush();Os.fsync(fd);StructStat s=Os.fstat(fd);CameraProofFrame.require(s.st_size==b.length&&s.st_nlink==1,"CAMERA_WRITE_CHANGED");}
      CameraProofFrame.require(Arrays.equals(readFile(f,b.length),b),"CAMERA_WRITE_HASH");
    }catch(ErrnoException e){throw error(e);}
  }
  @Override public void publish(File staged,File destination)throws IOException{
    StructStat s=regular(staged);CameraProofFrame.require(s!=null&&regular(destination)==null&&staged.getParentFile().equals(destination.getParentFile()),"CAMERA_PUBLISH_PATH");
    try{
      // link is exclusive, unlike rename-overwrite. A crash between link/unlink leaves
      // a visible two-link residue that refuses readiness, never an overwritten file.
      Os.link(staged.getPath(),destination.getPath());StructStat a=Os.lstat(staged.getPath()),b=Os.lstat(destination.getPath());
      CameraProofFrame.require(a.st_ino==s.st_ino&&b.st_ino==s.st_ino&&a.st_dev==s.st_dev&&b.st_dev==s.st_dev&&a.st_nlink==2&&b.st_nlink==2,"CAMERA_PUBLISH_SUBSTITUTION");
      Os.remove(staged.getPath());syncDirectory(destination.getParentFile());
      StructStat done=regular(destination);CameraProofFrame.require(done!=null&&s.st_dev==done.st_dev&&s.st_ino==done.st_ino&&s.st_size==done.st_size&&s.st_mtime==done.st_mtime,"CAMERA_PUBLISH_CHANGED");
    }catch(ErrnoException e){throw error(e);}
  }
  private void syncDirectory(File dir)throws ErrnoException,IOException{
    directory(dir);StructStat before=stat(dir);
    FileDescriptor fd=Os.open(dir.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_CLOEXEC,0);
    try{StructStat opened=Os.fstat(fd);CameraProofFrame.require(OsConstants.S_ISDIR(opened.st_mode)&&opened.st_dev==before.st_dev&&opened.st_ino==before.st_ino,"CAMERA_DIRECTORY_SUBSTITUTION");Os.fsync(fd);}finally{Os.close(fd);}
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
    }catch(ErrnoException e){throw error(e);}
  }
  @Override public long available(File root)throws IOException{directory(root);return root.getUsableSpace();}
  public static final class Capture {public final byte[] bytes;public final long observedSdkBytes;Capture(byte[] b,long n){bytes=b;observedSdkBytes=n;}}
  public Set<String> existingCameraLeaves(Context context)throws IOException{
    File cache=context.getCacheDir().getCanonicalFile();directory(cache);File camera=new File(cache,"Camera");
    if(stat(camera)==null)return Collections.emptySet();directory(camera);List<String> names=list(camera);CameraProofFrame.require(names.size()<=2000,"CAMERA_SDK_FILE_COUNT");
    for(String name:names)CameraProofFrame.require(size(new File(camera,name))>=0,"CAMERA_SDK_CHANGED");
    return Collections.unmodifiableSet(new HashSet<>(names));
  }
  public Capture capture(Context context,String uri,Set<String> before,java.util.function.BiConsumer<String,Object> observe)throws IOException{
    File lexical=new File(context.getCacheDir(),"Camera"),canonical=new File(context.getCacheDir().getCanonicalFile(),"Camera");
    String leaf=CameraProofFrame.freshCameraLeaf(uri,lexical.getAbsolutePath(),before);directory(canonical);File f=new File(canonical,leaf);
    List<String> names=list(canonical);CameraProofFrame.require(names.size()<=2000,"CAMERA_SDK_FILE_COUNT");
    long observed=0;for(String n:names){long size=size(new File(canonical,n));CameraProofFrame.require(size>=0,"CAMERA_SDK_CHANGED");observed=Math.addExact(observed,size);observe.accept("sdkObservedCacheBytes",observed);}
    StructStat candidate=regular(f);CameraProofFrame.require(candidate!=null,"CAMERA_SDK_OUTPUT_MISSING");
    observe.accept("sdkCandidateBytes",candidate.st_size);observe.accept("sdkCandidateDevice",Long.toString(candidate.st_dev));observe.accept("sdkCandidateInode",Long.toString(candidate.st_ino));observe.accept("sdkCandidateMtimeSeconds",candidate.st_mtim.tv_sec);observe.accept("sdkCandidateMtimeNanos",candidate.st_mtim.tv_nsec);observe.accept("sdkObservationComplete",true);
    CameraProofFrame.inputSize(candidate.st_size);
    byte[] bytes=readFile(f,CameraProofFrame.JPEG_LIMIT);observe.accept("sdkOpenedIdentityValidated",true);
    return new Capture(bytes,observed);
  }
}

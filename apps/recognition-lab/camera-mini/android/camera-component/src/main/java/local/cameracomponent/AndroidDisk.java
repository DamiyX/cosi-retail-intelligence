package local.cameracomponent;
import android.content.Context;
import android.system.*;
import java.io.*;
import java.nio.channels.*;
import java.util.*;
/** Existing S00/S01/S02 read-only, fixed S03 writable; ONE process lock. */
public final class AndroidDisk implements Evidence.Disk,AutoCloseable {
 private final File root;private final FileOutputStream lockFile;private final FileLock lock;
 private final File diagnosticRoot,priorSuccessRoot,trialRoot;private final boolean diagnosticView,writable;
 private AndroidDisk(File selectedRoot,boolean canWrite){root=selectedRoot;diagnosticRoot=root;priorSuccessRoot=root;trialRoot=root;diagnosticView=true;writable=canWrite;lockFile=null;lock=null;}
 Evidence.Disk diagnostic(){return new AndroidDisk(diagnosticRoot,false);}
 Evidence.Disk retainedSuccess(){return new AndroidDisk(priorSuccessRoot,false);}
 Evidence.Disk trial(){return new AndroidDisk(trialRoot,true);}
 public AndroidDisk(Context context)throws Exception {
  File parent=context.getFilesDir().getCanonicalFile();root=new File(parent,"camera-component-standalone-v1");diagnosticRoot=new File(parent,"camera-component-standalone-s01-v1");priorSuccessRoot=new File(parent,"camera-component-standalone-s02-v1");trialRoot=new File(parent,"camera-component-standalone-s03-v1");diagnosticView=false;writable=false;
  checkDir();File owner=new File(root,"owner.lock");StructStat before=Os.lstat(owner.getPath());if(!OsConstants.S_ISREG(before.st_mode)||before.st_nlink!=1||before.st_uid!=android.os.Process.myUid()||before.st_size!=0)throw new IOException("LOCK");
  lockFile=new FileOutputStream(Os.open(owner.getPath(),OsConstants.O_WRONLY|OsConstants.O_NOFOLLOW,0));FileLock held;
  try{StructStat actual=Os.fstat(lockFile.getFD());if(before.st_dev!=actual.st_dev||before.st_ino!=actual.st_ino||actual.st_nlink!=1||actual.st_uid!=android.os.Process.myUid()||actual.st_size!=0||!OsConstants.S_ISREG(actual.st_mode))throw new IOException("LOCK_CHANGED");held=lockFile.getChannel().tryLock();if(held==null)throw new IOException("BUSY");}catch(Exception e){lockFile.close();throw e;}lock=held;
 }
 private void checkDir()throws Exception {StructStat s=Os.lstat(root.getPath());if(!root.equals(root.getCanonicalFile())||!OsConstants.S_ISDIR(s.st_mode)||s.st_uid!=android.os.Process.myUid())throw new IOException("ROOT");}
 private static void sync(File f)throws Exception {java.io.FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW,0);try{if(!OsConstants.S_ISDIR(Os.fstat(fd).st_mode))throw new IOException("DIRECTORY");Os.fsync(fd);}finally{Os.close(fd);}}
 private File leaf(String n)throws Exception {checkDir();if(!Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt","export-attempt","export-result","failure").contains(n))throw new IOException("NAME");return new File(root,n);}
 private boolean exists()throws Exception{try{Os.lstat(root.getPath());return true;}catch(ErrnoException e){if(e.errno==OsConstants.ENOENT)return false;throw e;}}
 public Set<String> names()throws Exception {
  if(diagnosticView&&!exists())return Collections.emptySet();checkDir();String[] names=root.list();if(names==null||names.length>16)throw new IOException("LIST");Set<String> s=new HashSet<>(Arrays.asList(names));
  if(!diagnosticView){StructStat k=Os.lstat(new File(root,"owner.lock").getPath());if(!OsConstants.S_ISREG(k.st_mode)||k.st_nlink!=1||k.st_uid!=android.os.Process.myUid()||k.st_size!=0)throw new IOException("LOCK");s.remove("owner.lock");}
  for(String n:s){int max=FixedSlots.limit(n);StructStat f=Os.lstat(new File(root,n).getPath());if(!OsConstants.S_ISREG(f.st_mode)||f.st_nlink!=1||f.st_uid!=android.os.Process.myUid()||f.st_size<1||f.st_size>max)throw new IOException("INVENTORY");}return s;
 }
 public byte[] read(String n,int max)throws Exception {
  File f=leaf(n);java.io.FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
  try(FileInputStream in=new FileInputStream(fd)){StructStat s=Os.fstat(fd);if(!OsConstants.S_ISREG(s.st_mode)||s.st_nlink!=1||s.st_uid!=android.os.Process.myUid()||s.st_size<1||s.st_size>max)throw new IOException("FILE");byte[] b=new byte[(int)s.st_size];int at=0;while(at<b.length){int k=in.read(b,at,b.length-at);if(k<0)throw new IOException("SHORT");at+=k;}if(in.read()!=-1)throw new IOException("LONG");return b;}
 }
 public void publish(String n,byte[] b)throws Exception {
  if(!writable)throw new Failure(Failure.Code.CONSUMED,"retained-read-only");
  Failure.require(b.length>0&&b.length<=FixedSlots.limit(n),Failure.Code.OVERSIZE,"leaf-size");if(!exists()){if(!n.equals("intent")||!root.mkdir())throw new IOException("ROOT");sync(root.getParentFile());}
  File f=leaf(n);File tmp=new File(root,n+".new");
  java.io.FileDescriptor fd=Os.open(tmp.getPath(),OsConstants.O_WRONLY|OsConstants.O_CREAT|OsConstants.O_EXCL|OsConstants.O_NOFOLLOW,0600);
  try(FileOutputStream out=new FileOutputStream(fd)){out.write(b);out.flush();out.getFD().sync();}
  StructStat s=Os.lstat(root.getPath());try{System.loadLibrary("mini_publish");}catch(LinkageError error){throw new Failure(Failure.Code.STORAGE,"native-loader","LOAD_UNAVAILABLE");}int result=publishNative(root.getPath(),tmp.getName(),f.getName(),s.st_dev,s.st_ino,android.os.Process.myUid());if(result!=0)throw new Failure(Failure.Code.STORAGE,"native-publication","ERRNO_"+result);
 }
 public long free(){return root.getParentFile().getUsableSpace();}
 public void close()throws IOException{if(lock!=null){lock.release();lockFile.close();}}
 private static native int publishNative(String root,String from,String to,long device,long inode,int uid);
}

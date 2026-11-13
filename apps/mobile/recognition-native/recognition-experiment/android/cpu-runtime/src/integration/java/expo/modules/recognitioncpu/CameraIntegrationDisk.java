package expo.modules.recognitioncpu;
import local.cameracomponent.*;
import android.content.Context;
import android.system.*;
import java.io.*;
import java.nio.channels.*;
import java.util.*;
/** Fixed I05 writer; I00/I01/I02/I03/I04 are bounded read-only metadata, charged within the same64MiB. */
public final class CameraIntegrationDisk implements Evidence.Disk,AutoCloseable {
 private final File retainedRoot,retainedI01Root,retainedI02Root,retainedI03Root,retainedI04Root,retainedI05Root,retainedI06Root,retainedI07Root,retainedI08Root,retainedI09Root;private Map<String,String> retainedIdentity;private long retainedBytes;
 private final File root;private final FileOutputStream lockFile;private final FileLock lock;
 public CameraIntegrationDisk(Context context)throws Exception {
  String slot=CameraBatchSlots.selected(context);
  File parent=context.getFilesDir().getCanonicalFile();retainedRoot=new File(parent,"camera-component-integration-v1");retainedI01Root=new File(parent,"camera-component-integration-i01-v1");retainedI02Root=new File(parent,"camera-component-integration-i02-v1");retainedI03Root=new File(parent,"camera-component-integration-i03-v1");retainedI04Root=new File(parent,"camera-component-integration-i04-v1");retainedI05Root=new File(parent,"camera-component-integration-i05-v1");retainedI06Root=new File(parent,"camera-component-integration-i06-v1");retainedI07Root=new File(parent,"camera-component-integration-i07-v1");retainedI08Root=new File(parent,"camera-component-integration-i08-v1");retainedI09Root=new File(parent,"camera-component-integration-i09-v1");retainedIdentity=scanRetained();RetainedI00Policy.admit(retainedBytes);root=new File(parent,"camera-component-integration-"+slot.toLowerCase(java.util.Locale.ROOT)+"-v1");
  try{Os.lstat(root.getPath());}catch(ErrnoException e){if(e.errno!=OsConstants.ENOENT)throw e;if(!root.mkdir())throw new IOException("ROOT_CREATE");sync(parent);}checkDir();File f=new File(root,"owner.lock");
  try{Os.close(Os.open(f.getPath(),OsConstants.O_WRONLY|OsConstants.O_CREAT|OsConstants.O_EXCL|OsConstants.O_NOFOLLOW,0600));sync(root);}catch(ErrnoException e){if(e.errno!=OsConstants.EEXIST)throw e;}
  StructStat before=Os.lstat(f.getPath());if(!OsConstants.S_ISREG(before.st_mode)||before.st_nlink!=1||before.st_uid!=android.os.Process.myUid()||before.st_size!=0)throw new IOException("LOCK");
  lockFile=new FileOutputStream(Os.open(f.getPath(),OsConstants.O_WRONLY|OsConstants.O_NOFOLLOW,0));FileLock held;
  try{StructStat actual=Os.fstat(lockFile.getFD());if(before.st_dev!=actual.st_dev||before.st_ino!=actual.st_ino||!OsConstants.S_ISREG(actual.st_mode)||actual.st_nlink!=1||actual.st_uid!=android.os.Process.myUid()||actual.st_size!=0)throw new IOException("LOCK_CHANGED");held=lockFile.getChannel().tryLock();if(held==null)throw new IOException("BUSY");}catch(Exception e){lockFile.close();throw e;}lock=held;
 }
 private static String identity(StructStat s){return s.st_dev+":"+s.st_ino+":"+s.st_mode+":"+s.st_uid+":"+s.st_nlink+":"+s.st_size+":"+s.st_mtim.tv_sec+":"+s.st_mtim.tv_nsec+":"+s.st_ctim.tv_sec+":"+s.st_ctim.tv_nsec;}
 private Map<String,String> scanRetained()throws Exception{
  Map<String,String> all=new TreeMap<>();Map<String,String> a=scanRoot(retainedRoot,0);long first=retainedBytes;
  Map<String,String> b=scanRoot(retainedI01Root,1);long second=retainedBytes;Map<String,String> c=scanRoot(retainedI02Root,2);long third=retainedBytes;Map<String,String> d=scanRoot(retainedI03Root,3);long fourth=retainedBytes;Map<String,String> e=scanRoot(retainedI04Root,4);long fifth=retainedBytes;Map<String,String> f=scanRoot(retainedI05Root,5);long sixth=retainedBytes;
  for(Map.Entry<String,String> x:a.entrySet())all.put("I00/"+x.getKey(),x.getValue());
  for(Map.Entry<String,String> x:b.entrySet())all.put("I01/"+x.getKey(),x.getValue());
  for(Map.Entry<String,String> x:c.entrySet())all.put("I02/"+x.getKey(),x.getValue());
  for(Map.Entry<String,String> x:d.entrySet())all.put("I03/"+x.getKey(),x.getValue());
  for(Map.Entry<String,String> x:e.entrySet())all.put("I04/"+x.getKey(),x.getValue());
  for(Map.Entry<String,String> x:f.entrySet())all.put("I05/"+x.getKey(),x.getValue());
  long batchBytes=0;Map<String,String> batch6=scanRoot(retainedI06Root,6);batchBytes+=retainedBytes+RetainedI00Policy.I06_OUTPUT_BYTES;for(Map.Entry<String,String> x:batch6.entrySet())all.put("I06/"+x.getKey(),x.getValue());Map<String,String> batch7=scanRoot(retainedI07Root,7);batchBytes+=retainedBytes+RetainedI00Policy.I07_OUTPUT_BYTES;for(Map.Entry<String,String> x:batch7.entrySet())all.put("I07/"+x.getKey(),x.getValue());Map<String,String> batch8=scanRoot(retainedI08Root,8);batchBytes+=retainedBytes+RetainedI00Policy.I08_OUTPUT_BYTES;for(Map.Entry<String,String> x:batch8.entrySet())all.put("I08/"+x.getKey(),x.getValue());Map<String,String> batch9=scanRoot(retainedI09Root,9);batchBytes+=retainedBytes+RetainedI00Policy.I09_OUTPUT_BYTES;for(Map.Entry<String,String> x:batch9.entrySet())all.put("I09/"+x.getKey(),x.getValue());
  retainedBytes=first+second+third+fourth+fifth+sixth+batchBytes+RetainedI00Policy.I05_OUTPUT_BYTES+RetainedI00Policy.I01_OUTPUT_BYTES+RetainedI00Policy.I02_OUTPUT_BYTES+RetainedI00Policy.I03_OUTPUT_BYTES+RetainedI00Policy.I04_OUTPUT_BYTES;RetainedI00Policy.admit(retainedBytes);return all;
 }
 private Map<String,String> scanRoot(File retainedRoot,int previousAttempt)throws Exception{
  StructStat dir=Os.lstat(retainedRoot.getPath());if(!retainedRoot.equals(retainedRoot.getCanonicalFile())||!OsConstants.S_ISDIR(dir.st_mode)||dir.st_uid!=android.os.Process.myUid())throw new IOException("I00_ROOT");
  java.io.FileDescriptor d=Os.open(retainedRoot.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
  try{if(!identity(Os.fstat(d)).equals(identity(dir)))throw new IOException("I00_ROOT_CHANGED");String[] names=retainedRoot.list();if(names==null||names.length>25)throw new IOException("I00_LIST");Map<String,Long> lengths=new TreeMap<>();Map<String,String> result=new TreeMap<>();result.put("@root",identity(dir));
   for(String n:names){if(n.indexOf('/')>=0)throw new IOException("I00_NAME");if(!n.equals("owner.lock"))RetainedI00Policy.limit(n.endsWith(".new")?n.substring(0,n.length()-4):n);File f=new File(retainedRoot,n);StructStat before=Os.lstat(f.getPath());java.io.FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);try{StructStat actual=Os.fstat(fd);if(!OsConstants.S_ISREG(actual.st_mode)||actual.st_uid!=android.os.Process.myUid()||actual.st_nlink!=1||!identity(actual).equals(identity(before))||!identity(actual).equals(identity(Os.lstat(f.getPath()))))throw new IOException("I00_FILE_CHANGED");lengths.put(n,actual.st_size);result.put(n,identity(actual));}finally{Os.close(fd);}}
   long bytes=previousAttempt==9?RetainedI00Policy.retainedI09(lengths):previousAttempt==8?RetainedI00Policy.retainedI08(lengths):previousAttempt==7?RetainedI00Policy.retainedI07(lengths):previousAttempt==6?RetainedI00Policy.retainedI06(lengths):previousAttempt==5?RetainedI00Policy.retainedI05(lengths):previousAttempt==4?RetainedI00Policy.retainedI04(lengths):previousAttempt==3?RetainedI00Policy.retainedI03(lengths):previousAttempt==2?RetainedI00Policy.retainedI02(lengths):(previousAttempt==1?RetainedI00Policy.retainedI01(lengths):RetainedI00Policy.retained(lengths));String[] after=retainedRoot.list();if(after==null||!new HashSet<>(Arrays.asList(names)).equals(new HashSet<>(Arrays.asList(after)))||!identity(dir).equals(identity(Os.lstat(retainedRoot.getPath())))||!identity(dir).equals(identity(Os.fstat(d))))throw new IOException("I00_INVENTORY_CHANGED");retainedBytes=bytes;return result;
  }finally{Os.close(d);}
 }
 private void verifyBatch()throws Exception{
  File parent=root.getParentFile();for(String id:Arrays.asList("i06","i07","i08","i09")){
   File dir=new File(parent,"camera-component-integration-"+id+"-v1");StructStat before;
   try{before=Os.lstat(dir.getPath());}catch(ErrnoException e){if(e.errno==OsConstants.ENOENT)continue;throw e;}
   if(!dir.equals(dir.getCanonicalFile())||!OsConstants.S_ISDIR(before.st_mode)||before.st_uid!=android.os.Process.myUid())throw new IOException("B_ROOT");
   String[] entries=dir.list();if(entries==null||entries.length>16)throw new IOException("B_LIST");long bytes=0;
   for(String name:entries){File f=new File(dir,name);if(name.endsWith(".new"))throw new IOException("B_UNCONFIRMED_STAGE");int max=name.equals("owner.lock")?0:limit(name);StructStat a=Os.lstat(f.getPath());java.io.FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
    try{StructStat b=Os.fstat(fd);if(!identity(a).equals(identity(b))||!identity(b).equals(identity(Os.lstat(f.getPath())))||!OsConstants.S_ISREG(b.st_mode)||b.st_uid!=android.os.Process.myUid()||b.st_nlink!=1||b.st_size<0||b.st_size>max)throw new IOException("B_INVENTORY_CHANGED");bytes+=b.st_size;}finally{Os.close(fd);}
   }
   String[] after=dir.list();if(after==null||!new HashSet<>(Arrays.asList(entries)).equals(new HashSet<>(Arrays.asList(after)))||!identity(before).equals(identity(Os.lstat(dir.getPath())))||bytes>25L*1024*1024)throw new IOException("B_RESERVATION");
  }
 }
 private void verifyRetained()throws Exception{verifyBatch();if(!retainedIdentity.equals(scanRetained()))throw new IOException("I00_METADATA_CHANGED");RetainedI00Policy.admit(retainedBytes);}
 public String retainedSummary()throws Exception{verifyRetained();return "I00 + completed I01-I09 read-only metadata; charged bytes including spent I01/I02/I03/I04 outputs="+retainedBytes+"; entries="+retainedIdentity.keySet()+"; IC01 reservation="+RetainedI00Policy.RESERVATION+"; aggregate cap="+RetainedI00Policy.CAP+"; content hashes unavailable";}
 public String retentionBinding()throws Exception{verifyRetained();return "retainedI00MetadataSha256="+Evidence.hash(retainedIdentity.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8))+"|retainedI00Bytes="+retainedBytes+"|IC01Reservation="+RetainedI00Policy.RESERVATION+"|integratedCap="+RetainedI00Policy.CAP;}
 public long retainedBytes()throws Exception{verifyRetained();return retainedBytes;}
 public static int limit(String n)throws Failure{switch(n){case "cpu-intent":return 1;case "cpu-receipt":return 1024;case "tensor.f32le":return 602112;case "cpu-result":return 65536;default:return FixedSlots.limit(n);}}
 private void checkDir()throws Exception {StructStat s=Os.lstat(root.getPath());if(!root.equals(root.getCanonicalFile())||!OsConstants.S_ISDIR(s.st_mode)||s.st_uid!=android.os.Process.myUid())throw new IOException("ROOT");}
 private static void sync(File f)throws Exception {java.io.FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW,0);try{if(!OsConstants.S_ISDIR(Os.fstat(fd).st_mode))throw new IOException("DIRECTORY");Os.fsync(fd);}finally{Os.close(fd);}}
 private File leaf(String n)throws Exception {checkDir();if(!Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt","export-attempt","export-result","failure","cpu-intent","tensor.f32le","cpu-result","cpu-receipt").contains(n))throw new IOException("NAME");return new File(root,n);}
 private boolean exists()throws Exception{try{Os.lstat(root.getPath());return true;}catch(ErrnoException e){if(e.errno==OsConstants.ENOENT)return false;throw e;}}
 public Set<String> names()throws Exception {
  verifyRetained();checkDir();String[] names=root.list();if(names==null||names.length>16)throw new IOException("LIST");Set<String> s=new HashSet<>(Arrays.asList(names));
  {StructStat k=Os.lstat(new File(root,"owner.lock").getPath());if(!OsConstants.S_ISREG(k.st_mode)||k.st_nlink!=1||k.st_uid!=android.os.Process.myUid()||k.st_size!=0)throw new IOException("LOCK");s.remove("owner.lock");}
  for(String n:s){int max=limit(n);StructStat f=Os.lstat(new File(root,n).getPath());if(!OsConstants.S_ISREG(f.st_mode)||f.st_nlink!=1||f.st_uid!=android.os.Process.myUid()||f.st_size<1||f.st_size>max)throw new IOException("INVENTORY");}return s;
 }
 public byte[] read(String n,int max)throws Exception {
  File f=leaf(n);java.io.FileDescriptor fd=Os.open(f.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
  try(FileInputStream in=new FileInputStream(fd)){StructStat s=Os.fstat(fd);if(!OsConstants.S_ISREG(s.st_mode)||s.st_nlink!=1||s.st_uid!=android.os.Process.myUid()||s.st_size<1||s.st_size>max)throw new IOException("FILE");byte[] b=new byte[(int)s.st_size];int at=0;while(at<b.length){int k=in.read(b,at,b.length-at);if(k<0)throw new IOException("SHORT");at+=k;}if(in.read()!=-1)throw new IOException("LONG");return b;}
 }
 public void publish(String n,byte[] b)throws Exception {
  Failure.require(b.length>0&&b.length<=limit(n),Failure.Code.OVERSIZE,"leaf-size");long used=0;Set<String> current=names();if(current.contains(n))throw new Failure(Failure.Code.CONSUMED,"no-replace");for(String name:current)used+=read(name,limit(name)).length;
  verifyRetained();RetainedI00Policy.publish(retainedBytes,used,b.length);if(free()<Evidence.FREE_FLOOR+RetainedI00Policy.RESERVATION)throw new Failure(Failure.Code.QUOTA,"IC01-remaining-reservation");if(free()<Evidence.FREE_FLOOR+b.length+8192)throw new Failure(Failure.Code.QUOTA,"integration-space");
  File f=leaf(n);File tmp=new File(root,n+".new");
  java.io.FileDescriptor fd=Os.open(tmp.getPath(),OsConstants.O_WRONLY|OsConstants.O_CREAT|OsConstants.O_EXCL|OsConstants.O_NOFOLLOW,0600);
  try(FileOutputStream out=new FileOutputStream(fd)){out.write(b);out.flush();out.getFD().sync();}
  StructStat parent=Os.lstat(root.getPath()),file=Os.lstat(tmp.getPath());CameraProofRename.publish(root.getPath(),tmp.getName(),f.getName(),new long[]{parent.st_dev,parent.st_ino,file.st_dev,file.st_ino,file.st_size,file.st_mtim.tv_sec,file.st_mtim.tv_nsec,file.st_ctim.tv_sec,file.st_ctim.tv_nsec});
  verifyRetained();if(!Arrays.equals(read(n,limit(n)),b))throw new IOException("READBACK");
 }
 CameraIntegrationNamespace observe()throws Exception{return CameraIntegrationNamespace.observe(new CameraIntegrationNamespace.Store(){public Set<String> names()throws Exception{return CameraIntegrationDisk.this.names();}public long bytes(String n)throws Exception{return read(n,limit(n)).length;}});}
 public long free(){return root.getParentFile().getUsableSpace();}
 public void close()throws IOException{if(lock!=null){lock.release();lockFile.close();}}
}

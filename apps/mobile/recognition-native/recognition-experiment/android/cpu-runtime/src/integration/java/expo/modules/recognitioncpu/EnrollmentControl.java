package expo.modules.recognitioncpu;
import android.system.*;
import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Fixed descriptor/report leaves only. Failed stages consume their identity permanently. */
public final class EnrollmentControl implements EnrollmentDescriptor.Disk {
 public static final int MAX_REPORTS=8;
 public static final long RESERVE=12648448L;
 public interface Quota {void check(long logicalExtra,long physicalPending)throws Exception;void physical(long pending)throws Exception;}
 private final File parent,root;private final Quota quota;
 private volatile String source="";
 public EnrollmentControl(File parent,Quota quota){this.parent=parent;root=new File(parent,EnrollmentRootRegistry.CONTROL);this.quota=quota;}
 void bindSource(String value){ObservedEnrollment.digest(value);ObservedEnrollment.require(source.isEmpty()||source.equals(value),"CONTROL_SOURCE_CHANGED");source=value;}
 public static String slot(int n){ObservedEnrollment.require(n>=1&&n<=MAX_REPORTS,"REPORT_NUMBER");return "R0"+n;}
 private static boolean missing(ErrnoException e){return e.errno==OsConstants.ENOENT;}
 private StructStat stat(File f)throws Exception{try{return Os.lstat(f.getPath());}catch(ErrnoException e){if(missing(e))return null;throw e;}}
 private static String key(StructStat s){return s.st_dev+":"+s.st_ino+":"+s.st_mode+":"+s.st_uid;}
 private java.io.FileDescriptor open(boolean create)throws Exception{
  ObservedEnrollment.require(parent.equals(parent.getCanonicalFile()),"CONTROL_PARENT_ALIAS");StructStat s=stat(root);
  if(s==null){ObservedEnrollment.require(create,"CONTROL_ABSENT");ObservedEnrollment.require(root.mkdir(),"CONTROL_ROOT_CREATE");EnrollmentDisk.sync(parent);s=Os.lstat(root.getPath());}
  ObservedEnrollment.require(root.equals(root.getCanonicalFile())&&OsConstants.S_ISDIR(s.st_mode)&&s.st_uid==android.os.Process.myUid(),"CONTROL_ROOT");java.io.FileDescriptor fd=Os.open(root.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
  try{ObservedEnrollment.require(key(s).equals(key(Os.fstat(fd))),"CONTROL_ROOT_CHANGED");return fd;}catch(Exception e){Os.close(fd);throw e;}
 }
 public byte[] read(String name)throws Exception{
  long max=EnrollmentRootRegistry.limit(EnrollmentRootRegistry.root(EnrollmentRootRegistry.CONTROL),name);if(stat(root)==null)return null;
  java.io.FileDescriptor directory=open(false);try{File file=new File(root,name);StructStat before=stat(file);if(before==null)return null;java.io.FileDescriptor fd=Os.open(file.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
   try(FileInputStream in=new FileInputStream(fd)){StructStat actual=Os.fstat(fd);EnrollmentDisk.regular(actual,max);ObservedEnrollment.require(EnrollmentDisk.identity(before).equals(EnrollmentDisk.identity(actual)),"CONTROL_FILE_CHANGED");byte[] b=new byte[(int)actual.st_size];new DataInputStream(in).readFully(b);ObservedEnrollment.require(in.read()==-1&&EnrollmentDisk.identity(actual).equals(EnrollmentDisk.identity(Os.fstat(fd)))&&EnrollmentDisk.identity(actual).equals(EnrollmentDisk.identity(Os.lstat(file.getPath()))),"CONTROL_READ_CHANGED");ObservedEnrollment.require(key(Os.fstat(directory)).equals(key(Os.lstat(root.getPath()))),"CONTROL_ROOT_CHANGED");return b;}
  }finally{Os.close(directory);}
 }
 public Set<String> names()throws Exception{
  if(stat(root)==null)return Collections.emptySet();java.io.FileDescriptor fd=open(false);try{Set<String> result=new TreeSet<>();StructStat before=Os.fstat(fd);try(DirectoryStream<Path> stream=Files.newDirectoryStream(root.toPath())){for(Path p:stream){ObservedEnrollment.require(result.size()<64,"CONTROL_COUNT");String name=p.getFileName().toString();EnrollmentRootRegistry.limit(EnrollmentRootRegistry.root(EnrollmentRootRegistry.CONTROL),name);StructStat s=Os.lstat(p.toString());EnrollmentDisk.regular(s,EnrollmentRootRegistry.limit(EnrollmentRootRegistry.root(EnrollmentRootRegistry.CONTROL),name));result.add(name);}}ObservedEnrollment.require(EnrollmentDisk.identity(before).equals(EnrollmentDisk.identity(Os.fstat(fd)))&&EnrollmentDisk.identity(before).equals(EnrollmentDisk.identity(Os.lstat(root.getPath()))),"CONTROL_INVENTORY_CHANGED");return result;}finally{Os.close(fd);}
 }
 public void publish(String name,byte[] bytes,boolean reserved)throws Exception{publish(name,bytes,reserved,()->{});}
 public void publish(String name,byte[] bytes,boolean reserved,Runnable live)throws Exception{
  long max=EnrollmentRootRegistry.limit(EnrollmentRootRegistry.root(EnrollmentRootRegistry.CONTROL),name);ObservedEnrollment.require(bytes!=null&&bytes.length>0&&bytes.length<=max,"CONTROL_BYTES");if(reserved)ObservedEnrollment.require(names().contains(name.substring(0,3)+".intent"),"NO_REPORT_RESERVATION");quota.check(reserved||name.matches("R0[6-8]\\.intent")?0:bytes.length,bytes.length);java.io.FileDescriptor directory=open(true);
  try{File file=new File(root,name),stage=new File(root,name+".new");ObservedEnrollment.require(stat(file)==null&&stat(stage)==null,"CONTROL_ID_CONSUMED");long controls=0;if(!name.endsWith(".bin")&&!name.equals("session")){for(String leaf:names())if(leaf.startsWith(name.substring(0,3))&&!leaf.endsWith(".bin")&&!leaf.endsWith(".bin.new"))controls=Math.addExact(controls,Os.lstat(new File(root,leaf).getPath()).st_size);ObservedEnrollment.require(controls<=65536-bytes.length,"CONTROL_SLOT_BYTES");}
   quota.physical(bytes.length);live.run();java.io.FileDescriptor fd=Os.open(stage.getPath(),OsConstants.O_WRONLY|OsConstants.O_CREAT|OsConstants.O_EXCL|OsConstants.O_NOFOLLOW,0600);try(FileOutputStream out=new FileOutputStream(fd)){for(int at=0;at<bytes.length;){live.run();quota.physical(bytes.length-at);live.run();int count=Math.min(65536,bytes.length-at);out.write(bytes,at,count);at+=count;}out.flush();Os.fsync(fd);quota.physical(0);EnrollmentDisk.regular(Os.fstat(fd),max);}
   StructStat r=Os.fstat(directory),f=Os.lstat(stage.getPath());live.run();quota.physical(0);live.run();CameraProofRename.publish(root.getPath(),stage.getName(),file.getName(),new long[]{r.st_dev,r.st_ino,f.st_dev,f.st_ino,f.st_size,f.st_mtim.tv_sec,f.st_mtim.tv_nsec,f.st_ctim.tv_sec,f.st_ctim.tv_nsec});ObservedEnrollment.require(Arrays.equals(bytes,read(name)),"CONTROL_PUBLISH_READBACK");
  }finally{Os.close(directory);}
 }
 @Override public byte[] descriptor()throws Exception{ObservedEnrollment.require(!names().contains("session.new"),"SESSION_PUBLICATION_UNCERTAIN");byte[] bytes=read("session");if(bytes!=null)EnrollmentDescriptor.read(bytes);return bytes;}
 @Override public void publishDescriptor(byte[] bytes)throws Exception{EnrollmentDescriptor.read(bytes);publish("session",bytes,false);}
 /** Read-only bounded private cut. No owner acquisition, accounting, sync, public descriptor or publication. */
 private EnrollmentReportDecision.Cut cut(int number)throws Exception{
  String slot=slot(number);if(stat(root)==null)return new EnrollmentReportDecision.Cut("ABSENT",Collections.emptySet());
  java.io.FileDescriptor fd=open(false);try{StructStat first=Os.fstat(fd);Set<String> names=names();StringBuilder token=new StringBuilder(EnrollmentDisk.identity(first));
   for(String leaf:names){token.append('|').append(leaf);if(leaf.equals("session")||leaf.equals("session.new")||leaf.startsWith(slot+".")){StructStat s=Os.lstat(new File(root,leaf).getPath());EnrollmentDisk.regular(s,EnrollmentRootRegistry.limit(EnrollmentRootRegistry.root(EnrollmentRootRegistry.CONTROL),leaf));token.append('=').append(EnrollmentDisk.identity(s));}}
   ObservedEnrollment.require(EnrollmentDisk.identity(first).equals(EnrollmentDisk.identity(Os.fstat(fd)))&&EnrollmentDisk.identity(first).equals(EnrollmentDisk.identity(Os.lstat(root.getPath())))&&names.equals(names()),"REPORT_CUT_CHANGED");return new EnrollmentReportDecision.Cut(token.toString(),names);
  }finally{Os.close(fd);}
 }
 public EnrollmentReportDecision decision(int number,String implementation,String session){
  return EnrollmentReportDecision.observe(new EnrollmentReportDecision.Disk(){public EnrollmentReportDecision.Cut cut(int n)throws Exception{return EnrollmentControl.this.cut(n);}public byte[] read(String leaf)throws Exception{return EnrollmentControl.this.read(leaf);}},()->EnrollmentReportTransfer.observation(implementation,number,session),implementation,number,session);
 }
 /** Reservations replace materialized bytes, including partial internal stages. No uncertain charge is refunded. */
 public long[] charges()throws Exception{
  Set<String> names=names();EnrollmentReadDiagnostic.shape(names);EnrollmentReadBinding.saved(EnrollmentReadAdapter.disk(this));long reserve=0,external=0;
  for(int i=1;i<=MAX_REPORTS;i++){
   String s=slot(i);EnrollmentReportRecords.shape(names,s);boolean consumed=names.contains(s+".intent")||names.contains(s+".intent.new");if(!consumed){if(i>=6){reserve=Math.addExact(reserve,EnrollmentEvidence.HARD+65536L);external=Math.addExact(external,2L*EnrollmentEvidence.HARD);}continue;}
   if(names.contains(s+".intent"))EnrollmentReportRecords.session(read(s+".intent"));
   long materialized=0,controls=0;for(String n:names)if(n.startsWith(s+".")){long length=Os.lstat(new File(root,n).getPath()).st_size;if(n.equals(s+".export-result")||n.equals(s+".export-result.new"))ObservedEnrollment.require(length<=EnrollmentTransferDiagnostic.MAX,"TRANSFER_DIAGNOSTIC_BOUND");if(n.equals(s+".bin")||n.equals(s+".bin.new"))materialized=Math.addExact(materialized,length);else controls=Math.addExact(controls,length);}
   ObservedEnrollment.require(materialized<=EnrollmentEvidence.HARD&&controls<=65536,"REPORT_CHARGES");
   byte[] result=read(s+".result");EnrollmentReportRecords.Prepared prepared=result==null?null:EnrollmentReportRecords.prepared(result);
   if(prepared!=null)ObservedEnrollment.require(prepared.length==materialized,"REPORT_RESULT_INTERNAL");
   byte[] exportIntent=read(s+".export-intent");if(exportIntent!=null)EnrollmentReportRecords.exportIntent(exportIntent,EnrollmentReportRecords.session(read(s+".intent")),prepared);
   byte[] destination=read(s+".destination");if(destination!=null)ObservedEnrollment.require(EnrollmentTransferPolicy.local(new String(destination,StandardCharsets.UTF_8),EnrollmentReportRecords.session(read(s+".intent")),i),"TRANSFER_DESTINATION_BINDING");
   Long download;
   if(i>=6&&names.contains(s+".intent")){EnrollmentReportDecision decision=decision(i,source,EnrollmentReportRecords.session(read(s+".intent")));ObservedEnrollment.require(decision.stableCut,"REPORT_RECONCILIATION_UNSTABLE");download=decision.download(prepared);}
   else download=EnrollmentReportRecords.download(read(s+".export-result"),prepared,destination!=null);
   long[] charge=EnrollmentReportBudget.slot(materialized,controls,prepared!=null,prepared==null?0:prepared.length,download);reserve=Math.addExact(reserve,charge[0]);external=Math.addExact(external,charge[1]);
  }return new long[]{reserve,external};
 }
}

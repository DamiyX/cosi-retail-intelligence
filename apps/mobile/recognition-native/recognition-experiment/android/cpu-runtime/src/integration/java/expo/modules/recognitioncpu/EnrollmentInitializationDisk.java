package expo.modules.recognitioncpu;
import android.system.*;
import android.content.Context;
import java.io.*;
import java.nio.file.*;
import java.util.*;
/** Read-only fixed roots, no root creation or owner-lock acquisition during observation. */
final class EnrollmentInitializationDisk implements EnrollmentInitialization.Disk {
 private final Context context;private final File parent;private final String source;private final Runnable live;
 private final Map<String,String> identities=new TreeMap<>();private long budget;private boolean skipJournalContents;
 EnrollmentInitializationDisk(Context context,String source,Runnable live)throws Exception{this.context=context;this.parent=new File(context.getApplicationInfo().dataDir,"files").getCanonicalFile();this.source=source;this.live=live;}
 private static StructStat stat(File file)throws Exception{try{return Os.lstat(file.getPath());}catch(ErrnoException e){if(e.errno==OsConstants.ENOENT)return null;throw e;}}
 private static String key(StructStat s){return s==null?"":EnrollmentDisk.identity(s);}
 private byte[] read(File dir,String name,long maximum)throws Exception{
  live.run();File file=new File(dir,name);StructStat before=stat(file);if(before==null)return null;if(before.st_size>maximum&&dir.getName().equals(EnrollmentRootRegistry.CONTROL))throw new EnrollmentInitialization.Refusal(name.equals("session.new")?"STAGE_OVERSIZED":"DESCRIPTOR_OVERSIZED");EnrollmentDisk.regular(before,maximum);budget=Math.addExact(budget,skipJournalContents?0:before.st_size);ObservedEnrollment.require(budget<=8388608,"RECONCILIATION_READ_BOUND");
  java.io.FileDescriptor fd=Os.open(file.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
  try(FileInputStream in=new FileInputStream(fd)){ObservedEnrollment.require(key(before).equals(key(Os.fstat(fd))),"RECONCILIATION_FILE_CHANGED");byte[] data=new byte[skipJournalContents?0:(int)before.st_size];if(!skipJournalContents)new DataInputStream(in).readFully(data);ObservedEnrollment.require((skipJournalContents||in.read()==-1)&&key(before).equals(key(Os.fstat(fd)))&&key(before).equals(key(stat(file))),"RECONCILIATION_READ_CHANGED");identities.put(dir.getName()+"/"+name,key(before));live.run();return data;}
 }
 private Map<String,byte[]> root(String name,boolean journal)throws Exception{
  File dir=new File(parent,name);StructStat before=stat(dir);Map<String,byte[]> values=new TreeMap<>();if(before==null){identities.put(name,"");return values;}
  ObservedEnrollment.require(dir.equals(dir.getCanonicalFile())&&OsConstants.S_ISDIR(before.st_mode)&&before.st_uid==android.os.Process.myUid(),"RECONCILIATION_ROOT");java.io.FileDescriptor held=Os.open(dir.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
  try{ObservedEnrollment.require(key(before).equals(key(Os.fstat(held))),"RECONCILIATION_ROOT_CHANGED");
   if(journal){try(DirectoryStream<Path> entries=Files.newDirectoryStream(dir.toPath())){int count=0;for(Path entry:entries){live.run();ObservedEnrollment.require(++count<=4097,"RECONCILIATION_JOURNAL_BOUND");String leaf=entry.getFileName().toString();if(leaf.equals("owner.lock")){read(dir,leaf,0);continue;}ObservedEnrollment.require(leaf.matches("event-[0-9]{4}(\\.new)?"),"RECONCILIATION_EVENT_NAME");values.put(leaf,read(dir,leaf,EnrollmentStore.EVENT_BYTES));}}}
   else{for(String leaf:Arrays.asList("session","session.new")){byte[] data=read(dir,leaf,EnrollmentDescriptor.LIMIT);if(data!=null)values.put(leaf,data);}}
   ObservedEnrollment.require(key(before).equals(key(Os.fstat(held)))&&key(before).equals(key(stat(dir))),"RECONCILIATION_ROOT_CHANGED");identities.put(name,key(before));return values;
  }finally{Os.close(held);}
 }
 private static Exception observationFailure(Exception e){
  if(e instanceof EnrollmentInitialization.Refusal)return e;
  if(e instanceof ErrnoException){int errno=((ErrnoException)e).errno;return new EnrollmentInitialization.Refusal(errno==OsConstants.EACCES||errno==OsConstants.EPERM?"ACCESS_DENIED":"IO_UNAVAILABLE");}
  if(e instanceof IOException)return new EnrollmentInitialization.Refusal("IO_UNAVAILABLE");
  if(Arrays.asList("INITIALIZATION_FOREGROUND","INITIALIZATION_OBSERVATION_EXPIRED").contains(e.getMessage()))return new EnrollmentInitialization.Refusal("OBSERVATION_CANCELLED");
  if(Arrays.asList("RECONCILIATION_FILE_CHANGED","RECONCILIATION_READ_CHANGED","RECONCILIATION_ROOT_CHANGED","RECONCILIATION_PARENT_CHANGED","RECONCILIATION_EVENT_CHANGED").contains(e.getMessage()))return new EnrollmentInitialization.Refusal("IDENTITY_CHANGED");
  if("RECONCILIATION_READ_BOUND".equals(e.getMessage()))return new EnrollmentInitialization.Refusal("READ_BOUND");return e;
 }
 public EnrollmentInitialization.View observe()throws Exception{try{return observation();}catch(Exception e){throw observationFailure(e);}}
 private EnrollmentInitialization.View observation()throws Exception{
  live.run();ObservedEnrollment.require(parent.equals(parent.getCanonicalFile()),"RECONCILIATION_PARENT_ALIAS");StructStat p=Os.lstat(parent.getPath());ObservedEnrollment.require(OsConstants.S_ISDIR(p.st_mode)&&p.st_uid==android.os.Process.myUid(),"RECONCILIATION_PARENT");identities.clear();budget=0;
  skipJournalContents=false;Map<String,byte[]> control=root(EnrollmentRootRegistry.CONTROL,false);skipJournalContents=true;Map<String,byte[]> journal;try{journal=root("observed-enrollment-ledger-v1",true);}finally{skipJournalContents=false;}ObservedEnrollment.require(key(p).equals(key(Os.lstat(parent.getPath()))),"RECONCILIATION_PARENT_CHANGED");
  Map<String,String> snapshotIds=new TreeMap<>(identities);String prefix=EnrollmentRootRegistry.CONTROL+"/";return new EnrollmentInitialization.View(control.get("session"),control.get("session.new"),journal,identities.getOrDefault(prefix+"session","")+"|"+identities.getOrDefault(EnrollmentRootRegistry.CONTROL,""),identities.getOrDefault(prefix+"session.new","")+"|"+identities.getOrDefault(EnrollmentRootRegistry.CONTROL,""),ObservedEnrollment.hash(snapshotIds.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),(name,max)->{
   live.run();ObservedEnrollment.require(journal.containsKey(name)&&max>0&&max<=EnrollmentStore.EVENT_BYTES,"RECONCILIATION_EVENT_SCOPE");File dir=new File(parent,"observed-enrollment-ledger-v1");ObservedEnrollment.require(snapshotIds.get("observed-enrollment-ledger-v1").equals(key(stat(dir)))&&snapshotIds.get("observed-enrollment-ledger-v1/"+name).equals(key(stat(new File(dir,name)))),"RECONCILIATION_EVENT_CHANGED");budget=0;try{return read(dir,name,max);}catch(Exception e){throw observationFailure(e);}
  });
 }
 static final class SetupRead {final EnrollmentInitialization.View view;final EnrollmentStore store;SetupRead(EnrollmentInitialization.View view,EnrollmentStore store){this.view=view;this.store=store;}}
 SetupRead setupRead()throws Exception{
  EnrollmentInitialization.View before=observe();EnrollmentStore journal=EnrollmentInitialization.journal(before);EnrollmentInitialization.View after=observe();ObservedEnrollment.require(before.token().equals(after.token()),"SETUP_CHANGED");return new SetupRead(before,journal);
 }
 public void publishExistingStage(EnrollmentInitialization.View observed)throws Exception{
  live.run();ObservedEnrollment.require(observe().token().equals(observed.token()),"STALE_OBSERVATION");EnrollmentOwner owner=EnrollmentOwner.get(context,source);EnrollmentInitialization.View locked=observe();ObservedEnrollment.require(locked.journal.isEmpty()&&locked.descriptor==null&&Arrays.equals(locked.stage,EnrollmentInitialization.EXPECTED.bytes())&&locked.stageIdentity.equals(observed.stageIdentity),"LOCKED_STAGE_CHANGED");EnrollmentAccounting.Cut cut=owner.disk.accounting();EnrollmentReportBudget.write(cut.total,0,cut.free,0);File root=new File(parent,EnrollmentRootRegistry.CONTROL),stage=new File(root,"session.new");java.io.FileDescriptor directory=Os.open(root.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);
  try{java.io.FileDescriptor fd=Os.open(stage.getPath(),OsConstants.O_RDONLY|OsConstants.O_NOFOLLOW|OsConstants.O_NONBLOCK,0);try{StructStat f=Os.fstat(fd),r=Os.fstat(directory);EnrollmentDisk.regular(f,EnrollmentDescriptor.LIMIT);ObservedEnrollment.require(observed.stageIdentity.equals(key(f)+"|"+key(r))&&key(r).equals(key(Os.lstat(root.getPath())))&&key(f).equals(key(Os.lstat(stage.getPath()))),"STAGE_IDENTITY_CHANGED");live.run();Os.fsync(fd);live.run();CameraProofRename.publish(root.getPath(),"session.new","session",new long[]{r.st_dev,r.st_ino,f.st_dev,f.st_ino,f.st_size,f.st_mtim.tv_sec,f.st_mtim.tv_nsec,f.st_ctim.tv_sec,f.st_ctim.tv_nsec});}finally{Os.close(fd);}}finally{Os.close(directory);}
 }
 public void createInitialEvent()throws Exception{
  live.run();EnrollmentInitialization.View v=observe();ObservedEnrollment.require(v.journal.isEmpty()&&v.stage==null&&Arrays.equals(v.descriptor,EnrollmentInitialization.EXPECTED.bytes()),"INITIALIZATION_NOT_EMPTY");
  EnrollmentOwner owner=EnrollmentOwner.get(context,source);EnrollmentStore fresh=new EnrollmentStore(new EnrollmentStore.Disk(){
   public Set<String> names()throws Exception{live.run();return owner.disk.names();}
   public byte[] read(String name,int max)throws Exception{live.run();return owner.disk.read(name,max);}
   public void publish(String name,byte[] bytes)throws Exception{live.run();owner.disk.publish(name,bytes);live.run();}
   public long used()throws Exception{live.run();return owner.disk.used();}public long free()throws Exception{live.run();return owner.disk.free();}
  });ObservedEnrollment.require(fresh.consumedEvents()==0&&owner.disk.names().isEmpty(),"INITIALIZATION_JOURNAL_CHANGED");live.run();try{fresh.create(EnrollmentInitialization.EXPECTED.labels,true);}finally{owner.store=new EnrollmentStore(owner.disk);}
 }
}

package expo.modules.recognitioncpu;
import android.content.Context;
import android.graphics.*;
import local.cameracomponent.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.JSONObject;
/** One integrated session serialized with legacy native camera/model/export work. */
public final class CameraIntegrationOwner {
 public static final long RETAINED_OLD_CLAIMS=253602084L, INTEGRATED_CAP=268435456L;
 private static CameraIntegrationOwner current;private static final Map<String,CameraIntegrationOwner> owners=new HashMap<>();private final CameraIntegrationLease lease=new CameraIntegrationLease(CameraProofLifecycle.SHARED_BUSY);
 public final String slot;public final CameraIntegrationDisk disk;public final RecordOwner records;
 public static final class CpuPreparation {private final CameraIntegrationLease.CpuPreparation ticket;private CpuPreparation(CameraIntegrationLease.CpuPreparation ticket){this.ticket=ticket;}}
 public static final class CpuTask {private final CameraIntegrationLease.CpuTicket ticket;private CpuTask(CameraIntegrationLease.CpuTicket ticket){this.ticket=ticket;}}
 private CameraIntegrationOwner(Context c)throws Exception{slot=CameraBatchSlots.selected(c);disk=new CameraIntegrationDisk(c);records=new RecordOwner(new Evidence.Disk(){public Set<String> names()throws Exception{Set<String> names=new HashSet<>(disk.names());names.removeAll(Arrays.asList("cpu-intent","tensor.f32le","cpu-result","cpu-receipt"));return names;}public byte[] read(String n,int max)throws Exception{FixedSlots.limit(n);return disk.read(n,max);}public void publish(String n,byte[] b)throws Exception{FixedSlots.limit(n);disk.publish(n,b);}public long free(){return disk.free();}});}
 public static synchronized CameraIntegrationOwner acquire(Context c,Object activity)throws Exception{
  String slot=CameraBatchSlots.selected(c);CameraIntegrationOwner owner=owners.get(slot);
  if(owner==null){if(CameraProofLifecycle.SHARED_BUSY.get())throw new Failure(Failure.Code.BUSY,"batch-owner");owner=new CameraIntegrationOwner(c.getApplicationContext());owners.put(slot,owner);}
  if(!owner.lease.claim(activity))throw new Failure(Failure.Code.BUSY,"shared-owner");current=owner;return owner;
 }
 public void validateSwitch()throws Exception{Failure.require(!records.session.busy()&&records.evidence.reopen().matches("SAVED:[0-9a-f]{64}"),Failure.Code.NOT_READY,"batch-save-before-switch");disk.observe();Set<String> names=disk.names();if(names.contains("cpu-intent"))Failure.require(cpuStatus().startsWith("CPU VERIFIED:"),Failure.Code.INTERRUPTED,"batch-cpu-unconfirmed");if(names.contains("export-attempt"))Failure.require(names.contains("export-result")&&new String(disk.read("export-result",32),StandardCharsets.US_ASCII).equals("COMPLETE_READBACK"),Failure.Code.INTERRUPTED,"batch-export-unconfirmed");}
 public boolean releaseForSwitch(Object activity){return lease.release(activity,records.session.busy());}
 public String retentionBinding()throws Exception{return disk.retentionBinding();}
 public boolean ownsActivity(Object activity){return lease.owns(activity);}
 public boolean operationBusy(Object activity){return lease.busy(activity);}
 public void taskStart(Object activity){lease.start(activity);}
 public CpuPreparation cpuPrepare(Object activity)throws Failure{Failure.require(!records.session.busy(),Failure.Code.BUSY,"cpu-camera-draining");try{return new CpuPreparation(lease.beginCpuPreparation(activity));}catch(IllegalStateException e){if("CPU_CONSUMED".equals(e.getMessage()))throw new Failure(Failure.Code.CONSUMED,"CPU-already-admitted-preserve-no-retry");throw new Failure(Failure.Code.BUSY,"CPU-preparation-owner-foreground-or-task");}}
 public CpuTask cpuAdmit(CpuPreparation preparation)throws Exception{
  Failure.require(android.os.Looper.myLooper()!=android.os.Looper.getMainLooper(),Failure.Code.SCHEDULING,"cpu-preflight-worker-only");
  try{return new CpuTask(lease.prepareCpu(preparation.ticket,new CameraIntegrationLease.CpuPreflight(){public String record()throws Exception{return records.evidence.reopen();}public Set<String> names()throws Exception{return disk.names();}}));}
  catch(IllegalStateException e){if("CPU_REQUIRES_SAVED".equals(e.getMessage()))throw new Failure(Failure.Code.NOT_READY,"save-photo-before-CPU-no-attempt-consumed");if("CPU_DURABLE_CONSUMED".equals(e.getMessage()))throw new Failure(Failure.Code.CONSUMED,"CPU-evidence-present-preserve-no-retry");throw new Failure(Failure.Code.INTERRUPTED,"CPU-preparation-owner-or-foreground-changed");}
 }
 public void cpuPreparationEnd(CpuPreparation preparation){lease.endCpuPreparation(preparation.ticket);}
 public void foreground(Object activity,boolean value){lease.foreground(activity,value);}
 public void focus(Object activity,boolean value){lease.focus(activity,value);}
 public void releaseIfBackground(Object activity){lease.releaseIfBackground(activity,records.session.busy());}
 public void cpuEnd(CpuTask task){lease.endCpu(task.ticket);}
 public String cancelCpu(Object activity){return lease.cancelCpu(activity);}
 public void taskEnd(Object activity){lease.end(activity);}
 public boolean acceptExportResult(Object activity,boolean pending){return lease.acceptExternalResult(activity,pending);}
 public void external(Object activity,boolean pending){lease.external(activity,pending);}
 public static synchronized void release(Object activity){for(CameraIntegrationOwner owner:owners.values())owner.lease.release(activity,owner.records.session.busy());}
 public void processCpu(Context context,CpuTask task)throws Exception{
  lease.requireCpu(task.ticket);
  if(!records.evidence.reopen().equals(task.ticket.savedRecord))throw new Failure(Failure.Code.TORN,"cpu-record");disk.publish("cpu-intent",new byte[]{1});
  if(lease.cpuCancelled(task.ticket))throw new Failure(Failure.Code.INTERRUPTED,"cpu-cancelled");
  byte[] crop=records.evidence.crop();BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(crop,0,crop.length,options);
  if(options.outWidth<1||options.outHeight<1||(long)options.outWidth*options.outHeight>4000000)throw new Failure(Failure.Code.OVERSIZE,"cpu-crop");
  Bitmap image=BitmapFactory.decodeByteArray(crop,0,crop.length);if(image==null)throw new Failure(Failure.Code.STORAGE,"cpu-decode");byte[] tensor;
  try{tensor=PhonePortabilityImage.tensor(image.getWidth(),image.getHeight(),1,new int[]{0,0,image.getWidth(),image.getHeight()},image::getPixel);}finally{image.recycle();}
  disk.publish("tensor.f32le",tensor);if(lease.cpuCancelled(task.ticket))throw new Failure(Failure.Code.INTERRUPTED,"cpu-cancelled");CameraProofFrame.Vector vector=CameraProofFrame.vector(new CameraProofCpu(context).run(tensor));
  JSONObject result=new JSONObject();result.put("schema",1);result.put("attempt",current.slot);result.put("acquisition","native-component-sensor-viewport-v2");result.put("processing","native-component-roi-v2-u8-gray128-bilinear224-f32-div255-v1");result.put("processingParentRecipe",CameraProofFrame.RECIPE);result.put("modelSha256",CameraProofFrame.MODEL);result.put("cropSha256",Evidence.hash(crop));result.put("tensorSha256",Evidence.hash(tensor));result.put("record",records.evidence.reopen());result.put("rawSha256",vector.rawSha256);result.put("normalizedSha256",vector.normalizedSha256);result.put("normSquared",vector.normSquared);result.put("raw",new org.json.JSONArray(vector.raw));result.put("normalized",new org.json.JSONArray(vector.normalized));
  if(lease.cpuCancelled(task.ticket))throw new Failure(Failure.Code.INTERRUPTED,"cpu-cancelled");byte[] bytes=result.toString().getBytes(StandardCharsets.UTF_8);disk.publish("cpu-result",bytes);
  byte[] receipt=(Evidence.hash(bytes)+"\n"+Evidence.hash(tensor)+"\n"+Evidence.hash(crop)+"\ncommit=cpu-claim-v1").getBytes(StandardCharsets.US_ASCII);
  if(!lease.publishCpu(task.ticket,()->disk.publish("cpu-receipt",receipt)))throw new Failure(Failure.Code.INTERRUPTED,"cpu-cancelled-before-claim");
 }
 public String cpuStatus()throws Exception{String publicationBlock=lease.cpuReceiptBlock();if(publicationBlock!=null)return publicationBlock;if(disk.names().contains("cpu-receipt")){byte[] resultBytes=disk.read("cpu-result",65536);String expected=Evidence.hash(resultBytes)+"\n"+Evidence.hash(disk.read("tensor.f32le",602112))+"\n"+Evidence.hash(records.evidence.crop())+"\ncommit=cpu-claim-v1";if(!expected.equals(new String(disk.read("cpu-receipt",1024),StandardCharsets.US_ASCII)))throw new Failure(Failure.Code.TORN,"cpu-receipt");JSONObject j=new JSONObject(new String(resultBytes,StandardCharsets.UTF_8));if(j.getInt("schema")!=1||!j.getString("attempt").equals(slot)||!j.getString("modelSha256").equals(CameraProofFrame.MODEL)||!j.getString("processing").equals("native-component-roi-v2-u8-gray128-bilinear224-f32-div255-v1")||!j.getString("record").equals(records.evidence.reopen()))throw new Failure(Failure.Code.TORN,"cpu-provenance");if(!j.getString("cropSha256").equals(Evidence.hash(records.evidence.crop()))||!j.getString("tensorSha256").equals(Evidence.hash(disk.read("tensor.f32le",602112))))throw new Failure(Failure.Code.TORN,"cpu-binding");publicationBlock=lease.cpuReceiptBlock();if(publicationBlock!=null)return publicationBlock;return "CPU VERIFIED: "+j.getString("normalizedSha256")+"; commit claimed before receipt publication; Close after claim cannot retract; "+lease.cpuOutcome();}return disk.names().contains("cpu-intent")?"CPU INTERRUPTED: consumed; no automatic rerun":"CPU NOT RUN";}
 public void requireInitialRecord()throws Exception{disk.observe().requireInitial();Failure.require(records.evidence.reopen().equals("EMPTY"),Failure.Code.CONSUMED,"I05-exhausted");}
 public static synchronized Map<String,Object> status(Context context)throws Exception{
  if(current==null){current=new CameraIntegrationOwner(context.getApplicationContext());owners.put(current.slot,current);}CameraIntegrationNamespace shape=current.disk.observe();Map<String,Object> result=new LinkedHashMap<>();
  result.put("attempt",current.slot);result.put("retainedI00",current.disk.retainedSummary());result.put("retainedI00Bytes",current.disk.retainedBytes());result.put("namespace",shape.summary());result.put("leaves",shape.leaves);result.put("leafCount",shape.leaves.size());result.put("recordBytes",shape.bytes);result.put("initialAdmission",shape.initial&&!CameraProofLifecycle.SHARED_BUSY.get());result.put("noCpuOrExportIntent",shape.initial);
  try{result.put("record",current.records.evidence.reopen());}catch(Exception e){result.put("record","UNVERIFIED: preserve existing record");}
  try{result.put("cpu",current.cpuStatus());}catch(Exception e){result.put("cpu","UNVERIFIED: preserve existing CPU evidence");}
  result.put("busy",CameraProofLifecycle.SHARED_BUSY.get());result.put("oldClaims",RETAINED_OLD_CLAIMS);result.put("integrationCap",INTEGRATED_CAP);return result;
 }
 public void archive(java.io.OutputStream destination)throws Exception{
  if(!disk.names().contains("export-attempt")||disk.names().contains("export-result")||!cpuStatus().startsWith("CPU VERIFIED:"))throw new Failure(Failure.Code.CONSUMED,"integration-export");records.evidence.reopen();
  java.util.zip.ZipOutputStream zip=new java.util.zip.ZipOutputStream(destination);org.json.JSONArray manifest=new org.json.JSONArray();
  for(String n:Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt","cpu-intent","tensor.f32le","cpu-result","cpu-receipt")){byte[] bytes=disk.read(n,CameraIntegrationDisk.limit(n));java.util.zip.ZipEntry entry=new java.util.zip.ZipEntry(n);entry.setTime(0);zip.putNextEntry(entry);zip.write(bytes);zip.closeEntry();JSONObject row=new JSONObject();row.put("name",n);row.put("bytes",bytes.length);row.put("sha256",Evidence.hash(bytes));manifest.put(row);}
  JSONObject root=new JSONObject();root.put("schemaVersion",2);root.put("attempt",slot);root.put("acquisition","native-component-v2");root.put("files",manifest);java.util.zip.ZipEntry e=new java.util.zip.ZipEntry("manifest.json");e.setTime(0);zip.putNextEntry(e);zip.write(root.toString().getBytes(StandardCharsets.UTF_8));zip.closeEntry();zip.finish();zip.flush();
 }

}

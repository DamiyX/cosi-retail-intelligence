package expo.modules.recognitioncpu;

import android.content.Context;
import android.graphics.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import local.cameracomponent.*;

/** Process owner: native journal, accepted camera evidence and pinned CPU; no caller files. */
public final class EnrollmentOwner {
 private static EnrollmentOwner instance;private static volatile boolean readDiagnosticActive;
 public final EnrollmentDisk disk;public volatile EnrollmentStore store;
 private static final EnrollmentGate SETUP_GATE=new EnrollmentGate(CameraProofLifecycle.SHARED_BUSY);
 private final EnrollmentGate gate=SETUP_GATE;
 public final String source; public final EnrollmentReports reports;
 private volatile RecordOwner records;private volatile EnrollmentDisk.Record recordDisk;private volatile ObservedEnrollment.Pending job;
 private volatile boolean cpuSpent;
 public static final class BarcodeBinding {public final int product,view;public final long epoch;public final String previous;BarcodeBinding(int p,int v,long e,String old){product=p;view=v;epoch=e;previous=old;}}
 private volatile BarcodeBinding barcode;
 private final Set<Object> releaseQueued=Collections.newSetFromMap(new IdentityHashMap<>());
 private EnrollmentOwner(Context c,String source)throws Exception{ObservedEnrollment.digest(source);this.source=source;disk=new EnrollmentDisk(c);disk.control.bindSource(source);try{store=new EnrollmentStore(disk);reports=new EnrollmentReports(this,c.getApplicationContext(),disk.control);if(store.initialized()){ObservedEnrollment.require(disk.control.descriptor()!=null,"LEGACY_SESSION_NO_DESCRIPTOR");EnrollmentDescriptor descriptor=EnrollmentDescriptor.read(disk.control.descriptor());ObservedEnrollment.require(EnrollmentInitialization.sourceMatches(descriptor,source),"SESSION_SOURCE");descriptor.validate(store.snapshot());}verifySaved();}catch(Exception e){disk.close();throw e;}}
 public static synchronized EnrollmentOwner get(Context c,String source)throws Exception{
  ObservedEnrollment.require(c.getPackageManager().getApplicationInfo(c.getPackageName(),android.content.pm.PackageManager.GET_META_DATA).metaData.getBoolean("com.damiyx.recognition.OBSERVED_ENROLLMENT",false),"ENROLLMENT_DISABLED");
  if(instance==null){ObservedEnrollment.require(!readDiagnosticActive,"ENROLLMENT_BUSY");instance=new EnrollmentOwner(c.getApplicationContext(),source);}ObservedEnrollment.require(instance.source.equals(source),"SOURCE_CHANGED");return instance;
 }
 private static int integer(Map<String,Object> r,String key,int max){Object value=r.get(key);ObservedEnrollment.require(value instanceof Number,"REQUEST_NUMBER");double n=((Number)value).doubleValue();ObservedEnrollment.require(Double.isFinite(n)&&n>=0&&n<=max&&n==Math.floor(n),"REQUEST_NUMBER");return (int)n;}
 private static long epoch(Map<String,Object> r){Object value=r.get("epoch");ObservedEnrollment.require(value instanceof Number,"REQUEST_EPOCH");double n=((Number)value).doubleValue();ObservedEnrollment.require(Double.isFinite(n)&&n>0&&n<=9007199254740991L&&n==Math.floor(n),"REQUEST_EPOCH");return (long)n;}
 private static void keys(Map<String,Object> r,String... fields){ObservedEnrollment.require(r.keySet().equals(new HashSet<>(Arrays.asList(fields))),"REQUEST_KEYS");}
 private static void requireEnabled(Context c)throws Exception{ObservedEnrollment.require(c.getPackageManager().getApplicationInfo(c.getPackageName(),android.content.pm.PackageManager.GET_META_DATA).metaData.getBoolean("com.damiyx.recognition.OBSERVED_ENROLLMENT",false),"ENROLLMENT_DISABLED");}
 public static Map<String,Object> initialization(Context context,String source,Map<String,Object> request,Runnable live)throws Exception{
  requireEnabled(context);String op=(String)request.get("op");boolean resume="resumeInitialization".equals(op);
  keys(request,resume?new String[]{"op","observationHash","confirmed"}:new String[]{"op"});
  ObservedEnrollment.require(resume||"reconcileInitialization".equals(op),"INITIALIZATION_OPERATION");
  if(resume)ObservedEnrollment.require(request.get("observationHash") instanceof String&&((String)request.get("observationHash")).matches("[0-9a-f]{64}")&&request.get("confirmed") instanceof Boolean,"INITIALIZATION_REQUEST");
  long deadline=android.os.SystemClock.elapsedRealtime()+300000L;Runnable bounded=()->{live.run();ObservedEnrollment.require(android.os.SystemClock.elapsedRealtime()<deadline,"INITIALIZATION_OBSERVATION_EXPIRED");};
  SETUP_GATE.command();try{EnrollmentInitializationDisk disk=new EnrollmentInitializationDisk(context,source,bounded);return resume?EnrollmentInitialization.resume(disk,source,(String)request.get("observationHash"),(Boolean)request.get("confirmed"),bounded):EnrollmentInitialization.inspect(disk,source,bounded);}finally{SETUP_GATE.commandEnd();}
 }
 public static Map<String,Object> setup(Context c,String source)throws Exception{
  requireEnabled(c);SETUP_GATE.command();try{
   EnrollmentInitializationDisk.SetupRead saved=new EnrollmentInitializationDisk(c,source,()->{}).setupRead();EnrollmentInitialization.View view=saved.view;
   ObservedEnrollment.require(view.stage==null,"SESSION_PUBLICATION_UNCERTAIN");
   EnrollmentStore journal=saved.store;EnrollmentDescriptor descriptor=view.descriptor==null?null:EnrollmentDescriptor.read(view.descriptor);
   if(descriptor!=null)ObservedEnrollment.require(EnrollmentInitialization.sourceMatches(descriptor,source),"SESSION_SOURCE");
   if(journal.initialized()){ObservedEnrollment.require(descriptor!=null,"LEGACY_SESSION_NO_DESCRIPTOR");descriptor.validate(journal.snapshot());}
   EnrollmentControl controls=new EnrollmentControl(new java.io.File(c.getApplicationInfo().dataDir,"files").getCanonicalFile(),new EnrollmentControl.Quota(){public void check(long a,long b){throw new IllegalStateException("READ_ONLY");}public void physical(long a){throw new IllegalStateException("READ_ONLY");}});
   byte[] preflight=controls.read("R01.intent");Map<String,Object> result=new LinkedHashMap<>();result.put("initialized",journal.initialized());result.put("sourceSha256",source);result.put("session",descriptor!=null?descriptor.experiment:preflight==null?"":EnrollmentReportRecords.session(preflight));result.put("sequence",journal.sequence());result.put("roster",descriptor==null?Collections.emptyList():descriptor.labels);return result;
  }finally{SETUP_GATE.commandEnd();}
 }
 public static Map<String,Object> reportStatus(Context context,String source,Map<String,Object> request)throws Exception{requireEnabled(context);ObservedEnrollment.digest(source);keys(request,"op","report","session");ObservedEnrollment.require("reportStatus".equals(request.get("op"))&&request.get("session") instanceof String,"TRANSFER_STATUS_REQUEST");return EnrollmentReports.status(context,source,integer(request,"report",EnrollmentControl.MAX_REPORTS),(String)request.get("session"));}
 public static Map<String,Object> command(Context c,String source,Map<String,Object> request)throws Exception{
  EnrollmentOwner o=get(c,source);Object operation=request.get("op");ObservedEnrollment.require(operation instanceof String,"REQUEST_OPERATION");String op=(String)operation;
  if(op.equals("snapshot")){keys(request,"op");return o.snapshot();}
  if(op.equals("permission")){keys(request,"op");ObservedEnrollment.require(!o.gate.busy()&&!CameraProofLifecycle.SHARED_BUSY.get(),"ENROLLMENT_BUSY");return o.snapshot();}
  o.gate.command();try{
   if(op.equals("initialize")){keys(request,"op","experiment","labels","confirmed");ObservedEnrollment.require(Boolean.TRUE.equals(request.get("confirmed"))&&request.get("experiment") instanceof String&&request.get("labels") instanceof List,"CONFIRMED_ROSTER_REQUIRED");List<?> input=(List<?>)request.get("labels");ObservedEnrollment.require(input.size()==10,"CONFIRMED_TEN_PRODUCTS");List<String> labels=new ArrayList<>();for(Object label:input){ObservedEnrollment.require(label instanceof String,"ROSTER_LABEL");labels.add((String)label);}EnrollmentDescriptor descriptor=new EnrollmentDescriptor((String)request.get("experiment"),source,labels);byte[] preflight=o.disk.control.read("R01.intent");if(preflight!=null)ObservedEnrollment.require(EnrollmentReportRecords.session(preflight).equals(descriptor.experiment),"PREFLIGHT_SESSION_CHANGED");try{EnrollmentDescriptor.initialize(o.disk.control,o.store,descriptor);}finally{o.store=new EnrollmentStore(o.disk);}}
   else if(op.equals("recover")){keys(request,"op","sequence");ObservedEnrollment.require(integer(request,"sequence",4096)==o.store.sequence(),"STALE_SNAPSHOT");o.store.classifyInterrupted();}
   else if(op.equals("accounting")||op.equals("prepareReport")){keys(request,op.equals("accounting")?new String[]{"op","sequence","session"}:new String[]{"op","sequence","session","report"});ObservedEnrollment.require(request.get("session") instanceof String,"REPORT_SESSION");return op.equals("accounting")?o.reports.accounting(integer(request,"sequence",4096),(String)request.get("session")):o.reports.prepare(integer(request,"report",EnrollmentControl.MAX_REPORTS),integer(request,"sequence",4096),(String)request.get("session"));}
   else {
    int sequence=integer(request,"sequence",4096);
    switch(op){
     case "enableBarcodes":keys(request,"op","sequence");o.store.transact(sequence,ObservedEnrollment.State::enableBarcodes);break;
     case "confirmBarcode":keys(request,"op","sequence","product","epoch","accept");int bp=integer(request,"product",9);long be=epoch(request);Object accept=request.get("accept");ObservedEnrollment.require(accept instanceof Boolean,"BARCODE_CONFIRMATION");o.store.transact(sequence,s->s.confirmBarcode(bp,be,(Boolean)accept));break;
     case "openBarcode":{
      keys(request,"op","sequence","product","view","previousReceipt");int bp2=integer(request,"product",9),bv=integer(request,"view",3);Object old=request.get("previousReceipt");ObservedEnrollment.require(old instanceof String,"BARCODE_RECEIPT");
      ObservedEnrollment.require(c.checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED,"CAMERA_PERMISSION_REQUIRED");
      o.store.transact(sequence,s->s.beginBarcodeScan(bp2,bv,(String)old));o.barcode=new BarcodeBinding(bp2,bv,o.store.snapshot().epoch(),(String)old);o.gate.reserve();break;}
     case "select":keys(request,"op","sequence","product");int p=integer(request,"product",9);o.store.transact(sequence,s->s.select(p));break;
     case "openCapture":
      keys(request,"op","sequence","product","view","previousReceipt");int product=integer(request,"product",9),view=integer(request,"view",3);Object previous=request.get("previousReceipt");ObservedEnrollment.require(previous instanceof String&&(((String)previous).isEmpty()||((String)previous).matches("[0-9a-f]{64}")),"REPLACEMENT_RECEIPT");
      ObservedEnrollment.require(c.checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED,"CAMERA_PERMISSION_REQUIRED");
      long used=o.disk.used(),free=o.disk.free();o.store.transact(sequence,s->s.begin(product,view,(String)previous,used,free));ObservedEnrollment.Pending prepared=o.store.snapshot().pending();
      EnrollmentDisk.Record target=o.disk.record(prepared.job,true);RecordOwner nextRecords=new RecordOwner(target);synchronized(o){o.job=prepared;o.recordDisk=target;o.records=nextRecords;o.cpuSpent=false;}o.gate.reserve();break;
     case "reviewCandidate":keys(request,"op","sequence","job");ObservedEnrollment.State review=o.store.snapshot();ObservedEnrollment.require(sequence==o.store.sequence()&&review.candidate()!=null&&review.candidate().job==integer(request,"job",64),"STALE_REVIEW");o.verify(review.candidate());o.gate.reserve();break;
     case "keep":case "decline":keys(request,"op","sequence","job","epoch");int j=integer(request,"job",64);long e=epoch(request);ObservedEnrollment.State before=o.store.snapshot();ObservedEnrollment.require(before.candidate()!=null&&before.candidate().job==j,"STALE_REVIEW");o.verify(before.candidate());o.store.transact(sequence,s->{if(op.equals("keep"))s.keep(j,e);else s.decline(j,e);});break;
     case "freeze":keys(request,"op","sequence");o.verifySaved();o.store.transact(sequence,ObservedEnrollment.State::freeze);break;
     case "newRevision":keys(request,"op","sequence");o.store.transact(sequence,ObservedEnrollment.State::newRevision);break;
     default:throw new IllegalStateException("UNKNOWN_ENROLLMENT_OPERATION");
    }
   }
  }finally{o.gate.commandEnd();}
  return o.snapshot();
 }

 public static final class ReadOwner {
  public final String source;public final EnrollmentControl control;private final EnrollmentProofInventory proofs;
  public void verifyMetadata()throws Exception{proofs.verify();}
  private ReadOwner(Context c,String source)throws Exception{this.source=source;java.io.File parent=c.getFilesDir().getCanonicalFile();proofs=new EnrollmentProofInventory(parent);control=new EnrollmentControl(parent,new EnrollmentControl.Quota(){public void check(long extra,long pending)throws Exception{proofs.verify();long[] charges=control.charges();EnrollmentReportBudget.write(EnrollmentAccounting.scan(parent,charges[0],charges[1]).total,extra,free(),pending);}public void physical(long pending)throws Exception{EnrollmentReportBudget.physical(free(),pending);}private long free()throws Exception{android.system.StructStatVfs s=android.system.Os.statvfs(parent.getPath());return EnrollmentReportBudget.available(s.f_bavail,s.f_frsize);}});control.bindSource(source);}
  public void endReadDiagnostic(boolean uncertain){synchronized(EnrollmentOwner.class){if(uncertain)SETUP_GATE.uncertain();SETUP_GATE.commandEnd();if(!uncertain)readDiagnosticActive=false;}}
 }
 public static synchronized ReadOwner beginReadDiagnostic(Context c,String source)throws Exception{requireEnabled(c);ObservedEnrollment.digest(source);if(instance!=null)ObservedEnrollment.require(instance.source.equals(source),"SOURCE_CHANGED");SETUP_GATE.command();try{ReadOwner o=new ReadOwner(c,source);readDiagnosticActive=true;return o;}catch(Exception e){SETUP_GATE.commandEnd();throw e;}}
 public static void prepareReadDiagnostic(android.app.Activity a,String source)throws Exception{EnrollmentReadAdapter.prepare(a,source);}
 public static void launchReadDiagnostic(android.app.Activity a){EnrollmentReadAdapter.launch(a);}
 public static void abortReadDiagnostic(android.app.Activity a){EnrollmentReadAdapter.abort(a);}
 public static void returnedReadDiagnostic(android.app.Activity a,int code,android.content.Intent data){EnrollmentReadAdapter.returned(a,code,data);}
 public static Map<String,Object> readDiagnosticStatus(Context c,String source)throws Exception{requireEnabled(c);ObservedEnrollment.digest(source);return EnrollmentReadAdapter.status(c,source);}
 // Existing R8-kept owner is the only reflected report bridge. Helpers remain direct bytecode dependencies.
 public static void prepareReportTransfer(android.app.Activity a,String source,int number,int sequence,String session)throws Exception{EnrollmentReportTransfer.prepare(a,source,number,sequence,session);}
 public static void launchReportTransfer(android.app.Activity a,int number){EnrollmentReportTransfer.launchPrepared(a,number);}
 public static void abortReportTransfer(android.app.Activity a,int number){EnrollmentReportTransfer.abortPrepared(a,number);}
 public static void returnedReportTransfer(android.app.Activity a,int code,int result,android.content.Intent data){EnrollmentReportTransfer.returned(a,code,result,data);}
 public static void destroyedReportTransfer(android.app.Activity a){EnrollmentReadAdapter.abort(a);EnrollmentReportTransfer.destroyed(a);}
 public static void reportActivity(android.app.Activity a){EnrollmentOwner o=instance;if(o!=null)o.reports.activity(a);}
 public static EnrollmentOwner beginTransfer(Context c,String source,int number,int sequence,String session)throws Exception{EnrollmentOwner o=get(c,source);o.gate.command();try{o.reports.activity((android.app.Activity)c);o.reports.exportBegin(number,sequence,session);return o;}catch(Exception e){o.gate.commandEnd();throw e;}}
 public void transferUncertain(){reports.cancel();gate.uncertain();}
 public void endTransfer(byte[] terminal)throws Exception{try{reports.transferEnd(terminal);}catch(Exception e){gate.uncertain();throw e;}finally{gate.commandEnd();}}
 public byte[] transferBytes(int number)throws Exception{return disk.control.read(EnrollmentControl.slot(number)+".bin");}
 public static void reportBackground(){EnrollmentReadAdapter.background();EnrollmentOwner o=instance;if(o!=null)o.reports.background();}
 public long launchBarcodeEpoch(){ObservedEnrollment.require(barcode!=null,"NO_BARCODE_BINDING");return barcode.epoch;}
 public BarcodeBinding claimBarcode(Object token,long epoch){BarcodeBinding b=barcode;ObservedEnrollment.require(b!=null&&b.epoch==epoch,"BARCODE_LAUNCH_STALE");gate.claim(token);gate.detectorStart(token);return b;}
 public boolean barcodeValid(Object token,BarcodeBinding b){try{gate.requireLive(token);ObservedEnrollment.State s=store.snapshot();ObservedEnrollment.Reference old=s.products().get(b.product).view(b.view);return barcode==b&&s.epoch()==b.epoch&&s.selectedProduct()==b.product&&s.candidate()==null&&s.pending()==null&&(old==null?"":old.receipt).equals(b.previous);}catch(Exception error){return false;}}
 public void barcodeCandidate(Object token,BarcodeBinding b,EnrollmentBarcodeSession.Hit hit)throws Exception{ObservedEnrollment.require(barcodeValid(token,b),"BARCODE_STALE");store.transact(store.sequence(),s->s.barcodeCandidate(b.product,b.epoch,hit.raw,hit.format,hit.key));}
 public void barcodeDisposition(Object token,BarcodeBinding b,ObservedEnrollment.Barcode value)throws Exception{ObservedEnrollment.require(barcodeValid(token,b),"BARCODE_STALE");store.transact(store.sequence(),s->s.barcodeDisposition(b.product,b.epoch,value));}
 public void barcodeDrained(Object token){gate.detectorEnd(token);}
 public void barcodeUncertain(){gate.uncertain();}
 public void launchFailed(){gate.launchFailed();}
 public RecordOwner claim(Object token)throws Exception{ObservedEnrollment.require(records!=null&&job!=null,"NO_PREPARED_CAPTURE");gate.claim(token);return records;}
 public void claimReview(Object token){gate.claim(token);gate.reviewStart(token);}
 public void reviewEnd(Object token){gate.reviewEnd(token);}
 public ObservedEnrollment.Pending job(){ObservedEnrollment.require(job!=null,"NO_JOB");return job;}
 public int launchJob(){return job().job;}
 public void foreground(Object token,boolean value){gate.foreground(token,value);}
 public void focus(Object token,boolean value){gate.focus(token,value);}
 public void requireLive(Object token){gate.requireLive(token);}
 public boolean owns(Object token){return gate.owns(token);}
 public boolean cpuBusy(){return gate.cpuBusy();}
 public void cancel(Object token){gate.cancel(token);}
 public void release(Object token){
  synchronized(this){if(!gate.owns(token)||!releaseQueued.add(token))return;}
  android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());RecordOwner old=records;
  java.util.concurrent.Executor main=task->{if(!handler.post(task))throw new java.util.concurrent.RejectedExecutionException();};
  EnrollmentDrain.afterCallbacks(main,old==null?Runnable::run:old.worker,
   ()->gate.owns(token)&&(old==null||!old.session.busy())&&!gate.cpuBusy(),
   ()->{synchronized(this){releaseQueued.remove(token);if(gate.release(token,old!=null&&old.session.busy())){if(old!=null)old.worker.shutdown();if(records==old&&!gate.busy()){records=null;recordDisk=null;job=null;}}}},
   ()->{synchronized(this){releaseQueued.remove(token);}});

 }
 public void process(Context context,Object token)throws Exception{
  ObservedEnrollment.require(!records.session.busy()&&!cpuSpent,"CPU_CONSUMED_OR_CAMERA_DRAINING");gate.cpuStart(token);cpuSpent=true;
  try{
   ObservedEnrollment.Pending current=store.snapshot().pending();ObservedEnrollment.require(current!=null&&current.job==job.job&&current.epoch==job.epoch,"STALE_CAPTURE_JOB");
   ObservedEnrollment.require(records.evidence.reopen().startsWith("SAVED:"),"SAVED_CAPTURE_REQUIRED");gate.cpuValid(token);
   byte[] crop=records.evidence.crop();BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(crop,0,crop.length,bounds);ObservedEnrollment.require(bounds.outWidth>0&&bounds.outHeight>0&&(long)bounds.outWidth*bounds.outHeight<=4000000,"CROP_BOUNDS");
   Bitmap image=BitmapFactory.decodeByteArray(crop,0,crop.length);ObservedEnrollment.require(image!=null,"CROP_DECODE");byte[] tensor;
   try{tensor=PhonePortabilityImage.tensor(image.getWidth(),image.getHeight(),1,new int[]{0,0,image.getWidth(),image.getHeight()},image::getPixel);}finally{image.recycle();}
   gate.cpuValid(token);CameraProofFrame.Vector vector=CameraProofFrame.vector(new CameraProofCpu(context).run(tensor));gate.cpuValid(token);
   float[] normalized=new float[1024];ByteBuffer feature=ByteBuffer.allocate(4096).order(ByteOrder.LITTLE_ENDIAN);for(int i=0;i<1024;i++){normalized[i]=vector.normalized.get(i).floatValue();feature.putFloat(normalized[i]);}
   byte[] original=recordDisk.read("original.jpeg",Evidence.JPEG),geometry=recordDisk.read("geometry",4096),receipt=recordDisk.read("receipt",1024);
   ObservedEnrollment.Reference ref=new ObservedEnrollment.Reference(current.job,current.product,current.view,current.epoch,Evidence.hash(original),Evidence.hash(crop),Evidence.hash(geometry),Evidence.hash(receipt),Evidence.hash(tensor),vector.rawSha256,source,CameraProofFrame.MODEL,normalized);
   recordDisk.publish("feature.bin",feature.array());byte[] binding=("schema=1|job="+current.job+"|product="+current.product+"|view="+current.view+"|epoch="+current.epoch+"|reference="+ObservedEnrollment.hash(ObservedEnrollment.referenceBytes(ref))+"|feature="+Evidence.hash(feature.array())+"|acquisition="+ObservedEnrollment.ACQUISITION+"|processing="+ObservedEnrollment.PROCESSING).getBytes(StandardCharsets.US_ASCII);
   ObservedEnrollment.require(gate.claimPublication(token),"CPU_CANCELLED_BEFORE_CLAIM");recordDisk.publish("feature-receipt",binding);
   // Claim is the linearization point. Cancellation after it cannot retract this one publication.
   store.transact(store.sequence(),s->s.offer(ref));verify(ref);
  }finally{gate.cpuEnd(token);}
 }
 public byte[] reviewCrop()throws Exception{ObservedEnrollment.Reference candidate=store.snapshot().candidate();ObservedEnrollment.require(candidate!=null,"NO_REVIEW_CANDIDATE");verify(candidate);return disk.record(candidate.job,false).read("crop.png",Evidence.CROP);}
 private void verifySaved()throws Exception{if(!store.initialized())return;for(ObservedEnrollment.Reference ref:store.historicalReferences())verify(ref);}
 void verify(ObservedEnrollment.Reference ref)throws Exception{
  EnrollmentDescriptor descriptor=EnrollmentDescriptor.read(disk.control.descriptor());ObservedEnrollment.require(ref.source.equals(source)||EnrollmentReferenceCompatibility.accepts(descriptor,ref),"REFERENCE_SOURCE_NOT_APPROVED");
  EnrollmentDisk.Record diskRecord=disk.record(ref.job,false);Evidence evidence=new Evidence(diskRecord);ObservedEnrollment.require(evidence.reopen().startsWith("SAVED:"),"REFERENCE_CAPTURE_MISSING");
  ObservedEnrollment.require(ref.original.equals(Evidence.hash(diskRecord.read("original.jpeg",Evidence.JPEG)))&&ref.crop.equals(Evidence.hash(diskRecord.read("crop.png",Evidence.CROP)))&&ref.geometry.equals(Evidence.hash(diskRecord.read("geometry",4096)))&&ref.receipt.equals(Evidence.hash(diskRecord.read("receipt",1024))),"REFERENCE_HASH_CHANGED");
  String geometry=new String(diskRecord.read("geometry",4096),StandardCharsets.UTF_8);
  ObservedEnrollment.require(geometry.contains("|source="+ref.source+"|")&&geometry.contains("|enrollmentJob="+ref.job+"|enrollmentProduct="+ref.product+"|enrollmentView="+ref.view+"|enrollmentEpoch="+ref.epoch+"|")&&geometry.contains("|device=")&&geometry.contains("|observedApk=")&&geometry.contains("|acquisition="+ObservedEnrollment.ACQUISITION),"NATIVE_PROVENANCE_BINDING");
  byte[] features=diskRecord.read("feature.bin",4096);ObservedEnrollment.require(features.length==4096,"FEATURE_LENGTH");FloatBuffer buffer=ByteBuffer.wrap(features).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer();float[] values=new float[1024];buffer.get(values);ObservedEnrollment.require(Arrays.equals(values,ref.vector()),"FEATURE_CHANGED");
  String expected="schema=1|job="+ref.job+"|product="+ref.product+"|view="+ref.view+"|epoch="+ref.epoch+"|reference="+ObservedEnrollment.hash(ObservedEnrollment.referenceBytes(ref))+"|feature="+Evidence.hash(features)+"|acquisition="+ObservedEnrollment.ACQUISITION+"|processing="+ObservedEnrollment.PROCESSING;
  ObservedEnrollment.require(expected.equals(new String(diskRecord.read("feature-receipt",2048),StandardCharsets.US_ASCII)),"FEATURE_RECEIPT_CHANGED");
 }
 public Map<String,Object> snapshot(){
  ObservedEnrollment.State state=store.snapshot();Map<String,Object> result=new LinkedHashMap<>();result.put("schema",1);result.put("sequence",store.sequence());result.put("revision",state.revision());result.put("epoch",state.epoch());result.put("selectedProduct",state.selectedProduct());result.put("busy",gate.busy()||CameraProofLifecycle.SHARED_BUSY.get());result.put("interrupted",state.interrupted());result.put("frozen",state.frozen());result.put("barcodeAvailable",state.barcodeAvailable());result.put("sourceSha256",source);
  List<Map<String,Object>> products=new ArrayList<>();for(ObservedEnrollment.Product p:state.products()){Map<String,Object> product=new LinkedHashMap<>();product.put("label",p.label);product.put("barcode",p.barcode().name());product.put("barcodeValue",p.raw());product.put("barcodeEpoch",p.barcodeEpoch());product.put("encodedBytes",p.bytes().length);List<Object> views=new ArrayList<>();for(int v=0;v<4;v++){ObservedEnrollment.Reference ref=p.view(v);if(ref==null)views.add(null);else{Map<String,Object> value=new LinkedHashMap<>();value.put("job",ref.job);value.put("receipt",ref.receipt);views.add(value);}}product.put("views",views);products.add(product);}result.put("products",products);
  ObservedEnrollment.Reference candidate=state.candidate();Map<String,Object> review=null;if(candidate!=null){review=new LinkedHashMap<>();review.put("product",candidate.product);review.put("view",candidate.view);review.put("job",candidate.job);review.put("epoch",candidate.epoch);review.put("receipt",candidate.receipt);}result.put("candidate",review);return result;
 }
}

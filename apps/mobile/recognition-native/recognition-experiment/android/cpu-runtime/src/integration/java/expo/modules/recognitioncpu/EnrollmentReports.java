package expo.modules.recognitioncpu;
import android.content.Context;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

/** Collects canonical numerical evidence under the existing drained operation owner; no recovery side effect. */
public final class EnrollmentReports {
 private final EnrollmentOwner owner;private final Context context;private final EnrollmentControl control;
 private volatile boolean cancelled,transfer,picker;private volatile android.app.Activity activity;private long begun;private int exporting;private String generation;private EnrollmentReportRecords.Prepared exportingPrepared;
 public EnrollmentReports(EnrollmentOwner owner,Context context,EnrollmentControl control){this.owner=owner;this.context=context;this.control=control;}
 public void activity(android.app.Activity value){activity=value;}
 private void live(){ObservedEnrollment.require(!cancelled&&activity!=null&&!activity.isFinishing()&&(picker||activity.hasWindowFocus())&&android.os.SystemClock.elapsedRealtime()-begun<300000,"REPORT_CANCELLED_OR_EXPIRED");}
 public void cancel(){cancelled=true;}
 public void background(){if(!picker)cancelled=true;}
 private void begin(){begun=android.os.SystemClock.elapsedRealtime();cancelled=false;generation=UUID.randomUUID().toString();}
 private ObservedEnrollment.State idle(int sequence,String session)throws Exception{
  ObservedEnrollment.require(sequence==owner.store.sequence(),"REPORT_STALE_SEQUENCE");byte[] descriptor=control.descriptor();
  if(!owner.store.initialized()){ObservedEnrollment.require(owner.store.consumedEvents()==0,"REPORT_UNINITIALIZED_JOURNAL_UNCERTAIN");if(descriptor!=null){EnrollmentDescriptor d=EnrollmentDescriptor.read(descriptor);ObservedEnrollment.require(d.experiment.equals(session)&&EnrollmentInitialization.sourceMatches(d,owner.source),"REPORT_SESSION");}ObservedEnrollment.require(sequence==0&&session.matches("[a-zA-Z0-9][a-zA-Z0-9-]{0,63}"),"REPORT_PREFLIGHT");return null;}
  ObservedEnrollment.require(descriptor!=null,"LEGACY_SESSION_NO_DESCRIPTOR");EnrollmentDescriptor d=EnrollmentDescriptor.read(descriptor);ObservedEnrollment.require(d.experiment.equals(session)&&EnrollmentInitialization.sourceMatches(d,owner.source),"REPORT_SESSION");ObservedEnrollment.State s=owner.store.snapshot();d.validate(s);ObservedEnrollment.require(s.pending()==null&&s.candidate()==null&&s.products().stream().noneMatch(p->p.barcode()==ObservedEnrollment.Barcode.PENDING||p.barcode()==ObservedEnrollment.Barcode.CONFLICT),"REPORT_REQUIRES_EXPLICIT_RECOVERY_OR_REVIEW");return s;
 }
 private String apk()throws Exception{File f=new File(context.getApplicationInfo().sourceDir);ObservedEnrollment.require(f.length()>0&&f.length()<=134217728,"REPORT_APK_BOUND");MessageDigest h=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(f)){byte[] b=new byte[65536];int n;while((n=in.read(b))>=0){live();h.update(b,0,n);}}StringBuilder value=new StringBuilder();for(byte b:h.digest())value.append(String.format(Locale.ROOT,"%02x",b&255));return value.toString();}
 public Map<String,Object> accounting(int sequence,String session)throws Exception{begin();idle(sequence,session);live();Map<String,Object> summary;try{summary=owner.disk.accounting().summary();}catch(EnrollmentAccounting.Refusal refusal){return refusal.summary();}List<Map<String,Object>> reports=new ArrayList<>();for(int i=1;i<=EnrollmentControl.MAX_REPORTS;i++){Map<String,Object> r=result(i);if(i>=6){EnrollmentReportDecision decision=control.decision(i,owner.source,session);r.put("transfer",decision.state.equals("NOT_STARTED")?"NOT_VERIFIED":decision.state);r.put("basis",decision.basis);r.put("acknowledgment",decision.acknowledgment);reports.add(r);continue;}byte[] terminal=control.read(EnrollmentControl.slot(i)+".export-result");r.put("transfer",terminal==null?"NOT_VERIFIED":EnrollmentReportRecords.download(terminal,r.containsKey("bytes")?new EnrollmentReportRecords.Prepared(((Number)r.get("bytes")).intValue(),(String)r.get("sha256")):null,control.read(EnrollmentControl.slot(i)+".destination")!=null)!=null?"VERIFIED":"UNCERTAIN");reports.add(r);}summary.put("reports",reports);return summary;}
 public Map<String,Object> prepare(int number,int sequence,String session)throws Exception{
  begin();String slot=EnrollmentControl.slot(number);ObservedEnrollment.State state=idle(sequence,session);ObservedEnrollment.require(state!=null||number==1,"REPORT_PREFLIGHT_SLOT");purpose(number,sequence,session,state);ObservedEnrollment.require(!control.names().stream().anyMatch(n->n.startsWith(slot+".")),"REPORT_ID_CONSUMED");EnrollmentAccounting.Cut initial=owner.disk.accounting();EnrollmentReportBudget.prepare(initial.total,initial.free,number>=6);
  byte[] intent=("1|"+session+"|"+sequence+"|"+owner.store.head()+"|"+generation).getBytes(StandardCharsets.US_ASCII);live();control.publish(slot+".intent",intent,false,this::live);
  // Native journal reconstruction is read-only; it validates the complete original chain before collection.
  EnrollmentStore verified=new EnrollmentStore(owner.disk);ObservedEnrollment.require(verified.head().equals(owner.store.head())&&verified.sequence()==sequence,"REPORT_JOURNAL_CHANGED");
  EnrollmentAccounting.Cut cut=owner.disk.accounting();byte[] latest=null;ByteArrayOutputStream witnesses=new ByteArrayOutputStream();DataOutputStream wd=new DataOutputStream(witnesses);String previous="0".repeat(64);int logical=0,attempts=0;
  Set<String> journalNames=owner.disk.names();
  for(int physical=1;physical<=verified.consumedEvents();physical++){
   live();String name=EnrollmentStore.name(physical);boolean staged=journalNames.contains(name+".new");byte[] raw=staged?owner.disk.readStage(name):owner.disk.read(name,EnrollmentStore.EVENT_BYTES);byte[] bodyHash=new byte[32];String before=previous;
   if(!staged){DataInputStream d=new DataInputStream(new ByteArrayInputStream(raw));ObservedEnrollment.require(d.readInt()==2&&d.readInt()==++logical&&d.readInt()==physical&&d.readUTF().equals(previous),"REPORT_JOURNAL_CHAIN");int n=d.readInt();ObservedEnrollment.require(n>0&&n<=ObservedEnrollment.STATE_BYTES,"REPORT_STATE_LENGTH");byte[] body=new byte[n];d.readFully(body);ObservedEnrollment.require(d.readUTF().equals(ObservedEnrollment.hash(body))&&d.available()==0,"REPORT_STATE_HASH");bodyHash=EnrollmentEvidence.digest(body);attempts=ObservedEnrollment.State.read(body).attempts();latest=raw;previous=ObservedEnrollment.hash(raw);}
   wd.writeInt(physical);wd.writeInt(staged?0:logical);wd.writeInt(staged?1:0);wd.writeInt(raw.length);wd.write(hex(before));wd.write(EnrollmentEvidence.digest(raw));wd.write(bodyHash);wd.writeInt(attempts);wd.write(new byte[140]);
  }
  ObservedEnrollment.require(logical==sequence&&previous.equals(verified.head())&&witnesses.size()<=EnrollmentEvidence.WITNESSES,"REPORT_WITNESS_BOUND");
  ByteArrayOutputStream references=new ByteArrayOutputStream();Set<Integer> active=new HashSet<>();if(state!=null)for(ObservedEnrollment.Product p:state.products())for(int v=0;v<4;v++)if(p.view(v)!=null)active.add(p.view(v).job);
  for(ObservedEnrollment.Reference ref:verified.historicalReferences()){
   live();owner.verify(ref);EnrollmentDisk.Record disk=owner.disk.record(ref.job,false);byte[] block=EnrollmentEvidence.reference(ref,disk.read("geometry",4096),disk.read("receipt",1024),disk.read("feature-receipt",2048),disk.read("feature.bin",4096),active.contains(ref.job)?1:4);ObservedEnrollment.require(references.size()<=EnrollmentEvidence.REFERENCES-block.length,"REPORT_REFERENCES_BOUND");references.write(block);
  }
  ByteArrayOutputStream header=new ByteArrayOutputStream();DataOutputStream h=new DataOutputStream(header);h.writeUTF("p204-evidence-v1");for(String s:new String[]{owner.source,CameraProofFrame.MODEL,ObservedEnrollment.PROCESSING,ObservedEnrollment.ACQUISITION,apk(),session,control.descriptor()==null?"0".repeat(64):EnrollmentDescriptor.read(control.descriptor()).rosterHash,verified.head(),EnrollmentRootRegistry.hash()})h.writeUTF(s);h.writeInt(number);h.writeInt(sequence);h.writeInt(state==null?0:state.revision());h.writeBoolean(state!=null);byte[] descriptor=control.descriptor();h.writeInt(descriptor==null?0:descriptor.length);if(descriptor!=null)h.write(descriptor);h.writeInt(verified.historicalReferences().size());h.writeInt(verified.consumedEvents());h.writeInt(1);for(long n:new long[]{cut.historical,cut.integrated,cut.reserved,cut.external,cut.total,cut.free,EnrollmentRootRegistry.HISTORICAL_CLAIM,EnrollmentRootRegistry.STANDALONE_CLAIM})h.writeLong(n);h.flush();
  ByteArrayOutputStream event=new ByteArrayOutputStream();DataOutputStream e=new DataOutputStream(event);e.writeInt(latest==null?0:latest.length);if(latest!=null)e.write(latest);
  // Mark content verification only where this collection actually checked the bytes.
  Set<Integer> referenced=new HashSet<>();for(ObservedEnrollment.Reference ref:verified.historicalReferences())referenced.add(ref.job);
  EnrollmentAccounting.Cut after=owner.disk.accounting();ObservedEnrollment.require(Arrays.equals(cut.bytes(),after.bytes()),"REPORT_INVENTORY_CHANGED");
  for(EnrollmentAccounting.Row row:cut.rows){if(row.root==100&&!row.leaf.isEmpty()&&!row.leaf.equals("owner.lock")&&!row.leaf.endsWith(".new"))row.status=3;
   if(row.root>100&&row.root<=164){int job=row.root-100;row.disposition=active.contains(job)?1:referenced.contains(job)?2:job<=attempts?3:4;if(referenced.contains(job)&&Arrays.asList("original.jpeg","crop.png","geometry","receipt","feature.bin","feature-receipt").contains(row.leaf))row.status=4;}
   if(row.root==200&&row.leaf.equals("session"))row.status=5;
  }
  byte[] bytes=EnrollmentEvidence.encode(new byte[][]{header.toByteArray(),event.toByteArray(),references.size()==0?new byte[]{0}:references.toByteArray(),witnesses.size()==0?new byte[]{0}:witnesses.toByteArray(),cut.bytes()});
  live();ObservedEnrollment.require(owner.store.head().equals(verified.head()),"REPORT_JOURNAL_CHANGED");control.publish(slot+".bin",bytes,true,this::live);live();control.publish(slot+".result",(bytes.length+"|"+ObservedEnrollment.hash(bytes)).getBytes(StandardCharsets.US_ASCII),true,this::live);return result(number);
 }
 private void purpose(int number,int sequence,String session,ObservedEnrollment.State state)throws Exception{
  if(number<6)return;EnrollmentReportPurpose.validate(number,sequence,session,state,owner.store.historicalReferences().size());
  if(number==8)EnrollmentReportPurpose.pre(control.decision(7,owner.source,session),control.read("R07.result"),control.read("R07.intent"),session,sequence,owner.store.head());
 }
 public Map<String,Object> result(int number)throws Exception{String slot=EnrollmentControl.slot(number);Map<String,Object> m=new LinkedHashMap<>();m.put("report",number);byte[] r=control.read(slot+".result");m.put("status",r==null?(control.names().stream().anyMatch(n->n.startsWith(slot+"."))?"CONSUMED_UNCERTAIN":"NOT_PREPARED"):"PREPARED");if(r!=null){EnrollmentReportRecords.Prepared p=EnrollmentReportRecords.prepared(r);m.put("bytes",p.length);m.put("sha256",p.hash);}return m;}
 public byte[] exportBegin(int number,int sequence,String session)throws Exception{
  begin();idle(sequence,session);String slot=EnrollmentControl.slot(number);ObservedEnrollment.require(control.read(slot+".result")!=null,"REPORT_NOT_PREPARED");byte[] bytes=control.read(slot+".bin");ObservedEnrollment.require(EnrollmentReportRecords.session(control.read(slot+".intent")).equals(session),"REPORT_SESSION_CHANGED");EnrollmentEvidence.decode(bytes);String[] result=new String(control.read(slot+".result"),StandardCharsets.US_ASCII).split("\\|");ObservedEnrollment.require(bytes.length==Long.parseLong(result[0])&&ObservedEnrollment.hash(bytes).equals(result[1]),"REPORT_INTERNAL_CHANGED");
  control.publish(slot+".export-intent",("1|"+session+"|"+generation+"|"+bytes.length+"|"+result[1]).getBytes(StandardCharsets.US_ASCII),true,this::live);exporting=number;exportingPrepared=new EnrollmentReportRecords.Prepared(bytes.length,result[1]);transfer=true;picker=true;return bytes;
 }
 public void destination(String uri)throws Exception{ObservedEnrollment.require(transfer&&uri.length()<=4096,"REPORT_TRANSFER_STATE");control.publish(EnrollmentControl.slot(exporting)+".destination",uri.getBytes(StandardCharsets.UTF_8),true,this::live);}
 public void pickerReturned(){picker=false;}
 public void transferCheck(){live();ObservedEnrollment.require(transfer,"REPORT_TRANSFER_STATE");}
 public EnrollmentTransferDiagnostic.Result admissionFailure(int number,EnrollmentTransferDiagnostic.Failure failure,int elapsed){EnrollmentReportRecords.Prepared p=exportingPrepared;ObservedEnrollment.require(number==exporting&&p!=null,"TRANSFER_ADMISSION_BINDING");return new EnrollmentTransferDiagnostic.Result(false,EnrollmentTransferDiagnostic.Phase.ADMISSION,failure,null,null,elapsed,p.length,p.hash,"","");}
 public void transferEnd(byte[] terminal)throws Exception{EnrollmentTransferDiagnostic.Result r=EnrollmentTransferDiagnostic.parse(terminal);try{control.publish(EnrollmentControl.slot(exporting)+".export-result",terminal,true,r.verified?this::live:()->{});}finally{transfer=false;picker=false;cancelled=true;}}
 /** Exact fixed-slot read; deliberately does not invoke begin(), idle(), accounting or cancellation. */
 public static Map<String,Object> status(Context context,String source,int number,String session)throws Exception{
  ObservedEnrollment.require(number>=1&&number<=EnrollmentControl.MAX_REPORTS&&session!=null&&session.matches("[A-Za-z0-9][A-Za-z0-9-]{0,63}"),"TRANSFER_STATUS_REQUEST");
  if(number>=6){EnrollmentControl cold=new EnrollmentControl(context.getFilesDir().getCanonicalFile(),new EnrollmentControl.Quota(){public void check(long a,long b){throw new IllegalStateException("READ_ONLY");}public void physical(long a){throw new IllegalStateException("READ_ONLY");}});return cold.decision(number,source,session).status(number,session);}
  Map<String,Object> active=EnrollmentReportTransfer.status(source,number,session);if(active!=null)return active;
  EnrollmentControl disk=new EnrollmentControl(context.getFilesDir().getCanonicalFile(),new EnrollmentControl.Quota(){public void check(long a,long b){throw new IllegalStateException("READ_ONLY");}public void physical(long a){throw new IllegalStateException("READ_ONLY");}});
  byte[] descriptor=disk.descriptor();if(descriptor!=null){EnrollmentDescriptor d=EnrollmentDescriptor.read(descriptor);ObservedEnrollment.require(d.experiment.equals(session)&&EnrollmentInitialization.sourceMatches(d,source),"TRANSFER_STATUS_SESSION");}
  String slot=EnrollmentControl.slot(number);byte[] intent=disk.read(slot+".intent");if(intent==null)return EnrollmentReportTransfer.statusMap(number,session,"NOT_STARTED","","CALLBACK");
  ObservedEnrollment.require(EnrollmentReportRecords.session(intent).equals(session),"TRANSFER_STATUS_SESSION");byte[] terminal=disk.read(slot+".export-result");if(terminal==null)return EnrollmentReportTransfer.statusMap(number,session,disk.read(slot+".export-intent")==null?"NOT_STARTED":"UNCERTAIN","","CALLBACK");
  byte[] prepared=disk.read(slot+".result");boolean verified=EnrollmentReportRecords.download(terminal,prepared==null?null:EnrollmentReportRecords.prepared(prepared),disk.read(slot+".destination")!=null)!=null;
  String text=new String(terminal,StandardCharsets.US_ASCII);return EnrollmentReportTransfer.statusMap(number,session,verified?"VERIFIED":"UNCERTAIN",text,(text.startsWith("P204T1|")||text.startsWith("P204T2|")||text.startsWith("P204T3|"))?EnrollmentTransferDiagnostic.parse(terminal).phase.name():"COMPLETE");
 }
 public boolean transfer(){return transfer;}
 private static byte[] hex(String value){ObservedEnrollment.digest(value);byte[] b=new byte[32];for(int i=0;i<32;i++)b[i]=(byte)Integer.parseInt(value.substring(i*2,i*2+2),16);return b;}
}

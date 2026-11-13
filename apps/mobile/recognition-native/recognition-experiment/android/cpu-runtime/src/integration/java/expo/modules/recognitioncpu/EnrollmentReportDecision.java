package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** One prospective R06-R08 decision. Reconciliation proves a present private cut, never a prior acknowledgment. */
public final class EnrollmentReportDecision {
 public interface Disk { Cut cut(int number)throws Exception; byte[] read(String leaf)throws Exception; }
 public interface Live { Snapshot read(); }
 public static final class Cut {public final String token;public final Set<String> names;public Cut(String token,Set<String> names){this.token=token;this.names=Collections.unmodifiableSet(new TreeSet<>(names));}public boolean same(Cut c){return c!=null&&token.equals(c.token)&&names.equals(c.names);}}
 public static final class Snapshot {
  public final Object token;public final Map<String,Object> status;
  public Snapshot(Object token,Map<String,Object> status){this.token=token;this.status=status==null?null:Collections.unmodifiableMap(new LinkedHashMap<>(status));}
 }
 public final String state,basis,acknowledgment,terminal,phase;public final boolean stableCut;
 private final EnrollmentReportRecords.Prepared positive;
 private EnrollmentReportDecision(String state,String basis,String ack,String terminal,String phase,boolean stable,EnrollmentReportRecords.Prepared positive){this.state=state;this.basis=basis;acknowledgment=ack;this.terminal=terminal;this.phase=phase;stableCut=stable;this.positive=positive;}
 private static void require(boolean value){ObservedEnrollment.require(value,"REPORT_RECONCILIATION");}
 private static EnrollmentReportDecision unavailable(boolean stable){return new EnrollmentReportDecision("UNCERTAIN","PRIVATE_RECONCILIATION","UNKNOWN","","CALLBACK",stable,null);}
 public Long download(EnrollmentReportRecords.Prepared prepared){
  if(positive==null)return null;require(prepared!=null&&prepared.length==positive.length&&prepared.hash.equals(positive.hash));return Long.valueOf(positive.length);
 }
 public Map<String,Object> status(int number,String session){Map<String,Object> m=new LinkedHashMap<>();m.put("report",number);m.put("session",session);m.put("state",state);m.put("terminal",terminal);m.put("phase",phase);m.put("basis",basis);m.put("acknowledgment",acknowledgment);return m;}
 /** The caller must not hold the transfer lock over any disk call. Last live evidence wins a concurrent cold read. */
 public static EnrollmentReportDecision observe(Disk disk,Live live,String source,int number,String session){
  require(number>=6&&number<=8);Snapshot before;
  try{before=live.read();if(before.status!=null)return live(before.status,number,session);}catch(Exception e){return unavailable(false);}
  EnrollmentReportDecision cold=cold(disk,source,number,session);
  try{Snapshot after=live.read();if(after.status!=null)return live(after.status,number,session);if(before.token!=after.token)return unavailable(false);}catch(Exception e){return unavailable(false);}
  return cold;
 }
 private static EnrollmentReportDecision live(Map<String,Object> m,int number,String session){
  require(m.keySet().equals(new HashSet<>(Arrays.asList("report","session","state","terminal","phase","basis","acknowledgment")))&&Integer.valueOf(number).equals(m.get("report"))&&session.equals(m.get("session"))&&"LIVE".equals(m.get("basis")));
  String state=(String)m.get("state"),raw=(String)m.get("terminal"),phase=(String)m.get("phase"),ack=(String)m.get("acknowledgment");EnrollmentTransferDiagnostic.Phase.valueOf(phase);
  if(state.equals("PENDING")){require(raw.isEmpty()&&ack.equals("PENDING"));return new EnrollmentReportDecision(state,"LIVE",ack,raw,phase,true,null);}
  EnrollmentTransferDiagnostic.Result r=EnrollmentTransferDiagnostic.parse(raw.getBytes(StandardCharsets.US_ASCII));require(phase.equals(r.phase.name())&&state.equals(r.verified?"VERIFIED":"UNCERTAIN")&&ack.equals(r.verified?"ACKNOWLEDGED":"FAILED"));
  require(!r.verified||r.readback!=null&&r.readback.t3);
  return new EnrollmentReportDecision(state,"LIVE",ack,raw,phase,true,r.verified?new EnrollmentReportRecords.Prepared(r.length,r.hash):null);
 }
 private static EnrollmentReportDecision cold(Disk disk,String source,int number,String session){
  Cut before=null;EnrollmentReportDecision candidate=unavailable(true);
  try{
   before=disk.cut(number);ObservedEnrollment.digest(source);String slot=EnrollmentControl.slot(number);
   Set<String> expected=new TreeSet<>();for(String role:Arrays.asList("bin","intent","result","export-intent","destination","export-result"))expected.add(slot+"."+role);Set<String> actual=new TreeSet<>();for(String name:before.names)if(name.startsWith(slot+"."))actual.add(name);require(!before.names.contains("session.new"));
   byte[] descriptor=disk.read("session"),intent=disk.read(slot+".intent");
   if(intent==null){require(actual.isEmpty());candidate=new EnrollmentReportDecision("NOT_STARTED","PRIVATE_RECONCILIATION","UNKNOWN","","CALLBACK",true,null);}
   else{
    require(actual.equals(expected));byte[] internal=disk.read(slot+".bin"),prepared=disk.read(slot+".result"),export=disk.read(slot+".export-intent"),destination=disk.read(slot+".destination"),terminal=disk.read(slot+".export-result");
    require(descriptor!=null&&internal!=null&&prepared!=null&&export!=null&&destination!=null&&terminal!=null);
    EnrollmentDescriptor d=EnrollmentDescriptor.read(descriptor);require(d.experiment.equals(session)&&EnrollmentInitialization.sourceMatches(d,source)&&EnrollmentReportRecords.session(intent).equals(session));
    EnrollmentReportRecords.Prepared p=EnrollmentReportRecords.prepared(prepared);require(internal.length==p.length&&ObservedEnrollment.hash(internal).equals(p.hash));EnrollmentReportRecords.exportIntent(export,session,p);
    require(EnrollmentTransferPolicy.local(new String(destination,StandardCharsets.UTF_8),session,number));
    // Bind the prepared numerical container and purpose to the descriptor and intent, not just a scalar digest.
    bind(internal,descriptor,d,intent,source,number,session);
    String raw=new String(terminal,StandardCharsets.US_ASCII);EnrollmentTransferDiagnostic.Result r=EnrollmentTransferDiagnostic.parse(terminal);require(r.length==p.length&&r.hash.equals(p.hash));
    if(r.verified){require(r.readback!=null&&r.readback.t3&&EnrollmentReportRecords.download(terminal,p,true)!=null);candidate=new EnrollmentReportDecision("VERIFIED","PRIVATE_RECONCILIATION","UNKNOWN",raw,r.phase.name(),true,p);}
    else candidate=new EnrollmentReportDecision("UNCERTAIN","PRIVATE_RECONCILIATION","UNKNOWN",raw,r.phase.name(),true,null);
   }
  }catch(Exception e){candidate=unavailable(true);}
  // Even a missing/invalid role is a negative observation of one stable cut; an unreadable/changing cut is a refusal.
  try{if(before==null||!before.same(disk.cut(number)))return unavailable(false);}catch(Exception e){return unavailable(false);}
  return candidate;
 }
 private static String hash(DataInputStream in)throws Exception{String h=in.readUTF();ObservedEnrollment.digest(h);return h;}
 private static void bind(byte[] internal,byte[] descriptor,EnrollmentDescriptor d,byte[] intent,String source,int number,String session)throws Exception{
  byte[][] sections=EnrollmentEvidence.decode(internal);DataInputStream h=new DataInputStream(new ByteArrayInputStream(sections[0]));require(h.readUTF().equals("p204-evidence-v1")&&hash(h).equals(source)&&hash(h).equals(CameraProofFrame.MODEL)&&h.readUTF().equals(ObservedEnrollment.PROCESSING)&&h.readUTF().equals(ObservedEnrollment.ACQUISITION));hash(h);
  require(h.readUTF().equals(session)&&hash(h).equals(d.rosterHash));String head=hash(h);require(hash(h).equals(EnrollmentRootRegistry.hash())&&h.readInt()==number);int sequence=h.readInt(),revision=h.readInt();require(h.readBoolean());int size=h.readInt();require(size==descriptor.length);byte[] embedded=new byte[size];h.readFully(embedded);require(Arrays.equals(embedded,descriptor));int references=h.readInt(),witnesses=h.readInt();require(references>=0&&references<=64&&witnesses>=sequence&&witnesses<=4096&&h.readInt()==1);for(int i=0;i<8;i++)require(h.readLong()>=0);require(h.available()==0);
  String[] cut=new String(intent,StandardCharsets.US_ASCII).split("\\|",-1);require(cut[2].equals(Integer.toString(sequence))&&cut[3].equals(head));
  DataInputStream event=new DataInputStream(new ByteArrayInputStream(sections[1]));int length=event.readInt();require(length>0&&length<=EnrollmentStore.EVENT_BYTES&&length==event.available());byte[] raw=new byte[length];event.readFully(raw);require(ObservedEnrollment.hash(raw).equals(head));DataInputStream e=new DataInputStream(new ByteArrayInputStream(raw));require(e.readInt()==2&&e.readInt()==sequence);int physical=e.readInt();require(physical>=sequence&&physical<=witnesses);hash(e);int bodySize=e.readInt();require(bodySize>0&&bodySize<=ObservedEnrollment.STATE_BYTES&&bodySize<=e.available());byte[] body=new byte[bodySize];e.readFully(body);require(hash(e).equals(ObservedEnrollment.hash(body))&&e.available()==0);ObservedEnrollment.State state=ObservedEnrollment.State.read(body);require(state.revision()==revision&&state.pending()==null&&state.candidate()==null&&state.products().stream().noneMatch(p->p.barcode()==ObservedEnrollment.Barcode.PENDING||p.barcode()==ObservedEnrollment.Barcode.CONFLICT));d.validate(state);EnrollmentReportPurpose.validate(number,sequence,session,state,references);
 }
}

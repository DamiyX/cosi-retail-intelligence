package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Production reconciliation/decision/status/charge/PRE predicates on numerical fixtures, not Android filesystem proof. */
public final class EnrollmentReportDecisionChecks {
 static int checks;static final String UUID="11111111-1111-1111-1111-111111111111";
 static void ok(boolean b){if(!b)throw new AssertionError();checks++;}
 interface Action{void run()throws Exception;}
 static void no(Action a)throws Exception{try{a.run();}catch(Exception e){checks++;return;}throw new AssertionError("invalid admitted");}
 static byte[] b(String s){return s.getBytes(StandardCharsets.US_ASCII);}
 static String text(byte[] b){return new String(b,StandardCharsets.US_ASCII);}
 static final class Fixture implements EnrollmentReportDecision.Disk {
  final TreeMap<String,byte[]> files=new TreeMap<>();final String source,session,head;final int number,sequence;int cuts,reads;boolean changing,unreadable;
  Fixture(byte[] bytes)throws Exception{
   byte[][] parts=EnrollmentEvidence.decode(bytes);DataInputStream h=new DataInputStream(new ByteArrayInputStream(parts[0]));String[] s=new String[10];for(int i=0;i<10;i++)s[i]=h.readUTF();source=s[1];session=s[6];head=s[8];number=h.readInt();sequence=h.readInt();h.readInt();h.readBoolean();byte[] descriptor=new byte[h.readInt()];h.readFully(descriptor);String slot="R0"+number,digest=ObservedEnrollment.hash(bytes);
   files.put("session",descriptor);files.put(slot+".intent",b("1|"+session+"|"+sequence+"|"+head+"|"+UUID));files.put(slot+".bin",bytes);files.put(slot+".result",b(bytes.length+"|"+digest));files.put(slot+".export-intent",b("1|"+session+"|"+UUID+"|"+bytes.length+"|"+digest));files.put(slot+".destination",b("content://com.android.externalstorage.documents/document/primary%3ADownload%2Fp204-evidence-"+session+"-"+slot+".bin"));files.put(slot+".export-result",b(terminal(bytes.length,digest)));
  }
  Fixture(Fixture f){source=f.source;session=f.session;head=f.head;number=f.number;sequence=f.sequence;f.files.forEach((k,v)->files.put(k,v.clone()));}
  public EnrollmentReportDecision.Cut cut(int n){cuts++;StringBuilder token=new StringBuilder(changing?Integer.toString(cuts):"stable");files.forEach((k,v)->token.append('|').append(k).append(':').append(ObservedEnrollment.hash(v)));return new EnrollmentReportDecision.Cut(token.toString(),files.keySet());}
  public byte[] read(String name)throws Exception{reads++;if(unreadable)throw new IOException("fixture");byte[] value=files.get(name);return value==null?null:value.clone();}
  EnrollmentReportDecision observe(){return EnrollmentReportDecision.observe(this,()->new EnrollmentReportDecision.Snapshot(null,null),source,number,session);}
  EnrollmentReportRecords.Prepared prepared(){return EnrollmentReportRecords.prepared(files.get("R0"+number+".result"));}
 }
 static String terminal(int n,String hash){String start="78:1787915:33200:10257:1:"+n+":1794216911:186000039:1794216911:186000039",end=start.substring(0,start.lastIndexOf(':')+1)+"242000039";return String.join("|","P204T3","VERIFIED","COMPLETE","NONE","NONE","NONE","100",Integer.toString(n),hash,start,start,"NONE","MATCH","MATCH","ADVANCED","NONE",end,"OBSERVED",Integer.toString(n),hash,"1");}
 static EnrollmentReportDecision live(Fixture f,String state,String raw){String phase=state.equals("PENDING")?"TERMINAL":EnrollmentTransferDiagnostic.parse(b(raw)).phase.name();Map<String,Object> status=EnrollmentReportTransfer.statusMap(f.number,f.session,state,raw,phase);return EnrollmentReportDecision.observe(f,()->new EnrollmentReportDecision.Snapshot(status,status),f.source,f.number,f.session);}
 static String negative(String raw){String[] a=raw.split("\\|",-1);a[1]="UNCERTAIN";a[2]="TERMINAL";a[5]="TERMINAL~ERRNO~ERRNO~5";return String.join("|",a);}
 public static void main(String[] args)throws Exception{
  Fixture[] fixtures={new Fixture(Files.readAllBytes(Path.of(args[0]))),new Fixture(Files.readAllBytes(Path.of(args[1]))),new Fixture(Files.readAllBytes(Path.of(args[2])))};
  for(Fixture f:fixtures){var d=f.observe();ok(d.state.equals("VERIFIED")&&d.basis.equals("PRIVATE_RECONCILIATION")&&d.acknowledgment.equals("UNKNOWN")&&d.stableCut);ok(d.download(f.prepared()).equals((long)f.prepared().length));ok(d.status(f.number,f.session).size()==7&&f.cuts==2&&f.reads==7);long[] charge=EnrollmentReportBudget.slot(f.prepared().length,1000,true,f.prepared().length,d.download(f.prepared()));ok(charge[1]==4194304L+f.prepared().length);}
  Fixture base=fixtures[0];String slot="R06",raw=text(base.files.get(slot+".export-result"));
  for(String role:new ArrayList<>(base.files.keySet())){Fixture f=new Fixture(base);f.files.remove(role);var d=f.observe();ok(!d.state.equals("VERIFIED")&&d.stableCut&&d.download(base.prepared())==null);}
  for(String role:new ArrayList<>(base.files.keySet())){Fixture f=new Fixture(base);byte[] value=f.files.get(role);if(role.equals("R06.intent"))value[2]^=1;else value[value.length-1]^=1;ok(f.observe().download(base.prepared())==null);}
  for(String role:new ArrayList<>(base.files.keySet())){Fixture f=new Fixture(base);f.files.put(role+".new",b("stage"));ok(f.observe().download(base.prepared())==null);}
  for(String bad:new String[]{"1|foreign|24|"+base.head+"|"+UUID,"1|"+base.session+"|25|"+base.head+"|"+UUID,"1|"+base.session+"|24|"+"0".repeat(64)+"|"+UUID}){Fixture f=new Fixture(base);f.files.put(slot+".intent",b(bad));ok(f.observe().download(base.prepared())==null);}
  Fixture wrongDest=new Fixture(base);wrongDest.files.put(slot+".destination",b(text(wrongDest.files.get(slot+".destination")).replace("R06.bin","R07.bin")));ok(wrongDest.observe().download(base.prepared())==null);
  ok(EnrollmentReportDecision.observe(base,()->new EnrollmentReportDecision.Snapshot(null,null),"b".repeat(64),6,base.session).download(base.prepared())==null);
  ok(EnrollmentReportDecision.observe(base,()->new EnrollmentReportDecision.Snapshot(null,null),base.source,7,base.session).download(base.prepared())==null);
  Fixture changing=new Fixture(base);changing.changing=true;ok(!changing.observe().stableCut);Fixture unreadable=new Fixture(base);unreadable.unreadable=true;ok(unreadable.observe().download(base.prepared())==null);
  Fixture failed=new Fixture(base);failed.files.put(slot+".export-result",b(negative(raw)));var failedDecision=failed.observe();ok(failedDecision.state.equals("UNCERTAIN")&&failedDecision.acknowledgment.equals("UNKNOWN")&&failedDecision.download(base.prepared())==null);
  Fixture old=new Fixture(base);String[] t2=Arrays.copyOf(raw.split("\\|",-1),16);t2[0]="P204T2";t2[14]="MATCH";old.files.put(slot+".export-result",b(String.join("|",t2)));ok(old.observe().download(base.prepared())==null);ok(EnrollmentReportRecords.download(b(String.join("|",t2)),base.prepared(),true)!=null);
  Fixture pending=new Fixture(base);var p=live(pending,"PENDING","");ok(p.state.equals("PENDING")&&p.download(base.prepared())==null&&pending.reads==0&&pending.cuts==0);
  Fixture liveFailed=new Fixture(base);var lf=live(liveFailed,"UNCERTAIN",negative(raw));ok(lf.acknowledgment.equals("FAILED")&&lf.download(base.prepared())==null&&liveFailed.reads==0&&liveFailed.cuts==0);ok(EnrollmentReportBudget.slot(base.prepared().length,1000,true,base.prepared().length,lf.download(base.prepared()))[1]==8388608L);
  Fixture acknowledged=new Fixture(base);var ack=live(acknowledged,"VERIFIED",raw);ok(ack.acknowledgment.equals("ACKNOWLEDGED")&&ack.download(base.prepared())!=null&&acknowledged.reads==0);
  for(String state:new String[]{"PENDING","UNCERTAIN"}){int[] calls={0};Map<String,Object> m=EnrollmentReportTransfer.statusMap(6,base.session,state,state.equals("PENDING")?"":negative(raw),"TERMINAL");var raced=EnrollmentReportDecision.observe(new Fixture(base),()->++calls[0]==1?new EnrollmentReportDecision.Snapshot(null,null):new EnrollmentReportDecision.Snapshot(m,m),base.source,6,base.session);ok(raced.basis.equals("LIVE")&&raced.state.equals(state)&&raced.download(base.prepared())==null);}
  int[] epoch={0};var conflict=EnrollmentReportDecision.observe(new Fixture(base),()->new EnrollmentReportDecision.Snapshot(++epoch[0],null),base.source,6,base.session);ok(!conflict.stableCut);
  Fixture pre=fixtures[1];EnrollmentReportDecision recovered=pre.observe();EnrollmentReportPurpose.pre(recovered,pre.files.get("R07.result"),pre.files.get("R07.intent"),pre.session,pre.sequence,pre.head);checks++;no(()->EnrollmentReportPurpose.pre(recovered,pre.files.get("R07.result"),pre.files.get("R07.intent"),pre.session,pre.sequence+1,pre.head));no(()->EnrollmentReportPurpose.pre(live(pre,"UNCERTAIN",negative(text(pre.files.get("R07.export-result")))),pre.files.get("R07.result"),pre.files.get("R07.intent"),pre.session,pre.sequence,pre.head));
  System.out.println("Production reconciliation/decision/status/charge/PRE checks: "+checks);
 }
}

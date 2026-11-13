package expo.modules.recognitioncpu;

import java.nio.charset.StandardCharsets;
import java.util.*;

/** Fixed existing evidence only; no caller can choose a file, report, session or expected bytes. */
public final class EnrollmentReadBinding {
 public interface Disk {byte[] read(String leaf)throws Exception;Set<String> names()throws Exception;}
 public static final class Bound {
  public final String destination,intent;public final byte[] originalTerminal;
  Bound(String d,String i,byte[] t){destination=d;intent=i;originalTerminal=t.clone();}
 }
 private static byte[] required(Disk d,String n)throws Exception{byte[] b=d.read(n);ObservedEnrollment.require(b!=null,"READ_BINDING_MISSING");return b;}
 public static Bound inspect(Disk d,String source)throws Exception{
  ObservedEnrollment.digest(source);Set<String> names=d.names();EnrollmentReportRecords.shape(names,"R04");EnrollmentReadDiagnostic.shape(names);ObservedEnrollment.require(!names.contains("session.new"),"READ_DESCRIPTOR_STAGE");
  byte[] descriptor=required(d,"session");ObservedEnrollment.require(EnrollmentInitialization.original(EnrollmentDescriptor.read(descriptor)),"READ_DESCRIPTOR");
  byte[] prepared=required(d,"R04.result"),exportIntent=required(d,"R04.export-intent"),terminal=required(d,"R04.export-result"),destination=required(d,"R04.destination");
  ObservedEnrollment.require(EnrollmentReportRecords.session(required(d,"R04.intent")).equals(EnrollmentReadDiagnostic.SESSION),"READ_SESSION");EnrollmentReportRecords.Prepared p=EnrollmentReportRecords.prepared(prepared);ObservedEnrollment.require(p.length==EnrollmentReadDiagnostic.LENGTH&&p.hash.equals(EnrollmentReadDiagnostic.HASH),"READ_PREPARED");EnrollmentReportRecords.exportIntent(exportIntent,EnrollmentReadDiagnostic.SESSION,p);
  EnrollmentTransferDiagnostic.Result t=EnrollmentTransferDiagnostic.parse(terminal);
  ObservedEnrollment.require(!t.verified&&t.phase==EnrollmentTransferDiagnostic.Phase.READBACK&&t.primary!=null&&t.primary.phase==EnrollmentTransferDiagnostic.Phase.READBACK&&t.primary.code==EnrollmentTransferDiagnostic.Code.READBACK&&t.primary.kind==EnrollmentTransferDiagnostic.Kind.STATE&&t.primary.errno==0&&t.cleanup==null&&t.close==null&&t.terminal==null&&t.elapsed==31309&&t.length==p.length&&t.hash.equals(p.hash)&&t.written.equals(EnrollmentReadDiagnostic.ORIGINAL_IDENTITY)&&t.reopened.equals(t.written),"READ_ORIGINAL_TERMINAL");
  String uri=new String(destination,StandardCharsets.UTF_8);ObservedEnrollment.require(Arrays.equals(destination,uri.getBytes(StandardCharsets.UTF_8))&&uri.equals("content://com.android.externalstorage.documents/document/primary%3ADownload%2Fp204-evidence-enrollment-mw4zmxro-R04.bin"),"READ_DESTINATION");
  String intent=String.join("|","P204RDI1",source,EnrollmentReadDiagnostic.SESSION,ObservedEnrollment.hash(descriptor),ObservedEnrollment.hash(prepared),ObservedEnrollment.hash(exportIntent),ObservedEnrollment.hash(destination),ObservedEnrollment.hash(terminal));ObservedEnrollment.require(intent.length()<=2048,"READ_INTENT_BOUND");return new Bound(uri,intent,terminal);
 }
 public static void validateIntent(byte[] bytes,String source,Bound bound){ObservedEnrollment.require(bytes!=null&&Arrays.equals(bytes,bound.intent.getBytes(StandardCharsets.US_ASCII)),"READ_INTENT_BINDING");}
 public static void saved(Disk d)throws Exception{Set<String> names=d.names();EnrollmentReadDiagnostic.shape(names);if(!names.contains(EnrollmentReadDiagnostic.INTENT)){if(names.contains(EnrollmentReadDiagnostic.INTENT+".new"))inspect(d,"0".repeat(64));return;}byte[] raw=required(d,EnrollmentReadDiagnostic.INTENT);String[] fields=new String(raw,StandardCharsets.US_ASCII).split("\\|",-1);ObservedEnrollment.require(fields.length==8,"READ_INTENT_SCHEMA");Bound b=inspect(d,fields[1]);validateIntent(raw,fields[1],b);if(names.contains(EnrollmentReadDiagnostic.RESULT)){EnrollmentReadDiagnostic.Facts f=EnrollmentReadDiagnostic.parse(required(d,EnrollmentReadDiagnostic.RESULT));ObservedEnrollment.require(f.intentHash.equals(ObservedEnrollment.hash(raw)),"READ_RESULT_BINDING");}}
 private EnrollmentReadBinding(){}
}

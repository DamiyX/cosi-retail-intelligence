package expo.modules.recognitioncpu;
import java.nio.charset.StandardCharsets;
import java.util.*;
/** Pure append-only receipt rules, shared by actual disk checks and host fault tests. */
public final class EnrollmentReportRecords {
 private EnrollmentReportRecords(){}
 public static final class Prepared {public final int length;public final String hash;Prepared(int n,String h){length=n;hash=h;}}
 public static Prepared prepared(byte[] bytes){String s=new String(bytes,StandardCharsets.US_ASCII);String[] a=s.split("\\|",-1);ObservedEnrollment.require(a.length==2&&a[0].matches("[1-9][0-9]{0,6}")&&a[1].matches("[a-f0-9]{64}"),"REPORT_RESULT_SCHEMA");int n=Integer.parseInt(a[0]);ObservedEnrollment.require(n<=EnrollmentEvidence.HARD,"REPORT_RESULT_SIZE");return new Prepared(n,a[1]);}
 public static String session(byte[] bytes){String[] a=new String(bytes,StandardCharsets.US_ASCII).split("\\|",-1);ObservedEnrollment.require(a.length==5&&a[0].equals("1")&&a[1].matches("[A-Za-z0-9][A-Za-z0-9-]{0,63}")&&a[2].matches("0|[1-9][0-9]{0,3}")&&Integer.parseInt(a[2])<=4096&&a[3].matches("[a-f0-9]{64}")&&a[4].matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"),"REPORT_INTENT_SCHEMA");return a[1];}
 public static void shape(Set<String> names,String slot){
  boolean intent=names.contains(slot+".intent"),stage=names.contains(slot+".intent.new");
  ObservedEnrollment.require(!(intent&&stage),"REPORT_DUPLICATE_INTENT");
  for(String n:names)if(n.startsWith(slot+".")){
   ObservedEnrollment.require(intent||stage&&n.equals(slot+".intent.new"),"REPORT_WITHOUT_INTENT");
   if(!n.endsWith(".new"))ObservedEnrollment.require(!names.contains(n+".new"),"REPORT_DUPLICATE_CONTROL_STAGE");
  }
  if(names.contains(slot+".result")||names.contains(slot+".result.new"))ObservedEnrollment.require(names.contains(slot+".bin")&&!names.contains(slot+".bin.new"),"REPORT_RESULT_WITHOUT_INTERNAL");
  for(String role:Arrays.asList("export-intent","destination","export-result"))if(names.contains(slot+"."+role)||names.contains(slot+"."+role+".new"))ObservedEnrollment.require(names.contains(slot+".result"),"TRANSFER_WITHOUT_PREPARED");
  if(names.contains(slot+".destination")||names.contains(slot+".destination.new")||names.contains(slot+".export-result")||names.contains(slot+".export-result.new"))ObservedEnrollment.require(names.contains(slot+".export-intent"),"TRANSFER_WITHOUT_INTENT");
 }
 public static void exportIntent(byte[] bytes,String session,Prepared prepared){String[] a=new String(bytes,StandardCharsets.US_ASCII).split("\\|",-1);ObservedEnrollment.require(a.length==5&&a[0].equals("1")&&a[1].equals(session)&&a[2].matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}")&&prepared!=null&&a[3].equals(Integer.toString(prepared.length))&&a[4].equals(prepared.hash),"TRANSFER_INTENT_BINDING");}
 public static Long download(byte[] result,Prepared prepared,boolean destination){
  if(result==null)return null;
  if(result.length>=7&&new String(result,StandardCharsets.US_ASCII).matches("P204T[123]\\|.*")){EnrollmentTransferDiagnostic.Result r=EnrollmentTransferDiagnostic.parse(result);ObservedEnrollment.require(prepared!=null&&r.length==prepared.length&&r.hash.equals(prepared.hash),"TRANSFER_RESULT_BINDING");if(!r.verified)return null;ObservedEnrollment.require(destination,"TRANSFER_RESULT_BINDING");return Long.valueOf(prepared.length);}
  String[] a=new String(result,StandardCharsets.US_ASCII).split("\\|",-1);if(a.length==1&&a[0].equals("UNCERTAIN"))return null;
  ObservedEnrollment.require(a.length==4&&a[0].equals("VERIFIED")&&prepared!=null&&destination&&a[1].equals(Integer.toString(prepared.length))&&a[2].equals(prepared.hash)&&a[3].matches("[0-9]{1,20}(:[0-9]{1,20}){9}")&&a[3].split(":")[4].equals("1")&&a[3].split(":")[5].equals(Integer.toString(prepared.length)),"TRANSFER_RESULT_BINDING");return Long.valueOf(prepared.length);
 }
}

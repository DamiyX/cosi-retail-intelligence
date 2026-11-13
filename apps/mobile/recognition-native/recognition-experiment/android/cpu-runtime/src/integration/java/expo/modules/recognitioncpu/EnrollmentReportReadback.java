package expo.modules.recognitioncpu;

import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Locale;

/** The original export's one forward read. The caller owns both descriptor closes. */
public final class EnrollmentReportReadback {
 public interface Check { void run() throws Exception; }
 public interface Identity { String read() throws Exception; }
 public static final class Facts {
  public String count="UNKNOWN",hash="UNKNOWN",stat="UNKNOWN";
  public Exception statFailure;
  public String finalIdentity="",sample="UNOBSERVED",actualHash="";public int total;public boolean eof;
 }
 public static void verify(InputStream in,int expected,String digest,String before,Check check,Identity identity,Facts facts)throws Exception {
  ObservedEnrollment.require(expected>0&&expected<=EnrollmentEvidence.HARD,"TRANSFER_READ_LIMIT");
  Exception failure=null;
  try {
   MessageDigest hash=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[65536];int total=0;
   while(true){
    check.run();int n=in.read(buffer,0,Math.min(buffer.length,expected-total+1));if(n<0)facts.eof=true;else facts.total=total+n;check.run();
    if(n<0)break;
    facts.total=total+n;
    if(n>expected-total){facts.count="LONG";throw new IllegalStateException("TRANSFER_READ_LIMIT");}
    total+=n;hash.update(buffer,0,n);
   }
   facts.count=total==expected?"MATCH":"SHORT";
   StringBuilder actual=new StringBuilder();for(byte b:hash.digest())actual.append(String.format(Locale.ROOT,"%02x",b&255));
   facts.actualHash=actual.toString();facts.hash=actual.toString().equals(digest)?"MATCH":"MISMATCH";
  }catch(Exception e){failure=e;}
  finally {
   // Final metadata is attempted even after count/hash/read/check failure, while fd is still owned.
   facts.count=facts.total>expected?"LONG":facts.eof?facts.total==expected?"MATCH":"SHORT":"UNKNOWN";
   sample(before,identity,facts);
  }
  // Read/limit/cancellation errors precede stat errors, then short/hash/identity mismatches.
  // Independent outcomes and stat failure survive this precedence in the versioned terminal.
  if(failure!=null)throw failure;
  if(facts.statFailure!=null)throw facts.statFailure;
  ObservedEnrollment.require(!facts.count.equals("SHORT"),"TRANSFER_READ_SHORT");
  ObservedEnrollment.require(!facts.hash.equals("MISMATCH"),"TRANSFER_READ_HASH");
  ObservedEnrollment.require(facts.stat.equals("MATCH")||facts.stat.equals("ADVANCED"),"TRANSFER_READ_CHANGED");
 }
 public static void sample(String before,Identity identity,Facts facts){
  ObservedEnrollment.require(facts.sample.equals("UNOBSERVED"),"TRANSFER_FINAL_STAT_REPEATED");facts.sample="FAILED";
  try{facts.finalIdentity=identity.read();facts.stat=new EnrollmentExportMetadata(before).comparison(new EnrollmentExportMetadata(facts.finalIdentity));facts.sample="OBSERVED";}catch(Exception e){facts.finalIdentity="";facts.statFailure=e;}
 }
 private EnrollmentReportReadback(){}
}

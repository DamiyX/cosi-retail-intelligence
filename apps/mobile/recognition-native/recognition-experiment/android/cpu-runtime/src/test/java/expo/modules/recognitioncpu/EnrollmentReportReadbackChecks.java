package expo.modules.recognitioncpu;
import java.io.*;
import java.util.*;

/** Host checks call the same verifier used by the export adapter. No Android/provider proof. */
public final class EnrollmentReportReadbackChecks {
 static int checks;
 static void require(boolean b){if(!b)throw new AssertionError();checks++;}
 static String identity(int size){return "1:2:33152:10264:1:"+size+":1:2:3:4";}
 public static void main(String[] args)throws Exception{
  byte[] data=new byte[150000];new Random(8).nextBytes(data);String hash=ObservedEnrollment.hash(data);
  for(int flags=0;flags<8;flags++){
   byte[] input=Arrays.copyOf(data,data.length-((flags&1)!=0?1:0));if((flags&2)!=0)input[0]^=1;
   EnrollmentReportReadback.Facts f=new EnrollmentReportReadback.Facts();final int mask=flags;int[] stats={0};Exception error=null;
   try{EnrollmentReportReadback.verify(new ByteArrayInputStream(input),data.length,hash,identity(data.length),()->{},()->{stats[0]++;return (mask&4)!=0?identity(data.length+1):identity(data.length);},f);}catch(Exception e){error=e;}
   require(stats[0]==1);require(f.count.equals((flags&1)!=0?"SHORT":"MATCH"));require(f.hash.equals((flags&3)!=0?"MISMATCH":"MATCH"));require(f.stat.equals((flags&4)!=0?"CHANGED":"MATCH"));require((error==null)==(flags==0));
   EnrollmentTransferDiagnostic.Readback facts=new EnrollmentTransferDiagnostic.Readback(f.count,f.hash,f.stat,null);
   EnrollmentTransferDiagnostic.Failure failure=error==null?null:new EnrollmentTransferDiagnostic.Failure(EnrollmentTransferDiagnostic.Phase.READBACK,EnrollmentTransferDiagnostic.Code.READBACK,EnrollmentTransferDiagnostic.Kind.STATE,0);
   EnrollmentTransferDiagnostic.Result r=new EnrollmentTransferDiagnostic.Result(error==null,error==null?EnrollmentTransferDiagnostic.Phase.COMPLETE:EnrollmentTransferDiagnostic.Phase.READBACK,failure,null,null,12,data.length,hash,identity(data.length),identity(data.length),null,facts);
   require(Arrays.equals(r.bytes(),EnrollmentTransferDiagnostic.parse(r.bytes()).bytes()));
   require((EnrollmentReportRecords.download(r.bytes(),EnrollmentReportRecords.prepared((data.length+"|"+hash).getBytes()),true)==null)==(error!=null));
  }
  for(String count:new String[]{"UNKNOWN","LONG"}){boolean refused=false;try{new EnrollmentTransferDiagnostic.Readback(count,"MATCH","MATCH",null);}catch(IllegalStateException e){refused=true;}require(refused);}
  for(String[] facts:new String[][]{{"SHORT","MISMATCH","MATCH"},{"UNKNOWN","UNKNOWN","UNKNOWN"},{"MATCH","MATCH","CHANGED"}}){boolean refused=false;try{new EnrollmentTransferDiagnostic.Result(true,EnrollmentTransferDiagnostic.Phase.COMPLETE,null,null,null,1,data.length,hash,identity(data.length),identity(data.length),null,new EnrollmentTransferDiagnostic.Readback(facts[0],facts[1],facts[2],null));}catch(IllegalStateException e){refused=true;}require(refused);}
  System.out.println("Production readback/codec/records checks: "+checks);
 }
}

package expo.modules.recognitioncpu;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Fixed, private-data-free terminal grammar. Reading/encoding never performs an effect. */
public final class EnrollmentTransferDiagnostic {
 public enum Phase { CALLBACK, ADMISSION, DESTINATION, WRITE, FLUSH, FSYNC, OUTPUT_CLOSE, REOPEN, IDENTITY, READBACK, READ_CLOSE, REVOKE, TERMINAL, COMPLETE }
 public enum Code { UNKNOWN, CANCELLED_OR_EXPIRED, DESTINATION, DESCRIPTOR, NOT_EMPTY_REGULAR, CAPACITY, WRITE_CHANGED, REOPEN_CHANGED, READ_LIMIT, READBACK, READ_SHORT, READ_HASH, READ_CHANGED, FOCUS_LOST, STALE, STATE, IO, SECURITY, ERRNO }
 public enum Kind { UNKNOWN, STATE, IO, SECURITY, ERRNO }
 public static final int MAX=4096;
 private static void require(boolean b){ObservedEnrollment.require(b,"TRANSFER_DIAGNOSTIC_SCHEMA");}
 public static final class Failure {
  public final Phase phase;public final Code code;public final Kind kind;public final int errno;
  public Failure(Phase p,Code c,Kind k,int e){require(p!=Phase.COMPLETE&&e>=0&&e<=4095&&(k==Kind.ERRNO||e==0)&&(c!=Code.ERRNO||k==Kind.ERRNO)&&(c!=Code.IO||k==Kind.IO)&&(c!=Code.SECURITY||k==Kind.SECURITY));phase=p;code=c;kind=k;errno=e;}
  public String wire(){return phase+"~"+code+"~"+kind+"~"+errno;}
 }
 public static Failure failure(String wire){if(wire.equals("NONE"))return null;String[] a=wire.split("~",-1);require(a.length==4&&a[3].matches("0|[1-9][0-9]{0,3}"));return new Failure(Phase.valueOf(a[0]),Code.valueOf(a[1]),Kind.valueOf(a[2]),Integer.parseInt(a[3]));}
 public static boolean identity(String s){return s.matches("[0-9]{1,20}(:[0-9]{1,20}){9}");}
 public static final class Readback {
  public final String count,hash,stat,finalIdentity,sample,actualHash;public final Failure statFailure;public final boolean t3,eof;public final int total;
  public Readback(String c,String h,String s,Failure failure){this(c,h,s,failure,"","",0,"",false,false);}
  public Readback(String c,String h,String s,Failure failure,String end,String observed,int total,String digest,boolean eof){this(c,h,s,failure,end,observed,total,digest,eof,true);}
  private Readback(String c,String h,String s,Failure failure,String end,String observed,int n,String digest,boolean eof,boolean version){
   require(Arrays.asList("UNKNOWN","MATCH","SHORT","LONG").contains(c)&&Arrays.asList("UNKNOWN","MATCH","MISMATCH").contains(h)&&Arrays.asList("UNKNOWN","MATCH","CHANGED").contains(s)||version&&Arrays.asList("UNKNOWN","MATCH","SHORT","LONG").contains(c)&&Arrays.asList("UNKNOWN","MATCH","MISMATCH").contains(h)&&s.equals("ADVANCED"));
   require(failure==null||failure.phase==Phase.READBACK&&s.equals("UNKNOWN"));require(!c.equals("UNKNOWN")&&!c.equals("LONG")||h.equals("UNKNOWN"));count=c;hash=h;stat=s;statFailure=failure;t3=version;finalIdentity=end;sample=observed;total=n;actualHash=digest;this.eof=eof;
  }
  public void validate(int expected,String digest,String before){
   if(!t3)return;EnrollmentExportMetadata first=new EnrollmentExportMetadata(before);require(first.regularSingleLength(expected)&&total>=0&&total<=expected+1&&Arrays.asList("UNOBSERVED","FAILED","OBSERVED").contains(sample));
   require(actualHash.isEmpty()||actualHash.matches("[a-f0-9]{64}")&&eof);require(count.equals(total>expected?"LONG":eof?total==expected?"MATCH":"SHORT":"UNKNOWN"));require(hash.equals(actualHash.isEmpty()?"UNKNOWN":actualHash.equals(digest)?"MATCH":"MISMATCH"));
   if(sample.equals("OBSERVED")){EnrollmentExportMetadata last=new EnrollmentExportMetadata(finalIdentity);require(statFailure==null&&stat.equals(first.comparison(last)));}
   else require(finalIdentity.isEmpty()&&stat.equals("UNKNOWN")&&(sample.equals("FAILED")?statFailure!=null:statFailure==null));
  }
  public boolean matches(){return count.equals("MATCH")&&hash.equals("MATCH")&&(stat.equals("MATCH")||t3&&stat.equals("ADVANCED"))&&statFailure==null&&(!t3||eof&&sample.equals("OBSERVED"));}
 }
 public static final class Result {
  public final Readback readback;public final boolean verified;public final Phase phase;public final Failure primary,cleanup,terminal,close;
  public final int elapsed,length;public final String hash,written,reopened;
  public Result(boolean v,Phase p,Failure a,Failure b,Failure c,int ms,int n,String h,String w,String r){this(v,p,a,b,c,ms,n,h,w,r,null);}
  public Result(boolean v,Phase p,Failure a,Failure b,Failure c,int ms,int n,String h,String w,String r,Failure close){this(v,p,a,b,c,ms,n,h,w,r,close,null);}
  public Result(boolean v,Phase p,Failure a,Failure b,Failure c,int ms,int n,String h,String w,String r,Failure close,Readback readback){
   this.readback=readback;if(readback!=null)readback.validate(n,h,r);require(!v||readback==null||readback.matches());
   if(readback!=null&&readback.t3)require(p==(v?Phase.COMPLETE:c!=null?Phase.TERMINAL:a!=null?a.phase:b!=null?b.phase:close!=null?close.phase:Phase.COMPLETE));
   require(ms>=0&&n>=0&&n<=4194304&&(h.isEmpty()||h.matches("[a-f0-9]{64}"))&&(w.isEmpty()||identity(w))&&(r.isEmpty()||identity(r)));
   require(close==null||close.phase==Phase.OUTPUT_CLOSE||close.phase==Phase.READ_CLOSE);this.close=close;require(c==null||c.phase==Phase.TERMINAL);require(b==null||b.phase==Phase.REVOKE);
   require(!v||(p==Phase.COMPLETE&&a==null&&b==null&&c==null&&close==null&&n>0&&!h.isEmpty()&&!w.isEmpty()&&w.equals(r)&&w.split(":")[4].equals("1")&&w.split(":")[5].equals(Integer.toString(n))));
   require(v||a!=null||b!=null||c!=null||close!=null);verified=v;phase=p;primary=a;cleanup=b;terminal=c;elapsed=ms;length=n;hash=h;written=w;reopened=r;
  }
  public byte[] bytes(){String s=(readback==null?"P204T1|":readback.t3?"P204T3|":"P204T2|")+(verified?"VERIFIED":"UNCERTAIN")+"|"+phase+"|"+wire(primary)+"|"+wire(cleanup)+"|"+wire(terminal)+"|"+elapsed+"|"+length+"|"+hash+"|"+written+"|"+reopened+"|"+wire(close)+(readback==null?"":"|"+readback.count+"|"+readback.hash+"|"+readback.stat+"|"+wire(readback.statFailure)+(readback.t3?"|"+readback.finalIdentity+"|"+readback.sample+"|"+readback.total+"|"+readback.actualHash+"|"+(readback.eof?"1":"0"):""));byte[] b=s.getBytes(StandardCharsets.US_ASCII);require(b.length<=MAX);return b;}
 }
 private static String wire(Failure f){return f==null?"NONE":f.wire();}
 public static Result parse(byte[] bytes){
  require(bytes!=null&&bytes.length>0&&bytes.length<=MAX);String s=new String(bytes,StandardCharsets.US_ASCII);require(Arrays.equals(bytes,s.getBytes(StandardCharsets.US_ASCII)));String[] a=s.split("\\|",-1);
  require((a.length==12&&a[0].equals("P204T1")||a.length==16&&a[0].equals("P204T2")||a.length==21&&a[0].equals("P204T3"))&&(a[1].equals("VERIFIED")||a[1].equals("UNCERTAIN"))&&a[6].matches("0|[1-9][0-9]{0,9}")&&a[7].matches("0|[1-9][0-9]{0,6}"));
  if(a.length==21)require(a[18].matches("0|[1-9][0-9]{0,6}")&&(a[20].equals("0")||a[20].equals("1")));
  Result r=new Result(a[1].equals("VERIFIED"),Phase.valueOf(a[2]),failure(a[3]),failure(a[4]),failure(a[5]),Integer.parseInt(a[6]),Integer.parseInt(a[7]),a[8],a[9],a[10],failure(a[11]),a.length==21?new Readback(a[12],a[13],a[14],failure(a[15]),a[16],a[17],Integer.parseInt(a[18]),a[19],a[20].equals("1")):a.length==16?new Readback(a[12],a[13],a[14],failure(a[15])):null);require(Arrays.equals(bytes,r.bytes()));return r;
 }
 private EnrollmentTransferDiagnostic(){}
}

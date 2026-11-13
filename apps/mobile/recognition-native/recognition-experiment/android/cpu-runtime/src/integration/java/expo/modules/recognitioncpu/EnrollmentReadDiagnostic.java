package expo.modules.recognitioncpu;

import java.nio.charset.StandardCharsets;
import java.util.*;

/** Separate fresh-observation grammar. Never upgrades the original export terminal. */
public final class EnrollmentReadDiagnostic {
 public static final String SESSION="enrollment-mw4zmxro",HASH="a53780c857bbe1a6d020b715a1e43e7ec798dcb5ffe397baac251606274bedcb";
 public static final String ORIGINAL_IDENTITY="163:1819483:33200:10257:1:148563:1794148369:180509867:1794148369:180509867";
 public static final String INTENT="R04.read-diagnostic-intent",RESULT="R04.read-diagnostic-result";
 public static final int LENGTH=148563,MAX=4096;
 public enum Code { NONE,BINDING,PERMISSION,DESTINATION,DESCRIPTOR,IDENTITY,OFFSET,READ,STAT,LIMIT,CANCELLED,EXPIRED,IO,SECURITY,ERRNO,UNKNOWN,PUBLICATION }
 public enum Truth { UNKNOWN,FALSE,TRUE }
 public static final class Failure {
  public final Code code;public final EnrollmentTransferDiagnostic.Kind kind;public final int errno;
  public Failure(Code c,EnrollmentTransferDiagnostic.Kind k,int e){require(e>=0&&e<=4095&&(k==EnrollmentTransferDiagnostic.Kind.ERRNO||e==0));require(c!=Code.ERRNO||k==EnrollmentTransferDiagnostic.Kind.ERRNO);require(c!=Code.IO||k==EnrollmentTransferDiagnostic.Kind.IO);require(c!=Code.SECURITY||k==EnrollmentTransferDiagnostic.Kind.SECURITY);code=c;kind=k;errno=e;require(c!=Code.NONE||k==EnrollmentTransferDiagnostic.Kind.STATE&&e==0);}
  String wire(){return code+"~"+kind+"~"+errno;}
 }
 public static Failure none(){return new Failure(Code.NONE,EnrollmentTransferDiagnostic.Kind.STATE,0);}
 static void require(boolean b){ObservedEnrollment.require(b,"READ_DIAGNOSTIC_SCHEMA");}
 static Failure failure(String s){String[] a=s.split("~",-1);require(a.length==3&&a[2].matches("0|[1-9][0-9]{0,3}"));return new Failure(Code.valueOf(a[0]),EnrollmentTransferDiagnostic.Kind.valueOf(a[1]),Integer.parseInt(a[2]));}
 public static final class Facts {
  public String intentHash="",actualHash="",before="",after="";public long total=0,calls=0,initial=-1,duplicate=-1,end=-1;public int elapsed=0;
  public boolean eof,complete;public Truth length=Truth.UNKNOWN,hash=Truth.UNKNOWN,stat=Truth.UNKNOWN;
  public Failure primary=none(),close=none(),revoke=none(),publication=none(),originalClose=none();
  public byte[] bytes(){validate();String s=String.join("|","P204RD1","FRESH_DIAGNOSTIC_ONLY","ORIGINAL_R04_UNCERTAIN",SESSION,intentHash,Integer.toString(LENGTH),HASH,Long.toString(total),Long.toString(calls),Long.toString(initial),Long.toString(duplicate),Long.toString(end),Boolean.toString(eof),Boolean.toString(complete),actualHash,before,after,length.name(),hash.name(),stat.name(),Integer.toString(elapsed),primary.wire(),close.wire(),revoke.wire(),publication.wire(),originalClose.wire());byte[] b=s.getBytes(StandardCharsets.US_ASCII);require(b.length<=MAX);return b;}
  public void validate(){require(intentHash.matches("[a-f0-9]{64}")&&total>=0&&total<=LENGTH+1&&calls>=0&&calls<=1000000&&initial>=-1&&duplicate>=-1&&end>=-1&&elapsed>=0&&elapsed<=Integer.MAX_VALUE);require(actualHash.isEmpty()||actualHash.matches("[a-f0-9]{64}"));require(before.isEmpty()||EnrollmentTransferDiagnostic.identity(before));require(after.isEmpty()||EnrollmentTransferDiagnostic.identity(after));require(complete==(!actualHash.isEmpty())&&(!complete||eof));require(!complete||(length!=Truth.UNKNOWN&&hash!=Truth.UNKNOWN));require(length==Truth.UNKNOWN||length==(total==LENGTH?Truth.TRUE:Truth.FALSE));require(hash==Truth.UNKNOWN||complete&&hash==(actualHash.equals(HASH)?Truth.TRUE:Truth.FALSE));require(stat==Truth.UNKNOWN||!before.isEmpty()&&!after.isEmpty()&&stat==(before.equals(after)?Truth.TRUE:Truth.FALSE));}
 }
 public static Facts parse(byte[] bytes){require(bytes!=null&&bytes.length>0&&bytes.length<=MAX);String s=new String(bytes,StandardCharsets.US_ASCII);require(Arrays.equals(bytes,s.getBytes(StandardCharsets.US_ASCII)));String[] a=s.split("\\|",-1);require(a.length==26&&a[0].equals("P204RD1")&&a[1].equals("FRESH_DIAGNOSTIC_ONLY")&&a[2].equals("ORIGINAL_R04_UNCERTAIN")&&a[3].equals(SESSION)&&a[5].equals(Integer.toString(LENGTH))&&a[6].equals(HASH));Facts f=new Facts();f.intentHash=a[4];f.total=number(a[7]);f.calls=number(a[8]);f.initial=offset(a[9]);f.duplicate=offset(a[10]);f.end=offset(a[11]);require(a[12].matches("true|false")&&a[13].matches("true|false"));f.eof=Boolean.parseBoolean(a[12]);f.complete=Boolean.parseBoolean(a[13]);f.actualHash=a[14];f.before=a[15];f.after=a[16];f.length=Truth.valueOf(a[17]);f.hash=Truth.valueOf(a[18]);f.stat=Truth.valueOf(a[19]);f.elapsed=Math.toIntExact(number(a[20]));f.primary=failure(a[21]);f.close=failure(a[22]);f.revoke=failure(a[23]);f.publication=failure(a[24]);f.originalClose=failure(a[25]);require(Arrays.equals(bytes,f.bytes()));return f;}
 private static long number(String s){require(s.matches("0|[1-9][0-9]{0,18}"));return Long.parseLong(s);}
 private static long offset(String s){return s.equals("-1")?-1:number(s);}
 /** Names alone consume a torn attempt; only complete bindings permit a result. */
 public static void shape(Set<String> names){boolean i=names.contains(INTENT),is=names.contains(INTENT+".new"),r=names.contains(RESULT),rs=names.contains(RESULT+".new");require(!(i&&is)&&!(r&&rs)&&(!(r||rs)||i));if(i||is||r||rs)require(names.contains("R04.intent")&&names.contains("R04.result")&&names.contains("R04.export-intent")&&names.contains("R04.destination")&&names.contains("R04.export-result"));}
 private EnrollmentReadDiagnostic(){}
}

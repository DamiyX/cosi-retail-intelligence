package expo.modules.recognitioncpu;

import java.io.*;
import java.security.MessageDigest;
import java.util.Locale;

/** Single forward-only stream observation. File/provider and ownership are injected boundaries. */
final class EnrollmentReadProbe {
 interface Target {
  String before()throws Exception;
  long initial()throws Exception;
  long duplicate()throws Exception;
  InputStream stream()throws Exception;
  long end()throws Exception;
  String after()throws Exception;
 }
 static void read(Target target,EnrollmentReadDiagnostic.Facts facts,Runnable live)throws Exception {
  facts.before=target.before();
  if(!facts.before.equals(EnrollmentReadDiagnostic.ORIGINAL_IDENTITY))throw new IllegalStateException("IDENTITY");
  facts.initial=target.initial();facts.duplicate=target.duplicate();
  MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[65536];Exception primary=null;
  try {
   InputStream in=target.stream();
   for(;;){live.run();if(facts.calls>=1000000)throw new IllegalStateException("LIMIT");int want=(int)Math.min(buffer.length,EnrollmentReadDiagnostic.LENGTH+1-facts.total);if(want<=0)throw new IllegalStateException("LIMIT");int n=in.read(buffer,0,want);facts.calls++;if(n==-1){facts.eof=true;live.run();break;}if(n<0||n>want)throw new IllegalStateException("READ");facts.total=Math.addExact(facts.total,n);digest.update(buffer,0,n);live.run();if(facts.total>EnrollmentReadDiagnostic.LENGTH)throw new IllegalStateException("LIMIT");}
   StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));facts.actualHash=hex.toString();facts.complete=true;
  }catch(Exception e){primary=e;}finally{java.util.Arrays.fill(buffer,(byte)0);}
  // Independent observations happen even on content refusal. Missing observations stay UNKNOWN.
  try{facts.end=target.end();}catch(Exception e){if(primary==null)primary=e;else primary.addSuppressed(e);}
  try{facts.after=target.after();facts.stat=facts.before.equals(facts.after)?EnrollmentReadDiagnostic.Truth.TRUE:EnrollmentReadDiagnostic.Truth.FALSE;}catch(Exception e){if(primary==null)primary=e;else primary.addSuppressed(e);}
  facts.length=facts.total==EnrollmentReadDiagnostic.LENGTH?EnrollmentReadDiagnostic.Truth.TRUE:EnrollmentReadDiagnostic.Truth.FALSE;
  if(facts.complete)facts.hash=facts.actualHash.equals(EnrollmentReadDiagnostic.HASH)?EnrollmentReadDiagnostic.Truth.TRUE:EnrollmentReadDiagnostic.Truth.FALSE;
  if(primary!=null)throw primary;
 }
 private EnrollmentReadProbe(){}
}

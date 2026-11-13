package expo.modules.recognitioncpu;
import java.util.*;
public class CameraCaptureDiagnosticChecks {
 static int assertions;
 static void check(boolean b){assertions++;if(!b)throw new AssertionError();}
 interface Work{void run()throws Exception;}
 static void refuses(Work w)throws Exception{boolean failed=false;try{w.run();}catch(Exception e){failed=true;}check(failed);}
 static class Sink implements CameraCaptureDiagnosticSession.Sink {
  final Map<String,String> records=new HashMap<>();int saves;String fail;Runnable duringSave=()->{};
  public void record(String n,String v)throws Exception{if(v.startsWith(String.valueOf(fail)))throw new Exception("IO");if(records.putIfAbsent(n,v)!=null)throw new Exception("EXISTS");}
  public void save(byte[] b){saves++;duringSave.run();}
 }
 static class Frame implements CameraCaptureDiagnosticSession.Frame {int closes;boolean closed;byte[] data={1,2,3};public byte[] bytes(){return data;}public void close(){if(!closed){closed=true;closes++;}}}
 static CameraCaptureDiagnosticSession.Admission good(){return new CameraCaptureDiagnosticSession.Admission(true,true,100,CameraCaptureDiagnosticSession.JPEG+CameraCaptureDiagnosticSession.BOOK);}
 static CameraCaptureDiagnosticSession start(Sink sink)throws Exception{CameraCaptureDiagnosticSession s=new CameraCaptureDiagnosticSession(sink,b->{});s.ready(good(),"geometry",1);s.invoke("geometry",2,()->{});return s;}
 public static void main(String[] args)throws Exception{
  refuses(()->new CameraCaptureDiagnosticSession.Admission(false,true,0,20000000).check());
  refuses(()->new CameraCaptureDiagnosticSession.Admission(true,false,0,20000000).check());
  refuses(()->new CameraCaptureDiagnosticSession.Admission(true,true,CameraCaptureDiagnosticSession.CAP,20000000).check());
  refuses(()->new CameraCaptureDiagnosticSession.Admission(true,true,-1,20000000).check());
  refuses(()->new CameraCaptureDiagnosticSession.Admission(true,true,0,1).check());
  Sink sink=new Sink();CameraCaptureDiagnosticSession s=start(sink);Frame f=new Frame();s.started();s.accept(f,"geometry",()->"geometry");check(s.saved()&&sink.saves==1&&f.closes==1);final CameraCaptureDiagnosticSession first=s;refuses(()->first.invoke("geometry",3,()->{throw new AssertionError();}));refuses(()->first.accept(f,"geometry",()->"geometry"));check(sink.saves==1&&f.closes==1);
  sink=new Sink();s=start(sink);s.invalidate("BACKGROUND");Frame late=new Frame();final CameraCaptureDiagnosticSession cancelled=s;refuses(()->cancelled.accept(late,"geometry",()->"geometry"));check(late.closes==1&&sink.saves==0);
  sink=new Sink();s=start(sink);Frame stale=new Frame();final CameraCaptureDiagnosticSession changed=s;refuses(()->changed.accept(stale,"other",()->"geometry"));check(stale.closes==1&&sink.saves==0);
  Sink torn=new Sink();torn.fail="INTENT";CameraCaptureDiagnosticSession t=new CameraCaptureDiagnosticSession(torn,b->{});t.ready(good(),"geometry",1);refuses(()->t.invoke("geometry",2,()->{throw new AssertionError();}));refuses(()->t.invoke("geometry",3,()->{throw new AssertionError();}));
  Sink mid=new Sink();CameraCaptureDiagnosticSession m=start(mid);mid.duringSave=()->{try{m.invalidate("PERMISSION");}catch(Exception e){throw new RuntimeException(e);}};Frame mf=new Frame();refuses(()->m.accept(mf,"geometry",()->"geometry"));check(!m.saved()&&mf.closes==1&&mid.saves==1);
  Sink bad=new Sink();CameraCaptureDiagnosticSession h=new CameraCaptureDiagnosticSession(bad,b->{throw new Exception("HEADER");});h.ready(good(),"geometry",1);h.invoke("geometry",2,()->{});Frame hf=new Frame();refuses(()->h.accept(hf,"geometry",()->"geometry"));check(hf.closes==1&&bad.saves==0);
  Sink expiry=new Sink();CameraCaptureDiagnosticSession e=new CameraCaptureDiagnosticSession(expiry,b->{});e.ready(good(),"geometry",1);refuses(()->e.invoke("geometry",121,()->{throw new AssertionError();}));
  System.out.println("PASS "+assertions+" assertions; fake IO/frame boundaries, no Android camera");
 }
}

package expo.modules.recognitioncpu;
import java.util.concurrent.atomic.AtomicBoolean;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixChecks.*;
public final class CameraMatrixLifecycleChecks {
  public static void main(String[] args)throws Exception{
    Readiness r=new Readiness();Case c=CASES.get(0);String token=r.issue(c,100);no("cross case",()->r.consume(CASES.get(1),token,101));no("wrong nonce",()->r.consume(c,PROCESS,101));no("expired",()->r.consume(c,token,120000000101L));no("backwards",()->r.consume(c,token,99));ok(r.consume(c,token,101).equals(token),"same fresh nonce");no("nonce replay",()->r.consume(c,token,102));String old=r.issue(c,100),next=r.issue(c,200);no("superseded nonce",()->r.consume(c,old,201));r.consume(c,next,201);String overflow=r.issue(c,Long.MIN_VALUE);no("time overflow",()->r.consume(c,overflow,Long.MAX_VALUE));
    AtomicBoolean busy=new AtomicBoolean(),closed=new AtomicBoolean();CameraMatrixStore.ExportSession<String> s=new CameraMatrixStore.ExportSession<>(busy,closed);int[] consumed={0};var t=s.begin("one",()->{consumed[0]++;return null;});no("concurrent owner",()->s.begin("two",()->null));s.dispatch(t,()->{});s.cancel();ok(busy.get(),"cancel retains picker owner");ok(s.callback(31007)==null&&s.callback(31008)==null,"old request codes cannot acquire matrix callback");ok(s.callback(REQUEST)==t,"fixed callback");ok(s.callback(REQUEST)==null,"duplicate callback ignored");ok(t.settle()&&!t.settle(),"exactly one bridge settlement");s.finish(t);ok(!busy.get()&&consumed[0]==1,"only actual callback finish releases");
    var uncertain=s.begin("throw",()->null);no("throwing dispatch",()->s.dispatch(uncertain,()->{throw new IllegalStateException("started");}));s.failBeforeDispatch(uncertain);ok(busy.get(),"throw may have registered picker, owner retained");ok(s.callback(REQUEST)==uncertain,"late callback drains");s.finish(uncertain);closed.set(true);no("closed source",()->s.begin("closed",()->null));
    System.out.println("CameraMatrixLifecycleChecks assertions="+count+"; generated ownership/nonce only, not physical SDK/native-in-flight proof");
  }
}

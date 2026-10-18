package expo.modules.recognitioncpu;

import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** Exercises the production helper consumed by Kotlin, without Android or model execution. */
public final class PhonePortabilityStateChecks {
  private static int assertions=0;
  private static void yes(boolean b,String why){assertions++;if(!b)throw new AssertionError(why);}
  private static final class Harness {
    final AtomicBoolean busy=new AtomicBoolean(),closed=new AtomicBoolean();
    final PhonePortabilityState<String> state=new PhonePortabilityState<>(busy,closed);
    final AtomicInteger next=new AtomicInteger(10000),rejects=new AtomicInteger(),cleanup=new AtomicInteger(),effects=new AtomicInteger(),resolves=new AtomicInteger();
    PhonePortabilityState.Ticket<String> doc(String name)throws Exception{return state.begin(1,false,name,next::getAndIncrement,()->{});}
    void cancel(PhonePortabilityState.Ticket<String> t)throws Exception {state.cancel(t,x->rejects.incrementAndGet(),x->cleanup.incrementAndGet());}
  }
  public static void main(String[] args)throws Exception {
    // BEFORE mutant reproduces the old current-request cancellation; AFTER must preserve B.
    Harness h=new Harness();var a=h.doc("A");h.cancel(a);var b=h.doc("B");
    yes(a.code==10000&&b.code==10001,"durable-style distinct IDs");
    h.cancel(a);yes(!b.cancelled.get()&&h.busy.get()&&h.state.request(b.code)==b,"queued A must not cancel B");
    yes(h.rejects.get()==1&&h.cleanup.get()==1,"stale cancellation has no settlement/journal effect");
    yes(!h.state.act(a,()->h.effects.incrementAndGet()),"stale queued picker cannot launch");
    for(String branch:new String[]{"closed runnable","picker exception","setup exception","nonlocal result","cancelled result","worker rejection"}) {
      h.cancel(a);yes(!b.cancelled.get()&&h.state.request(b.code)==b,"stale "+branch+" preserves B");
    }
    yes(!h.state.startWriting(a),"stale success cannot begin import/export");
    yes(!h.state.resolve(a,x->h.effects.incrementAndGet()),"stale success cannot mutate result/promise");
    yes(!h.state.reject(a,x->h.effects.incrementAndGet()),"stale failure cannot reject B");
    yes(!h.state.finish(a,x->h.cleanup.incrementAndGet()),"stale finally cannot release B busy or finish journal");
    yes(h.effects.get()==0&&h.cleanup.get()==1&&h.rejects.get()==1,"all stale side effects withheld");
    h.cancel(b);var replay=h.state.begin(0,true,"replay",()->-1,()->{});
    h.cancel(a);h.cancel(b);yes(!replay.cancelled.get()&&h.busy.get(),"old callbacks cannot cancel a new replay");
    yes(h.state.request(10000)==null&&h.state.request(-1)==null,"document callback cannot target replay");
    yes(h.state.resolve(replay,x->h.resolves.incrementAndGet()),"current replay resolves");
    yes(!h.state.resolve(replay,x->h.resolves.incrementAndGet()),"duplicate replay settlement withheld");
    h.state.finish(replay,x->{});yes(!h.busy.get()&&h.resolves.get()==1,"replay drain releases once");
    var recovery=h.state.begin(3,true,"recovery",()->-1,()->{});h.cancel(a);
    yes(!recovery.cancelled.get(),"stale picker cannot invalidate recovery");
    h.state.cancelCurrent(x->h.rejects.incrementAndGet(),x->h.cleanup.incrementAndGet());
    yes(recovery.cancelled.get()&&h.busy.get(),"global cancellation intentionally cancels current recovery and retains drain gate");
    yes(!h.state.act(recovery,()->h.effects.incrementAndGet()),"cancelled recovery cannot publish result");
    h.state.finish(recovery,x->{});
    Harness writer=new Harness();var w=writer.doc("writer");yes(writer.state.startWriting(w),"current success admits one writer");
    yes(!writer.state.startWriting(w),"duplicate success cannot queue second worker");writer.cancel(w);
    yes(writer.busy.get()&&w.cancelled.get()&&writer.cleanup.get()==0,"cancelled writer keeps busy/journal until drain");
    boolean blocked=false;try{writer.doc("too early");}catch(PhonePortabilityState.BusyOrClosed e){blocked=true;}
    yes(blocked,"no admission before cancelled writer drains");
    yes(!writer.state.resolve(w,x->writer.resolves.incrementAndGet()),"cancelled writer cannot acknowledge success");
    writer.state.finish(w,x->writer.cleanup.incrementAndGet());yes(!writer.busy.get()&&writer.cleanup.get()==1,"writer finally cleans once");
    var next=writer.doc("next");writer.cancel(w);writer.state.finish(w,x->writer.cleanup.incrementAndGet());
    yes(writer.state.request(next.code)==next&&!next.cancelled.get()&&writer.busy.get()&&writer.cleanup.get()==1,"late writer completion cannot disturb next request");
    writer.closed.set(true);writer.state.cancelCurrent(x->writer.rejects.incrementAndGet(),x->writer.cleanup.incrementAndGet());
    yes(next.cancelled.get()&&!writer.busy.get()&&writer.cleanup.get()==2,"teardown cancels current picker");
    yes(!writer.state.act(next,()->writer.effects.incrementAndGet()),"closed picker cannot launch");
    blocked=false;try{writer.doc("closed");}catch(PhonePortabilityState.BusyOrClosed e){blocked=true;}yes(blocked,"closed harness cannot admit work");
    Harness error=new Harness();boolean failed=false;
    try{error.state.begin(1,false,"bad",error.next::getAndIncrement,()->{throw new Exception("admission failed");});}catch(Exception e){failed=true;}
    yes(failed&&!error.busy.get()&&error.next.get()==10000,"failed admission does not reserve or release another owner");
    var good=error.doc("good");error.state.startWriting(good);
    try{error.state.finish(good,x->{throw new Exception("cleanup failed");});}catch(Exception expected){}
    yes(!error.busy.get(),"owned cleanup failure still drains local gate; durable marker remains for explicit recovery");
    // Real two-thread schedule: stale A is delivered only after B is published.
    Harness threaded=new Harness();var old=threaded.doc("old");threaded.cancel(old);
    CountDownLatch admitted=new CountDownLatch(1);AtomicReference<PhonePortabilityState.Ticket<String>> newer=new AtomicReference<>();AtomicReference<Throwable> failure=new AtomicReference<>();
    Thread expo=new Thread(()->{try{newer.set(threaded.doc("new"));admitted.countDown();}catch(Throwable t){failure.set(t);admitted.countDown();}},"generated-expo-queue");
    Thread main=new Thread(()->{try{if(!admitted.await(5,TimeUnit.SECONDS))throw new AssertionError("schedule timeout");threaded.cancel(old);threaded.state.act(old,()->threaded.effects.incrementAndGet());}catch(Throwable t){failure.set(t);}},"generated-main-queue");
    expo.start();main.start();expo.join(5000);main.join(5000);
    yes(!expo.isAlive()&&!main.isAlive()&&failure.get()==null,"bounded threaded schedule completed");
    yes(!newer.get().cancelled.get()&&threaded.state.request(newer.get().code)==newer.get()&&threaded.effects.get()==0,"threaded stale callback preserves newer request");
    System.out.println("PASS "+assertions+" production-state assertions; delayed callbacks/replay/drain/teardown. No Android/model execution.");
  }
}

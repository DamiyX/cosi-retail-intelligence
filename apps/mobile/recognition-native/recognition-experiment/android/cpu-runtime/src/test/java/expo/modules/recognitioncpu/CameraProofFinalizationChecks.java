package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Production durable completion + task helper with generated host IO. No Android execution. */
public final class CameraProofFinalizationChecks {
  private static final String SOURCE="a".repeat(64),PROCESS="11111111-1111-1111-1111-111111111111",NEXT="22222222-2222-2222-2222-222222222222";
  private static int checks;
  private static void ok(boolean b,String why){checks++;if(!b)throw new AssertionError(why);}
  private interface Work {void run()throws Exception;}
  private static void refuses(Work f)throws Exception{try{f.run();throw new AssertionError("missing refusal");}catch(IllegalArgumentException|IllegalStateException|IOException expected){checks++;}}
  private static byte[] bytes(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private static final class IO extends CameraProofChecks.HostIO {
    boolean firstResolutionFailure;CountDownLatch entered,release;
    @Override public void writeNew(File file,byte[] data)throws IOException{
      if(file.getName().endsWith(".resolution.new")){
        if(firstResolutionFailure)throw new IOException("CAMERA_RESOLUTION_WRITE_FAILED");
        if(entered!=null){entered.countDown();try{if(!release.await(5,TimeUnit.SECONDS))throw new IOException("generated publication barrier timeout");}catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException(e);}}
      }
      super.writeNew(file,data);
    }
  }
  private static final class Fixture {
    final File root;final IO io=new IO();final CameraProofStore store;final CameraProofLifecycle gate=new CameraProofLifecycle();final CameraProofLifecycle.Ticket ticket;
    Fixture(File parent,String name)throws Exception{
      // New isolated generated scenario models a new process. Assert held ownership
      // in the preceding scenario BEFORE this explicit host-process reset.
      CameraProofLifecycle.SHARED_BUSY.set(false);root=new File(parent,name);store=new CameraProofStore(root,io,SOURCE,PROCESS);
      ticket=gate.begin(()->{String id=store.reserve();store.write(id,"request.json",bytes("{\"generatedRequest\":true}"));return id;},new AtomicBoolean());gate.captureReturned(ticket);
    }
    void candidate()throws Exception{
      store.write(ticket.id,"raw.jpg",CameraProofChecks.jpeg(3,2,1));store.write(ticket.id,"preview.png",new byte[]{1});store.write(ticket.id,"numerical.json",bytes("{\"generatedVector\":true}"));store.write(ticket.id,"receipt.json",bytes("{\"generatedCandidate\":true}"));store.finish(ticket.id);
    }
    CameraProofStore restart()throws Exception{return new CameraProofStore(root,io,SOURCE,NEXT);}
    CameraProofFinalizer.Completion<String> completion(String failure,Runnable before,Runnable release){return new CameraProofFinalizer.Durable<>(gate,store,ticket,code->bytes("{\"generatedFailure\":\""+code+"\"}"),before,release,failure);}
    CameraProofFinalizer.Completion<String> completion(){return completion(null,()->{},()->{});}
    void blockedUnready()throws Exception{
      ok(CameraProofLifecycle.SHARED_BUSY.get()&&gate.activeId().equals(ticket.id)&&!ticket.finished,"unresolved owner retained");
      refuses(()->store.readNumerical(ticket.id));refuses(()->restart().readNumerical(ticket.id));
      ok((Long)restart().status().get("claimedBytes")>=CameraProofStore.RESERVATION,"reservation survives unresolved finalization");
    }
  }
  private static final class Sink implements CameraProofFinalizer.Sink<String> {
    int resolves,rejects;String value;CameraProofFinalizer.Failure failure;Runnable onResolve=()->{};boolean throwDelivery;
    public void resolve(String v){resolves++;value=v;onResolve.run();if(throwDelivery)throw new IllegalStateException("generated delivery failure");}
    public void reject(CameraProofFinalizer.Failure f){rejects++;failure=f;if(throwDelivery)throw new IllegalStateException("generated delivery failure");}
  }
  private static CameraProofFinalizer.Run<String> run(Fixture f,CameraProofFinalizer.Work<String> work,Sink sink){return CameraProofFinalizer.dispatch(Runnable::run,work,f.completion(),sink);}
  public static void main(String[] args)throws Exception{
    File parent=new File(args[0]);if(!parent.mkdir())throw new IOException("exclusive generated destination");
    Fixture orphan=new Fixture(parent,"candidate-before-cancel");orphan.candidate();
    refuses(()->orphan.store.readNumerical(orphan.ticket.id));ok(orphan.gate.cancel(orphan.ticket.id,"USER"),"accepted cancellation before publication claim");
    byte[] observed=Files.readAllBytes(new File(orphan.root,orphan.ticket.id+".numerical.json").toPath());
    orphan.blockedUnready();CameraProofStore recovered=orphan.restart();recovered.recover(false);refuses(()->recovered.readNumerical(orphan.ticket.id));
    ok(Arrays.equals(observed,Files.readAllBytes(new File(orphan.root,orphan.ticket.id+".numerical.json").toPath())),"restart classifies, never deletes vector observations");

    Fixture good=new Fixture(parent,"published-success");Sink goodSink=new Sink();
    goodSink.onResolve=()->{ok(good.ticket.finished&&!CameraProofLifecycle.SHARED_BUSY.get(),"no success before durable finalization and release");try{ok(good.store.readNumerical(good.ticket.id).length>0,"published receipt readable at settlement");}catch(Exception e){throw new AssertionError(e);}};
    CameraProofFinalizer.Run<String> goodRun=run(good,()->{good.candidate();return "candidate";},goodSink);
    ok(goodRun.deliveryFailure==null&&goodSink.resolves==1&&goodSink.rejects==0,"single success settlement");
    ok(good.restart().readNumerical(good.ticket.id).length>0,"published result survives restart");ok(!good.gate.cancel(good.ticket.id,"USER"),"completed ticket cannot acknowledge cancel");

    Fixture cancelled=new Fixture(parent,"cancel-after-candidate");Sink cancelSink=new Sink();
    CameraProofFinalizer.Run<String> cancelledRun=run(cancelled,()->{cancelled.candidate();ok(cancelled.gate.cancel(cancelled.ticket.id,"BACKGROUND"),"cancel wins before finalization");return "candidate";},cancelSink);
    ok(cancelledRun.deliveryFailure==null&&cancelSink.resolves==0&&cancelSink.rejects==1,"cancel never resolves candidate");ok(cancelSink.failure.primary.getMessage().equals("CAMERA_CANCELLED")&&cancelSink.failure.finalization==null,"durable cancellation distinguished from finalization failure");
    ok(cancelled.ticket.finished&&!CameraProofLifecycle.SHARED_BUSY.get(),"durable cancelled resolution can release known drain");refuses(()->cancelled.restart().readNumerical(cancelled.ticket.id));

    Fixture failed=new Fixture(parent,"work-error");Sink failSink=new Sink();IOException primary=new IOException("generated primary failure");
    CameraProofFinalizer.Run<String> failedRun=run(failed,()->{throw primary;},failSink);
    ok(failedRun.deliveryFailure==null&&failSink.rejects==1&&failSink.failure.primary==primary&&failSink.failure.finalization==null,"primary work failure preserved");ok(failed.ticket.finished,"failure resolves ownership only after durable reject");refuses(()->failed.restart().readNumerical(failed.ticket.id));

    Fixture notStarted=new Fixture(parent,"not-started-ack");Sink ackSink=new Sink();
    CameraProofFinalizer.Run<String> ack=CameraProofFinalizer.dispatch(Runnable::run,()->"ack",notStarted.completion("CAMERA_CAPTURE_NOT_STARTED",()->{},()->{}),ackSink);
    ok(ack.deliveryFailure==null&&ackSink.resolves==1&&notStarted.ticket.finished,"NOT_STARTED acknowledgement requires durable failure resolution");refuses(()->notStarted.restart().readNumerical(notStarted.ticket.id));

    for(boolean acceptCancel:new boolean[]{false,true}){
      Fixture first=new Fixture(parent,"first-byte-"+acceptCancel);first.candidate();first.io.firstResolutionFailure=true;
      if(acceptCancel)ok(first.gate.cancel(first.ticket.id,"UNMOUNT"),"cancel accepted before zero-byte persistence failure");
      Sink sink=new Sink();CameraProofFinalizer.Run<String> task=run(first,()->"candidate",sink);
      ok(task.deliveryFailure==null&&sink.resolves==0&&sink.rejects==1&&sink.failure.finalization instanceof IOException,"first byte finalization failure contained");
      ok(!new File(first.root,first.ticket.id+".resolution.new").exists()&&!new File(first.root,first.ticket.id+".resolution").exists(),"zero resolution bytes actually written");first.blockedUnready();
      if(!acceptCancel){first.gate.block(first.ticket,"SECONDARY_DIAGNOSTIC","SECONDARY_DIAGNOSTIC");ok(!first.gate.cancel(first.ticket.id,"USER")&&first.ticket.phase.equals("BLOCKED_PUBLISHING"),"repeated blocked diagnostics cannot reopen cancellation ACK after publication claim");ok(first.ticket.finalizationFailure.equals("CAMERA_RESOLUTION_WRITE_FAILED"),"first finalization diagnostic is preserved");}
    }
    for(String fault:List.of("partial","afterWrite","rename")){
      Fixture partial=new Fixture(parent,"publication-"+fault);partial.candidate();partial.io.fault=fault;Sink sink=new Sink();CameraProofFinalizer.Run<String> task=run(partial,()->"candidate",sink);partial.io.fault="";
      ok(task.deliveryFailure==null&&sink.rejects==1&&sink.resolves==0,"partial finalization failure contained");partial.blockedUnready();refuses(()->partial.restart().reserve());
    }

    Fixture both=new Fixture(parent,"primary-plus-finalization");both.candidate();both.io.firstResolutionFailure=true;Sink bothSink=new Sink();IOException original=new IOException("generated original");
    CameraProofFinalizer.Run<String> bothTask=run(both,()->{throw original;},bothSink);
    ok(bothTask.deliveryFailure==null&&bothSink.rejects==1&&bothSink.failure.primary==original&&bothSink.failure.finalization instanceof IOException,"work and finalization errors both retained");both.blockedUnready();

    Executor refused=command->{throw new RejectedExecutionException("generated queue refusal");};
    Fixture scheduling=new Fixture(parent,"scheduling-refusal");Sink schedulingSink=new Sink();int[] workCalls={0};
    CameraProofFinalizer.Run<String> rejected=CameraProofFinalizer.dispatch(refused,()->{workCalls[0]++;return "never";},scheduling.completion(),schedulingSink);
    ok(workCalls[0]==0&&schedulingSink.rejects==1&&!schedulingSink.failure.scheduled&&schedulingSink.failure.primary instanceof RejectedExecutionException,"scheduling refusal finalized and rejected once");ok(rejected.deliveryFailure==null&&scheduling.ticket.finished,"known drain released only after durable queue-failure resolution");
    Fixture schedulingBad=new Fixture(parent,"scheduling-finalization-refusal");schedulingBad.io.fault="partial";Sink schedulingBadSink=new Sink();
    CameraProofFinalizer.Run<String> rejectedBad=CameraProofFinalizer.dispatch(refused,()->"never",schedulingBad.completion(),schedulingBadSink);schedulingBad.io.fault="";
    ok(rejectedBad.deliveryFailure==null&&schedulingBadSink.rejects==1&&schedulingBadSink.failure.primary instanceof RejectedExecutionException&&schedulingBadSink.failure.finalization instanceof IOException,"schedule plus finalization failure is contained");schedulingBad.blockedUnready();

    Fixture asyncFailure=new Fixture(parent,"executor-finalization-failure");asyncFailure.candidate();asyncFailure.io.firstResolutionFailure=true;Sink asyncSink=new Sink();
    java.util.concurrent.atomic.AtomicReference<Throwable> uncaught=new java.util.concurrent.atomic.AtomicReference<>();
    ExecutorService asyncExecutor=Executors.newSingleThreadExecutor(r->{Thread thread=new Thread(r);thread.setUncaughtExceptionHandler((t,error)->uncaught.set(error));return thread;});
    CameraProofFinalizer.Run<String> asyncTask=CameraProofFinalizer.dispatch(asyncExecutor,()->"candidate",asyncFailure.completion(),asyncSink);asyncExecutor.shutdown();ok(asyncExecutor.awaitTermination(5,TimeUnit.SECONDS),"real executor failure path drained");
    ok(uncaught.get()==null&&asyncTask.deliveryFailure==null&&asyncSink.rejects==1&&asyncSink.resolves==0,"finalization failure never escapes actual Executor Runnable");asyncFailure.blockedUnready();

    Fixture cleanup=new Fixture(parent,"local-finalization-failure");Sink cleanupSink=new Sink();
    CameraProofFinalizer.Run<String> cleanupTask=CameraProofFinalizer.dispatch(Runnable::run,()->{cleanup.candidate();return "candidate";},cleanup.completion(null,()->{},()->{throw new IllegalStateException("CAMERA_LOCAL_FINALIZATION_FAILED");}),cleanupSink);
    ok(cleanupTask.deliveryFailure==null&&cleanupSink.resolves==0&&cleanupSink.rejects==1&&CameraProofLifecycle.SHARED_BUSY.get(),"local finalization exception cannot escape or release owner");
    ok(cleanup.gate.state().get("finalizationFailure").equals("CAMERA_LOCAL_FINALIZATION_FAILED"),"blocked diagnostic retained");
    // A complete hash-verified atomic resolution is the durable commit point even
    // if response/local cleanup is lost. No cancellation is acknowledged after its claim.
    ok(!cleanup.gate.cancel(cleanup.ticket.id,"USER"),"publication-claimed failure cannot falsely acknowledge cancellation");ok(cleanup.restart().readNumerical(cleanup.ticket.id).length>0,"complete published commit resolved by recovery, not inferred from candidate");

    Fixture publication=new Fixture(parent,"publication-race");publication.candidate();publication.io.entered=new CountDownLatch(1);publication.io.release=new CountDownLatch(1);Sink publicationSink=new Sink();
    ExecutorService executor=Executors.newSingleThreadExecutor();CameraProofFinalizer.Run<String> publicationTask=CameraProofFinalizer.dispatch(executor,()->"candidate",publication.completion(),publicationSink);
    try{ok(publication.io.entered.await(3,TimeUnit.SECONDS),"publication barrier entered");
      ok(!publication.gate.cancel(publication.ticket.id,"USER"),"completion already claimed, no cancellation ACK");ok(!new File(publication.root,publication.ticket.id+".resolution").exists(),"no durable publication before barrier releases");
    }finally{publication.io.release.countDown();executor.shutdown();}
    ok(executor.awaitTermination(5,TimeUnit.SECONDS),"publication worker drained");
    ok(publicationTask.deliveryFailure==null&&publicationSink.resolves==1,"claimed publication settles only after write");
    CameraProofLifecycle.Ticket newer=publication.gate.begin(()->publication.store.reserve(),new AtomicBoolean());
    publicationTask.run();refuses(()->publication.gate.finish(publication.ticket));ok(publication.gate.activeId().equals(newer.id)&&CameraProofLifecycle.SHARED_BUSY.get(),"stale run/finish cannot release newer owner");
    publication.gate.captureReturned(newer);publication.gate.claimFinalization(newer,false);publication.store.reject(newer.id,"FAILED","GENERATED_CLEANUP",bytes("{}"));publication.gate.finish(newer);

    Fixture delivery=new Fixture(parent,"delivery-error");Sink deliverySink=new Sink();deliverySink.throwDelivery=true;
    CameraProofFinalizer.Run<String> deliveryTask=run(delivery,()->{delivery.candidate();return "candidate";},deliverySink);deliveryTask.run();ok(deliverySink.resolves==1&&deliveryTask.deliveryFailure!=null,"sink failure contained without second delivery");
    System.out.println("{\"kind\":\"GENERATED_C1_DURABLE_FINALIZATION\",\"checks\":"+checks+",\"nativeValidated\":false,\"modelExecuted\":false}");
  }
}

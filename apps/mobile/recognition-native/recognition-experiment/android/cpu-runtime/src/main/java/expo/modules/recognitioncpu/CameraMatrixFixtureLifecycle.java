package expo.modules.recognitioncpu;

import java.io.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Fixture-only lifecycle evidence. No output, picker or recreation can be replayed from disk. */
public final class CameraMatrixFixtureLifecycle {
  public static final String INTENT="recreate-intent",RECEIPT="recreate-receipt",METHOD="ACTIVITY_RECREATE_PUBLIC_API";
  private final File root;private final CameraProofStore.IO io;private final CameraMatrixRecoveryStore.Guard guard;private final CameraMatrixRecoveryStore store;
  private Map<String,Object> permit;private boolean requested,invoked,destroyed;
  CameraMatrixFixtureLifecycle(File root,CameraProofStore.IO io,CameraMatrixRecoveryStore.Guard guard,CameraMatrixRecoveryStore store){requireRecovery(root.getName().equals(Lane.FIXTURE.root),"FIXTURE_ONLY");this.root=root;this.io=io;this.guard=guard;this.store=store;}
  private static byte[] raw(File root,CameraProofStore.IO io,String name)throws Exception{return io.size(new File(root,name))<0?null:io.read(new File(root,name),RECORD);}
  private static Map<String,Object> record(File root,CameraProofStore.IO io,String name)throws Exception{
    byte[] data=raw(root,io,name);if(data==null)return null;Map<String,Object> r=parse(data,RECORD);keys(r,"kind","owner","selection","previous","payload","digest");requireRecovery(name.equals(r.get("kind")),"LIFECYCLE_KIND");Map<String,Object> base=new TreeMap<>(r);Object digest=base.remove("digest");requireRecovery(CameraProofFrame.hash(bytes(json(base))).equals(digest)&&Arrays.equals(data,bytes(json(r))),"LIFECYCLE_RECORD_HASH");
    byte[] owner=raw(root,io,"owner"),selection=raw(root,io,"selection");requireRecovery(owner!=null&&selection!=null&&CameraProofFrame.hash(owner).equals(r.get("owner"))&&CameraProofFrame.hash(selection).equals(r.get("selection")),"LIFECYCLE_OWNER_SELECTION");hash(r.get("previous"));return r;
  }
  private static Map<String,Object> payload(Map<String,Object> record){return PhonePortabilityJson.object(record.get("payload"));}
  public static void validateRecords(File root,CameraProofStore.IO io)throws Exception{
    Map<String,Object> intent=record(root,io,INTENT),receipt=record(root,io,RECEIPT);requireRecovery(receipt==null||intent!=null,"LIFECYCLE_INTENT_MISSING");if(intent==null)return;
    requireRecovery(ZERO.equals(intent.get("previous")),"LIFECYCLE_INTENT_PREVIOUS");Map<String,Object> p=payload(intent);keys(p,"oldInstance","process","pid","method","count");uuid(p.get("oldInstance"));uuid(p.get("process"));number(p.get("pid"),1,Integer.MAX_VALUE);requireRecovery(METHOD.equals(p.get("method"))&&number(p.get("count"),1,1)==1,"LIFECYCLE_METHOD_COUNT");
    Map<String,Object> selection=parse(raw(root,io,"selection"),RECORD);requireRecovery(p.get("process").equals(PhonePortabilityJson.object(selection.get("payload")).get("process")),"LIFECYCLE_SELECTION_PROCESS");
    if(receipt==null)return;requireRecovery(CameraProofFrame.hash(raw(root,io,INTENT)).equals(receipt.get("previous")),"LIFECYCLE_RECEIPT_PREVIOUS");Map<String,Object> q=payload(receipt);keys(q,"oldInstance","newInstance","process","pid","method","count","destroyObserved","registeredBeforeCreate");uuid(q.get("newInstance"));requireRecovery(p.get("oldInstance").equals(q.get("oldInstance"))&&!q.get("newInstance").equals(p.get("oldInstance"))&&p.get("process").equals(q.get("process"))&&number(p.get("pid"),1,Integer.MAX_VALUE)==number(q.get("pid"),1,Integer.MAX_VALUE)&&METHOD.equals(q.get("method"))&&number(q.get("count"),1,1)==1&&Boolean.TRUE.equals(q.get("destroyObserved"))&&Boolean.TRUE.equals(q.get("registeredBeforeCreate")),"LIFECYCLE_NOT_SAME_PROCESS_RECREATION");
  }
  public static Map<String,Object> describe(File root,CameraProofStore.IO io)throws Exception{
    validateRecords(root,io);Map<String,Object> intent=record(root,io,INTENT),receipt=record(root,io,RECEIPT);return map("method",METHOD,"intentConsumed",intent!=null,"recreationConfirmed",receipt!=null,"intent",intent==null?null:payload(intent),"receipt",receipt==null?null:payload(receipt));
  }
  private void publish(String name,Map<String,Object> data)throws Exception{
    guard.assertHeld();requireRecovery(store.state().equals("SELECTION")&&FIXTURE_STEPS.contains(name)&&raw(root,io,name)==null,"LIFECYCLE_CONSUMED_OR_STAGE");String previous=name.equals(INTENT)?ZERO:CameraProofFrame.hash(io.read(new File(root,INTENT),RECORD));Map<String,Object> base=map("kind",name,"owner",store.recordHash("owner"),"selection",store.recordHash("selection"),"previous",previous,"payload",data);Map<String,Object> envelope=new TreeMap<>(base);envelope.put("digest",CameraProofFrame.hash(bytes(json(base))));byte[] bytes=bytes(json(envelope));requireRecovery(bytes.length<=RECORD,"LIFECYCLE_RECORD_CAP");long total=bytes.length;for(String n:io.list(root))total=Math.addExact(total,io.size(new File(root,n)));requireRecovery(total<=FIXTURE_JOURNAL&&io.available(root)>=bytes.length,"LIFECYCLE_CAP_OR_SPACE");File staged=new File(root,name+".new");io.writeNew(staged,bytes);io.publish(staged,new File(root,name));io.syncDirectory(root);validateRecords(root,io);store.state();
  }
  /** Durable consumption precedes the only ephemeral right to request recreation. */
  public synchronized void claim(String instance,String process,long pid)throws Exception{
    requireRecovery(permit==null&&pid>0&&pid<=Integer.MAX_VALUE,"LIFECYCLE_PERMIT");Map<String,Object> p=map("oldInstance",uuid(instance),"process",uuid(process),"pid",pid,"method",METHOD,"count",1);publish(INTENT,p);permit=p;
  }
  private boolean same(String instance,String process,long pid){return permit!=null&&permit.get("oldInstance").equals(instance)&&permit.get("process").equals(process)&&number(permit.get("pid"),1,Integer.MAX_VALUE)==pid;}
  /** Called only after this origin Activity stopped behind its launched picker. */
  public synchronized boolean request(String instance,String process,long pid)throws Exception{
    guard.assertHeld();if(permit==null||requested||!same(instance,process,pid))return false;requireRecovery(store.state().equals("SELECTION"),"LIFECYCLE_SELECTION_RETURNED");requested=true;return true;
  }
  /** Main-thread caller queues this immediately before calling Activity.recreate(). */
  public synchronized void invoked(String instance,String process,long pid)throws Exception{
    guard.assertHeld();requireRecovery(requested&&same(instance,process,pid)&&store.state().equals("SELECTION"),"LIFECYCLE_NOT_REQUESTED");invoked=true;
  }
  public synchronized void destroyed(String instance,String process,long pid)throws Exception{
    guard.assertHeld();if(invoked&&same(instance,process,pid)&&store.state().equals("SELECTION"))destroyed=true;
  }
  public synchronized boolean created(String instance,String previous,String process,long pid,boolean registeredBeforeCreate)throws Exception{
    guard.assertHeld();validateRecords(root,io);if(raw(root,io,RECEIPT)!=null||permit==null||!requested||!invoked||!destroyed)return false;
    requireRecovery(same(previous,process,pid)&&!instance.equals(previous)&&registeredBeforeCreate,"LIFECYCLE_INSTANCE_OR_PROCESS");publish(RECEIPT,map("oldInstance",previous,"newInstance",uuid(instance),"process",process,"pid",pid,"method",METHOD,"count",1,"destroyObserved",true,"registeredBeforeCreate",true));return true;
  }
  public synchronized void requireDestinationProcess(String process,long pid)throws Exception{
    guard.assertHeld();validateRecords(root,io);Map<String,Object> r=record(root,io,RECEIPT);requireRecovery(r!=null,"LIFECYCLE_RECREATION_UNCONFIRMED");Map<String,Object> p=payload(r);requireRecovery(!p.get("process").equals(uuid(process))&&number(p.get("pid"),1,Integer.MAX_VALUE)!=pid&&pid>0&&pid<=Integer.MAX_VALUE,"LIFECYCLE_BACKGROUND_PROCESS_DEATH_REQUIRED");
  }
  /** The actual evidence lane cannot pass on a fixture that omitted either lifecycle stage. */
  public synchronized void requireSuccessfulFixture()throws Exception{
    requireRecovery(store.state().equals("TERMINAL")&&"READBACK_VERIFIED".equals(store.payload("terminal").get("status")),"GENERATED_CHECK_REQUIRED");Map<String,Object> r=record(root,io,RECEIPT);requireRecovery(r!=null,"LIFECYCLE_RECREATION_UNCONFIRMED");Map<String,Object> p=payload(r),destination=store.payload("destination");String selected=uuid(destination.get("process"));requireRecovery(p.get("process").equals(store.payload("selection").get("process"))&&!p.get("process").equals(selected)&&number(destination.get("pid"),1,Integer.MAX_VALUE)!=number(p.get("pid"),1,Integer.MAX_VALUE)&&selected.equals(store.payload("write").get("process"))&&selected.equals(store.payload("verified").get("process")),"LIFECYCLE_STAGE_PROOF_REQUIRED");
  }
}

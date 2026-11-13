package expo.modules.recognitioncpu;
import java.io.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
/** Append-only fixed sidecar. Creation/partial publication consumes the run, never resets it. */
public final class CameraMatrixStore {
  /** Preserve only the exact failed pre-SDK initializer; never publish, delete or adopt it. */
  public static long retainedInitialization(File root,CameraProofStore.IO io)throws Exception{
    require(io.list(root).equals(Collections.singletonList("owner.new")),"RETAINED_INIT_PROFILE");
    byte[] expected=retainedOwner();File file=new File(root,"owner.new");long size=io.size(file);
    require(size==expected.length&&size<=RETAINED_INIT_MAX&&Arrays.equals(io.read(file,RETAINED_INIT_MAX),expected),"RETAINED_INIT_IDENTITY");
    return size;
  }
  private final File root;private final CameraProofStore.IO io;private final String source,apk,process;private final byte[] owner;
  public CameraMatrixStore(File root,CameraProofStore.IO io,String source,String apk,String process,boolean fresh)throws Exception{
    this.root=root;this.io=io;this.source=hash(source);this.apk=hash(apk);this.process=uuid(process);
    owner=bytes(json(map("run",RUN,"source",source,"apk",apk,"model",CameraProofFrame.MODEL,"recipe",CameraProofFrame.RECIPE)));
    if(fresh){require(io.list(root).isEmpty(),"ROOT_CONSUMED");putRaw("owner",owner);append("registry",registry());}
    validate();require(Arrays.equals(io.read(new File(root,"owner"),4096),owner),"OWNER");require(json(read("registry")).equals(json(registry())),"REGISTRY");
  }
  public static void footprint(File root,CameraProofStore.IO io)throws Exception{
    List<String> ns=io.list(root);require(!ns.isEmpty()&&ns.size()<=41,"ROOT_INCOMPLETE");long sum=0;int staged=0;
    for(String n:ns){boolean tmp=n.endsWith(".new");String base=tmp?n.substring(0,n.length()-4):n;int cap=bound(base);long size=io.size(new File(root,n));require(size>=0&&size<=cap,"RECORD_BOUND");sum=Math.addExact(sum,size);if(tmp)staged++;}
    require(sum<=ACTIVE_BOOK&&staged<=1,"BOOK_CAP");
    // Even a bounded torn record is retained but prevents all further trust/admission.
    require(staged==0&&ns.contains("owner")&&ns.contains("registry"),"TORN_RECORD");
  }
  private void validate()throws Exception{io.syncDirectory(root);footprint(root,io);require(Arrays.equals(io.read(new File(root,"owner"),4096),owner),"OWNER");for(String n:io.list(root))if(!n.equals("owner"))read(n);}
  private void putRaw(String name,byte[] b)throws Exception{require(b.length>0&&b.length<=bound(name),"RECORD_CAP");long total=0;for(String n:io.list(root)){require(!n.endsWith(".new"),"TORN_RECORD");total=Math.addExact(total,io.size(new File(root,n)));}require(total+b.length<=ACTIVE_BOOK&&io.available(root)>=b.length,"BOOK_OR_FREE");File temp=new File(root,name+".new"),dest=new File(root,name);require(io.size(temp)<0&&io.size(dest)<0,"RECORD_CONSUMED");io.writeNew(temp,b);io.publish(temp,dest);io.syncDirectory(root);}
  private void append(String name,Map<String,Object> payload)throws Exception{Map<String,Object> base=map("ownerSha256",CameraProofFrame.hash(owner),"name",name,"payload",payload);String digest=CameraProofFrame.hash(bytes(json(base)));Map<String,Object> record=new TreeMap<>(base);record.put("digest",digest);putRaw(name,bytes(json(record)));}
  public synchronized boolean has(String n)throws Exception{bound(n);return io.size(new File(root,n))>=0;}
  public synchronized Map<String,Object> read(String n)throws Exception{byte[] b=io.read(new File(root,n),bound(n));Map<String,Object> m=parse(b,bound(n));keys(m,"ownerSha256","name","payload","digest");require(CameraProofFrame.hash(owner).equals(m.get("ownerSha256"))&&n.equals(m.get("name")),"RECORD_BINDING");Map<String,Object> base=new TreeMap<>(m);Object digest=base.remove("digest");require(CameraProofFrame.hash(bytes(json(base))).equals(digest)&&Arrays.equals(bytes(json(m)),b),"RECORD_HASH");return PhonePortabilityJson.object(m.get("payload"));}
  public synchronized String next()throws Exception{
    validate();if(has("seal"))return "SEALED";if(!has(PERMISSIONS[0]+".permission"))return PERMISSIONS[0];if(!has(PERMISSIONS[1]+".permission"))return PERMISSIONS[1];
    for(Case c:CASES){if(c.index==4&&!has(PERMISSIONS[2]+".permission"))return PERMISSIONS[2];if(!has(c.id+".intent"))return c.id;if(!has(c.id+".terminal"))return "UNRESOLVED";if(!Boolean.TRUE.equals(read(c.id+".terminal").get("advance")))return "STOP";}return "COMPLETE";
  }
  public synchronized void permission(String id,boolean granted,boolean idle,boolean previewReady)throws Exception{
    require(Arrays.asList(PERMISSIONS).contains(id)&&id.equals(next())&&idle,"PERMISSION_SEQUENCE");require(id.equals(PERMISSIONS[0])?!granted:granted&&previewReady,"PERMISSION_FACT");Map<String,Object> p=map("checkId",id,"granted",granted,"idle",true,"previewReadyUiObserved",previewReady,"process",process,"sdkCalls",0);if(id.equals(PERMISSIONS[2]))p.put("afterL04Terminal",CameraProofFrame.hash(raw("L04-PERMISSION-LOSS.terminal")));append(id+".permission",p);
  }
  public synchronized void consume(Case c,Map<String,Object> request,String nonce)throws Exception{require(c.id.equals(next()),"CASE_CONSUMED_OR_ORDER");append(c.id+".intent",map("caseId",c.id,"jobId",c.job,"targetSha256",c.target,"source",source,"apk",apk,"process",process,"request",request,"requestSha256",CameraProofFrame.hash(bytes(json(request))),"nonce",uuid(nonce),"sdkLimit",1));}
  public synchronized void invoke(Case c,long at)throws Exception{require(c.control()&&has(c.id+".intent")&&!has(c.id+".terminal"),"INVOKE_STATE");number(at,0,Long.MAX_VALUE);append(c.id+".invoke",map("invocationUiObservedMs",at,"nativeObservedNanos",System.nanoTime(),"ordinal",1,"sensorAttestation",false));}
  public synchronized void phase(Case c,Map<String,Object> p)throws Exception{phaseObserved(c,p,c.action(),c.index!=3);}
  synchronized void phaseObserved(Case c,Map<String,Object> p,String nativeReason,boolean nativeGranted)throws Exception{
    require(c.control()&&has(c.id+".invoke")&&!has(c.id+".terminal"),"PHASE_STATE");keys(p,"action","actionMs","settledMs","pendingAtAction","outcome");require(c.action().equals(p.get("action"))||"TIMEOUT".equals(p.get("action")),"ACTION");number(p.get("actionMs"),0,Long.MAX_VALUE);number(p.get("settledMs"),0,Long.MAX_VALUE);require(p.get("pendingAtAction") instanceof Boolean&&Arrays.asList("FULFILLED","REJECTED").contains(p.get("outcome")),"PHASE");long invoke=number(read(c.id+".invoke").get("invocationUiObservedMs"),0,Long.MAX_VALUE),action=number(p.get("actionMs"),invoke,Long.MAX_VALUE),settled=number(p.get("settledMs"),invoke,Long.MAX_VALUE);require(Boolean.TRUE.equals(p.get("pendingAtAction"))?action<=settled:action>=settled,"PHASE_ORDER");if(!"TIMEOUT".equals(p.get("action")))require(c.index==3?!nativeGranted:c.action().equals(nativeReason),"NATIVE_ACTION");Map<String,Object> observed=new TreeMap<>(p);observed.put("nativeCancellationReason",nativeReason);observed.put("nativeCameraPermissionGranted",nativeGranted);append(c.id+".phase",observed);
  }
  public synchronized Case outstanding()throws Exception{validate();Case found=null;for(Case c:CASES)if(has(c.id+".intent")&&!has(c.id+".terminal")){require(found==null,"MULTIPLE_OWNERS");found=c;}return found;}
  public synchronized void terminal(Case c,Map<String,byte[]> nativeProfile,boolean oldProcess,boolean permissionLost,boolean sdkSettledObserved)throws Exception{
    require(outstanding()==c,"TERMINAL_STATE");Map<String,Object> intent=read(c.id+".intent");boolean expectedImageFree=nativeProfile.keySet().equals(new HashSet<>(Arrays.asList("request.json","reservation","failure.json","done","resolution")))||nativeProfile.keySet().equals(new HashSet<>(Arrays.asList("request.json","reservation","interruption.json","done","resolution")));
    boolean old=oldProcess&&!process.equals(intent.get("process"));boolean observed=c.control()&&has(c.id+".phase")&&c.action().equals(read(c.id+".phase").get("action"));boolean recoveredLoss=old&&c.index==3&&permissionLost&&has(c.id+".invoke");
    boolean advance=c.control()?expectedImageFree&&((observed&&sdkSettledObserved)||recoveredLoss):nativeProfile.keySet().equals(new LinkedHashSet<>(CameraEvidenceExport.ROLES))&&published(nativeProfile);
    if(old&&!recoveredLoss)advance=false;
    append(c.id+".terminal",map("caseId",c.id,"advance",advance,"mode",old?"EXACT_OLD_PROCESS_CLASSIFIED_WITH_LIMITS":sdkSettledObserved?"OBSERVED_CALLBACK_FINALIZED":"SDK_NOT_OBSERVED","nativeProfileSha256",profileHash(nativeProfile),"actualSdkSettlementObserved",!old&&sdkSettledObserved,"physicalDrainProven",false,"permissionLossNativeObserved",permissionLost,"sdkOutcomeUnknown",old));
  }
  private static boolean published(Map<String,byte[]> p){byte[] b=p.get("resolution");return b!=null&&new String(b,java.nio.charset.StandardCharsets.UTF_8).contains("\nPUBLISHED\n");}
  public static String profileHash(Map<String,byte[]> p){Map<String,Object> hashes=new TreeMap<>();for(Map.Entry<String,byte[]> e:p.entrySet())hashes.put(e.getKey(),CameraProofFrame.hash(e.getValue()));return CameraProofFrame.hash(bytes(json(hashes)));}
  public synchronized void seal()throws Exception{validate();require(outstanding()==null&&!has("seal"),"SEAL_STATE");List<Object> rows=new ArrayList<>();for(Case c:CASES)rows.add(map("caseId",c.id,"status",has(c.id+".terminal")?"ATTEMPTED":"NOT_ATTEMPTED","terminalSha256",has(c.id+".terminal")?CameraProofFrame.hash(raw(c.id+".terminal")):null));append("seal",map("run",RUN,"cases",rows,"cameraProofAccepted",false));}
  public synchronized void consumeExport()throws Exception{validate();require(has("seal")&&!has("export-attempt"),"EXPORT_CONSUMED_OR_UNSEALED");append("export-attempt",map("run",RUN,"source",source,"apk",apk,"sealSha256",CameraProofFrame.hash(raw("seal")),"outputCap",OUTPUT,"filename",FILENAME));}
  public synchronized void exportTerminal(String status,Map<String,Object> result)throws Exception{require(has("export-attempt")&&Arrays.asList("CANCELLED","FAILED_UNVERIFIED","READBACK_VERIFIED").contains(status),"EXPORT_STATE");append("export-terminal",map("status",status,"result",result,"attemptSha256",CameraProofFrame.hash(raw("export-attempt"))));}
  public synchronized byte[] raw(String name)throws Exception{bound(name);if(!name.equals("owner"))read(name);return io.read(new File(root,name),bound(name));}
  public synchronized List<String> evidenceNames()throws Exception{validate();List<String> a=new ArrayList<>();for(String n:io.list(root))if(!n.startsWith("export-"))a.add(n);Collections.sort(a);return a;}
  public synchronized Map<String,Object> status()throws Exception{return map("kind","CAMERA_MATRIX_STATUS","run",RUN,"next",next(),"exportConsumed",has("export-attempt"),"exportResult",has("export-terminal")?read("export-terminal"):null,"source",source,"apk",apk,"sdkHardCap",false,"physicalDrainProven",false);}

  /** One fixed request code; retain ownership until actual callback/write completion. */
  public static final class ExportSession<T> {
    public static final class Ticket<T>{public final T payload;public volatile boolean cancelled;private boolean dispatched,writing,finished;private final java.util.concurrent.atomic.AtomicBoolean settled=new java.util.concurrent.atomic.AtomicBoolean();private Ticket(T p){payload=p;}public boolean settle(){return settled.compareAndSet(false,true);}}
    private final java.util.concurrent.atomic.AtomicBoolean busy,closed;private Ticket<T> active;
    public ExportSession(java.util.concurrent.atomic.AtomicBoolean busy,java.util.concurrent.atomic.AtomicBoolean closed){this.busy=busy;this.closed=closed;}
    public synchronized Ticket<T> begin(T payload,java.util.concurrent.Callable<Void> consume)throws Exception{require(active==null&&!closed.get()&&busy.compareAndSet(false,true),"EXPORT_BUSY");try{consume.call();require(!closed.get(),"CLOSED");active=new Ticket<>(payload);return active;}catch(Exception|Error e){busy.set(false);throw e;}}
    public synchronized void dispatch(Ticket<T> t,Runnable launch){require(active==t&&!t.dispatched&&!t.cancelled&&!closed.get(),"EXPORT_STALE");t.dispatched=true;launch.run();}
    public synchronized Ticket<T> callback(int code){Ticket<T> t=active;if(code!=REQUEST||t==null||!t.dispatched||t.writing||t.finished)return null;t.writing=true;return t;}
    public synchronized void cancel(){if(active!=null)active.cancelled=true;}
    public synchronized void finish(Ticket<T> t){require(active==t&&t.writing&&!t.finished,"EXPORT_DRAIN_UNKNOWN");t.finished=true;active=null;busy.set(false);}
    public synchronized void failBeforeDispatch(Ticket<T> t){if(active==t&&!t.dispatched&&!t.writing){t.finished=true;active=null;busy.set(false);}else if(active==t)t.cancelled=true;}
  }
}

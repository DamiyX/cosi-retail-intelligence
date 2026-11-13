package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.file.*;
import java.util.*;

/** Namespace visibility and durable acknowledgment are deliberately separate in this fake. */
public final class CameraProofDurabilityChecks {
  private static final String SOURCE="a".repeat(64),PROCESS="11111111-1111-1111-1111-111111111111",NEXT="22222222-2222-2222-2222-222222222222";
  private static int checks;
  private static void check(boolean ok,String why){checks++;if(!ok)throw new AssertionError(why);}
  private interface Work {void run()throws Exception;}
  private static Map<String,String> visible(File root)throws IOException{
    Map<String,String> m=new TreeMap<>();for(File f:Objects.requireNonNull(root.listFiles()))m.put(f.getName(),CameraProofFrame.hash(Files.readAllBytes(f.toPath())));return m;
  }
  static final class DurableIO extends CameraProofChecks.HostIO {
    Map<String,String> durable=new TreeMap<>();boolean failBarrier;String failAfterRole="";int attempts,successes;
    // This is a model acknowledgment, not a claim about host filesystem flush behavior.
    public void syncDirectory(File root)throws IOException{
      attempts++;if(failBarrier)throw new IOException("CAMERA_IO_DIRECTORY_SYNC_EIO");
      durable=visible(root);successes++;
    }
    @Override public void publish(File from,File to)throws IOException{
      super.publish(from,to);
      if(!failAfterRole.isEmpty()&&to.getName().endsWith("."+failAfterRole)){failAfterRole="";failBarrier=true;}
      syncDirectory(to.getParentFile());
    }
  }
  private static CameraProofStore open(File root,DurableIO io,String process)throws IOException{return new CameraProofStore(root,io,SOURCE,process);}
  private static void blocked(File root,DurableIO io,Work action)throws Exception{
    Map<String,String> bytes=visible(root),durable=new TreeMap<>(io.durable);int attempts=io.attempts,successes=io.successes;
    try{action.run();throw new AssertionError("persistent sync failure must refuse");}catch(IOException expected){check(expected.getMessage().equals("CAMERA_IO_DIRECTORY_SYNC_EIO"),"primary sync code retained");}
    check(io.attempts>attempts&&io.successes==successes,"new verified barrier attempted, never acknowledged");
    check(bytes.equals(visible(root))&&durable.equals(io.durable),"no rewrite/delete or false durable acknowledgment");
  }
  private static void exerciseAllConsumers(File root,DurableIO io,CameraProofStore store,String ticket)throws Exception{
    for(int retry=0;retry<2;retry++){
      blocked(root,io,store::status);blocked(root,io,store::reserve);blocked(root,io,()->store.recover(true));
      blocked(root,io,()->store.readNumerical(ticket));blocked(root,io,store::inspectInterrupted);
      blocked(root,io,()->open(root,io,NEXT));
    }
  }
  private static String generatedProfile(CameraProofStore store)throws Exception{
    String ticket=store.reserve();store.write(ticket,"request.json","{}".getBytes());store.write(ticket,"raw.jpg",CameraProofChecks.jpeg(3,2,1));
    store.write(ticket,"preview.png",new byte[]{1});store.write(ticket,"numerical.json","{\"generated\":true}".getBytes());store.write(ticket,"receipt.json","{}".getBytes());store.finish(ticket);return ticket;
  }
  private static void finalResolution(File parent,boolean published)throws Exception{
    File root=new File(parent,published?"published-resolution":"interrupted-resolution");DurableIO io=new DurableIO();CameraProofStore store=open(root,io,PROCESS);String ticket;
    if(published){ticket=generatedProfile(store);check((Long)store.status().get("claimedBytes")>=CameraProofStore.RESERVATION,"candidate holds full claim before uncertain resolution");io.failAfterRole="resolution";try{store.resolve(ticket,"PUBLISHED","NONE");throw new AssertionError("expected failure");}catch(IOException expected){checks++;}}
    else{
      io.fault="rename";try{store.reserve();throw new AssertionError("expected failed admission");}catch(IOException expected){checks++;}io.fault="";
      ticket=io.list(root).stream().filter(n->n.endsWith(".reservation.new")).findFirst().orElseThrow().substring(0,36);
      check((Long)store.status().get("claimedBytes")>=CameraProofStore.RESERVATION,"orphan holds full claim before interrupted resolution");
      io.failAfterRole="resolution";try{store.recover(true);throw new AssertionError("expected failure");}catch(IOException expected){checks++;}
    }
    check(visible(root).containsKey(ticket+".resolution")&&!io.durable.containsKey(ticket+".resolution"),"resolution is visible but NOT durably acknowledged");
    exerciseAllConsumers(root,io,store,ticket);
    Map<String,String> bytes=visible(root);io.failBarrier=false;
    if(published){store.status();check(io.durable.equals(bytes)&&visible(root).equals(bytes),"same-process successful barrier acknowledges existing bytes without rewrite");}
    CameraProofStore reopened=open(root,io,NEXT);
    check(io.durable.equals(bytes)&&visible(root).equals(bytes),"successful reopen barrier acknowledges existing bytes, no rewriting");
    reopened.recover(true);check(visible(root).equals(bytes),"resolved recovery idempotent after successful barrier");
    Map<String,Object> status=reopened.status();check(((Long)status.get("ownedBytes")).longValue()==(Long)status.get("claimedBytes"),"capacity released only following barrier");
    if(published)check(new String(reopened.readNumerical(ticket)).contains("generated"),"durable published result remains readable");
    else try{reopened.readNumerical(ticket);throw new AssertionError("interrupted is never ready");}catch(IllegalArgumentException expected){checks++;}
    int count=io.list(root).size();reopened.reserve();check(io.list(root).size()==count+1,"new generated admission only after durable acknowledgment");
  }
  private static void siblingMarkers(File parent,boolean invalidation)throws Exception{
    File root=new File(parent,invalidation?"invalidation":"done");DurableIO io=new DurableIO();CameraProofStore store=open(root,io,PROCESS);String ticket;
    if(invalidation){ticket=generatedProfile(store);store.resolve(ticket,"PUBLISHED","NONE");io.failAfterRole="invalidated";try{store.invalidate(ticket);throw new AssertionError("expected failure");}catch(IOException expected){checks++;}}
    else{ticket=store.reserve();store.write(ticket,"failure.json","{}".getBytes());io.failAfterRole="done";try{store.finish(ticket);throw new AssertionError("expected failure");}catch(IOException expected){checks++;}}
    String marker=ticket+(invalidation?".invalidated":".done");check(visible(root).containsKey(marker)&&!io.durable.containsKey(marker),"sibling marker visibility is not durability");
    exerciseAllConsumers(root,io,store,ticket);Map<String,String> bytes=visible(root);io.failBarrier=false;CameraProofStore reopened=open(root,io,NEXT);
    check(io.durable.equals(bytes),"barrier acknowledges sibling before accepting it");
    if(!invalidation)reopened.recover(true);
    for(Map.Entry<String,String> e:bytes.entrySet())check(e.getValue().equals(visible(root).get(e.getKey())),"existing bytes retained after later classification");
    try{reopened.readNumerical(ticket);throw new AssertionError("invalidated/interrupted numerical never ready");}catch(IllegalArgumentException expected){checks++;}
    Map<String,String> stable=visible(root);open(root,io,PROCESS).recover(true);check(stable.equals(visible(root)),"sibling classification repeat adds no duplicate files");
  }
  public static void main(String[] args)throws Exception{
    File parent=new File(args[0]);if(!parent.mkdir())throw new IOException("exclusive generated destination");
    finalResolution(parent,false);finalResolution(parent,true);siblingMarkers(parent,false);siblingMarkers(parent,true);
    System.out.println("{\"kind\":\"GENERATED_CAMERA_DURABILITY_CHECKS\",\"checks\":"+checks+",\"nativeValidated\":false,\"modelExecuted\":false,\"durabilityModel\":\"VISIBLE_NAMES_DIFFER_FROM_ACKNOWLEDGED_NAMESPACE\"}");
  }
}

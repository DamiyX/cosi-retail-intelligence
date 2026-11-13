package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.*;

/** Generated host evidence for actual exporter/store/journal/session logic; no Android SAF proof. */
public final class CameraEvidenceExportChecks {
  private static int checks;
  private interface Work{void run()throws Exception;}
  private static void ok(boolean b,String m){checks++;if(!b)throw new AssertionError(m);}
  private static void refuses(Work w)throws Exception{try{w.run();throw new AssertionError("expected refusal");}catch(IOException|IllegalArgumentException|IllegalStateException e){checks++;}}
  private static Map<String,byte[]> generated(){Map<String,byte[]> m=new LinkedHashMap<>();for(String s:CameraEvidenceExport.ROLES)m.put(s,("generated "+s).getBytes(java.nio.charset.StandardCharsets.UTF_8));m.put("manifest.json","{}".getBytes(java.nio.charset.StandardCharsets.UTF_8));return m;}
  private static final class Target implements CameraEvidenceExport.Destination{
    ByteArrayOutputStream data=new ByteArrayOutputStream();int at,writes;boolean shortWrite,syncFailure,readFailure,corrupt;Runnable onWrite=()->{};
    public long size(){return data.size();}
    public int write(byte[] b,int offset,int n){writes++;int count=shortWrite?Math.max(0,n-1):n;data.write(b,offset,count);onWrite.run();return count;}
    public void sync()throws IOException{if(syncFailure)throw new IOException("generated fsync fault");}
    public void rewind(){at=0;}
    public int read(byte[] b)throws IOException{if(readFailure)throw new IOException("generated readback fault");byte[] bytes=data.toByteArray();if(at>=bytes.length)return -1;int n=Math.min(b.length,bytes.length-at);System.arraycopy(bytes,at,b,0,n);if(corrupt)b[0]^=1;at+=n;return n;}
  }
  private static void output()throws Exception{
    Map<String,byte[]> generated=generated();Target t=new Target();Map<String,Object> result=CameraEvidenceExport.write(generated,t,()->false);
    ok(result.get("status").equals("READBACK_VERIFIED")&&((Long)result.get("bundleBytes")).longValue()==t.size(),"actual count/readback");
    ok(result.get("bundleSha256").equals(CameraProofFrame.hash(t.data.toByteArray())),"actual zip hash");
    try(ZipInputStream z=new ZipInputStream(new ByteArrayInputStream(t.data.toByteArray()))){int count=0;ZipEntry e;while((e=z.getNextEntry())!=null){ok(generated.containsKey(e.getName())&&Arrays.equals(generated.get(e.getName()),z.readAllBytes()),"exact entry bytes");count++;}ok(count==9,"fixed entries");}
    ok(Boolean.FALSE.equals(result.get("providerDirectoryDurabilityProven"))&&Boolean.FALSE.equals(result.get("powerLossDurabilityProven")),"no durability overclaim");
    Target occupied=new Target();occupied.data.write(new byte[]{1,2,3});refuses(()->CameraEvidenceExport.write(generated,occupied,()->false));ok(Arrays.equals(occupied.data.toByteArray(),new byte[]{1,2,3})&&occupied.writes==0,"nonempty destination unchanged/no truncate");
    for(String kind:List.of("short","sync","read","corrupt","cancel-start","cancel-write")){
      Target x=new Target();AtomicBoolean cancel=new AtomicBoolean(kind.equals("cancel-start"));x.shortWrite=kind.equals("short");x.syncFailure=kind.equals("sync");x.readFailure=kind.equals("read");x.corrupt=kind.equals("corrupt");if(kind.equals("cancel-write"))x.onWrite=()->cancel.set(true);
      refuses(()->CameraEvidenceExport.write(generated,x,cancel::get));ok(!kind.equals("cancel-start")||x.writes==0,"cancel-before-write");if(kind.equals("short"))ok(x.writes==1,"ZIP close cannot write after short write");
    }
    Map<String,byte[]> wrong=generated();wrong.put("../private",new byte[]{1});refuses(()->CameraEvidenceExport.write(wrong,new Target(),()->false));
    Map<String,byte[]> huge=generated();huge.put("raw.jpg",new byte[CameraProofStore.EXPORT_OUTPUT]);Target bounded=new Target();refuses(()->CameraEvidenceExport.write(huge,bounded,()->false));ok(bounded.size()<=CameraProofStore.EXPORT_OUTPUT,"ZIP headers included in cap");
    Map<String,byte[]> noManifest=generated();noManifest.remove("manifest.json");refuses(()->CameraEvidenceExport.write(noManifest,new Target(),()->false));
    Map<String,byte[]> saved=generated();saved.remove("manifest.json");refuses(()->CameraEvidenceExport.entries(saved,"a".repeat(64),"b".repeat(64))); // exact original hashes unavailable on host; no relaxed pins
  }
  private static void destinations(){
    for(String[] accepted:new String[][]{{"com.android.externalstorage.documents","primary:Download/test.zip"},{"com.android.providers.downloads.documents","12"},{"com.android.providers.downloads.documents","msf:12"},{"com.android.providers.downloads.documents","raw:/storage/emulated/0/Download/test.zip"}})ok(CameraEvidenceExport.localDocument("content",accepted[0],accepted[1]),"local Downloads");
    for(String[] rejected:new String[][]{{"file","com.android.externalstorage.documents","primary:Download/test.zip"},{"content","com.google.android.apps.docs.storage","12"},{"content","com.android.externalstorage.documents","primary:Pictures/test.zip"},{"content","com.android.externalstorage.documents","primary:Download/../test.zip"},{"content","com.android.externalstorage.documents","primary:Download/a/test.zip"},{"content","com.android.providers.downloads.documents","raw:/storage/emulated/0/Pictures/test.zip"},{"content","com.android.providers.downloads.documents","msd:12"}})ok(!CameraEvidenceExport.localDocument(rejected[0],rejected[1],rejected[2]),"nonlocal/unknown path refusal");
  }
  private static void sessions()throws Exception{
    AtomicBoolean busy=new AtomicBoolean(),closed=new AtomicBoolean();CameraEvidenceSession<String> s=new CameraEvidenceSession<>(busy,closed);int[] consumed={0};
    CameraEvidenceSession.Ticket<String> t=s.begin("payload",()->{consumed[0]++;return null;});ok(busy.get()&&consumed[0]==1,"consume before picker/busy");
    refuses(()->s.begin("other",()->null));ok(s.callback(40000)==null,"other export callback ignored");
    s.dispatch(t,()->{});s.cancel();ok(busy.get()&&t.cancelled,"picker cancel retains callback ownership");
    CameraEvidenceSession.Ticket<String> callback=s.callback(CameraEvidenceSession.REQUEST);ok(callback==t&&s.callback(CameraEvidenceSession.REQUEST)==null,"one writer per callback");
    s.cancel();ok(busy.get(),"cancel during writer does not release");s.finish(t);ok(!busy.get()&&s.callback(CameraEvidenceSession.REQUEST)==null,"actual callback drains");
    CameraEvidenceSession.Ticket<String> next=s.begin("later",()->null);s.failBeforeDispatch(t);ok(busy.get()&&!next.cancelled,"stale ticket cannot release or cancel another");s.failBeforeDispatch(next);ok(!busy.get(),"proven undispatched drain");
    CameraEvidenceSession.Ticket<String> destroyed=s.begin("destroyed",()->null);s.dispatch(destroyed,()->{});closed.set(true);s.cancel();ok(busy.get(),"destruction pending callback retained");s.callback(CameraEvidenceSession.REQUEST);s.finish(destroyed);ok(!busy.get(),"destroyed callback drained");refuses(()->s.begin("closed",()->null));
    closed.set(false);busy.set(true);refuses(()->s.begin("external owner",()->null));ok(busy.get(),"busy refusal does not clear foreign owner");busy.set(false);
    refuses(()->s.begin("sync fail",()->{throw new IOException("guard sync");}));ok(!busy.get(),"pre-picker IO failed without active callback");
  }
  private static final String SOURCE="a".repeat(64),PROCESS="00000000-0000-0000-0000-000000000001";
  private static void journal(File parent)throws Exception{
    CameraProofChecks.HostIO io=new CameraProofChecks.HostIO();File root=new File(parent,"journal");Files.createDirectories(root.toPath());CameraEvidenceJournal j=new CameraEvidenceJournal(root,io);j.consume(PROCESS,SOURCE,"b".repeat(64));
    byte[] before=Files.readAllBytes(new File(root,"attempt").toPath());refuses(()->new CameraEvidenceJournal(root,io).consume(PROCESS,SOURCE,"b".repeat(64)));ok(Arrays.equals(before,Files.readAllBytes(new File(root,"attempt").toPath())),"reopen no replay/rewrite");j.terminal("CANCELLED");refuses(()->j.terminal("READBACK_VERIFIED"));
    File torn=new File(parent,"torn");Files.createDirectories(torn.toPath());Files.writeString(new File(torn,"attempt").toPath(),"partial");refuses(()->new CameraEvidenceJournal(torn,io).consume(PROCESS,SOURCE,"b".repeat(64)));refuses(()->new CameraEvidenceJournal(torn,io).terminal("READBACK_VERIFIED"));
    File fault=new File(parent,"sync-fault");Files.createDirectories(fault.toPath());CameraProofStore.IO faultIO=new CameraProofChecks.HostIO(){int barriers;@Override public void syncDirectory(File r)throws IOException{if(++barriers>=2)throw new IOException("persistent directory fault");}};
    refuses(()->new CameraEvidenceJournal(fault,faultIO).consume(PROCESS,SOURCE,"b".repeat(64)));ok(new File(fault,"attempt").isFile(),"failed acknowledgment retains attempt");refuses(()->new CameraEvidenceJournal(fault,faultIO).terminal("READBACK_VERIFIED"));
  }
  private static void store(File parent)throws Exception{
    CameraProofChecks.HostIO io=new CameraProofChecks.HostIO();File root=new File(parent,"store");CameraProofStore s=new CameraProofStore(root,io,SOURCE,PROCESS);
    ok(CameraProofStore.CAMERA_CAP==234618880&&((Long)s.status().get("aggregateClaimedBytes"))==(Long)s.status().get("claimedBytes")+33816576,"permanent aggregate carveout");
    refuses(()->s.savedEvidence("00000000-0000-0000-0000-000000000002"));refuses(()->s.savedEvidence(CameraEvidenceExport.JOB));
    // Exact published profile with generated bytes: test Store read/commit/hash gates,
    // not fixed original-hash admission (original photo is never extracted here).
    String id=CameraEvidenceExport.JOB;Files.writeString(new File(root,id+".reservation").toPath(),SOURCE+"\n"+id+"\n"+PROCESS+"\n"+CameraProofStore.RESERVATION+"\n");
    refuses(()->s.savedEvidence(id));
    for(String role:List.of("raw.jpg","preview.png","numerical.json","receipt.json","request.json"))s.write(id,role,("generated-"+role).getBytes(java.nio.charset.StandardCharsets.UTF_8));s.finish(id);refuses(()->s.savedEvidence(id));s.resolve(id,"PUBLISHED","OK");
    Map<String,byte[]> result=s.savedEvidence(id);ok(result.size()==8&&Arrays.equals(result.get("raw.jpg"),"generated-raw.jpg".getBytes(java.nio.charset.StandardCharsets.UTF_8)),"exact complete published Store bytes");
    byte[] original=Files.readAllBytes(new File(root,id+".raw.jpg").toPath());Files.writeString(new File(root,id+".raw.jpg").toPath(),"changed");refuses(()->s.savedEvidence(id));Files.write(new File(root,id+".raw.jpg").toPath(),original);
    Files.writeString(new File(root,id+".request.json.new").toPath(),"partial");refuses(()->s.savedEvidence(id));
    File cap=new File(parent,"cap");CameraProofStore capped=new CameraProofStore(cap,io,SOURCE,PROCESS);
    for(int n=0;n<9;n++){String generatedId=String.format(java.util.Locale.ROOT,"00000000-0000-0000-0000-%012d",n+10);Files.writeString(new File(cap,generatedId+".reservation").toPath(),SOURCE+"\n"+generatedId+"\n"+PROCESS+"\n"+CameraProofStore.RESERVATION+"\n");}
    Map<String,Long> preserved=new TreeMap<>();for(File f:Objects.requireNonNull(cap.listFiles()))preserved.put(f.getName(),f.length());
    refuses(capped::reserve);ok(new CameraProofStore(cap,io,SOURCE,PROCESS).status().get("claimedBytes").equals(capped.status().get("claimedBytes")),"reopen cap unchanged");
    // A pre-existing tenth old-budget reservation must refuse reopen with every byte retained.
    String extra="00000000-0000-0000-0000-000000000099";Files.writeString(new File(cap,extra+".reservation").toPath(),SOURCE+"\n"+extra+"\n"+PROCESS+"\n"+CameraProofStore.RESERVATION+"\n");refuses(()->new CameraProofStore(cap,io,SOURCE,PROCESS));for(Map.Entry<String,Long> e:preserved.entrySet())ok(new File(cap,e.getKey()).length()==e.getValue(),"no eviction under reduced cap");
  }
  public static void main(String[] args)throws Exception{File root=new File(args[0]);Files.createDirectories(root.toPath());output();destinations();sessions();journal(root);store(root);System.out.println("CameraEvidenceExportChecks assertions="+checks+"; host generated only; no SAF/original-image runtime proof");}
}

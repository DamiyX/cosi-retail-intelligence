package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Generated production-boundary checks, never a physical image/SAF/stationarity claim. */
public final class CameraStationaryChecks {
  private static int checks;private static final String OWNER="a".repeat(64),SOURCE="b".repeat(64),APK="c".repeat(64),PROCESS="00000000-0000-0000-0000-000000000001";
  private interface Work{void run()throws Exception;}
  private static void ok(boolean b,String s){checks++;if(!b)throw new AssertionError(s);}
  private static void refuses(Work w)throws Exception{try{w.run();throw new AssertionError("expected refusal");}catch(IOException|IllegalArgumentException|IllegalStateException e){checks++;}}
  private static byte[] utf(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private static Map<String,byte[]> copy(Map<String,byte[]> input){Map<String,byte[]> out=new LinkedHashMap<>();input.forEach((k,v)->out.put(k,v.clone()));return out;}
  private static final class Fixture{
    final File side,root;final CameraProofChecks.HostIO io=new CameraProofChecks.HostIO();final CameraStationarySlot slot;final CameraProofStore store;final byte[] intent;final Map<String,String> facts;
    Fixture(File parent,String name)throws Exception{side=new File(parent,name+"-side");Files.createDirectories(side.toPath());root=new File(parent,name+"-store");slot=new CameraStationarySlot(side,io);intent=slot.intent(SOURCE,APK,OWNER,PROCESS,123,CameraStationarySlot.ACK);facts=CameraStationarySlot.validateIntent(intent);store=new CameraProofStore(root,io,OWNER,PROCESS);}
    Map<String,byte[]> finish()throws Exception{
      String job=store.reserveStationary();ok(job.equals(CameraStationarySlot.JOB),"only compiled job reserved");
      byte[] raw=CameraProofChecks.jpeg(3,2,6),preview=new byte[]{10,20,30};String request="{\"reportedWidth\":3,\"reportedHeight\":2,\"previewWidth\":300,\"previewHeight\":400,\"layout\":\"A\",\"contentMode\":\"FILL\",\"sourceSha256\":\""+OWNER+"\",\"purpose\":\""+CameraStationarySlot.SLOT+"\",\"stationaryJob\":\""+job+"\",\"targetId\":\""+CameraStationarySlot.TARGET+"\",\"targetSha256\":\""+CameraStationarySlot.TARGET_SHA+"\",\"captureSourceIndexSha256\":\""+SOURCE+"\",\"captureApkSha256\":\""+APK+"\",\"intentSha256\":\""+CameraProofFrame.hash(intent)+"\"}";
      String numerical="{\"jobId\":\""+job+"\",\"sourceSha256\":\""+OWNER+"\",\"modelSha256\":\""+CameraProofFrame.MODEL+"\",\"recipe\":\""+CameraProofFrame.RECIPE+"\",\"jpegSha256\":\""+CameraProofFrame.hash(raw)+"\",\"previewSha256\":\""+CameraProofFrame.hash(preview)+"\",\"width\":3,\"height\":2,\"orientation\":6,\"jpegBytes\":"+raw.length+",\"geometryStatus\":\"INCONCLUSIVE\",\"physicalFovProven\":false,\"cameraProofAccepted\":false}";
      store.write(job,"raw.jpg",raw);store.write(job,"preview.png",preview);store.write(job,"request.json",utf(request));store.write(job,"numerical.json",utf(numerical));store.write(job,"receipt.json",utf(numerical));store.finish(job);refuses(store::stationaryEvidence);store.resolve(job,"PUBLISHED","OK");return store.stationaryEvidence();
    }
  }
  private static void records(File root)throws Exception{
    Fixture f=new Fixture(root,"records");ok(f.slot.status().equals("CAPTURE_CONSUMED"),"intent consumes");refuses(()->f.slot.intent(SOURCE,APK,OWNER,PROCESS,124,CameraStationarySlot.ACK));refuses(()->new CameraStationarySlot(f.side,f.io).intent(SOURCE,APK,OWNER,PROCESS,125,CameraStationarySlot.ACK));
    byte[] before=Files.readAllBytes(new File(f.side,"intent").toPath());
    for(String key:List.of("target","targetSha256","runtimeSource","captureApk","owner","process","layout","mode","readiness","intentNanos")){
      String text=new String(before,StandardCharsets.UTF_8);String broken=text.replace(key+"="+f.facts.get(key),key+"=WRONG");refuses(()->CameraStationarySlot.validateIntent(utf(broken)));
    }
    for(byte[] b:List.of(new byte[0],Arrays.copyOf(before,30),utf(new String(before,StandardCharsets.UTF_8)+"extra=1\n")))refuses(()->CameraStationarySlot.validateIntent(b));
    ok(Arrays.equals(before,Files.readAllBytes(new File(f.side,"intent").toPath())),"negative parsing leaves original intact");
    File empty=new File(root,"empty-side");Files.createDirectories(empty.toPath());ok(new CameraStationarySlot(empty,f.io).status().equals("CONSUMED_INCOMPLETE"),"empty existing root status never AVAILABLE");
    File torn=new File(root,"torn-side");Files.createDirectories(torn.toPath());Files.write(new File(torn,"intent").toPath(),Arrays.copyOf(before,40));refuses(()->new CameraStationarySlot(torn,f.io).status());
    File unknown=new File(root,"unknown-side");Files.createDirectories(unknown.toPath());Files.write(new File(unknown,"extra").toPath(),new byte[]{1});refuses(()->new CameraStationarySlot(unknown,f.io).status());
    File huge=new File(root,"huge-side");Files.createDirectories(huge.toPath());Files.write(new File(huge,"intent").toPath(),new byte[4097]);refuses(()->CameraStationarySlot.validateFootprint(huge,f.io));
    File barrier=new File(root,"barrier-side");Files.createDirectories(barrier.toPath());CameraProofChecks.HostIO fault=new CameraProofChecks.HostIO(){int count;@Override public void syncDirectory(File r)throws IOException{if(++count>=2)throw new IOException("C8 persistent barrier refusal");}};
    refuses(()->new CameraStationarySlot(barrier,fault).intent(SOURCE,APK,OWNER,PROCESS,1,CameraStationarySlot.ACK));ok(new File(barrier,"intent").exists(),"visible intent retained after sync fault");refuses(()->new CameraStationarySlot(barrier,fault).status());
  }
  private static void exports(File root)throws Exception{
    Fixture f=new Fixture(root,"export");ok(!f.store.stationarySlotExists(),"no old C8 job before admission");refuses(f.store::stationaryEvidence);Map<String,byte[]> saved=f.finish();ok(f.store.stationarySlotExists(),"existing published job remains consumed even if sidecar unavailable");CameraStationarySlot.validateSaved(saved,f.intent);checks++;
    Map<String,byte[]> entries=CameraStationarySlot.entries(saved,f.intent,SOURCE,APK);ok(entries.size()==9&&entries.keySet().containsAll(CameraEvidenceExport.ROLES),"exact nine entries, original byte arrays");
    Map<String,Object> manifest=PhonePortabilityJson.object(PhonePortabilityJson.parse(entries.get("manifest.json")));ok(manifest.get("captureSourceIndexSha256").equals(SOURCE)&&manifest.get("captureApkSha256").equals(APK)&&manifest.get("targetSha256").equals(CameraStationarySlot.TARGET_SHA)&&Boolean.FALSE.equals(manifest.get("stationarityProven")),"manifest provenance, no sensor claim");
    for(String role:CameraEvidenceExport.ROLES){Map<String,byte[]> changed=copy(saved);changed.put(role,utf("changed"));refuses(()->CameraStationarySlot.validateSaved(changed,f.intent));}
    for(String property:List.of("intentSha256","targetId","targetSha256","stationaryJob","captureSourceIndexSha256","captureApkSha256","sourceSha256","purpose","layout","contentMode")){
      Map<String,byte[]> changed=copy(saved);String request=new String(changed.get("request.json"),StandardCharsets.UTF_8).replace("\""+property+"\":", "\"wrong-"+property+"\":");changed.put("request.json",utf(request));refuses(()->CameraStationarySlot.validateSaved(changed,f.intent));
    }
    refuses(()->f.store.savedEvidence(CameraStationarySlot.JOB));refuses(()->f.store.savedEvidence("00000000-0000-0000-0000-000000000002"));
    byte[] rawBefore=saved.get("raw.jpg").clone();f.slot.attempt(saved,PROCESS,SOURCE,APK);ok(f.slot.status().equals("CONSUMED_EXPORT_UNCERTAIN"),"attempt before picker");f.slot.verifyAttempt(saved);checks++;
    refuses(()->new CameraStationarySlot(f.side,f.io).attempt(saved,PROCESS,SOURCE,APK));
    Map<String,byte[]> altered=copy(saved);altered.put("raw.jpg",utf("other"));refuses(()->f.slot.verifyAttempt(altered));
    Map<String,Object> result=new LinkedHashMap<>();result.put("jobId",CameraStationarySlot.JOB);result.put("status","READBACK_VERIFIED");result.put("bundleBytes",100L);result.put("bundleSha256","d".repeat(64));f.slot.terminal("READBACK_VERIFIED",result);ok(new CameraStationarySlot(f.side,f.io).status().equals("CONSUMED_EXPORT_TERMINAL"),"terminal survives logical reopen; no replay");refuses(()->f.slot.attempt(saved,PROCESS,SOURCE,APK));refuses(()->f.slot.verifyAttempt(saved));ok(Arrays.equals(rawBefore,f.store.stationaryEvidence().get("raw.jpg")),"original saved bytes retained");
    for(String status:List.of("CANCELLED","FAILED_UNVERIFIED")){Fixture x=new Fixture(root,status);Map<String,byte[]> data=x.finish();x.slot.attempt(data,PROCESS,SOURCE,APK);x.slot.terminal(status,null);refuses(()->x.slot.attempt(data,PROCESS,SOURCE,APK));refuses(()->x.slot.intent(SOURCE,APK,OWNER,PROCESS,9,CameraStationarySlot.ACK));}
    // A recovered failed/interrupted fixed job never becomes exportable or recapturable.
    Fixture crash=new Fixture(root,"reservation-crash");crash.store.reserveStationary();crash.store.recover(true);refuses(crash.store::stationaryEvidence);refuses(crash.store::reserveStationary);refuses(()->crash.slot.intent(SOURCE,APK,OWNER,PROCESS,10,CameraStationarySlot.ACK));
    ok(CameraProofStore.CAMERA_CAP==234618880&&((Long)f.store.status().get("aggregateExportAllowanceBytes"))==33816576L,"two permanent allowances");
  }
  private static void session()throws Exception{
    AtomicBoolean busy=new AtomicBoolean(),closed=new AtomicBoolean();CameraEvidenceSession<String> c7=new CameraEvidenceSession<>(busy,closed),c8=CameraEvidenceSession.stationary(busy,closed);
    String[] durable={null};CameraEvidenceSession.Ticket<String> t=c8.beginStationary("C8",id->durable[0]=id);ok(t.id.equals(durable[0]),"same durable request ticket and callback identity");refuses(()->c7.beginStationary("C7",id->{}));refuses(()->c7.begin("C7",()->null));c8.dispatch(t,()->{});ok(c8.callback(31007)==null&&c7.callback(31008)==null,"cross-slot callback rejected");c8.cancel();ok(busy.get(),"cancel retains picker ownership");ok(c8.callback(31008)==t,"correct callback");ok(c8.callback(31008)==null,"no duplicate callback writer");c8.finish(t);ok(!busy.get(),"actual drain only");CameraEvidenceSession.Ticket<String> next=c7.begin("C7",()->null);c8.failBeforeDispatch(t);ok(busy.get()&&!next.cancelled,"stale C8 cannot release C7");c7.failBeforeDispatch(next);
    CameraEvidenceSession.Ticket<String> destroy=c8.begin("C8 destroyed",()->null);c8.dispatch(destroy,()->{});closed.set(true);c8.cancel();ok(busy.get(),"destruction does not invent drain");c8.callback(31008);c8.finish(destroy);
  }
  public static void main(String[] args)throws Exception{File root=new File(args[0]);Files.createDirectories(root.toPath());records(root);exports(root);session();System.out.println("CameraStationaryChecks assertions="+checks+"; generated host only; physical stationarity/SAF unverified");}
}

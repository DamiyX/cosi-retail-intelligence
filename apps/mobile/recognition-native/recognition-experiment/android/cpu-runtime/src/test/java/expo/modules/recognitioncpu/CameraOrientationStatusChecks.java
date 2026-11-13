package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Terminal provenance without the historical full-archive stress path. Generated headers only. */
public final class CameraOrientationStatusChecks {
  static final String SOURCE="a".repeat(64),APK="b".repeat(64),PROCESS="11111111-1111-1111-1111-111111111111";
  static int checks;
  static void ok(boolean b,String why){checks++;if(!b)throw new AssertionError(why);}
  static Map<String,Object> request(){return map("camera",map("reportedWidth",2336,"reportedHeight",1080,"previewWidth",246,"previewHeight",123,"layout","A","contentMode","FILL"),"previewRectPhysical",map("left",0,"top",0,"right",246,"bottom",123),"viewGeneration",1);}
  static Map<String,byte[]> profile(CameraOrientationPlan.Case c,Map<String,Object> request,String nonce){
    Map<String,Object> geometry=CameraOrientationFixture.geometry();geometry.put("job",c.job);byte[] raw=CameraOrientationFixture.jpeg(),preview={1,2,3};
    Map<String,Object> req=new TreeMap<>(PhonePortabilityJson.object(request.get("camera")));req.putAll(map("matrixRun",CameraOrientationPlan.RUN,"matrixCase",c.id,"matrixTarget",c.target,"matrixSource",SOURCE,"matrixApk",APK,"matrixRequestSha256",CameraProofFrame.hash(bytes(json(request))),"matrixNonce",nonce));
    Map<String,Object> n=map("schemaVersion",2,"sourceSha256",SOURCE,"matrixSource",SOURCE,"matrixApk",APK,"matrixRun",CameraOrientationPlan.RUN,"matrixCase",c.id,"jobId",c.job,"modelSha256",CameraProofFrame.MODEL,"recipe",CameraOrientationGeometry.RECIPE,"recipeSha256",CameraOrientationGeometry.RECIPE_SHA256,"width",13,"height",7,"orientation",6,"requestedSize","2336x1080","jpegBytes",raw.length,"jpegSha256",CameraProofFrame.hash(raw),"previewSha256",CameraProofFrame.hash(preview),"previewWidth",246,"previewHeight",123,"contentMode","FILL","geometryStatus","INCONCLUSIVE","cameraProofAccepted",false,"physicalFovProven",false,"orientationContract","native-same-frame-v2","nativeGeometry",geometry,"nativeGeometrySha256",CameraProofFrame.hash(bytes(json(geometry))));
    Map<String,byte[]> result=new TreeMap<>();result.put("raw.jpg",raw);result.put("preview.png",preview);result.put("request.json",bytes(json(req)));result.put("numerical.json",bytes(json(n)));result.put("receipt.json",result.get("numerical.json"));for(String marker:Arrays.asList("done","reservation","resolution"))result.put(marker,new byte[]{7});return result;
  }
  public static void main(String[] args)throws Exception{
    Path root=Path.of(args[0]).resolve(CameraOrientationPlan.ROOT);Files.createDirectories(root);CameraProofChecks.HostIO io=new CameraProofChecks.HostIO();CameraOrientationStore store=new CameraOrientationStore(root.toFile(),io,SOURCE,APK,PROCESS,true);CameraOrientationPlan.Case first=CameraOrientationPlan.CASES.get(0),second=CameraOrientationPlan.CASES.get(1);Map<String,Object> s=store.status();
    ok(s.get("lastCase")==null&&s.get("lastJobId")==null&&s.get("lastPublished")==null,"fresh store cannot fabricate a terminal");ok(first.job.equals(s.get("nextJobId"))&&s.get("next").equals(first.id),"next identity is the first fixed native job");ok(s.get("source").equals(SOURCE)&&s.get("apk").equals(APK)&&Boolean.FALSE.equals(s.get("cameraProofAccepted")),"status artifact/acceptance identity");
    Map<String,Object> req=request();String nonce=UUID.randomUUID().toString();store.consume(first,req,nonce);s=store.status();ok(s.get("next").equals("UNRESOLVED")&&s.get("nextJobId")==null,"intent is pending, not next row");ok(s.get("lastCase").equals(first.id)&&s.get("lastJobId").equals(first.job)&&s.get("lastPublished")==null,"intent tap has no publication result");
    store.terminal(first,profile(first,req,nonce));s=store.status();ok(Boolean.TRUE.equals(s.get("lastPublished"))&&s.get("lastCase").equals(first.id)&&s.get("lastJobId").equals(first.job),"publication comes from exact immutable terminal");ok(s.get("next").equals(second.id)&&s.get("nextJobId").equals(second.job),"next and last job identities do not collapse");
    byte[] published=Files.readAllBytes(root.resolve(first.id+".terminal"));store.consume(second,req,UUID.randomUUID().toString());s=store.status();ok(s.get("lastCase").equals(second.id)&&s.get("lastJobId").equals(second.job)&&s.get("lastPublished")==null,"new pending row never inherits prior true publication");store.terminal(second,Collections.emptyMap());s=store.status();ok(Boolean.FALSE.equals(s.get("lastPublished"))&&s.get("next").equals("STOP")&&s.get("nextJobId")==null,"refusal stays false and stops the run");
    CameraOrientationStore reopened=new CameraOrientationStore(root.toFile(),io,SOURCE,APK,"22222222-2222-2222-2222-222222222222",false);ok(json(reopened.status()).equals(json(s)),"native terminal provenance survives different process");ok(Arrays.equals(Files.readAllBytes(root.resolve(first.id+".terminal")),published),"prior publication terminal never changed");System.out.println("CameraOrientationStatusChecks assertions="+checks+"; generated native store provenance only; no decoder/model/export");
  }
}

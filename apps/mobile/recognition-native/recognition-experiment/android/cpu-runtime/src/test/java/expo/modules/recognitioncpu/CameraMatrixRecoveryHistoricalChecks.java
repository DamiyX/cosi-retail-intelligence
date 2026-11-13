package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryChecks.*;
/** Generated historical packet, not real photographs. Exercises the actual fixed reader. */
public final class CameraMatrixRecoveryHistoricalChecks {
  static final class Fixture {
    final Path parent;final IO io=new IO();final CameraProofStore camera;final CameraMatrixStore matrix;
    Fixture(Path root)throws Exception{
      parent=root;Files.createDirectories(root);Path retained=root.resolve(RETAINED_ROOT);Files.createDirectory(retained);Files.write(retained.resolve("owner.new"),retainedOwner());
      for(String n:Arrays.asList("camera-evidence-export-v1","camera-evidence-export-c9-v1","camera-geometry-c8-v1"))Files.createDirectory(root.resolve(n));
      camera=new CameraProofStore(root.resolve("camera-proof-v1").toFile(),io,CAMERA_OWNER,P1);
      java.lang.reflect.Method reserve=CameraProofStore.class.getDeclaredMethod("reserveId",String.class);reserve.setAccessible(true);
      for(String id:LEGACY_JOBS){reserve.invoke(camera,id);camera.write(id,"request.json",bytes("{}"));camera.reject(id,"FAILED","GENERATED_LEGACY",bytes("{}"));}
      Path matrixRoot=root.resolve(ROOT);Files.createDirectory(matrixRoot);matrix=new CameraMatrixStore(matrixRoot.toFile(),io,CAPTURE_SOURCE,CAPTURE_APK,P1,true);
      matrix.permission(PERMISSIONS[0],false,true,false);matrix.permission(PERMISSIONS[1],true,true,true);
      for(Case c:CASES){if(c.index==4)matrix.permission(PERMISSIONS[2],true,true,true);Map<String,Object> request=CameraMatrixChecks.req(c);matrix.consume(c,request,UUID.randomUUID().toString());String id=camera.reserveMatrix(c);Map<String,Object> intent=matrix.read(c.id+".intent");Map<String,Object> saved=map("sourceSha256",CAMERA_OWNER,"matrixRun",RUN,"matrixCase",c.id,"matrixTarget",c.target,"matrixSource",CAPTURE_SOURCE,"matrixApk",CAPTURE_APK,"matrixNonce",intent.get("nonce"),"matrixRequestSha256",intent.get("requestSha256"));camera.write(id,"request.json",bytes(json(saved)));
        if(c.control()){matrix.invoke(c,100);matrix.phase(c,map("action",c.action(),"actionMs",101,"settledMs",102,"pendingAtAction",true,"outcome","FULFILLED"));camera.reject(id,"CANCELLED","CAMERA_CANCELLED",bytes("{}"));}
        else{byte[] jpg=CameraProofChecks.jpeg(3,2,1),preview={1};camera.write(id,"raw.jpg",jpg);camera.write(id,"preview.png",preview);Map<String,Object> result=new TreeMap<>(saved);result.putAll(map("jobId",id,"modelSha256",CameraProofFrame.MODEL,"recipe",CameraProofFrame.RECIPE,"jpegSha256",CameraProofFrame.hash(jpg),"previewSha256",CameraProofFrame.hash(preview),"width",3,"height",2,"orientation",1,"jpegBytes",jpg.length,"geometryStatus","INCONCLUSIVE","cameraProofAccepted",false));byte[] numerical=bytes(json(result));camera.write(id,"receipt.json",numerical);camera.write(id,"numerical.json",numerical);camera.finish(id);camera.resolve(id,"PUBLISHED","NONE");}
        matrix.terminal(c,camera.matrixEvidence(c),false,false,true);
      }matrix.seal();matrix.consumeExport();
    }
    CameraMatrixHistoricalReader reader()throws Exception{return new CameraMatrixHistoricalReader(parent.toFile(),io,SOURCE,APK);}
  }
  static Map<String,String> tree(Path root)throws Exception{Map<String,String> hashes=new TreeMap<>();try(var files=Files.walk(root)){for(Path p:(Iterable<Path>)files.filter(Files::isRegularFile)::iterator)hashes.put(root.relativize(p).toString(),CameraProofFrame.hash(Files.readAllBytes(p)));}return hashes;}
  public static void main(String[] args)throws Exception{
    Path root=Path.of(args[0]);Files.createDirectories(root);Fixture fixture=new Fixture(root.resolve("historical"));Map<String,String> before=tree(fixture.parent);CameraMatrixHistoricalReader first=fixture.reader();String fingerprint=first.fingerprint();CameraMatrixEvidence archive=first.archive(fingerprint);
    ByteArrayOutputStream a=new ByteArrayOutputStream();archive.serialize(a,()->false);TimeZone old=TimeZone.getDefault();try{TimeZone.setDefault(TimeZone.getTimeZone("Pacific/Honolulu"));ByteArrayOutputStream b=new ByteArrayOutputStream();new FixtureSource(fixture).archive(fingerprint).serialize(b,()->false);ok(Arrays.equals(a.toByteArray(),b.toByteArray()),"fresh reader and changed timezone produce identical archive");}finally{TimeZone.setDefault(old);}
    Set<String> names=new HashSet<>();try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(a.toByteArray()))){ZipEntry entry;while((entry=zip.getNextEntry())!=null){names.add(entry.getName());ok(entry.getMethod()==ZipEntry.STORED&&entry.getExtra()==null,"deterministic STORED metadata");zip.readAllBytes();}}
    ok(names.size()==125&&names.contains("recovery.json")&&names.contains("M00-A000/raw.jpg"),"original finite entries plus one provenance");ok(names.stream().noneMatch(n->LEGACY_JOBS.stream().anyMatch(n::contains)),"no older private profiles exported");ok(before.equals(tree(fixture.parent)),"historical inputs unchanged across complete planning/serialization");ok(!fixture.matrix.has("export-terminal"),"old exportResult still null");
    var ro=new CameraMatrixHistoricalReader.ReadOnlyIO(fixture.io);Path camera=fixture.parent.resolve("camera-proof-v1");no("old constructor create seam is rejected",()->new CameraProofStore(camera.toFile(),ro,CAMERA_OWNER,P1));CameraProofStore.readOnly(camera.toFile(),ro,CAMERA_OWNER,P2);no("readonly write",()->ro.writeNew(camera.resolve("new").toFile(),new byte[]{1}));no("readonly publication",()->ro.publish(camera.resolve("x").toFile(),camera.resolve("y").toFile()));no("readonly random write",()->ro.writeAt(camera.resolve("refusals").toFile(),0,new byte[]{1}));ok(before.equals(tree(fixture.parent)),"rejected mutation/init paths changed no byte");
    Path owner=fixture.parent.resolve(ROOT).resolve("owner");byte[] oldOwner=Files.readAllBytes(owner);Files.write(owner,bytes(new String(oldOwner,java.nio.charset.StandardCharsets.UTF_8).replace(CAPTURE_APK,"c".repeat(64))));Map<String,String> wrong=tree(fixture.parent);no("wrong historical capture APK",fixture::reader);ok(wrong.equals(tree(fixture.parent)),"wrong pins never repair/relabel");Files.write(owner,oldOwner);
    Path jpeg=fixture.parent.resolve("camera-proof-v1").resolve(CASES.get(4).job+".raw.jpg");byte[] original=Files.readAllBytes(jpeg);byte[] changed=original.clone();changed[0]^=1;Files.write(jpeg,changed);no("changed original profile",fixture::reader);Files.write(jpeg,original);
    Path seal=fixture.parent.resolve(ROOT).resolve("seal");byte[] sealBytes=Files.readAllBytes(seal);byte[] bad=sealBytes.clone();bad[bad.length-2]^=1;Files.write(seal,bad);no("tampered seal",fixture::reader);Files.write(seal,sealBytes);ok(before.equals(tree(fixture.parent)),"fixture inputs restored only by test author, production never repairs them");
    System.out.println("CameraMatrixRecoveryHistoricalChecks assertions="+checks+"; generated packet; real originals and Android ownership not exercised");
  }
  static final class FixtureSource implements CameraMatrixRecoveryEngine.Source {
    final Fixture fixture;FixtureSource(Fixture f){fixture=f;}public String fingerprint()throws Exception{return fixture.reader().fingerprint();}public CameraMatrixEvidence archive(String f)throws Exception{return fixture.reader().archive(f);}
  }
}

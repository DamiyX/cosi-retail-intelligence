package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Fixed C8 capability. Sidecar existence consumes capture; only committed data grants export. */
public final class CameraStationarySlot {
  public static final String JOB="76d28e3f-cdcd-4d1a-a86e-026e2568ce5e",SLOT="stationary-chart-c8-v1";
  public static final String TARGET="stationary-chart-c8-900x1200-v1",TARGET_SHA="7ffd7f6fbd778405497bbfc0d2f4649281e19c33c8d8af5c626c87d71f02ef6a";
  public static final String ACK="SUPPORTED_PHONE_AND_FIXED_CHART_READY";
  public static final int REQUEST=31008;
  private static final List<String> INTENT=Arrays.asList("schema","slot","job","target","targetSha256","runtimeSource","captureApk","owner","model","recipe","process","layout","mode","intentNanos","readiness");
  private static final List<String> ATTEMPT=Arrays.asList("schema","slot","job","intentSha256","requestSha256","doneSha256","resolutionSha256","rawSha256","previewSha256","numericalSha256","ticket","outputCap","exporterSource","exporterApk");
  private static final List<String> TERMINAL=Arrays.asList("schema","slot","job","attemptSha256","status","bundleBytes","bundleSha256");
  private final File root;private final CameraProofStore.IO io;
  public CameraStationarySlot(File root,CameraProofStore.IO io){this.root=root;this.io=io;}
  private static void require(boolean value,String code){CameraProofFrame.require(value,"CAMERA_C8_"+code);}
  private static byte[] utf(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private static boolean hash(String s){return s!=null&&s.matches("[a-f0-9]{64}");}
  private static boolean uuid(String s){return s!=null&&s.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}");}
  private static byte[] record(List<String> keys,Map<String,String> values){
    require(values.keySet().equals(new LinkedHashSet<>(keys)),"RECORD_KEYS");StringBuilder b=new StringBuilder("CAMERA_C8_RECORD_V1\n");
    for(String key:keys){String v=values.get(key);require(v!=null&&v.matches("[A-Za-z0-9_.:-]{1,180}"),"RECORD_VALUE");b.append(key).append('=').append(v).append('\n');}
    String body=b.toString();byte[] result=utf(body+"sha256="+CameraProofFrame.hash(utf(body))+"\n");require(result.length<=4096,"RECORD_CAP");return result;
  }
  private static Map<String,String> parse(byte[] bytes,List<String> keys){
    require(bytes.length>0&&bytes.length<=4096,"RECORD_BOUND");String[] lines=new String(bytes,StandardCharsets.UTF_8).split("\n",-1);require(lines.length==keys.size()+3&&lines[0].equals("CAMERA_C8_RECORD_V1")&&lines[lines.length-1].isEmpty(),"RECORD_FORMAT");
    Map<String,String> values=new LinkedHashMap<>();for(int i=0;i<keys.size();i++){String prefix=keys.get(i)+"=";require(lines[i+1].startsWith(prefix),"RECORD_ORDER");values.put(keys.get(i),lines[i+1].substring(prefix.length()));}
    require(Arrays.equals(record(keys,values),bytes),"RECORD_HASH");require("1".equals(values.get("schema"))&&SLOT.equals(values.get("slot"))&&JOB.equals(values.get("job")),"RECORD_BINDING");return values;
  }
  private static Map<String,String> common(){Map<String,String> v=new LinkedHashMap<>();v.put("schema","1");v.put("slot",SLOT);v.put("job",JOB);return v;}
  public static void validateFootprint(File root,CameraProofStore.IO io)throws IOException{
    io.syncDirectory(root);List<String> names=io.list(root);require(names.size()<=3,"SIDECAR_COUNT");long total=0;
    for(String name:names){require(Arrays.asList("intent","export-attempt","export-terminal").contains(name),"SIDECAR_NAME");long n=io.size(new File(root,name));require(n>0&&n<=4096,"SIDECAR_BOUND");total+=n;}
    require(total<=CameraProofStore.EXPORT_BOOKKEEPING,"SIDECAR_CAP");
    if(names.contains("intent"))validateIntent(io.read(new File(root,"intent"),4096));
    require(!names.contains("export-attempt")||names.contains("intent"),"ATTEMPT_WITHOUT_INTENT");
    if(names.contains("export-attempt")){
      Map<String,String> a=parse(io.read(new File(root,"export-attempt"),4096),ATTEMPT);
      require(a.get("intentSha256").equals(CameraProofFrame.hash(io.read(new File(root,"intent"),4096)))&&uuid(a.get("ticket"))&&a.get("outputCap").equals(Integer.toString(CameraProofStore.EXPORT_OUTPUT)),"ATTEMPT_BINDING");
      for(String key:ATTEMPT)if(key.endsWith("Sha256")||key.equals("exporterSource")||key.equals("exporterApk"))require(hash(a.get(key)),"ATTEMPT_HASH");
    }
    require(!names.contains("export-terminal")||names.contains("export-attempt"),"TERMINAL_WITHOUT_ATTEMPT");
    if(names.contains("export-terminal")){
      Map<String,String> t=parse(io.read(new File(root,"export-terminal"),4096),TERMINAL);
      require(t.get("attemptSha256").equals(CameraProofFrame.hash(io.read(new File(root,"export-attempt"),4096)))&&Arrays.asList("CANCELLED","FAILED_UNVERIFIED","READBACK_VERIFIED").contains(t.get("status")),"TERMINAL_BINDING");
      if(t.get("status").equals("READBACK_VERIFIED")){require(t.get("bundleBytes").matches("[1-9][0-9]{0,7}")&&Long.parseLong(t.get("bundleBytes"))<=CameraProofStore.EXPORT_OUTPUT&&hash(t.get("bundleSha256")),"TERMINAL_OUTPUT");}
      else require(t.get("bundleBytes").equals("0")&&t.get("bundleSha256").equals("UNVERIFIED"),"TERMINAL_UNVERIFIED");
    }
  }
  public static Map<String,String> validateIntent(byte[] bytes){
    Map<String,String> v=parse(bytes,INTENT);require(TARGET.equals(v.get("target"))&&TARGET_SHA.equals(v.get("targetSha256"))&&CameraProofFrame.MODEL.equals(v.get("model"))&&CameraProofFrame.RECIPE.equals(v.get("recipe"))&&v.get("layout").equals("A")&&v.get("mode").equals("FILL")&&v.get("readiness").equals(ACK),"INTENT_BINDING");
    require(hash(v.get("runtimeSource"))&&hash(v.get("captureApk"))&&hash(v.get("owner"))&&uuid(v.get("process"))&&v.get("intentNanos").matches("[0-9]{1,19}"),"INTENT_PROVENANCE");return v;
  }
  public byte[] intent(String runtime,String apk,String owner,String process,long nanos,String ack)throws IOException{
    validateFootprint(root,io);require(io.list(root).isEmpty()&&nanos>=0&&ACK.equals(ack),"CONSUMED_OR_NOT_READY");
    Map<String,String> v=common();v.put("target",TARGET);v.put("targetSha256",TARGET_SHA);v.put("runtimeSource",runtime);v.put("captureApk",apk);v.put("owner",owner);v.put("model",CameraProofFrame.MODEL);v.put("recipe",CameraProofFrame.RECIPE);v.put("process",process);v.put("layout","A");v.put("mode","FILL");v.put("intentNanos",Long.toString(nanos));v.put("readiness",ack);byte[] b=record(INTENT,v);validateIntent(b);append("intent",b);return b;
  }
  public byte[] readIntent()throws IOException{validateFootprint(root,io);return io.read(new File(root,"intent"),4096);}
  private void append(String name,byte[] bytes)throws IOException{require(io.size(new File(root,name))<0,"CONSUMED");io.writeNew(new File(root,name),bytes);io.syncDirectory(root);validateFootprint(root,io);}
  public String status()throws IOException{validateFootprint(root,io);List<String> names=io.list(root);return names.contains("export-terminal")?"CONSUMED_EXPORT_TERMINAL":names.contains("export-attempt")?"CONSUMED_EXPORT_UNCERTAIN":names.contains("intent")?"CAPTURE_CONSUMED":"CONSUMED_INCOMPLETE";}
  public void attempt(Map<String,byte[]> saved,String ticket,String source,String apk)throws Exception{
    validateFootprint(root,io);require(!io.list(root).contains("export-attempt"),"EXPORT_CONSUMED");validateSaved(saved,readIntent());Map<String,String> v=common();v.put("intentSha256",CameraProofFrame.hash(readIntent()));
    for(String[] pair:new String[][]{{"requestSha256","request.json"},{"doneSha256","done"},{"resolutionSha256","resolution"},{"rawSha256","raw.jpg"},{"previewSha256","preview.png"},{"numericalSha256","numerical.json"}})v.put(pair[0],CameraProofFrame.hash(saved.get(pair[1])));
    v.put("ticket",ticket);v.put("outputCap",Integer.toString(CameraProofStore.EXPORT_OUTPUT));v.put("exporterSource",source);v.put("exporterApk",apk);require(uuid(ticket)&&hash(source)&&hash(apk),"EXPORT_PROVENANCE");append("export-attempt",record(ATTEMPT,v));
  }
  public void verifyAttempt(Map<String,byte[]> saved)throws Exception{
    validateFootprint(root,io);require(!io.list(root).contains("export-terminal"),"EXPORT_TERMINAL");validateSaved(saved,readIntent());Map<String,String> a=parse(io.read(new File(root,"export-attempt"),4096),ATTEMPT);
    for(String[] p:new String[][]{{"requestSha256","request.json"},{"doneSha256","done"},{"resolutionSha256","resolution"},{"rawSha256","raw.jpg"},{"previewSha256","preview.png"},{"numericalSha256","numerical.json"}})require(a.get(p[0]).equals(CameraProofFrame.hash(saved.get(p[1]))),"EXPORT_SNAPSHOT_CHANGED");
  }
  public void terminal(String status,Map<String,Object> result)throws IOException{
    require(Arrays.asList("CANCELLED","FAILED_UNVERIFIED","READBACK_VERIFIED").contains(status),"TERMINAL_STATUS");
    validateFootprint(root,io);Map<String,String> v=common();v.put("attemptSha256",CameraProofFrame.hash(io.read(new File(root,"export-attempt"),4096)));v.put("status",status);
    if("READBACK_VERIFIED".equals(status)){require(result!=null&&JOB.equals(result.get("jobId"))&&status.equals(result.get("status")),"TERMINAL_RESULT");v.put("bundleBytes",String.valueOf(result.get("bundleBytes")));v.put("bundleSha256",String.valueOf(result.get("bundleSha256")));}
    else{v.put("bundleBytes","0");v.put("bundleSha256","UNVERIFIED");}append("export-terminal",record(TERMINAL,v));
  }
  public static void validateSaved(Map<String,byte[]> saved,byte[] intent)throws Exception{
    require(saved.keySet().equals(new LinkedHashSet<>(CameraEvidenceExport.ROLES)),"PROFILE");Map<String,String> i=validateIntent(intent);
    require(Arrays.equals(saved.get("receipt.json"),saved.get("numerical.json")),"RECEIPT_IDENTITY");
    String[] reservation=new String(saved.get("reservation"),StandardCharsets.UTF_8).split("\n");
    require(reservation.length==4&&reservation[0].equals(i.get("owner"))&&reservation[1].equals(JOB)&&reservation[2].equals(i.get("process"))&&reservation[3].equals(Long.toString(CameraProofStore.RESERVATION)),"RESERVATION_BINDING");
    String[] done=new String(saved.get("done"),StandardCharsets.UTF_8).split("\n");require(done.length==8&&done[0].equals(i.get("owner"))&&done[1].equals("CAMERA_DONE_V1"),"DONE_BINDING");Set<String> covered=new HashSet<>();
    for(int at=2;at<done.length;at++){String[] p=done[at].split("=",-1);require(p.length==2&&Arrays.asList("raw.jpg","preview.png","numerical.json","receipt.json","request.json","reservation").contains(p[0])&&covered.add(p[0])&&CameraProofFrame.hash(saved.get(p[0])).equals(p[1]),"DONE_HASH");}
    String[] resolved=new String(saved.get("resolution"),StandardCharsets.UTF_8).split("\n");require(resolved.length==8&&resolved[0].equals(i.get("owner"))&&resolved[1].equals("CAMERA_RESOLUTION_V1")&&resolved[2].equals(JOB)&&uuid(resolved[3])&&resolved[4].equals(CameraProofFrame.hash(saved.get("done")))&&resolved[5].equals("PUBLISHED")&&resolved[6].matches("[A-Z0-9_]{1,100}"),"RESOLUTION_BINDING");require(resolved[7].equals(CameraProofFrame.hash(utf(String.join("\n",Arrays.copyOf(resolved,7))+"\n"))),"RESOLUTION_HASH");
    Map<String,Object> n=PhonePortabilityJson.object(PhonePortabilityJson.parse(saved.get("numerical.json"))),r=PhonePortabilityJson.object(PhonePortabilityJson.parse(saved.get("request.json")));
    require(JOB.equals(n.get("jobId"))&&i.get("owner").equals(n.get("sourceSha256"))&&CameraProofFrame.MODEL.equals(n.get("modelSha256"))&&CameraProofFrame.RECIPE.equals(n.get("recipe")),"NUMERICAL_BINDING");
    require(CameraProofFrame.hash(saved.get("raw.jpg")).equals(n.get("jpegSha256"))&&CameraProofFrame.hash(saved.get("preview.png")).equals(n.get("previewSha256")),"SAVED_HASH");
    require(i.get("owner").equals(r.get("sourceSha256"))&&SLOT.equals(r.get("purpose"))&&JOB.equals(r.get("stationaryJob"))&&TARGET.equals(r.get("targetId"))&&TARGET_SHA.equals(r.get("targetSha256"))&&i.get("runtimeSource").equals(r.get("captureSourceIndexSha256"))&&i.get("captureApk").equals(r.get("captureApkSha256"))&&CameraProofFrame.hash(intent).equals(r.get("intentSha256")),"REQUEST_INTENT_BINDING");
    require("A".equals(r.get("layout"))&&"FILL".equals(r.get("contentMode"))&&Boolean.FALSE.equals(n.get("physicalFovProven"))&&Boolean.FALSE.equals(n.get("cameraProofAccepted"))&&"INCONCLUSIVE".equals(n.get("geometryStatus")),"GEOMETRY_CLAIM");
    CameraProofFrame.Header h=CameraProofFrame.header(saved.get("raw.jpg"));require(Long.valueOf(h.width).equals(n.get("width"))&&Long.valueOf(h.height).equals(n.get("height"))&&Long.valueOf(h.orientation).equals(n.get("orientation"))&&Long.valueOf(saved.get("raw.jpg").length).equals(n.get("jpegBytes")),"HEADER_BINDING");
  }
  public static Map<String,byte[]> entries(Map<String,byte[]> saved,byte[] intent,String exporterSource,String exporterApk)throws Exception{
    validateSaved(saved,intent);require(hash(exporterSource)&&hash(exporterApk),"EXPORTER_BINDING");Map<String,String> i=validateIntent(intent);Map<String,byte[]> result=new LinkedHashMap<>(saved);
    StringBuilder m=new StringBuilder("{\"kind\":\"STATIONARY_CHART_EVIDENCE\",\"jobId\":\""+JOB+"\",\"slot\":\""+SLOT+"\",\"targetId\":\""+TARGET+"\",\"targetSha256\":\""+TARGET_SHA+"\",\"intentSha256\":\""+CameraProofFrame.hash(intent)+"\",\"captureSourceIndexSha256\":\""+i.get("runtimeSource")+"\",\"captureApkSha256\":\""+i.get("captureApk")+"\",\"exporterSourceIndexSha256\":\""+exporterSource+"\",\"exporterApkSha256\":\""+exporterApk+"\",\"humanReadinessIsClaim\":true,\"geometryStatus\":\"INCONCLUSIVE\",\"exposureTimeKnown\":false,\"stationarityProven\":false,\"tensorFileIncluded\":false,\"entries\":[");long total=0;int count=0;
    for(String role:CameraEvidenceExport.ROLES){byte[] b=saved.get(role);int cap=role.equals("raw.jpg")?CameraProofFrame.JPEG_LIMIT:role.equals("preview.png")?CameraProofStore.PREVIEW:role.equals("numerical.json")||role.equals("receipt.json")?CameraProofStore.RECEIPT:CameraProofStore.MARKER;require(b.length>0&&b.length<=cap,"ROLE_CAP");if(count++>0)m.append(',');m.append("{\"name\":\"").append(role).append("\",\"bytes\":").append(b.length).append(",\"sha256\":\"").append(CameraProofFrame.hash(b)).append("\"}");total+=b.length;}
    // Intent facts are embedded as their strict canonical text, not a tenth file.
    m.append("],\"intentRecordHex\":\"");for(byte b:intent)m.append(String.format(Locale.ROOT,"%02x",b&255));m.append("\"}\n");byte[] manifest=utf(m.toString());require(manifest.length<=8192&&total+manifest.length+9*1024L+22<=CameraProofStore.EXPORT_OUTPUT,"ZIP_CAP");result.put("manifest.json",manifest);return result;
  }
}

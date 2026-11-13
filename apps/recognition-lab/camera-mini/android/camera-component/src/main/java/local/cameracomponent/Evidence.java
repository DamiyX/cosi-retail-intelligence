package local.cameracomponent;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import static local.cameracomponent.Failure.*;
/** One fixed S00 record. Budget includes retained/staged/meta/archive/output reservations.
 * No old namespace access. Disk implements durable no-replace publication. */
public final class Evidence {
 public static final long CAP=64L*1024*1024, FREE_FLOOR=256L*1024*1024;
 public static final int JPEG=10*1024*1024,CROP=2*1024*1024;
 public interface Disk { Set<String> names()throws Exception; byte[] read(String n,int max)throws Exception; void publish(String n,byte[] b)throws Exception; long free()throws Exception; }
 private final Disk disk; public Evidence(Disk d){disk=d;}
 public static String hash(byte[] b)throws Exception {StringBuilder s=new StringBuilder();for(byte v:MessageDigest.getInstance("SHA-256").digest(b))s.append(String.format(Locale.ROOT,"%02x",v&255));return s.toString();}
 public synchronized void begin(String geometry)throws Exception {
  require(disk.names().isEmpty(),Code.CONSUMED,"intent");require(disk.free()>=FREE_FLOOR+CAP,Code.QUOTA,"space");
  byte[] b=geometry.getBytes(java.nio.charset.StandardCharsets.UTF_8);require(b.length>0&&b.length<=4096,Code.GEOMETRY,"intent");disk.publish("intent",b);
 }
 public static final long EXPORT=16L*1024*1024, EXPORT_REQUIRED=FREE_FLOOR+EXPORT+8192;
 public static void exportCapacity(long available)throws Failure {require(available>=EXPORT_REQUIRED,Code.QUOTA,"export-space");}
 private static byte[] nativeBytes(byte[] jpeg,String nativeGeometry)throws Exception {
  byte[] b=("originalSha256="+hash(jpeg)+"\n"+nativeGeometry).getBytes(java.nio.charset.StandardCharsets.UTF_8);
  require(b.length>0&&b.length<=4096,Code.GEOMETRY,"native-record");return b;
 }
 /** Admission precedes this call; retain original before fallible pixel/codec work. */
 public synchronized void retain(byte[] jpeg,String geometry,String nativeGeometry)throws Exception {
  require(disk.names().equals(Collections.singleton("intent")),Code.TORN,"retain");
  require(Arrays.equals(disk.read("intent",4096),geometry.getBytes(java.nio.charset.StandardCharsets.UTF_8)),Code.STALE,"retain");
  require(jpeg.length>0&&jpeg.length<=JPEG,Code.OVERSIZE,"retain");
  require(disk.free()>=FREE_FLOOR+jpeg.length+CROP+8192L,Code.QUOTA,"retain");
  byte[] nb=nativeBytes(jpeg,nativeGeometry);disk.publish("original.jpeg",jpeg);disk.publish("geometry",nb);
 }
 public interface Commit {void claim()throws Exception;}
 public synchronized void save(byte[] jpeg,byte[] crop,String geometry,String nativeGeometry)throws Exception {save(jpeg,crop,geometry,nativeGeometry,()->{});}
 public synchronized void save(byte[] jpeg,byte[] crop,String geometry,String nativeGeometry,Commit commit)throws Exception {
  if(disk.names().equals(Collections.singleton("intent")))retain(jpeg,geometry,nativeGeometry);
  require(disk.names().equals(new HashSet<>(Arrays.asList("intent","original.jpeg","geometry"))),Code.TORN,"save");
  require(Arrays.equals(disk.read("intent",4096),geometry.getBytes(java.nio.charset.StandardCharsets.UTF_8))&&Arrays.equals(disk.read("original.jpeg",JPEG),jpeg)&&Arrays.equals(disk.read("geometry",4096),nativeBytes(jpeg,nativeGeometry)),Code.STALE,"save");
  require(crop.length>0&&crop.length<=CROP,Code.OVERSIZE,"save");
  require(disk.free()>=FREE_FLOOR+crop.length+8192L,Code.QUOTA,"save");
  disk.publish("crop.png",crop);byte[] nb=disk.read("geometry",4096);
  ByteArrayOutputStream b=new ByteArrayOutputStream();try(DataOutputStream o=new DataOutputStream(b)){o.writeInt(1);o.writeUTF(hash(jpeg));o.writeInt(jpeg.length);o.writeUTF(hash(crop));o.writeInt(crop.length);o.writeUTF(hash(disk.read("intent",4096)));o.writeUTF(hash(nb));}
  commit.claim();disk.publish("receipt",b.toByteArray());reopen();
 }
 public synchronized void claimExport()throws Exception {
  reopen();require(disk.names().contains("receipt"),Code.TORN,"export-receipt");
  require(!disk.names().contains("export-attempt")&&!disk.names().contains("export-result"),Code.CONSUMED,"export");
  exportCapacity(disk.free());disk.publish("export-attempt",new byte[]{1});
 }
 public synchronized void exportResult(boolean complete)throws Exception {disk.publish("export-result",(complete?"COMPLETE_READBACK":"FAILED_OR_UNKNOWN").getBytes(java.nio.charset.StandardCharsets.US_ASCII));}
 public synchronized void archive(java.io.OutputStream destination)throws Exception {
  require(disk.names().contains("export-attempt")&&!disk.names().contains("export-result"),Code.CONSUMED,"export-state");reopen();
  java.util.zip.ZipOutputStream zip=new java.util.zip.ZipOutputStream(destination);
  for(String name:Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt")){
   byte[] b=disk.read(name,name.equals("original.jpeg")?JPEG:name.equals("crop.png")?CROP:8192);
   java.util.zip.ZipEntry entry=new java.util.zip.ZipEntry(name);entry.setTime(0);zip.putNextEntry(entry);zip.write(b);zip.closeEntry();
  }
  StringBuilder manifest=new StringBuilder("{\"schemaVersion\":1,\"files\":[");boolean first=true;
  for(String name:Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt")){
   byte[] b=disk.read(name,name.equals("original.jpeg")?JPEG:name.equals("crop.png")?CROP:8192);
   if(!first)manifest.append(',');first=false;manifest.append("{\"name\":\"").append(name).append("\",\"bytes\":").append(b.length).append(",\"sha256\":\"").append(hash(b)).append("\"}");
  }
  manifest.append("]}");java.util.zip.ZipEntry entry=new java.util.zip.ZipEntry("manifest.json");entry.setTime(0);zip.putNextEntry(entry);zip.write(manifest.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));zip.closeEntry();
  zip.finish();zip.flush();
 }
 public synchronized byte[] crop()throws Exception {reopen();return disk.read("crop.png",CROP);}
 public synchronized String geometry()throws Exception {reopen();return new String(disk.read("geometry",4096),java.nio.charset.StandardCharsets.UTF_8);}
 public synchronized void failure(String safe)throws Exception {
  Set<String> names=disk.names();if(!names.contains("intent")||names.contains("receipt")||names.contains("failure"))return;
  require(safe.matches("[A-Za-z0-9_:; .-]{1,512}"),Code.STORAGE,"failure-label");disk.publish("failure",safe.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
 }
 public synchronized String reopen()throws Exception {
  Set<String> names=new HashSet<>(disk.names());
  if(!names.contains("receipt")&&names.contains("original.jpeg")&&names.contains("geometry")){
   String nativeRecord=new String(disk.read("geometry",4096),java.nio.charset.StandardCharsets.UTF_8);
   require(nativeRecord.startsWith("originalSha256="+hash(disk.read("original.jpeg",JPEG))+"\n"),Code.TORN,"partial-hash");
  }
  if(names.equals(new HashSet<>(Arrays.asList("intent","original.jpeg","geometry"))))return "PARTIAL: admitted original retained; no successful receipt";
  if(names.contains("failure")){require(new HashSet<>(Arrays.asList("intent","original.jpeg","crop.png","geometry","failure")).containsAll(names),Code.TORN,"failure-shape");return "REFUSED:"+new String(disk.read("failure",512),java.nio.charset.StandardCharsets.US_ASCII);}
  names.remove("export-attempt");names.remove("export-result"); if(names.isEmpty())return "EMPTY";
  require(names.equals(new HashSet<>(Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt"))),Code.TORN,"reopen");
  try(DataInputStream in=new DataInputStream(new ByteArrayInputStream(disk.read("receipt",1024)))) {
   require(in.readInt()==1,Code.TORN,"version");String j=in.readUTF();int js=in.readInt();String c=in.readUTF();int cs=in.readInt();String intent=in.readUTF();String nativeHash=in.readUTF();require(in.available()==0,Code.TORN,"receipt");
   byte[] jb=disk.read("original.jpeg",JPEG),cb=disk.read("crop.png",CROP);
   require(js==jb.length&&cs==cb.length&&j.equals(hash(jb))&&c.equals(hash(cb))&&intent.equals(hash(disk.read("intent",4096)))&&nativeHash.equals(hash(disk.read("geometry",4096))),Code.TORN,"hash");return "SAVED:"+j;
  }
 }
}

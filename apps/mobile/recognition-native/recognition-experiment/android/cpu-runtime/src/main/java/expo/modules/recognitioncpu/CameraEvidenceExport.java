package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.BooleanSupplier;
import java.util.zip.*;

/** Fixed saved-job ZIP, streaming to a seekable destination; never invokes a model/decoder. */
public final class CameraEvidenceExport {
  private CameraEvidenceExport(){}
  public static final String JOB="21b9d32b-5f31-45ac-b453-2a261e9e9ccc";
  public static final String JPEG="f6557f45aa2188ae38f13ce886838ca3f6e13b0ad012cca96bbc8593a492cf19";
  public static final String PREVIEW="e1684cbf5d2fe39c304bb47d26cd60d3ed499b376066497df60ffbd7c6a38b63";
  public static final String CAPTURE_APK="fea1596df345e7aa75ca47dc7004bbe322370cbdbb20e43c53b5e3fbd1958f6c";
  public static final String CAPTURE_SOURCE="67b2e7bb9272e7a64a9380f18246d651dcdb3a12856b8b8964318821ccde0874";
  public static final int OUTPUT_LIMIT=1024*1024;
  public static final List<String> ROLES=Collections.unmodifiableList(Arrays.asList("raw.jpg","preview.png","numerical.json","receipt.json","request.json","reservation","done","resolution"));
  public interface Destination {
    long size()throws Exception;
    int write(byte[] bytes,int offset,int count)throws Exception;
    void sync()throws Exception;
    void rewind()throws Exception;
    int read(byte[] bytes)throws Exception;
  }
  public static void require(boolean ok,String code){CameraProofFrame.require(ok,"CAMERA_EXPORT_"+code);}
  public static boolean localDocument(String scheme,String authority,String id){
    if(!"content".equals(scheme)||id==null||id.length()>256||id.contains("..")||id.contains("\\")||id.indexOf('\0')>=0)return false;
    if("com.android.externalstorage.documents".equals(authority))return id.matches("primary:Download/[^/:]+")&&id.length()>17;
    // Downloads provider's numeric/msf IDs are local, but raw: paths must prove Downloads.
    return "com.android.providers.downloads.documents".equals(authority)&&
      (id.matches("[0-9]+")||id.matches("msf:[0-9]+")||id.matches("raw:/storage/emulated/0/Download/[^/:]+"));
  }
  private static byte[] utf(String s){return s.getBytes(StandardCharsets.UTF_8);}
  public static Map<String,byte[]> entries(Map<String,byte[]> saved,String exporterSource,String exporterApk)throws Exception{
    require(saved.keySet().equals(new LinkedHashSet<>(ROLES)),"ALLOWLIST");
    require(exporterSource.matches("[a-f0-9]{64}")&&exporterApk.matches("[a-f0-9]{64}"),"PROVENANCE");
    require(CameraProofFrame.hash(saved.get("raw.jpg")).equals(JPEG)&&CameraProofFrame.hash(saved.get("preview.png")).equals(PREVIEW),"ORIGINAL_HASH");
    require(Arrays.equals(saved.get("numerical.json"),saved.get("receipt.json")),"RECEIPT_IDENTITY");
    Map<String,Object> numerical=PhonePortabilityJson.object(PhonePortabilityJson.parse(saved.get("numerical.json")));
    Map<String,Object> request=PhonePortabilityJson.object(PhonePortabilityJson.parse(saved.get("request.json")));
    String owner=new String(saved.get("reservation"),StandardCharsets.UTF_8).split("\n")[0];
    require(owner.matches("[a-f0-9]{64}")&&owner.equals(numerical.get("sourceSha256"))&&owner.equals(request.get("sourceSha256")),"OWNER_BINDING");
    require(JOB.equals(numerical.get("jobId"))&&JPEG.equals(numerical.get("jpegSha256"))&&PREVIEW.equals(numerical.get("previewSha256"))&&CameraProofFrame.MODEL.equals(numerical.get("modelSha256"))&&CameraProofFrame.RECIPE.equals(numerical.get("recipe")),"RECEIPT_BINDING");
    require("INCONCLUSIVE".equals(numerical.get("geometryStatus"))&&Boolean.FALSE.equals(numerical.get("cameraProofAccepted")),"GEOMETRY_CLAIM");
    CameraProofFrame.Header header=CameraProofFrame.header(saved.get("raw.jpg"));
    require(Long.valueOf(header.width).equals(numerical.get("width"))&&Long.valueOf(header.height).equals(numerical.get("height"))&&Long.valueOf(header.orientation).equals(numerical.get("orientation"))&&Long.valueOf(saved.get("raw.jpg").length).equals(numerical.get("jpegBytes")),"HEADER_BINDING");
    Map<String,byte[]> result=new LinkedHashMap<>();long total=0;StringBuilder manifest=new StringBuilder("{\"kind\":\"SAVED_GENERATED_CAMERA_EVIDENCE\",\"jobId\":\""+JOB+"\",\"captureApkSha256\":\""+CAPTURE_APK+"\",\"captureSourceIndexSha256\":\""+CAPTURE_SOURCE+"\",\"exporterSourceIndexSha256\":\""+exporterSource+"\",\"exporterApkSha256\":\""+exporterApk+"\",\"geometryStatus\":\"INCONCLUSIVE\",\"originalExifPreserved\":true,\"tensorFileIncluded\":false,\"entries\":[");
    for(String role:ROLES){byte[] b=saved.get(role);int cap=role.equals("raw.jpg")?CameraProofFrame.JPEG_LIMIT:role.equals("preview.png")?CameraProofStore.PREVIEW:role.endsWith("json")&&!role.equals("request.json")?CameraProofStore.RECEIPT:CameraProofStore.MARKER;
      require(b!=null&&b.length>0&&b.length<=cap,"ENTRY_CAP");total+=b.length;
      if(result.size()>0)manifest.append(',');manifest.append("{\"name\":\"").append(role).append("\",\"bytes\":").append(b.length).append(",\"sha256\":\"").append(CameraProofFrame.hash(b)).append("\"}");result.put(role,b);
    }
    manifest.append("]}\n");byte[] m=utf(manifest.toString());require(m.length<=8192,"MANIFEST_CAP");result.put("manifest.json",m);total+=m.length;
    // STORED ZIP: explicit size preflight includes local/central headers and EOCD;
    // 1KiB slack per entry exceeds timestamp/UTF8 extras emitted by this writer.
    require(total+result.size()*1024L+22<=OUTPUT_LIMIT,"ZIP_CAP");return result;
  }
  public static Map<String,Object> write(Map<String,byte[]> entries,Destination target,BooleanSupplier cancelled)throws Exception{
    return writeBounded(entries,target,cancelled,CameraProofStore.EXPORT_OUTPUT);
  }
  public static Map<String,Object> writeSaved(Map<String,byte[]> entries,Destination target,BooleanSupplier cancelled)throws Exception{
    return writeBounded(entries,target,cancelled,OUTPUT_LIMIT);
  }
  private static Map<String,Object> writeBounded(Map<String,byte[]> entries,Destination target,BooleanSupplier cancelled,int outputLimit)throws Exception{
    require(entries.size()==9&&entries.containsKey("manifest.json")&&entries.keySet().containsAll(ROLES),"ALLOWLIST");
    require(!cancelled.getAsBoolean(),"CANCELLED");require(target.size()==0,"DESTINATION_NONEMPTY");target.rewind();
    MessageDigest digest=MessageDigest.getInstance("SHA-256");final long[] count={0};final boolean[] failed={false};
    OutputStream bounded=new OutputStream(){
      @Override public void write(int b)throws IOException{write(new byte[]{(byte)b},0,1);}
      @Override public void write(byte[] b,int at,int n)throws IOException{
        require(!failed[0],"WRITE_ALREADY_FAILED");
        failed[0]=true;
        try{
          require(!cancelled.getAsBoolean(),"CANCELLED");require(n>=0&&count[0]+n<=outputLimit,"ZIP_CAP");
          int written=target.write(b,at,n);require(written>=0&&written<=n,"WRITE_COUNT");count[0]+=written;
          require(written==n,"SHORT_WRITE");digest.update(b,at,n);failed[0]=false;
        }catch(Exception e){failed[0]=true;if(e instanceof IOException)throw (IOException)e;throw new IOException("CAMERA_EXPORT_WRITE",e);}
      }
    };
    try(ZipOutputStream zip=new ZipOutputStream(bounded,StandardCharsets.UTF_8)){
      for(Map.Entry<String,byte[]> e:entries.entrySet()){
        require(!cancelled.getAsBoolean(),"CANCELLED");CRC32 crc=new CRC32();crc.update(e.getValue());ZipEntry z=new ZipEntry(e.getKey());z.setMethod(ZipEntry.STORED);z.setTime(0);z.setSize(e.getValue().length);z.setCompressedSize(e.getValue().length);z.setCrc(crc.getValue());zip.putNextEntry(z);
        byte[] bytes=e.getValue();for(int at=0;at<bytes.length;at+=8192)zip.write(bytes,at,Math.min(8192,bytes.length-at));zip.closeEntry();
      }zip.finish();
    }
    require(!cancelled.getAsBoolean()&&target.size()==count[0],"OUTPUT_SIZE_OR_CANCELLED");target.sync();target.rewind();
    MessageDigest read=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[8192];long observed=0;int n;
    while((n=target.read(buffer))!=-1){require(!cancelled.getAsBoolean()&&n>0&&observed+n<=count[0],"READBACK_BOUND_OR_CANCELLED");read.update(buffer,0,n);observed+=n;}
    byte[] hash=digest.digest();require(observed==count[0]&&Arrays.equals(hash,read.digest())&&target.size()==count[0]&&!cancelled.getAsBoolean(),"READBACK_HASH_OR_CANCELLED");
    Map<String,Object> result=new LinkedHashMap<>();result.put("kind","CAMERA_SAVED_EVIDENCE_EXPORT");result.put("jobId",JOB);result.put("status","READBACK_VERIFIED");result.put("bundleBytes",count[0]);result.put("bundleSha256",hex(hash));result.put("outputEntries",9);result.put("providerDirectoryDurabilityProven",false);result.put("powerLossDurabilityProven",false);return result;
  }
  private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(java.util.Locale.ROOT,"%02x",v&255));return s.toString();}
}

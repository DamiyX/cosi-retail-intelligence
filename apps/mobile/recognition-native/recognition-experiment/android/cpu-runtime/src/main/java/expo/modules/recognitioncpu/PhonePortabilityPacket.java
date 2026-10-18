package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.*;
import java.util.*;

/** Exact frozen 40-photo packet; no decode or inference during admission. */
public final class PhonePortabilityPacket {
  public final PhonePortabilityZip zip;public final List<Map<String,Object>> frames=new ArrayList<>();
  public final Map<String,double[]> baseline=new LinkedHashMap<>();public final String packetSha256;
  private static void check(boolean b,String why){PhonePortabilityJson.require(b,why);}
  public static Map<String,Object> contract()throws Exception{return PhonePortabilityJson.object(PhonePortabilityJson.parse(PhonePortabilityPins.MANIFEST.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
  public PhonePortabilityPacket(File file)throws Exception {
    Map<String,Object> manifest=contract();List<String> names=new ArrayList<>();names.add("manifest.json");
    for(Object m:PhonePortabilityJson.array(manifest.get("metadata")))names.add(PhonePortabilityJson.string(PhonePortabilityJson.object(m).get("path")));
    for(Object f:PhonePortabilityJson.array(manifest.get("records"))){Map<String,Object> frame=PhonePortabilityJson.object(f);frames.add(frame);names.add(str(frame,"jpegPath"));names.add(str(frame,"tensorPath"));}
    check(frames.size()==40,"FRAME_COUNT");zip=new PhonePortabilityZip(file,names,PhonePortabilityZip.MAX_PACKET);
    byte[] actual=zip.read("manifest.json",2*1024*1024,PhonePortabilityPins.MANIFEST_SHA);PhonePortabilityJson.parse(actual);
    int refs=0,queries=0;Map<String,Integer> gallery=new TreeMap<>();
    for(Map<String,Object> f:frames) {
      long pixels=(long)num(f,"width",50000)*num(f,"height",50000);check(pixels>0&&pixels<=12484800,"PIXEL_CAP");String role=str(f,"role");
      if(role.equals("reference")){refs++;gallery.put(str(f,"productId"),gallery.getOrDefault(str(f,"productId"),0)+1);}else{check(role.equals("query"),"ROLE");queries++;}
      int bytes=num(f,"jpegBytes",6*1024*1024);check(bytes>0,"JPEG_SIZE");zip.verify(str(f,"jpegPath"),bytes,str(f,"jpegSha256"));
      byte[] header=zip.read(str(f,"jpegPath"),6*1024*1024,str(f,"jpegSha256"));check(header.length>=4&&(header[0]&255)==255&&(header[1]&255)==216,"JPEG_TYPE");
      byte[] tensor=zip.read(str(f,"tensorPath"),602112,str(f,"tensorSha256"));check(tensor.length==602112,"TENSOR_SIZE");ByteBuffer values=ByteBuffer.wrap(tensor).order(ByteOrder.LITTLE_ENDIAN);while(values.hasRemaining()){float v=values.getFloat();check(Float.isFinite(v)&&v>=0&&v<=1,"TENSOR_NONFINITE_OR_RANGE");}
    }
    check(refs==20&&queries==20&&gallery.size()==10&&gallery.values().stream().allMatch(n->n==2),"FIXED_GALLERY");
    for(Object value:PhonePortabilityJson.array(manifest.get("metadata"))) {
      Map<String,Object> m=PhonePortabilityJson.object(value);byte[] bytes=zip.read(str(m,"path"),2*1024*1024,str(m,"sha256"));check(bytes.length==num(m,"bytes",2*1024*1024),"METADATA_SIZE");Object parsed=PhonePortabilityJson.parse(bytes);
      if(str(m,"path").equals("bundle.json")) {
        Map<String,Object> b=PhonePortabilityJson.object(parsed);check(b.get("runFailure")==null&&str(b,"modelSha256").equals(str(manifest,"modelSha256")),"BASELINE_MODEL_OR_FAILURE");
        for(Object row:PhonePortabilityJson.array(b.get("records"))){Map<String,Object> r=PhonePortabilityJson.object(row);check(str(r,"kind").equals("vector"),"BASELINE_INCOMPLETE");List<Object> raw=PhonePortabilityJson.array(r.get("values"));check(raw.size()==1024,"BASELINE_DIMENSION");double[] vector=new double[1024];for(int i=0;i<1024;i++){check(raw.get(i) instanceof Number,"BASELINE_NUMBER");vector[i]=((Number)raw.get(i)).doubleValue();}PhonePortabilityRank.unit(vector);check(baseline.put(str(r,"id"),vector)==null,"BASELINE_DUPLICATE");}
      }
    }
    check(baseline.size()==40&&frames.stream().allMatch(f->baseline.containsKey(str(f,"id"))),"BASELINE_IDS");packetSha256=hashFile(file);
  }
  public static String str(Map<String,Object> m,String k){return PhonePortabilityJson.string(m.get(k));}
  public static int num(Map<String,Object> m,String k,int max){return PhonePortabilityJson.integer(m.get(k),max);}
  public static String hashFile(File f)throws Exception {java.security.MessageDigest d=java.security.MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(f)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)d.update(b,0,n);}StringBuilder s=new StringBuilder();for(byte b:d.digest())s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
}

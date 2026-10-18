package expo.modules.recognitioncpu;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.ExifInterface;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;

/** Hash-bound generated fixtures only; no inference, camera, caller path or URI. */
public final class GeneratedImagePipeline {
  public static final int CASES=42, MAX_BUNDLE=48*1024*1024;
  private GeneratedImagePipeline() {}
  public static final class Result {
    public final byte[] bundle;
    public final Map<String,Object> summary;
    Result(byte[] b,Map<String,Object> s){bundle=b;summary=s;}
  }
  public static String hash(byte[] b) throws Exception {
    byte[] digest=MessageDigest.getInstance("SHA-256").digest(b);StringBuilder s=new StringBuilder();
    for(byte v:digest)s.append(String.format(java.util.Locale.ROOT,"%02x",v&255));return s.toString();
  }
  private static void check(boolean b,String why){GeneratedImageGeometry.check(b,why);}
  private static byte[] asset(Context c,String path,int size,String pin) throws Exception {
    check(path.matches("recognition-(experiment|image-experiment)/[a-zA-Z0-9_.-]+") && !path.contains(".."),"GENERATED_ASSET_PATH");
    check(size>0 && size<=1048576 && pin.matches("[a-f0-9]{64}"),"GENERATED_ASSET_BOUND");
    ByteArrayOutputStream out=new ByteArrayOutputStream(size);
    try(InputStream in=c.getAssets().open(path)) {
      byte[] buffer=new byte[8192];int n;
      while((n=in.read(buffer))!=-1){check(out.size()+n<=size,"GENERATED_ASSET_OVERFLOW");out.write(buffer,0,n);}
    }
    byte[] b=out.toByteArray();check(b.length==size && hash(b).equals(pin),"GENERATED_ASSET_HASH");return b;
  }
  private static byte[] asset(Context c,JSONObject a) throws Exception {
    return asset(c,a.getString("path"),a.getInt("bytes"),a.getString("sha256"));
  }
  private static int[] ints(JSONArray a,int count) throws Exception {
    check(a.length()==count,"GENERATED_ARRAY");int[] out=new int[count];
    for(int i=0;i<count;i++){Object v=a.get(i);check(v instanceof Integer,"GENERATED_INTEGER");out[i]=(Integer)v;}return out;
  }
  private static byte[] jpeg(byte[] b,int w,int h,int orientation) throws Exception {
    // The only parser input is an already admitted exact generated JPEG asset.
    try(ByteArrayInputStream in=new ByteArrayInputStream(b)) {
      ExifInterface exif=new ExifInterface(in);
      check(exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,-1)==orientation,"GENERATED_EXIF_METADATA");
    }
    BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;bounds.inScaled=false;
    BitmapFactory.decodeByteArray(b,0,b.length,bounds);
    check(bounds.outWidth==w && bounds.outHeight==h && "image/jpeg".equals(bounds.outMimeType),"GENERATED_JPEG_BOUNDS");
    BitmapFactory.Options options=new BitmapFactory.Options();options.inScaled=false;options.inSampleSize=1;options.inPreferredConfig=Bitmap.Config.ARGB_8888;
    Bitmap bitmap=BitmapFactory.decodeByteArray(b,0,b.length,options);
    check(bitmap!=null,"GENERATED_DECODE_NULL");
    try {
      check(bitmap.getWidth()==w && bitmap.getHeight()==h && bitmap.getConfig()==Bitmap.Config.ARGB_8888 && bitmap.getAllocationByteCount()<=w*h*8,"GENERATED_BITMAP_ALLOCATION");
      int[] pixels=new int[w*h];bitmap.getPixels(pixels,0,w,0,0,w,h);byte[] rgb=new byte[w*h*3];
      for(int i=0;i<pixels.length;i++){int p=pixels[i];check((p>>>24)==255,"GENERATED_OPAQUE_RGB");rgb[i*3]=(byte)(p>>>16);rgb[i*3+1]=(byte)(p>>>8);rgb[i*3+2]=(byte)p;}
      return rgb;
    } finally {bitmap.recycle();}
  }
  private static Map<String,Object> differences(byte[] a,byte[] b,boolean floats) {
    check(a.length==b.length && (!floats||a.length%4==0),"GENERATED_COMPARE_SIZE");
    int count=floats?a.length/4:a.length,mismatch=0;double max=0,sum=0;
    ByteBuffer aa=ByteBuffer.wrap(a).order(ByteOrder.LITTLE_ENDIAN),bb=ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN);
    for(int i=0;i<count;i++) {
      double x=floats?aa.getFloat():a[i]&255,y=floats?bb.getFloat():b[i]&255;
      check(Double.isFinite(x)&&Double.isFinite(y),"GENERATED_NONFINITE");double e=Math.abs(x-y);
      if(e!=0)mismatch++;max=Math.max(max,e);sum+=e;
    }
    Map<String,Object> m=new LinkedHashMap<>();m.put("components",count);m.put("mismatchCount",mismatch);m.put("maxAbsoluteError",max);m.put("meanAbsoluteError",sum/count);return m;
  }
  private static final class BoundedBytes extends ByteArrayOutputStream {
    @Override public synchronized void write(byte[] b,int o,int n){check(count+n<=MAX_BUNDLE,"GENERATED_ZIP_SIZE");super.write(b,o,n);}
    @Override public synchronized void write(int b){check(count<MAX_BUNDLE,"GENERATED_ZIP_SIZE");super.write(b);}
  }
  private static void entry(ZipOutputStream zip,String path,byte[] b,List<Map<String,Object>> files,long[] total) throws Exception {
    total[0]+=b.length;check(total[0]<=MAX_BUNDLE && files.size()<211,"GENERATED_EXPORT_BOUNDS");
    ZipEntry e=new ZipEntry(path);e.setTime(0);zip.putNextEntry(e);zip.write(b);zip.closeEntry();
    Map<String,Object> r=new LinkedHashMap<>();r.put("path",path);r.put("bytes",b.length);r.put("sha256",hash(b));files.add(r);
  }
  public static Result run(Context context,String id,java.util.function.IntConsumer progress) throws Exception {
    check("all-generated-v1".equals(id),"INVALID_GENERATED_IMAGE_ID");long started=System.nanoTime();
    // Spec size is bounded before allocating; hash binds all settings/inputs/oracles.
    byte[] specBytes;
    try(InputStream in=context.getAssets().open("recognition-image-experiment/image-stage-spec.json")) {
      BoundedBytes out=new BoundedBytes();byte[] buf=new byte[8192];int n;
      while((n=in.read(buf))!=-1){check(out.size()+n<=262144,"GENERATED_SPEC_BOUND");out.write(buf,0,n);}specBytes=out.toByteArray();
    }
    check(hash(specBytes).equals(GeneratedImagePins.SPEC_SHA256),"GENERATED_SPEC_HASH");
    JSONObject spec=new JSONObject(new String(specBytes,java.nio.charset.StandardCharsets.UTF_8));
    check(spec.getInt("schemaVersion")==1 && spec.getString("recipe").equals(GeneratedImageGeometry.RECIPE) && spec.getInt("caseCount")==CASES && !spec.getBoolean("modelExecuted") && !spec.getBoolean("nativeValidated"),"GENERATED_SPEC_CONTRACT");
    // Historical P0 flags/pins stay unchanged, separately from subsequent device evidence.
    try(InputStream in=context.getAssets().open("recognition-experiment/probe-manifest.json")) {
      ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[4096];int n;
      while((n=in.read(b))!=-1){check(out.size()+n<=65536,"GENERATED_P0_MANIFEST_BOUND");out.write(b,0,n);}
      check(hash(out.toByteArray()).equals(GeneratedImagePins.P0_MANIFEST_SHA256),"GENERATED_P0_MANIFEST_HASH");
    }
    JSONArray cases=spec.getJSONArray("cases");check(cases.length()==CASES,"GENERATED_CASE_COUNT");
    List<Map<String,Object>> summaries=new ArrayList<>(),files=new ArrayList<>();long[] total={0};BoundedBytes bytes=new BoundedBytes();
    try(ZipOutputStream zip=new ZipOutputStream(bytes)) {
      for(int i=0;i<CASES;i++) {
        long cs=System.nanoTime();JSONObject c=cases.getJSONObject(i);String name=c.getString("id");check(name.matches("[a-z0-9-]{1,80}"),"GENERATED_CASE_ID");
        int w=c.getInt("rawWidth"),h=c.getInt("rawHeight"),o=c.getInt("orientation");GeneratedImageGeometry.dimensions(w,h);
        JSONObject source=c.getJSONObject("source");byte[] input=asset(context,source);String format=source.getString("format");
        byte[] encoded;
        if(format.equals("JPEG"))encoded=jpeg(input,w,h,o);else{check(format.equals("RGB")&&input.length==w*h*3,"GENERATED_RAW_RGB");encoded=input;}
        double decodeMs=(System.nanoTime()-cs)/1e6;long ps=System.nanoTime();byte[] upright=GeneratedImageGeometry.orient(encoded,w,h,o);
        int uw=o>=5?h:w,uh=o>=5?w:h;check(uw==c.getInt("uprightWidth") && uh==c.getInt("uprightHeight"),"GENERATED_UPRIGHT_BOUNDS");
        int[] box=ints(c.getJSONArray("effectiveBox"),4);byte[] cropped=GeneratedImageGeometry.crop(upright,uw,uh,box);int cw=box[2]-box[0],ch=box[3]-box[1];
        int[] g=GeneratedImageGeometry.letterbox(cw,ch);check(Arrays.equals(g,ints(c.getJSONArray("letterbox"),6)),"GENERATED_LETTERBOX_GEOMETRY");
        byte[] padded=GeneratedImageGeometry.resizeAndPad(cropped,cw,ch),tensor=GeneratedImageGeometry.tensor(padded);
        double processingMs=(System.nanoTime()-ps)/1e6;byte[] uprightOracle=asset(context,c.getJSONObject("uprightOracle")),cropOracle=GeneratedImageGeometry.crop(uprightOracle,uw,uh,box);
        byte[] phoneOracle=asset(context,c.getJSONObject("phoneResizeOracle")),pillowOracle=asset(context,c.getJSONObject("pillowOracle"));
        Map<String,Object> row=new LinkedHashMap<>();row.put("id",name);row.put("sourceSha256",hash(input));row.put("sourceFormat",format);row.put("orientation",o);row.put("rawWidth",w);row.put("rawHeight",h);row.put("uprightWidth",uw);row.put("uprightHeight",uh);row.put("effectiveBox",box);row.put("letterbox",g);
        row.put("decodedUprightVsPillowRgb",differences(upright,uprightOracle,false));row.put("cropVsFrozenRgb",differences(cropped,cropOracle,false));
        row.put("resizeVsFrozenBilinearRgb",differences(padded,phoneOracle,false));row.put("tensorVsFrozenBilinear",differences(tensor,GeneratedImageGeometry.tensor(phoneOracle),true));row.put("tensorVsFrozenPillowLanczos",differences(tensor,pillowOracle,true));
        row.put("decodeAndReadMs",decodeMs);row.put("processingMs",processingMs);row.put("caseTotalMs",(System.nanoTime()-cs)/1e6);
        if(c.has("guide")) {
          JSONObject guide=c.getJSONObject("guide"),gi=guide.getJSONObject("input"),expected=guide.getJSONObject("expected");
          double[] actual=GeneratedImageGeometry.mapGuide(gi.getInt("imageWidth"),gi.getInt("imageHeight"),gi.getInt("previewWidth"),gi.getInt("previewHeight"),gi.getInt("rotation"),gi.getBoolean("mirrored"));
          JSONObject ec=expected.getJSONObject("effectiveCrop"),bc=expected.getJSONObject("encodedCrop"),gb=expected.getJSONObject("guide");
          double[] oracle={expected.getInt("orientedWidth"),expected.getInt("orientedHeight"),gb.getDouble("left"),gb.getDouble("top"),gb.getDouble("right"),gb.getDouble("bottom"),ec.getInt("left"),ec.getInt("top"),ec.getInt("right"),ec.getInt("bottom"),bc.getInt("left"),bc.getInt("top"),bc.getInt("right"),bc.getInt("bottom"),expected.getDouble("scale"),expected.getDouble("offsetX"),expected.getDouble("offsetY")};
          double max=0;for(int j=0;j<actual.length;j++)max=Math.max(max,Math.abs(actual[j]-oracle[j]));row.put("guideActual",actual);row.put("guideMaxError",max);check(max<=1e-12,"GENERATED_GUIDE_MAPPING");
        }
        entry(zip,name+"/encoded.rgb",encoded,files,total);entry(zip,name+"/upright.rgb",upright,files,total);entry(zip,name+"/crop.rgb",cropped,files,total);entry(zip,name+"/letterbox.rgb",padded,files,total);entry(zip,name+"/tensor.f32le",tensor,files,total);summaries.add(row);progress.accept(i+1);
      }
      Map<String,Object> receipt=new LinkedHashMap<>();receipt.put("schemaVersion",1);receipt.put("kind","GENERATED_IMAGE_PHONE_OUTPUTS");receipt.put("recipe",GeneratedImageGeometry.RECIPE);receipt.put("specSha256",GeneratedImagePins.SPEC_SHA256);receipt.put("caseCount",CASES);receipt.put("modelExecuted",false);receipt.put("cases",summaries);receipt.put("files",files);receipt.put("uncompressedOutputBytes",total[0]);receipt.put("totalMs",(System.nanoTime()-started)/1e6);
      entry(zip,"receipt.json",new JSONObject(receipt).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8),files,total);
    }
    check(files.size()==211,"GENERATED_EXPORT_COUNT");byte[] bundle=bytes.toByteArray();check(bundle.length>0 && bundle.length<=MAX_BUNDLE,"GENERATED_ZIP_BOUND");
    Map<String,Object> summary=new LinkedHashMap<>();summary.put("recipe",GeneratedImageGeometry.RECIPE);summary.put("specSha256",GeneratedImagePins.SPEC_SHA256);summary.put("caseCount",CASES);summary.put("outputEntries",211);summary.put("bundleBytes",bundle.length);summary.put("bundleSha256",hash(bundle));summary.put("modelExecuted",false);summary.put("cases",summaries);summary.put("totalMs",(System.nanoTime()-started)/1e6);
    return new Result(bundle,summary);
  }
}

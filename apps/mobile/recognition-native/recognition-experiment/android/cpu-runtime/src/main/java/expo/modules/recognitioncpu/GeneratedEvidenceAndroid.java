package expo.modules.recognitioncpu;

import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.json.JSONArray;
import org.json.JSONObject;

/** Android private files/AtomicFile adapter and full frozen generated packet validation. */
public final class GeneratedEvidenceAndroid {
  private GeneratedEvidenceAndroid() {}
  private static void check(boolean ok,String reason){if(!ok)throw new IllegalStateException(reason);}
  public static GeneratedEvidenceStore open(Context context) throws Exception {
    check(GeneratedEvidenceStore.PACKAGE.equals(context.getPackageName()),"GENERATED_CONTEXT_OWNER");
    byte[] bytes;
    try(InputStream in=context.getAssets().open("recognition-image-experiment/image-stage-spec.json")) {
      ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;
      while((n=in.read(buffer))!=-1){check(out.size()+n<=262144,"GENERATED_SPEC_BOUND");out.write(buffer,0,n);}bytes=out.toByteArray();
    }
    check(GeneratedEvidenceStore.hash(bytes).equals(GeneratedImagePins.SPEC_SHA256),"GENERATED_RECOVERY_SPEC_HASH");
    JSONObject spec=new JSONObject(new String(bytes,StandardCharsets.UTF_8));
    return new GeneratedEvidenceStore(context.getFilesDir(),context.getPackageName(),GeneratedEvidencePins.SOURCE_SHA256,GeneratedImagePins.SPEC_SHA256,GeneratedImageGeometry.RECIPE,new AndroidAtomicIO(),(zip,meta)->validate(zip,meta,spec));
  }
  private static final class AndroidAtomicIO implements GeneratedEvidenceStore.AtomicIO {
    public FileInputStream read(File f) throws IOException{return new AtomicFile(f).openRead();}
    public FileOutputStream begin(File f) throws IOException{return new AtomicFile(f).startWrite();}
    public void commit(File f,FileOutputStream out){new AtomicFile(f).finishWrite(out);}
    public void fail(File f,FileOutputStream out){new AtomicFile(f).failWrite(out);}
  }
  public static byte[] metadata(Map<String,Object> summary) {
    Map<String,Object> durable=new LinkedHashMap<>(summary);durable.put("durable",true);
    return new JSONObject(durable).toString().getBytes(StandardCharsets.UTF_8);
  }
  @SuppressWarnings("unchecked")
  public static Map<String,Object> summary(GeneratedEvidenceStore.Evidence evidence) throws Exception {
    return (Map<String,Object>)convert(new JSONObject(new String(evidence.metadata,StandardCharsets.UTF_8)));
  }
  private static Object convert(Object value) throws Exception {
    if(value==JSONObject.NULL)return null;
    if(value instanceof JSONObject){Map<String,Object> result=new LinkedHashMap<>();Iterator<String> keys=((JSONObject)value).keys();while(keys.hasNext()){String key=keys.next();result.put(key,convert(((JSONObject)value).get(key)));}return result;}
    if(value instanceof JSONArray){List<Object> out=new ArrayList<>();JSONArray a=(JSONArray)value;for(int i=0;i<a.length();i++)out.add(convert(a.get(i)));return out;}
    return value;
  }
  private static byte[] readEntry(ZipInputStream in,int bound) throws Exception {
    ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;
    while((n=in.read(b))!=-1){check(out.size()+n<=bound,"GENERATED_RECOVERY_ENTRY_BOUND");out.write(b,0,n);}return out.toByteArray();
  }
  private static void validate(byte[] zip,byte[] metadata,JSONObject spec) throws Exception {
    check(zip.length>0&&zip.length<=GeneratedEvidenceStore.MAX_ZIP&&metadata.length>0&&metadata.length<=GeneratedEvidenceStore.MAX_META,"GENERATED_RECOVERY_BOUND");
    JSONObject summary=new JSONObject(new String(metadata,StandardCharsets.UTF_8));
    check(summary.getBoolean("durable")&&!summary.getBoolean("modelExecuted")&&summary.getString("recipe").equals(GeneratedImageGeometry.RECIPE)&&summary.getString("specSha256").equals(GeneratedImagePins.SPEC_SHA256)&&summary.getInt("caseCount")==42&&summary.getInt("outputEntries")==211&&summary.getInt("bundleBytes")==zip.length&&summary.getString("bundleSha256").equals(GeneratedEvidenceStore.hash(zip)),"GENERATED_RECOVERY_SUMMARY");
    JSONArray cases=spec.getJSONArray("cases");check(cases.length()==42,"GENERATED_SPEC_CASES");Map<String,Integer> expected=new LinkedHashMap<>();
    for(int i=0;i<42;i++) {
      JSONObject c=cases.getJSONObject(i);String id=c.getString("id");JSONArray box=c.getJSONArray("effectiveBox");
      expected.put(id+"/encoded.rgb",c.getInt("rawWidth")*c.getInt("rawHeight")*3);expected.put(id+"/upright.rgb",c.getInt("uprightWidth")*c.getInt("uprightHeight")*3);
      expected.put(id+"/crop.rgb",(box.getInt(2)-box.getInt(0))*(box.getInt(3)-box.getInt(1))*3);expected.put(id+"/letterbox.rgb",224*224*3);expected.put(id+"/tensor.f32le",602112);
    }
    Map<String,String> hashes=new LinkedHashMap<>();long total=0;byte[] receipt=null;int count=0;
    try(ZipInputStream in=new ZipInputStream(new ByteArrayInputStream(zip))) {
      ZipEntry entry;
      while((entry=in.getNextEntry())!=null) {
        check(++count<=211&&!entry.isDirectory(),"GENERATED_RECOVERY_ZIP_COUNT");String name=entry.getName();
        if(name.equals("receipt.json")){check(receipt==null,"GENERATED_RECOVERY_DUPLICATE");receipt=readEntry(in,262144);}
        else {Integer size=expected.get(name);check(size!=null&&!hashes.containsKey(name),"GENERATED_RECOVERY_ZIP_PATH");byte[] data=readEntry(in,size);check(data.length==size,"GENERATED_RECOVERY_ZIP_SIZE");hashes.put(name,GeneratedEvidenceStore.hash(data));total+=size;}
        in.closeEntry();
      }
    }
    check(count==211&&hashes.size()==210&&receipt!=null&&total+receipt.length<=GeneratedEvidenceStore.MAX_ZIP,"GENERATED_RECOVERY_COMPLETE_ZIP");
    JSONObject r=new JSONObject(new String(receipt,StandardCharsets.UTF_8));
    check(r.getInt("schemaVersion")==1&&r.getString("kind").equals("GENERATED_IMAGE_PHONE_OUTPUTS")&&!r.getBoolean("modelExecuted")&&r.getString("recipe").equals(GeneratedImageGeometry.RECIPE)&&r.getString("specSha256").equals(GeneratedImagePins.SPEC_SHA256)&&r.getInt("caseCount")==42&&r.getLong("uncompressedOutputBytes")==total,"GENERATED_RECOVERY_RECEIPT");
    JSONArray ledger=r.getJSONArray("files");check(ledger.length()==210,"GENERATED_RECOVERY_LEDGER_COUNT");Set<String> seen=new HashSet<>();
    for(int i=0;i<210;i++){JSONObject f=ledger.getJSONObject(i);String path=f.getString("path");check(seen.add(path)&&expected.containsKey(path)&&f.getInt("bytes")==expected.get(path)&&f.getString("sha256").equals(hashes.get(path)),"GENERATED_RECOVERY_LEDGER_HASH");}
    JSONArray rows=r.getJSONArray("cases"),summaryRows=summary.getJSONArray("cases");check(rows.length()==42&&summaryRows.length()==42,"GENERATED_RECOVERY_CASE_COUNT");
    for(int i=0;i<42;i++) {
      JSONObject c=cases.getJSONObject(i),row=rows.getJSONObject(i),sr=summaryRows.getJSONObject(i);
      check(row.toString().equals(sr.toString()),"GENERATED_RECOVERY_CASE_SUMMARY");
      check(row.getString("id").equals(c.getString("id"))&&row.getString("sourceSha256").equals(c.getJSONObject("source").getString("sha256"))&&row.getString("sourceFormat").equals(c.getJSONObject("source").getString("format")),"GENERATED_RECOVERY_SOURCE_PIN");
      for(String k:new String[]{"orientation","rawWidth","rawHeight","uprightWidth","uprightHeight"})check(row.getInt(k)==c.getInt(k),"GENERATED_RECOVERY_DIMENSION");
      for(String k:new String[]{"effectiveBox","letterbox"})check(row.getJSONArray(k).toString().equals(c.getJSONArray(k).toString()),"GENERATED_RECOVERY_GEOMETRY");
      for(String k:new String[]{"decodeAndReadMs","processingMs","caseTotalMs"})check(Double.isFinite(row.getDouble(k))&&row.getDouble(k)>=0,"GENERATED_RECOVERY_TIMING");
      for(String k:new String[]{"decodedUprightVsPillowRgb","cropVsFrozenRgb","resizeVsFrozenBilinearRgb","tensorVsFrozenBilinear","tensorVsFrozenPillowLanczos"}) {
        JSONObject d=row.getJSONObject(k);int components=d.getInt("components"),mismatch=d.getInt("mismatchCount");double max=d.getDouble("maxAbsoluteError"),mean=d.getDouble("meanAbsoluteError");
        check(components>0&&components<=512*512*3&&mismatch>=0&&mismatch<=components&&Double.isFinite(max)&&Double.isFinite(mean)&&max>=0&&mean>=0&&mean<=max,"GENERATED_RECOVERY_METRIC");
      }
    }
    check(Double.isFinite(summary.getDouble("totalMs"))&&summary.getDouble("totalMs")>=0,"GENERATED_RECOVERY_TOTAL");
  }
}

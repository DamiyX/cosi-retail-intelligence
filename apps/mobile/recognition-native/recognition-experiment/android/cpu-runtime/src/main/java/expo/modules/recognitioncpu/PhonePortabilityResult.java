package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.*;
import java.util.*;
import java.util.zip.*;

/** Revalidates the entire numerical result before cache readiness or document export. */
public final class PhonePortabilityResult {
  public static final long MAX_BYTES=48L*1024*1024;
  private static void check(boolean b,String why){PhonePortabilityJson.require(b,why);}
  private static String str(Map<String,Object> m,String k){return PhonePortabilityPacket.str(m,k);}
  public static double number(Object value){check(value instanceof Number&&Double.isFinite(((Number)value).doubleValue()),"RESULT_NUMBER");return ((Number)value).doubleValue();}
  public static void equal(Object expected,Object actual) {
    if(expected instanceof Number){check(Math.abs(number(expected)-number(actual))<=1e-12,"RESULT_NUMERIC_MISMATCH");return;}
    if(expected instanceof Map){Map<?,?> a=(Map<?,?>)expected;check(actual instanceof Map&&a.keySet().equals(((Map<?,?>)actual).keySet()),"RESULT_OBJECT_MISMATCH");for(Object k:a.keySet())equal(a.get(k),((Map<?,?>)actual).get(k));return;}
    if(expected instanceof List){List<?> a=(List<?>)expected;check(actual instanceof List&&a.size()==((List<?>)actual).size(),"RESULT_LIST_MISMATCH");for(int i=0;i<a.size();i++)equal(a.get(i),((List<?>)actual).get(i));return;}
    check(Objects.equals(expected,actual),"RESULT_VALUE_MISMATCH");
  }
  public static Map<String,Object> lane(String name,List<Map<String,Object>> frames,Map<String,double[]> vectors){
    List<Map<String,Object>> refs=new ArrayList<>(),queries=new ArrayList<>();List<String> failed=new ArrayList<>();int first=0,top3=0;
    for(Map<String,Object> f:frames)if(str(f,"role").equals("reference")){refs.add(f);if(!vectors.containsKey(str(f,"id")))failed.add(str(f,"id"));}
    List<Map<String,Object>> ordered=new ArrayList<>(frames);ordered.sort(Comparator.comparing(f->str(f,"id")));
    for(Map<String,Object> f:ordered)if(str(f,"role").equals("query")){
      String id=str(f,"id");List<Map<String,Object>> candidates=failed.isEmpty()&&vectors.containsKey(id)?PhonePortabilityRank.rank(vectors.get(id),refs,vectors):Collections.emptyList();
      String truth=str(f,"productId");int rank=0;for(int i=0;i<candidates.size();i++)if(truth.equals(candidates.get(i).get("productId")))rank=i+1;
      Map<String,Object> q=new LinkedHashMap<>();q.put("id",id);q.put("candidates",candidates);q.put("failure",!failed.isEmpty()?"INCOMPLETE_GALLERY":!vectors.containsKey(id)?"QUERY_FAILED":null);q.put("truth",truth);q.put("correctRank",rank==0?null:rank);queries.add(q);if(rank==1)first++;if(rank>0&&rank<=3)top3++;
    }
    Map<String,Object> m=new LinkedHashMap<>();m.put("lane",name);m.put("denominator",20);m.put("first",first);m.put("firstThree",top3);m.put("failedReferences",failed);m.put("queries",queries);m.put("complete",failed.isEmpty()&&vectors.size()==40);return m;
  }
  public static Map<String,Object> validate(File file,PhonePortabilityPacket packet)throws Exception {
    return validate(file,packet.packetSha256,packet.frames,packet.baseline);
  }
  public static Map<String,Object> validate(File file,String packetSha,List<Map<String,Object>> frames,Map<String,double[]> baseline)throws Exception {
    check(file.isFile()&&file.length()>22&&file.length()<=MAX_BYTES,"RESULT_BOUND");byte[] receipt;
    try(ZipFile z=new ZipFile(file)){ZipEntry e=z.getEntry("receipt.json");check(e!=null&&e.getSize()>0&&e.getSize()<=2*1024*1024,"RESULT_RECEIPT");try(InputStream in=z.getInputStream(e)){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){check(out.size()+n<=2*1024*1024,"RESULT_RECEIPT_BOUND");out.write(b,0,n);}receipt=out.toByteArray();}}
    Map<String,Object> r=PhonePortabilityJson.object(PhonePortabilityJson.parse(receipt));
    check(PhonePortabilityPacket.num(r,"schemaVersion",1)==1&&"PRIVATE_PHONE_PORTABILITY_RESULTS".equals(r.get("kind"))&&PhonePortabilityPins.MANIFEST_SHA.equals(r.get("manifestSha256"))&&packetSha.equals(r.get("packetSha256"))&&PhonePortabilitySource.SHA256.equals(r.get("replaySourceSha256")),"RESULT_IDENTITY_OR_STALE_SOURCE");
    check("bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40".equals(r.get("modelSha256"))&&"FROM_APPLICATION_ONLY".equals(r.get("runtime"))&&PhonePortabilityPacket.num(r,"threads",1)==1&&Boolean.FALSE.equals(r.get("xnnpack"))&&Boolean.FALSE.equals(r.get("nnapi"))&&Boolean.FALSE.equals(r.get("gpu")),"RESULT_OPTIONS");
    List<Object> ledger=PhonePortabilityJson.array(r.get("files")),records=PhonePortabilityJson.array(r.get("records")),lanes=PhonePortabilityJson.array(r.get("lanes"));check(records.size()==80&&lanes.size()==2&&ledger.size()<=160&&ledger.size()%2==0,"RESULT_COUNTS");
    List<String> names=new ArrayList<>();Map<String,Map<String,Object>> indexed=new LinkedHashMap<>();for(Object o:ledger){Map<String,Object> e=PhonePortabilityJson.object(o);String name=str(e,"path");check(indexed.put(name,e)==null,"RESULT_DUPLICATE_LEDGER");names.add(name);}names.add("receipt.json");PhonePortabilityZip zip=new PhonePortabilityZip(file,names,MAX_BYTES);zip.verify("receipt.json",receipt.length,GeneratedEvidenceStore.hash(receipt));
    int produced=0,attempted=PhonePortabilityPacket.num(r,"attemptedInferences",80);List<String> expectedNames=new ArrayList<>();
    for(int lane=0;lane<2;lane++){
      String name=lane==0?"control":"phone";Map<String,double[]> vectors=new LinkedHashMap<>();
      for(int i=0;i<40;i++){
        Map<String,Object> frame=frames.get(i),row=PhonePortabilityJson.object(records.get(lane*40+i));String id=str(frame,"id");check(id.equals(row.get("id"))&&name.equals(row.get("lane"))&&number(row.get("totalMs"))>=0,"RESULT_RECORD_ORDER");
        boolean success="vector".equals(row.get("kind"));if(!success)check("failure".equals(row.get("kind"))&&Arrays.asList("NOT_RUN","CANCELLED","FRAME_FAILED","TIMEOUT").contains(row.get("code")),"RESULT_FAILURE_KIND");
        boolean emitted=row.containsKey("tensorSha256")||row.containsKey("vectorSha256");check(!success||emitted,"RESULT_MISSING_SUCCESS");
        if(emitted){produced++;check(success||"TIMEOUT".equals(row.get("code")),"RESULT_FAILURE_WITH_OUTPUT");check(number(row.get("inferenceMs"))>=0,"RESULT_INFERENCE_TIME");String tp=name+"/"+id+".tensor.f32le",vp=name+"/"+id+".vector.f32le";expectedNames.add(tp);expectedNames.add(vp);
          Map<String,Object> t=indexed.get(tp),v=indexed.get(vp);check(t!=null&&v!=null&&PhonePortabilityPacket.num(t,"bytes",602112)==602112&&PhonePortabilityPacket.num(v,"bytes",4096)==4096&&str(t,"sha256").equals(row.get("tensorSha256"))&&str(v,"sha256").equals(row.get("vectorSha256")),"RESULT_LEDGER_BINDING");
          if(lane==0)check(str(t,"sha256").equals(frame.get("tensorSha256")),"CONTROL_TENSOR_PIN");
          byte[] tensor=zip.read(tp,602112,str(t,"sha256"));ByteBuffer tb=ByteBuffer.wrap(tensor).order(ByteOrder.LITTLE_ENDIAN);check(tensor.length==602112,"RESULT_TENSOR_SIZE");while(tb.hasRemaining()){float x=tb.getFloat();check(Float.isFinite(x)&&x>=0&&x<=1,"RESULT_TENSOR_VALUE");}
          byte[] binary=zip.read(vp,4096,str(v,"sha256"));check(binary.length==4096,"RESULT_VECTOR_SIZE");ByteBuffer vb=ByteBuffer.wrap(binary).order(ByteOrder.LITTLE_ENDIAN);double[] vector=new double[1024];for(int k=0;k<1024;k++)vector[k]=vb.getFloat();PhonePortabilityRank.unit(vector);
          if(success){vectors.put(id,vector);if(lane==0)equal(PhonePortabilityRank.parity(baseline.get(id),vector),row.get("runtimeParity"));}
        }
      }
      equal(lane(name,frames,vectors),lanes.get(lane));
    }
    check(produced<=attempted&&indexed.size()==expectedNames.size()&&names.subList(0,names.size()-1).equals(expectedNames),"RESULT_ATTEMPTS_OR_EXTRA_ENTRIES");check(number(r.get("totalMs"))>=0,"RESULT_TOTAL_TIME");return r;
  }
  private PhonePortabilityResult(){}
}

package expo.modules.recognitioncpu;
import java.util.*;
public final class PhonePortabilityRank {
  private PhonePortabilityRank(){}
  public static double[] unit(double[] v){PhonePortabilityJson.require(v.length==1024,"VECTOR_DIMENSION");double scale=0;for(double x:v){PhonePortabilityJson.require(Double.isFinite(x),"VECTOR_NONFINITE");scale=Math.max(scale,Math.abs(x));}PhonePortabilityJson.require(scale>0,"VECTOR_ZERO");double n=0;for(double x:v)n+=(x/scale)*(x/scale);n=Math.sqrt(n);double[] out=new double[v.length];for(int i=0;i<v.length;i++)out[i]=(v[i]/scale)/n;return out;}
  public static double cosine(double[] a,double[] b){double sum=0;for(int i=0;i<a.length;i++)sum+=a[i]*b[i];return Math.max(-1,Math.min(1,sum));}
  public static List<Map<String,Object>> rank(double[] query,List<Map<String,Object>> references,Map<String,double[]> vectors){
    PhonePortabilityJson.require(references.size()==20&&references.stream().allMatch(r->vectors.containsKey(PhonePortabilityPacket.str(r,"id"))),"INCOMPLETE_GALLERY");
    Map<String,Integer> counts=new TreeMap<>();Set<String> ids=new HashSet<>();for(Map<String,Object> r:references){String id=PhonePortabilityPacket.str(r,"id"),product=PhonePortabilityPacket.str(r,"productId");PhonePortabilityJson.require(ids.add(id),"DUPLICATE_GALLERY");counts.put(product,counts.getOrDefault(product,0)+1);}PhonePortabilityJson.require(counts.size()==10&&counts.values().stream().allMatch(n->n==2),"FIXED_GALLERY");
    double[] q=unit(query);Map<String,Map<String,Object>> groups=new TreeMap<>();
    for(Map<String,Object> ref:references){String id=PhonePortabilityPacket.str(ref,"id"),product=PhonePortabilityPacket.str(ref,"productId");double score=cosine(q,unit(vectors.get(id)));Map<String,Object> old=groups.get(product);if(old==null||score>(Double)old.get("score")||(score==(Double)old.get("score")&&id.compareTo((String)old.get("nearestReferenceId"))<0)){Map<String,Object> row=new LinkedHashMap<>();row.put("productId",product);row.put("nearestReferenceId",id);row.put("score",score);groups.put(product,row);}}
    List<Map<String,Object>> out=new ArrayList<>(groups.values());out.sort((a,b)->{int n=Double.compare((Double)b.get("score"),(Double)a.get("score"));return n==0?((String)a.get("productId")).compareTo((String)b.get("productId")):n;});return out;
  }
  public static Map<String,Object> parity(double[] base,double[] phone){double[] a=unit(base),b=unit(phone);double max=0,rawMax=0,sum=0;for(int i=0;i<a.length;i++){max=Math.max(max,Math.abs(a[i]-b[i]));double e=Math.abs(base[i]-phone[i]);rawMax=Math.max(rawMax,e);sum+=e;}double distance=Math.max(0,1-cosine(a,b));Map<String,Object> m=new LinkedHashMap<>();m.put("maxComponentError",max);m.put("cosineDistance",distance);m.put("rawMaxAbsoluteDifference",rawMax);m.put("rawMeanAbsoluteDifference",sum/1024);m.put("passesFrozenTolerance",max<=1e-4&&distance<=1e-5);return m;}
}

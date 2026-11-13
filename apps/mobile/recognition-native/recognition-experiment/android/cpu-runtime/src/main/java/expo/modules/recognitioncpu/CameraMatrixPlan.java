package expo.modules.recognitioncpu;
import java.util.*;
import java.nio.charset.StandardCharsets;
/** D059 compiled finite capability. No caller path/job/model/target selection. */
public final class CameraMatrixPlan {
  private CameraMatrixPlan(){}
  public static final String RUN="p203-matrix-20261023-c1-r2", ROOT="camera-matrix-20261023-c1-r2-v1", FILENAME="p203-matrix-20261023-c1-r1.zip";
  public static final String RETAINED_ROOT="camera-matrix-20261023-c1-r1-v1";
  public static final int JPEG=10*1024*1024, OUTPUT=90*1024*1024, BOOK=192*1024, REQUEST=31009;
  public static final int RETAINED_INIT_MAX=4096, ACTIVE_BOOK=BOOK-RETAINED_INIT_MAX;
  public static byte[] retainedOwner(){return bytes(json(map("run","p203-matrix-20261023-c1-r1","source","909679a3b3b6a1636f742fbe2ff3f344a66ad64cc368771d26b89f57fa81b7ae","apk","0d0fd36ba3e4c03f79c5b98e9a122b5d63f767645db4a8e151590e73d41f23e3","model",CameraProofFrame.MODEL,"recipe",CameraProofFrame.RECIPE)));}
  public static final String TARGET_MANIFEST="288c3dec48d8b95cf0d1a377e9f734c461bc4f127b8f23ca89bc51d1b7d8c4a1";
  public static final String[] PERMISSIONS={"D01-DENIED","D02-GRANTED-RESTORED","D03-RESTORED-AFTER-L04"};
  public static final class Case {
    public final String id,job,target,layout;public final int pose,index;
    private Case(int n,String i,String j,String t,String l,int p){index=n;id=i;job=j;target=t;layout=l;pose=p;}
    public boolean control(){return index<4;}
    public String action(){return control()?new String[]{"USER","BACKGROUND","UNMOUNT","PERMISSION_LOSS"}[index]:"NONE";}
  }
  public static final List<Case> CASES=Collections.unmodifiableList(Arrays.asList(
    new Case(0,"L01-USER-CANCEL","09167b83-1a93-56ab-b542-e7e92f51d29d","369b553dd4ac1cc538c0775daf63a4c2fcf13f2cb32865278bd79db09846eee1","A",0),
    new Case(1,"L02-BACKGROUND","d9859642-28f5-54d1-a8c2-a414eb5cecf0","e6505b8585c1e4f99592e5c71637ed301255a8687fb07373717e51f66dd85be7","A",0),
    new Case(2,"L03-VIEW-UNMOUNT","3735a13e-c8a1-5ac3-968e-33a195942225","e602ebb709a7d417a0ca44ac83b8b1d21b05ae1c217b111cff3ecadf9aa161fd","A",0),
    new Case(3,"L04-PERMISSION-LOSS","913f2537-6e08-5a1e-8ba2-526590ba47b3","6ace6f9e76e75273b04857023e58bb885dd7c32d78fa61329b3cec11d0e0cca4","A",0),
    new Case(4,"M00-A000","dd87d6e3-b1c5-51a1-b849-c3aa478ee265","a334f62e51209816fff9e69c76c8c2ddcdf9252b6e622ea2bf7c17994bfaf316","A",0),
    new Case(5,"M01-A090","3dccf8f9-437f-58f4-b0db-cbb31525662d","230cf2d2d3ddd84ad70de4a57870e3648d5aaa50d7b7fd2d3b28490ff39a8371","A",90),
    new Case(6,"M02-A180","12a56889-48c9-5806-8f4f-47d4a34c4c4b","8304f055e707450d409d2be39eaa308270513e9c454622f327ae4afa6067f373","A",180),
    new Case(7,"M03-A270","f6106532-8512-51a5-bdf4-4ea7f39ed700","79fdefe1d10b349e67a9676e628a3bbb2cb9af676e0cc5b58cb2d5d908c70dbb","A",270),
    new Case(8,"M04-B000","733276e2-82f6-5763-b14c-2ece74218a56","3f27666cd89bb0a5c076d349f0c12e9a9771b4bd3ca0cfcb722cf903f38d54f9","B",0),
    new Case(9,"M05-B090","00bef01f-69d0-5bcd-bae6-b6de32eec1dc","994a34930dec4cd54b208793ad281054be420c2b45824cd6a5718001e80ca0a7","B",90),
    new Case(10,"M06-B180","4ae9967d-98f1-50db-8174-7e0287334c7a","f0e3982a954a579f693a3e7dbeccd8d96c2b90b5e992d1870d5904af0e9a54bf","B",180),
    new Case(11,"M07-B270","b2c7beb6-4920-5fe4-afd3-d2a1151fe42a","b02c2a43cbed370afbca4cfa0384f7e438fded2e800ca07b89645a333c75a112","B",270)
  ));
  public static Case get(String id){for(Case c:CASES)if(c.id.equals(id))return c;throw new IllegalArgumentException("CAMERA_MATRIX_CASE");}
  public static Case byJob(String id){for(Case c:CASES)if(c.job.equals(id))return c;return null;}
  public static void require(boolean b,String code){CameraProofFrame.require(b,"CAMERA_MATRIX_"+code);}
  public static byte[] bytes(String x){return x.getBytes(StandardCharsets.UTF_8);}
  public static Map<String,Object> map(Object... pairs){require(pairs.length%2==0,"MAP");Map<String,Object> m=new TreeMap<>();for(int i=0;i<pairs.length;i+=2){String k=(String)pairs[i];require(!m.containsKey(k),"DUPLICATE");m.put(k,pairs[i+1]);}return m;}
  public static String json(Object x){if(x==null)return "null";if(x instanceof String){String s=(String)x;StringBuilder b=new StringBuilder("\"");for(char c:s.toCharArray()){require(c>=32&&c<=126,"ASCII");if(c=='\\'||c=='\"')b.append('\\');b.append(c);}return b.append('"').toString();}if(x instanceof Boolean||x instanceof Integer||x instanceof Long)return x.toString();if(x instanceof Map){Map<?,?> m=(Map<?,?>)x;List<String> ks=new ArrayList<>();for(Object k:m.keySet()){require(k instanceof String,"KEY");ks.add((String)k);}Collections.sort(ks);List<String> a=new ArrayList<>();for(String k:ks)a.add(json(k)+":"+json(m.get(k)));return "{"+String.join(",",a)+"}";}if(x instanceof List){List<String> a=new ArrayList<>();for(Object y:(List<?>)x)a.add(json(y));return "["+String.join(",",a)+"]";}throw new IllegalArgumentException("CAMERA_MATRIX_JSON_TYPE");}
  public static Map<String,Object> parse(byte[] b,int max)throws Exception{require(b.length>0&&b.length<=max,"JSON_CAP");return PhonePortabilityJson.object(PhonePortabilityJson.parse(b));}
  public static void keys(Map<String,Object> m,String... k){require(m.keySet().equals(new HashSet<>(Arrays.asList(k))),"KEYS");}
  public static long number(Object v,long min,long max){require(v instanceof Long||v instanceof Integer,"INTEGER");long n=((Number)v).longValue();require(n>=min&&n<=max,"INTEGER_BOUND");return n;}
  public static String hash(Object v){require(v instanceof String&&((String)v).matches("[a-f0-9]{64}"),"HASH");return (String)v;}
  public static String uuid(Object v){require(v instanceof String&&((String)v).matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"),"UUID");return (String)v;}
  public static Map<String,Object> request(String input,Case c,int screenW,int screenH)throws Exception{
    Map<String,Object> m=parse(bytes(input),4096);keys(m,"camera","previewRectPhysical","viewGeneration");Map<String,Object> a=PhonePortabilityJson.object(m.get("camera"));keys(a,"reportedWidth","reportedHeight","previewWidth","previewHeight","layout","contentMode");long width=number(a.get("reportedWidth"),1,4000000),height=number(a.get("reportedHeight"),1,4000000);require(width*height<=4000000&&c.layout.equals(a.get("layout"))&&"FILL".equals(a.get("contentMode")),"REQUEST");long pw=number(a.get("previewWidth"),1,16384),ph=number(a.get("previewHeight"),1,16384);number(m.get("viewGeneration"),1,Integer.MAX_VALUE);
    Map<String,Object> rect=PhonePortabilityJson.object(m.get("previewRectPhysical"));keys(rect,"left","top","right","bottom");long l=number(rect.get("left"),0,screenW),t=number(rect.get("top"),0,screenH),rr=number(rect.get("right"),0,screenW),b=number(rect.get("bottom"),0,screenH);require(rr-l==pw&&b-t==ph,"RECT");return m;
  }
  public static Set<String> names(){Set<String> n=new HashSet<>(Arrays.asList("owner","registry","seal","export-attempt","export-terminal"));for(String p:PERMISSIONS)n.add(p+".permission");for(Case c:CASES){n.add(c.id+".intent");n.add(c.id+".terminal");if(c.control()){n.add(c.id+".invoke");n.add(c.id+".phase");}}return n;}
  public static int bound(String n){require(names().contains(n),"RECORD_NAME");return n.equals("registry")?16384:4096;}
  public static Map<String,Object> registry(){List<Object> cases=new ArrayList<>();for(Case c:CASES)cases.add(map("caseId",c.id,"jobId",c.job,"targetSha256",c.target,"layout",c.layout,"pose",c.pose,"sdkLimit",1));return map("run",RUN,"cases",cases,"permissions",Arrays.asList(PERMISSIONS),"targetManifest",TARGET_MANIFEST,"jpegLimit",JPEG,"outputLimit",OUTPUT,"bookkeeping",BOOK,"automaticRetakes",0,"targetSetRun","p203-matrix-20261023-c1-r1","retainedInitialization",map("root",RETAINED_ROOT,"ownerSha256",CameraProofFrame.hash(retainedOwner()),"maximumBytes",RETAINED_INIT_MAX,"classification","FAILED_BEFORE_REGISTRY_OR_SDK"));}

  public static void inputSize(long n){require(n>0&&n<=JPEG,"JPEG_LIMIT");}
  /** Monotonic, one-use case readiness. No sensor/content attestation. */
  public static final class Readiness {
    private String token;private Case current;private long issued;
    public synchronized void clear(){token=null;current=null;}
    public synchronized String issue(Case c,long now){current=get(c.id);token=UUID.randomUUID().toString();issued=now;return token;}
    public synchronized String consume(Case c,String supplied,long now){long delta;try{delta=Math.subtractExact(now,issued);}catch(ArithmeticException error){throw new IllegalArgumentException("CAMERA_MATRIX_READINESS_TIME",error);}require(current==c&&token!=null&&token.equals(supplied)&&delta>=0&&delta<=120000000000L,"READINESS_STALE");String used=token;clear();return used;}
  }
}

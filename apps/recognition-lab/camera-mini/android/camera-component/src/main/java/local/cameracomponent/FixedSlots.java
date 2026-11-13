package local.cameracomponent;
import java.util.*;
import java.nio.charset.StandardCharsets;
import static local.cameracomponent.Failure.*;
/** Exactly S00/S01 refused, S02 saved/exported, and one explicit S03. No allocator/reset. */
public final class FixedSlots {
 // Streaming ZIP has no private archive staging. Reserve original10+crop2+meta2+
 // possible stage10+selected output16+contingency8 =48MiB, within ONE64MiB cap.
 public static final long S03_RESERVATION=48L*1024*1024;
 // Actual selected S02 ZIP stat/hash attested before this build, and checked again
 // by the device packet. This spent output claim is NEVER refunded or rewritten.
 public static final long PRIOR_OUTPUT_BYTES=1171223;
 public static final String PRIOR_OUTPUT_SHA="10a41e841e80fd4186a7e444f8fa669ed68cf98286fdabc773c756a48cd7e2af";
 private final Evidence.Disk prior,priorS01,priorS02,active;
 private final Map<String,String> sealed=new HashMap<>(),sealedS01=new HashMap<>(),sealedS02=new HashMap<>();
 public final Evidence retained,retainedS01;
 public final Evidence.Disk diagnostic=new Evidence.Disk(){
  public Set<String> names()throws Exception{synchronized(FixedSlots.this){inventory();return active.names();}}
  public byte[] read(String n,int max)throws Exception{synchronized(FixedSlots.this){inventory();return active.read(n,max);}}
  public long free()throws Exception{return active.free();}
  public void publish(String n,byte[] b)throws Exception{synchronized(FixedSlots.this){
   if(n.equals("intent")){selectS03();require(new String(b,StandardCharsets.UTF_8).contains("|slot=S03|"),Code.STALE,"S03-binding");}
   int max=limit(n);require(b.length>0&&b.length<=max,Code.OVERSIZE,"slot-leaf");
   long used=inventory();require(!active.names().contains(n),Code.CONSUMED,"slot-no-replace");
   require(used+b.length+Evidence.EXPORT+8L*1024*1024<=Evidence.CAP,Code.QUOTA,"combined-publish");active.publish(n,b);
  }}
 };
 public FixedSlots(Evidence.Disk s00,Evidence.Disk s01,Evidence.Disk s02,Evidence.Disk s03)throws Exception{
  prior=s00;priorS01=s01;priorS02=s02;active=s03;retained=new Evidence(prior);retainedS01=new Evidence(priorS01);
  seal(prior,"S00",sealed);seal(priorS01,"S01",sealedS01);sealSuccess();inventory();
 }
 private void sealSuccess()throws Exception{
  require(priorS02.names().equals(new HashSet<>(Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt","export-attempt","export-result"))),Code.TORN,"S02-exported-shape");
  require(new String(priorS02.read("intent",4096),StandardCharsets.UTF_8).contains("|slot=S02|")&&new Evidence(priorS02).reopen().startsWith("SAVED:"),Code.TORN,"S02-saved-binding");
  require(Arrays.equals(priorS02.read("export-attempt",1),new byte[]{1})&&Arrays.equals(priorS02.read("export-result",32),"COMPLETE_READBACK".getBytes(StandardCharsets.US_ASCII)),Code.TORN,"S02-export-state");
  for(String n:priorS02.names())sealedS02.put(n,Evidence.hash(priorS02.read(n,limit(n))));
 }
 private static void seal(Evidence.Disk disk,String slot,Map<String,String> pins)throws Exception{
  require(disk.names().equals(new HashSet<>(Arrays.asList("intent","failure"))),Code.TORN,slot+"-refused-shape");
  String intent=new String(disk.read("intent",4096),StandardCharsets.UTF_8),failure=new String(disk.read("failure",512),StandardCharsets.US_ASCII);
  require(intent.contains("|slot="+slot+"|")&&failure.matches("[A-Za-z0-9_:; .-]{1,512}")&&new Evidence(disk).reopen().startsWith("REFUSED:"),Code.TORN,slot+"-refused-binding");
  for(String n:disk.names())pins.put(n,Evidence.hash(disk.read(n,limit(n))));
 }
 public static int limit(String n)throws Failure {switch(n){case "intent":case "geometry":return 4096;case "failure":return 512;case "receipt":return 1024;case "original.jpeg":return Evidence.JPEG;case "crop.png":return Evidence.CROP;case "export-attempt":return 1;case "export-result":return 32;default:throw new Failure(Code.TORN,"unknown-slot-leaf");}}
 public static void capacity(long retainedBytes,long reserved)throws Failure{require(retainedBytes>=0&&reserved>=0&&retainedBytes<=Evidence.CAP&&reserved<=Evidence.CAP-retainedBytes,Code.QUOTA,"combined-reservation");}
 private long inventory()throws Exception{
  long total=PRIOR_OUTPUT_BYTES+sealedBytes(prior,"S00",sealed)+sealedBytes(priorS01,"S01",sealedS01)+sealedBytes(priorS02,"S02",sealedS02);
  for(String n:active.names()){byte[] b=active.read(n,limit(n));require(b.length>0&&b.length<=limit(n),Code.TORN,"slot-size");total+=b.length;}
  capacity(total,0);return total;
 }
 private static long sealedBytes(Evidence.Disk disk,String slot,Map<String,String> pins)throws Exception{
  require(disk.names().equals(pins.keySet()),Code.TORN,slot+"-changed-shape");long total=0;
  for(String n:disk.names()){byte[] b=disk.read(n,limit(n));require(Evidence.hash(b).equals(pins.get(n)),Code.STALE,slot+"-changed-bytes");total+=b.length;}return total;
 }
 /** Native reads validate descriptors; expose measured bytes and hashes before intent. */
 public synchronized String retainedInventory()throws Exception{
  inventory();StringBuilder result=new StringBuilder();long total=0;
  Evidence.Disk[] disks={prior,priorS01,priorS02};String[] slots={"S00","S01","S02"};
  for(int i=0;i<3;i++)for(String n:new TreeSet<>(disks[i].names())){byte[] b=disks[i].read(n,limit(n));total+=b.length;result.append(slots[i]).append(':').append(n).append(':').append(b.length).append(':').append(Evidence.hash(b)).append('\n');}
  return result.append("retainedPrivateBytes=").append(total).append(";priorOutputChargedBytes=").append(PRIOR_OUTPUT_BYTES).append(";priorOutputShaClaim=").append(PRIOR_OUTPUT_SHA).append(";retainedBytes=").append(total+PRIOR_OUTPUT_BYTES).append(";reservation=").append(S03_RESERVATION).append(";cap=").append(Evidence.CAP).toString();
 }
 public synchronized String retainedSuccessStatus()throws Exception{inventory();return new Evidence(priorS02).reopen();}
 public synchronized void selectS03()throws Exception{
  long used=inventory();require(active.names().isEmpty(),Code.CONSUMED,"S03-exhausted");capacity(used,S03_RESERVATION);
 }
}

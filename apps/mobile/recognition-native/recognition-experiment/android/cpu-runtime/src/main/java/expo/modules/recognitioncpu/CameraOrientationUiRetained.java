package expo.modules.recognitioncpu;
import java.io.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;

/** Exact published M00 snapshot only. Old files and settled exports can never be adopted or rewritten. */
public final class CameraOrientationUiRetained {
  private CameraOrientationUiRetained(){}
  public static final String RUN="p203-orientation-20261025-ui-v2", ROOT="camera-orientation-20261025-ui-v2", CAMERA="camera-proof-orientation-ui-v2";
  public static final String SOURCE="9ca177d32ec39d7b66c97252979d641bb7058e5a338619fc4c1b42764f20e2ff", APK="6112b1a6d6b2640253c939c5fcc4c26844409bf8e879aafa2e2abc26c6462369";
  public static final String FIRST_SHA="f256ce9ecb9a9d44c3f974f16f473a1654e5802d8f3f743e7fc6ceafa5db8183", FIRST_INPUTS="f7185768e4a573b38d05cf25585c288982a86a6f7b50486ad35200c7e34f8958";
  public static final String FIXTURE_SHA="2c780895e9e79ea24c2f3d95762b724bb68e606b6f87471674b5ffee70672f1f", FIXTURE_INPUTS="1dafa9618f66e5383ffbcf3eeb420ceac3c174eb7b9fdfdfc1d0002661c8b624";
  private static final Map<String,String> CAMERA_FILES=pins(
    "c284d019-040d-3517-846c-3f4407bda993.done", "543:a899db4cebacf4d5868f3ed1b2b61aff1dd3281213472762fdb51bf7293f94bc",
    "c284d019-040d-3517-846c-3f4407bda993.numerical.json", "43360:0b466a0b54226d37579b6df7969847a6e2e77da806fcd926f6ecc51c8bb1f1ae",
    "c284d019-040d-3517-846c-3f4407bda993.preview.png", "35991:e292ff8634c8c98dbe0bdbec2ec27b8712d10f41bf099eb1361e9ec83608396b",
    "c284d019-040d-3517-846c-3f4407bda993.raw.jpg", "540831:163176cc409a27b63613a48ca47d9951028b5928c1896e8f40d83114c47d9fe9",
    "c284d019-040d-3517-846c-3f4407bda993.receipt.json", "43360:0b466a0b54226d37579b6df7969847a6e2e77da806fcd926f6ecc51c8bb1f1ae",
    "c284d019-040d-3517-846c-3f4407bda993.request.json", "765:c3b518da78fa1d240fc230401bd2fcb047d5073247bd00e71ea6d83f62bc90bc",
    "c284d019-040d-3517-846c-3f4407bda993.reservation", "148:40d95bd246962f674e0792ce5a857f15f6a6ec304f378b1b397d6c8349b3e1f6",
    "c284d019-040d-3517-846c-3f4407bda993.resolution", "305:80068421ec2fc488e253c8be24082c1df645c95e8d5fc6611712510327a7f354");
  private static final Map<String,String> RUN_FILES=pins(
    "M00-A000.intent", "899:47299e2a4c96a22496d10111acb909a3f86b8231cc5f12e015b0ecb5b543aab0",
    "M00-A000.terminal", "345:503156ffdb96c458c3c7c87c4441d15626f2cb16693e63462f7683f978a3e06a",
    "owner", "385:746210a48590f5f012538036c2baf65cbc06a9e56e5c81f2f83ddaa4a7e72088",
    "registry", "1845:f8260646af8a2a4b82cf4a3cb92c14b11a4e6ec6e8fa9dd2480e1a906e51a7af");

  // Use the existing Android API24 collection surface; no Java9 factory API is needed.
  private static Map<String,String> pins(String... pairs){
    Map<String,String> result=new TreeMap<>();
    for(int i=0;i<pairs.length;i+=2)result.put(pairs[i],pairs[i+1]);
    return Collections.unmodifiableMap(result);
  }
  private static long pinned(File root,CameraProofStore.IO io,Map<String,String> expected)throws Exception{
    require(new HashSet<>(io.list(root)).equals(expected.keySet()),"ORIENTATION_UI_RETAINED_EXACT_LEAVES");io.syncDirectory(root);long total=0;
    for(Map.Entry<String,String> e:expected.entrySet()){
      String[] pin=e.getValue().split(":");int size=Integer.parseInt(pin[0]);File f=new File(root,e.getKey());
      require(io.size(f)==size&&CameraProofFrame.hash(io.read(f,size)).equals(pin[1]),"ORIENTATION_UI_RETAINED_HASH");total=Math.addExact(total,size);
    }return total;
  }
  public static long cameraClaims(File parent,CameraProofStore.IO io)throws Exception{
    Set<String> names=new HashSet<>(io.list(parent));require(names.contains(ROOT)&&names.contains(CAMERA)&&!names.contains(Lane.RETAINED_UI_ORIENTATION_FINAL.root),"ORIENTATION_UI_RETAINED_REQUIRED_SNAPSHOT");
    long total=pinned(new File(parent,ROOT),io,RUN_FILES);File camera=new File(parent,CAMERA);Map<String,String> expected=new HashMap<>(CAMERA_FILES);
    byte[] owner=bytes("CAMERA_PROOF_OWNED_V2\n"+SOURCE+"\n"+CameraProofFrame.MODEL+"\n"+CameraOrientationGeometry.RECIPE+"\n");
    expected.put("owner",owner.length+":"+CameraProofFrame.hash(owner));
    // Refusal records can differ without changing a published row, but must validate and remain charged.
    File refusals=new File(camera,"refusals");require(io.size(refusals)==CameraProofStore.REFUSALS,"ORIENTATION_UI_RETAINED_REFUSALS");
    byte[] refusalBytes=io.read(refusals,CameraProofStore.REFUSALS);CameraProofStore.validateRefusals(refusalBytes);
    expected.put("refusals",refusalBytes.length+":"+CameraProofFrame.hash(refusalBytes));
    return Math.addExact(total,pinned(camera,io,expected));
  }
  /** Caller holds the existing OS lock and has verified no persisted grant for this fixed lane. */
  public static long exportClaim(File root,CameraProofStore.IO io,Lane lane,CameraMatrixRecoveryStore store)throws Exception{
    require(lane==Lane.RETAINED_UI_ORIENTATION_FIRST||lane==Lane.RETAINED_UI_ORIENTATION_FIXTURE,"ORIENTATION_UI_RETAINED_LANE");
    require(root.getName().equals(lane.root)&&store.state().equals("TERMINAL"),"ORIENTATION_UI_RETAINED_UNSETTLED");
    Map<String,Object> owner=store.payload("owner"),terminal=store.payload("terminal"),result=PhonePortabilityJson.object(terminal.get("result"));
    boolean first=lane==Lane.RETAINED_UI_ORIENTATION_FIRST;long output=first?673055:2796;
    require(SOURCE.equals(owner.get("exporterSource"))&&APK.equals(owner.get("exporterApk"))&&(first?FIRST_INPUTS:FIXTURE_INPUTS).equals(owner.get("inputs"))&&"READBACK_VERIFIED".equals(terminal.get("status"))&&number(result.get("bytes"),1,lane.outputCap)==output&&(first?FIRST_SHA:FIXTURE_SHA).equals(result.get("sha256")),"ORIENTATION_UI_RETAINED_EXPORT_BINDING");
    long claimed=output;for(String name:io.list(root))claimed=Math.addExact(claimed,io.size(new File(root,name)));
    require(claimed<=output+JOURNAL,"ORIENTATION_UI_RETAINED_EXPORT_CAP");return claimed;
  }
}

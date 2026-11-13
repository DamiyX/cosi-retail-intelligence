package expo.modules.recognitionexperiment;
import local.cameracomponent.Evidence;
import android.content.Context;
import android.content.pm.PackageManager;
import java.io.*;
import java.security.MessageDigest;
import static local.cameracomponent.Failure.*;
/** Build source/signer pins are mandatory. APK hash is observed, never self-pinned. */
public final class CameraIntegrationProvenance {
 private static final String PROCESS=java.util.UUID.randomUUID().toString();
 public static String bind(Context c,String source,String signer)throws Exception {
  require(source.matches("[0-9a-f]{64}")&&signer.matches("[0-9a-f]{64}"),Code.STORAGE,"build-pins");
  android.content.pm.PackageInfo info=c.getPackageManager().getPackageInfo(c.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
  android.content.pm.Signature[] signatures=info.signingInfo.getApkContentsSigners();require(signatures.length==1&&Evidence.hash(signatures[0].toByteArray()).equals(signer),Code.STORAGE,"signer");
  MessageDigest digest=MessageDigest.getInstance("SHA-256");long total=0;
  try(FileInputStream in=new FileInputStream(c.getApplicationInfo().sourceDir)){byte[] b=new byte[16384];int n;while((n=in.read(b))!=-1){total+=n;require(total<=128L*1024*1024,Code.OVERSIZE,"apk");digest.update(b,0,n);}}
  StringBuilder apk=new StringBuilder();for(byte b:digest.digest())apk.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
  return "source="+source+"|signer="+signer+"|observedApk="+apk+"|package="+c.getPackageName()+"|process="+PROCESS+"|pid="+android.os.Process.myPid()+"|uid="+android.os.Process.myUid()+"|slot="+expo.modules.recognitioncpu.CameraBatchSlots.selected(c)+"|previewLayout=IC01A2x1|recipe=sensor-viewport-exif-guide80-pad5-v2";
 }
}

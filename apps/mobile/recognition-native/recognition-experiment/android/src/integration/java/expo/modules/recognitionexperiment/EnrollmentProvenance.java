package expo.modules.recognitionexperiment;
import android.content.Context;
import android.content.pm.PackageManager;
import expo.modules.recognitioncpu.ObservedEnrollment;
import local.cameracomponent.Evidence;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Native build, signer, APK, device/runtime and pending-job bindings. No JS supplied capture claims. */
final class EnrollmentProvenance {
 private static final String PROCESS=java.util.UUID.randomUUID().toString();
 static String bind(Context c,ObservedEnrollment.Pending job)throws Exception {
  String source=BuildConfig.INTEGRATION_SOURCE_SHA,signer=BuildConfig.INTEGRATION_SIGNER_SHA;
  ObservedEnrollment.require(source.matches("[0-9a-f]{64}")&&signer.matches("[0-9a-f]{64}"),"BUILD_PINS");
  android.content.pm.PackageInfo info=c.getPackageManager().getPackageInfo(c.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
  android.content.pm.Signature[] signatures=info.signingInfo.getApkContentsSigners();ObservedEnrollment.require(signatures.length==1&&Evidence.hash(signatures[0].toByteArray()).equals(signer),"SIGNER_CHANGED");
  MessageDigest digest=MessageDigest.getInstance("SHA-256");long total=0;
  try(InputStream in=new FileInputStream(c.getApplicationInfo().sourceDir)){byte[] buffer=new byte[16384];int count;while((count=in.read(buffer))!=-1){total+=count;ObservedEnrollment.require(total<=128L*1024*1024,"APK_LIMIT");digest.update(buffer,0,count);}}
  StringBuilder apk=new StringBuilder();for(byte b:digest.digest())apk.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
  String device=Evidence.hash((android.os.Build.FINGERPRINT+"|"+android.os.Build.MANUFACTURER+"|"+android.os.Build.MODEL+"|"+java.util.Arrays.toString(android.os.Build.SUPPORTED_ABIS)).getBytes(StandardCharsets.UTF_8));
  return "source="+source+"|signer="+signer+"|observedApk="+apk+"|package="+c.getPackageName()+"|device="+device+"|api="+android.os.Build.VERSION.SDK_INT+"|process="+PROCESS+"|pid="+android.os.Process.myPid()+"|uid="+android.os.Process.myUid()+"|enrollmentJob="+job.job+"|enrollmentProduct="+job.product+"|enrollmentView="+job.view+"|enrollmentEpoch="+job.epoch+"|previewLayout=A2x1|acquisition="+ObservedEnrollment.ACQUISITION;
 }
}

package expo.modules.recognitioncpu;
import android.content.Context;
import java.io.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Only the new fixed namespace and prefix1/prefix8 are readable; there is no caller-selected path. */
public final class CameraOrientationReader implements CameraMatrixRecoveryEngine.StreamSource {
  private final CameraOrientationStore run;private final CameraProofStore camera;private final CameraProofStore.IO io;private final String source,apk;private final int prefix,remaining;
  public CameraOrientationReader(Context context,int prefix,int remaining)throws Exception{
    require(prefix==1,"ORIENTATION_EXPORT_PREFIX");this.prefix=prefix;this.remaining=remaining;source=CameraOrientationSource.SHA256;apk=CameraOrientationAndroid.apkHash(context);CameraProofFiles files=new CameraProofFiles(context);io=new CameraMatrixHistoricalReader.ReadOnlyIO(files);File root=files.orientationRoot(CameraOrientationPlan.ROOT,false);require(root!=null,"ORIENTATION_NO_RUN");run=new CameraOrientationStore(root,io,source,apk,CameraProofLifecycle.PROCESS,false);run.exportable(prefix);
    CameraOrientationFiles adapter=new CameraOrientationFiles(context);CameraProofStore.IO readOnly=new CameraProofStore.IO(){public void root(File r,boolean create)throws IOException{if(create)throw new IOException("CAMERA_ORIENTATION_READ_ONLY");adapter.root(r,false);}public void syncDirectory(File r)throws IOException{adapter.syncDirectory(r);}public List<String> list(File r)throws IOException{return adapter.list(r);}public long size(File f)throws IOException{return adapter.size(f);}public byte[] read(File f,int cap)throws IOException{return adapter.read(f,cap);}public long available(File r)throws IOException{return adapter.available(r);}public long matrixAllowance(){return adapter.matrixAllowance();}public long retainedCameraClaimBytes(){return adapter.retainedCameraClaimBytes();}public void writeNew(File f,byte[] b)throws IOException{throw new IOException("CAMERA_ORIENTATION_READ_ONLY");}public void publish(File a,File b)throws IOException{throw new IOException("CAMERA_ORIENTATION_READ_ONLY");}public void writeAt(File f,int p,byte[] b)throws IOException{throw new IOException("CAMERA_ORIENTATION_READ_ONLY");}};
    camera=CameraProofStore.readOrientation(new File(context.getFilesDir().getCanonicalFile(),CameraOrientationPlan.CAMERA_ROOT),readOnly,source,CameraProofLifecycle.PROCESS);
  }
  public String fingerprint()throws Exception{
    run.exportable(prefix);List<Object> rows=new ArrayList<>();for(String n:prefix==8?Arrays.asList("owner","registry","seal"):Arrays.asList("owner","registry")){byte[] b=run.raw(n);rows.add(map("name","run/"+n,"bytes",b.length,"sha256",CameraProofFrame.hash(b)));}
    for(int i=0;i<prefix;i++){CameraOrientationPlan.Case c=CameraOrientationPlan.ACTIVE_CASES.get(i);Map<String,byte[]> profile=camera.orientationEvidence(c);CameraOrientationArchive.validateProfile(c,profile,source,apk,run.read(c.id+".intent"));for(String tail:Arrays.asList("intent","terminal")){byte[] b=run.raw(c.id+"."+tail);rows.add(map("name","run/"+c.id+"."+tail,"bytes",b.length,"sha256",CameraProofFrame.hash(b)));}rows.add(map("caseId",c.id,"profileSha256",CameraMatrixStore.profileHash(profile)));}return CameraProofFrame.hash(bytes(json(rows)));
  }
  public CameraMatrixRecoveryEngine.Archive archive(String expected)throws Exception{require(expected.equals(fingerprint()),"ORIENTATION_INPUT_CHANGED");return new CameraOrientationArchive(run,c->camera.orientationEvidence(c),source,apk,expected,prefix,remaining);}
}

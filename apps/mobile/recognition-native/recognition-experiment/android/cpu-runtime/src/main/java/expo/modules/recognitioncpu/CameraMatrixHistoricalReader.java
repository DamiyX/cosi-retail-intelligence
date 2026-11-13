package expo.modules.recognitioncpu;
import java.io.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;
/** Fixed historical adapter: no initialization, classification, capture, pixels or model execution. */
public final class CameraMatrixHistoricalReader implements CameraMatrixRecoveryEngine.Source {
  public static final class ReadOnlyIO implements CameraProofStore.IO {
    private final CameraProofStore.IO delegate;public ReadOnlyIO(CameraProofStore.IO delegate){this.delegate=delegate;}
    private static IOException denied(){return new IOException("CAMERA_RECOVERY_READ_ONLY");}
    public void root(File root,boolean create)throws IOException{if(create)throw denied();delegate.root(root,false);}
    public void syncDirectory(File root)throws IOException{delegate.syncDirectory(root);}
    public List<String> list(File root)throws IOException{return delegate.list(root);}
    public long size(File file)throws IOException{return delegate.size(file);}
    public byte[] read(File file,int cap)throws IOException{return delegate.read(file,cap);}
    public long available(File root)throws IOException{return delegate.available(root);}
    public long matrixAllowance(){return delegate.matrixAllowance();}
    public void writeNew(File file,byte[] b)throws IOException{throw denied();}
    public void publish(File a,File b)throws IOException{throw denied();}
    public void writeAt(File file,int at,byte[] b)throws IOException{throw denied();}
  }
  private final File parent;private final ReadOnlyIO io;private final String exporterSource,exporterApk;
  private final CameraProofStore camera;private final CameraMatrixStore matrix;
  public CameraMatrixHistoricalReader(File parent,CameraProofStore.IO delegate,String exporterSource,String exporterApk)throws Exception{
    this.parent=parent;io=new ReadOnlyIO(delegate);this.exporterSource=hash(exporterSource);this.exporterApk=hash(exporterApk);
    requireRecovery(RUN.equals("p203-matrix-20261023-c1-r2")&&ROOT.equals("camera-matrix-20261023-c1-r2-v1")&&FILENAME.equals("p203-matrix-20261023-c1-r1.zip"),"HISTORICAL_PLAN");
    camera=CameraProofStore.readOnly(new File(parent,"camera-proof-v1"),io,CAMERA_OWNER,"33333333-3333-3333-3333-333333333333");
    matrix=new CameraMatrixStore(new File(parent,ROOT),io,CAPTURE_SOURCE,CAPTURE_APK,"33333333-3333-3333-3333-333333333333",false);validate();
  }
  private void validate()throws Exception{
    Set<String> expected=new HashSet<>(LEGACY_JOBS),actual=new HashSet<>();for(Case c:CASES)expected.add(c.job);for(String name:io.list(new File(parent,"camera-proof-v1")))if(!name.equals("owner")&&!name.equals("refusals"))actual.add(name.substring(0,36));requireRecovery(actual.equals(expected),"EXACT_18_JOBS");
    requireRecovery(matrix.next().equals("SEALED")&&matrix.has("export-attempt")&&!matrix.has("export-terminal")&&matrix.outstanding()==null,"HISTORICAL_STATE");
    Map<String,Object> attempt=matrix.read("export-attempt");keys(attempt,"run","source","apk","sealSha256","outputCap","filename");requireRecovery(RUN.equals(attempt.get("run"))&&CAPTURE_SOURCE.equals(attempt.get("source"))&&CAPTURE_APK.equals(attempt.get("apk"))&&FILENAME.equals(attempt.get("filename"))&&number(attempt.get("outputCap"),1,OUTPUT)==OUTPUT&&CameraProofFrame.hash(matrix.raw("seal")).equals(attempt.get("sealSha256")),"OLD_EXPORT_ATTEMPT");
    Map<String,Object> seal=matrix.read("seal");keys(seal,"run","cases","cameraProofAccepted");requireRecovery(RUN.equals(seal.get("run"))&&Boolean.FALSE.equals(seal.get("cameraProofAccepted")),"SEAL");List<Object> cases=PhonePortabilityJson.array(seal.get("cases"));requireRecovery(cases.size()==12,"SEALED_COUNT");
    for(Case c:CASES){Map<String,Object> row=PhonePortabilityJson.object(cases.get(c.index));keys(row,"caseId","status","terminalSha256");requireRecovery(c.id.equals(row.get("caseId"))&&"ATTEMPTED".equals(row.get("status"))&&matrix.has(c.id+".terminal")&&CameraProofFrame.hash(matrix.raw(c.id+".terminal")).equals(row.get("terminalSha256")),"SEALED_TERMINAL");Map<String,Object> intent=matrix.read(c.id+".intent");requireRecovery(c.job.equals(intent.get("jobId"))&&c.target.equals(intent.get("targetSha256"))&&CAPTURE_SOURCE.equals(intent.get("source"))&&CAPTURE_APK.equals(intent.get("apk")),"INTENT_PROVENANCE");profile(c);}
    CameraMatrixStore.retainedInitialization(new File(parent,RETAINED_ROOT),io);
  }
  private Map<String,byte[]> profile(Case c)throws Exception{
    Map<String,byte[]> p=camera.matrixEvidence(c);requireRecovery(p.keySet().equals(new HashSet<>(c.control()?Arrays.asList("request.json","reservation","failure.json","done","resolution"):CameraEvidenceExport.ROLES))||c.control()&&p.keySet().equals(new HashSet<>(Arrays.asList("request.json","reservation","interruption.json","done","resolution"))),"EXACT_PROFILE");
    requireRecovery(CameraMatrixStore.profileHash(p).equals(matrix.read(c.id+".terminal").get("nativeProfileSha256")),"PROFILE_FINGERPRINT");CameraMatrixEvidence.validateNative(c,p,CAPTURE_SOURCE,CAPTURE_APK,matrix.read(c.id+".intent"));return p;
  }
  public String fingerprint()throws Exception{
    validate();List<Object> rows=new ArrayList<>();
    for(String rootName:Arrays.asList("camera-proof-v1",ROOT,RETAINED_ROOT,"camera-evidence-export-v1","camera-evidence-export-c9-v1","camera-geometry-c8-v1")){
      File root=new File(parent,rootName);List<String> names=new ArrayList<>(io.list(root));Collections.sort(names);long total=0;
      for(String name:names){File file=new File(root,name);long size=io.size(file);requireRecovery(size>=0&&size<=CameraProofFrame.JPEG_LIMIT,"INPUT_BOUND");byte[] data=io.read(file,CameraProofFrame.JPEG_LIMIT);requireRecovery(data.length==size,"INPUT_CHANGED");rows.add(map("root",rootName,"name",name,"bytes",size,"sha256",CameraProofFrame.hash(data)));total+=size;}
      if(rootName.equals(ROOT))requireRecovery(total<=ORIGINAL_CANONICAL,"ORIGINAL_BOOKKEEPING");
    }
    return CameraProofFrame.hash(bytes(json(rows)));
  }
  public CameraMatrixEvidence archive(String fingerprint)throws Exception{requireRecovery(fingerprint.equals(fingerprint()),"INPUT_CHANGED");return new CameraMatrixEvidence(matrix,this::profile,CAPTURE_SOURCE,CAPTURE_APK,map("kind","FIXED_SEALED_RUN_RECOVERY","exporterSource",exporterSource,"exporterApk",exporterApk,"captureSource",CAPTURE_SOURCE,"captureApk",CAPTURE_APK,"inputs",fingerprint,"serializer",SERIALIZER,"historicalOutputInodeAttested",false,"originalExportTerminalPresent",false));}
}

package expo.modules.recognitioncpu;
import java.io.ByteArrayOutputStream;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
/** Generated header/metadata only: never an exposure, decoder, model or accepted camera result. */
public final class CameraOrientationFixture {
  private CameraOrientationFixture(){}
  public static final String JOB="e0000000-0000-4000-8000-000000000002";
  public static byte[] jpeg(){ByteArrayOutputStream b=new ByteArrayOutputStream();int[] header={255,216,255,225,0,34,'E','x','i','f',0,0,'I','I',42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0,255,192,0,17,8,0,7,0,13,3,1,17,0,2,17,0,3,17,0,255,218,0,2,0,255,217};for(int n:header)b.write(n);return b.toByteArray();}
  public static Map<String,Object> geometry(){Map<String,Object> state=map("generation",3,"view","e0000000-0000-4000-8000-000000000003","useCase","e0000000-0000-4000-8000-000000000004","displayId",0,"displayRotation",0,"captureTargetRotation",0,"previewTargetRotation",0,"previewWidth",246,"previewHeight",123,"previewLeft",0,"previewTop",0,"scale","FILL_CENTER","lens","BACK","cameraId","generated-rear-0","mirror",false,"zoom",0,"sensorOrientation",90,"sensorToTarget",90,"streaming",true);byte[] jpeg=jpeg();return map("version",2,"job",JOB,"admission",new TreeMap<>(state),"callback",new TreeMap<>(state),"saved",new TreeMap<>(state),"image",map("width",13,"height",7,"crop",Arrays.asList(0,0,13,7),"rotationDegrees",90,"timestampNanos","123456789","format",256,"jpegWidth",13,"jpegHeight",7,"exifOrientation",6,"jpegBytes",jpeg.length,"jpegSha256",CameraProofFrame.hash(jpeg)));}
  public static Map<String,byte[]> entries()throws Exception{Map<String,Object> geometry=geometry();byte[] jpeg=jpeg();CameraOrientationGeometry.validate(bytes(json(geometry)),JOB,13,7,246,123,"FILL",CameraProofFrame.header(jpeg),jpeg);Map<String,byte[]> entries=new TreeMap<>();entries.put("generated-buffer-header.jpg",jpeg);entries.put("geometry.json",bytes(json(geometry)));return entries;}
  public static CameraMatrixRecoveryEngine.StreamSource source(String source,String apk){hash(source);hash(apk);String fingerprint=CameraProofFrame.hash(bytes("P203_ORIENTATION_METADATA_FIXTURE_V2:"+source+":"+apk+":"+CameraOrientationGeometry.RECIPE));return new CameraMatrixRecoveryEngine.StreamSource(){public String fingerprint(){return fingerprint;}public CameraMatrixRecoveryEngine.Archive archive(String expected)throws Exception{require(fingerprint.equals(expected),"ORIENTATION_FIXTURE_INPUTS");return CameraMatrixEvidence.orientationFixture(source,apk,entries());}};}
}

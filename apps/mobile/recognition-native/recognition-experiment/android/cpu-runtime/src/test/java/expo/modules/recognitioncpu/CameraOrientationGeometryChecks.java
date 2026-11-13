package expo.modules.recognitioncpu;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** Asymmetric generated coordinates only. No photograph, marker fit or model execution. */
public final class CameraOrientationGeometryChecks {
  private static int count;
  private static final String JOB="a0000000-0000-4000-8000-000000000001",VIEW="b0000000-0000-4000-8000-000000000001",USE="c0000000-0000-4000-8000-000000000001";
  private static final byte[] JPEG={1,2,3,4,5};
  private static void check(boolean value){count++;if(!value)throw new AssertionError("orientation check "+count);}
  private interface Checked {void run()throws Exception;}
  private static void refuse(Checked fn)throws Exception{try{fn.run();throw new AssertionError("accepted malformed/stale geometry");}catch(IllegalArgumentException expected){count++;}}
  private static int exif(int degrees){return degrees==0?1:degrees==90?6:degrees==180?3:8;}
  private static Map<String,Object> state(int sensor,int display,int pw,int ph,String mode){return map("generation",7,"view",VIEW,"useCase",USE,"displayId",0,"displayRotation",display,"captureTargetRotation",display,"previewTargetRotation",display,"previewWidth",pw,"previewHeight",ph,"previewLeft",5,"previewTop",17,"scale",mode+"_CENTER","lens","BACK","cameraId","generated-rear-0","mirror",false,"zoom",0,"sensorOrientation",sensor,"sensorToTarget",(sensor-display*90+360)%360,"streaming",true);}
  private static Map<String,Object> contract(int sensor,int display,int pw,int ph,String mode){int rotation=(sensor-display*90+360)%360;Map<String,Object> s=state(sensor,display,pw,ph,mode);return map("version",2,"job",JOB,"admission",new TreeMap<>(s),"callback",new TreeMap<>(s),"saved",new TreeMap<>(s),"image",map("width",13,"height",7,"crop",Arrays.asList(0,0,13,7),"rotationDegrees",rotation,"timestampNanos","123456789","format",256,"jpegWidth",13,"jpegHeight",7,"exifOrientation",exif(rotation),"jpegBytes",JPEG.length,"jpegSha256",CameraProofFrame.hash(JPEG)));}
  private static Map<String,Object> child(Map<String,Object> m,String k){return PhonePortabilityJson.object(m.get(k));}
  private static void valid(Map<String,Object> m,int pw,int ph,String mode)throws Exception{int o=((Number)child(m,"image").get("exifOrientation")).intValue();CameraOrientationGeometry.validate(bytes(json(m)),JOB,13,7,pw,ph,mode,new CameraProofFrame.Header(13,7,o),JPEG);}
  public static void main(String[] args)throws Exception{
    for(int sensor:new int[]{0,90,180,270})for(int display=0;display<4;display++)for(int[] size:new int[][]{{246,123},{164,123}})for(String mode:new String[]{"FILL","FIT"}){
      Map<String,Object> m=contract(sensor,display,size[0],size[1],mode);valid(m,size[0],size[1],mode);check(true);
      for(String phase:new String[]{"callback","saved"}){
        Map<String,Object> bad=contract(sensor,display,size[0],size[1],mode);child(bad,phase).put("generation",9);refuse(()->valid(bad,size[0],size[1],mode));
      }
      int o=exif((sensor-display*90+360)%360);double[] p=CameraOrientationGeometry.rawToPreview(2,1,13,7,o,size[0],size[1],mode);double[] uv=o==1?new double[]{2,1}:o==6?new double[]{6,2}:o==3?new double[]{11,6}:new double[]{1,11};int uw=o>=5?7:13,uh=o>=5?13:7;double scale=mode.equals("FILL")?Math.max(size[0]/(double)uw,size[1]/(double)uh):Math.min(size[0]/(double)uw,size[1]/(double)uh);check(Math.abs(p[0]-((size[0]-uw*scale)/2+uv[0]*scale))<1e-9);check(Math.abs(p[1]-((size[1]-uh*scale)/2+uv[1]*scale))<1e-9);
    }
    String[][] mutations={{"callback","captureTargetRotation"},{"callback","previewTargetRotation"},{"callback","displayRotation"},{"callback","displayId"},{"callback","previewWidth"},{"callback","previewHeight"},{"callback","previewLeft"},{"callback","previewTop"},{"callback","generation"}};
    for(String[] p:mutations){Map<String,Object> m=contract(90,0,246,123,"FILL");Object old=child(m,p[0]).get(p[1]);child(m,p[0]).put(p[1],((Number)old).longValue()+1);refuse(()->valid(m,246,123,"FILL"));}
    for(Object[] mutation:new Object[][]{{"mirror",true},{"zoom",0.25},{"lens","FRONT"},{"streaming",false},{"scale","FIT_CENTER"},{"useCase",VIEW},{"displayRotation",null}}){Map<String,Object> m=contract(90,0,246,123,"FILL");child(m,"callback").put((String)mutation[0],mutation[1]);refuse(()->valid(m,246,123,"FILL"));}
    for(Object[] mutation:new Object[][]{{"crop",Arrays.asList(1,0,13,7)},{"rotationDegrees",270},{"exifOrientation",8},{"jpegWidth",7},{"width",7},{"format",35},{"jpegSha256",CameraProofFrame.hash(new byte[]{9})},{"timestampNanos","-1"},{"jpegBytes",0}}){Map<String,Object> m=contract(90,0,246,123,"FILL");child(m,"image").put((String)mutation[0],mutation[1]);refuse(()->valid(m,246,123,"FILL"));}
    Map<String,Object> m=contract(90,0,246,123,"FILL");CameraOrientationGeometry.validate(bytes(json(m)),JOB,7,13,246,123,"FILL",new CameraProofFrame.Header(13,7,6),JPEG);check(true);
    // Advertised size is provenance: the already-observed SDK fallback is valid actual evidence.
    Map<String,Object> fallback=contract(90,0,246,123,"FILL");Map<String,Object> actual=child(fallback,"image");actual.put("width",1440);actual.put("height",1080);actual.put("jpegWidth",1440);actual.put("jpegHeight",1080);actual.put("crop",Arrays.asList(0,0,1440,1080));
    CameraOrientationGeometry.validate(bytes(json(fallback)),JOB,2336,1080,246,123,"FILL",new CameraProofFrame.Header(1440,1080,6),JPEG);check(true);
    for(int[] invalid:new int[][]{{0,1080},{2336,-1},{4001,1000}})refuse(()->CameraOrientationGeometry.validate(bytes(json(fallback)),JOB,invalid[0],invalid[1],246,123,"FILL",new CameraProofFrame.Header(1440,1080,6),JPEG));
    for(String field:new String[]{"width","height","jpegWidth","jpegHeight"}){Map<String,Object> bad=parse(bytes(json(fallback)),8192);child(bad,"image").put(field,999);refuse(()->CameraOrientationGeometry.validate(bytes(json(bad)),JOB,2336,1080,246,123,"FILL",new CameraProofFrame.Header(1440,1080,6),JPEG));}
    Map<String,Object> huge=parse(bytes(json(fallback)),8192);Map<String,Object> hi=child(huge,"image");hi.put("width",4001);hi.put("height",1000);hi.put("jpegWidth",4001);hi.put("jpegHeight",1000);hi.put("crop",Arrays.asList(0,0,4001,1000));refuse(()->CameraOrientationGeometry.validate(bytes(json(huge)),JOB,2336,1080,246,123,"FILL",new CameraProofFrame.Header(4001,1000,6),JPEG));
    for(Object[] mutation:new Object[][]{{"crop",Arrays.asList(1,0,1440,1080)},{"rotationDegrees",270},{"exifOrientation",8},{"jpegBytes",10*1024*1024+1}}){Map<String,Object> bad=parse(bytes(json(fallback)),8192);child(bad,"image").put((String)mutation[0],mutation[1]);refuse(()->CameraOrientationGeometry.validate(bytes(json(bad)),JOB,2336,1080,246,123,"FILL",new CameraProofFrame.Header(1440,1080,6),JPEG));}
    Map<String,Object> stale=parse(bytes(json(fallback)),8192);child(stale,"callback").put("generation",9);refuse(()->CameraOrientationGeometry.validate(bytes(json(stale)),JOB,2336,1080,246,123,"FILL",new CameraProofFrame.Header(1440,1080,6),JPEG));
    Map<String,Object> unknown=contract(90,0,246,123,"FILL");unknown.put("physicalPose",90);refuse(()->valid(unknown,246,123,"FILL"));
    refuse(()->CameraOrientationGeometry.validate(null,JOB,13,7,246,123,"FILL",new CameraProofFrame.Header(13,7,6),JPEG));
    refuse(()->CameraOrientationGeometry.validate(new byte[8193],JOB,13,7,246,123,"FILL",new CameraProofFrame.Header(13,7,6),JPEG));
    for(int mirrored:new int[]{2,4,5,7})refuse(()->CameraOrientationGeometry.exifDegrees(mirrored));
    // Half-open full-frame edges: the far raw corner becomes the upright corner exactly once.
    double[] p=CameraOrientationGeometry.rawToPreview(0,0,13,7,6,70,130,"FIT");check(p[0]==70&&p[1]==0);
    p=CameraOrientationGeometry.rawToPreview(13,7,13,7,6,70,130,"FIT");check(p[0]==0&&p[1]==130);
    System.out.println("CameraOrientationGeometryChecks assertions="+count+"; asymmetric generated geometry only; physical FOV and corrected device evidence pending");
  }
}

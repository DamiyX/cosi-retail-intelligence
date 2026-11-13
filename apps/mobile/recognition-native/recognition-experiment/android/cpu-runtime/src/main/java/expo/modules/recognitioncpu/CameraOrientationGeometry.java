package expo.modules.recognitioncpu;

import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;

/** V2 contract: CameraX clockwise buffer -> EXIF upright -> centered preview. No fitted transform. */
public final class CameraOrientationGeometry {
  private CameraOrientationGeometry(){}
  public static final String RECIPE="camera-android-native-same-frame-exif-roi-center-bilinear-u8-gray128-rgb224-f32-div255-v2";
  public static final String RECIPE_SHA256=CameraProofFrame.hash(bytes(RECIPE));
  public static final int MAX_BYTES=8192;
  private static void ok(boolean value,String code){CameraProofFrame.require(value,"CAMERA_GEOMETRY_"+code);}
  private static Map<String,Object> obj(Object v){return PhonePortabilityJson.object(v);}
  private static long integer(Object v,long low,long high){ok(v instanceof Number&&Double.isFinite(((Number)v).doubleValue())&&((Number)v).doubleValue()==((Number)v).longValue(),"INTEGER");long n=((Number)v).longValue();ok(n>=low&&n<=high,"INTEGER_RANGE");return n;}
  private static int quarter(Object v){int n=(int)integer(v,0,270);ok(n%90==0,"QUARTER_TURN");return n;}
  public static int exifDegrees(int exif){switch(exif){case 1:return 0;case 6:return 90;case 3:return 180;case 8:return 270;default:throw new IllegalArgumentException("CAMERA_GEOMETRY_MIRRORED_EXIF");}}
  private static void uuid(Object v){ok(v instanceof String&&((String)v).matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"),"IDENTITY");}
  private static void state(Map<String,Object> s,int pw,int ph,String mode){
    keys(s,"generation","view","useCase","displayId","displayRotation","captureTargetRotation","previewTargetRotation","previewWidth","previewHeight","previewLeft","previewTop","scale","lens","cameraId","mirror","zoom","sensorOrientation","sensorToTarget","streaming");
    integer(s.get("generation"),1,9007199254740991L);uuid(s.get("view"));uuid(s.get("useCase"));integer(s.get("displayId"),0,Integer.MAX_VALUE);
    long display=integer(s.get("displayRotation"),0,3);ok(display==integer(s.get("captureTargetRotation"),0,3)&&display==integer(s.get("previewTargetRotation"),0,3),"TARGET_DISPLAY");
    ok(integer(s.get("previewWidth"),1,10000)==pw&&integer(s.get("previewHeight"),1,10000)==ph,"PREVIEW_SIZE");integer(s.get("previewLeft"),0,10000);integer(s.get("previewTop"),0,10000);
    ok((mode+"_CENTER").equals(s.get("scale"))&&("FILL".equals(mode)||"FIT".equals(mode)),"SCALE");
    ok("BACK".equals(s.get("lens"))&&Boolean.FALSE.equals(s.get("mirror"))&&Boolean.TRUE.equals(s.get("streaming")),"REAR_UNMIRRORED_STREAM");
    ok(s.get("cameraId") instanceof String&&((String)s.get("cameraId")).matches("[A-Za-z0-9._:-]{1,64}"),"CAMERA_ID");
    ok(s.get("zoom") instanceof Number&&((Number)s.get("zoom")).doubleValue()==0,"ZOOM");int sensor=quarter(s.get("sensorOrientation"));ok(quarter(s.get("sensorToTarget"))==(sensor-(int)display*90+360)%360,"SENSOR_TARGET");
  }
  /** Validates actual opened JPEG bytes and metadata before decoder, inference or image publication. */
  public static Map<String,Object> validate(byte[] metadata,String job,int requestedW,int requestedH,int pw,int ph,String mode,CameraProofFrame.Header jpeg,byte[] actual)throws Exception{
    // Advertised/requested dimensions are bounded provenance, independent of actual output.
    CameraProofFrame.dimensions(requestedW,requestedH);
    ok(metadata!=null&&metadata.length>0&&metadata.length<=MAX_BYTES,"BOUND");Map<String,Object> m=parse(metadata,MAX_BYTES);keys(m,"version","job","admission","callback","saved","image");
    ok(integer(m.get("version"),2,2)==2&&job.equals(m.get("job")),"JOB_VERSION");uuid(m.get("job"));Map<String,Object> a=obj(m.get("admission")),b=obj(m.get("callback")),s=obj(m.get("saved"));state(a,pw,ph,mode);state(b,pw,ph,mode);state(s,pw,ph,mode);
    // Equality includes the native monotonic generation: returning to the old layout is still stale.
    ok(json(a).equals(json(b))&&json(a).equals(json(s)),"STALE");Map<String,Object> image=obj(m.get("image"));keys(image,"width","height","crop","rotationDegrees","timestampNanos","format","jpegWidth","jpegHeight","exifOrientation","jpegBytes","jpegSha256");
    int w=(int)integer(image.get("width"),1,4000000),h=(int)integer(image.get("height"),1,4000000);CameraProofFrame.dimensions(w,h);
    ok(w==jpeg.width&&h==jpeg.height&&integer(image.get("jpegWidth"),1,4000000)==w&&integer(image.get("jpegHeight"),1,4000000)==h,"BUFFER_JPEG_SIZE");
    List<Object> crop=PhonePortabilityJson.array(image.get("crop"));ok(crop.size()==4&&integer(crop.get(0),0,w)==0&&integer(crop.get(1),0,h)==0&&integer(crop.get(2),0,w)==w&&integer(crop.get(3),0,h)==h,"UNSUPPORTED_CROP");
    int rotation=quarter(image.get("rotationDegrees"));ok(rotation==quarter(a.get("sensorToTarget"))&&rotation==exifDegrees(jpeg.orientation)&&integer(image.get("exifOrientation"),1,8)==jpeg.orientation,"BUFFER_EXIF_TARGET");
    ok(integer(image.get("format"),256,256)==256&&image.get("timestampNanos") instanceof String&&((String)image.get("timestampNanos")).matches("[1-9][0-9]{0,18}"),"IMAGE_FORMAT_TIME");
    String timestamp=(String)image.get("timestampNanos");ok(timestamp.length()<19||timestamp.compareTo("9223372036854775807")<=0,"IMAGE_TIME_RANGE");
    ok(integer(image.get("jpegBytes"),1,CameraMatrixPlan.JPEG)==actual.length&&CameraProofFrame.hash(actual).equals(image.get("jpegSha256")),"JPEG_HASH");return m;
  }
  /** Continuous half-open edge coordinates; pixel centers use x+.5/y+.5. EXIF applied exactly once. */
  public static double[] rawToPreview(double x,double y,int w,int h,int exif,int pw,int ph,String mode){
    CameraProofFrame.dimensions(w,h);ok(x>=0&&y>=0&&x<=w&&y<=h&&pw>0&&ph>0,"COORDINATE");int deg=exifDegrees(exif);double u=x,v=y;int uw=w,uh=h;
    if(deg==90){u=h-y;v=x;uw=h;uh=w;}else if(deg==180){u=w-x;v=h-y;}else if(deg==270){u=y;v=w-x;uw=h;uh=w;}
    ok("FILL".equals(mode)||"FIT".equals(mode),"SCALE");double scale="FILL".equals(mode)?Math.max((double)pw/uw,(double)ph/uh):Math.min((double)pw/uw,(double)ph/uh);return new double[]{(pw-uw*scale)/2+u*scale,(ph-uh*scale)/2+v*scale};
  }
}

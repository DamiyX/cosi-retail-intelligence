package local.cameracomponent;
import static local.cameracomponent.Failure.*;
/** Half-open EXIF-upright crop; same display/use-case frame is a required precondition.
 * Physical field-of-view equivalence is NOT established by this arithmetic. */
public final class Geometry {
 public static int rotation(int exif)throws Failure {switch(exif){case 1:return 0;case 6:return 90;case 3:return 180;case 8:return 270;default:throw new Failure(Code.GEOMETRY,"exif");}}
 private static String number(int value){return Integer.toString(value).replace('-', 'N');}
 private static int expected(int exif){switch(exif){case 1:return 0;case 6:return 90;case 3:return 180;case 8:return 270;default:return -1;}}
 /** N is a negative sign; UNKNOWN is an unsupported EXIF expectation. All values are ints. */
 public static String observations(int bytes,int w,int h,int exif,int rotation,int left,int top,int right,int bottom){
  return "B"+number(bytes)+"_E"+number(exif)+"_ER"+(expected(exif)<0?"UNKNOWN":number(expected(exif)))+"_R"+number(rotation)+"_W"+number(w)+"_H"+number(h)+"_L"+number(left)+"_T"+number(top)+"_X"+number(right)+"_Y"+number(bottom)+"_EL0_ET0_EX"+number(w)+"_EY"+number(h)+"_MAXB10485760_MAXP4000000";
 }
 public static void admission(int bytes,int w,int h,int exif,int rotation,int left,int top,int right,int bottom)throws Failure {
  String values=observations(bytes,w,h,exif,rotation,left,top,right,bottom);
  if(!(bytes>0&&bytes<=10*1024*1024&&w>0&&h>0&&(long)w*h<=4000000))throw new Failure(Code.OVERSIZE,"header","NONE",values);
  int wanted=expected(exif);if(wanted<0)throw new Failure(Code.GEOMETRY,"exif","NONE",values);
  boolean rotationMismatch=wanted!=rotation,cropMismatch=left<0||top<0||left>=right||top>=bottom||right>w||bottom>h;
  if(rotationMismatch||cropMismatch)throw new Failure(Code.GEOMETRY,rotationMismatch?(cropMismatch?"buffer-rotation-crop":"buffer-rotation"):"buffer-crop","NONE",values);
 }
 public static void jpegHeader(String mime,int encodedW,int encodedH,int proxyW,int proxyH)throws Failure {
  if(!("image/jpeg".equals(mime)&&encodedW==proxyW&&encodedH==proxyH))throw new Failure(Code.GEOMETRY,"jpeg-size","NONE","M"+("image/jpeg".equals(mime)?"JPEG":"image/png".equals(mime)?"PNG":"OTHER")+"_JW"+number(encodedW)+"_JH"+number(encodedH)+"_EW"+number(proxyW)+"_EH"+number(proxyH));
 }
 /** Historical v1 arithmetic retained for original fixtures only; capture uses CropGeometry.plan. */
 public static int[] crop(int rawW,int rawH,int exif,int pw,int ph)throws Failure {
  admission(1,rawW,rawH,exif,rotation(exif),0,0,rawW,rawH); require(pw>0&&ph>0&&pw<=10000&&ph<=10000,Code.GEOMETRY,"preview");
  int w=exif>=5?rawH:rawW,h=exif>=5?rawW:rawH; double scale=Math.max((double)pw/w,(double)ph/h);
  double ox=(pw-w*scale)/2,oy=(ph-h*scale)/2;
  double l=(.1*pw-ox)/scale,t=(.1*ph-oy)/scale,r=(.9*pw-ox)/scale,b=(.9*ph-oy)/scale;
  double dx=(r-l)*.05,dy=(b-t)*.05;
  return new int[]{Math.max(0,(int)Math.floor(l-dx)),Math.max(0,(int)Math.floor(t-dy)),Math.min(w,(int)Math.ceil(r+dx)),Math.min(h,(int)Math.ceil(b+dy))};
 }
}

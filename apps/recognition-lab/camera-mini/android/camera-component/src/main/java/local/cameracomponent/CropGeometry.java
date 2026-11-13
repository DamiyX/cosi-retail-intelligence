package local.cameracomponent;
import java.util.*;
import static local.cameracomponent.Failure.*;
/** Row-major 3x3 matrices multiplying column vectors; mul(L,R) applies R then L.
 * S(sensor)->B(buffer)=A, S->V(view)=P, B->U(EXIF upright)=R.
 * Thus V->U=R*A*inverse(P). All edges are half-open continuous coordinates. */
public final class CropGeometry {
 private static final double EPS=0.0001;
 private static Failure bad(String stage,double value){return new Failure(Code.GEOMETRY,stage,"NONE","D"+Long.toHexString(Double.doubleToLongBits(value)).toUpperCase(Locale.ROOT));}
 private static Failure boxes(String stage,double[] observed,double[] expected){StringBuilder s=new StringBuilder();for(int i=0;i<4;i++){if(i>0)s.append('_');s.append('O').append(i).append('D').append(Long.toHexString(Double.doubleToLongBits(observed[i])).toUpperCase(Locale.ROOT));}for(int i=0;i<4;i++)s.append("_E").append(i).append('D').append(Long.toHexString(Double.doubleToLongBits(expected[i])).toUpperCase(Locale.ROOT));return new Failure(Code.GEOMETRY,stage,"NONE",s.toString());}
 public static double[] matrix(float[] f,String label)throws Failure {
  require(f!=null&&f.length==9,Code.NOT_READY,label+"-missing");double[] a=new double[9];for(int i=0;i<9;i++)a[i]=f[i]==0?0:f[i];validate(a,label);return a;
 }
 public static void validate(double[] a,String label)throws Failure {
  require(a!=null&&a.length==9,Code.GEOMETRY,label+"-shape");for(double v:a)if(!Double.isFinite(v))throw bad(label+"-finite",v);
  require(a[6]==0&&a[7]==0&&a[8]==1,Code.GEOMETRY,label+"-perspective");double det=a[0]*a[4]-a[1]*a[3];if(det==0||!Double.isFinite(det))throw bad(label+"-singular",det);
 }
 public static double[] inverse(double[] a)throws Failure {validate(a,"inverse");double d=a[0]*a[4]-a[1]*a[3];double[] r={a[4]/d,-a[1]/d,(a[1]*a[5]-a[4]*a[2])/d,-a[3]/d,a[0]/d,(a[3]*a[2]-a[0]*a[5])/d,0,0,1};validate(r,"inverse-result");return r;}
 public static double[] mul(double[] a,double[] b)throws Failure {double[] c=new double[9];for(int i=0;i<3;i++)for(int j=0;j<3;j++)for(int k=0;k<3;k++)c[i*3+j]+=a[i*3+k]*b[k*3+j];validate(c,"composition");return c;}
 public static double[] point(double[] a,double x,double y){return new double[]{a[0]*x+a[1]*y+a[2],a[3]*x+a[4]*y+a[5]};}
 public static String canonical(double[] a){return Arrays.toString(a);}
 public static String bits(float[] a)throws Failure {matrix(a,"preview");StringBuilder s=new StringBuilder();for(float f:a)s.append(Integer.toHexString(Float.floatToIntBits(f==0?0:f))).append(',');return s.toString();}
 public static double[] rotation(int w,int h,int exif)throws Failure {switch(Geometry.rotation(exif)){case 0:return new double[]{1,0,0,0,1,0,0,0,1};case 90:return new double[]{0,-1,h,1,0,0,0,0,1};case 180:return new double[]{-1,0,w,0,-1,h,0,0,1};default:return new double[]{0,1,0,-1,0,w,0,0,1};}}
 private static double[] corners(double[] m,double l,double t,double r,double b){double[] out=new double[8];double[][] points={{l,t},{r,t},{r,b},{l,b}};for(int i=0;i<4;i++){double[] p=point(m,points[i][0],points[i][1]);out[2*i]=p[0];out[2*i+1]=p[1];}return out;}
 private static double[] bounds(double[] c){double[] b={Double.POSITIVE_INFINITY,Double.POSITIVE_INFINITY,Double.NEGATIVE_INFINITY,Double.NEGATIVE_INFINITY};for(int i=0;i<4;i++){b[0]=Math.min(b[0],c[2*i]);b[1]=Math.min(b[1],c[2*i+1]);b[2]=Math.max(b[2],c[2*i]);b[3]=Math.max(b[3],c[2*i+1]);}return b;}
 private static void axes(double[] m)throws Failure {
  double d=m[0]*m[4]-m[1]*m[3];require(d>0,Code.GEOMETRY,"mapping-reflection");
  double e=1e-12; // <=1e-8 B pixel across the maximum supported10000px view.
  require((Math.abs(m[1])<=e&&Math.abs(m[3])<=e&&m[0]*m[4]>0)||(Math.abs(m[0])<=e&&Math.abs(m[4])<=e&&m[1]*m[3]<0),Code.GEOMETRY,"mapping-skew");
 }
 public static final class Plan {
  public final int[] box;public final double[] vToB,vToU,paddedU,unrounded,rotatedCrop;public final String record;
  private Plan(int[] b,double[] vb,double[] vu,double[] corners,double[] raw,double[] crop,String s){box=b;vToB=vb;vToU=vu;paddedU=corners;unrounded=raw;rotatedCrop=crop;record=s;}
 }
 public static Plan plan(int w,int h,int exif,int l,int t,int r,int b,int pw,int ph,double[] a,double[] p)throws Failure {
  Geometry.admission(1,w,h,exif,Geometry.rotation(exif),l,t,r,b);require(pw>0&&ph>0&&pw<=10000&&ph<=10000,Code.GEOMETRY,"preview-size");validate(a,"sensor-buffer");validate(p,"sensor-view");
  double[] vb=mul(a,inverse(p));axes(vb);double[] mapped=bounds(corners(vb,0,0,pw,ph)),crop={l,t,r,b};
  for(int i=0;i<4;i++)if(Math.abs(mapped[i]-crop[i])>1+EPS)throw boxes("viewport-crop-edge"+i,mapped,crop);
  double[] paddedB=corners(vb,.06*pw,.06*ph,.94*pw,.94*ph);
  for(int i=0;i<4;i++)if(paddedB[2*i]<l-1-EPS||paddedB[2*i]>r+1+EPS||paddedB[2*i+1]<t-1-EPS||paddedB[2*i+1]>b+1+EPS)throw bad("guide-outside",paddedB[2*i]);
  double[] rot=rotation(w,h,exif),vu=mul(rot,vb);axes(vu);double[] pu=corners(vu,.06*pw,.06*ph,.94*pw,.94*ph),raw=bounds(pu),rc=bounds(corners(rot,l,t,r,b));int uw=exif==6||exif==8?h:w,uh=exif==6||exif==8?w:h;
  int[] box={(int)Math.max(0,Math.max(Math.ceil(rc[0]-EPS),Math.floor(raw[0]))),(int)Math.max(0,Math.max(Math.ceil(rc[1]-EPS),Math.floor(raw[1]))),(int)Math.min(uw,Math.min(Math.floor(rc[2]+EPS),Math.ceil(raw[2]))),(int)Math.min(uh,Math.min(Math.floor(rc[3]+EPS),Math.ceil(raw[3])))};
  require(box[2]>box[0]&&box[3]>box[1],Code.GEOMETRY,"empty-derivative");for(int i=0;i<4;i++)if(Math.abs(box[i]-raw[i])>1+EPS)throw bad("crop-rounding"+i,box[i]-raw[i]);
  String record="v2|A="+canonical(a)+"|P="+canonical(p)+"|VB="+canonical(vb)+"|VU="+canonical(vu)+"|guideV=0.1,0.1,0.9,0.9|padV=0.06,0.06,0.94,0.94|cornersU="+canonical(pu)+"|unroundedU="+canonical(raw)+"|roundedU="+Arrays.toString(box)+"|nativeCropU="+canonical(rc)+"|roundClipDelta="+canonical(new double[]{box[0]-raw[0],box[1]-raw[1],box[2]-raw[2],box[3]-raw[3]});
  return new Plan(box,vb,vu,pu,raw,rc,record);
 }
}

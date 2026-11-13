package local.cameracomponent;
import android.graphics.Matrix;
import android.view.View;
import android.view.ViewParent;
import androidx.camera.core.ViewPort;
import androidx.camera.view.PreviewView;
import static local.cameracomponent.Failure.*;
/** Main-thread immutable copy of actual viewport/view/sensor transform. */
public final class PreviewSnapshot {
 public final float[] sensorToView;public final String identity;
 private PreviewSnapshot(float[] m,String s){sensorToView=m;identity=s;}
 public static String viewport(ViewPort v)throws Failure {require(v!=null,Code.NOT_READY,"viewport-missing");return v.getAspectRatio()+","+v.getRotation()+","+v.getScaleType()+","+v.getLayoutDirection();}
 public static float[] copy(Matrix m,String label)throws Failure{require(m!=null,Code.NOT_READY,label+"-missing");float[] a=new float[9];new Matrix(m).getValues(a);CropGeometry.matrix(a,label);return a;}
 public static PreviewSnapshot take(PreviewView v,String viewport)throws Failure{
  require(v.getWidth()>0&&v.getHeight()>0&&v.isAttachedToWindow(),Code.NOT_READY,"measured-view");
  for(View node=v;node!=null;){require(node.getMatrix().isIdentity()&&node.getScaleX()==1&&node.getScaleY()==1&&node.getRotation()==0&&node.getRotationX()==0&&node.getRotationY()==0&&node.getTranslationX()==0&&node.getTranslationY()==0&&node.getTranslationZ()==0&&node.getScrollX()==0&&node.getScrollY()==0,Code.GEOMETRY,"custom-view-transform");ViewParent parent=node.getParent();node=parent instanceof View?(View)parent:null;}
  String current=viewport(v.getViewPort());require(current.equals(viewport),Code.STALE,"viewport-changed");float[] m=copy(v.getSensorToViewTransform(),"sensor-view");int[] xy=new int[2];v.getLocationOnScreen(xy);
  return new PreviewSnapshot(m,v.getWidth()+","+v.getHeight()+","+xy[0]+","+xy[1]+","+v.getLayoutDirection()+","+v.getScaleType()+","+v.getImplementationMode()+"|VP="+current+"|Pbits="+CropGeometry.bits(m));
 }
}

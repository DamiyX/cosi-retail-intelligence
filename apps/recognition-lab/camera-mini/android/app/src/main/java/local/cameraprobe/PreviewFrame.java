package local.cameraprobe;

import android.content.Context;
import android.widget.FrameLayout;

/** The fixed 2:1 preview gets its height during measurement, before child layout. */
final class PreviewFrame extends FrameLayout {
 PreviewFrame(Context context){super(context);}
 @Override protected void onMeasure(int widthMeasureSpec,int heightMeasureSpec){
  int height=MeasureSpec.getSize(widthMeasureSpec)/2;
  super.onMeasure(widthMeasureSpec,MeasureSpec.makeMeasureSpec(height,MeasureSpec.EXACTLY));
 }
}

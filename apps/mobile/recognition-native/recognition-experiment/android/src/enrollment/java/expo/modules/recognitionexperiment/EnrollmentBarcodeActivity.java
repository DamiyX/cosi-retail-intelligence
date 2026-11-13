package expo.modules.recognitionexperiment;

import android.os.Bundle;import android.os.SystemClock;import android.graphics.Rect;import android.util.Size;import android.widget.*;
import androidx.activity.ComponentActivity;import androidx.camera.core.*;import androidx.camera.lifecycle.ProcessCameraProvider;import androidx.camera.view.PreviewView;import androidx.core.content.ContextCompat;
import expo.modules.recognitioncpu.*;import java.util.concurrent.*;

/** Explicit analyzer-only screen. Never binds ImageCapture, records photos, grants permission or runs the CPU model. */
public final class EnrollmentBarcodeActivity extends ComponentActivity {
 private final Object token=new Object();private EnrollmentOwner owner;private EnrollmentOwner.BarcodeBinding binding;
 private final ExecutorService worker=new ThreadPoolExecutor(1,1,0L,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(1));
 private EnrollmentBarcodeSession session;private ProcessCameraProvider provider;private Preview preview;private ImageAnalysis analysis;private PreviewView view;private TextView text;
 private boolean foreground,opening,opened,stopped,ended,closing,candidateSaved;private long lastTimestamp;private ObservedEnrollment.Barcode choice;
 private void status(String value){runOnUiThread(()->{if(!isDestroyed()){text.setText(value);text.setContentDescription(value);}});}
 private void button(LinearLayout root,String label,Runnable action){Button b=new Button(this);b.setText(label);b.setContentDescription(label);b.setMinHeight((int)(48*getResources().getDisplayMetrics().density));root.addView(b);b.setOnClickListener(v->{try{action.run();}catch(Exception e){status("Barcode action refused; preserve progress.");}});}
 @Override protected void onCreate(Bundle bundle){super.onCreate(bundle);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);view=new PreviewView(this);root.addView(view,new LinearLayout.LayoutParams(-1,0,1));ScrollView scroll=new ScrollView(this);LinearLayout actions=new LinearLayout(this);actions.setOrientation(LinearLayout.VERTICAL);scroll.addView(actions);root.addView(scroll,new LinearLayout.LayoutParams(-1,-2));text=new TextView(this);text.setAccessibilityLiveRegion(1);actions.addView(text);setContentView(root);
  try{owner=EnrollmentOwner.get(this,BuildConfig.INTEGRATION_SOURCE_SHA);binding=owner.claimBarcode(token,getIntent().getLongExtra("barcodeEpoch",-1));view.setContentDescription("Barcode preview for Product "+(binding.product+1));status("Product "+(binding.product+1)+" — "+ObservedEnrollment.VIEWS[binding.view]+". Scan this product's printed EAN/UPC code. A code does not identify its package automatically. Open scanning explicitly; no photo will be taken.");}
  catch(Exception error){status("Barcode ownership could not be verified. Close without retrying.");return;}
  button(actions,"Open barcode scanning",this::open);
  button(actions,"No barcode presented",()->choose(ObservedEnrollment.Barcode.NOT_PRESENTED));
  button(actions,"Barcode unreadable",()->choose(ObservedEnrollment.Barcode.UNREADABLE));
  button(actions,"Decline barcode scanning",()->choose(ObservedEnrollment.Barcode.DECLINED));
  button(actions,"Close barcode scanning",()->{closing=true;stop();finish();});
 }
 private void open(){
  owner.requireLive(token);ObservedEnrollment.require(!opened&&!opening&&!stopped,"BARCODE_EXPLICIT_REARM_REQUIRED");ObservedEnrollment.require(checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED,"CAMERA_PERMISSION_REQUIRED");opened=true;opening=true;
  session=new EnrollmentBarcodeSession(EnrollmentBarcodeSession.on(worker),ContextCompat.getMainExecutor(this),new EnrollmentBarcodeDecoder(),new EnrollmentBarcodeSession.Sink(){
   public boolean valid(){return foreground&&hasWindowFocus()&&checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED&&owner.barcodeValid(token,binding);}
   public void status(String s){EnrollmentBarcodeActivity.this.status(s);}
   public void candidate(EnrollmentBarcodeSession.Hit hit)throws Exception{owner.barcodeCandidate(token,binding,hit);candidateSaved=true;status("Stable "+hit.format+" code: "+hit.raw+". Close this screen and explicitly confirm the code against this product in enrollment. No photo taken.");}
   public void drained(){stopCamera();finishDrain();}
   public void uncertain(){owner.barcodeUncertain();status("Barcode cleanup is uncertain. Camera ownership remains blocked; preserve the attempt.");}
  },SystemClock::elapsedRealtime);
  com.google.common.util.concurrent.ListenableFuture<ProcessCameraProvider> future=ProcessCameraProvider.getInstance(this);
  future.addListener(()->{try{
   if(stopped||!foreground||!owner.barcodeValid(token,binding))return;
   provider=future.get();int rotation=view.getDisplay().getRotation();preview=new Preview.Builder().setTargetRotation(rotation).build();preview.setSurfaceProvider(view.getSurfaceProvider());analysis=new ImageAnalysis.Builder().setTargetResolution(new Size(640,480)).setTargetRotation(rotation).setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();
   analysis.setAnalyzer(ContextCompat.getMainExecutor(this),image->{
    session.offer(new EnrollmentBarcodeSession.Frame(){
     public EnrollmentBarcodeSession.Pixels copy(){ObservedEnrollment.require(image.getFormat()==35&&image.getPlanes().length>0,"BARCODE_YUV_REQUIRED");long timestamp=image.getImageInfo().getTimestamp();ObservedEnrollment.require(timestamp>lastTimestamp,"BARCODE_DUPLICATE_FRAME");lastTimestamp=timestamp;Rect crop=image.getCropRect();ImageProxy.PlaneProxy plane=image.getPlanes()[0];return EnrollmentBarcodeSession.copyY(plane.getBuffer(),image.getWidth(),image.getHeight(),plane.getRowStride(),plane.getPixelStride(),crop.left,crop.top,crop.width(),crop.height(),image.getImageInfo().getRotationDegrees());}
     public void close(){image.close();}
    });
   });provider.bindToLifecycle(this,CameraSelector.DEFAULT_BACK_CAMERA,preview,analysis);status("Scanning supported codes only. Hold the printed code steady; no shutter is available here.");
  }catch(Exception error){status("Barcode preview could not open. No automatic retry.");stop();}finally{opening=false;if(stopped)stopCamera();finishDrain();}},ContextCompat.getMainExecutor(this));
 }
 private void choose(ObservedEnrollment.Barcode value){owner.requireLive(token);ObservedEnrollment.require(!ended&&choice==null,"BARCODE_ALREADY_SETTLED");choice=value;stop();}
 private void stopCamera(){stopped=true;try{if(analysis!=null)analysis.clearAnalyzer();if(preview!=null)preview.setSurfaceProvider(null);if(provider!=null){if(preview!=null)provider.unbind(preview);if(analysis!=null)provider.unbind(analysis);}}catch(RuntimeException e){owner.barcodeUncertain();status("Camera unbinding uncertain; owner retained.");}}
 private void stop(){stopCamera();if(session!=null)session.stop();finishDrain();}
 private void finishDrain(){
  if(ended||opening||!stopped||(!closing&&foreground&&choice==null&&!candidateSaved)||(session!=null&&!session.drained()))return;
  try{if(choice!=null&&foreground&&owner.barcodeValid(token,binding)){owner.barcodeDisposition(token,binding,choice);status("Barcode disposition saved. Close and read enrollment progress.");}owner.barcodeDrained(token);ended=true;worker.shutdown();if(!foreground)owner.release(token);}catch(Exception error){owner.barcodeUncertain();status("Terminal barcode state could not be verified; owner retained.");}
 }
 @Override protected void onResume(){super.onResume();foreground=true;if(owner!=null&&binding!=null){owner.foreground(token,true);owner.focus(token,hasWindowFocus());}}
 @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(owner!=null&&binding!=null){owner.focus(token,focused&&foreground);if(!focused&&opened)stop();}}
 @Override protected void onStop(){foreground=false;if(owner!=null&&binding!=null){owner.foreground(token,false);stop();if(ended)owner.release(token);}super.onStop();}
 @Override protected void onDestroy(){if(ended||binding==null)worker.shutdown();super.onDestroy();}
}

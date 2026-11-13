package expo.modules.recognitionexperiment;

import android.os.Bundle;
import android.graphics.*;
import android.view.View;
import android.widget.*;
import androidx.activity.ComponentActivity;
import androidx.camera.view.PreviewView;
import expo.modules.recognitioncpu.*;
import local.cameracomponent.*;
import java.util.concurrent.*;

/** Fixed upright accepted preview. Launch/recreation never opens a camera or takes a photo. */
public final class EnrollmentActivity extends ComponentActivity {
 private final Object token=new Object();private EnrollmentOwner owner;private RecordOwner records;private CameraComponent component;
 private boolean foreground,processing;private TextView status;private Bitmap reviewed;
 private final ExecutorService reviewWorker=Executors.newSingleThreadExecutor();
 private void show(String value){runOnUiThread(()->{if(!isDestroyed()){status.setText(value);status.setContentDescription(value);}});}
 private void failure(Exception error){show("Enrollment operation could not be verified: "+(error instanceof IllegalStateException?error.getMessage():error.getClass().getSimpleName())+". Preserve this attempt; no automatic retry.");}
 private interface Action{void run()throws Exception;}
 private void button(LinearLayout column,String label,Action action){Button b=new Button(this);b.setText(label);b.setMinHeight((int)(48*getResources().getDisplayMetrics().density));b.setOnClickListener(v->{try{action.run();}catch(Exception e){failure(e);}});column.addView(b);}
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);setContentView(root);status=new TextView(this);status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);status.setText("Enrollment: saved evidence is preserved. Open preview explicitly.");root.addView(status,new LinearLayout.LayoutParams(-1,(int)(76*getResources().getDisplayMetrics().density)));
  ScrollView scroll=new ScrollView(this);LinearLayout column=new LinearLayout(this);column.setOrientation(LinearLayout.VERTICAL);scroll.addView(column);
  try{owner=EnrollmentOwner.get(this,BuildConfig.INTEGRATION_SOURCE_SHA);}catch(Exception e){failure(e);root.addView(scroll);button(column,"Close",this::finish);return;}
  String mode=getIntent().getStringExtra("mode");
  if("permission".equals(mode)){root.addView(scroll);button(column,"Allow camera access",()->{if(checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED)show("Camera permission is granted. Close and select a view explicitly.");else requestPermissions(new String[]{android.Manifest.permission.CAMERA},204);});button(column,"Close permission setup",this::finish);return;}
  if(saved!=null){root.addView(scroll);show("Recreated enrollment screen. No camera was opened. Close and read saved progress before selecting a fresh attempt.");button(column,"Close and preserve saved progress",this::finish);return;}
  if("review".equals(mode)){
   root.addView(scroll);try{owner.claimReview(token);ImageView image=new ImageView(this);image.setAdjustViewBounds(true);image.setContentDescription("Saved product crop awaiting your explicit Keep or Decline in enrollment");column.addView(image,new LinearLayout.LayoutParams(-1,-2));reviewWorker.execute(()->{try{byte[] crop=owner.reviewCrop();BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(crop,0,crop.length,bounds);ObservedEnrollment.require(bounds.outWidth>0&&bounds.outHeight>0&&(long)bounds.outWidth*bounds.outHeight<=4000000,"REVIEW_BOUNDS");Bitmap bitmap=BitmapFactory.decodeByteArray(crop,0,crop.length);ObservedEnrollment.require(bitmap!=null,"REVIEW_DECODE");runOnUiThread(()->{if(isDestroyed()||!owner.owns(token)){bitmap.recycle();return;}reviewed=bitmap;image.setImageBitmap(bitmap);show("Saved image and feature receipts verified. Close, read progress, then choose Keep or Decline.");});}catch(Exception e){failure(e);}finally{owner.reviewEnd(token);if(!foreground)owner.release(token);}});}catch(Exception e){failure(e);}button(column,"Close saved-view review",this::finish);return;
  }
  if(!"capture".equals(mode)){root.addView(scroll);show("Unknown enrollment screen; no camera opened.");button(column,"Close",this::finish);return;}
  PreviewView preview=new PreviewView(this);FrameLayout frame=new PreviewFrame(this);frame.addView(preview,new FrameLayout.LayoutParams(-1,-1));frame.addView(new View(this){final Paint pen=new Paint();@Override protected void onDraw(Canvas canvas){pen.setColor(Color.YELLOW);pen.setStyle(Paint.Style.STROKE);pen.setStrokeWidth(3);canvas.drawRect(getWidth()*.1f,getHeight()*.1f,getWidth()*.9f,getHeight()*.9f,pen);}},new FrameLayout.LayoutParams(-1,-1));root.addView(frame,new LinearLayout.LayoutParams(-1,-2));root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
  try{ObservedEnrollment.Pending job=owner.job();ObservedEnrollment.require(getIntent().getIntExtra("job",0)==job.job,"STALE_LAUNCH_JOB");records=owner.claim(token);TextView instruction=new TextView(this);instruction.setText("Product "+(job.product+1)+" — "+ObservedEnrollment.VIEWS[job.view]+". Keep the complete intended product inside the yellow guide. Support the phone upright. Opening preview does not capture; fresh READY is required.");column.addView(instruction);
   records.worker.execute(()->{try{String binding=EnrollmentProvenance.bind(this,job);runOnUiThread(()->{if(!owner.owns(token))return;component=new CameraComponent(this,this,preview,records,binding,value->{show(value);if(!foreground)owner.release(token);});show("Selected job "+job.job+". Open preview explicitly; no photo yet.");});}catch(Exception e){failure(e);}});
  }catch(Exception e){failure(e);}
  button(column,"Open preview",()->{owner.requireLive(token);ObservedEnrollment.require(!processing&&component!=null,"PREVIEW_NOT_PREPARED");component.open();});
  button(column,"READY: product positioned",()->{owner.requireLive(token);ObservedEnrollment.require(!processing&&component!=null,"PREVIEW_NOT_PREPARED");component.ready();});
  button(column,"Capture selected view once",()->{owner.requireLive(token);ObservedEnrollment.require(!processing&&component!=null,"PREVIEW_NOT_PREPARED");component.capture();});
  button(column,"Process saved view once",()->{owner.requireLive(token);ObservedEnrollment.require(!processing&&records!=null&&!records.session.busy(),"CAMERA_DRAINING");if(component!=null)component.stop();processing=true;try{records.worker.execute(()->{try{owner.process(getApplicationContext(),token);show("Photo and feature saved for review. Close this screen, read progress and review before Keep.");}catch(Exception e){failure(e);}finally{processing=false;if(!foreground)owner.release(token);}});}catch(RejectedExecutionException e){processing=false;throw e;}});
  button(column,"Close / cancel and preserve attempt",()->{owner.cancel(token);if(component!=null)component.stop();finish();});
 }
 @Override protected void onResume(){super.onResume();foreground=true;if(owner!=null){owner.foreground(token,true);owner.focus(token,hasWindowFocus());}}
 @Override public void onWindowFocusChanged(boolean value){super.onWindowFocusChanged(value);if(owner!=null)owner.focus(token,value&&foreground);if(!value&&component!=null)component.stop();}
 @Override protected void onStop(){foreground=false;if(owner!=null)owner.foreground(token,false);if(component!=null)component.stop();if(owner!=null)owner.release(token);super.onStop();}
 @Override protected void onDestroy(){reviewWorker.shutdown();if(reviewed!=null)reviewed.recycle();super.onDestroy();}
}

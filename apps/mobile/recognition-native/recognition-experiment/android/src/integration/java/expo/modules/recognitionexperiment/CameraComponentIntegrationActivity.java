package expo.modules.recognitionexperiment;
import expo.modules.recognitioncpu.CameraIntegrationOwner;
import expo.modules.recognitioncpu.CameraBatchSlots;

import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.os.ParcelFileDescriptor;
import android.widget.*;
import android.graphics.*;
import androidx.activity.ComponentActivity;
import androidx.camera.view.PreviewView;
import local.cameracomponent.*;
import java.io.*;
import java.security.MessageDigest;

/** One fixed I05 diagnostic photo; failed historical records retained. Launching/recreating never requests permission or opens camera. */
public final class CameraComponentIntegrationActivity extends ComponentActivity {
 private String slot;private CameraComponent component;
 private RecordOwner records;private CameraIntegrationOwner integrated;private final Object ownerToken=new Object();
 private TextView status;
 private ImageView image;private TextView details;
 private boolean foreground,exportPending,selecting;private String binding;
 private void show(String text){runOnUiThread(()->{status.setText(text);status.setContentDescription(text);});}
 private void error(Exception error,String stage){show((error instanceof Failure?(Failure)error:new Failure(error instanceof IOException?Failure.Code.STORAGE:Failure.Code.CAMERA,stage)).safe(error));}
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);slot=CameraBatchSlots.selected(this);
  try{Failure.require(getPackageManager().getApplicationInfo(getPackageName(),android.content.pm.PackageManager.GET_META_DATA).metaData.getBoolean("com.damiyx.recognition.CAMERA_COMPONENT_INTEGRATION",false),Failure.Code.PERMISSION,"integration-disabled");}catch(Exception e){finish();return;}
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);setContentView(root);
  LinearLayout column=new LinearLayout(this);column.setOrientation(LinearLayout.VERTICAL);
  ScrollView scroll=new ScrollView(this);scroll.addView(column);
  status=new TextView(this);status.setText("Integrated camera test. IC01 background/reopen test, one photo in slot: "+slot+". No physical acceptance yet.");root.addView(status,new LinearLayout.LayoutParams(-1,(int)(76*getResources().getDisplayMetrics().density)));
  TextView instructions=new TextView(this);instructions.setText("Use only the agreed generated chart, phone supported in the agreed orientation, all eight markers and border visible, black margins only. Fill at least 80% of the guide. Press READY only when positioned; capture within two minutes. Never retake an uncertain attempt. Close preview after the required post observation. No product photos.");column.addView(instructions);
  PreviewView preview=new PreviewView(this);FrameLayout frame=new PreviewFrame(this);frame.addView(preview,new FrameLayout.LayoutParams(-1,-1));
  frame.addView(new android.view.View(this){final Paint pen=new Paint();@Override protected void onDraw(Canvas canvas){pen.setColor(Color.YELLOW);pen.setStyle(Paint.Style.STROKE);pen.setStrokeWidth(3);canvas.drawRect(getWidth()*.1f,getHeight()*.1f,getWidth()*.9f,getHeight()*.9f,pen);}},new FrameLayout.LayoutParams(-1,-1));
  root.addView(frame,new LinearLayout.LayoutParams(-1,-2));root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
  add(column,"Select fixed "+slot+" integration attempt",()->{if(records==null||binding==null||component!=null||selecting)return;selecting=true;integrated.taskStart(ownerToken);records.worker.execute(()->{try{integrated.requireInitialRecord();runOnUiThread(()->{if(!foreground||integrated==null||!integrated.ownsActivity(ownerToken)){show("Selection cancelled: foreground/owner changed; no capture");return;}component=new CameraComponent(this,this,preview,records,binding,value->{show(value);if(!foreground)CameraIntegrationOwner.release(ownerToken);});show(slot+" SELECTED: open preview explicitly");});}catch(Exception e){error(e,"select-"+slot);}finally{integrated.taskEnd(ownerToken);if(!foreground)CameraIntegrationOwner.release(ownerToken);runOnUiThread(()->selecting=false);}});});
  for(String next:new String[]{})add(column,"Switch to B slot "+next,()->switchSlot(next));
  add(column,"Run saved crop through CPU once",()->{if(integrated==null||records.session.busy())return;if(component!=null)component.stop();final CameraIntegrationOwner cpuOwner=integrated;final RecordOwner cpuRecords=records;CameraIntegrationOwner.CpuPreparation preparation=cpuOwner.cpuPrepare(ownerToken);try{cpuRecords.worker.execute(()->{CameraIntegrationOwner.CpuTask cpuTask=null;try{cpuTask=cpuOwner.cpuAdmit(preparation);cpuOwner.processCpu(getApplicationContext(),cpuTask);show(cpuOwner.cpuStatus());}catch(Exception e){error(e,"cpu");}finally{if(cpuTask==null)cpuOwner.cpuPreparationEnd(preparation);else cpuOwner.cpuEnd(cpuTask);cpuOwner.releaseIfBackground(ownerToken);}});}catch(java.util.concurrent.RejectedExecutionException e){cpuOwner.cpuPreparationEnd(preparation);cpuOwner.releaseIfBackground(ownerToken);error(e,"cpu-preparation-scheduling");}});
  add(column,"Verify saved CPU result",()->{if(integrated!=null)records.worker.execute(()->{try{show(integrated.cpuStatus());}catch(Exception e){error(e,"cpu-readback");}});});
  add(column,"Request CAMERA permission",()->{if(checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED)show("PERMISSION: already granted; open preview explicitly");else requestPermissions(new String[]{android.Manifest.permission.CAMERA},1);});
  add(column,"Open preview",()->{if(component!=null){image.setVisibility(android.view.View.GONE);component.open();}});
  add(column,"READY: exact chart positioned",()->{if(component!=null)component.ready();});
  add(column,"Capture "+slot+" once",()->{if(component!=null)component.capture();else show("NOT_READY: reopen preview explicitly; no capture requested");});
  addControl(column,"Close preview / cancel",()->{String outcome=integrated==null?"No CPU owner":integrated.cancelCpu(ownerToken);if(component!=null)component.stop();show(outcome);});
  add(column,"Inspect saved record and crop",this::inspect);
  add(column,"Export once to NEW local Downloads ZIP",this::startExport);
  details=new TextView(this);column.addView(details);image=new ImageView(this);image.setContentDescription("Saved separate crop; physical correspondence remains unaccepted");image.setAdjustViewBounds(true);column.addView(image,new LinearLayout.LayoutParams(-1,-2));
  try{
   integrated=CameraIntegrationOwner.acquire(this,ownerToken);records=integrated.records;records.worker.execute(()->{try{String value=CameraIntegrationProvenance.bind(this,BuildConfig.INTEGRATION_SOURCE_SHA,BuildConfig.INTEGRATION_SIGNER_SHA)+"|"+integrated.retentionBinding();runOnUiThread(()->{binding=value;show("SELECT "+slot+" explicitly; CPU follows saved crop. Source "+BuildConfig.INTEGRATION_SOURCE_SHA.substring(0,12));});}catch(Exception e){error(e,"provenance");}});
  }catch(Exception e){error(e,"owner");}
 }
 private void switchSlot(String next)throws Exception{
  if(next.equals(slot)){show("Already selected "+slot);return;}if(exportPending||selecting||integrated==null)return;
  if(component!=null)component.stop();Failure.require(!records.session.busy(),Failure.Code.BUSY,"camera-draining");
  selecting=true;CameraIntegrationOwner previous=integrated;previous.taskStart(ownerToken);
  records.worker.execute(()->{boolean valid=false;try{previous.validateSwitch();valid=true;}catch(Exception e){error(e,"batch-switch");}finally{previous.taskEnd(ownerToken);}final boolean ok=valid;
   runOnUiThread(()->{selecting=false;if(!ok||!foreground||!previous.ownsActivity(ownerToken))return;try{Failure.require(previous.releaseForSwitch(ownerToken),Failure.Code.BUSY,"switch-draining");CameraBatchSlots.select(this,next);component=null;integrated=null;records=null;recreate();}catch(Exception e){error(e,"batch-selection");}});
  });
 }
 private interface Action {void run()throws Exception;}
 private void add(LinearLayout column,String label,Action action){addControl(column,label,()->{if(selecting||integrated==null||integrated.operationBusy(ownerToken)){show("Operation pending or owner unavailable; wait for actual completion");return;}action.run();});}
 private void addControl(LinearLayout column,String label,Action action){Button b=new Button(this);b.setText(label);b.setMinHeight((int)(48*getResources().getDisplayMetrics().density));b.setOnClickListener(v->{try{action.run();}catch(Exception e){error(e,"action");}});column.addView(b);}
 private void inspect(){if(records==null)return;if(component!=null)component.stop();records.worker.execute(()->{try{String result=records.evidence.reopen();if(result.equals("EMPTY")){show("EMPTY: no saved photo; no capture started");return;}if(!result.startsWith("SAVED:")){runOnUiThread(()->{details.setText(result);image.setVisibility(android.view.View.GONE);show(result);});return;}String geometry=records.evidence.geometry();byte[] png=records.evidence.crop();BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(png,0,png.length,bounds);Failure.require(bounds.outWidth>0&&bounds.outHeight>0&&(long)bounds.outWidth*bounds.outHeight<=4000000,Failure.Code.OVERSIZE,"readback");Bitmap bitmap=BitmapFactory.decodeByteArray(png,0,png.length);runOnUiThread(()->{image.setImageBitmap(bitmap);image.setVisibility(android.view.View.VISIBLE);details.setText(result+"\n"+geometry);show("SAVED RECORD VERIFIED: hashes match; see details/crop below");});}catch(Exception e){error(e,"inspect");}});}
 private void startExport(){
  if(records==null||exportPending||records.session.busy())return;
  if(component!=null)component.stop();exportPending=true;integrated.external(ownerToken,true);
  records.worker.execute(()->{try{Failure.require(integrated.cpuStatus().startsWith("CPU VERIFIED:"),Failure.Code.NOT_READY,"cpu-before-export");integrated.external(ownerToken,true);records.evidence.claimExport();runOnUiThread(()->{if(!foreground){exportPending=false;integrated.external(ownerToken,false);CameraIntegrationOwner.release(ownerToken);show("EXPORT CONSUMED: foreground lost before picker; no replay");return;}Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/zip").putExtra(Intent.EXTRA_TITLE,"camera-component-"+slot+".zip");try{startActivityForResult(intent,1001);}catch(Exception launchError){exportPending=false;records.worker.execute(()->{try{records.evidence.exportResult(false);error(launchError,"picker-launch");}catch(Exception e){error(e,"picker-result");}finally{integrated.external(ownerToken,false);if(!foreground)CameraIntegrationOwner.release(ownerToken);}});}});}catch(Exception e){exportPending=false;integrated.external(ownerToken,false);error(e,"export-intent");if(!foreground)CameraIntegrationOwner.release(ownerToken);}});
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=1001)return;if(records==null||integrated==null||!integrated.acceptExportResult(ownerToken,exportPending)){show("Unowned export result ignored; retained intent remains consumed");return;}exportPending=false;
  final Uri uri=data==null?null:data.getData();
  records.worker.execute(()->{boolean success=false;try{
   Failure.require(result==RESULT_OK&&uri!=null,Failure.Code.INTERRUPTED,"export-cancelled");
   Failure.require(uri.getQuery()==null&&uri.getFragment()==null&&"content".equals(uri.getScheme())&&"com.android.externalstorage.documents".equals(uri.getAuthority())&&DocumentsContract.getDocumentId(uri).matches("primary:Download/[^/]{1,180}\\.zip"),Failure.Code.STORAGE,"local-downloads-only");
   try(ParcelFileDescriptor fd=getContentResolver().openFileDescriptor(uri,"rw")){
    Failure.require(fd!=null&&fd.getStatSize()==0,Failure.Code.STORAGE,"empty-destination");
    android.system.StructStatVfs volume=android.system.Os.fstatvfs(fd.getFileDescriptor());
    Failure.require(volume.f_bavail>=0&&volume.f_frsize>0,Failure.Code.QUOTA,"export-volume-unknown");
    Evidence.exportCapacity(Math.multiplyExact(volume.f_bavail,volume.f_frsize));
    MessageDigest digest=MessageDigest.getInstance("SHA-256");long[] count={0};
    try(OutputStream raw=new ParcelFileDescriptor.AutoCloseOutputStream(ParcelFileDescriptor.dup(fd.getFileDescriptor()))){
     OutputStream limited=new java.security.DigestOutputStream(new FilterOutputStream(raw){@Override public void write(byte[] b,int off,int len)throws IOException{if(count[0]+len>16L*1024*1024)throw new IOException("EXPORT_LIMIT");out.write(b,off,len);count[0]+=len;}@Override public void write(int b)throws IOException{byte[] one={(byte)b};write(one,0,1);}},digest);
     integrated.archive(limited);limited.flush();android.system.Os.fsync(fd.getFileDescriptor());
    }
    byte[] expected=digest.digest();MessageDigest read=MessageDigest.getInstance("SHA-256");long actual=0;
    try(InputStream in=getContentResolver().openInputStream(uri)){Failure.require(in!=null,Failure.Code.STORAGE,"export-readback");byte[] buffer=new byte[16384];int n;while((n=in.read(buffer))!=-1){actual+=n;Failure.require(actual<=16L*1024*1024,Failure.Code.OVERSIZE,"export-readback");read.update(buffer,0,n);}}
    Failure.require(actual==count[0]&&MessageDigest.isEqual(expected,read.digest()),Failure.Code.STORAGE,"export-hash");success=true;
   }
  }catch(Exception e){error(e,"export");}
  try{records.evidence.exportResult(success);if(success)show("EXPORT COMPLETE: local ZIP readback hash matched; directory/power-loss durability unproved");integrated.external(ownerToken,false);if(!foreground)CameraIntegrationOwner.release(ownerToken);}catch(Exception e){error(e,"export-result");}
  });
 }
 @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(integrated!=null)integrated.focus(ownerToken,focused&&foreground);if(!focused&&component!=null)component.stop();}
 @Override protected void onResume(){super.onResume();foreground=true;if(integrated!=null)try{integrated=CameraIntegrationOwner.acquire(this,ownerToken);records=integrated.records;integrated.foreground(ownerToken,true);integrated.focus(ownerToken,hasWindowFocus());}catch(Exception e){component=null;records=null;integrated=null;error(e,"resume-owner");}}
 @Override protected void onStop(){if(integrated!=null)integrated.foreground(ownerToken,false);foreground=false;if(component!=null)component.stop();CameraIntegrationOwner.release(ownerToken);super.onStop();}
}

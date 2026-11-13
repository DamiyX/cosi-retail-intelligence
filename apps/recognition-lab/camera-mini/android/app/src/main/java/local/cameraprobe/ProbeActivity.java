package local.cameraprobe;

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

/** One fixed S03 diagnostic photo; failed S00/S01/S02 retained. Launching/recreating never requests permission or opens camera. */
public final class ProbeActivity extends ComponentActivity {
 private CameraComponent component;
 private RecordOwner records;
 private TextView status;
 private ImageView image;private TextView details;
 private boolean foreground,exportPending,selecting;private String binding;
 private void show(String text){runOnUiThread(()->{status.setText(text);status.setContentDescription(text);});}
 private void error(Exception error,String stage){show((error instanceof Failure?(Failure)error:new Failure(error instanceof IOException?Failure.Code.STORAGE:Failure.Code.CAMERA,stage)).safe(error));}
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);setContentView(root);
  LinearLayout column=new LinearLayout(this);column.setOrientation(LinearLayout.VERTICAL);
  ScrollView scroll=new ScrollView(this);scroll.addView(column);
  status=new TextView(this);status.setText("Standalone camera probe. One S03 diagnostic photo. No physical acceptance yet.");root.addView(status,new LinearLayout.LayoutParams(-1,(int)(76*getResources().getDisplayMetrics().density)));
  TextView instructions=new TextView(this);instructions.setText("Use only the agreed generated chart, phone supported upright, all eight markers and border visible, black margins only. Fill at least 80% of the guide. Press READY only when positioned; capture within two minutes. Never retake an uncertain attempt. Close preview after the required post observation. No product photos.");column.addView(instructions);
  PreviewView preview=new PreviewView(this);FrameLayout frame=new PreviewFrame(this);frame.addView(preview,new FrameLayout.LayoutParams(-1,-1));
  frame.addView(new android.view.View(this){final Paint pen=new Paint();@Override protected void onDraw(Canvas canvas){pen.setColor(Color.YELLOW);pen.setStyle(Paint.Style.STROKE);pen.setStrokeWidth(3);canvas.drawRect(getWidth()*.1f,getHeight()*.1f,getWidth()*.9f,getHeight()*.9f,pen);}},new FrameLayout.LayoutParams(-1,-1));
  root.addView(frame,new LinearLayout.LayoutParams(-1,-2));root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
  add(column,"Select fixed S03 diagnostic slot",()->{if(records==null||binding==null||component!=null||selecting)return;selecting=true;records.worker.execute(()->{try{AndroidOwner.selectS03();runOnUiThread(()->{component=new CameraComponent(this,this,preview,records,binding,this::show);show("S03 SELECTED: explicit Open, READY, one shutter; S00/S01/S02 remain consumed");});}catch(Exception e){error(e,"select-S03");}finally{runOnUiThread(()->selecting=false);}});});
  add(column,"Inspect retained S00/S01/S02 inventory",()->{if(records!=null)records.worker.execute(()->{try{String value=AndroidOwner.retainedStatus();runOnUiThread(()->{details.setText(value);show("RETAINED S00/S01/S02 VERIFIED: measured bytes/hashes below");});}catch(Exception e){error(e,"inspect-S00");}});});
  add(column,"Request CAMERA permission",()->{if(checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED)show("PERMISSION: already granted; open preview explicitly");else requestPermissions(new String[]{android.Manifest.permission.CAMERA},1);});
  add(column,"Open preview",()->{if(component!=null){image.setVisibility(android.view.View.GONE);component.open();}});
  add(column,"READY: exact chart positioned",()->{if(component!=null)component.ready();});
  add(column,"Capture S03 once",()->{if(component!=null)component.capture();});
  add(column,"Close preview / cancel",()->{if(component!=null)component.stop();});
  add(column,"Inspect saved record and crop",this::inspect);
  add(column,"Export once to NEW local Downloads ZIP",this::startExport);
  details=new TextView(this);column.addView(details);image=new ImageView(this);image.setContentDescription("Saved separate crop; physical correspondence remains unaccepted");image.setAdjustViewBounds(true);column.addView(image,new LinearLayout.LayoutParams(-1,-2));
  try{
   records=AndroidOwner.get(this);records.worker.execute(()->{try{String value=Provenance.bind(this,BuildConfig.SOURCE_SHA,BuildConfig.SIGNER_SHA);runOnUiThread(()->{binding=value;show("SELECT S03 explicitly; retained S00/S01/S02 are read-only. Source "+BuildConfig.SOURCE_SHA.substring(0,12));});}catch(Exception e){error(e,"provenance");}});
  }catch(Exception e){error(e,"owner");}
 }
 private void add(LinearLayout column,String label,Runnable action){Button b=new Button(this);b.setText(label);b.setMinHeight((int)(48*getResources().getDisplayMetrics().density));b.setOnClickListener(v->action.run());column.addView(b);}
 private void inspect(){if(records==null)return;if(component!=null)component.stop();records.worker.execute(()->{try{String result=records.evidence.reopen();if(result.equals("EMPTY")){show("EMPTY: no saved photo; no capture started");return;}if(!result.startsWith("SAVED:")){runOnUiThread(()->{details.setText(result);image.setVisibility(android.view.View.GONE);show(result);});return;}String geometry=records.evidence.geometry();byte[] png=records.evidence.crop();BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(png,0,png.length,bounds);Failure.require(bounds.outWidth>0&&bounds.outHeight>0&&(long)bounds.outWidth*bounds.outHeight<=4000000,Failure.Code.OVERSIZE,"readback");Bitmap bitmap=BitmapFactory.decodeByteArray(png,0,png.length);runOnUiThread(()->{image.setImageBitmap(bitmap);image.setVisibility(android.view.View.VISIBLE);details.setText(result+"\n"+geometry);show("SAVED RECORD VERIFIED: hashes match; see details/crop below");});}catch(Exception e){error(e,"inspect");}});}
 private void startExport(){
  if(records==null||exportPending||records.session.busy())return;
  if(component!=null)component.stop();exportPending=true;
  records.worker.execute(()->{try{records.evidence.claimExport();runOnUiThread(()->{if(!foreground){exportPending=false;show("EXPORT CONSUMED: foreground lost before picker; no replay");return;}Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/zip").putExtra(Intent.EXTRA_TITLE,"camera-component-S03.zip");startActivityForResult(intent,1001);});}catch(Exception e){exportPending=false;error(e,"export-intent");}});
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=1001||records==null)return;exportPending=false;
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
     records.evidence.archive(limited);limited.flush();android.system.Os.fsync(fd.getFileDescriptor());
    }
    byte[] expected=digest.digest();MessageDigest read=MessageDigest.getInstance("SHA-256");long actual=0;
    try(InputStream in=getContentResolver().openInputStream(uri)){Failure.require(in!=null,Failure.Code.STORAGE,"export-readback");byte[] buffer=new byte[16384];int n;while((n=in.read(buffer))!=-1){actual+=n;Failure.require(actual<=16L*1024*1024,Failure.Code.OVERSIZE,"export-readback");read.update(buffer,0,n);}}
    Failure.require(actual==count[0]&&MessageDigest.isEqual(expected,read.digest()),Failure.Code.STORAGE,"export-hash");success=true;
   }
  }catch(Exception e){error(e,"export");}
  try{records.evidence.exportResult(success);if(success)show("EXPORT COMPLETE: local ZIP readback hash matched; directory/power-loss durability unproved");}catch(Exception e){error(e,"export-result");}
  });
 }
 @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(!focused&&component!=null)component.stop();}
 @Override protected void onResume(){super.onResume();foreground=true;}
 @Override protected void onStop(){foreground=false;if(component!=null)component.stop();super.onStop();}
}

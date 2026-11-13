package local.cameracomponent;
import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.os.SystemClock;
import android.util.Size;
import androidx.camera.core.*;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LifecycleOwner;
import java.io.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static local.cameracomponent.Failure.*;
/** Reusable native owner. Caller supplies lifecycle, preview and fixed own evidence store.
 * No arbitrary paths, historical readers, Expo, model or product identity. */
public final class CameraComponent {
 public interface Listener { void status(String safeStatus); }
 private final String binding;private final Context context;private final LifecycleOwner owner;private final PreviewView view;private final Evidence evidence;private final Listener listener;
 private final Executor main;private final ExecutorService worker;private final Session session;
 private final RecordOwner records;private final Object cameraToken=new Object();
 private ProcessCameraProvider provider;private Preview preview;private ImageCapture capture;private androidx.camera.core.Camera camera;
 private volatile String geometry="";private boolean foreground,closed;private long epoch,watchdog;private boolean opening;private int displayRotation;private String viewportIdentity;private PreviewSnapshot observed;
 public CameraComponent(Context c,LifecycleOwner o,PreviewView v,RecordOwner records,String provenance,Listener l){this.records=records;binding=provenance;context=c;owner=o;view=v;evidence=records.evidence;worker=records.worker;session=records.session;listener=l;main=ContextCompat.getMainExecutor(c);}
 private boolean permitted(){return context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED;}
 private long now(){return SystemClock.elapsedRealtime();}
 private String observe()throws Failure {
  require(provider!=null&&preview!=null&&capture!=null&&provider.isBound(preview)&&provider.isBound(capture),Code.NOT_READY,"binding-lost");
  require(foreground&&!closed&&permitted()&&view.isAttachedToWindow()&&view.hasWindowFocus()&&view.getWidth()>0&&view.getHeight()>0&&view.getPreviewStreamState().getValue()==PreviewView.StreamState.STREAMING,Code.NOT_READY,"preview");
  require(view.getDisplay().getRotation()==displayRotation&&capture.getTargetRotation()==displayRotation&&preview.getTargetRotation()==displayRotation,Code.GEOMETRY,"targets");
  require(camera.getCameraInfo().getZoomState().getValue()!=null&&camera.getCameraInfo().getZoomState().getValue().getLinearZoom()==0f,Code.GEOMETRY,"zoom");
  observed=PreviewSnapshot.take(view,viewportIdentity);int[] xy=new int[2];view.getLocationOnScreen(xy);
  return epoch+"|"+displayRotation+"|"+view.getWidth()+"|"+view.getHeight()+"|"+xy[0]+"|"+xy[1]+"|"+camera.getCameraInfo().getSensorRotationDegrees(displayRotation)+"|FILL_CENTER|BACK|ZERO|"+observed.identity+"|"+binding;
 }
 public void open(){if(opening||session.busy()||(!closed&&provider!=null)||!records.claimCamera(cameraToken)){listener.status("BUSY: no second binding");return;}opening=true;foreground=true;closed=false;view.setScaleType(PreviewView.ScaleType.FILL_CENTER);
  final long opening=++epoch;
  view.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob)->{if(l!=ol||t!=ot||r!=or||b!=ob){geometry="";session.invalidate();}});
  com.google.common.util.concurrent.ListenableFuture<ProcessCameraProvider> f=ProcessCameraProvider.getInstance(context);
  f.addListener(()->{try{
   if(closed||!foreground||epoch!=opening)return;require(permitted(),Code.PERMISSION,"open");provider=f.get();displayRotation=view.getDisplay().getRotation();
   preview=new Preview.Builder().setTargetRotation(displayRotation).build();capture=new ImageCapture.Builder().setTargetResolution(new Size(1440,1080)).setTargetRotation(displayRotation).setFlashMode(ImageCapture.FLASH_MODE_OFF).build();
   require(view.isAttachedToWindow()&&view.getWidth()>0&&view.getHeight()>0,Code.NOT_READY,"bind-measure");ViewPort viewport=view.getViewPort();viewportIdentity=PreviewSnapshot.viewport(viewport);
   preview.setSurfaceProvider(view.getSurfaceProvider());UseCaseGroup group=new UseCaseGroup.Builder().setViewPort(viewport).addUseCase(preview).addUseCase(capture).build();camera=provider.bindToLifecycle(owner,CameraSelector.DEFAULT_BACK_CAMERA,group);camera.getCameraControl().setLinearZoom(0f);
   armClose(120000);this.opening=false;listener.status("PREVIEW: wait for stream; explicit READY required");
  }catch(Exception e){this.opening=false;armClose(30000);report(e,"bind");}},main);
 }
 /** Only the current binding and most recently armed phase may close preview. */
 private void armClose(long delay){final long bindingEpoch=epoch,phase=++watchdog;view.postDelayed(()->{if(!closed&&epoch==bindingEpoch&&watchdog==phase&&!session.busy())stop();},delay);}
 private void finish(Exception error,String stage){session.settle(error==null);if(closed)records.releaseCamera(cameraToken);armClose(30000);if(error!=null)terminal(error,stage);else listener.status(session.state()==Session.State.SAVED?"SAVED: original and crop"+(session.cancelledAfterCommit()?"; cancellation followed commit authorization":""):"INTERRUPTED: no accepted receipt");}
 public void ready(){try{geometry=observe();session.preview(geometry);session.ready(now(),permitted(),foreground);armClose(120000);listener.status("READY: one explicit capture within 120 seconds");}catch(Exception e){report(e,"ready");}}
 public void capture(){try{
  final String g=observe();final int pw=view.getWidth(),ph=view.getHeight();final Session.Ticket ticket=session.capture(now(),permitted(),foreground,g);watchdog++;final String intent=g+"|readyAtMs="+ticket.readyAt+"|queuedAtMs="+now();final long[] invokedAt=new long[1];AtomicBoolean delivered=new AtomicBoolean();listener.status("CAPTURING");
  worker.execute(()->{try{evidence.begin(intent);main.execute(()->{try{
   final boolean allowed=permitted();final String dispatchGeometry=observe();invokedAt[0]=now();session.dispatch(ticket,dispatchGeometry,invokedAt[0],allowed,foreground);
   capture.takePicture(main,new ImageCapture.OnImageCapturedCallback(){
    @Override public void onError(ImageCaptureException error){if(delivered.compareAndSet(false,true)){finish(new Failure(Code.CAMERA,"capture-callback","SDK_"+error.getImageCaptureError()),"capture-callback");}}
    @Override public void onCaptureSuccess(ImageProxy image){
     if(!delivered.compareAndSet(false,true)){image.close();return;}
     final int[] shape=new int[3];final Rect[] nativeCrop=new Rect[1];final long[] timestamp=new long[2];final float[][] matrices=new float[2][];
     Delivery.send(new Delivery.Proxy(){public byte[] copy()throws Exception{
      shape[0]=image.getWidth();shape[1]=image.getHeight();shape[2]=image.getImageInfo().getRotationDegrees();nativeCrop[0]=new Rect(image.getCropRect());timestamp[0]=image.getImageInfo().getTimestamp();timestamp[1]=now();
      session.valid(ticket,observe());matrices[0]=PreviewSnapshot.copy(image.getImageInfo().getSensorToBufferTransformMatrix(),"sensor-buffer");matrices[1]=observed.sensorToView.clone();require(timestamp[0]>0,Code.GEOMETRY,"image-timestamp");require(shape[2]==camera.getCameraInfo().getSensorRotationDegrees(displayRotation),Code.GEOMETRY,"sensor-target");require(image.getFormat()==256&&image.getPlanes().length==1,Code.GEOMETRY,"format");
      java.nio.ByteBuffer b=image.getPlanes()[0].getBuffer();require(b.remaining()>0&&b.remaining()<=Evidence.JPEG,Code.OVERSIZE,"jpeg");byte[] bytes=new byte[b.remaining()];b.get(bytes);return bytes;
     }public void close(){image.close();}},worker,bytes->{
      final int w=shape[0],h=shape[1],rotation=shape[2];final Rect crop=nativeCrop[0];final long imageTimestamp=timestamp[0];
      BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);
      int exif=new android.media.ExifInterface(new ByteArrayInputStream(bytes)).getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION,0);
      Geometry.admission(bytes.length,w,h,exif,rotation,crop.left,crop.top,crop.right,crop.bottom);Geometry.jpegHeader(bounds.outMimeType,bounds.outWidth,bounds.outHeight,w,h);
      CropGeometry.Plan cropPlan=CropGeometry.plan(w,h,exif,crop.left,crop.top,crop.right,crop.bottom,pw,ph,CropGeometry.matrix(matrices[0],"sensor-buffer"),CropGeometry.matrix(matrices[1],"sensor-view"));int[] box=cropPlan.box;String nativeRecord=cropPlan.record+"|B="+w+","+h+"|JPEG="+bounds.outWidth+","+bounds.outHeight+"|EXIF="+exif+"|proxyR="+rotation+"|cropB="+crop.flattenToString()+"|imageTimestamp="+imageTimestamp+"|invokeAtMs="+invokedAt[0]+"|callbackAtMs="+timestamp[1]+"|"+g;
      evidence.retain(bytes,intent,nativeRecord);Bitmap raw=null,upright=null,roi=null;
      try{BitmapFactory.Options options=new BitmapFactory.Options();options.inPreferredConfig=Bitmap.Config.ARGB_8888;options.inScaled=false;raw=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);require(raw!=null&&raw.getWidth()==w&&raw.getHeight()==h&&raw.getAllocationByteCount()<=(long)w*h*8,Code.OVERSIZE,"decode");
       Matrix m=new Matrix();m.postRotate(Geometry.rotation(exif));upright=Bitmap.createBitmap(raw,0,0,w,h,m,false);roi=Bitmap.createBitmap(upright,box[0],box[1],box[2]-box[0],box[3]-box[1]);
       ByteArrayOutputStream out=new ByteArrayOutputStream(){@Override public synchronized void write(byte[] b,int o,int n){if(count+n>Evidence.CROP)throw new IllegalStateException("CROP_LIMIT");super.write(b,o,n);}@Override public synchronized void write(int b){if(count==Evidence.CROP)throw new IllegalStateException("CROP_LIMIT");super.write(b);}};
       require(roi.compress(Bitmap.CompressFormat.PNG,100,out),Code.STORAGE,"crop");byte[] derivative=out.toByteArray();
       require(permitted(),Code.PERMISSION,"publication");
       
       evidence.save(bytes,derivative,intent,nativeRecord,()->{require(permitted(),Code.PERMISSION,"commit");session.claimCommit(ticket,geometry);});
      }finally{if(roi!=null&&roi!=upright&&roi!=raw)roi.recycle();if(upright!=null&&upright!=raw)upright.recycle();if(raw!=null)raw.recycle();}
     },error->main.execute(()->finish(error,"save")));
    }
   });
  }catch(Exception e){finish(e,"invoke");}});}catch(Exception e){main.execute(()->{finish(e,"intent");});}});
 }catch(Exception e){report(e,"capture");}}
 public void stop(){foreground=false;closed=true;opening=false;epoch++;watchdog++;geometry="";session.invalidate();if(preview!=null)preview.setSurfaceProvider(null);if(provider!=null&&preview!=null&&capture!=null)provider.unbind(preview,capture);records.releaseCamera(cameraToken);listener.status(session.busy()?"DRAINING: callbacks still owned":"CLOSED: hardware drain not attested");}
 public void reopen(){worker.execute(()->{try{String result=evidence.reopen();main.execute(()->listener.status(result));}catch(Exception e){main.execute(()->report(e,"reopen"));}});}
 private void report(Exception e,String stage){emit(e instanceof Failure?(Failure)e:new Failure(e instanceof java.io.IOException?Code.STORAGE:Code.CAMERA,stage),e,false);}
 private void terminal(Exception e,String stage){emit(e instanceof Failure?(Failure)e:new Failure(e instanceof java.io.IOException?Code.STORAGE:Code.CAMERA,stage),e,true);}
 private void emit(Failure diagnostic,Exception cause,boolean terminal){String safe=diagnostic.safe(cause);listener.status(safe);if(!terminal)return;worker.execute(()->{try{evidence.failure(safe);}catch(Exception ignored){main.execute(()->listener.status(safe+":FAILURE_RECORD_UNCONFIRMED"));}});}
 // Executor remains alive until owned work drains; app process owns it. No timeout releases ownership.
}

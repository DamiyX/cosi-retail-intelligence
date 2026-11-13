package expo.modules.recognitioncpu;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import java.io.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.JSONObject;
import org.json.JSONArray;

/** Current-ticket Android ingress and private receipt; never used by legacy/P1 entry paths. */
public final class CameraProofAndroid {
  public interface Model {float[] run(byte[] tensor)throws Exception;}
  private final Context context;private final CameraProofFiles files;private final CameraProofStore store;
  private final boolean orientation;private final String source,recipe;
  private final Map<String,Request> requests=new HashMap<>();
  public final CameraProofLifecycle gate=CameraProofLifecycle.INSTANCE;
  public static boolean enabled(Context context){
    try{return context.getPackageName().equals("com.damiyx.retailintelligence.recognitionverification")&&Arrays.asList(context.getPackageManager().getPackageInfo(context.getPackageName(),PackageManager.GET_PERMISSIONS).requestedPermissions).contains(Manifest.permission.CAMERA);}
    catch(Exception e){return false;}
  }
  public CameraProofAndroid(Context context)throws IOException{this(context,false);}
  public CameraProofAndroid(Context context,boolean orientation)throws IOException{
    this.orientation=orientation;source=orientation?CameraOrientationSource.SHA256:CameraProofSource.SHA256;recipe=orientation?CameraOrientationGeometry.RECIPE:CameraProofFrame.RECIPE;
    CameraProofFrame.require(enabled(context)&&(!orientation||CameraOrientationAndroid.enabled(context)),"CAMERA_VARIANT_DISABLED");this.context=context;files=new CameraProofFiles(context);
    CameraProofFrame.require(source.matches("[a-f0-9]{64}")&&(!orientation||!source.equals("0".repeat(64))),"CAMERA_SOURCE_UNBOUND");
    store=orientation?CameraProofStore.orientation(new File(context.getFilesDir().getCanonicalFile(),CameraOrientationPlan.CAMERA_ROOT),new CameraOrientationFiles(context),source,CameraProofLifecycle.PROCESS):new CameraProofStore(new File(context.getFilesDir().getCanonicalFile(),"camera-proof-v1"),files,source,CameraProofLifecycle.PROCESS);
  }
  private static JSONObject object(String s,String... keys)throws Exception{
    return objectBound(4096,s,keys);
  }
  private static JSONObject objectBound(int cap,String s,String... keys)throws Exception{
    CameraProofFrame.require(s!=null&&s.getBytes(StandardCharsets.UTF_8).length<=cap,"CAMERA_ARGUMENT_BOUND");JSONObject o=new JSONObject(s);
    Set<String> expected=new HashSet<>(Arrays.asList(keys)),actual=new HashSet<>();Iterator<String> it=o.keys();while(it.hasNext())actual.add(it.next());CameraProofFrame.require(actual.equals(expected),"CAMERA_ARGUMENT_KEYS");return o;
  }
  private static int integer(JSONObject o,String key)throws Exception{Object n=o.get(key);CameraProofFrame.require(n instanceof Number&&Double.isFinite(((Number)n).doubleValue())&&((Number)n).doubleValue()==((Number)n).intValue(),"CAMERA_INTEGER");return ((Number)n).intValue();}
  private static final class Request {
    final int width,height,pw,ph;final String layout,mode;
    final Map<String,Object> observations=new LinkedHashMap<>();
    Set<String> priorFiles=Collections.emptySet();Map<String,Object> matrix=null;
    Request(String json,boolean sameFrame)throws Exception{JSONObject o=object(json,"reportedWidth","reportedHeight","previewWidth","previewHeight","layout","contentMode");width=integer(o,"reportedWidth");height=integer(o,"reportedHeight");pw=integer(o,"previewWidth");ph=integer(o,"previewHeight");layout=o.getString("layout");mode=o.getString("contentMode");CameraProofFrame.dimensions(width,height);if(sameFrame)CameraProofFrame.require(pw>0&&ph>0&&pw<=10000&&ph<=10000&&(layout.equals("A")||layout.equals("B"))&&(mode.equals("FILL")||mode.equals("FIT")),"CAMERA_LAYOUT");else CameraProofFrame.roi(width,height,1,pw,ph,mode,layout);}
  }
  public CameraProofLifecycle.Ticket begin(String json,java.util.concurrent.atomic.AtomicBoolean closed)throws Exception{
    return beginOwned(json,closed,null,null,null);
  }
  public CameraProofLifecycle.Ticket beginStationary(String json,String acknowledgement,java.util.concurrent.atomic.AtomicBoolean closed)throws Exception{
    CameraProofFrame.require(CameraStationarySlot.ACK.equals(acknowledgement),"CAMERA_C8_READINESS");return beginOwned(json,closed,acknowledgement,null,null);
  }
  CameraProofLifecycle.Ticket beginMatrix(String json,java.util.concurrent.atomic.AtomicBoolean closed,CameraMatrixPlan.Case c,Map<String,Object> facts)throws Exception{return beginOwned(json,closed,null,c,facts);}
  CameraProofStore matrixStore(){return store;}
  CameraProofLifecycle.Ticket beginOrientation(String json,java.util.concurrent.atomic.AtomicBoolean closed,CameraOrientationPlan.Case c,Map<String,Object> facts)throws Exception{CameraProofFrame.require(orientation,"CAMERA_ORIENTATION_VARIANT");return beginOwned(json,closed,null,null,facts,c);}
  private CameraProofLifecycle.Ticket beginOwned(String json,java.util.concurrent.atomic.AtomicBoolean closed,String stationaryAck,CameraMatrixPlan.Case matrixCase,Map<String,Object> matrixFacts)throws Exception{
    return beginOwned(json,closed,stationaryAck,matrixCase,matrixFacts,null);
  }
  private CameraProofLifecycle.Ticket beginOwned(String json,java.util.concurrent.atomic.AtomicBoolean closed,String stationaryAck,CameraMatrixPlan.Case matrixCase,Map<String,Object> matrixFacts,CameraOrientationPlan.Case orientationCase)throws Exception{
    CameraProofFrame.require(context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED,"CAMERA_PERMISSION_DENIED");Request request=new Request(json,orientation);request.matrix=matrixFacts;
    request.priorFiles=files.existingCameraLeaves(context);
    CameraProofFrame.require(stationaryAck==null||request.layout.equals("A")&&request.mode.equals("FILL"),"CAMERA_C8_LAYOUT");
    CameraProofLifecycle.Ticket t=gate.begin(()->{
      CameraStationaryAndroid slot=stationaryAck==null?null:new CameraStationaryAndroid(context);byte[] intent=slot==null?null:slot.consumeIntent(stationaryAck);
      String id=orientationCase!=null?store.reserveOrientation(orientationCase):matrixCase!=null?store.reserveMatrix(matrixCase):slot==null?store.reserve():store.reserveStationary();JSONObject frozen=new JSONObject(json);frozen.put("sourceSha256",source);frozen.put("sdkPriorFileCount",request.priorFiles.size());
      if(slot!=null){Map<String,String> facts=CameraStationarySlot.validateIntent(intent);frozen.put("purpose",CameraStationarySlot.SLOT);frozen.put("stationaryJob",CameraStationarySlot.JOB);frozen.put("targetId",CameraStationarySlot.TARGET);frozen.put("targetSha256",CameraStationarySlot.TARGET_SHA);frozen.put("captureSourceIndexSha256",facts.get("runtimeSource"));frozen.put("captureApkSha256",facts.get("captureApk"));frozen.put("intentSha256",CameraProofFrame.hash(intent));}
      if(matrixFacts!=null)for(Map.Entry<String,Object> e:matrixFacts.entrySet())frozen.put(e.getKey(),e.getValue());
      store.write(id,"request.json",frozen.toString().getBytes(StandardCharsets.UTF_8));
      if(slot!=null)CameraProofFrame.require(Arrays.equals(intent,slot.currentIntent())&&!closed.get()&&context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED,"CAMERA_C8_READINESS_CHANGED");return id;
    },closed);synchronized(requests){requests.put(t.id,request);}return t;
  }
  public Map<String,Object> status()throws IOException{
    Map<String,Object> m=store.status();m.put("interruptedStorage",store.inspectInterrupted());m.put("sourceSha256",source);m.put("recipe",recipe);m.put("modelSha256",CameraProofFrame.MODEL);m.putAll(gate.state());m.put("nativeValidated",false);return m;
  }
  public String source(){return source;}
  public void refusal(String code)throws IOException{store.refusal(code);}
  public void recover()throws IOException{CameraProofFrame.require(gate.activeId()==null&&!CameraProofLifecycle.SHARED_BUSY.get(),"CAMERA_DRAIN_UNKNOWN");store.recover(true);}
  public void cancel(String ticket,String code){gate.cancel(ticket,code);}
  public void cancelledByLifecycle(String code){String id=gate.activeId();if(id!=null)gate.cancel(id,code);}
  public CameraProofLifecycle.Ticket captureReturned(String id){CameraProofLifecycle.Ticket t=gate.current(id);gate.captureReturned(t);return t;}
  private byte[] failureFacts(CameraProofLifecycle.Ticket t,String code)throws Exception{
    Request r;synchronized(requests){r=requests.get(t.id);}
    return new JSONObject().put("schemaVersion",1).put("kind","CAMERA_PROOF_FAILURE").put("jobId",t.id).put("sourceSha256",source).put("reason",code).put("cancelled",t.cancelled).put("physicalDrainProven",false).put("sdkHardCap",false).put("sdkPeakKnown",false).put("observations",new JSONObject(r==null?Collections.emptyMap():r.observations)).toString().getBytes(StandardCharsets.UTF_8);
  }
  public <T> CameraProofFinalizer.Completion<T> completion(CameraProofLifecycle.Ticket t,String captureFailure,java.util.concurrent.atomic.AtomicBoolean closed){
    return new CameraProofFinalizer.Durable<>(gate,store,t,reason->failureFacts(t,reason),()->{if(closed.get())gate.cancel(t.id,"MODULE_DESTROYED");},()->{if(orientation)try{CameraOrientationAttestation.discard(t.id);}catch(Exception error){throw new IllegalStateException("CAMERA_GEOMETRY_NATIVE_RELEASE",error);}synchronized(requests){requests.remove(t.id);}},captureFailure);
  }
  private static List<Integer> integers(int[] v){List<Integer> a=new ArrayList<>();for(int n:v)a.add(n);return a;}
  public Map<String,Object> process(CameraProofLifecycle.Ticket t,String json,Model model)throws Exception{
    CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");Request r;synchronized(requests){r=requests.get(t.id);}CameraProofFrame.require(r!=null,"CAMERA_REQUEST_MISSING");
    JSONObject o=orientation?objectBound(CameraOrientationGeometry.MAX_BYTES,json,"uri","width","height","orientation","geometryToken"):object(json,"uri","width","height","orientation");int w=integer(o,"width"),h=integer(o,"height"),orientation=integer(o,"orientation");
    r.observations.put("reportedWidth",w);r.observations.put("reportedHeight",h);r.observations.put("reportedOrientation",orientation);
    CameraProofFiles.Capture capture=r.matrix==null?files.capture(context,o.getString("uri"),r.priorFiles,(name,value)->r.observations.put(name,value)):files.captureMatrix(context,o.getString("uri"),r.priorFiles,(name,value)->r.observations.put(name,value));
    r.observations.put("jpegBytes",capture.bytes.length);r.observations.put("jpegSha256",CameraProofFrame.hash(capture.bytes));
    CameraProofFrame.Header observed=CameraProofFrame.header(capture.bytes,fields->{r.observations.put("headerWidth",fields.width);r.observations.put("headerHeight",fields.height);if(fields.orientation>0)r.observations.put("headerOrientation",fields.orientation);});r.observations.put("headerOrientation",observed.orientation);
    final Map<String,Object> geometry=this.orientation?CameraOrientationGeometry.validate(CameraOrientationAttestation.claim(t.id,o.getString("uri"),CameraProofFrame.hash(capture.bytes),o.getString("geometryToken")).getBytes(StandardCharsets.UTF_8),t.id,r.width,r.height,r.pw,r.ph,r.mode,observed,capture.bytes):null;
    if(geometry!=null&&r.matrix!=null){Map<String,Object> admission=PhonePortabilityJson.object(geometry.get("admission")),rect=PhonePortabilityJson.object(r.matrix.get("matrixPreviewRect"));CameraProofFrame.require(((Number)rect.get("left")).intValue()==((Number)admission.get("previewLeft")).intValue()&&((Number)rect.get("top")).intValue()==((Number)admission.get("previewTop")).intValue(),"CAMERA_GEOMETRY_PREVIEW_POSITION");}
    CameraProofFrame.require(gate.mayPublish(t)&&context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED,"CAMERA_PERMISSION_OR_CANCEL");
    CameraProofFrame.Prepared prepared=CameraProofFrame.prepare(capture.bytes,w,h,orientation,r.pw,r.ph,r.mode,r.layout,bytes->{
      CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");
      BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;bounds.inScaled=false;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);
      CameraProofFrame.require(bounds.outWidth==w&&bounds.outHeight==h&&"image/jpeg".equals(bounds.outMimeType),"CAMERA_DECODE_HEADER");
      BitmapFactory.Options options=new BitmapFactory.Options();options.inScaled=false;options.inSampleSize=1;options.inPreferredConfig=Bitmap.Config.ARGB_8888;
      final Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);CameraProofFrame.require(bitmap!=null,"CAMERA_DECODE_FAILED");
      return new CameraProofFrame.Decoded(){public int width(){return bitmap.getWidth();}public int height(){return bitmap.getHeight();}public boolean argb8888(){return bitmap.getConfig()==Bitmap.Config.ARGB_8888;}public long allocationBytes(){return bitmap.getAllocationByteCount();}public int pixel(int x,int y){return bitmap.getPixel(x,y);}public void close(){bitmap.recycle();}};
    },()->{CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");store.write(t.id,"raw.jpg",capture.bytes);});
    int[] box=prepared.box;byte[] tensor=prepared.tensor;
    r.observations.put("roiRgbSha256",prepared.roiRgbSha256);r.observations.put("tensorSha256",CameraProofFrame.hash(tensor));
    CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");
    // Preview is the exact224x224 ROI/letterbox tensor, avoiding another full-sized crop.
    FloatBuffer f=ByteBuffer.wrap(tensor).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer();int[] colors=new int[224*224];for(int i=0;i<colors.length;i++){int red=Math.round(f.get()*255),green=Math.round(f.get()*255),blue=Math.round(f.get()*255);colors[i]=0xff000000|(red<<16)|(green<<8)|blue;}
    Bitmap preview=Bitmap.createBitmap(colors,224,224,Bitmap.Config.ARGB_8888);byte[] png;
    try(ByteArrayOutputStream out=new ByteArrayOutputStream()){CameraProofFrame.require(preview.compress(Bitmap.CompressFormat.PNG,100,out),"CAMERA_PREVIEW_ENCODE");png=out.toByteArray();CameraProofFrame.require(png.length<=CameraProofStore.PREVIEW,"CAMERA_PREVIEW_CAP");}finally{preview.recycle();}
    store.write(t.id,"preview.png",png);CameraProofFrame.require(gate.mayPublish(t)&&context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED,"CAMERA_PERMISSION_OR_CANCEL");
    long inferenceStart=System.nanoTime();CameraProofFrame.Vector vector=CameraProofFrame.vector(model.run(tensor));double inferenceMs=(System.nanoTime()-inferenceStart)/1e6;
    CameraProofFrame.require(gate.mayPublish(t)&&context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED,"CAMERA_PERMISSION_OR_CANCEL");
    Map<String,Object> receipt=new LinkedHashMap<>();receipt.put("schemaVersion",this.orientation?2:1);receipt.put("kind","CAMERA_PROOF_NUMERICAL");receipt.put("jobId",t.id);receipt.put("sourceSha256",source);receipt.put("recipe",recipe);receipt.put("modelSha256",CameraProofFrame.MODEL);receipt.put("jpegSha256",CameraProofFrame.hash(capture.bytes));receipt.put("jpegBytes",capture.bytes.length);receipt.put("width",w);receipt.put("height",h);receipt.put("orientation",orientation);receipt.put("requestedSize",r.width+"x"+r.height);receipt.put("layout",r.layout);receipt.put("contentMode",r.mode);receipt.put("previewWidth",r.pw);receipt.put("previewHeight",r.ph);receipt.put("effectiveBox",integers(box));receipt.put("geometryStatus","INCONCLUSIVE");receipt.put("physicalFovProven",false);receipt.put("sensorExposureTimeKnown",false);receipt.put("tensorSha256",CameraProofFrame.hash(tensor));receipt.put("previewSha256",CameraProofFrame.hash(png));receipt.put("rawVector",vector.raw);receipt.put("normalizedVector",vector.normalized);receipt.put("rawVectorSha256",vector.rawSha256);receipt.put("normalizedVectorSha256",vector.normalizedSha256);receipt.put("rawNormSquared",vector.normSquared);receipt.put("sdkObservedCacheBytes",capture.observedSdkBytes);receipt.put("sdkPeakKnown",false);receipt.put("sdkHardCap",false);receipt.put("runtime","FROM_APPLICATION_ONLY");receipt.put("threads",1);receipt.put("xnnpack",false);receipt.put("nnapi",false);receipt.put("gpu",false);receipt.put("inferenceMs",inferenceMs);receipt.put("requestToReceiptMs",(System.nanoTime()-t.startedNanos)/1e6);receipt.put("autoAccept",false);receipt.put("cameraProofAccepted",false);
    receipt.put("recipeSha256",this.orientation?CameraOrientationGeometry.RECIPE_SHA256:CameraProofFrame.RECIPE_SHA256);receipt.put("roiRgbSha256",prepared.roiRgbSha256);receipt.put("roiRgbBytes",(box[2]-box[0])*(long)(box[3]-box[1])*3);receipt.put("roiFormat","upright-half-open-row-major-rgb-u8-v1");
    if(geometry!=null){receipt.put("nativeGeometry",geometry);receipt.put("nativeGeometrySha256",CameraProofFrame.hash(CameraMatrixPlan.bytes(CameraMatrixPlan.json(geometry))));receipt.put("orientationContract","native-same-frame-v2");}
    if(r.matrix!=null)receipt.putAll(r.matrix);
    byte[] numerical=new JSONObject(receipt).toString().getBytes(StandardCharsets.UTF_8);
    CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");store.write(t.id,"numerical.json",numerical);
    CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");store.write(t.id,"receipt.json",numerical);
    CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");store.finish(t.id);
    CameraProofFrame.require(gate.mayPublish(t),"CAMERA_CANCELLED");
    // This is a sealed candidate. The wrapper finalizer must resolve publication
    // before returning it; readNumerical deliberately refuses at this point.
    Map<String,Object> result=new LinkedHashMap<>();result.put("receiptJson",new String(numerical,StandardCharsets.UTF_8));result.put("previewUri",android.net.Uri.fromFile(store.preview(t.id)).toString());return result;
  }
  public String numerical(String id)throws IOException{CameraProofFrame.require(!id.equals(gate.activeId()),"CAMERA_DRAIN_UNKNOWN");return new String(store.readNumerical(id),StandardCharsets.UTF_8);}
}

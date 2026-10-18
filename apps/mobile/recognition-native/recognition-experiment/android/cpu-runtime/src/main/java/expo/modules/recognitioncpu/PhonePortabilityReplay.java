package expo.modules.recognitioncpu;
import android.content.Context;
import android.graphics.*;
import android.media.ExifInterface;
import java.io.*;
import java.nio.*;
import java.util.*;
import java.util.function.*;
import java.util.zip.*;
import org.json.JSONObject;
import org.tensorflow.lite.*;

/** Fixed imported/private two-lane lab replay. No caller image path, camera or query-label inference. */
public final class PhonePortabilityReplay {
  private static void check(boolean b,String why){PhonePortabilityJson.require(b,why);}
  private static ByteBuffer direct(byte[] b){ByteBuffer v=ByteBuffer.allocateDirect(b.length).order(ByteOrder.LITTLE_ENDIAN);v.put(b);((Buffer)v).rewind();return v;}
  private static byte[] model(Context c)throws Exception {ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=c.getAssets().open("recognition-experiment/mobilenet_v3_small.tflite")){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){check(out.size()+n<=4117670,"MODEL_SIZE");out.write(b,0,n);}}byte[] bytes=out.toByteArray();check(bytes.length==4117670&&GeneratedEvidenceStore.hash(bytes).equals("bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40"),"MODEL_HASH");return bytes;}
  private static byte[] phoneTensor(PhonePortabilityPacket packet,Map<String,Object> frame)throws Exception {
    byte[] jpeg=packet.zip.read(PhonePortabilityPacket.str(frame,"jpegPath"),6*1024*1024,PhonePortabilityPacket.str(frame,"jpegSha256"));int o=PhonePortabilityPacket.num(frame,"orientation",8),uw=PhonePortabilityPacket.num(frame,"width",50000),uh=PhonePortabilityPacket.num(frame,"height",50000),w=o>=5?uh:uw,h=o>=5?uw:uh;
    try(ByteArrayInputStream in=new ByteArrayInputStream(jpeg)){check(new ExifInterface(in).getAttributeInt(ExifInterface.TAG_ORIENTATION,-1)==o,"EXIF_PIN");}
    BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;bounds.inScaled=false;BitmapFactory.decodeByteArray(jpeg,0,jpeg.length,bounds);check(bounds.outWidth==w&&bounds.outHeight==h&&"image/jpeg".equals(bounds.outMimeType)&&(long)w*h<=12484800,"FULL_RESOLUTION_BOUNDS");
    BitmapFactory.Options options=new BitmapFactory.Options();options.inScaled=false;options.inSampleSize=1;options.inPreferredConfig=Bitmap.Config.ARGB_8888;Bitmap bitmap=BitmapFactory.decodeByteArray(jpeg,0,jpeg.length,options);check(bitmap!=null,"JPEG_DECODE");
    try {check(bitmap.getWidth()==w&&bitmap.getHeight()==h&&bitmap.getConfig()==Bitmap.Config.ARGB_8888&&(long)bitmap.getAllocationByteCount()<=(long)w*h*8,"BITMAP_ALLOCATION");List<Object> raw=PhonePortabilityJson.array(frame.get("effectiveBox"));int[] box=new int[4];for(int i=0;i<4;i++)box[i]=PhonePortabilityJson.integer(raw.get(i),50000);return PhonePortabilityImage.tensor(w,h,o,box,bitmap::getPixel);}finally{bitmap.recycle();}
  }
  private static void entry(ZipOutputStream zip,String name,byte[] bytes,List<Map<String,Object>> ledger,long[] total)throws Exception {total[0]+=bytes.length;check(total[0]<=48L*1024*1024&&ledger.size()<161,"NUMERICAL_RESULT_BOUND");CRC32 crc=new CRC32();crc.update(bytes);ZipEntry e=new ZipEntry(name);e.setMethod(ZipEntry.STORED);e.setSize(bytes.length);e.setCompressedSize(bytes.length);e.setCrc(crc.getValue());zip.putNextEntry(e);zip.write(bytes);zip.closeEntry();Map<String,Object> m=new LinkedHashMap<>();m.put("path",name);m.put("bytes",bytes.length);m.put("sha256",GeneratedEvidenceStore.hash(bytes));ledger.add(m);}
  public static Map<String,Object> run(Context context,PhonePortabilityStore store,IntConsumer progress,BooleanSupplier cancelled)throws Exception {
    PhonePortabilityPacket packet=store.packet();long start=System.nanoTime();List<Map<String,Object>> records=new ArrayList<>(),ledger=new ArrayList<>(),lanes=new ArrayList<>();long[] total={0};int attempted=0,finished=0;FileOutputStream file=store.beginResult();boolean committed=false;
    try {
      OutputStream nonClosing=new FilterOutputStream(file){public void close()throws IOException{flush();}};
      try(ZipOutputStream zip=new ZipOutputStream(nonClosing)) {
        Interpreter.Options options=new Interpreter.Options();options.setRuntime(InterpreterApi.Options.TfLiteRuntime.FROM_APPLICATION_ONLY);options.setNumThreads(1);options.setUseXNNPACK(false);
        try(Interpreter interpreter=new Interpreter(direct(model(context)),options)) {
          check(interpreter.getInputTensorCount()==1&&interpreter.getOutputTensorCount()==1,"TENSOR_COUNT");Tensor in=interpreter.getInputTensor(0),out=interpreter.getOutputTensor(0);
          check(Arrays.equals(in.shape(),new int[]{1,224,224,3})&&Arrays.equals(out.shape(),new int[]{1,1024})&&in.dataType()==DataType.FLOAT32&&out.dataType()==DataType.FLOAT32&&in.numBytes()==602112&&out.numBytes()==4096&&in.name().equals("serving_default_inputs:0")&&out.name().equals("StatefulPartitionedCall:0"),"PINNED_SIGNATURE");
          for(String lane:new String[]{"control","phone"}) {
            Map<String,double[]> vectors=new LinkedHashMap<>();List<Map<String,Object>> references=new ArrayList<>();List<String> failedRefs=new ArrayList<>();
            for(Map<String,Object> frame:packet.frames) {
              String id=PhonePortabilityPacket.str(frame,"id");Map<String,Object> row=new LinkedHashMap<>();row.put("id",id);row.put("lane",lane);long begun=System.nanoTime();String failure=null;byte[] savedTensor=null,savedVector=null;
              if(cancelled.getAsBoolean()||(System.nanoTime()-start)/1e9>=1500)failure="NOT_RUN";
              else try {
                byte[] tensor=lane.equals("control")?packet.zip.read(PhonePortabilityPacket.str(frame,"tensorPath"),602112,PhonePortabilityPacket.str(frame,"tensorSha256")):phoneTensor(packet,frame);
                check(tensor.length==602112,"REPLAY_TENSOR_SIZE");ByteBuffer output=ByteBuffer.allocateDirect(4096).order(ByteOrder.LITTLE_ENDIAN);long beforeInfer=System.nanoTime();check(attempted<80&&!cancelled.getAsBoolean(),"INFERENCE_CEILING_OR_CANCEL");attempted++;interpreter.run(direct(tensor),output);double inferenceMs=(System.nanoTime()-beforeInfer)/1e6;((Buffer)output).rewind();double[] vector=new double[1024];ByteBuffer binary=ByteBuffer.allocate(4096).order(ByteOrder.LITTLE_ENDIAN);for(int i=0;i<1024;i++){float value=output.getFloat();vector[i]=value;binary.putFloat(value);}PhonePortabilityRank.unit(vector);
                savedTensor=tensor;savedVector=binary.array();row.put("tensorSha256",GeneratedEvidenceStore.hash(tensor));row.put("vectorSha256",GeneratedEvidenceStore.hash(binary.array()));row.put("inferenceMs",inferenceMs);
                if((System.nanoTime()-begun)/1e6>60000)failure="TIMEOUT";else {vectors.put(id,vector);row.put("kind","vector");if(lane.equals("control"))row.put("runtimeParity",PhonePortabilityRank.parity(packet.baseline.get(id),vector));}
              }catch(Exception error){failure=cancelled.getAsBoolean()?"CANCELLED":"FRAME_FAILED";}
              if(savedTensor!=null){entry(zip,lane+"/"+id+".tensor.f32le",savedTensor,ledger,total);entry(zip,lane+"/"+id+".vector.f32le",savedVector,ledger,total);}
              if(failure!=null){row.put("kind","failure");row.put("code",failure);}row.put("totalMs",(System.nanoTime()-begun)/1e6);records.add(row);
              if(PhonePortabilityPacket.str(frame,"role").equals("reference")){references.add(frame);if(!vectors.containsKey(id))failedRefs.add(id);}progress.accept(++finished);
            }
            List<Map<String,Object>> queries=new ArrayList<>();int first=0,top3=0;
            List<Map<String,Object>> ordered=new ArrayList<>(packet.frames);ordered.sort(Comparator.comparing(f->PhonePortabilityPacket.str(f,"id")));
            for(Map<String,Object> frame:ordered)if(PhonePortabilityPacket.str(frame,"role").equals("query")) {
              String id=PhonePortabilityPacket.str(frame,"id");Map<String,Object> q=new LinkedHashMap<>();q.put("id",id);List<Map<String,Object>> candidates=failedRefs.isEmpty()&&vectors.containsKey(id)?PhonePortabilityRank.rank(vectors.get(id),references,vectors):Collections.emptyList();
              q.put("candidates",candidates);q.put("failure",!failedRefs.isEmpty()?"INCOMPLETE_GALLERY":!vectors.containsKey(id)?"QUERY_FAILED":null);
              // Truth first appears AFTER candidate calculation, only in reporting.
              String truth=PhonePortabilityPacket.str(frame,"productId");int position=0;for(int i=0;i<candidates.size();i++)if(candidates.get(i).get("productId").equals(truth))position=i+1;q.put("truth",truth);q.put("correctRank",position==0?null:position);if(position==1)first++;if(position>0&&position<=3)top3++;queries.add(q);
            }
            Map<String,Object> summary=new LinkedHashMap<>();summary.put("lane",lane);summary.put("denominator",20);summary.put("first",first);summary.put("firstThree",top3);summary.put("failedReferences",failedRefs);summary.put("queries",queries);summary.put("complete",failedRefs.isEmpty()&&vectors.size()==40);lanes.add(summary);
          }
        }
        Map<String,Object> receipt=new LinkedHashMap<>();receipt.put("schemaVersion",1);receipt.put("kind","PRIVATE_PHONE_PORTABILITY_RESULTS");receipt.put("manifestSha256",PhonePortabilityPins.MANIFEST_SHA);receipt.put("packetSha256",packet.packetSha256);receipt.put("replaySourceSha256",PhonePortabilitySource.SHA256);receipt.put("modelSha256","bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40");receipt.put("runtime","FROM_APPLICATION_ONLY");receipt.put("threads",1);receipt.put("xnnpack",false);receipt.put("nnapi",false);receipt.put("gpu",false);receipt.put("attemptedInferences",attempted);receipt.put("records",records);receipt.put("lanes",lanes);receipt.put("files",ledger);receipt.put("totalMs",(System.nanoTime()-start)/1e6);entry(zip,"receipt.json",new JSONObject(receipt).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8),ledger,total);
      }
      Map<String,Object> summary=new LinkedHashMap<>();summary.put("records",80);summary.put("attemptedInferences",attempted);summary.put("lanes",lanes);summary.put("complete",lanes.stream().allMatch(s->Boolean.TRUE.equals(s.get("complete"))));summary.put("totalMs",(System.nanoTime()-start)/1e6);Map<String,Object> saved=store.finishResult(file,summary);committed=true;return saved;
    }finally{if(!committed)store.abortResult(file);}
  }
}

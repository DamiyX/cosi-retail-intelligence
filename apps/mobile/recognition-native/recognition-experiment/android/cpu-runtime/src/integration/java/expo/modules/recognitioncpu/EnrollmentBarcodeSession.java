package expo.modules.recognitioncpu;

import java.nio.ByteBuffer;
import java.util.concurrent.Executor;
import java.util.function.LongSupplier;

/** Owns one copied frame, real synchronous decode/reset, then terminal callback. Never cancels a worker. */
public final class EnrollmentBarcodeSession {
 public static final int MAX_PIXELS=1280*720,MAX_FRAMES=60;
 public static final class Pixels {
  public final int width,height;public final byte[] bytes;
  public Pixels(int w,int h,byte[] b){ObservedEnrollment.require(w>0&&h>0&&(long)w*h<=MAX_PIXELS&&b!=null&&b.length==(long)w*h,"BARCODE_PIXELS");width=w;height=h;bytes=b;}
 }
 public interface Frame {Pixels copy()throws Exception;void close();}
 public interface Decoder {Hit decode(Pixels pixels)throws Exception;void reset();}
 public interface Worker {void execute(Runnable decodeAndCleanup,Runnable returned);}
 public static Worker on(Executor executor){return (work,returned)->executor.execute(()->{work.run();returned.run();});}
 public static final class Hit {
  public final String raw,format,key;
  public Hit(String raw,String format){this.raw=raw;this.format=format;key=ObservedEnrollment.barcodeKey(raw,format);}
 }
 public interface Sink {boolean valid();void status(String status);void candidate(Hit hit)throws Exception;void drained();void uncertain();}
 private final Worker worker;private final Executor terminal;private final Decoder decoder;private final Sink sink;private final LongSupplier clock;
 private boolean accepting=true,busy,poisoned,notified;private int frames,repeats;private long first,started=-1;private String previous="";
 public EnrollmentBarcodeSession(Worker worker,Executor terminal,Decoder decoder,Sink sink,LongSupplier clock){this.worker=worker;this.terminal=terminal;this.decoder=decoder;this.sink=sink;this.clock=clock;}
 /** Called by the analyzer; rejected images are closed, never handed to another generation. */
 public void offer(Frame image){
  synchronized(this){if(!accepting||busy||poisoned){closeRejected(image);return;}busy=true;if(started<0)started=clock.getAsLong();frames++;}
  Pixels pixels=null;Exception failure=null;
  try{if(sink.valid())pixels=image.copy();else failure=new IllegalStateException("BARCODE_STALE");}catch(Exception e){failure=e;}
  finally{try{image.close();}catch(RuntimeException e){poison();failure=e;}}
  final Pixels owned=pixels;final Exception copyFailure=failure;
  final Hit[] result=new Hit[1];final Exception[] problem=new Exception[1];
  try{worker.execute(()->{
   Hit hit=null;Exception error=copyFailure;
   try{if(error==null&&live())hit=decoder.decode(owned);}catch(Exception e){error=e;}
   finally{try{decoder.reset();}catch(RuntimeException e){poison();error=e;}}
   result[0]=hit;problem[0]=error;
  },()->{try{terminal.execute(()->finish(result[0],problem[0]));}catch(RuntimeException e){poison();/* busy deliberately retained */}});}catch(RuntimeException rejected){ // no decode was submitted, image is already closed
   try{terminal.execute(()->finish(null,rejected));}catch(RuntimeException e){poison();}
  }
 }
 private boolean live(){synchronized(this){return accepting&&!poisoned;} }
 private void poison(){synchronized(this){poisoned=true;accepting=false;}sink.uncertain();}
 private void closeRejected(Frame image){try{image.close();}catch(RuntimeException e){poison();}}
 private void finish(Hit hit,Exception error){
  try{
   if(live()&&sink.valid()){
    long now=clock.getAsLong();
    if(now-started>15000||frames>=MAX_FRAMES){synchronized(this){accepting=false;}sink.status("Scan limit reached. Choose unreadable or explicitly rearm.");}
    else if(error!=null){previous="";repeats=0;sink.status("Code unreadable; no code was acquired.");}
    else if(hit==null){previous="";repeats=0;sink.status("No supported code seen.");}
    else {
     if(!previous.equals(hit.key)||now-first>3000){previous=hit.key;first=now;repeats=1;}else repeats++;
     if(repeats>=3){synchronized(this){accepting=false;}if(sink.valid())sink.candidate(hit);}
     else sink.status("Hold the supported code steady ("+repeats+"/3).");
    }
   }
  }catch(Exception e){poison();}
  finally{synchronized(this){busy=false;}notifyDrain();}
 }
 public void stop(){synchronized(this){accepting=false;}notifyDrain();}
 private void notifyDrain(){synchronized(this){if(accepting||busy||poisoned||notified)return;notified=true;}try{sink.drained();}catch(RuntimeException e){poison();}}
 public synchronized boolean drained(){return !accepting&&!busy&&!poisoned&&notified;}
 public synchronized boolean poisoned(){return poisoned;}
 /** Copy the Y plane only; no Image/plane/ByteBuffer escapes. Crop/stride checked before allocation. */
 public static Pixels copyY(ByteBuffer source,int imageWidth,int imageHeight,int rowStride,int pixelStride,int left,int top,int width,int height,int rotation){
  ObservedEnrollment.require(source!=null&&imageWidth>0&&imageHeight>0&&left>=0&&top>=0&&width>0&&height>0&&width<=imageWidth&&height<=imageHeight&&left<=imageWidth-width&&top<=imageHeight-height&&(long)width*height<=MAX_PIXELS&&rowStride>0&&pixelStride>0&&(rotation==0||rotation==90||rotation==180||rotation==270),"BARCODE_LUMA_BOUNDS");
  ByteBuffer b=source.duplicate();int offset=b.position();long last=(long)offset+(long)(top+height-1)*rowStride+(long)(left+width-1)*pixelStride;ObservedEnrollment.require(last<b.limit(),"BARCODE_LUMA_STRIDE");
  int ow=rotation%180==0?width:height,oh=rotation%180==0?height:width;byte[] out=new byte[ow*oh];
  for(int y=0;y<height;y++)for(int x=0;x<width;x++){int ox=rotation==0?x:rotation==90?height-1-y:rotation==180?width-1-x:y,oy=rotation==0?y:rotation==90?x:rotation==180?height-1-y:width-1-x;out[oy*ow+ox]=b.get(offset+(top+y)*rowStride+(left+x)*pixelStride);}
  return new Pixels(ow,oh,out);
 }
}

package expo.modules.recognitioncpu;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

/** Executable host controls; no claim of Android decoder or picker execution. */
public final class GeneratedImageChecks {
  private static int assertions=0;
  private static void ok(boolean b,String why){assertions++;if(!b)throw new AssertionError(why);}
  private static void rejects(Runnable r){boolean failed=false;try{r.run();}catch(IllegalArgumentException e){failed=true;}ok(failed,"expected boundary rejection");}
  private static byte[] rgb(int... labels){byte[] b=new byte[labels.length*3];for(int i=0;i<labels.length;i++){b[i*3]=(byte)labels[i];b[i*3+1]=(byte)(labels[i]+20);b[i*3+2]=(byte)(labels[i]+40);}return b;}
  public static void main(String[] args) throws Exception {
    if(args.length>0 && args[0].equals("case")) {
      byte[] input=Files.readAllBytes(Path.of(args[1]));int w=Integer.parseInt(args[2]),h=Integer.parseInt(args[3]),o=Integer.parseInt(args[4]);
      int[] box=new int[4];for(int i=0;i<4;i++)box[i]=Integer.parseInt(args[5+i]);Path out=Path.of(args[9]);Files.createDirectories(out);
      byte[] upright=GeneratedImageGeometry.orient(input,w,h,o);int uw=o>=5?h:w,uh=o>=5?w:h;
      byte[] crop=GeneratedImageGeometry.crop(upright,uw,uh,box),pad=GeneratedImageGeometry.resizeAndPad(crop,box[2]-box[0],box[3]-box[1]);
      Files.write(out.resolve("upright.rgb"),upright);Files.write(out.resolve("crop.rgb"),crop);Files.write(out.resolve("letterbox.rgb"),pad);Files.write(out.resolve("tensor.f32le"),GeneratedImageGeometry.tensor(pad));
      System.out.println(Arrays.toString(GeneratedImageGeometry.letterbox(box[2]-box[0],box[3]-box[1])));return;
    }
    if(args.length>0 && args[0].equals("guide")) {
      System.out.println(Arrays.toString(GeneratedImageGeometry.mapGuide(Integer.parseInt(args[1]),Integer.parseInt(args[2]),Integer.parseInt(args[3]),Integer.parseInt(args[4]),Integer.parseInt(args[5]),Boolean.parseBoolean(args[6]))));return;
    }
    byte[] image=rgb(1,2,3,4,5,6);
    int[][] expected={{1,2,3,4,5,6},{3,2,1,6,5,4},{6,5,4,3,2,1},{4,5,6,1,2,3},{1,4,2,5,3,6},{4,1,5,2,6,3},{6,3,5,2,4,1},{3,6,2,5,1,4}};
    for(int o=1;o<=8;o++)ok(Arrays.equals(GeneratedImageGeometry.orient(image,3,2,o),rgb(expected[o-1])),"EXIF "+o);
    ok(Arrays.equals(GeneratedImageGeometry.crop(image,3,2,new int[]{1,0,3,2}),rgb(2,3,5,6)),"half open crop/no extra pad");
    ok(Arrays.equals(GeneratedImageGeometry.crop(image,3,2,new int[]{0,0,3,2}),image),"boundary crop");
    ok(Arrays.equals(GeneratedImageGeometry.letterbox(3,2),new int[]{224,149,0,37,0,38}),"odd extra bottom");
    ok(Arrays.equals(GeneratedImageGeometry.letterbox(2,3),new int[]{149,224,37,0,38,0}),"odd extra right");
    byte[] pad=GeneratedImageGeometry.resizeAndPad(new byte[]{(byte)255,0,0,0,0,(byte)255},2,1);
    int middle=(56*224+112)*3;ok((pad[middle]&255)==126 && pad[middle+1]==0 && (pad[middle+2]&255)==129,"center bilinear RGB rounding");
    ok((pad[(56*224)*3]&255)==255 && (pad[(56*224+223)*3+2]&255)==255,"edge clamp");
    ok((pad[0]&255)==128,"gray pad");
    byte[] stripes=new byte[448*3];for(int x=0;x<448;x++)Arrays.fill(stripes,x*3,x*3+3,(byte)(x%2*255));
    byte[] down=GeneratedImageGeometry.resizeAndPad(stripes,448,1);ok((down[(111*224+100)*3]&255)==128,"downsampling centers half rounding");
    byte[] all=new byte[224*224*3];for(int i=0;i<all.length;i++)all[i]=(byte)(i%256);
    ByteBuffer floats=ByteBuffer.wrap(GeneratedImageGeometry.tensor(all)).order(ByteOrder.LITTLE_ENDIAN);
    for(int i=0;i<256;i++)ok(Float.floatToIntBits(floats.getFloat())==Float.floatToIntBits(i/255.0f),"float32 divide255 "+i);
    for(int o:new int[]{0,9})rejects(()->GeneratedImageGeometry.orient(image,3,2,o));
    rejects(()->GeneratedImageGeometry.orient(new byte[17],3,2,1));
    rejects(()->GeneratedImageGeometry.crop(image,3,2,new int[]{-1,0,2,1}));rejects(()->GeneratedImageGeometry.crop(image,3,2,new int[]{0,0,4,2}));
    rejects(()->GeneratedImageGeometry.crop(image,3,2,new int[]{2,0,2,2}));rejects(()->GeneratedImageGeometry.letterbox(0,2));rejects(()->GeneratedImageGeometry.letterbox(513,2));
    rejects(()->GeneratedImageGeometry.tensor(new byte[3]));rejects(()->GeneratedImageGeometry.mapGuide(37,23,100,100,45,false));
    java.util.concurrent.atomic.AtomicInteger ids=new java.util.concurrent.atomic.AtomicInteger(40000); GeneratedExportState state=new GeneratedExportState(ids::getAndIncrement);String hash="a".repeat(64);
    ok(GeneratedExportState.localDocument("content","com.android.providers.downloads.documents","msf:123"),"local Downloads provider");
    ok(GeneratedExportState.localDocument("content","com.android.externalstorage.documents","primary:Download/generated.zip"),"local primary Downloads directory");
    ok(!GeneratedExportState.localDocument("content","com.google.android.apps.docs.storage","generated.zip"),"cloud provider rejected");
    ok(!GeneratedExportState.localDocument("file","com.android.providers.downloads.documents","msf:123"),"file URI rejected");
    ok(!GeneratedExportState.localDocument("content","com.android.externalstorage.documents","primary:Pictures/generated.zip"),"other directory rejected");
    ok(!GeneratedExportState.localDocument("content","com.android.externalstorage.documents","primary:Download/../Pictures/generated.zip"),"traversal rejected");
    ok(!GeneratedExportState.localDocument("content","com.android.providers.downloads.documents",null),"malformed document ID rejected");
    rejects(()->state.begin(0,hash));rejects(()->state.begin(1,"not a hash"));rejects(()->state.begin(GeneratedExportState.MAX_BYTES+1,hash));
    GeneratedExportState.Ticket t=state.begin(1,hash);rejects(()->state.begin(1,hash));
    ok(state.start(t),"start only pending");ok(!state.start(t),"duplicate callback refused");
    ok(state.cancel()==t && t.cancelled && t.writing,"cancel during write records drain");ok(t.settle()&&!t.settle(),"single promise settlement");
    GeneratedExportState.Ticket newer=state.begin(1,hash);ok(newer.requestCode!=t.requestCode,"no stale request-code reuse");
    state.finish(t);ok(!state.start(t)&&state.start(newer),"stale ticket cannot start or clear new ticket");state.finish(newer);
    GeneratedExportState.Ticket waiting=state.begin(1,hash);state.cancel();ok(waiting.cancelled&&!waiting.writing&&!state.start(waiting),"picker cancel before write");
    System.out.println("Generated Java behavioral assertions PASS "+assertions);
  }
}

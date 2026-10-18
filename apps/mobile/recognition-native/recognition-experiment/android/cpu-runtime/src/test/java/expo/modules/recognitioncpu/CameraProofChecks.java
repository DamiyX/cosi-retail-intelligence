package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Actual pure production seams + generated host filesystem. No Android decoder/model/phone. */
public final class CameraProofChecks {
  private static int checks;
  private static void check(boolean b,String m){checks++;if(!b)throw new AssertionError(m);}
  private interface Work {void run()throws Exception;}
  private static void refuses(String m,Work work)throws Exception{try{work.run();throw new AssertionError("missing refusal:"+m);}catch(IllegalArgumentException|IllegalStateException|IOException e){checks++;}}
  static byte[] jpeg(int w,int h,int orientation){
    ByteArrayOutputStream b=new ByteArrayOutputStream();int[] head={255,216,255,225,0,34,'E','x','i','f',0,0,'I','I',42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0,255,192,0,17,8,h>>>8,h&255,w>>>8,w&255,3,1,17,0,2,17,0,3,17,0,255,218,0,2,0,255,217};
    for(int n:head)b.write(n);return b.toByteArray();
  }
  static class HostIO implements CameraProofStore.IO {
    String fault="";long available=Long.MAX_VALUE;
    private void regular(File f)throws IOException{if(!f.getCanonicalFile().equals(f.getAbsoluteFile())||Files.isSymbolicLink(f.toPath())||(f.exists()&&!f.isFile()))throw new IOException("host alias/type");}
    public void root(File f,boolean create)throws IOException{if(!f.getCanonicalFile().equals(f.getAbsoluteFile())||Files.isSymbolicLink(f.toPath()))throw new IOException("host root alias");if(!f.exists()&&create&&!f.mkdir())throw new IOException("mkdir");if(!f.isDirectory())throw new IOException("root");}
    public List<String> list(File f){return Arrays.asList(Objects.requireNonNull(f.list()));}
    public long size(File f)throws IOException{regular(f);return f.exists()?f.length():-1;}
    public byte[] read(File f,int cap)throws IOException{regular(f);if(!f.exists()||f.length()>cap)throw new IOException("read bound");return Files.readAllBytes(f.toPath());}
    public void writeNew(File f,byte[] b)throws IOException{
      regular(f);try(OutputStream o=Files.newOutputStream(f.toPath(),StandardOpenOption.CREATE_NEW)){if(fault.equals("partial")){o.write(b,0,Math.max(1,b.length/2));throw new IOException("injected partial write");}o.write(b);}
      if(fault.equals("afterWrite"))throw new IOException("injected after write");
    }
    public void publish(File a,File b)throws IOException{regular(a);regular(b);if(fault.equals("rename"))throw new IOException("injected publish");if(b.exists())throw new IOException("exists");Files.move(a.toPath(),b.toPath(),StandardCopyOption.ATOMIC_MOVE);if(fault.equals("afterPublish"))throw new IOException("injected after publish");}
    public void writeAt(File f,int at,byte[] b)throws IOException{regular(f);if(at<0||at+(long)b.length>f.length())throw new IOException("grow");try(RandomAccessFile out=new RandomAccessFile(f,"rw")){out.seek(at);out.write(b);}}
    public long available(File f){return available;}
  }
  private static final String SOURCE="a".repeat(64),PROCESS="11111111-1111-1111-1111-111111111111",NEXT="22222222-2222-2222-2222-222222222222";
  private static CameraProofStore store(File root,HostIO io)throws IOException{return new CameraProofStore(root,io,SOURCE,PROCESS);}
  private static void frame()throws Exception{
    int[] decode={0},copied={0},closed={0};
    int[][] expectedPixels={{1,2,3,4,5,6},{3,2,1,6,5,4},{6,5,4,3,2,1},{4,5,6,1,2,3},{1,4,2,5,3,6},{4,1,5,2,6,3},{6,3,5,2,4,1},{3,6,2,5,1,4}};
    for(int o=1;o<=8;o++){
      byte[] b=jpeg(3,2,o);CameraProofFrame.Header h=CameraProofFrame.admit(b,3,2,o);check(h.orientation==o,"EXIF");
      CameraProofFrame.Prepared p=CameraProofFrame.prepare(b,3,2,o,300,300,"FILL","A",data->{decode[0]++;return new CameraProofFrame.Decoded(){public int width(){return 3;}public int height(){return 2;}public long allocationBytes(){return 24;}public boolean argb8888(){return true;}public int pixel(int x,int y){return 0xff000000|((x+1)*50<<16)|((y+1)*70<<8)|99;}public void close(){closed[0]++;}};},()->copied[0]++);
      check(p.tensor.length==602112,"tensor size");check(Arrays.equals(p.tensor,PhonePortabilityImage.tensor(3,2,o,p.box,(x,y)->0xff000000|((x+1)*50<<16)|((y+1)*70<<8)|99)),"pinned sampled math");
      byte[] upright=new byte[18];for(int i=0;i<6;i++){int raw=expectedPixels[o-1][i]-1;upright[i*3]=(byte)((raw%3+1)*50);upright[i*3+1]=(byte)((raw/3+1)*70);upright[i*3+2]=99;}
      check(p.roiRgbSha256.equals(CameraProofFrame.hash(upright)),"independent upright ROI hash EXIF"+o);
      check(Arrays.equals(p.tensor,GeneratedImageGeometry.tensor(GeneratedImageGeometry.resizeAndPad(upright,o>=5?2:3,o>=5?3:2))),"independent asymmetric oriented raster EXIF"+o);
    }
    check(decode[0]==8&&copied[0]==8&&closed[0]==8,"one decode/close per admitted input");
    for(byte[] b:new byte[][]{new byte[0],jpeg(2001,2000,1),Arrays.copyOf(jpeg(3,2,1),20),jpeg(3,2,0),jpeg(3,2,9)}){
      int prior=decode[0];refuses("admission before decode/copy",()->CameraProofFrame.prepare(b,3,2,1,300,300,"FILL","A",data->{decode[0]++;return null;},()->copied[0]++));check(decode[0]==prior&&copied[0]==8,"decode/copy not reached");
    }
    check(CameraProofFrame.header(jpeg(2000,2000,1)).width==2000,"exact4MP");
    int[] oversized={0,0};refuses("oversized header observations survive admission refusal",()->CameraProofFrame.header(jpeg(2001,2000,1),h->{oversized[0]=h.width;oversized[1]=h.height;}));check(Arrays.equals(oversized,new int[]{2001,2000}),"observed oversized pixels retained without reconstructing SDK dimensions");
    refuses("64-bit pixel multiplication",()->CameraProofFrame.header(jpeg(65535,65535,1)));
    CameraProofFrame.inputSize(CameraProofFrame.JPEG_LIMIT);refuses("opened file one byte over",()->CameraProofFrame.inputSize(CameraProofFrame.JPEG_LIMIT+1L));refuses("empty SDK output",()->CameraProofFrame.inputSize(0));
    byte[] cap=new byte[CameraProofFrame.JPEG_LIMIT];byte[] small=jpeg(3,2,1);System.arraycopy(small,0,cap,0,small.length-2);cap[cap.length-2]=(byte)255;cap[cap.length-1]=(byte)217;check(CameraProofFrame.header(cap).width==3,"exact12MiB");
    refuses("one byte over",()->CameraProofFrame.header(Arrays.copyOf(cap,cap.length+1)));
    refuses("unknown returned width",()->CameraProofFrame.admit(small,-1,2,1));refuses("metadata mismatch",()->CameraProofFrame.admit(small,2,3,1));
    check(Arrays.equals(CameraProofFrame.roi(100,100,1,100,100,"FILL","A"),new int[]{6,6,94,94}),"80guide +5%once");
    check(Arrays.equals(CameraProofFrame.roi(100,200,6,100,100,"FILL","A"),new int[]{56,6,144,94}),"orientation90 candidate");
    // 0/180: unpadded x32.725..68.275; pad1.7775 once => floor30/ceil71.
    for(int o:new int[]{1,6,3,8})check(Arrays.equals(CameraProofFrame.roi(101,79,o,90,160,"FILL","A"),o>=5?new int[]{14,6,65,95}:new int[]{30,4,71,75}),"rotation0/90/180/270 rounding oracle");
    check(Arrays.equals(CameraProofFrame.roi(100,200,1,100,200,"FIT","B"),new int[]{6,12,94,188}),"FIT actual content, no bars");
    refuses("guide in FIT bars",()->CameraProofFrame.roi(100,200,1,200,100,"FIT","B"));
    refuses("unsupported mode",()->CameraProofFrame.roi(100,100,1,100,100,"STRETCH","A"));
    String root="/data/user/0/app/cache/Camera",leaf="12345678-1234-1234-1234-123456789abc.jpg";
    check(CameraProofFrame.cameraLeaf("file://"+root+"/"+leaf,root).equals(leaf),"UUID JPEG URI");
    refuses("pre-existing SDK file cannot become a new ticket's capture",()->CameraProofFrame.freshCameraLeaf("file://"+root+"/"+leaf,root,new HashSet<>(List.of(leaf))));check(CameraProofFrame.freshCameraLeaf("file://"+root+"/"+leaf,root,Collections.emptySet()).equals(leaf),"new callback file plus native current ticket");
    for(String uri:List.of("https://x/a.jpg","content://x/a","file:"+root+"/"+leaf,"file://"+root+"/../"+leaf,"file://"+root+"/%2f"+leaf,"file:///foreign/"+leaf,"file://"+root+"/user.jpg","file://"+root+"/"+leaf+"?x=1"))refuses("URI",()->CameraProofFrame.cameraLeaf(uri,root));
    float[] v=new float[1024];v[0]=3;v[1]=4;CameraProofFrame.Vector result=CameraProofFrame.vector(v);check(Math.abs(result.normalized.get(0)-.6)<1e-6&&result.normSquared==25,"raw versus normalized");
    refuses("zero norm",()->CameraProofFrame.vector(new float[1024]));refuses("shape",()->CameraProofFrame.vector(new float[1023]));v[0]=Float.NaN;refuses("nonfinite",()->CameraProofFrame.vector(v));v[0]=Float.POSITIVE_INFINITY;refuses("infinite",()->CameraProofFrame.vector(v));
    int prior=closed[0];refuses("bad allocation closes",()->CameraProofFrame.prepare(small,3,2,1,100,100,"FILL","A",b->new CameraProofFrame.Decoded(){public int width(){return 3;}public int height(){return 2;}public long allocationBytes(){return 49;}public boolean argb8888(){return true;}public int pixel(int x,int y){throw new AssertionError("must not sample");}public void close(){closed[0]++;}},()->{}));check(closed[0]==prior+1,"finally close");
  }
  private static void lifecycle()throws Exception{
    CameraProofLifecycle gate=new CameraProofLifecycle();AtomicBoolean closed=new AtomicBoolean();
    CameraProofLifecycle.Ticket a=gate.begin(()->UUID.randomUUID().toString(),closed);
    check(gate.cancel(a.id,"BACKGROUND")&&!gate.cancel(a.id,"UNMOUNT")&&a.cancellationSignals==1,"one invalidation signal");
    refuses("cancel is not drain",()->gate.begin(()->"never",closed));refuses("no invented drain",()->gate.finish(a));check(CameraProofLifecycle.SHARED_BUSY.get(),"unknown drain owned");
    gate.captureReturned(a);check(!gate.mayPublish(a),"late cannot publish");gate.claimFinalization(a,false);gate.finish(a);
    CameraProofLifecycle.Ticket b=gate.begin(()->UUID.randomUUID().toString(),closed);refuses("old completion cannot free new owner",()->gate.finish(a));check(CameraProofLifecycle.SHARED_BUSY.get()&&gate.activeId().equals(b.id),"new owner retained");check(!gate.cancel(a.id,"USER"),"stale cancel ignored");
    gate.captureReturned(b);refuses("duplicate callback",()->gate.captureReturned(b));gate.claimFinalization(b,false);gate.finish(b);
    refuses("reservation failure",()->gate.begin(()->{throw new IOException("reserve");},closed));check(!CameraProofLifecycle.SHARED_BUSY.get(),"failed pre-capture reservation frees only own admission");
    closed.set(true);refuses("closed",()->gate.begin(()->"never",closed));
    closed.set(false);refuses("close during reservation never admits SDK phase",()->gate.begin(()->{closed.set(true);return UUID.randomUUID().toString();},closed));check(!CameraProofLifecycle.SHARED_BUSY.get(),"no capture owner after closed reservation");
    closed.set(false);CameraProofLifecycle.Ticket c=gate.begin(()->UUID.randomUUID().toString(),closed);
    java.util.concurrent.CountDownLatch entered=new java.util.concurrent.CountDownLatch(1),release=new java.util.concurrent.CountDownLatch(1);
    Thread commit=new Thread(()->{synchronized(gate){entered.countDown();try{release.await();}catch(InterruptedException e){throw new AssertionError(e);}}});commit.start();check(entered.await(2,java.util.concurrent.TimeUnit.SECONDS),"commit barrier entered");
    // Cancellation and active-id lookup cannot wait behind the commit gate monitor.
    java.util.concurrent.ExecutorService signal=java.util.concurrent.Executors.newSingleThreadExecutor();
    try{check(signal.submit(()->gate.activeId().equals(c.id)&&gate.cancel(c.id,"BACKGROUND")).get(2,java.util.concurrent.TimeUnit.SECONDS),"cancellation is independent of commit IO");}finally{release.countDown();signal.shutdown();commit.join();}
    gate.captureReturned(c);gate.claimFinalization(c,false);gate.finish(c);
  }
  private static void persistence(File parent)throws Exception{
    File sdk=new File(parent,"generated-sdk-oversize.jpg");try(RandomAccessFile producer=new RandomAccessFile(sdk,"rw")){producer.setLength(CameraProofFrame.JPEG_LIMIT+1L);}refuses("consumer refusal is not producer cap",()->CameraProofFrame.inputSize(sdk.length()));check(sdk.length()==CameraProofFrame.JPEG_LIMIT+1L,"oversized producer file remains outside owned store");
    HostIO io=new HostIO();File root=new File(parent,"valid");CameraProofStore s=store(root,io);String id=s.reserve();
    s.write(id,"request.json","{\"generatedRequest\":true}".getBytes());
    s.write(id,"raw.jpg",jpeg(3,2,1));s.write(id,"preview.png",new byte[]{1});
    s.write(id,"numerical.json","{\"generated\":true}".getBytes());s.write(id,"receipt.json","{\"generated\":true}".getBytes());s.finish(id);
    refuses("sealed candidate is not yet published",()->s.readNumerical(id));s.resolve(id,"PUBLISHED","NONE");
    byte[] before=s.readNumerical(id);CameraProofStore reopened=store(root,io);check(Arrays.equals(before,reopened.readNumerical(id)),"actual reopen");check(((List<?>)reopened.status().get("interrupted")).isEmpty(),"completed stable");
    refuses("completed overwrite",()->s.write(id,"receipt.json",new byte[]{1}));refuses("duplicate commit",()->s.finish(id));
    reopened.invalidate(id);refuses("late cancel invalidates committed numerical result",()->reopened.readNumerical(id));refuses("late cancel survives actual reopen",()->store(root,io).readNumerical(id));long invalidBytes=(Long)reopened.status().get("ownedBytes");reopened.invalidate(id);check((Long)reopened.status().get("ownedBytes")==invalidBytes,"invalidation idempotent");
    byte[] receipt=Files.readAllBytes(new File(root,id+".receipt.json").toPath());receipt[0]^=1;Files.write(new File(root,id+".receipt.json").toPath(),receipt);refuses("commit checksum",()->store(root,io));
    for(String fault:List.of("partial","afterWrite","rename","afterPublish")){
      HostIO f=new HostIO();File r=new File(parent,fault);CameraProofStore st=store(r,f);String t=st.reserve();f.fault=fault;
      refuses("write fault "+fault,()->st.write(t,"numerical.json","partial observations".getBytes()));f.fault="";
      CameraProofStore restart=new CameraProofStore(r,f,SOURCE,NEXT);check(((List<?>)restart.status().get("interrupted")).size()==1,"interruption retained:"+fault);
      refuses("no ready partial",()->restart.readNumerical(t));restart.recover(false);check(((List<?>)restart.status().get("interrupted")).size()==1,"classification visible");refuses("interrupted is not ready",()->restart.readNumerical(t));
      long bytes=(Long)restart.status().get("ownedBytes");check(bytes>65536,"residue accounted");restart.recover(false);check((Long)restart.status().get("ownedBytes")==bytes,"recovery idempotent");
    }
    for(String fault:List.of("partial","afterPublish")){
      HostIO reservationIO=new HostIO();File reservationRoot=new File(parent,"reservation-"+fault);CameraProofStore reserved=store(reservationRoot,reservationIO);reservationIO.fault=fault;refuses("reservation publication fault",reserved::reserve);reservationIO.fault="";
      CameraProofStore restart=new CameraProofStore(reservationRoot,reservationIO,SOURCE,NEXT);check((Long)restart.status().get("claimedBytes")>=CameraProofStore.RESERVATION,"failed reservation never leaks free capacity");refuses("no automatic recapture",restart::reserve);
      if(fault.equals("partial"))refuses("partial reservation needs review, never repaired by reset",()->restart.recover(false));else restart.recover(false);
    }
    for(String fault:List.of("partial","afterWrite","rename","afterPublish")){
      HostIO invalidIO=new HostIO();File invalidRoot=new File(parent,"invalidation-"+fault);CameraProofStore invalid=store(invalidRoot,invalidIO);String invalidId=invalid.reserve();invalid.write(invalidId,"request.json","{}".getBytes());invalid.write(invalidId,"raw.jpg",jpeg(3,2,1));invalid.write(invalidId,"preview.png",new byte[]{1});invalid.write(invalidId,"numerical.json","{}".getBytes());invalid.write(invalidId,"receipt.json","{}".getBytes());invalid.finish(invalidId);invalid.resolve(invalidId,"PUBLISHED","NONE");
      invalidIO.fault=fault;refuses("invalidation failure "+fault,()->invalid.invalidate(invalidId));invalidIO.fault="";
      CameraProofStore restart=new CameraProofStore(invalidRoot,invalidIO,SOURCE,NEXT);refuses("partial invalidation never yields ready evidence",()->restart.readNumerical(invalidId));
      if(!fault.equals("afterPublish"))refuses("unresolved invalidation blocks next capture",restart::reserve);
    }
    HostIO low=new HostIO();CameraProofStore lowStore=store(new File(parent,"low"),low);low.available=1;refuses("low disk before capture",()->lowStore.reserve());check((Integer)lowStore.status().get("captureCount")==0,"refusal creates no capture");
    HostIO interruptedIO=new HostIO();CameraProofStore interrupted=store(new File(parent,"same-process"),interruptedIO);String interruptedId=interrupted.reserve();check((Long)interrupted.status().get("claimedBytes")>=CameraProofStore.RESERVATION,"unresolved reservation charged across reopen");refuses("same-process drain unknown",()->interrupted.recover(false));refuses("no recapture before explicit classification",interrupted::reserve);interrupted.recover(true);refuses("classified interruption is not ready",()->interrupted.readNumerical(interruptedId));
    HostIO cancelledIO=new HostIO();CameraProofStore cancelled=store(new File(parent,"failed-after-vector"),cancelledIO);String cancelledId=cancelled.reserve();cancelled.write(cancelledId,"numerical.json","{\"observedVector\":true}".getBytes());cancelled.write(cancelledId,"failure.json","{\"cancelled\":true}".getBytes());cancelled.finish(cancelledId);cancelled.resolve(cancelledId,"FAILED","GENERATED_FAILURE");refuses("observed vector never makes failed job ready",()->cancelled.readNumerical(cancelledId));
    HostIO partialIO=new HostIO();CameraProofStore partial=store(new File(parent,"receipt-without-profile"),partialIO);String partialId=partial.reserve();partial.write(partialId,"receipt.json","{}".getBytes());refuses("receipt alone is not a complete profile",()->partial.finish(partialId));refuses("no ready partial receipt",()->partial.readNumerical(partialId));
    HostIO refusalIO=new HostIO();CameraProofStore refusalStore=store(new File(parent,"refusal-slots"),refusalIO);for(int i=0;i<128;i++)refusalStore.refusal("GENERATED_NON_CAPTURE");long refusalBytes=(Long)refusalStore.status().get("ownedBytes");refuses("refusal slot129",()->refusalStore.refusal("OVERFLOW"));check((Long)refusalStore.status().get("ownedBytes")==refusalBytes,"refusal cap has no growth or eviction");
    HostIO caps=new HostIO();CameraProofStore capStore=store(new File(parent,"count"),caps);
    for(int i=0;i<115;i++){String t=capStore.reserve();capStore.write(t,"failure.json","{\"generatedFailure\":true}".getBytes());capStore.finish(t);capStore.resolve(t,"FAILED","GENERATED_FAILURE");}check((Integer)capStore.status().get("captureCount")==115,"exact115 records");refuses("one over115",()->capStore.reserve());
    File unknown=new File(parent,"unknown");CameraProofStore user=store(unknown,new HostIO());Files.writeString(new File(unknown,"user.txt").toPath(),"GENERATED_USER_SENTINEL");refuses("unowned file",user::status);check(Files.readString(new File(unknown,"user.txt").toPath()).equals("GENERATED_USER_SENTINEL"),"user file preserved");
    File corrupt=new File(parent,"corrupt");HostIO c=new HostIO();CameraProofStore cs=store(corrupt,c);try(RandomAccessFile out=new RandomAccessFile(new File(corrupt,"refusals"),"rw")){out.seek(10);out.write(1);}refuses("corrupt preallocated log",cs::status);
    check(CameraProofStore.RESERVATION==2L*(12*1024*1024+262144+2*65536+2*4096+5*4096),"layout reservation arithmetic");
  }
  public static void main(String[] args)throws Exception{
    File root=new File(args[0]);if(!root.mkdir())throw new IOException("exclusive generated destination");frame();lifecycle();persistence(root);
    System.out.println("{\"kind\":\"GENERATED_CAMERA_PROOF_CHECKS\",\"checks\":"+checks+",\"nativeValidated\":false,\"modelExecuted\":false}");
  }
}

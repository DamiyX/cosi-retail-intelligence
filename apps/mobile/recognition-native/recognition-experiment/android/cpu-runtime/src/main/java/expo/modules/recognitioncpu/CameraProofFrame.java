package expo.modules.recognitioncpu;

import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/** Camera admission/math only. No files, Android decoder or model execution. */
public final class CameraProofFrame {
  public static final int JPEG_LIMIT=12*1024*1024, PIXEL_LIMIT=4000000, TENSOR_BYTES=224*224*3*4;
  public static final String RECIPE="camera-android-jpeg-exif-roi-center-bilinear-u8-gray128-rgb224-f32-div255-v1";
  public static final String RECIPE_SHA256=hash(RECIPE.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  public static final String MODEL="bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40";
  private CameraProofFrame(){}
  public static void require(boolean ok,String code){if(!ok)throw new IllegalArgumentException(code);}
  public static String hash(byte[] bytes){
    try{return hex(MessageDigest.getInstance("SHA-256").digest(bytes));}
    catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
  }
  private static String hex(byte[] d){StringBuilder s=new StringBuilder(64);for(byte b:d)s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
  public static String cameraLeaf(String uri,String cacheRoot){
    try{
      URI u=new URI(uri);String p=u.getPath();
      require("file".equals(u.getScheme())&&u.getRawAuthority()==null&&u.getRawQuery()==null&&u.getRawFragment()==null,"CAMERA_URI_SCHEME");
      require(p!=null&&uri.equals("file://"+p)&&p.equals(u.getRawPath())&&p.startsWith(cacheRoot+"/")&&p.equals(u.normalize().getPath()),"CAMERA_URI_PATH");
      String leaf=p.substring(cacheRoot.length()+1);
      require(leaf.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.jpg"),"CAMERA_URI_LEAF");return leaf;
    }catch(java.net.URISyntaxException e){throw new IllegalArgumentException("CAMERA_URI_SYNTAX",e);}
  }
  public static String freshCameraLeaf(String uri,String cacheRoot,java.util.Set<String> before){String leaf=cameraLeaf(uri,cacheRoot);require(!before.contains(leaf),"CAMERA_STALE_SDK_FILE");return leaf;}
  public static void dimensions(int w,int h){require(w>0&&h>0&&(long)w*h<=PIXEL_LIMIT,"CAMERA_DIMENSIONS");}
  public static void inputSize(long bytes){require(bytes>0&&bytes<=JPEG_LIMIT,"CAMERA_JPEG_BYTES");}
  public static final class Header {
    public final int width,height,orientation;
    Header(int w,int h,int o){width=w;height=h;orientation=o;}
  }
  private static int be(byte[] b,int at){return (b[at]&255)*256+(b[at+1]&255);}
  /** Strict bounded JPEG header and EXIF orientation; full decoder validation follows. */
  public static Header header(byte[] b){return header(b,observed->{});}
  public static Header header(byte[] b,java.util.function.Consumer<Header> observed){
    inputSize(b.length);require(b.length>8,"CAMERA_JPEG_BYTES");
    require(be(b,0)==0xffd8&&be(b,b.length-2)==0xffd9,"CAMERA_JPEG_CONTAINER");
    int at=2,w=0,h=0,o=0,segments=0;boolean scan=false;
    while(at<b.length-2){
      require(++segments<=512&&at+4<=b.length&&b[at]==(byte)255,"CAMERA_JPEG_MARKER");int marker=b[at+1]&255;
      require(marker!=0&&marker!=255&&marker!=0xd8&&marker!=0xd9,"CAMERA_JPEG_MARKER");
      int n=be(b,at+2);require(n>=2&&at+2L+n<=b.length-2,"CAMERA_JPEG_SEGMENT");
      int start=at+4,end=at+2+n;
      if(marker==0xe1&&end-start>=6&&b[start]=='E'&&b[start+1]=='x'&&b[start+2]=='i'&&b[start+3]=='f'&&b[start+4]==0&&b[start+5]==0){
        require(o==0,"CAMERA_DUPLICATE_EXIF");o=orientation(b,start+6,end);
      }
      if(marker==0xc0||marker==0xc1||marker==0xc2){
        require(w==0&&n>=8&&b[start]==8,"CAMERA_JPEG_SOF");h=be(b,start+1);w=be(b,start+3);observed.accept(new Header(w,h,o));dimensions(w,h);
        require((b[start+5]&255)==3&&n==8+3*3,"CAMERA_JPEG_COMPONENTS");
      }
      if(marker==0xda){scan=true;break;}at=end;
    }
    require(scan&&w>0&&o>=1&&o<=8,"CAMERA_JPEG_METADATA_MISSING");return new Header(w,h,o);
  }
  private static long number(byte[] b,int at,int n,boolean little,int end){
    require(at>=0&&at+(long)n<=end,"CAMERA_EXIF_RANGE");long v=0;
    for(int i=0;i<n;i++)v|=(long)(b[at+i]&255)<<(8*(little?i:n-1-i));return v;
  }
  private static int orientation(byte[] b,int tiff,int end){
    require(tiff+8<=end,"CAMERA_EXIF_HEADER");boolean little=b[tiff]=='I'&&b[tiff+1]=='I';
    require(little||(b[tiff]=='M'&&b[tiff+1]=='M'),"CAMERA_EXIF_ENDIAN");
    require(number(b,tiff+2,2,little,end)==42,"CAMERA_EXIF_MAGIC");long off=number(b,tiff+4,4,little,end);
    require(off>=8&&off<=end-tiff-2,"CAMERA_EXIF_OFFSET");int base=tiff+(int)off,n=(int)number(b,base,2,little,end),o=0;
    require(n<=512&&base+2L+12L*n+4<=end,"CAMERA_EXIF_COUNT");
    for(int i=0;i<n;i++){int p=base+2+12*i;if(number(b,p,2,little,end)==274){
      require(o==0&&number(b,p+2,2,little,end)==3&&number(b,p+4,4,little,end)==1,"CAMERA_EXIF_ORIENTATION");o=(int)number(b,p+8,2,little,end);
    }}require(o>=1&&o<=8,"CAMERA_EXIF_ORIENTATION");return o;
  }
  public static Header admit(byte[] b,int returnedWidth,int returnedHeight,int returnedOrientation){
    dimensions(returnedWidth,returnedHeight);Header h=header(b);
    require(h.width==returnedWidth&&h.height==returnedHeight&&h.orientation==returnedOrientation,"CAMERA_METADATA_DISAGREEMENT");return h;
  }
  public interface Decoded extends AutoCloseable {
    int width();int height();long allocationBytes();boolean argb8888();int pixel(int x,int y);
    @Override void close();
  }
  public interface Decoder {Decoded decode(byte[] jpeg)throws Exception;}
  public interface Admitted {void accept()throws Exception;}
  public static final class Prepared {
    public final int[] box;public final byte[] tensor;public final String roiRgbSha256;
    Prepared(int[] box,byte[] tensor,String roiRgbSha256){this.box=box;this.tensor=tensor;this.roiRgbSha256=roiRgbSha256;}
  }
  /** Hash the upright cropped RGB raster with a fixed chunk, no full upright/crop allocation. */
  private static String roiHash(Decoded decoded,int w,int h,int o,int[] box)throws Exception{
    MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] chunk=new byte[8190];int at=0;
    for(int y=box[1];y<box[3];y++)for(int x=box[0];x<box[2];x++){
      int sx=x,sy=y;switch(o){case 2:sx=w-1-x;break;case 3:sx=w-1-x;sy=h-1-y;break;case 4:sy=h-1-y;break;case 5:sx=y;sy=x;break;case 6:sx=y;sy=h-1-x;break;case 7:sx=w-1-y;sy=h-1-x;break;case 8:sx=w-1-y;sy=x;break;default:break;}
      int pixel=decoded.pixel(sx,sy);require((pixel>>>24)==255,"CAMERA_IMAGE_ALPHA");
      chunk[at++]=(byte)(pixel>>>16);chunk[at++]=(byte)(pixel>>>8);chunk[at++]=(byte)pixel;
      if(at==chunk.length){digest.update(chunk);at=0;}
    }
    digest.update(chunk,0,at);return hex(digest.digest());
  }
  /** Production sequencing seam, exercised with injected pixels; no Android/model requirement. */
  public static Prepared prepare(byte[] bytes,int w,int h,int o,int pw,int ph,String mode,String layout,Decoder decoder,Admitted admitted)throws Exception{
    Header header=admit(bytes,w,h,o);int[] box=roi(w,h,header.orientation,pw,ph,mode,layout);admitted.accept();
    Decoded decoded=decoder.decode(bytes);require(decoded!=null,"CAMERA_DECODE_FAILED");
    try{
      require(decoded.width()==w&&decoded.height()==h&&decoded.argb8888()&&decoded.allocationBytes()>0&&decoded.allocationBytes()<=(long)w*h*8,"CAMERA_BITMAP_ALLOCATION");
      String roi=roiHash(decoded,w,h,o,box);
      return new Prepared(box,PhonePortabilityImage.tensor(w,h,o,box,decoded::pixel),roi);
    }finally{decoded.close();}
  }
  /** Oriented half-open candidate ROI. FOV correspondence deliberately remains unverified. */
  public static int[] roi(int rawW,int rawH,int orientation,int pw,int ph,String mode,String layout){
    dimensions(rawW,rawH);require(orientation>=1&&orientation<=8,"CAMERA_ORIENTATION");
    require(pw>0&&ph>0&&pw<=10000&&ph<=10000&&("A".equals(layout)||"B".equals(layout)),"CAMERA_LAYOUT");
    require("FILL".equals(mode)||"FIT".equals(mode),"CAMERA_CONTENT_MODE");
    int w=orientation>=5?rawH:rawW,h=orientation>=5?rawW:rawH;
    double s="FILL".equals(mode)?Math.max((double)pw/w,(double)ph/h):Math.min((double)pw/w,(double)ph/h);
    double contentX=(pw-w*s)/2,contentY=(ph-h*s)/2;
    double l=(pw*.1-contentX)/s,t=(ph*.1-contentY)/s,r=(pw*.9-contentX)/s,b=(ph*.9-contentY)/s;
    require(l>=0&&t>=0&&r<=w&&b<=h,"CAMERA_GUIDE_IN_BARS");
    double dx=(r-l)*.05,dy=(b-t)*.05;
    return new int[]{Math.max(0,(int)Math.floor(l-dx)),Math.max(0,(int)Math.floor(t-dy)),Math.min(w,(int)Math.ceil(r+dx)),Math.min(h,(int)Math.ceil(b+dy))};
  }
  public static final class Vector {
    public final List<Double> raw=new ArrayList<>(1024),normalized=new ArrayList<>(1024);
    public final double normSquared;public final String rawSha256,normalizedSha256;
    Vector(float[] values){
      require(values!=null&&values.length==1024,"CAMERA_VECTOR_SHAPE");double sum=0;
      for(float v:values){require(Float.isFinite(v),"CAMERA_VECTOR_FINITE");sum+=(double)v*v;raw.add((double)v);}
      require(Double.isFinite(sum)&&sum>0,"CAMERA_VECTOR_NORM");normSquared=sum;double norm=Math.sqrt(sum);
      ByteBuffer a=ByteBuffer.allocate(4096).order(ByteOrder.LITTLE_ENDIAN),b=ByteBuffer.allocate(4096).order(ByteOrder.LITTLE_ENDIAN);
      for(float v:values){float n=(float)(v/norm);require(Float.isFinite(n),"CAMERA_VECTOR_FINITE");a.putFloat(v);b.putFloat(n);normalized.add((double)n);}
      rawSha256=hash(a.array());normalizedSha256=hash(b.array());
    }
  }
  public static Vector vector(float[] values){return new Vector(values);}
}

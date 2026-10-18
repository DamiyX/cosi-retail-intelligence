package expo.modules.recognitioncpu;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

/** Pure generated-pixel recipe. No Android decoder, file access or inference. */
public final class GeneratedImageGeometry {
  public static final String RECIPE = "generated-android-bitmap-rgb-center-bilinear-u8-v1";
  public static final int MAX_SIDE = 512;
  private GeneratedImageGeometry() {}
  public static void check(boolean ok, String reason) {
    if (!ok) throw new IllegalArgumentException(reason);
  }
  public static void dimensions(int w, int h) {
    check(w > 0 && h > 0 && w <= MAX_SIDE && h <= MAX_SIDE, "GENERATED_DIMENSIONS");
  }
  public static byte[] orient(byte[] rgb, int w, int h, int orientation) {
    dimensions(w,h); check(rgb.length == w*h*3 && orientation >= 1 && orientation <= 8, "GENERATED_ORIENTATION");
    int ow = orientation >= 5 ? h : w;
    byte[] out = new byte[rgb.length];
    for (int y=0;y<h;y++) for(int x=0;x<w;x++) {
      int dx=x,dy=y;
      switch(orientation) {
        case 2: dx=w-1-x;break;
        case 3: dx=w-1-x;dy=h-1-y;break;
        case 4: dy=h-1-y;break;
        case 5: dx=y;dy=x;break;
        case 6: dx=h-1-y;dy=x;break;
        case 7: dx=h-1-y;dy=w-1-x;break;
        case 8: dx=y;dy=w-1-x;break;
        default:break;
      }
      System.arraycopy(rgb,(y*w+x)*3,out,(dy*ow+dx)*3,3);
    }
    return out;
  }
  public static byte[] crop(byte[] rgb,int w,int h,int[] b) {
    dimensions(w,h);check(rgb.length==w*h*3 && b.length==4,"GENERATED_RGB_BOX");
    check(b[0]>=0 && b[1]>=0 && b[2]<=w && b[3]<=h && b[0]<b[2] && b[1]<b[3],"GENERATED_CROP");
    int cw=b[2]-b[0],ch=b[3]-b[1];byte[] out=new byte[cw*ch*3];
    for(int y=0;y<ch;y++) System.arraycopy(rgb,((y+b[1])*w+b[0])*3,out,y*cw*3,cw*3);
    return out; // Saved effective bounds; never apply padding a second time.
  }
  /** width,height,left,top,right padding,bottom padding, floor(x+0.5). */
  public static int[] letterbox(int w,int h) {
    dimensions(w,h);double s=Math.min(224.0/w,224.0/h);
    int rw=Math.max(1,(int)Math.floor(w*s+.5)),rh=Math.max(1,(int)Math.floor(h*s+.5));
    int l=(224-rw)/2,t=(224-rh)/2;
    return new int[]{rw,rh,l,t,224-rw-l,224-rh-t};
  }
  /** Explicit pixel-center bilinear, clamp edges, round to uint8, then gray128 pad. */
  public static byte[] resizeAndPad(byte[] rgb,int w,int h) {
    dimensions(w,h);check(rgb.length==w*h*3,"GENERATED_RGB_SIZE");int[] g=letterbox(w,h);
    byte[] out=new byte[224*224*3];Arrays.fill(out,(byte)128);
    for(int y=0;y<g[1];y++) {
      double sy=Math.max(0,Math.min(h-1,(y+.5)*h/g[1]-.5));int y0=(int)Math.floor(sy),y1=Math.min(h-1,y0+1);double fy=sy-y0;
      for(int x=0;x<g[0];x++) {
        double sx=Math.max(0,Math.min(w-1,(x+.5)*w/g[0]-.5));int x0=(int)Math.floor(sx),x1=Math.min(w-1,x0+1);double fx=sx-x0;
        for(int c=0;c<3;c++) {
          double a=(rgb[(y0*w+x0)*3+c]&255)*(1-fx)+(rgb[(y0*w+x1)*3+c]&255)*fx;
          double b=(rgb[(y1*w+x0)*3+c]&255)*(1-fx)+(rgb[(y1*w+x1)*3+c]&255)*fx;
          out[((y+g[3])*224+x+g[2])*3+c]=(byte)(int)Math.floor(a*(1-fy)+b*fy+.5);
        }
      }
    }
    return out;
  }
  public static byte[] tensor(byte[] padded) {
    check(padded.length==224*224*3,"GENERATED_PADDED_SIZE");
    ByteBuffer b=ByteBuffer.allocate(padded.length*4).order(ByteOrder.LITTLE_ENDIAN);
    for(byte v:padded)b.putFloat((v&255)/255.0f);return b.array();
  }
  /** Accepted mapGuide: aspect-fill preview, one 5% pad, inverse pixel-edge rotation. */
  public static double[] mapGuide(int w,int h,int pw,int ph,int rotation,boolean mirrored) {
    dimensions(w,h);dimensions(pw,ph);check(rotation==0||rotation==90||rotation==180||rotation==270,"GENERATED_ROTATION");
    int ow=(rotation==90||rotation==270)?h:w,oh=(rotation==90||rotation==270)?w:h;
    double scale=Math.max((double)pw/ow,(double)ph/oh),dx=(ow*scale-pw)/2,dy=(oh*scale-ph)/2;
    double l=(pw*.1+dx)/scale,t=(ph*.1+dy)/scale,r=(pw*.9+dx)/scale,b=(ph*.9+dy)/scale;
    if(mirrored){double tmp=l;l=ow-r;r=ow-tmp;}
    double px=(r-l)*.05,py=(b-t)*.05;
    int el=Math.max(0,(int)Math.floor(l-px)),et=Math.max(0,(int)Math.floor(t-py)),er=Math.min(ow,(int)Math.ceil(r+px)),eb=Math.min(oh,(int)Math.ceil(b+py));
    double minX=w,minY=h,maxX=0,maxY=0;
    for(int x:new int[]{el,er})for(int y:new int[]{et,eb}) {
      double ox=x,oy=y;
      if(rotation==90){ox=y;oy=h-x;}else if(rotation==180){ox=w-x;oy=h-y;}else if(rotation==270){ox=w-y;oy=x;}
      minX=Math.min(minX,ox);minY=Math.min(minY,oy);maxX=Math.max(maxX,ox);maxY=Math.max(maxY,oy);
    }
    return new double[]{ow,oh,l,t,r,b,el,et,er,eb,minX,minY,maxX,maxY,scale,dx,dy};
  }
}

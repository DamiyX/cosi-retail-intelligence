package expo.modules.recognitioncpu;
import java.util.Arrays;

/** Same pinned pixel-center uint8 bilinear math, sampled without a full upright copy. */
public final class PhonePortabilityImage {
  public interface Pixels {int argb(int x,int y);}
  private PhonePortabilityImage(){}
  public static byte[] tensor(int rw,int rh,int orientation,int[] box,Pixels pixels){
    PhonePortabilityJson.require(rw>0&&rh>0&&(long)rw*rh<=12484800&&orientation>=1&&orientation<=8,"IMAGE_BOUNDS");int uw=orientation>=5?rh:rw,uh=orientation>=5?rw:rh;
    PhonePortabilityJson.require(box.length==4&&box[0]>=0&&box[1]>=0&&box[2]<=uw&&box[3]<=uh&&box[0]<box[2]&&box[1]<box[3],"EFFECTIVE_BOX");
    int w=box[2]-box[0],h=box[3]-box[1];double s=Math.min(224.0/w,224.0/h);int fw=Math.max(1,(int)Math.floor(w*s+.5)),fh=Math.max(1,(int)Math.floor(h*s+.5)),left=(224-fw)/2,top=(224-fh)/2;
    byte[] padded=new byte[224*224*3];Arrays.fill(padded,(byte)128);
    for(int y=0;y<fh;y++){double sy=Math.max(0,Math.min(h-1,(y+.5)*h/fh-.5));int y0=(int)Math.floor(sy),y1=Math.min(h-1,y0+1);double fy=sy-y0;
      for(int x=0;x<fw;x++){double sx=Math.max(0,Math.min(w-1,(x+.5)*w/fw-.5));int x0=(int)Math.floor(sx),x1=Math.min(w-1,x0+1);double fx=sx-x0;
        int a=sample(x0+box[0],y0+box[1],rw,rh,orientation,pixels),b=sample(x1+box[0],y0+box[1],rw,rh,orientation,pixels),c=sample(x0+box[0],y1+box[1],rw,rh,orientation,pixels),d=sample(x1+box[0],y1+box[1],rw,rh,orientation,pixels);
        for(int channel=0;channel<3;channel++){int shift=16-channel*8;double upper=((a>>>shift)&255)*(1-fx)+((b>>>shift)&255)*fx,lower=((c>>>shift)&255)*(1-fx)+((d>>>shift)&255)*fx;padded[((y+top)*224+x+left)*3+channel]=(byte)(int)Math.floor(upper*(1-fy)+lower*fy+.5);}
      }
    }
    return GeneratedImageGeometry.tensor(padded); // unchanged float32/div255/little-endian conversion
  }
  private static int sample(int x,int y,int w,int h,int o,Pixels p){int sx=x,sy=y;switch(o){case 2:sx=w-1-x;break;case 3:sx=w-1-x;sy=h-1-y;break;case 4:sy=h-1-y;break;case 5:sx=y;sy=x;break;case 6:sx=y;sy=h-1-x;break;case 7:sx=w-1-y;sy=h-1-x;break;case 8:sx=w-1-y;sy=x;break;default:break;}int v=p.argb(sx,sy);PhonePortabilityJson.require((v>>>24)==255,"IMAGE_ALPHA");return v;}
}

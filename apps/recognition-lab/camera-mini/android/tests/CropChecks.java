import local.cameracomponent.*;
import java.awt.image.BufferedImage;
import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import javax.imageio.ImageIO;
import java.io.*;
import java.util.*;
public final class CropChecks {
 static int cases,pixels;static final double[] I={1,0,0,0,1,0,0,0,1};
 static void check(boolean x,String why){if(!x)throw new AssertionError(why);}
 interface Work{void run()throws Exception;}static void refuses(Work w)throws Exception{try{w.run();throw new AssertionError("accepted invalid geometry");}catch(Failure expected){}}
 // Independent boundary oracle: iterate quarter-turns, never use production matrices.
 static double[] turn(double x,double y,int w,int h,int exif){int n=exif==6?1:exif==3?2:exif==8?3:0;for(int i=0;i<n;i++){double next=h-y;y=x;x=next;int tmp=w;w=h;h=tmp;}return new double[]{x,y};}
 static int[] pixel(int x,int y,int w,int h,int exif){int n=exif==6?1:exif==3?2:exif==8?3:0;for(int i=0;i<n;i++){int next=h-1-y;y=x;x=next;int tmp=w;w=h;h=tmp;}return new int[]{x,y};}
 static double[] area(int w,int h,int e,int l,int t,int r,int b){double minx=1e9,miny=1e9,maxx=-1,maxy=-1;for(int x:new int[]{l,r})for(int y:new int[]{t,b}){double[] v=turn(x,y,w,h,e);minx=Math.min(minx,v[0]);miny=Math.min(miny,v[1]);maxx=Math.max(maxx,v[0]);maxy=Math.max(maxy,v[1]);}return new double[]{minx,miny,maxx,maxy};}
 static double[] viewSensor(double sx,double sy,int w,int h,int e,double[] a,int pw,int ph){double[] u=turn(2*sx+11,3*sy-7,w,h,e);return new double[]{(u[0]-a[0])*pw/(a[2]-a[0]),(u[1]-a[1])*ph/(a[3]-a[1])};}
 static double[] preview(int w,int h,int e,int l,int t,int r,int b,int pw,int ph){double[] a=area(w,h,e,l,t,r,b),o=viewSensor(0,0,w,h,e,a,pw,ph),x=viewSensor(1,0,w,h,e,a,pw,ph),y=viewSensor(0,1,w,h,e,a,pw,ph);return new double[]{x[0]-o[0],y[0]-o[0],o[0],x[1]-o[1],y[1]-o[1],o[1],0,0,1};}
 static void oracle(int w,int h,int e,int l,int t,int r,int b,int pw,int ph)throws Exception{
  double[] a={2,0,11,0,3,-7,0,0,1},p=preview(w,h,e,l,t,r,b,pw,ph);CropGeometry.Plan plan=CropGeometry.plan(w,h,e,l,t,r,b,pw,ph,a,p);double[] rect=area(w,h,e,l,t,r,b);
  int[] box={(int)Math.floor(rect[0]+.06*(rect[2]-rect[0])+1e-8),(int)Math.floor(rect[1]+.06*(rect[3]-rect[1])+1e-8),(int)Math.ceil(rect[0]+.94*(rect[2]-rect[0])-1e-8),(int)Math.ceil(rect[1]+.94*(rect[3]-rect[1])-1e-8)};
  for(int i=0;i<4;i++)check(Math.abs(plan.box[i]-box[i])<=1,"bbox oracle");
  int uw=e==6||e==8?h:w,uh=e==6||e==8?w:h;BufferedImage raw=new BufferedImage(w,h,BufferedImage.TYPE_INT_ARGB),expected=new BufferedImage(uw,uh,BufferedImage.TYPE_INT_ARGB),actual=new BufferedImage(uw,uh,BufferedImage.TYPE_INT_ARGB);
  for(int y=0;y<h;y++)for(int x=0;x<w;x++){int color=0xff000000|((x*37+y*17)&255)<<16|((x*3+y*53)&255)<<8|((x*97+y*7)&255);raw.setRGB(x,y,color);int[] v=pixel(x,y,w,h,e);expected.setRGB(v[0],v[1],color);}
  AffineTransform tx=new AffineTransform();if(e==6)tx.translate(h,0);if(e==3)tx.translate(w,h);if(e==8)tx.translate(0,w);tx.rotate(Math.toRadians(Geometry.rotation(e)));Graphics2D g=actual.createGraphics();g.drawImage(raw,tx,null);g.dispose();
  BufferedImage derivative=actual.getSubimage(plan.box[0],plan.box[1],plan.box[2]-plan.box[0],plan.box[3]-plan.box[1]);ByteArrayOutputStream bytes=new ByteArrayOutputStream();check(ImageIO.write(derivative,"PNG",bytes),"PNG encode");BufferedImage decoded=ImageIO.read(new ByteArrayInputStream(bytes.toByteArray()));
  for(int y=0;y<decoded.getHeight();y++)for(int x=0;x<decoded.getWidth();x++){check(decoded.getRGB(x,y)==expected.getRGB(x+plan.box[0],y+plan.box[1]),"asymmetric decoded pixel oracle");pixels++;}
  check(plan.record.startsWith("v2|")&&plan.record.length()<2500,"metadata size/version");Evidence ev=new Evidence(new MechanismChecks.Disk());ev.begin("g");ev.retain(new byte[]{1},"g",plan.record);check(ev.reopen().startsWith("PARTIAL:"),"original retained before codec");ev.save(new byte[]{1},new byte[]{2},"g",plan.record);check(ev.reopen().startsWith("SAVED:"),"metadata receipt hash");cases++;
 }
 public static void main(String[] args)throws Exception{
  for(int e:new int[]{1,6,3,8})for(int[] shape:new int[][]{{101,79},{121,91}})for(int layout:new int[]{0,1})for(int variant=0;variant<3;variant++){int w=shape[0],h=shape[1];oracle(w,h,e,variant==1?7:0,variant==2?3:0,variant==1?w-8:w,variant==2?h-4:h,layout==0?800:800,layout==0?400:600);}
  Geometry.admission(666980,1440,1440,6,90,180,0,1260,1440);double[] a={2,0,11,0,3,-7,0,0,1},p=preview(1440,1440,6,180,0,1260,1440,800,600);CropGeometry.Plan s=CropGeometry.plan(1440,1440,6,180,0,1260,1440,800,600,a,p);check(Arrays.equals(s.rotatedCrop,new double[]{0,180,1440,1260}),"S01 rotated native crop");
  refuses(()->CropGeometry.plan(1440,1440,6,180,0,1260,1440,800,400,a,p));
  for(int[] c:new int[][]{{-1,0,10,10},{0,0,0,10},{5,0,3,10},{0,0,11,10},{0,-1,10,10},{0,0,10,11}})refuses(()->Geometry.admission(1,10,10,1,0,c[0],c[1],c[2],c[3]));
  for(double[] bad:new double[][]{null,{0,0,0,0,0,0,0,0,1},{Double.NaN,0,0,0,1,0,0,0,1},{1,0,0,0,Double.POSITIVE_INFINITY,0,0,0,1},{1,0,0,0,1,0,.1,0,1}})refuses(()->CropGeometry.plan(10,10,1,0,0,10,10,10,10,I,bad));
  for(double[] bad:new double[][]{{-1,0,10,0,1,0,0,0,1},{1,.1,0,0,1,0,0,0,1},{1,0,4,0,1,0,0,0,1}})refuses(()->CropGeometry.plan(10,10,1,0,0,10,10,10,10,I,bad));
  CropGeometry.plan(10,10,1,0,0,10,10,10,10,I,I); // identity only succeeds with correct area.
  refuses(()->CropGeometry.plan(10,10,1,1,0,8,10,10,10,I,I));
  try{CropGeometry.matrix(null,"preview");throw new AssertionError("null matrix");}catch(Failure expected){}
  System.out.println("PASS crop-v2 "+cases+" asymmetric independent rotation/landmark fixtures, "+pixels+" real host PNG decoded pixels; supported EXIF/layouts/off-center/odd/edge crops, S01 fixture/area mismatch/invalid matrix/reflection/skew/origin/header/metadata/hash. AWT+ImageIO is NOT Android codec proof; old full-crop rejection intentionally superseded for valid subrects.");
 }
}

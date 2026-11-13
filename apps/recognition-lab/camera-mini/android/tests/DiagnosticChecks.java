import local.cameracomponent.*;
public final class DiagnosticChecks {
 static int checked;
 static void check(boolean v,String why){if(!v)throw new AssertionError(why);}
 static boolean old(int b,int w,int h,int e,int r,int l,int t,int x,int y){int expected;switch(e){case 1:expected=0;break;case 6:expected=90;break;case 3:expected=180;break;case 8:expected=270;break;default:return false;}return b>0&&b<=10485760&&w>0&&h>0&&(long)w*h<=4000000&&expected==r&&l>=0&&t>=0&&l<x&&t<y&&x<=w&&y<=h;}
 static Failure result(int b,int w,int h,int e,int r,int l,int t,int x,int y)throws Exception{
  Failure f=null;try{Geometry.admission(b,w,h,e,r,l,t,x,y);}catch(Failure value){f=value;}
  check((f==null)==old(b,w,h,e,r,l,t,x,y),"admission changed");checked++;
  if(f!=null){String safe=f.safe(new Exception("secret-path-must-not-appear"));check(safe.length()<=512&&safe.matches("[A-Za-z0-9_:; .-]{1,512}")&&!safe.contains("secret"),"unsafe label");}
  return f;
 }
 public static void main(String[] args)throws Exception{
  for(int b:new int[]{Integer.MIN_VALUE,-1,0,1,10485760,10485761,Integer.MAX_VALUE})for(int w:new int[]{-1,0,1,1440,3000,Integer.MAX_VALUE})for(int h:new int[]{0,1,1080,3000,Integer.MAX_VALUE})for(int e:new int[]{Integer.MIN_VALUE,0,1,2,3,6,8,Integer.MAX_VALUE})for(int r:new int[]{-90,0,90,180,270,Integer.MAX_VALUE})for(int kind=0;kind<3;kind++)result(b,w,h,e,r,kind==1?1:0,0,kind==2?Integer.MIN_VALUE:w,h);
  check(result(10,1440,1080,6,0,0,0,1440,1080).stage.equals("buffer-rotation"),"rotation-only");
  check(result(10,1440,1080,6,90,-1,0,1440,1080).stage.equals("buffer-crop"),"crop-only");
  Failure both=result(10,1440,1080,6,0,-1,0,1440,1080);check(both.stage.equals("buffer-rotation-crop")&&both.context.contains("E6_ER90_R0_W1440_H1080_LN1_T0_X1440_Y1080_EL0_ET0_EX1440_EY1080"),"both/observed tuple");
  check(result(10,1440,1080,6,90,0,0,1440,1080)==null,"positive");check(result(10,1440,1080,2,0,0,0,1440,1080).stage.equals("exif"),"unsupported");
  for(int n:new int[]{Integer.MIN_VALUE,Integer.MAX_VALUE}){Failure f=result(n,n,n,n,n,n,n,n,n);check(f.context.length()<=220&&f.context.contains(n<0?"N2147483648":"2147483647"),"integer label bounds");}
  try{new Failure(Failure.Code.GEOMETRY,"test","X".repeat(81));throw new AssertionError("detail bound weakened");}catch(IllegalArgumentException expected){}
  try{new Failure(Failure.Code.GEOMETRY,"test","NONE","X".repeat(221));throw new AssertionError("context bound");}catch(IllegalArgumentException expected){}
  try{new Failure(Failure.Code.GEOMETRY,"test","NONE","path/private");throw new AssertionError("context raw text");}catch(IllegalArgumentException expected){}
  Geometry.jpegHeader("image/jpeg",1440,1080,1440,1080);
  for(String mime:new String[]{null,"image/png","private/path"})try{Geometry.jpegHeader(mime,-1,100,1440,1080);throw new AssertionError("MIME accepted");}catch(Failure f){check(f.safe(null).length()<512&&!f.safe(null).contains("private"),"MIME disclosure");}
  MechanismChecks.Disk d=new MechanismChecks.Disk();Evidence ev=new Evidence(d);ev.begin("g");ev.failure(both.safe(both));check(ev.reopen().contains(both.context),"durable tuple lost");check(!d.names().contains("original.jpeg")&&!d.names().contains("receipt"),"rejected image retained");
  System.out.println("PASS "+checked+" v2 admission parity cases (valid subrect intentionally differs from historical full-crop rule); split diagnostics/exact tuples/numeric bounds/durable512/detail80/MIME safety. No device execution; valid non-full rectangles intentionally newly admitted under crop-v2.");
 }
}

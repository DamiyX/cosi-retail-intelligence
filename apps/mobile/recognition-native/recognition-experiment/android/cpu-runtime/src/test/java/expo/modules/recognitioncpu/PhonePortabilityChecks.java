package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Generated inputs only. Android decoder, LiteRT, real private packet and native AtomicFile are not executed. */
public final class PhonePortabilityChecks {
  private static int assertions=0;
  private static void yes(boolean b){assertions++;if(!b)throw new AssertionError("Generated check "+assertions);}
  private interface Checked {void run()throws Exception;}
  private static void no(Checked f){boolean failed=false;try{f.run();}catch(Exception e){failed=true;}yes(failed);}
  private static double[] vector(int i){double[] v=new double[1024];v[i]=1;return v;}
  private static Map<String,Object> frame(String id,String product){Map<String,Object> m=new LinkedHashMap<>();m.put("id",id);m.put("productId",product);return m;}
  public static void main(String[] args)throws Exception {
    if(args.length>0){PhonePortabilityPacket packet=new PhonePortabilityPacket(new File(args[1]));if(args[0].equals("result"))PhonePortabilityResult.validate(new File(args[2]),packet);System.out.println("PASS generated "+args[0]);return;}
    for(String input:new String[]{"{\"a\":1,\"a\":2}","{\"a\":1,\"\\u0061\":2}","[NaN]","[1e999]","{\"x\":01}","{} true","[1,]","\"bad\ntext\""})no(()->PhonePortabilityJson.parse(input.getBytes(StandardCharsets.UTF_8)));
    no(()->PhonePortabilityJson.parse(new byte[]{(byte)0xc0,(byte)0xaf}));
    no(()->PhonePortabilityJson.parse(("[".repeat(34)+"0"+"]".repeat(34)).getBytes(StandardCharsets.UTF_8)));
    for(int w:new int[]{1,9,123,300})for(int h:new int[]{1,13,229,400})for(int o=1;o<=8;o++){
      final int width=w,height=h;byte[] rgb=new byte[w*h*3];for(int y=0;y<h;y++)for(int x=0;x<w;x++)for(int c=0;c<3;c++)rgb[(y*w+x)*3+c]=(byte)((x*17+y*31+c*53)&255);
      byte[] upright=GeneratedImageGeometry.orient(rgb,w,h,o);int uw=o>=5?h:w,uh=o>=5?w:h;
      for(int crop=0;crop<2;crop++){int[] box=crop==0?new int[]{0,0,uw,uh}:new int[]{uw/4,uh/4,Math.max(uw/4+1,uw-uw/4),Math.max(uh/4+1,uh-uh/4)};
        byte[] expected=GeneratedImageGeometry.tensor(GeneratedImageGeometry.resizeAndPad(GeneratedImageGeometry.crop(upright,uw,uh,box),box[2]-box[0],box[3]-box[1]));
        byte[] actual=PhonePortabilityImage.tensor(w,h,o,box,(x,y)->{yes(x>=0&&x<width&&y>=0&&y<height);int i=(y*width+x)*3;return 0xff000000|(rgb[i]&255)<<16|(rgb[i+1]&255)<<8|(rgb[i+2]&255);});yes(Arrays.equals(expected,actual));
      }
    }
    no(()->PhonePortabilityImage.tensor(50000,50000,1,new int[]{0,0,1,1},(x,y)->-1));
    no(()->PhonePortabilityImage.tensor(10,10,9,new int[]{0,0,10,10},(x,y)->-1));
    no(()->PhonePortabilityImage.tensor(10,10,1,new int[]{0,0,11,10},(x,y)->-1));
    no(()->PhonePortabilityImage.tensor(10,10,1,new int[]{0,0,10,10},(x,y)->0));
    final int[] maxSample={0};byte[] large=PhonePortabilityImage.tensor(3060,4080,6,new int[]{0,0,4080,3060},(x,y)->{maxSample[0]=Math.max(maxSample[0],y);yes(x>=0&&x<3060&&y>=0&&y<4080);return 0xff112233;});yes(large.length==602112&&maxSample[0]>4000);
    no(()->PhonePortabilityRank.unit(new double[1024]));double[] invalid=vector(0);invalid[2]=Double.NaN;no(()->PhonePortabilityRank.unit(invalid));
    List<Map<String,Object>> refs=new ArrayList<>();Map<String,double[]> vectors=new LinkedHashMap<>();
    for(int p=0;p<10;p++)for(int r=0;r<2;r++){String id=String.format(Locale.ROOT,"p%02d-ref-%d",p,r);refs.add(frame(id,String.format(Locale.ROOT,"p%02d",p)));vectors.put(id,vector(0));}
    List<Map<String,Object>> ranked=PhonePortabilityRank.rank(vector(0),refs,vectors);yes(ranked.size()==10);for(int p=0;p<10;p++){yes(ranked.get(p).get("productId").equals(String.format(Locale.ROOT,"p%02d",p)));yes(((String)ranked.get(p).get("nearestReferenceId")).endsWith("-0"));}
    double[] near=vector(0);near[1]=1e-7;vectors.put("p00-ref-0",near);vectors.put("p00-ref-1",near);yes(PhonePortabilityRank.rank(vector(0),refs,vectors).get(0).get("productId").equals("p01"));
    Map<String,double[]> missing=new LinkedHashMap<>(vectors);missing.remove("p01-ref-0");no(()->PhonePortabilityRank.rank(vector(0),refs,missing));
    List<Map<String,Object>> duplicate=new ArrayList<>(refs);duplicate.set(19,refs.get(0));no(()->PhonePortabilityRank.rank(vector(0),duplicate,vectors));
    Map<String,Object> parity=PhonePortabilityRank.parity(vector(0),vector(0));yes(Boolean.TRUE.equals(parity.get("passesFrozenTolerance")));double[] changed=vector(1);yes(Boolean.FALSE.equals(PhonePortabilityRank.parity(vector(0),changed).get("passesFrozenTolerance")));
    System.out.println("PASS "+assertions+" generated assertions; full geometry/ties/invalid input. No Android or model execution.");
  }
}

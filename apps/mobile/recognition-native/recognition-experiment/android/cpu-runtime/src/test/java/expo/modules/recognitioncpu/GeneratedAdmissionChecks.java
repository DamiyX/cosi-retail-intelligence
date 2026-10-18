package expo.modules.recognitioncpu;
import android.content.Context;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
/** Executes only pre-decoder admission checks against SDK types; no Android method runs. */
public final class GeneratedAdmissionChecks {
  public static void main(String[] args) throws Exception {
    int rejected=0;
    for(String id:new String[]{"zero","content://private/image","../image","all-generated-v2",""}) {
      try {GeneratedImagePipeline.run(null,id,n -> {});throw new AssertionError("accepted caller image ID");}
      catch(IllegalArgumentException e){if(!e.getMessage().equals("INVALID_GENERATED_IMAGE_ID"))throw e;rejected++;}
    }
    Method asset=GeneratedImagePipeline.class.getDeclaredMethod("asset",Context.class,String.class,int.class,String.class);asset.setAccessible(true);
    Object[][] cases={{null,"file:///private.jpg",1,"a".repeat(64)},{null,"recognition-experiment/../private.jpg",1,"a".repeat(64)},
      {null,"recognition-experiment/orientation-1.jpg",0,"a".repeat(64)},{null,"recognition-experiment/orientation-1.jpg",1048577,"a".repeat(64)},
      {null,"recognition-experiment/orientation-1.jpg",1,"bad pin"}};
    for(Object[] c:cases) {
      try{asset.invoke(null,c);throw new AssertionError("accepted invalid path/asset metadata");}
      catch(InvocationTargetException e){if(!(e.getCause() instanceof IllegalArgumentException))throw e;rejected++;}
    }
    if(!GeneratedImagePipeline.hash(new byte[]{1,2,3}).equals("039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"))throw new AssertionError("hash mismatch");
    System.out.println("Native image entry/asset admission PASS "+rejected+" negative cases; no Android decode");
  }
}

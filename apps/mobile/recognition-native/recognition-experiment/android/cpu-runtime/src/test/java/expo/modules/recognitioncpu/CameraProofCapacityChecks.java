package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Generated host files with logical sparse lengths; no Android allocation/durability claim. */
public final class CameraProofCapacityChecks {
  private static int checks;
  private static void check(boolean b,String m){checks++;if(!b)throw new AssertionError(m);}
  private static void sized(File f,long size)throws Exception{try(RandomAccessFile out=new RandomAccessFile(f,"rw")){out.setLength(size);}}
  private static final String SOURCE="a".repeat(64),PROCESS="11111111-1111-1111-1111-111111111111";
  public static void main(String[] args)throws Exception{
    File root=new File(args[0]);if(root.exists())throw new IOException("exclusive generated destination");
    CameraProofChecks.HostIO io=new CameraProofChecks.HostIO();CameraProofStore store=new CameraProofStore(root,io,SOURCE,PROCESS);
    String last=null;
    for(int i=0;i<10;i++){
      String id=store.reserve();last=id;
      if(i==0)store.write(id,"raw.jpg",new byte[CameraProofFrame.JPEG_LIMIT]);
      store.write(id,"failure.json","{}".getBytes(StandardCharsets.UTF_8));
      if(i==9){
        StringBuilder marker=new StringBuilder(SOURCE+"\nCAMERA_DONE_V1\n");
        for(String role:List.of("reservation","failure.json","raw.jpg"))marker.append(role).append('=').append("0".repeat(64)).append('\n');
        String resolution=SOURCE+"\nCAMERA_RESOLUTION_V1\n"+id+"\n"+PROCESS+"\n"+"0".repeat(64)+"\nFAILED\nGENERATED_FAILURE\n"+"0".repeat(64)+"\n";
        long before=(Long)store.status().get("ownedBytes"),remaining=CameraProofStore.CAP-4096-before-2L*CameraProofFrame.JPEG_LIMIT-marker.toString().getBytes(StandardCharsets.UTF_8).length-resolution.getBytes(StandardCharsets.UTF_8).length;
        check(remaining>0&&remaining<=CameraProofFrame.JPEG_LIMIT,"bounded final payload");
        store.write(id,"raw.jpg",new byte[(int)remaining]);
      }
      // Inject retained staged/backup residue only after publication has finished
      // using that stage name; the production writer must reject existing stages.
      sized(new File(root,id+".raw.jpg.new"),CameraProofFrame.JPEG_LIMIT);
      sized(new File(root,id+".raw.jpg.bak"),CameraProofFrame.JPEG_LIMIT);
      store.finish(id);store.resolve(id,"FAILED","GENERATED_FAILURE");
    }
    check((Long)store.status().get("ownedBytes")==CameraProofStore.CAP-4096,"commit retains headroom for dual-name publication");
    // A retained backup at the boundary is a generated filesystem fixture, not a
    // claim that the writer can commit an atomic stage without peak headroom.
    File one=new File(root,last+".receipt.json.bak");sized(one,4096);
    check((Long)store.status().get("ownedBytes")==CameraProofStore.CAP,"exact256MiB includes markers/residue/refusals");
    check((Long)store.status().get("claimedBytes")==CameraProofStore.CAP,"no hidden reservation release over cap");
    try{store.reserve();throw new AssertionError("capture must refuse full store");}catch(IllegalStateException expected){checks++;}
    check((Long)store.status().get("ownedBytes")==CameraProofStore.CAP,"capacity refusal fits preallocated metadata");
    sized(one,4097);
    try{store.status();throw new AssertionError("one byte over cap");}catch(IllegalArgumentException expected){check(expected.getMessage().equals("CAMERA_OWNED_CAP"),"overall byte cap, not per-file cap");}
    check(one.length()==4097,"over-cap evidence retained, no reset/eviction");
    System.out.println("{\"kind\":\"GENERATED_CAMERA_CAPACITY_CHECKS\",\"checks\":"+checks+",\"exactOwnedCapBytes\":"+CameraProofStore.CAP+",\"reservationBytes\":"+CameraProofStore.RESERVATION+",\"nativeValidated\":false,\"modelExecuted\":false}");
  }
}

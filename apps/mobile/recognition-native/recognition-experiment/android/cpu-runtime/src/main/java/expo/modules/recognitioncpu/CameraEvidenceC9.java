package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Fixed observed C7 + one C9 profile, sharing the existing saved-export reserve. */
public final class CameraEvidenceC9 {
  private CameraEvidenceC9(){}
  static final String LEGACY_ROOT="camera-evidence-export-v1", ROOT="camera-evidence-export-c9-v1";
  static final String LEGACY_JOB="9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c";
  static final String LEGACY_SOURCE="ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84";
  static final String LEGACY_APK="4eee45f910ff9cc1ceb127f8707d5a4420c0c1b743982019f60e0556326b6827";
  // Frozen public-output observation, not a general legacy quota or a private-file measurement.
  static final long LEGACY_OUTPUT_BYTES=799317;
  static final String LEGACY_OUTPUT_SHA256="04c7ddc70163513b6c3d26733c0b36bdcc40f58e9179bbf93076203c7b3cea88";
  private static byte[] utf(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private static void require(boolean b,String code){CameraEvidenceExport.require(b,"C9_"+code);}
  private static String[] canonical(byte[] record,int count){
    String[] lines=new String(record,StandardCharsets.UTF_8).split("\n",-1);
    require(lines.length==count+1&&lines[count].isEmpty(),"RECORD_LINES");
    String body=String.join("\n",Arrays.copyOf(lines,count-1))+"\n";
    require(Arrays.equals(record,utf(body+CameraProofFrame.hash(utf(body))+"\n")),"RECORD_HASH");
    return Arrays.copyOf(lines,count);
  }
  static void attempt(byte[] raw,boolean legacy){
    String[] a=canonical(raw,7);
    require(a[0].equals("CAMERA_EXPORT_ATTEMPT_V1")&&a[1].equals(legacy?LEGACY_JOB:CameraEvidenceExport.JOB)
      &&a[2].matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}")
      &&a[3].matches("[a-f0-9]{64}")&&a[4].matches("[a-f0-9]{64}")
      &&a[5].equals(Integer.toString(legacy?CameraProofStore.EXPORT_OUTPUT:CameraEvidenceExport.OUTPUT_LIMIT)),"ATTEMPT_BINDING");
    if(legacy)require(a[3].equals(LEGACY_SOURCE)&&a[4].equals(LEGACY_APK),"LEGACY_OWNER");
  }
  static void terminal(byte[] raw,byte[] attempt,boolean legacy){
    String[] t=canonical(raw,4);
    require(t[0].equals("CAMERA_EXPORT_TERMINAL_V1")&&t[1].equals(CameraProofFrame.hash(attempt))
      &&Arrays.asList("CANCELLED","FAILED_UNVERIFIED","READBACK_VERIFIED").contains(t[2]),"TERMINAL_BINDING");
    if(legacy)require(t[2].equals("READBACK_VERIFIED"),"LEGACY_NOT_READBACK");
  }
  private static long footprint(File root,CameraProofStore.IO io)throws IOException{
    io.syncDirectory(root);List<String> names=io.list(root);require(names.size()<=2,"JOURNAL_COUNT");long total=0;
    for(String name:names){require(name.equals("attempt")||name.equals("terminal"),"JOURNAL_NAME");long n=io.size(new File(root,name));require(n>0&&n<=4096,"JOURNAL_BOUND");total+=n;}
    return total;
  }
  static long legacy(File root,CameraProofStore.IO io)throws IOException{
    long total=footprint(root,io);require(new HashSet<>(io.list(root)).equals(new HashSet<>(Arrays.asList("attempt","terminal"))),"LEGACY_INCOMPLETE");
    byte[] a=io.read(new File(root,"attempt"),4096);attempt(a,true);terminal(io.read(new File(root,"terminal"),4096),a,true);return total;
  }
  static long current(File root,CameraProofStore.IO io)throws IOException{
    long total=footprint(root,io);List<String> names=io.list(root);
    require(!names.contains("terminal")||names.contains("attempt"),"JOURNAL_STATE");
    if(names.contains("attempt")){
      byte[] a=io.read(new File(root,"attempt"),4096);attempt(a,false);
      if(names.contains("terminal"))terminal(io.read(new File(root,"terminal"),4096),a,false);
    }
    return total;
  }
  static void bookkeeping(long legacy,long current){
    require(legacy>=0&&current>=0&&legacy<=CameraProofStore.EXPORT_BOOKKEEPING
      &&current<=CameraProofStore.EXPORT_BOOKKEEPING-legacy,"SHARED_BOOKKEEPING");
  }
  static void admit(File parent,CameraProofStore.IO io,boolean currentExists)throws IOException{
    require(!currentExists,"ATTEMPT_CONSUMED");long old=legacy(new File(parent,LEGACY_ROOT),io);
    require(LEGACY_OUTPUT_BYTES+CameraEvidenceExport.OUTPUT_LIMIT<=CameraProofStore.EXPORT_OUTPUT,"SHARED_OUTPUT");
    bookkeeping(old,2L*4096); // Reserve the two bounded C9 journal records before creating the root.
  }
  static void validateFootprints(File parent,CameraProofStore.IO io,boolean oldExists,boolean currentExists)throws IOException{
    long old=oldExists?(currentExists?legacy(new File(parent,LEGACY_ROOT),io):footprint(new File(parent,LEGACY_ROOT),io)):0;
    require(!currentExists||oldExists,"LEGACY_MISSING");
    long next=currentExists?current(new File(parent,ROOT),io):0;bookkeeping(old,next);
    if(currentExists)require(LEGACY_OUTPUT_BYTES+CameraEvidenceExport.OUTPUT_LIMIT<=CameraProofStore.EXPORT_OUTPUT,"SHARED_OUTPUT");
  }
}

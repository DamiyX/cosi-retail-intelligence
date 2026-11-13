package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Generated journal/stream checks; never reads the actual private photo or Android provider. */
public final class CameraEvidenceC9Checks {
  private static int checks;
  private interface Work{void run()throws Exception;}
  private static void ok(boolean v,String m){checks++;if(!v)throw new AssertionError(m);}
  private static void refuses(Work work)throws Exception{try{work.run();throw new AssertionError("missing refusal");}catch(IOException|IllegalArgumentException|IllegalStateException e){checks++;}}
  private static byte[] utf(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private static byte[] record(String...lines){String body=String.join("\n",lines)+"\n";return utf(body+CameraProofFrame.hash(utf(body))+"\n");}
  private static final String PROCESS="00000000-0000-0000-0000-000000000001";
  private static byte[] attempt(){return record("CAMERA_EXPORT_ATTEMPT_V1",CameraEvidenceC9.LEGACY_JOB,PROCESS,CameraEvidenceC9.LEGACY_SOURCE,CameraEvidenceC9.LEGACY_APK,Integer.toString(CameraProofStore.EXPORT_OUTPUT));}
  private static byte[] terminal(byte[] a,String status){return record("CAMERA_EXPORT_TERMINAL_V1",CameraProofFrame.hash(a),status);}
  private static File legacy(File parent,byte[] a,byte[] t)throws Exception{
    File old=new File(parent,CameraEvidenceC9.LEGACY_ROOT);Files.createDirectories(old.toPath());
    if(a!=null)Files.write(new File(old,"attempt").toPath(),a);if(t!=null)Files.write(new File(old,"terminal").toPath(),t);return old;
  }
  private static void journals(File base)throws Exception{
    CameraProofChecks.HostIO io=new CameraProofChecks.HostIO();byte[] a=attempt(),t=terminal(a,"READBACK_VERIFIED");
    File good=new File(base,"good");File old=legacy(good,a,t);CameraEvidenceC9.admit(good,io,false);
    ok(!new File(good,CameraEvidenceC9.ROOT).exists(),"admission itself does not create or repair files");
    ok(Arrays.equals(Files.readAllBytes(new File(old,"attempt").toPath()),a)&&Arrays.equals(Files.readAllBytes(new File(old,"terminal").toPath()),t),"consumed C7 bytes preserved");
    File current=new File(good,CameraEvidenceC9.ROOT);ok(current.mkdir(),"generated C9 root creation");
    refuses(()->CameraEvidenceC9.admit(good,io,true)); // Empty root residue consumes the attempt.
    CameraEvidenceC9.validateFootprints(good,io,true,true);
    CameraEvidenceJournal j=new CameraEvidenceJournal(current,io);j.consume(PROCESS,"a".repeat(64),"b".repeat(64));
    byte[] currentAttempt=Files.readAllBytes(new File(current,"attempt").toPath());
    ok(new String(currentAttempt,StandardCharsets.UTF_8).contains("\n1048576\n"),"fixed C9 output declaration");
    refuses(()->new CameraEvidenceJournal(current,io).consume(PROCESS,"a".repeat(64),"b".repeat(64)));
    j.terminal("READBACK_VERIFIED");CameraEvidenceC9.validateFootprints(good,io,true,true);refuses(()->j.terminal("CANCELLED"));
    ok(Arrays.equals(Files.readAllBytes(new File(current,"attempt").toPath()),currentAttempt),"reopen does not rewrite C9 attempt");
    Files.writeString(new File(current,"terminal").toPath(),"torn");refuses(()->CameraEvidenceC9.validateFootprints(good,io,true,true));
    File missing=new File(base,"missing");Files.createDirectories(missing.toPath());refuses(()->CameraEvidenceC9.admit(missing,io,false));
    File orphan=new File(base,"orphan");Files.createDirectories(new File(orphan,CameraEvidenceC9.ROOT).toPath());refuses(()->CameraEvidenceC9.validateFootprints(orphan,io,false,true));
    List<byte[][]> bad=new ArrayList<>();bad.add(new byte[][]{null,null});bad.add(new byte[][]{a,null});bad.add(new byte[][]{null,t});bad.add(new byte[][]{new byte[0],t});bad.add(new byte[][]{utf("partial"),t});
    byte[] wrong=a.clone();wrong[wrong.length-3]^=1;bad.add(new byte[][]{wrong,t});
    for(int field:new int[]{0,1,2,3,4,5}){
      String[] values={"CAMERA_EXPORT_ATTEMPT_V1",CameraEvidenceC9.LEGACY_JOB,PROCESS,CameraEvidenceC9.LEGACY_SOURCE,CameraEvidenceC9.LEGACY_APK,Integer.toString(CameraProofStore.EXPORT_OUTPUT)};
      values[field]=field==1?CameraEvidenceExport.JOB:field==2?"-".repeat(36):field==3||field==4?"c".repeat(64):field==5?"1048576":"OTHER";
      byte[] changed=record(values);bad.add(new byte[][]{changed,terminal(changed,"READBACK_VERIFIED")});
    }
    bad.add(new byte[][]{a,terminal(a,"CANCELLED")});bad.add(new byte[][]{a,terminal(a,"FAILED_UNVERIFIED")});
    bad.add(new byte[][]{a,record("CAMERA_EXPORT_TERMINAL_V1","c".repeat(64),"READBACK_VERIFIED")});
    bad.add(new byte[][]{a,utf(new String(t,StandardCharsets.UTF_8)+"\n")});bad.add(new byte[][]{Arrays.copyOf(a,a.length-1),t});
    int i=0;for(byte[][] pair:bad){File parent=new File(base,"bad"+i++);legacy(parent,pair[0],pair[1]);refuses(()->CameraEvidenceC9.admit(parent,io,false));ok(!new File(parent,CameraEvidenceC9.ROOT).exists(),"bad legacy never creates C9");}
    File oversized=new File(base,"oversized");File over=legacy(oversized,a,t);Files.write(new File(over,"attempt").toPath(),new byte[4097]);refuses(()->CameraEvidenceC9.admit(oversized,io,false));
    File extra=new File(base,"extra");File ex=legacy(extra,a,t);Files.writeString(new File(ex,"other").toPath(),"unexpected");refuses(()->CameraEvidenceC9.admit(extra,io,false));
    CameraEvidenceC9.bookkeeping(4096,CameraProofStore.EXPORT_BOOKKEEPING-4096);checks++;
    refuses(()->CameraEvidenceC9.bookkeeping(4096,CameraProofStore.EXPORT_BOOKKEEPING-4095));refuses(()->CameraEvidenceC9.bookkeeping(-1,0));refuses(()->CameraEvidenceC9.bookkeeping(Long.MAX_VALUE,1));
    ok(CameraEvidenceC9.LEGACY_OUTPUT_BYTES+CameraEvidenceExport.OUTPUT_LIMIT==1847893&&1847893<CameraProofStore.EXPORT_OUTPUT,"frozen two-output profile fits original saved allowance");
    ok(CameraProofStore.CAP==268435456&&CameraProofStore.CAMERA_CAP==234618880&&CameraProofStore.EXPORT_OUTPUT==16777216&&CameraProofStore.EXPORT_BOOKKEEPING==131072,"all aggregate and separate C8 reserves unchanged");
  }
  static final class Target implements CameraEvidenceExport.Destination{
    final ByteArrayOutputStream data=new ByteArrayOutputStream();int at;
    public long size(){return data.size();}public int write(byte[] b,int offset,int n){data.write(b,offset,n);return n;}
    public void sync(){}public void rewind(){at=0;}public int read(byte[] b){byte[] raw=data.toByteArray();if(at==raw.length)return -1;int n=Math.min(b.length,raw.length-at);System.arraycopy(raw,at,b,0,n);at+=n;return n;}
  }
  private static Map<String,byte[]> entries(){Map<String,byte[]> m=new LinkedHashMap<>();for(String s:CameraEvidenceExport.ROLES)m.put(s,utf("generated-"+s));m.put("manifest.json",utf("{}"));return m;}
  private static void limits()throws Exception{
    Map<String,byte[]> m=entries();Target small=new Target();CameraEvidenceExport.writeSaved(m,small,()->false);
    int padding=CameraEvidenceExport.OUTPUT_LIMIT-(int)small.size();m.put("raw.jpg",Arrays.copyOf(m.get("raw.jpg"),m.get("raw.jpg").length+padding));
    Target exact=new Target();CameraEvidenceExport.writeSaved(m,exact,()->false);ok(exact.size()==1048576,"C9 exact1MiB ZIP succeeds");
    m.put("raw.jpg",Arrays.copyOf(m.get("raw.jpg"),m.get("raw.jpg").length+1));Target overflow=new Target();refuses(()->CameraEvidenceExport.writeSaved(m,overflow,()->false));ok(overflow.size()<=1048576,"C9 header/central-directory bytes never exceed1MiB");
    Target shared=new Target();CameraEvidenceExport.write(m,shared,()->false);ok(shared.size()==1048577,"existing C8/shared writer retains16MiB behavior");
    Target cancelled=new Target();refuses(()->CameraEvidenceExport.writeSaved(entries(),cancelled,()->true));ok(cancelled.size()==0,"C9 cancel beforewrite");
  }
  private static void pins(File base)throws Exception{
    ok(CameraEvidenceExport.JOB.equals("21b9d32b-5f31-45ac-b453-2a261e9e9ccc"),"exact A6 job");
    ok(CameraEvidenceExport.JPEG.equals("f6557f45aa2188ae38f13ce886838ca3f6e13b0ad012cca96bbc8593a492cf19")&&CameraEvidenceExport.PREVIEW.equals("e1684cbf5d2fe39c304bb47d26cd60d3ed499b376066497df60ffbd7c6a38b63"),"exact original image pins");
    ok(CameraEvidenceExport.CAPTURE_SOURCE.equals("67b2e7bb9272e7a64a9380f18246d651dcdb3a12856b8b8964318821ccde0874")&&CameraEvidenceExport.CAPTURE_APK.equals("fea1596df345e7aa75ca47dc7004bbe322370cbdbb20e43c53b5e3fbd1958f6c"),"original capture provenance retained");
    CameraProofStore store=new CameraProofStore(new File(base,"store"),new CameraProofChecks.HostIO(),"a".repeat(64),PROCESS);
    for(String job:new String[]{CameraEvidenceC9.LEGACY_JOB,"76d28e3f-cdcd-4d1a-a86e-026e2568ce5e","78cf411b-25e1-4dc2-ac8d-80caaacb2de6","00000000-0000-0000-0000-000000000099"})refuses(()->store.savedEvidence(job));
    Map<String,byte[]> wrong=entries();wrong.remove("manifest.json");refuses(()->CameraEvidenceExport.entries(wrong,"a".repeat(64),"b".repeat(64))); // Real original bytes remain private.
  }
  public static void main(String[] args)throws Exception{File root=new File(args[0]);Files.createDirectories(root.toPath());journals(root);limits();pins(root);System.out.println("CameraEvidenceC9Checks assertions="+checks+"; generated only; no Android/SAF/original-photo export proof");}
}

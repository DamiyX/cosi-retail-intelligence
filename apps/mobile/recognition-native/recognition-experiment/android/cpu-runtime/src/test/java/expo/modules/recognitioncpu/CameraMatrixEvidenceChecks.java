package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixChecks.*;
public final class CameraMatrixEvidenceChecks {
  static class Destination implements CameraEvidenceExport.Destination {
    byte[] data=new byte[0];int at;boolean shortWrite,corrupt;
    public long size(){return data.length;}
    public int write(byte[] b,int off,int n){int count=shortWrite?Math.max(0,n-1):n;data=Arrays.copyOf(data,at+count);System.arraycopy(b,off,data,at,count);at+=count;return count;}
    public void sync(){}public void rewind(){at=0;}public int read(byte[] b){if(at==data.length)return -1;int n=Math.min(b.length,data.length-at);System.arraycopy(data,at,b,0,n);if(corrupt&&at==0)b[0]^=1;at+=n;return n;}
  }
  public static void main(String[] args)throws Exception{
    Path root=Path.of(args[0]);Files.createDirectories(root);Fixture f=new Fixture(root,"full");f.controls();for(Case c:CASES)if(!c.control())f.finish(c,false);f.matrix.seal();f.matrix.consumeExport();CameraMatrixEvidence export=new CameraMatrixEvidence(f.matrix,c->f.camera.matrixEvidence(c),CameraMatrixSource.SHA256,APK);Destination dest=new Destination();Map<String,Object> result=export.write(dest,()->false);ok(result.get("status").equals("READBACK_VERIFIED"),"actual stream readback");ok(((Integer)result.get("outputEntries"))==124,"exact124 entries");
    Set<String> names=new HashSet<>();try(ZipInputStream z=new ZipInputStream(new ByteArrayInputStream(dest.data))){ZipEntry e;while((e=z.getNextEntry())!=null){ok(names.add(e.getName()),"unique entry");ok(e.getMethod()==ZipEntry.STORED&&e.getExtra()==null,"stored, no extras");ok(e.getName().length()<=96&&!e.getName().contains(".."),"bounded names");z.readAllBytes();}}
    ok(names.contains("M00-A000/raw.jpg")&&names.contains("run/D03-RESTORED-AFTER-L04.permission")&&!names.stream().anyMatch(n->n.contains(CameraEvidenceExport.JOB)),"all and only new finite evidence");
    no("nonempty overwrite",()->export.write(dest,()->false));Destination shortDest=new Destination();shortDest.shortWrite=true;no("partial provider",()->export.write(shortDest,()->false));Destination corrupt=new Destination();corrupt.corrupt=true;no("readback corruption",()->export.write(corrupt,()->false));no("cancel before write",()->export.write(new Destination(),()->true));no("one export intent",()->f.matrix.consumeExport());
    CameraMatrixEvidence changed=new CameraMatrixEvidence(f.matrix,c->f.camera.matrixEvidence(c),CameraMatrixSource.SHA256,APK);Case last=CASES.get(11);Path jpg=root.resolve("full/camera/"+last.job+".raw.jpg");byte[] raw=Files.readAllBytes(jpg);raw[0]^=1;Files.write(jpg,raw);no("profile substitution after preparation",()->changed.write(new Destination(),()->false));
    long P=JPEG+262144+2*65536+4*4096,D=5*4096,S=P+3*4096;long payload=8*P+4*D+24*4096+8*4096+4096+16384+3*4096+4096+8192+65536+(S-P);ok(payload+128*1024+22==87629846&&payload+128*1024+22<=OUTPUT,"independent worst stop ZIP size");ok(8*10+4*9+8+3==127,"one terminal exception entry ceiling");ok(4096+16384+24*4096+8*4096+3*4096+2*4096+4096+4096==180224&&180224<=BOOK,"all records plus one serialized temp");
    System.out.println("CameraMatrixEvidenceChecks assertions="+count+"; generated ZIP/provider faults, not SAF/original-photo proof");
  }
}

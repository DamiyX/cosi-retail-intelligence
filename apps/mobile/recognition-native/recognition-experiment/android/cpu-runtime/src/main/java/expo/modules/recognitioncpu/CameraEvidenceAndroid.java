package expo.modules.recognitioncpu;

import android.content.Context;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.system.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.BooleanSupplier;

/** New saved-generated-job export path only; no capture, decoder, model or bridge bytes. */
public final class CameraEvidenceAndroid {
  private final Context context;private final CameraProofFiles files;private final CameraProofStore store;
  private CameraEvidenceJournal journal;private Map<String,byte[]> entries;
  private final String source,apk;
  public CameraEvidenceAndroid(Context context)throws Exception{
    CameraEvidenceExport.require(CameraProofAndroid.enabled(context),"VARIANT");this.context=context;files=new CameraProofFiles(context);
    source=CameraEvidenceExportSource.SHA256;CameraEvidenceExport.require(source.matches("[a-f0-9]{64}"),"UNBOUND_SOURCE");
    File installed=new File(context.getApplicationInfo().sourceDir);MessageDigest digest=MessageDigest.getInstance("SHA-256");
    try(InputStream in=new FileInputStream(installed)){byte[] b=new byte[8192];long total=0;int n;while((n=in.read(b))!=-1){total+=n;CameraEvidenceExport.require(total<=64L*1024*1024,"APK_BOUND");digest.update(b,0,n);}}
    StringBuilder h=new StringBuilder();for(byte b:digest.digest())h.append(String.format(java.util.Locale.ROOT,"%02x",b&255));apk=h.toString();
    store=new CameraProofStore(new File(context.getFilesDir().getCanonicalFile(),"camera-proof-v1"),files,CameraProofSource.SHA256,CameraProofLifecycle.PROCESS);
  }
  public void consume()throws Exception{
    CameraEvidenceExport.require(journal==null&&entries==null,"ATTEMPT_CONSUMED");
    entries=CameraEvidenceExport.entries(store.savedEvidence(CameraEvidenceExport.JOB),source,apk);
    File root=files.newC9ExportRoot();journal=new CameraEvidenceJournal(root,files);journal.consume(java.util.UUID.randomUUID().toString(),source,apk);
  }
  public void terminal(String status)throws IOException{CameraEvidenceExport.require(journal!=null,"NO_ATTEMPT");journal.terminal(status);entries=null;}
  public Map<String,Object> write(Uri uri,BooleanSupplier cancelled)throws Exception{
    CameraEvidenceExport.require(uri!=null&&uri.getUserInfo()==null&&uri.getQuery()==null&&uri.getFragment()==null&&DocumentsContract.isDocumentUri(context,uri)&&CameraEvidenceExport.localDocument(uri.getScheme(),uri.getAuthority(),DocumentsContract.getDocumentId(uri)),"DESTINATION");
    CameraEvidenceExport.require(journal!=null&&entries!=null&&!cancelled.getAsBoolean(),"CANCELLED");
    // Revalidate original profile before touching a destination; bytes remain immutable.
    Map<String,byte[]> current=CameraEvidenceExport.entries(store.savedEvidence(CameraEvidenceExport.JOB),source,apk);
    for(String role:current.keySet())CameraEvidenceExport.require(Arrays.equals(current.get(role),entries.get(role)),"ORIGINAL_CHANGED");
    Map<String,Object> result;
    // rw never requests truncation; selected nonempty/pipe/nonseekable files refuse.
    try(ParcelFileDescriptor p=context.getContentResolver().openFileDescriptor(uri,"rw")){
      CameraEvidenceExport.require(p!=null,"DESTINATION_OPEN");java.io.FileDescriptor fd=p.getFileDescriptor();StructStat before=Os.fstat(fd);
      CameraEvidenceExport.require(OsConstants.S_ISREG(before.st_mode)&&before.st_nlink==1&&before.st_size==0,"DESTINATION_NONEMPTY_OR_TYPE");
      Os.lseek(fd,0,OsConstants.SEEK_SET);
      result=CameraEvidenceExport.writeSaved(entries,new CameraEvidenceExport.Destination(){
        private void identity()throws Exception{StructStat s=Os.fstat(fd);CameraEvidenceExport.require(s.st_dev==before.st_dev&&s.st_ino==before.st_ino&&OsConstants.S_ISREG(s.st_mode)&&s.st_nlink==1,"DESTINATION_CHANGED");}
        public long size()throws Exception{identity();return Os.fstat(fd).st_size;}
        public int write(byte[] b,int at,int n)throws Exception{identity();return Os.write(fd,b,at,n);}
        public void sync()throws Exception{identity();Os.fsync(fd);}
        public void rewind()throws Exception{identity();Os.lseek(fd,0,OsConstants.SEEK_SET);}
        public int read(byte[] b)throws Exception{identity();int n=Os.read(fd,b,0,b.length);return n==0?-1:n;}
      },cancelled);
    }
    CameraEvidenceExport.require(!cancelled.getAsBoolean(),"CANCELLED");
    result.put("exporterSourceIndexSha256",source);result.put("exporterApkSha256",apk);return result;
  }
}

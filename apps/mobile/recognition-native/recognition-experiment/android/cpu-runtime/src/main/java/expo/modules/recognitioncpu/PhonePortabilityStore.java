package expo.modules.recognitioncpu;
import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.BooleanSupplier;
import org.json.JSONObject;

/** Separate PRIVATE bounded storage; never uses or weakens the generated cache. */
public final class PhonePortabilityStore {
  public static final String DIRECTORY="recognition-private-portability-v1";
  private final File root;private static final Object MUTEX=new Object();
  public interface Task<T>{T run()throws Exception;}
  private static void check(boolean b,String why){PhonePortabilityJson.require(b,why);}
  public PhonePortabilityStore(Context context)throws Exception {
    check(context.getPackageName().equals(GeneratedEvidenceStore.PACKAGE),"PRIVATE_OWNER_PACKAGE");File parent=context.getFilesDir().getCanonicalFile();root=new File(parent,DIRECTORY);check(root.getCanonicalFile().equals(root.getAbsoluteFile()),"PRIVATE_ROOT_LINK");
    synchronized(MUTEX){boolean fresh=false;if(!root.exists()){check(root.mkdir(),"PRIVATE_ROOT_CREATE");fresh=true;}check(root.isDirectory(),"PRIVATE_ROOT_TYPE");
      if(!fresh){verifyOwner();}
      final boolean created=fresh;lock(()->{
        byte[] expected=(GeneratedEvidenceStore.PACKAGE+"\n"+DIRECTORY+"\n1").getBytes(StandardCharsets.UTF_8);
        if(created){File marker=owned("owner.dat");check(marker.createNewFile(),"PRIVATE_OWNER_EXISTS");try(FileOutputStream out=new FileOutputStream(marker)){out.write(expected);out.flush();out.getFD().sync();}writeJournal(10000,-1,0);}
        else {verifyOwner();readJournal();}
        return null;
      });}

  }
  private void verifyOwner()throws Exception {
    byte[] expected=(GeneratedEvidenceStore.PACKAGE+"\n"+DIRECTORY+"\n1").getBytes(StandardCharsets.UTF_8);File marker=owned("owner.dat");check(marker.length()==expected.length,"PRIVATE_OWNER_MARKER_SIZE");try(InputStream in=new FileInputStream(marker)){byte[] raw=new byte[expected.length];new DataInputStream(in).readFully(raw);check(in.read()==-1&&Arrays.equals(expected,raw),"PRIVATE_OWNER_MARKER");}
  }
  public File owned(String name)throws Exception {
    check(Arrays.asList("owner.dat","requests.dat","packet.zip","result.zip","result-index.json","packet-index.json","packet-stage.zip","result-stage.zip","store.lock").contains(name),"PRIVATE_FILE_NAME");check(root.getCanonicalFile().equals(root.getAbsoluteFile()),"PRIVATE_ROOT_LINK");File base=new File(root,name);
    for(String suffix:new String[]{"",".new",".bak"}){File f=new File(root,name+suffix);check(f.getCanonicalFile().equals(f.getAbsoluteFile()),"PRIVATE_FILE_LINK");if(f.exists())check(f.isFile()&&f.length()<=PhonePortabilityZip.MAX_PACKET,"PRIVATE_FILE_BOUND");}return base;
  }
  public <T>T lock(Task<T> task)throws Exception {synchronized(MUTEX){try(RandomAccessFile file=new RandomAccessFile(owned("store.lock"),"rw");FileLock held=file.getChannel().lock()){return task.run();}}}
  private void writeSmall(String name,byte[] data)throws Exception {check(data.length<=2*1024*1024,"PRIVATE_METADATA_BOUND");File f=owned(name);AtomicFile a=new AtomicFile(f);FileOutputStream out=a.startWrite();try{out.write(data);out.flush();out.getFD().sync();a.finishWrite(out);check(Arrays.equals(data,readSmall(name)),"PRIVATE_COMMIT_READBACK");}catch(Exception e){a.failWrite(out);throw e;}}
  private byte[] readSmall(String name)throws Exception {File f=owned(name);check((f.exists()||new File(f.getPath()+".bak").exists()),"PRIVATE_METADATA_SIZE");try(InputStream in=new AtomicFile(f).openRead()){ByteArrayOutputStream b=new ByteArrayOutputStream();byte[] chunk=new byte[8192];int n;while((n=in.read(chunk))!=-1){check(b.size()+n<=2*1024*1024,"PRIVATE_METADATA_BOUND");b.write(chunk,0,n);}check(b.size()>0,"PRIVATE_METADATA_EMPTY");return b.toByteArray();}}
  private void writeJournal(int next,int pending,int purpose)throws Exception {Map<String,Object> m=new LinkedHashMap<>();m.put("next",next);m.put("pending",pending);m.put("purpose",purpose);byte[] b=new JSONObject(m).toString().getBytes(StandardCharsets.UTF_8);ByteArrayOutputStream out=new ByteArrayOutputStream();DataOutputStream d=new DataOutputStream(out);d.writeInt(b.length);d.write(b);d.writeUTF(GeneratedEvidenceStore.hash(b));writeSmall("requests.dat",out.toByteArray());}
  private int[] readJournal()throws Exception {DataInputStream in=new DataInputStream(new ByteArrayInputStream(readSmall("requests.dat")));int n=in.readInt();check(n>0&&n<=512,"PRIVATE_JOURNAL_SIZE");byte[] b=new byte[n];in.readFully(b);check(GeneratedEvidenceStore.hash(b).equals(in.readUTF())&&in.read()==-1,"PRIVATE_JOURNAL_HASH");Map<String,Object> m=PhonePortabilityJson.object(PhonePortabilityJson.parse(b));int next=PhonePortabilityJson.integer(m.get("next"),23001);Object p=m.get("pending");check(p instanceof Long&&((Long)p)>=-1&&((Long)p)<=23000,"PRIVATE_JOURNAL_PENDING");check(m.keySet().equals(new HashSet<>(Arrays.asList("next","pending","purpose"))),"PRIVATE_JOURNAL_KEYS");int pending=((Long)p).intValue(),purpose=PhonePortabilityJson.integer(m.get("purpose"),2);check(next>=10000&&(pending==-1||(pending>=10000&&pending<next))&&(pending==-1?purpose==0:purpose==1||purpose==2),"PRIVATE_JOURNAL_VALUE");return new int[]{next,pending,purpose};}
  public int reserve(int purpose)throws Exception{return lock(()->{int[] s=readJournal();check(s[0]<=23000&&s[1]==-1&&(purpose==1||purpose==2),"PRIVATE_REQUEST_EXHAUSTED_OR_ORPHAN");writeJournal(s[0]+1,s[0],purpose);return s[0];});}
  public boolean abandon()throws Exception{return lock(()->{int[] s=readJournal();if(s[1]==-1)return false;writeJournal(s[0],-1,0);return true;});}
  public void finish(int code)throws Exception{lock(()->{int[] s=readJournal();if(s[1]==code)writeJournal(s[0],-1,0);return null;});}
  public Map<String,Object> importPacket(InputStream input,BooleanSupplier cancelled)throws Exception {
    return lock(()->{File stage=owned("packet-stage.zip");long size=0;
      try(FileOutputStream out=new FileOutputStream(stage)){byte[] b=new byte[8192];int n;while((n=input.read(b))!=-1){check(!cancelled.getAsBoolean(),"IMPORT_CANCELLED");size+=n;check(size<=PhonePortabilityZip.MAX_PACKET,"IMPORT_PACKET_BOUND");out.write(b,0,n);}out.flush();out.getFD().sync();}
      PhonePortabilityPacket candidate=new PhonePortabilityPacket(stage);check(!cancelled.getAsBoolean(),"IMPORT_CANCELLED");commit("packet.zip",stage,cancelled);PhonePortabilityPacket saved=packet();check(saved.packetSha256.equals(candidate.packetSha256),"IMPORT_READBACK");
      Map<String,Object> index=new LinkedHashMap<>();index.put("kind","PRIVATE_PORTABILITY_IMPORTED_PACKET");index.put("manifestSha256",PhonePortabilityPins.MANIFEST_SHA);index.put("packetSha256",saved.packetSha256);index.put("packetBytes",size);index.put("records",40);writeSmall("packet-index.json",new JSONObject(index).toString().getBytes(StandardCharsets.UTF_8));return index;
    });
  }
  private void commit(String name,File stage,BooleanSupplier cancelled)throws Exception {
    AtomicFile atomic=new AtomicFile(owned(name));FileOutputStream out=atomic.startWrite();try(InputStream in=new FileInputStream(stage)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){check(!cancelled.getAsBoolean(),"PRIVATE_COMMIT_CANCELLED");out.write(b,0,n);}out.flush();out.getFD().sync();check(!cancelled.getAsBoolean(),"PRIVATE_COMMIT_CANCELLED");atomic.finishWrite(out);}catch(Exception e){atomic.failWrite(out);throw e;}
  }

  private File restore(String name)throws Exception {File f=owned(name);try(InputStream in=new AtomicFile(f).openRead()){check(in.read()!=-1,"PRIVATE_EMPTY_COMMIT");}return f;}
  public PhonePortabilityPacket packet()throws Exception{return new PhonePortabilityPacket(restore("packet.zip"));}
  public FileOutputStream beginResult()throws Exception {return new FileOutputStream(owned("result-stage.zip"));}
  public void abortResult(FileOutputStream out)throws Exception {out.close();}
  public Map<String,Object> finishResult(FileOutputStream out,Map<String,Object> summary)throws Exception {
    return lock(()->{out.flush();out.getFD().sync();out.close();File stage=owned("result-stage.zip");PhonePortabilityPacket p=packet();Map<String,Object> receipt=PhonePortabilityResult.validate(stage,p);String hash=PhonePortabilityPacket.hashFile(stage);long size=stage.length();commit("result.zip",stage,()->false);File f=owned("result.zip");check(PhonePortabilityPacket.hashFile(f).equals(hash)&&f.length()==size,"RESULT_READBACK");PhonePortabilityResult.validate(f,p);
      summary.put("kind","PRIVATE_PHONE_PORTABILITY_RESULTS");summary.put("manifestSha256",PhonePortabilityPins.MANIFEST_SHA);summary.put("replaySourceSha256",PhonePortabilitySource.SHA256);summary.put("packetSha256",p.packetSha256);summary.put("bundleBytes",size);summary.put("bundleSha256",hash);summary.put("durable",true);summary.put("lanes",receipt.get("lanes"));writeSmall("result-index.json",new JSONObject(summary).toString().getBytes(StandardCharsets.UTF_8));return summary;});
  }
  public Map<String,Object> recover()throws Exception{return lock(this::recoverUnlocked);}
  private Map<String,Object> recoverUnlocked()throws Exception {Map<String,Object> r=new LinkedHashMap<>();r.put("kind","PRIVATE_PORTABILITY_STATE");r.put("ready",false);PhonePortabilityPacket p=null;
    if(owned("packet.zip").exists()||new File(owned("packet.zip").getPath()+".bak").exists()){p=packet();r.put("ready",true);r.put("packetSha256",p.packetSha256);r.put("records",40);}
    if(owned("result-index.json").exists()||new File(owned("result-index.json").getPath()+".bak").exists()){
      Map<String,Object> index=PhonePortabilityJson.object(PhonePortabilityJson.parse(readSmall("result-index.json")));File f=restore("result.zip");check(p!=null&&p.packetSha256.equals(index.get("packetSha256"))&&"PRIVATE_PHONE_PORTABILITY_RESULTS".equals(index.get("kind"))&&PhonePortabilityPins.MANIFEST_SHA.equals(index.get("manifestSha256"))&&PhonePortabilitySource.SHA256.equals(index.get("replaySourceSha256"))&&PhonePortabilityPacket.hashFile(f).equals(index.get("bundleSha256"))&&PhonePortabilityResult.number(index.get("bundleBytes"))==f.length()&&Boolean.TRUE.equals(index.get("durable")),"RESULT_CACHE_HASH_OR_STALE");
      Map<String,Object> receipt=PhonePortabilityResult.validate(f,p);PhonePortabilityResult.equal(receipt.get("lanes"),index.get("lanes"));r.put("result",index);
    }return r;}
  public void export(OutputStream out,String expectedHash,BooleanSupplier cancelled)throws Exception {lock(()->{File f=owned("result.zip");Map<String,Object> recovered=recoverUnlocked();Map<String,Object> index=PhonePortabilityJson.object(recovered.get("result"));check(expectedHash.equals(index.get("bundleSha256")),"EXPORT_RESULT_HASH");java.security.MessageDigest digest=java.security.MessageDigest.getInstance("SHA-256");long count=0;try(InputStream in=new FileInputStream(f)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){check(!cancelled.getAsBoolean(),"EXPORT_CANCELLED");count+=n;check(count<=PhonePortabilityResult.MAX_BYTES,"EXPORT_BOUND");digest.update(b,0,n);out.write(b,0,n);}}check(!cancelled.getAsBoolean()&&count==f.length(),"EXPORT_CANCELLED_OR_CHANGED");StringBuilder hash=new StringBuilder();for(byte b:digest.digest())hash.append(String.format(Locale.ROOT,"%02x",b&255));check(expectedHash.equals(hash.toString()),"EXPORT_READBACK_HASH");out.flush();return null;});}
}

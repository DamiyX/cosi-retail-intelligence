package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.function.BooleanSupplier;

/** Fixed generated-test evidence only. Atomic I/O supplied by Android or host tests. */
public final class GeneratedEvidenceStore {
  public static final String PACKAGE="com.damiyx.retailintelligence.recognitionverification";
  public static final String DIRECTORY="recognition-generated-evidence-lifecycle-v1";
  public static final int MAX_ZIP=48*1024*1024, MAX_META=262144, FIRST_REQUEST=40000;
  private static final int MAGIC=0x47455631;
  private static final Object PROCESS_LOCK=new Object();
  public interface AtomicIO {
    FileInputStream read(File base) throws IOException;
    FileOutputStream begin(File base) throws IOException;
    void commit(File base,FileOutputStream out) throws IOException;
    void fail(File base,FileOutputStream out);
  }
  public interface Validator { void validate(byte[] zip,byte[] metadata) throws Exception; }
  public static final class Evidence {
    public final String sha256; public final int bytes; public final byte[] metadata;
    Evidence(String sha,int bytes,byte[] meta){sha256=sha;this.bytes=bytes;metadata=meta;}
  }
  private final File directory;
  private final AtomicIO io;
  private final Validator validator;
  private final String sourcePin,specPin,recipe;
  private interface Work<T>{T run() throws Exception;}
  private static void check(boolean ok,String reason){if(!ok)throw new IllegalStateException(reason);}
  public static String hash(byte[] b) throws Exception {
    byte[] digest=MessageDigest.getInstance("SHA-256").digest(b);StringBuilder s=new StringBuilder();
    for(byte v:digest)s.append(String.format(java.util.Locale.ROOT,"%02x",v&255));return s.toString();
  }
  public GeneratedEvidenceStore(File privateFiles,String packageName,String sourcePin,String specPin,String recipe,AtomicIO io,Validator validator) throws Exception {
    check(PACKAGE.equals(packageName),"GENERATED_STORE_PACKAGE");
    check(sourcePin.matches("[a-f0-9]{64}")&&specPin.matches("[a-f0-9]{64}")&&recipe.length()<=128,"GENERATED_STORE_PINS");
    this.io=io;this.validator=validator;this.sourcePin=sourcePin;this.specPin=specPin;this.recipe=recipe;
    File parent=privateFiles.getCanonicalFile();check(parent.isDirectory(),"GENERATED_PRIVATE_FILES");directory=new File(parent,DIRECTORY);
    check(directory.getCanonicalFile().equals(directory.getAbsoluteFile()),"GENERATED_DIRECTORY_LINK");
    synchronized(PROCESS_LOCK) {
      boolean created=false;
      if(!directory.exists()){check(directory.mkdir(),"GENERATED_DIRECTORY_CREATE");created=true;}
      check(directory.isDirectory(),"GENERATED_DIRECTORY_TYPE");
      if(!created) {
        // Immutable owner marker is checked without AtomicFile recovery/cleanup first.
        try(DataInputStream in=new DataInputStream(new FileInputStream(owned("owner.dat")))) {
          check(Arrays.equals(smallBody(in),(PACKAGE+"\n"+DIRECTORY+"\n1").getBytes(StandardCharsets.UTF_8)),"GENERATED_OWNER_MISMATCH");
        }
      }
      final boolean first=created;
      locked(()->{
        if(first) {
          writeSmall("owner.dat",(PACKAGE+"\n"+DIRECTORY+"\n1").getBytes(StandardCharsets.UTF_8));
          writeCounter(FIRST_REQUEST,-1);
        } else {
          check(Arrays.equals(readSmall("owner.dat"), (PACKAGE+"\n"+DIRECTORY+"\n1").getBytes(StandardCharsets.UTF_8)),"GENERATED_OWNER_MISMATCH");
          readCounter(); // Missing/corrupt sequence never silently resets IDs.
        }
        return null;
      });
    }
  }
  private File owned(String name) throws Exception {
    check(Arrays.asList("owner.dat","requests.dat","completed.dat","store.lock").contains(name),"GENERATED_OWNED_NAME");
    check(directory.getCanonicalFile().equals(directory.getAbsoluteFile()),"GENERATED_DIRECTORY_LINK");
    File base=new File(directory,name);
    for(String suffix:new String[]{"",".new",".bak"}) {
      File f=new File(directory,name+suffix);check(f.getCanonicalFile().equals(f.getAbsoluteFile()),"GENERATED_FILE_LINK");
      if(f.exists())check(f.isFile()&&f.length()<=MAX_ZIP+MAX_META+4096L,"GENERATED_OWNED_FILE_BOUND");
    }
    return base;
  }
  private <T>T locked(Work<T> work) throws Exception {
    synchronized(PROCESS_LOCK) {
      File lock=owned("store.lock");
      try(RandomAccessFile file=new RandomAccessFile(lock,"rw");FileLock held=file.getChannel().lock()){return work.run();}
    }
  }
  private void writeSmall(String name,byte[] body) throws Exception {
    check(body.length<=512,"GENERATED_SMALL_BOUND");File f=owned(name);FileOutputStream raw=io.begin(f);
    try {DataOutputStream out=new DataOutputStream(raw);out.writeInt(body.length);out.write(body);out.writeUTF(hash(body));out.flush();raw.getFD().sync();io.commit(f,raw);check(Arrays.equals(body,readSmall(name)),"GENERATED_SMALL_COMMIT_READBACK");}
    catch(Exception e){io.fail(f,raw);throw e;}
  }
  private byte[] readSmall(String name) throws Exception {
    try(DataInputStream in=new DataInputStream(io.read(owned(name)))) {return smallBody(in);}
  }
  private byte[] smallBody(DataInputStream in) throws Exception {
      int size=in.readInt();check(size>0&&size<=512,"GENERATED_SMALL_SIZE");byte[] b=new byte[size];in.readFully(b);
      check(hash(b).equals(in.readUTF())&&in.read()==-1,"GENERATED_SMALL_HASH");return b;
  }
  private int[] readCounter() throws Exception {
    byte[] b=readSmall("requests.dat");check(b.length==8,"GENERATED_COUNTER_SIZE");DataInputStream in=new DataInputStream(new ByteArrayInputStream(b));int next=in.readInt(),pending=in.readInt();
    check(next>=FIRST_REQUEST&&next<=65536&&(pending==-1||(pending>=FIRST_REQUEST&&pending<next)),"GENERATED_COUNTER_VALUE");return new int[]{next,pending};
  }
  private void writeCounter(int next,int pending) throws Exception {
    ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(bytes);out.writeInt(next);out.writeInt(pending);writeSmall("requests.dat",bytes.toByteArray());
  }
  public int reserveRequest() throws Exception {
    return locked(()->{int[] state=readCounter();check(state[0]<=65535,"GENERATED_REQUEST_EXHAUSTED");check(state[1]==-1,"GENERATED_ORPHAN_REQUEST_REQUIRES_RECOVERY");int id=state[0];writeCounter(id+1,id);return id;});
  }
  public boolean abandonPending() throws Exception {
    return locked(()->{int[] s=readCounter();if(s[1]==-1)return false;writeCounter(s[0],-1);return true;});
  }
  public void finishRequest(int id) throws Exception {
    locked(()->{int[] s=readCounter();if(s[1]==id)writeCounter(s[0],-1);return null;});
  }
  public Evidence publish(byte[] zip,byte[] metadata) throws Exception {
    check(zip.length>0&&zip.length<=MAX_ZIP&&metadata.length>0&&metadata.length<=MAX_META,"GENERATED_PUBLICATION_BOUND");
    validator.validate(zip,metadata);String digest=hash(zip),metaHash=hash(metadata);
    return locked(()->{
      File f=owned("completed.dat");FileOutputStream raw=io.begin(f);
      try {
        DataOutputStream out=new DataOutputStream(raw);out.writeInt(MAGIC);out.writeUTF(PACKAGE);out.writeUTF(specPin);out.writeUTF(recipe);out.writeUTF(sourcePin);
        out.writeInt(zip.length);out.writeUTF(digest);out.writeInt(metadata.length);out.writeUTF(metaHash);out.write(metadata);out.write(zip);out.flush();raw.getFD().sync();io.commit(f,raw);
      } catch(Exception e){io.fail(f,raw);throw e;}
      Evidence saved=readEvidence();check(saved!=null&&saved.sha256.equals(digest)&&saved.bytes==zip.length&&Arrays.equals(saved.metadata,metadata),"GENERATED_COMMIT_READBACK");return saved;
    });
  }
  private Evidence header(DataInputStream in) throws Exception {
    check(in.readInt()==MAGIC&&in.readUTF().equals(PACKAGE)&&in.readUTF().equals(specPin)&&in.readUTF().equals(recipe)&&in.readUTF().equals(sourcePin),"GENERATED_CACHE_IDENTITY");
    int size=in.readInt();String zipHash=in.readUTF();int metaSize=in.readInt();String metaHash=in.readUTF();
    check(size>0&&size<=MAX_ZIP&&zipHash.matches("[a-f0-9]{64}")&&metaSize>0&&metaSize<=MAX_META,"GENERATED_CACHE_BOUND");
    byte[] metadata=new byte[metaSize];in.readFully(metadata);check(hash(metadata).equals(metaHash),"GENERATED_METADATA_HASH");return new Evidence(zipHash,size,metadata);
  }
  private Evidence readEvidence() throws Exception {
    File f=owned("completed.dat");if(!f.exists()&&!new File(directory,"completed.dat.bak").exists())return null;
    try(DataInputStream in=new DataInputStream(io.read(f))) {
      Evidence e=header(in);byte[] zip=new byte[e.bytes];in.readFully(zip);check(in.read()==-1&&hash(zip).equals(e.sha256),"GENERATED_CACHE_HASH");validator.validate(zip,e.metadata);return e;
    }
  }
  public Evidence recover() throws Exception {return locked(this::readEvidence);}
  public void copyTo(OutputStream destination,Evidence expected,BooleanSupplier cancelled) throws Exception {
    locked(()->{
      try(DataInputStream in=new DataInputStream(io.read(owned("completed.dat")))) {
        Evidence e=header(in);check(e.sha256.equals(expected.sha256)&&e.bytes==expected.bytes&&Arrays.equals(e.metadata,expected.metadata),"GENERATED_EXPORT_IDENTITY");
        MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] b=new byte[8192];int remaining=e.bytes;
        while(remaining>0){check(!cancelled.getAsBoolean(),"GENERATED_EXPORT_CANCELLED");int n=in.read(b,0,Math.min(b.length,remaining));check(n>0,"GENERATED_EXPORT_TRUNCATED");digest.update(b,0,n);destination.write(b,0,n);remaining-=n;}
        check(in.read()==-1,"GENERATED_EXPORT_TRAILING");check(hashDigest(digest.digest()).equals(e.sha256)&&!cancelled.getAsBoolean(),"GENERATED_EXPORT_HASH_OR_CANCEL");destination.flush();
      }
      return null;
    });
  }
  private static String hashDigest(byte[] digest){StringBuilder s=new StringBuilder();for(byte b:digest)s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
}

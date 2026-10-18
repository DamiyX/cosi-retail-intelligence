package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

/** Real host files/recreation tests; Android AtomicFile/JSON/picker remain separate. */
public final class GeneratedEvidenceChecks {
  private static int assertions;
  private static void ok(boolean b,String why){assertions++;if(!b)throw new AssertionError(why);}
  private interface Checked {void run() throws Exception;}
  private static void rejects(Checked c) throws Exception {boolean failed=false;try{c.run();}catch(Exception e){failed=true;}ok(failed,"expected explicit rejection");}
  private static final String PIN="b".repeat(64),SPEC=GeneratedImagePins.SPEC_SHA256,RECIPE=GeneratedImageGeometry.RECIPE;
  private static byte[] zip,meta;
  private static String zipHash,metaHash;
  private static final class HostAtomic implements GeneratedEvidenceStore.AtomicIO {
    boolean interrupt,loseCommit,halt;
    public FileInputStream read(File f)throws IOException {
      File staging=new File(f.getPath()+".new");if(staging.exists())Files.delete(staging.toPath());return new FileInputStream(f);
    }
    public FileOutputStream begin(File f)throws IOException{return new FileOutputStream(f.getPath()+".new");}
    public void commit(File f,FileOutputStream out)throws IOException {
      out.close();if(f.getName().equals("completed.dat")&&halt)Runtime.getRuntime().halt(13);
      if(interrupt&&f.getName().equals("completed.dat"))throw new IOException("interrupted before publication");
      if(loseCommit)return;
      Files.move(Path.of(f.getPath()+".new"),f.toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);
    }
    public void fail(File f,FileOutputStream out){try{out.close();Files.deleteIfExists(Path.of(f.getPath()+".new"));}catch(IOException ignored){}}
  }
  private static void validate(byte[] data,byte[] metadata)throws Exception {
    if(!GeneratedEvidenceStore.hash(data).equals(zipHash)||!GeneratedEvidenceStore.hash(metadata).equals(metaHash))throw new IllegalArgumentException("full fixture byte/hash identity");
    ok(true,"full fixture byte/hash identity");
    Set<String> names=new HashSet<>();int count=0;long total=0;
    try(ZipInputStream in=new ZipInputStream(new ByteArrayInputStream(data))){ZipEntry e;while((e=in.getNextEntry())!=null){ok(names.add(e.getName())&&!e.isDirectory()&&!e.getName().contains(".."),"unique generated path");byte[] b=in.readAllBytes();ok(b.length<=1048576,"entry bounded");total+=b.length;count++;}}
    ok(count==211&&total<=GeneratedEvidenceStore.MAX_ZIP,"complete 211-entry ZIP/CRC/bounds");
  }
  private static GeneratedEvidenceStore store(Path files,HostAtomic io)throws Exception {
    Files.createDirectories(files);return new GeneratedEvidenceStore(files.toFile(),GeneratedEvidenceStore.PACKAGE,PIN,SPEC,RECIPE,io,GeneratedEvidenceChecks::validate);
  }
  public static void main(String[] args)throws Exception {
    Path testRoot=Path.of(args[0]);zip=Files.readAllBytes(Path.of(args[1]));meta=Files.readAllBytes(Path.of(args[2]));zipHash=GeneratedEvidenceStore.hash(zip);metaHash=GeneratedEvidenceStore.hash(meta);
    if(args.length>3&&args[3].equals("halt")){HostAtomic io=new HostAtomic();GeneratedEvidenceStore s=store(testRoot,io);io.halt=true;s.publish(zip,meta);throw new AssertionError("halt missed");}
    HostAtomic io=new HostAtomic();GeneratedEvidenceStore a=store(testRoot.resolve("reopen"),io);ok(a.recover()==null,"empty cache never pretends complete");
    GeneratedEvidenceStore.Evidence saved=a.publish(zip,meta);ok(saved.bytes==zip.length&&saved.sha256.equals(zipHash),"committed publication exact");
    GeneratedEvidenceStore b=store(testRoot.resolve("reopen"),new HostAtomic());GeneratedEvidenceStore.Evidence restored=b.recover();ok(restored.sha256.equals(saved.sha256)&&Arrays.equals(restored.metadata,saved.metadata),"new instance recovers same completed result");
    ByteArrayOutputStream exported=new ByteArrayOutputStream();b.copyTo(exported,restored,()->false);ok(Arrays.equals(exported.toByteArray(),zip),"full export equality after reconstruction");
    rejects(()->b.copyTo(new ByteArrayOutputStream(),restored,()->true));
    ByteArrayOutputStream partial=new ByteArrayOutputStream();java.util.concurrent.atomic.AtomicInteger checks=new java.util.concurrent.atomic.AtomicInteger();
    rejects(()->b.copyTo(partial,restored,()->checks.incrementAndGet()>1));ok(partial.size()==8192&&partial.size()<zip.length,"partial cancelled copy never completes");
    int first=a.reserveRequest();ok(first==40000,"new request family starts outside consumed legacy ID");
    GeneratedEvidenceStore c=store(testRoot.resolve("reopen"),new HostAtomic());rejects(c::reserveRequest);ok(c.abandonPending(),"orphan classified without URI resume");
    int second=c.reserveRequest();ok(second>first,"durable ID never reused across instances");c.finishRequest(first);rejects(c::reserveRequest);c.finishRequest(second);
    int third=store(testRoot.resolve("reopen"),new HostAtomic()).reserveRequest();ok(third>second,"old finish cannot clear or rewind new request");c.finishRequest(third);
    GeneratedExportState oldModule=new GeneratedExportState(()->{try{return a.reserveRequest();}catch(Exception e){throw new IllegalStateException(e);}});GeneratedExportState.Ticket old=oldModule.begin(zip.length,zipHash);
    c.abandonPending();GeneratedExportState freshModule=new GeneratedExportState(()->{try{return c.reserveRequest();}catch(Exception e){throw new IllegalStateException(e);}});GeneratedExportState.Ticket fresh=freshModule.begin(zip.length,zipHash);
    ok(fresh.requestCode!=old.requestCode&&!freshModule.start(old)&&freshModule.start(fresh),"old callback ticket cannot match fresh module");ok(fresh.settle()&&!fresh.settle(),"one settlement");freshModule.finish(fresh);c.finishRequest(fresh.requestCode);
    io.interrupt=true;rejects(()->a.publish(zip,meta));ok(b.recover().sha256.equals(zipHash),"interrupted publication preserves last complete");io.interrupt=false;
    HostAtomic firstIO=new HostAtomic();GeneratedEvidenceStore firstPublish=store(testRoot.resolve("first-interruption"),firstIO);firstIO.interrupt=true;rejects(()->firstPublish.publish(zip,meta));ok(store(testRoot.resolve("first-interruption"),new HostAtomic()).recover()==null,"interrupted first publication is not complete");
    io.loseCommit=true;rejects(()->a.reserveRequest());io.loseCommit=false;ok(!a.abandonPending(),"failed readback never issues request ID");
    Path complete=testRoot.resolve("reopen").resolve(GeneratedEvidenceStore.DIRECTORY).resolve("completed.dat");byte[] envelope=Files.readAllBytes(complete);
    Files.write(complete,Arrays.copyOf(envelope,envelope.length-1));rejects(b::recover);Files.write(complete,envelope);
    byte[] corrupt=envelope.clone();corrupt[corrupt.length-1]^=1;Files.write(complete,corrupt);rejects(b::recover);Files.write(complete,envelope);
    corrupt=envelope.clone();corrupt[0]^=1;Files.write(complete,corrupt);rejects(b::recover);Files.write(complete,envelope);
    try(RandomAccessFile excessive=new RandomAccessFile(complete.toFile(),"rw")){excessive.setLength(GeneratedEvidenceStore.MAX_ZIP+GeneratedEvidenceStore.MAX_META+4097L);}rejects(b::recover);Files.write(complete,envelope);
    byte[] badMeta=meta.clone();badMeta[0]^=1;rejects(()->a.publish(zip,badMeta));
    GeneratedEvidenceStore stale=new GeneratedEvidenceStore(testRoot.resolve("reopen").toFile(),GeneratedEvidenceStore.PACKAGE,"c".repeat(64),SPEC,RECIPE,new HostAtomic(),GeneratedEvidenceChecks::validate);rejects(stale::recover);
    GeneratedEvidenceStore wrongSpec=new GeneratedEvidenceStore(testRoot.resolve("reopen").toFile(),GeneratedEvidenceStore.PACKAGE,PIN,"d".repeat(64),RECIPE,new HostAtomic(),GeneratedEvidenceChecks::validate);rejects(wrongSpec::recover);
    rejects(()->a.publish(new byte[GeneratedEvidenceStore.MAX_ZIP+1],meta));rejects(()->a.publish(zip,new byte[GeneratedEvidenceStore.MAX_META+1]));
    Path foreign=complete.getParent().resolve("unrelated.txt");Files.writeString(foreign,"preserve me");a.publish(zip,meta);ok(Files.readString(foreign).equals("preserve me"),"no unrelated cleanup");
    Path unknown=testRoot.resolve("unowned");Files.createDirectories(unknown.resolve(GeneratedEvidenceStore.DIRECTORY));Files.writeString(unknown.resolve(GeneratedEvidenceStore.DIRECTORY).resolve("unrelated.txt"),"original");rejects(()->store(unknown,new HostAtomic()));ok(!Files.exists(unknown.resolve(GeneratedEvidenceStore.DIRECTORY).resolve("store.lock")),"unowned directory not mutated");
    rejects(()->new GeneratedEvidenceStore(testRoot.resolve("reopen").toFile(),"other.package",PIN,SPEC,RECIPE,new HostAtomic(),GeneratedEvidenceChecks::validate));
    Path counter=complete.getParent().resolve("requests.dat");byte[] sequence=Files.readAllBytes(counter);Files.write(counter,new byte[]{1});rejects(()->store(testRoot.resolve("reopen"),new HostAtomic()));Files.write(counter,sequence);
    Path kill=testRoot.resolve("halt");store(kill,new HostAtomic()).publish(zip,meta);
    String java=Path.of(System.getProperty("java.home"),"bin","java.exe").toString();Process child=new ProcessBuilder(java,"-cp",System.getProperty("java.class.path"),GeneratedEvidenceChecks.class.getName(),kill.toString(),args[1],args[2],"halt").inheritIO().start();ok(child.waitFor()==13,"actual JVM interruption before atomic rename");
    ok(store(kill,new HostAtomic()).recover().sha256.equals(zipHash),"reopen after JVM interruption returns committed full bytes");
    System.out.println("Generated evidence persistence/callback host assertions PASS "+assertions+"; no Android/process-death acceptance");
  }
}

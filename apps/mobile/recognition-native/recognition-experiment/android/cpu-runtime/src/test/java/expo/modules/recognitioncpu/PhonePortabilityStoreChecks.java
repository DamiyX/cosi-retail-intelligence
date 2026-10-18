package expo.modules.recognitioncpu;
import android.content.Context;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/** Actual private-store Java exercised with generated packets and an explicitly emulated AtomicFile. */
public final class PhonePortabilityStoreChecks {
  private interface Work {void run()throws Exception;}
  private static int checks=0;
  private static void yes(boolean b){checks++;if(!b)throw new AssertionError("Store generated check "+checks);}
  private static void no(Work work)throws Exception {boolean rejected=false;try{work.run();}catch(Exception e){rejected=true;}yes(rejected);}
  public static void main(String[] args)throws Exception {
    File parent=new File(args[0]);yes(parent.mkdir());Context context=new Context(parent,GeneratedEvidenceStore.PACKAGE);PhonePortabilityStore store=new PhonePortabilityStore(context);
    int first=store.reserve(1);yes(first==10000);no(()->store.reserve(2));store.finish(first-1);no(()->store.reserve(1));
    PhonePortabilityStore restarted=new PhonePortabilityStore(context);yes(restarted.abandon());yes(!restarted.abandon());int next=restarted.reserve(2);yes(next==10001);restarted.finish(next);
    no(()->new PhonePortabilityStore(new Context(parent,"wrong.package")));no(()->restarted.owned("../elsewhere.zip"));
    try(InputStream in=new FileInputStream(args[1])){Map<String,Object> imported=restarted.importPacket(in,()->false);yes(imported.get("records").equals(40));}
    String hash=restarted.packet().packetSha256;
    try(InputStream in=new FileInputStream(args[1])){no(()->restarted.importPacket(in,()->true));}yes(restarted.packet().packetSha256.equals(hash));
    try(InputStream in=new ByteArrayInputStream(new byte[]{1,2,3})){no(()->restarted.importPacket(in,()->false));}yes(restarted.packet().packetSha256.equals(hash));
    FileOutputStream output=restarted.beginResult();try(InputStream in=new FileInputStream(args[2])){in.transferTo(output);}
    Map<String,Object> summary=new LinkedHashMap<>();summary.put("records",80);summary.put("attemptedInferences",80);summary.put("complete",true);summary.put("totalMs",80);
    Map<String,Object> saved=restarted.finishResult(output,summary);yes(Boolean.TRUE.equals(saved.get("durable")));
    PhonePortabilityStore reopened=new PhonePortabilityStore(context);yes(reopened.recover().containsKey("result"));
    ByteArrayOutputStream exported=new ByteArrayOutputStream();reopened.export(exported,(String)saved.get("bundleSha256"),()->false);yes(GeneratedEvidenceStore.hash(exported.toByteArray()).equals(saved.get("bundleSha256")));
    no(()->reopened.export(new ByteArrayOutputStream(),(String)saved.get("bundleSha256"),()->true));
    // An abandoned result stage never replaces the last acknowledged complete evidence.
    FileOutputStream partial=reopened.beginResult();partial.write(123);reopened.abortResult(partial);yes(reopened.recover().containsKey("result"));
    int orphan=reopened.reserve(2);yes(orphan==10002);
    File committed=reopened.owned("result.zip");try(RandomAccessFile corrupt=new RandomAccessFile(committed,"rw")){corrupt.seek(50);corrupt.write(255);}no(()->reopened.recover());yes(reopened.abandon());no(()->reopened.recover());int afterCorrupt=reopened.reserve(1);yes(afterCorrupt==10003);reopened.finish(afterCorrupt);
    File marker=reopened.owned("owner.dat");byte[] before=Files.readAllBytes(marker.toPath());try(FileOutputStream wrong=new FileOutputStream(marker)){wrong.write(0);}
    no(()->new PhonePortabilityStore(context));yes(Files.readAllBytes(marker.toPath()).length==1);Files.write(marker.toPath(),before);
    File journal=reopened.owned("requests.dat");try(FileOutputStream wrong=new FileOutputStream(journal)){wrong.write(0);}no(()->new PhonePortabilityStore(context));
    System.out.println("PASS "+checks+" generated store checks. AtomicFile is a host emulator; Android/device durability remains open.");
  }
}

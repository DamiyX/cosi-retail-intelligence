package expo.modules.recognitioncpu;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;
/** Restart state machine. Only the execution creating WRITE can obtain the ephemeral write permit. */
public final class CameraMatrixRecoveryEngine {
  public interface Archive {void serialize(OutputStream out,java.util.function.BooleanSupplier cancelled)throws Exception;Map<String,Object> write(CameraEvidenceExport.Destination out,java.util.function.BooleanSupplier cancelled)throws Exception;}
  public interface StreamSource {String fingerprint()throws Exception;Archive archive(String fingerprint)throws Exception;}
  /** Keep the V1 source signature readable by existing frozen consumers. */
  public interface Source extends StreamSource {CameraMatrixEvidence archive(String fingerprint)throws Exception;}
  public interface Output extends CameraEvidenceExport.Destination {Map<String,Object> identity()throws Exception;boolean grants(boolean writing)throws Exception;long available()throws Exception;}
  public static final class Expected {public final long bytes;public final String sha256;Expected(long bytes,String sha){this.bytes=bytes;sha256=sha;}}
  private final CameraMatrixRecoveryStore store;private final StreamSource source;private final Lane lane;
  public CameraMatrixRecoveryEngine(CameraMatrixRecoveryStore store,Source source,Lane lane){this(store,(StreamSource)source,lane);}
  public CameraMatrixRecoveryEngine(CameraMatrixRecoveryStore store,StreamSource source,Lane lane){this.store=store;this.source=source;this.lane=lane;}
  private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(Locale.ROOT,"%02x",v&255));return s.toString();}
  public static Expected expected(Archive archive,int cap)throws Exception{
    MessageDigest digest=MessageDigest.getInstance("SHA-256");long[] count={0};archive.serialize(new OutputStream(){public void write(int b)throws IOException{write(new byte[]{(byte)b},0,1);}public void write(byte[] b,int at,int n){requireRecovery(n>=0&&count[0]+n<=cap,"EXPECTED_CAP");count[0]+=n;digest.update(b,at,n);}},()->false);requireRecovery(count[0]>0,"EMPTY_ARCHIVE");return new Expected(count[0],hex(digest.digest()));
  }
  private String inputs()throws Exception{String expected=hash(store.payload("owner").get("inputs"));requireRecovery(expected.equals(source.fingerprint()),"INPUT_FINGERPRINT");return expected;}
  private void destination(Output out,boolean writing)throws Exception{
    Map<String,Object> destination=store.payload("destination");requireRecovery(fixedUri(lane,(String)destination.get("uri"))&&out.grants(writing),"DESTINATION_GRANT");requireRecovery(json(out.identity()).equals(json(destination.get("identity"))),"DESTINATION_IDENTITY");
  }
  public Map<String,Object> continueSelected(Output out)throws Exception{
    String state=store.state();if(state.equals("TERMINAL"))return store.status();if(state.equals("WRITE")||state.equals("VERIFIED"))return reconcile(out);
    requireRecovery(state.equals("DESTINATION"),"NO_SELECTED_OPERATION");destination(out,true);requireRecovery(out.size()==0,"DESTINATION_NONEMPTY");String fingerprint=inputs();Archive archive=source.archive(fingerprint);Expected expected=expected(archive,lane.outputCap);requireRecovery(out.available()>=expected.bytes+24L*1024*1024,"OUTPUT_FREE_SPACE");inputs();destination(out,true);requireRecovery(out.size()==0,"DESTINATION_CHANGED");
    CameraMatrixRecoveryStore.Permit permit=store.claimWrite(expected.bytes,expected.sha256,fingerprint);store.use(permit);
    // Any exception or death from here leaves WRITE consumed. No retry path calls this writer.
    CameraEvidenceExport.Destination bounded=new CameraEvidenceExport.Destination(){
      private long emitted;
      public long size()throws Exception{return out.size();}
      public int write(byte[] b,int at,int n)throws Exception{requireRecovery(n>=0&&emitted+n<=expected.bytes&&emitted+n<=lane.outputCap,"ACTUAL_OUTPUT_CAP");int count=out.write(b,at,n);requireRecovery(count>=0&&count<=n,"ACTUAL_WRITE_COUNT");emitted+=count;return count;}
      public void sync()throws Exception{out.sync();}public void rewind()throws Exception{out.rewind();}public int read(byte[] b)throws Exception{return out.read(b);}
    };
    Map<String,Object> result=archive.write(bounded,()->false);requireRecovery(number(result.get("bundleBytes"),1,lane.outputCap)==expected.bytes&&expected.sha256.equals(result.get("bundleSha256")),"WRITTEN_EXPECTATION");inputs();destination(out,true);store.verified(expected.bytes,expected.sha256,false);store.terminal("READBACK_VERIFIED","COMPLETE");return store.status();
  }
  public Map<String,Object> reconcile(Output out)throws Exception{
    String state=store.state();if(state.equals("TERMINAL"))return store.status();requireRecovery(state.equals("WRITE")||state.equals("VERIFIED"),"NO_CONSUMED_WRITE");destination(out,false);String fingerprint=inputs();Expected expected=expected(source.archive(fingerprint),lane.outputCap);Map<String,Object> claim=store.payload("write");requireRecovery(number(claim.get("bytes"),1,lane.outputCap)==expected.bytes&&expected.sha256.equals(claim.get("sha256"))&&fingerprint.equals(claim.get("inputs"))&&SERIALIZER.equals(claim.get("serializer")),"WRITE_EXPECTATION");
    if(out.size()!=expected.bytes){store.terminal("UNVERIFIED","EMPTY_OR_PARTIAL_OUTPUT");return store.status();}
    out.rewind();MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] b=new byte[8192];long count=0;int n;while((n=out.read(b))!=-1){requireRecovery(n>0&&n<=b.length&&count+n<=expected.bytes,"READBACK_BOUND");digest.update(b,0,n);count+=n;}destination(out,false);inputs();
    if(count!=expected.bytes||out.size()!=expected.bytes||!expected.sha256.equals(hex(digest.digest()))){store.terminal("UNVERIFIED","DIFFERENT_OUTPUT");return store.status();}
    if(state.equals("WRITE"))store.verified(expected.bytes,expected.sha256,true);else{Map<String,Object> verified=store.payload("verified");requireRecovery(number(verified.get("bytes"),1,lane.outputCap)==expected.bytes&&expected.sha256.equals(verified.get("sha256")),"VERIFIED_EXPECTATION");}
    store.terminal("READBACK_VERIFIED","RECONCILED_READ_ONLY");return store.status();
  }
  public static Source fixture(String source,String apk){hash(source);hash(apk);String inputs=CameraProofFrame.hash(bytes("P203_FIXED_RECOVERY_FIXTURE_V1:"+source+":"+apk));return new Source(){public String fingerprint(){return inputs;}public CameraMatrixEvidence archive(String expected)throws Exception{requireRecovery(inputs.equals(expected),"FIXTURE_INPUTS");return CameraMatrixEvidence.recoveryFixture(source,apk);}};}
}

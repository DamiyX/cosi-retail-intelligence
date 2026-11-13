package expo.modules.recognitioncpu;
import java.util.*;
import java.io.IOException;
/** Bounded observation of only the validated integration store; never mutates or adopts records. */
final class CameraIntegrationNamespace {
 interface Store {Set<String> names()throws Exception;long bytes(String name)throws Exception;}
 private static final Set<String> KNOWN=Set.of("intent","original.jpeg","crop.png","geometry","receipt","export-attempt","export-result","failure","cpu-intent","tensor.f32le","cpu-result","cpu-receipt");
 final List<String> leaves;final long bytes;final boolean initial;
 private CameraIntegrationNamespace(Set<String> names,long bytes){this.leaves=Collections.unmodifiableList(new ArrayList<>(new TreeSet<>(names)));this.bytes=bytes;initial=names.isEmpty();}
 static CameraIntegrationNamespace observe(Store store)throws Exception{
  Set<String> names=new HashSet<>(store.names());if(names.size()>12||!KNOWN.containsAll(names))throw new IOException("NAMESPACE_UNKNOWN");long total=0;
  for(String name:names){long n=store.bytes(name);if(n<1||n>67108864L-total)throw new IOException("NAMESPACE_SIZE");total+=n;}
  if(!names.equals(new HashSet<>(store.names())))throw new IOException("NAMESPACE_CHANGED");return new CameraIntegrationNamespace(names,total);
 }
 void requireInitial()throws IOException{if(!initial)throw new IOException("INTEGRATION_RECORD_ALREADY_PRESENT");}
 String summary(){return (initial?"INITIAL_ONLY: no capture, CPU or export records":"RECORDS_PRESENT: preserve existing attempt")+"; leaves="+leaves+"; count="+leaves.size()+"; bytes="+bytes+"; owner.lock excluded; initialization may create root/lock";}
}

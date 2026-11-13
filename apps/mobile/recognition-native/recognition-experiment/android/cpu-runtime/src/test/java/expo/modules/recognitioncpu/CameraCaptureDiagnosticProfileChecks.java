package expo.modules.recognitioncpu;
public class CameraCaptureDiagnosticProfileChecks {
 static int checks;interface Work{void run()throws Exception;}static void refuses(Work w){boolean b=false;try{w.run();}catch(Exception e){b=true;}if(!b)throw new AssertionError();checks++;}
 public static void main(String[]a)throws Exception{String sha="a".repeat(64);if(!CameraCaptureDiagnosticProfile.bound())throw new AssertionError();checks++;
 if(!CameraCaptureDiagnosticProfile.RETAINED_SHA256.equals("2af362b5900ee09b592a478ff3202c27e3459cd11be213f0ef558142ffb40c78"))throw new AssertionError();checks++;
 CameraCaptureDiagnosticProfile.admit(CameraCaptureDiagnosticProfile.RETAINED_SHA256,CameraCaptureDiagnosticProfile.RETAINED_SHA256,221227300L,0,true);checks++;
 refuses(()->CameraCaptureDiagnosticProfile.admit(sha,sha,CameraCaptureDiagnosticSession.CAP-CameraCaptureDiagnosticProfile.NEW_CLAIM+1,0,true));
 refuses(()->CameraCaptureDiagnosticProfile.admit("",sha,0,0,true));refuses(()->CameraCaptureDiagnosticProfile.admit(sha,"b".repeat(64),0,0,true));refuses(()->CameraCaptureDiagnosticProfile.admit(sha,sha,0,0,false));refuses(()->CameraCaptureDiagnosticProfile.admit(sha,sha,0,-1,true));refuses(()->CameraCaptureDiagnosticProfile.admit(sha,sha,0,30_000_000_000L,true));refuses(()->CameraCaptureDiagnosticProfile.admit(sha,sha,CameraCaptureDiagnosticSession.CAP,0,true));
 CameraCaptureDiagnosticProfile.admit(sha,sha,CameraCaptureDiagnosticProfile.RETAINED_CLAIM,29_999_999_999L,true);checks++;
 CameraProofStore.IO readOnly=new CameraProofStore.IO(){
 public void root(java.io.File f,boolean c){throw new AssertionError("MUTATION");}public void syncDirectory(java.io.File f){throw new AssertionError("MUTATION");}public java.util.List<String> list(java.io.File f){return java.util.Collections.emptyList();}public long size(java.io.File f){return f.getName().equals("large")?CameraCaptureDiagnosticSession.JPEG+1:3;}public byte[] read(java.io.File f,int cap){return new byte[]{1,2,3};}public void writeNew(java.io.File f,byte[]b){throw new AssertionError("WRITE");}public void publish(java.io.File f,java.io.File g){throw new AssertionError("PUBLISH");}public void writeAt(java.io.File f,int a,byte[]b){throw new AssertionError("WRITE");}public long available(java.io.File f){throw new AssertionError("UNNEEDED");}};
 java.util.Map<String,Object> metadata=CameraCaptureDiagnosticSnapshot.entry(new java.io.File("fixed"),"owner",readOnly);
 if(metadata.size()!=4||!metadata.get("sha256").equals(CameraCaptureDiagnosticSession.hash(new byte[]{1,2,3}))||metadata.values().stream().anyMatch(x->x instanceof byte[]))throw new AssertionError();checks++;
 refuses(()->CameraCaptureDiagnosticSnapshot.entry(new java.io.File("fixed"),"large",readOnly));refuses(()->CameraCaptureDiagnosticSnapshot.entry(new java.io.File("fixed"),"../outside",readOnly));refuses(()->CameraCaptureDiagnosticSnapshot.entry(new java.io.File("fixed"),"..",readOnly));
 System.out.println("PASS "+checks+" profile boundary checks; no physical evidence supplied");}
}

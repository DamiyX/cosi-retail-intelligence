package expo.modules.recognitioncpu;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Append-only owned evidence. IO enforces real regular files and exclusive publication. */
public final class CameraProofStore {
  public static final long CAP=256L*1024*1024;
  public static final int RECEIPT=65536, PREVIEW=262144, FAILURE=4096, MARKER=4096, REFUSALS=65536;
  // Both final and .new/.bak residue are charged. No draft 19/20-file assumption.
  public static final long RESERVATION=2L*(CameraProofFrame.JPEG_LIMIT+PREVIEW+2*RECEIPT+2*FAILURE+5*MARKER);
  public interface IO {
    void root(File root,boolean create)throws IOException;
    List<String> list(File root)throws IOException;
    long size(File file)throws IOException; // -1 absent; otherwise regular, single-link, canonical only
    byte[] read(File file,int cap)throws IOException;
    void writeNew(File file,byte[] bytes)throws IOException;
    void publish(File staged,File destination)throws IOException; // exclusive destination; retain failures
    void writeAt(File file,int offset,byte[] bytes)throws IOException; // must not grow a preallocated file
    long available(File root)throws IOException;
  }
  private final File root;private final IO io;private final String source,process;
  private final byte[] owner;
  public CameraProofStore(File root,IO io,String source,String process)throws IOException{
    CameraProofFrame.require(source.matches("[a-f0-9]{64}")&&process.matches("[a-f0-9-]{36}"),"CAMERA_STORE_BINDING");
    this.root=root;this.io=io;this.source=source;this.process=process;
    owner=bytes("CAMERA_PROOF_OWNED_V1\n"+source+"\n"+CameraProofFrame.MODEL+"\n"+CameraProofFrame.RECIPE+"\n");
    io.root(root,true);List<String> names=io.list(root);
    if(names.isEmpty()){
      CameraProofFrame.require(io.available(root)>=REFUSALS+owner.length,"CAMERA_LOW_DISK");
      io.writeNew(file("owner"),owner);io.writeNew(file("refusals"),new byte[REFUSALS]);
    }
    scan();
  }
  private File file(String n){return new File(root,n);}
  private static byte[] bytes(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private static String text(byte[] b){return new String(b,StandardCharsets.UTF_8);}
  private static boolean id(String s){return s.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}");}
  private static int maximum(String role){
    switch(role){case "raw.jpg":return CameraProofFrame.JPEG_LIMIT;case "preview.png":return PREVIEW;case "receipt.json":case "numerical.json":return RECEIPT;case "failure.json":case "interruption.json":return FAILURE;case "reservation":case "done":case "invalidated":case "request.json":case "resolution":return MARKER;default:throw new IllegalArgumentException("CAMERA_STORE_ROLE");}
  }
  private static String role(String name){String r=name.substring(37);if(r.endsWith(".new")||r.endsWith(".bak"))r=r.substring(0,r.length()-4);maximum(r);return r;}
  private static final class Group {final List<String> names=new ArrayList<>();long actual;boolean done;String resolution;}
  private static final class Usage {long actual,claimed;final Map<String,Group> groups=new TreeMap<>();}
  private Usage scan()throws IOException{
    io.root(root,false);CameraProofFrame.require(Arrays.equals(io.read(file("owner"),1024),owner)&&io.size(file("refusals"))==REFUSALS,"CAMERA_STORE_OWNER");
    validateRefusals(io.read(file("refusals"),REFUSALS));
    List<String> names=io.list(root);CameraProofFrame.require(names.size()<=2000,"CAMERA_STORE_FILE_COUNT");Usage u=new Usage();
    for(String n:names){
      long size=io.size(file(n));CameraProofFrame.require(size>=0,"CAMERA_STORE_CHANGED");u.actual=Math.addExact(u.actual,size);
      if(n.equals("owner")||n.equals("refusals")){u.claimed=Math.addExact(u.claimed,size);continue;}
      CameraProofFrame.require(n.length()>37&&n.charAt(36)=='.'&&id(n.substring(0,36)),"CAMERA_STORE_UNOWNED");
      String r=role(n);CameraProofFrame.require(size<=maximum(r),"CAMERA_STORE_FILE_CAP");
      Group g=u.groups.computeIfAbsent(n.substring(0,36),k->new Group());g.names.add(n);g.actual+=size;
    }
    CameraProofFrame.require(u.groups.size()<=115,"CAMERA_STORE_CAPTURE_COUNT");
    for(Map.Entry<String,Group> e:u.groups.entrySet()){
      Group g=e.getValue();g.done=g.names.contains(e.getKey()+".done");
      if(g.done)verifyDone(e.getKey(),g);
      if(g.names.contains(e.getKey()+".resolution"))g.resolution=verifyResolution(e.getKey(),g);
      u.claimed=Math.addExact(u.claimed,g.resolution!=null?g.actual:Math.max(RESERVATION,g.actual));
    }
    CameraProofFrame.require(u.actual<=CAP&&u.claimed<=CAP,"CAMERA_OWNED_CAP");return u;
  }
  private void verifyDone(String ticket,Group g)throws IOException{
    String marker=text(io.read(file(ticket+".done"),MARKER));String[] lines=marker.split("\n");
    CameraProofFrame.require(lines.length>=3&&lines[0].equals(source)&&lines[1].equals("CAMERA_DONE_V1"),"CAMERA_COMMIT_BINDING");
    Set<String> covered=new HashSet<>();
    for(int i=2;i<lines.length;i++){
      String[] pair=lines[i].split("=",-1);CameraProofFrame.require(pair.length==2&&pair[1].matches("[a-f0-9]{64}")&&covered.add(pair[0]),"CAMERA_COMMIT_FORMAT");
      int cap=maximum(pair[0]);String n=ticket+"."+pair[0];
      CameraProofFrame.require(g.names.contains(n)&&CameraProofFrame.hash(io.read(file(n),cap)).equals(pair[1]),"CAMERA_COMMIT_HASH");
    }
    CameraProofFrame.require(covered.contains("reservation")&&(covered.contains("receipt.json")||covered.contains("failure.json")||covered.contains("interruption.json")),"CAMERA_COMMIT_INCOMPLETE");
    reservation(ticket,false);completeProfile(covered);
    for(String n:g.names){String r=role(n);if(!n.equals(ticket+".done")&&!n.endsWith(".new")&&!n.endsWith(".bak")){
      if(r.equals("invalidated"))CameraProofFrame.require(Arrays.equals(io.read(file(n),MARKER),invalidation(ticket)),"CAMERA_INVALIDATION_BINDING");else if(!r.equals("resolution"))CameraProofFrame.require(covered.contains(r),"CAMERA_COMMIT_EXTRA");
    }}
  }
  private byte[] invalidation(String ticket){String body=source+"\n"+ticket+"\nCAMERA_INVALIDATED_V1\n";return bytes(body+CameraProofFrame.hash(bytes(body))+"\n");}
  private static boolean invalidated(String ticket,Group g){return g.names.contains(ticket+".invalidated")||g.names.contains(ticket+".invalidated.new")||g.names.contains(ticket+".invalidated.bak");}
  private byte[] resolution(String ticket,String outcome,String code)throws IOException{
    String body=source+"\nCAMERA_RESOLUTION_V1\n"+ticket+"\n"+process+"\n"+CameraProofFrame.hash(io.read(file(ticket+".done"),MARKER))+"\n"+outcome+"\n"+code+"\n";
    return bytes(body+CameraProofFrame.hash(bytes(body))+"\n");
  }
  private String verifyResolution(String ticket,Group g)throws IOException{
    CameraProofFrame.require(g.done,"CAMERA_RESOLUTION_WITHOUT_CANDIDATE");String[] r=text(io.read(file(ticket+".resolution"),MARKER)).split("\n");
    CameraProofFrame.require(r.length==8&&r[0].equals(source)&&r[1].equals("CAMERA_RESOLUTION_V1")&&r[2].equals(ticket)&&r[3].matches("[a-f0-9-]{36}")&&r[4].equals(CameraProofFrame.hash(io.read(file(ticket+".done"),MARKER)))&&Arrays.asList("PUBLISHED","FAILED","CANCELLED","INTERRUPTED").contains(r[5])&&r[6].matches("[A-Z0-9_]{1,100}"),"CAMERA_RESOLUTION_BINDING");
    String body=String.join("\n",Arrays.copyOf(r,7))+"\n";CameraProofFrame.require(r[7].equals(CameraProofFrame.hash(bytes(body))),"CAMERA_RESOLUTION_HASH");
    if(r[5].equals("PUBLISHED"))CameraProofFrame.require(!g.names.contains(ticket+".failure.json")&&!g.names.contains(ticket+".interruption.json")&&g.names.contains(ticket+".receipt.json"),"CAMERA_PUBLISHED_FAILURE");
    return r[5];
  }
  /** Final resolution is separate from candidate .done. Only PUBLISHED is readable. */
  public synchronized void resolve(String ticket,String outcome,String code)throws IOException{resolve(ticket,outcome,code,false);}
  private void resolve(String ticket,String outcome,String code,boolean recovery)throws IOException{
    CameraProofFrame.require(Arrays.asList("PUBLISHED","FAILED","CANCELLED","INTERRUPTED").contains(outcome)&&code.matches("[A-Z0-9_]{1,100}"),"CAMERA_RESOLUTION_ARGUMENT");
    CameraProofFrame.require(!recovery||outcome.equals("INTERRUPTED"),"CAMERA_RECOVERY_PUBLISH");
    reservation(ticket,!recovery);Usage u=scan();Group g=u.groups.get(ticket);CameraProofFrame.require(g!=null&&g.done&&g.resolution==null,"CAMERA_RESOLUTION_DUPLICATE");
    if(outcome.equals("PUBLISHED"))CameraProofFrame.require(!invalidated(ticket,g)&&!g.names.contains(ticket+".failure.json")&&!g.names.contains(ticket+".interruption.json")&&g.names.contains(ticket+".receipt.json"),"CAMERA_PUBLISHED_FAILURE");
    write(ticket,"resolution",resolution(ticket,outcome,code),recovery);scan();
  }
  private static void completeProfile(Set<String> roles){
    if(roles.contains("receipt.json")&&!roles.contains("failure.json")&&!roles.contains("interruption.json"))CameraProofFrame.require(roles.containsAll(Arrays.asList("raw.jpg","preview.png","numerical.json","reservation","request.json")),"CAMERA_COMMIT_PROFILE");
  }
  private void reservation(String ticket,boolean current)throws IOException{
    CameraProofFrame.require(id(ticket),"CAMERA_TICKET");String[] r=text(io.read(file(ticket+".reservation"),MARKER)).split("\n");
    CameraProofFrame.require(r.length==4&&r[0].equals(source)&&r[1].equals(ticket)&&r[3].equals(Long.toString(RESERVATION))&&(!current||r[2].equals(process)),"CAMERA_RESERVATION_BINDING");
  }
  public synchronized Map<String,Object> status()throws IOException{
    Usage u=scan();List<String> interrupted=new ArrayList<>();for(Map.Entry<String,Group> e:u.groups.entrySet())if(e.getValue().resolution==null||e.getValue().resolution.equals("INTERRUPTED")||e.getValue().resolution.equals("CANCELLED")||invalidated(e.getKey(),e.getValue()))interrupted.add(e.getKey());
    Map<String,Object> m=new LinkedHashMap<>();m.put("ownedBytes",u.actual);m.put("claimedBytes",u.claimed);m.put("ownedCapBytes",CAP);m.put("interrupted",interrupted);m.put("captureCount",u.groups.size());m.put("sdkHardCap",false);return m;
  }
  public synchronized String reserve()throws IOException{
    Usage u=scan();for(Map.Entry<String,Group> e:u.groups.entrySet())CameraProofFrame.require(e.getValue().resolution!=null&&(!invalidated(e.getKey(),e.getValue())||e.getValue().names.contains(e.getKey()+".invalidated")),"CAMERA_RECOVERY_REQUIRED");
    if(u.groups.size()>=115||u.claimed+RESERVATION>CAP||io.available(root)<RESERVATION+24L*1024*1024){
      refusal("CAPACITY_OR_COUNT_OR_FREE_SPACE");throw new IllegalStateException("CAMERA_CAPACITY_REFUSED");
    }
    String ticket=UUID.randomUUID().toString();byte[] b=bytes(source+"\n"+ticket+"\n"+process+"\n"+RESERVATION+"\n");
    // Reserve the full profile before the first owned job write.
    CameraProofFrame.require(u.claimed+RESERVATION<=CAP,"CAMERA_OWNED_CAP");
    io.writeNew(file(ticket+".reservation.new"),b);io.publish(file(ticket+".reservation.new"),file(ticket+".reservation"));scan();return ticket;
  }
  public synchronized void refusal(String code)throws IOException{
    CameraProofFrame.require(code.matches("[A-Z0-9_]{1,100}"),"CAMERA_REFUSAL_CODE");scan();byte[] log=io.read(file("refusals"),REFUSALS);
    for(int at=0;at<log.length;at+=512){
      if(log[at]==0){
        boolean empty=true;for(int j=at;j<at+512;j++)if(log[j]!=0)empty=false;
        CameraProofFrame.require(empty,"CAMERA_REFUSAL_TORN");byte[] body=bytes(code+"\n"+source+"\n");byte[] record=new byte[512];
        byte[] digest=bytes(CameraProofFrame.hash(body));record[0]=1;record[1]=(byte)(body.length>>>8);record[2]=(byte)body.length;
        System.arraycopy(body,0,record,3,body.length);System.arraycopy(digest,0,record,3+body.length,64);
        io.writeAt(file("refusals"),at,record);return;
      }
      int n=(log[at+1]&255)*256+(log[at+2]&255);CameraProofFrame.require(log[at]==1&&n>0&&n<=400,"CAMERA_REFUSAL_CORRUPT");
      byte[] body=Arrays.copyOfRange(log,at+3,at+3+n);CameraProofFrame.require(text(Arrays.copyOfRange(log,at+3+n,at+3+n+64)).equals(CameraProofFrame.hash(body)),"CAMERA_REFUSAL_CORRUPT");
    }throw new IllegalStateException("CAMERA_REFUSAL_LOG_FULL");
  }
  private static void validateRefusals(byte[] log){
    boolean emptySeen=false;
    for(int at=0;at<log.length;at+=512){
      if(log[at]==0){emptySeen=true;for(int j=at;j<at+512;j++)CameraProofFrame.require(log[j]==0,"CAMERA_REFUSAL_TORN");continue;}
      int n=(log[at+1]&255)*256+(log[at+2]&255);CameraProofFrame.require(!emptySeen&&log[at]==1&&n>0&&n<=400,"CAMERA_REFUSAL_CORRUPT");
      CameraProofFrame.require(text(Arrays.copyOfRange(log,at+3+n,at+3+n+64)).equals(CameraProofFrame.hash(Arrays.copyOfRange(log,at+3,at+3+n))),"CAMERA_REFUSAL_CORRUPT");
      for(int j=at+3+n+64;j<at+512;j++)CameraProofFrame.require(log[j]==0,"CAMERA_REFUSAL_CORRUPT");
    }
  }
  public synchronized void write(String ticket,String role,byte[] body)throws IOException{
    CameraProofFrame.require(!role.equals("invalidated")&&!role.equals("resolution"),"CAMERA_INTERNAL_ROLE");
    write(ticket,role,body,false);
  }
  /** Append-only post-commit invalidation; partial markers also forbid numerical readiness. */
  public synchronized void invalidate(String ticket)throws IOException{
    reservation(ticket,true);Usage u=scan();Group g=u.groups.get(ticket);CameraProofFrame.require(g!=null,"CAMERA_TICKET");
    if(!g.names.contains(ticket+".invalidated"))write(ticket,"invalidated",invalidation(ticket),false);
  }
  private void write(String ticket,String role,byte[] body,boolean recovery)throws IOException{
    reservation(ticket,!recovery);Usage u=scan();Group g=u.groups.get(ticket);CameraProofFrame.require(g!=null&&(!g.done||role.equals("invalidated")||role.equals("resolution")),"CAMERA_JOB_ALREADY_COMMITTED");
    CameraProofFrame.require(!recovery||role.equals("interruption.json")||role.equals("done")||role.equals("resolution"),"CAMERA_RECOVERY_WRITE");
    int cap=maximum(role);CameraProofFrame.require(body.length<=cap&&body.length>0,"CAMERA_OUTPUT_CAP");
    CameraProofFrame.require(io.size(file(ticket+"."+role))<0&&io.size(file(ticket+"."+role+".new"))<0,"CAMERA_OUTPUT_EXISTS");
    // Exclusive link publication briefly names both stage and destination; reserve
    // both lengths even for a group whose retained residue already exceeds B.
    long peak=g.actual+2L*body.length;
    long next=u.claimed-(g.resolution!=null?g.actual:Math.max(RESERVATION,g.actual))+(g.resolution!=null?peak:Math.max(RESERVATION,peak));
    CameraProofFrame.require(next<=CAP&&io.available(root)>=body.length,"CAMERA_OWNED_CAP");
    io.writeNew(file(ticket+"."+role+".new"),body);io.publish(file(ticket+"."+role+".new"),file(ticket+"."+role));scan();
  }
  public synchronized void finish(String ticket)throws IOException{
    finish(ticket,false);
  }
  /** Reject either unfinished work or an already sealed candidate, without overwriting it. */
  public synchronized void reject(String ticket,String outcome,String code,byte[] facts)throws IOException{
    CameraProofFrame.require(outcome.equals("FAILED")||outcome.equals("CANCELLED"),"CAMERA_REJECTION_STATUS");
    reservation(ticket,true);Usage u=scan();Group g=u.groups.get(ticket);CameraProofFrame.require(g!=null&&g.resolution==null,"CAMERA_RESOLUTION_DUPLICATE");
    if(!g.done){if(!g.names.contains(ticket+".failure.json"))write(ticket,"failure.json",facts);finish(ticket);}
    resolve(ticket,outcome,code);
  }
  private void finish(String ticket,boolean recovery)throws IOException{
    reservation(ticket,!recovery);Usage u=scan();Group g=u.groups.get(ticket);CameraProofFrame.require(g!=null&&!g.done,"CAMERA_COMMIT_DUPLICATE");
    StringBuilder b=new StringBuilder(source+"\nCAMERA_DONE_V1\n");boolean terminal=false;Set<String> roles=new HashSet<>();
    for(String n:g.names){if(n.endsWith(".new")||n.endsWith(".bak"))continue;String r=role(n);if(r.equals("receipt.json")||r.equals("failure.json")||r.equals("interruption.json"))terminal=true;
      roles.add(r);b.append(r).append('=').append(CameraProofFrame.hash(io.read(file(n),maximum(r)))).append('\n');}
    CameraProofFrame.require(terminal,"CAMERA_COMMIT_INCOMPLETE");completeProfile(roles);write(ticket,"done",bytes(b.toString()),recovery);scan();
  }
  /** Read-only status never resumes. Explicit recovery only closes a different process's orphan. */
  public synchronized void recover(boolean processDrained)throws IOException{
    Usage u=scan();for(Map.Entry<String,Group> e:u.groups.entrySet())if(e.getValue().resolution==null){
      String ticket=e.getKey();reservation(ticket,false);String[] r=text(io.read(file(ticket+".reservation"),MARKER)).split("\n");
      CameraProofFrame.require(!r[2].equals(process)||processDrained,"CAMERA_DRAIN_UNKNOWN");
      // Only classification is appended; prior partial/vector facts and residue remain.
      if(!e.getValue().done){if(!e.getValue().names.contains(ticket+".interruption.json"))write(ticket,"interruption.json",bytes("{\"status\":\"INTERRUPTED\",\"observationsRetained\":true,\"physicalDrainProven\":false}"),true);finish(ticket,true);}
      resolve(ticket,"INTERRUPTED","CAMERA_PROCESS_INTERRUPTED",true);
    }
  }
  public synchronized byte[] readNumerical(String ticket)throws IOException{
    Usage u=scan();Group g=u.groups.get(ticket);CameraProofFrame.require(g!=null&&"PUBLISHED".equals(g.resolution)&&!g.names.contains(ticket+".interruption.json")&&!g.names.contains(ticket+".failure.json")&&!invalidated(ticket,g),"CAMERA_RECEIPT_NOT_COMMITTED");return io.read(file(ticket+".numerical.json"),RECEIPT);
  }
  public File preview(String ticket){CameraProofFrame.require(id(ticket),"CAMERA_TICKET");return file(ticket+".preview.png");}
}

package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
import static expo.modules.recognitioncpu.CameraMatrixRecoveryPlan.*;
/** Host-generated journal/output failures. No Android callback or real original is claimed. */
public final class CameraMatrixRecoveryChecks {
  static int checks;
  static final String SOURCE="a".repeat(64),APK="b".repeat(64),P1="11111111-1111-1111-1111-111111111111",P2="22222222-2222-2222-2222-222222222222";
  interface Task {void run()throws Exception;}
  static void ok(boolean b,String name){checks++;if(!b)throw new AssertionError(name);}
  static void no(String name,Task task)throws Exception{try{task.run();throw new AssertionError("missing refusal:"+name);}catch(IllegalArgumentException|IllegalStateException|IOException error){checks++;}}
  static final class Death extends Error {private static final long serialVersionUID=1L;}
  static void dies(Task task)throws Exception{try{task.run();throw new AssertionError("missing generated death");}catch(Death death){checks++;}}
  static class IO extends CameraProofChecks.HostIO {
    String dieBefore="",partialBefore="";
    public void writeNew(File file,byte[] bytes)throws IOException{if(file.getName().equals(dieBefore))throw new Death();String before=fault;if(file.getName().equals(partialBefore))fault="partial";try{super.writeNew(file,bytes);}finally{fault=before;}}
  }
  static class Output implements CameraMatrixRecoveryEngine.Output {
    byte[] bytes=new byte[0];int at,writes;long available=Long.MAX_VALUE;boolean grant=true;int deathAt=-1;boolean corrupt;Map<String,Object> identity=map("device","1","inode","2");
    public Map<String,Object> identity(){return identity;}public boolean grants(boolean writing){return grant;}public long available(){return available;}public long size(){return bytes.length;}
    public int write(byte[] input,int start,int count){writes++;int n=deathAt<0?count:Math.min(count,Math.max(0,deathAt-at));bytes=Arrays.copyOf(bytes,at+n);System.arraycopy(input,start,bytes,at,n);at+=n;if(deathAt>=0&&at>=deathAt)throw new Death();return n;}
    public void sync(){}public void rewind(){at=0;}public int read(byte[] target){if(at==bytes.length)return -1;int n=Math.min(target.length,bytes.length-at);System.arraycopy(bytes,at,target,0,n);if(corrupt&&at==0)target[0]^=1;at+=n;return n;}
  }
  static final class Fixture {
    final Path root;final IO io=new IO();boolean held=true;CameraMatrixRecoveryStore store;final CameraMatrixRecoveryEngine.Source source=CameraMatrixRecoveryEngine.fixture(SOURCE,APK);final Output out=new Output();
    Fixture(Path parent,String name)throws Exception{Path dir=parent.resolve(name);Files.createDirectories(dir);root=dir.resolve(Lane.FIXTURE.root);Files.createDirectory(root);Files.createFile(root.resolve("lock"));store=open(P1);store.initialize(source.fingerprint(),true);}
    CameraMatrixRecoveryStore open(String process)throws Exception{return new CameraMatrixRecoveryStore(root.toFile(),io,Lane.FIXTURE,()->requireRecovery(held,"LOCK_REQUIRED"),SOURCE,APK,process);}
    void selected()throws Exception{store.selection();store.destination(Lane.FIXTURE.uri,67,out.identity());}
    CameraMatrixRecoveryEngine engine(){return new CameraMatrixRecoveryEngine(store,source,Lane.FIXTURE);}
    void restart()throws Exception{store=open(P2);}
  }
  public static void main(String[] args)throws Exception{
    Path parent=Path.of(args[0]);Files.createDirectories(parent);
    for(Lane lane:Lane.values()){
      ok(fixedUri(lane,lane.uri),"fixed primary document");for(String uri:Arrays.asList(lane.uri+"?x=1",lane.uri+"#x",lane.uri.replace("content:","https:"),lane.uri.replace("externalstorage.documents","providers.downloads.documents"),lane.uri.replace("/document/","/tree/"),lane.uri.replace("primary%3A","secondary%3A"),lane.uri.replace("%3A","%253A"),lane.uri.replace(lane.filename,"other.zip"),lane.uri.replace("com.android.externalstorage.documents","user@com.android.externalstorage.documents")))ok(!fixedUri(lane,uri),"wrong URI refused");
    }
    Fixture initial=new Fixture(parent,"selection");initial.store.selection();initial.restart();no("no second picker intent",()->initial.store.selection());initial.out.grant=true;no("orphan grant cannot authorize output",()->initial.engine().continueSelected(initial.out));ok(initial.out.writes==0,"no grant adoption into write");initial.store.destination(Lane.FIXTURE.uri,67,initial.out.identity());initial.restart();initial.engine().continueSelected(initial.out);ok(initial.store.state().equals("TERMINAL"),"selected operation reconstructs without ticket/prepared object");int writes=initial.out.writes;initial.restart();initial.engine().continueSelected(initial.out);ok(initial.out.writes==writes,"completed restart is read-only");
    for(int cut:new int[]{1,100,-1}){
      Fixture f=new Fixture(parent,"death-"+cut);f.selected();long expected=CameraMatrixRecoveryEngine.expected(f.source.archive(f.source.fingerprint()),FIXTURE_OUTPUT).bytes;f.out.deathAt=cut<0?(int)expected:cut;dies(()->f.engine().continueSelected(f.out));ok(f.store.state().equals("WRITE"),"death preserves consumed WRITE");int count=f.out.writes;f.out.deathAt=-1;f.restart();f.engine().continueSelected(f.out);ok(f.out.writes==count,"restart never rewrites after possible byte");ok(f.store.payload("terminal").get("status").equals(cut<0?"READBACK_VERIFIED":"UNVERIFIED"),"complete versus partial reconciled honestly");
    }
    Fixture empty=new Fixture(parent,"empty-write");empty.selected();var expected=CameraMatrixRecoveryEngine.expected(empty.source.archive(empty.source.fingerprint()),FIXTURE_OUTPUT);empty.store.claimWrite(expected.bytes,expected.sha256,empty.source.fingerprint());empty.restart();empty.engine().continueSelected(empty.out);ok(empty.out.writes==0&&empty.store.payload("terminal").get("status").equals("UNVERIFIED"),"empty output after WRITE is never writable again");
    for(String stage:Arrays.asList("verified.new","terminal.new")){
      Fixture f=new Fixture(parent,"death-"+stage);f.selected();f.io.dieBefore=stage;dies(()->f.engine().continueSelected(f.out));int count=f.out.writes;f.io.dieBefore="";f.restart();f.engine().continueSelected(f.out);ok(f.out.writes==count&&f.store.payload("terminal").get("status").equals("READBACK_VERIFIED"),"readback/terminal death reconciles without output write");
    }
    Fixture missing=new Fixture(parent,"missing-grant");missing.selected();missing.out.grant=false;no("missing grant",()->missing.engine().continueSelected(missing.out));ok(missing.out.writes==0&&!missing.store.has("write"),"grant refusal precedes WRITE");
    Fixture changed=new Fixture(parent,"changed-identity");changed.selected();changed.out.identity=map("device","1","inode","9");no("substituted descriptor",()->changed.engine().continueSelected(changed.out));ok(changed.out.writes==0,"identity failure writes nothing");
    Fixture nonempty=new Fixture(parent,"nonempty");nonempty.selected();nonempty.out.bytes=new byte[]{9};no("nonempty fixed destination",()->nonempty.engine().continueSelected(nonempty.out));ok(Arrays.equals(nonempty.out.bytes,new byte[]{9})&&nonempty.out.writes==0,"never truncates/overwrites");
    Fixture shortspace=new Fixture(parent,"space");shortspace.selected();shortspace.out.available=1;no("physical free separate from logical cap",()->shortspace.engine().continueSelected(shortspace.out));ok(!shortspace.store.has("write"),"no write without free-space check");
    Fixture torn=new Fixture(parent,"torn");torn.io.partialBefore="selection.new";no("torn selection",()->torn.store.selection());torn.io.partialBefore="";no("torn record preserved",()->torn.restart());ok(Files.exists(torn.root.resolve("selection.new")),"no cleanup/reset");
    for(String stage:Arrays.asList("destination.new","write.new")){
      Fixture f=new Fixture(parent,"torn-"+stage);f.store.selection();if(stage.equals("write.new"))f.store.destination(Lane.FIXTURE.uri,67,f.out.identity());f.io.partialBefore=stage;
      no("torn "+stage,()->{if(stage.equals("destination.new"))f.store.destination(Lane.FIXTURE.uri,67,f.out.identity());else{var e=CameraMatrixRecoveryEngine.expected(f.source.archive(f.source.fingerprint()),FIXTURE_OUTPUT);f.store.claimWrite(e.bytes,e.sha256,f.source.fingerprint());}});f.io.partialBefore="";no("torn restart cannot issue output "+stage,()->f.restart());ok(f.out.writes==0&&Files.exists(f.root.resolve(stage)),"torn record preserved before any output");
    }
    Fixture wrongOwner=new Fixture(parent,"wrong-exporter");no("wrong exporter source",()->new CameraMatrixRecoveryStore(wrongOwner.root.toFile(),wrongOwner.io,Lane.FIXTURE,()->{},"c".repeat(64),APK));no("wrong exporter APK",()->new CameraMatrixRecoveryStore(wrongOwner.root.toFile(),wrongOwner.io,Lane.FIXTURE,()->{},SOURCE,"c".repeat(64)));
    Fixture lock=new Fixture(parent,"lock");lock.held=false;no("OS guard required",()->lock.store.selection());
    ok(ORIGINAL_CANONICAL+4096+JOURNAL==190*1024&&190*1024<=BOOK,"190KiB within old192KiB");ok(JOURNAL+FIXTURE_OUTPUT<FIXTURE_ALLOWANCE,"fixture journal/output inside64KiB");ok(6*RECORD+RECORD==JOURNAL,"six records plus one temp");ok(87629846L+2048+1024<OUTPUT,"recovery entry and overhead stay in90MiB");
    System.out.println("CameraMatrixRecoveryChecks assertions="+checks+"; generated host only; Activity/grant delivery still requires Android proof");
  }
}

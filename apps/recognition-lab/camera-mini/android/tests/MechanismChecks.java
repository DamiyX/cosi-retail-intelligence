import local.cameracomponent.*;
import java.util.*;
import java.util.concurrent.*;
public final class MechanismChecks {
 static int checks;static void check(boolean value){checks++;if(!value)throw new AssertionError("check "+checks);}
 interface Action {void run()throws Exception;}
 static void refuses(Failure.Code expected,Action a)throws Exception{try{a.run();throw new AssertionError("accepted "+expected);}catch(Failure f){check(f.code==expected);}}
 static final class Disk implements Evidence.Disk {
  final Map<String,byte[]> files=new HashMap<>();long free=1024L*1024*1024;String fail="";
  public Set<String> names(){return new HashSet<>(files.keySet());}public long free(){return free;}
  public byte[] read(String n,int max)throws Exception{byte[] b=files.get(n);if(b==null||b.length>max)throw new Failure(Failure.Code.TORN,"read");return b.clone();}
  public void publish(String n,byte[] b)throws Exception{if(n.equals(fail)){files.put(n+".new",new byte[]{0});throw new java.io.IOException("injected");}if(files.putIfAbsent(n,b.clone())!=null)throw new AssertionError("overwrite");}
 }
 public static void main(String[] args)throws Exception {
  Session s=new Session();refuses(Failure.Code.NOT_READY,()->s.capture(1,true,true,"g"));s.preview("g");refuses(Failure.Code.PERMISSION,()->s.ready(1,false,true));s.ready(10,true,true);
  refuses(Failure.Code.DEADLINE,()->s.capture(120010,true,true,"g"));refuses(Failure.Code.STALE,()->s.capture(11,true,true,"changed"));
  Session.Ticket t=s.capture(11,true,true,"g");refuses(Failure.Code.CONSUMED,()->s.capture(12,true,true,"g"));s.invalidate();check(s.busy());refuses(Failure.Code.STALE,()->s.valid(t,"g"));s.settle(true);check(!s.busy()&&s.state()==Session.State.INTERRUPTED);
  Session a=new Session();a.preview("g");a.ready(0,true,true);refuses(Failure.Code.NOT_READY,()->a.capture(1,true,false,"g"));Session.Ticket at=a.capture(1,true,true,"g");final boolean[] publication={false};a.publish(at,"g",()->publication[0]=true);a.settle(true);check(publication[0]&&a.state()==Session.State.SAVED);
  check(Arrays.equals(Geometry.crop(1000,1000,1,1000,1000),new int[]{60,60,940,940}));
  check(Arrays.equals(Geometry.crop(1440,1080,6,1080,1440),new int[]{64,86,1016,1354}));
  refuses(Failure.Code.GEOMETRY,()->Geometry.admission(1,1440,1080,6,0,0,0,1440,1080));refuses(Failure.Code.GEOMETRY,()->Geometry.admission(1,100,100,1,0,-1,0,100,100));refuses(Failure.Code.OVERSIZE,()->Geometry.admission(1,3000,3000,1,0,0,0,3000,3000));refuses(Failure.Code.OVERSIZE,()->Geometry.admission(10485761,100,100,1,0,0,0,100,100));refuses(Failure.Code.GEOMETRY,()->Geometry.rotation(2));
  int[] closed={0},worked={0},done={0};Delivery.Proxy proxy=new Delivery.Proxy(){public byte[] copy(){return new byte[]{1};}public void close(){closed[0]++;}};
  Delivery.send(proxy,Runnable::run,b->{check(closed[0]==1);worked[0]++;},e->{check(e==null);done[0]++;});check(closed[0]==1&&worked[0]==1&&done[0]==1);
  Delivery.send(proxy,r->{throw new RejectedExecutionException();},b->{throw new AssertionError();},e->{check(e instanceof Failure&&((Failure)e).code==Failure.Code.SCHEDULING);});check(closed[0]==2);
  Delivery.send(new Delivery.Proxy(){public byte[] copy()throws Exception{throw new Exception();}public void close(){closed[0]++;}},Runnable::run,b->{throw new AssertionError();},e->check(e!=null));check(closed[0]==3);
  java.util.List<Runnable> queue=new ArrayList<>();int[] queued={0};
  Delivery.send(proxy,queue::add,b->{queued[0]++;},e->check(e==null));check(closed[0]==4&&queued[0]==0);queue.remove(0).run();check(queued[0]==1);
  Session pending=new Session();pending.preview("before");pending.ready(1,true,true);Session.Ticket pt=pending.capture(2,true,true,"before");pending.invalidate();final boolean[] wrote={false};refuses(Failure.Code.STALE,()->pending.publish(pt,"before",()->wrote[0]=true));check(!wrote[0]&&pending.busy());pending.settle(false);pending.settle(true);check(pending.state()==Session.State.INTERRUPTED);
  Disk disk=new Disk();Evidence ev=new Evidence(disk);check(ev.reopen().equals("EMPTY"));ev.begin("g");refuses(Failure.Code.CONSUMED,()->ev.begin("g"));refuses(Failure.Code.TORN,()->ev.reopen());ev.save(new byte[]{1,2},new byte[]{3},"g","native");check(ev.reopen().startsWith("SAVED:"));disk.files.get("original.jpeg")[0]=9;refuses(Failure.Code.TORN,()->ev.reopen());
  Disk low=new Disk();low.free=1;refuses(Failure.Code.QUOTA,()->new Evidence(low).begin("g"));
  for(String name:Arrays.asList("original.jpeg","crop.png","geometry","receipt")){Disk broken=new Disk();Evidence be=new Evidence(broken);be.begin("g");broken.fail=name;try{be.save(new byte[]{1},new byte[]{2},"g","n");throw new AssertionError();}catch(java.io.IOException expected){}refuses(Failure.Code.TORN,()->be.reopen());refuses(Failure.Code.CONSUMED,()->be.begin("g"));}
  System.out.println("mechanism checks="+checks+" PASS; injected disk is not Android durability proof");
 }
}

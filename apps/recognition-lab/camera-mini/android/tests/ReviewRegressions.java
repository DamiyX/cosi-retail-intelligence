import local.cameracomponent.*;
import java.util.concurrent.*;
import java.util.*;
public final class ReviewRegressions {
 static void check(boolean v,String why){if(!v)throw new AssertionError(why);}
 static Session ready()throws Exception{Session s=new Session();s.preview("g");s.ready(0,true,true);return s;}
 static void expired(long when)throws Exception{Session s=ready();Session.Ticket t=s.capture(119999,true,true,"g");try{s.dispatch(t,"g",when,true,true);throw new AssertionError("expired dispatch accepted");}catch(Failure f){check(f.code==Failure.Code.DEADLINE,"deadline code");}}
 static void actualBlockedPublication(boolean afterClaim)throws Exception {
  MechanismChecks.Disk backing=new MechanismChecks.Disk();CountDownLatch blocked=new CountDownLatch(1),release=new CountDownLatch(1);Session session=ready();Session.Ticket ticket=session.capture(1,true,true,"g");
  Evidence.Disk disk=new Evidence.Disk(){public java.util.Set<String> names(){return backing.names();}public byte[] read(String n,int max)throws Exception{return backing.read(n,max);}public long free(){return backing.free();}public void publish(String n,byte[] b)throws Exception{if(n.equals(afterClaim?"receipt":"original.jpeg")){blocked.countDown();release.await();}backing.publish(n,b);}};
  Evidence evidence=new Evidence(disk);evidence.begin("g");java.util.concurrent.atomic.AtomicReference<Throwable> error=new java.util.concurrent.atomic.AtomicReference<>();
  Thread publisher=new Thread(()->{try{evidence.save(new byte[]{1},new byte[]{2},"g","native",()->session.claimCommit(ticket,"g"));session.settle(true);}catch(Throwable e){error.set(e);session.settle(false);}});publisher.start();check(blocked.await(2,TimeUnit.SECONDS),"actual disk blocked");
  CountDownLatch cancelled=new CountDownLatch(1);new Thread(()->{session.invalidate();cancelled.countDown();}).start();boolean returned=cancelled.await(500,TimeUnit.MILLISECONDS);release.countDown();publisher.join(2000);check(returned&&!publisher.isAlive(),"actual IO blocked cancellation");
  check(backing.names().contains("receipt")==afterClaim,"actual receipt boundary");check(afterClaim?session.state()==Session.State.SAVED&&session.cancelledAfterCommit():session.state()==Session.State.INTERRUPTED&&error.get() instanceof Failure,"actual outcome");
 }
 public static void main(String[] args)throws Exception{
  actualBlockedPublication(false);actualBlockedPublication(true);
  expired(120000);expired(120001);
  Session before=ready();Session.Ticket bt=before.capture(119998,true,true,"g");before.dispatch(bt,"g",119999,true,true);
  try{before.dispatch(bt,"g",119999,true,true);throw new AssertionError("duplicate dispatch");}catch(Failure f){check(f.code==Failure.Code.CONSUMED,"duplicate code");}
  before.claimCommit(bt,"g");before.settle(true);check(before.state()==Session.State.SAVED,"duplicate refusal must not poison original job");
  Session s=ready();Session.Ticket ticket=s.capture(1,true,true,"g");
  CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<Throwable> error=new java.util.concurrent.atomic.AtomicReference<>();
  Thread publisher=new Thread(()->{try{s.publish(ticket,"g",()->{entered.countDown();release.await();s.claimCommit(ticket,"g");});}catch(Throwable e){error.set(e);}});publisher.start();check(entered.await(2,TimeUnit.SECONDS),"publisher started");
  CountDownLatch cancelled=new CountDownLatch(1);Thread invalidator=new Thread(()->{s.invalidate();cancelled.countDown();});invalidator.start();
  boolean returned=cancelled.await(500,TimeUnit.MILLISECONDS);release.countDown();publisher.join(2000);invalidator.join(2000);
  check(returned,"cancellation blocked behind IO");check(error.get() instanceof Failure,"cancel must refuse later receipt authorization");s.settle(false);check(s.state()==Session.State.INTERRUPTED,"no false saved");
  Session after=ready();Session.Ticket at=after.capture(1,true,true,"g");after.claimCommit(at,"g");after.invalidate();after.settle(true);check(after.state()==Session.State.SAVED&&after.cancelledAfterCommit(),"authorized commit classification");
  MechanismChecks.Disk disk=new MechanismChecks.Disk();RecordOwner owner=new RecordOwner(disk);Evidence first=owner.evidence;first.begin("g");first.save(new byte[]{1},new byte[]{2},"g","native");
  // Same process owner is the dependency handed to a recreated Activity; no second disk lock.
  Evidence recreated=owner.evidence;check(recreated.reopen().startsWith("SAVED:"),"recreated readback");try{recreated.begin("g");throw new AssertionError("rearmed");}catch(Failure expected){check(expected.code==Failure.Code.CONSUMED,"consumed after recreation");}
  first.claimExport();java.io.ByteArrayOutputStream archive=new java.io.ByteArrayOutputStream();first.archive(archive);java.util.zip.ZipInputStream zip=new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(archive.toByteArray()));int entries=0;while(zip.getNextEntry()!=null){entries++;zip.readAllBytes();}check(entries==6,"bounded archive entries");first.exportResult(true);check(first.reopen().startsWith("SAVED:"),"export must preserve receipt");try{first.claimExport();throw new AssertionError("export replay");}catch(Failure expected){check(expected.code==Failure.Code.CONSUMED,"export consumed");}
  MechanismChecks.Disk torn=new MechanismChecks.Disk();Evidence interrupted=new Evidence(torn);interrupted.begin("g");try{interrupted.save(new byte[]{1},new byte[]{2},"g","n",()->{throw new Failure(Failure.Code.STALE,"cancel-before-receipt");});throw new AssertionError("cancel committed");}catch(Failure expected){}check(!torn.names().contains("receipt"),"receipt suppressed");
  MechanismChecks.Disk refusedDisk=new MechanismChecks.Disk();Evidence refused=new Evidence(refusedDisk);refused.begin("g");refused.failure("CAMERA:capture-callback:SDK_3:ImageCaptureException");check(refused.reopen().startsWith("REFUSED:CAMERA:"),"durable useful refusal");try{refused.claimExport();throw new AssertionError("incomplete export");}catch(Failure expected){}
  owner.worker.shutdown();System.out.println("PASS: original READY equality/expiry, duplicate invoke, nonblocking blocked-IO cancellation, before/after commit, same-owner recreation, no capture/export replay, archive preservation");
 }
}

package expo.modules.recognitioncpu;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.*;
/** Short ownership/commit decisions share one monitor. Publication callback runs outside it. */
final class CameraIntegrationLease {
 private final AtomicBoolean shared;
 private Object owner;
 private int tasks;
 private boolean external;
 private CpuTicket cpu;
 private CpuPreparation preparation;
 private boolean foreground,focused;
 static final Set<String> CAMERA_FILES=Collections.unmodifiableSet(new HashSet<>(Arrays.asList("intent","original.jpeg","crop.png","geometry","receipt")));
 static final class CpuPreparation {final Object owner;boolean cancelled,drained;CpuPreparation(Object owner){this.owner=owner;}}
 interface CpuPreflight {String record()throws Exception;Set<String> names()throws Exception;}
 enum Phase { RUNNING, CLAIMED, COMMITTED, CANCELLED, FAILED_BEFORE_CLAIM, FAILED_PUBLICATION }
 static final class CpuTicket {
  final Object owner;
  final String savedRecord;
  Phase phase=Phase.RUNNING;
  boolean cancelled,drained;
  CpuTicket(Object owner,String savedRecord){this.owner=owner;this.savedRecord=savedRecord;}
 }
 interface Publication { void publish()throws Exception; }
 CameraIntegrationLease(AtomicBoolean shared){this.shared=shared;}
 synchronized boolean claim(Object token){if(owner==token)return true;if(owner!=null||!shared.compareAndSet(false,true))return false;owner=token;foreground=false;focused=false;return true;}
 synchronized boolean owns(Object token){return owner==token;}
 synchronized boolean busy(Object token){return owner!=token||tasks!=0||external;}
 private void idleOwner(Object token){if(owner!=token||tasks!=0||external)throw new IllegalStateException("OWNER_BUSY");}
 synchronized void start(Object token){if(owner!=token||preparation!=null||(cpu!=null&&!cpu.drained))throw new IllegalStateException("OWNER");tasks++;}
 synchronized void end(Object token){if(owner!=token||tasks<1||preparation!=null||(cpu!=null&&!cpu.drained))throw new IllegalStateException("TASK");tasks--;}
 synchronized void foreground(Object token,boolean value){if(owner!=token)return;foreground=value;if(!value){focused=false;cancelCpu(token);}}
 synchronized void focus(Object token,boolean value){if(owner!=token)return;focused=value;if(!value)cancelCpu(token);}
 synchronized CpuPreparation beginCpuPreparation(Object token){
  idleOwner(token);if(!foreground||!focused)throw new IllegalStateException("CPU_BACKGROUND");if(cpu!=null)throw new IllegalStateException("CPU_CONSUMED");
  if(preparation!=null)throw new IllegalStateException("CPU_PREPARING");preparation=new CpuPreparation(token);tasks++;return preparation;
 }
 private void validPreparation(CpuPreparation p){if(p==null||preparation!=p||owner!=p.owner||p.drained||tasks!=1||cpu!=null)throw new IllegalStateException("CPU_PREPARATION_OWNER");}
 private synchronized void readyPreparation(CpuPreparation p){validPreparation(p);if(!foreground||!focused||p.cancelled)throw new IllegalStateException("CPU_PREPARATION_CANCELLED");}
 /** Both preflight callbacks run outside monitor on the serialized record worker. No ticket/intent yet. */
 CpuTicket prepareCpu(CpuPreparation p,CpuPreflight preflight)throws Exception{
  readyPreparation(p);
  String saved=preflight.record();if(saved==null||!saved.matches("SAVED:[0-9a-f]{64}"))throw new IllegalStateException("CPU_REQUIRES_SAVED");
  Set<String> names=new HashSet<>(preflight.names());if(!names.equals(CAMERA_FILES))throw new IllegalStateException("CPU_DURABLE_CONSUMED");
  synchronized(this){readyPreparation(p);cpu=new CpuTicket(p.owner,saved);p.drained=true;preparation=null;return cpu;}
 }
 synchronized void endCpuPreparation(CpuPreparation p){validPreparation(p);p.drained=true;preparation=null;tasks--;}
 synchronized boolean releaseIfBackground(Object token,boolean captureBusy){return !foreground&&release(token,captureBusy);}
 synchronized void requireCpu(CpuTicket ticket){if(ticket==null||cpu!=ticket||owner!=ticket.owner||ticket.drained||tasks!=1)throw new IllegalStateException("CPU_OWNER");}
 synchronized boolean cpuCancelled(CpuTicket ticket){requireCpu(ticket);return ticket.cancelled;}
 synchronized String cancelCpu(Object token){
  if(owner!=token)return "CPU cancellation ignored: stale owner";
  if(preparation!=null){preparation.cancelled=true;return "CPU preparation cancelled; no CPU attempt consumed; waiting for preflight drain";}
  if(cpu==null)return "CPU has no active task";
  if(cpu.owner!=token)return "CPU cancellation ignored: stale task";
  if(cpu.drained)return "CPU already drained: "+cpu.phase;
  cpu.cancelled=true;
  return cpu.phase==Phase.RUNNING?"CPU cancellation accepted before commit claim; no success receipt":"CPU commit already claimed; cancellation cannot retract publication; waiting for actual drain";
 }
 private synchronized boolean claimCpuCommit(CpuTicket ticket){
  requireCpu(ticket);if(ticket.phase!=Phase.RUNNING)throw new IllegalStateException("CPU_COMMIT_STATE");
  if(ticket.cancelled)return false;
  ticket.phase=Phase.CLAIMED;return true;
 }
 /** Linearization is claimCpuCommit, not the later filesystem rename. Never hold monitor over IO. */
 boolean publishCpu(CpuTicket ticket,Publication publication)throws Exception{
  if(!claimCpuCommit(ticket))return false;
  publication.publish();
  synchronized(this){requireCpu(ticket);if(ticket.phase!=Phase.CLAIMED)throw new IllegalStateException("CPU_COMMIT_STATE");ticket.phase=Phase.COMMITTED;}
  return true;
 }
 synchronized void endCpu(CpuTicket ticket){
  requireCpu(ticket);
  if(ticket.phase==Phase.RUNNING)ticket.phase=ticket.cancelled?Phase.CANCELLED:Phase.FAILED_BEFORE_CLAIM;
  else if(ticket.phase==Phase.CLAIMED)ticket.phase=Phase.FAILED_PUBLICATION;
  ticket.drained=true;tasks--;
 }
 synchronized String cpuReceiptBlock(){if(cpu==null)return null;if(cpu.phase==Phase.CLAIMED)return "CPU COMMIT PENDING: publication has not returned; owner retained until actual drain";if(cpu.phase==Phase.FAILED_PUBLICATION)return "CPU INTERRUPTED: receipt publication failed or is unconfirmed; preserve all evidence";return null;}
 synchronized boolean cpuReceiptUnconfirmed(){return cpu!=null&&(cpu.phase==Phase.CLAIMED||cpu.phase==Phase.FAILED_PUBLICATION);}
 synchronized String cpuOutcome(){
  if(cpu==null)return "no CPU task in this process";
  return cpu.phase+(cpu.cancelled&&cpu.phase==Phase.COMMITTED?"; cancellation followed commit claim":"")+(cpu.drained?"; actual work drained":"; owner retained until actual drain");
 }
 synchronized void external(Object token,boolean pending){if(owner!=token)throw new IllegalStateException("OWNER");external=pending;}
 synchronized boolean acceptExternalResult(Object token,boolean activityPending){return owner==token&&external&&tasks==0&&activityPending;}
 synchronized boolean release(Object token,boolean captureBusy){if(owner!=token||tasks!=0||external||captureBusy)return false;owner=null;foreground=false;focused=false;shared.set(false);return true;}
}

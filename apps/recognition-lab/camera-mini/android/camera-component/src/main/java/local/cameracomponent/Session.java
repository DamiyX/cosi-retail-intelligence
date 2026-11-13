package local.cameracomponent;
import static local.cameracomponent.Failure.*;
/** Locks protect decisions only. Never hold this monitor during file or SDK work. */
public final class Session {
 public enum State { CLOSED, PREVIEW, READY, CAPTURING, DRAINING, COMMITTING, SAVED, REFUSED, INTERRUPTED }
 private State state=State.CLOSED;
 private long generation,readyAt;
 private boolean consumed,owned,commitClaimed,cancelAfterCommit;
 private String geometry="";
 public static final class Ticket {
  public final long generation,readyAt;
  public final String geometry;
  private boolean dispatched;
  private Ticket(long g,long at,String s){generation=g;readyAt=at;geometry=s;}
 }
 public synchronized State state(){return state;}
 public synchronized void preview(String value)throws Failure {
  require(!owned&&!consumed,Code.BUSY,"preview");generation++;geometry=value;state=State.PREVIEW;
 }
 public synchronized void ready(long now,boolean permission,boolean foreground)throws Failure {
  require(permission,Code.PERMISSION,"ready");require(foreground&&state==State.PREVIEW,Code.NOT_READY,"ready");readyAt=now;state=State.READY;
 }
 public synchronized Ticket capture(long now,boolean permission,boolean foreground,String current)throws Failure {
  require(!consumed,Code.CONSUMED,"capture");require(!owned,Code.BUSY,"capture");require(permission,Code.PERMISSION,"capture");
  require(foreground&&state==State.READY,Code.NOT_READY,"capture");deadline(readyAt,now);require(geometry.equals(current),Code.STALE,"capture");
  consumed=true;owned=true;state=State.CAPTURING;return new Ticket(generation,readyAt,geometry);
 }
 private static void deadline(long ready,long now)throws Failure {require(now>=ready&&now-ready<120000,Code.DEADLINE,"original-ready-window");}
 public synchronized void valid(Ticket t,String current)throws Failure {
  require(owned&&state==State.CAPTURING&&t.generation==generation&&t.geometry.equals(current),Code.STALE,"callback");
 }
 /** Immediately before takePicture; original READY bound, equality refused, at most once. */
 public synchronized void dispatch(Ticket t,String current,long now,boolean permission,boolean foreground)throws Failure {
  valid(t,current);require(permission,Code.PERMISSION,"invoke");require(foreground,Code.NOT_READY,"invoke");deadline(t.readyAt,now);
  require(!t.dispatched,Code.CONSUMED,"invoke");t.dispatched=true;
 }
 /** Receipt authorization is the commit linearization point, before atomic rename.
  * Cancellation before this point prevents a receipt. After this point the one
  * already authorized commit may finish, explicitly reported as such. */
 public synchronized void claimCommit(Ticket t,String current)throws Failure {valid(t,current);commitClaimed=true;state=State.COMMITTING;}
 public synchronized void invalidate(){generation++;if(commitClaimed&&owned){cancelAfterCommit=true;return;}state=owned?State.DRAINING:state==State.SAVED?State.SAVED:State.INTERRUPTED;}
 public synchronized void settle(boolean saved){if(!owned)return;owned=false;state=saved&&(commitClaimed||state==State.CAPTURING)?State.SAVED:state==State.DRAINING?State.INTERRUPTED:State.REFUSED;}
 public synchronized boolean busy(){return owned;}
 public synchronized boolean cancelledAfterCommit(){return cancelAfterCommit;}
 public interface Publication {void run()throws Exception;}
 /** Compatibility/test seam: validation is nonblocking; receipt must use claimCommit. */
 public void publish(Ticket t,String current,Publication p)throws Exception {valid(t,current);p.run();}
}

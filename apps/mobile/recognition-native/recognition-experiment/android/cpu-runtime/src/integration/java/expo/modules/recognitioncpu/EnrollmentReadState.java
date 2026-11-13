package expo.modules.recognitioncpu;

/** A timer invalidates success but cannot release a running I/O owner. */
public final class EnrollmentReadState {
 private final long began;private long callback=-1;private boolean launched,claimed,working,cancelled,ended;
 public EnrollmentReadState(long now){began=now;}
 public synchronized boolean timedOut(long now){return now<began||now-began>=120000||(callback>=0&&now-callback>=30000);}
 public synchronized boolean live(long now){return !cancelled&&!ended&&now>=began&&now-began<120000&&(callback<0||now-callback<30000);}
 public synchronized boolean launch(long now){if(launched||!live(now))return false;launched=true;return true;}
 public synchronized boolean callback(long now){if(!launched||claimed||ended)return false;if(!live(now))cancelled=true;claimed=true;callback=now;working=true;return true;}
 public synchronized void cancel(){cancelled=true;}
 public synchronized boolean claimTerminal(long now){if(!live(now))cancelled=true;if(working||ended||launched&&!claimed)return false;ended=true;return true;}
 public synchronized void drained(){ObservedEnrollment.require(working,"READ_NOT_WORKING");working=false;}
 public synchronized boolean reading(){return working;}
}

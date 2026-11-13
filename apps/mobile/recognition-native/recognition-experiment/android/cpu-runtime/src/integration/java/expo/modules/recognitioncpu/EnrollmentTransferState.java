package expo.modules.recognitioncpu;
/** At-most-once callback and actual-worker drain. Timeout invalidates work; it cannot finish a busy worker. */
public final class EnrollmentTransferState {
 private final long begun;private boolean launched,returned,working,expired,ended;
 public EnrollmentTransferState(long now){begun=now;}
 public synchronized boolean waiting(long now){return !ended&&!expired&&!returned&&!working&&now-begun<300000;}
 public synchronized boolean launch(long now){if(launched||!waiting(now))return false;launched=true;return true;}
 public synchronized boolean callback(long now){if(ended||!launched||returned||expired||now-begun>=300000)return false;returned=true;return true;}
 public synchronized boolean worker(long now){if(ended||expired||!returned||working||now-begun>=300000)return false;working=true;return true;}
 public synchronized boolean expire(long now,boolean force){if(force||now-begun>=300000)expired=true;return expired&&!working&&!ended;}
 public synchronized void drained(){ObservedEnrollment.require(working,"TRANSFER_NOT_WORKING");working=false;}
 public synchronized boolean finish(){if(ended)return false;ObservedEnrollment.require(!working,"TRANSFER_STILL_DRAINING");ended=true;return true;}
}

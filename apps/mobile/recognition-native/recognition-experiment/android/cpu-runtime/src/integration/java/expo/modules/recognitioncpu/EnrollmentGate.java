package expo.modules.recognitioncpu;
import java.util.concurrent.atomic.AtomicBoolean;

/** Short ownership decisions only. Cancel never waits for filesystem/model work. */
public final class EnrollmentGate {
 private final AtomicBoolean shared;private Object activity;private boolean command,reserved,cpu,review,detector,uncertain,cancelled,foreground,focused,claimed;
 public EnrollmentGate(AtomicBoolean shared){this.shared=shared;}
 public synchronized void command(){ObservedEnrollment.require(!uncertain&&activity==null&&!command&&!reserved&&!cpu&&shared.compareAndSet(false,true),"ENROLLMENT_BUSY");command=true;}
 public synchronized void reserve(){ObservedEnrollment.require(command&&!reserved,"NO_COMMAND");reserved=true;}
 public synchronized void commandEnd(){ObservedEnrollment.require(command,"NO_COMMAND");command=false;if(!reserved&&!uncertain)shared.set(false);}
 public synchronized void launchFailed(){ObservedEnrollment.require(reserved&&activity==null&&!command,"LAUNCH_STATE");reserved=false;if(!uncertain)shared.set(false);}
 public synchronized void claim(Object token){ObservedEnrollment.require(!uncertain&&reserved&&activity==null&&!command&&!cpu,"STALE_ACTIVITY");activity=token;reserved=false;cancelled=false;claimed=false;foreground=false;focused=false;}
 public synchronized void foreground(Object token,boolean value){if(activity!=token)return;foreground=value;if(!value){focused=false;cancelled=true;}}
 public synchronized void focus(Object token,boolean value){if(activity!=token)return;boolean lost=focused&&!value;focused=value;if(lost)cancelled=true;}
 public synchronized void requireLive(Object token){ObservedEnrollment.require(!uncertain&&activity==token&&foreground&&focused&&!cancelled&&!cpu,"OWNER_NOT_LIVE");}
 public synchronized void cpuStart(Object token){requireLive(token);ObservedEnrollment.require(!detector,"DETECTOR_DRAINING");cpu=true;claimed=false;}
 public synchronized void cpuValid(Object token){ObservedEnrollment.require(!uncertain&&activity==token&&cpu&&!cancelled&&foreground&&focused,"CPU_CANCELLED");}
 public synchronized boolean claimPublication(Object token){ObservedEnrollment.require(activity==token&&cpu&&!claimed,"CPU_OWNER");if(uncertain||cancelled||!foreground||!focused)return false;claimed=true;return true;}
 public synchronized void cpuEnd(Object token){ObservedEnrollment.require(activity==token&&cpu,"CPU_OWNER");cpu=false;}
 public synchronized void reviewStart(Object token){ObservedEnrollment.require(activity==token&&!review&&!cpu,"REVIEW_OWNER");review=true;}
 public synchronized void reviewEnd(Object token){ObservedEnrollment.require(activity==token&&review,"REVIEW_OWNER");review=false;}
 public synchronized void cancel(Object token){if(activity==token)cancelled=true;}
 public synchronized boolean release(Object token,boolean captureBusy){if(activity!=token)return false;cancelled=true;foreground=false;focused=false;if(captureBusy||cpu||review||detector||uncertain)return false;activity=null;shared.set(false);return true;}
 public synchronized boolean owns(Object token){return activity==token;}
 public synchronized boolean busy(){return uncertain||activity!=null||command||reserved||cpu||detector;}
 public synchronized void detectorStart(Object token){ObservedEnrollment.require(!uncertain&&activity==token&&!cpu&&!review&&!detector,"DETECTOR_OWNER");detector=true;}
 public synchronized void detectorEnd(Object token){ObservedEnrollment.require(activity==token&&detector&&!uncertain,"DETECTOR_OWNER");detector=false;}
 public synchronized void uncertain(){uncertain=true;shared.set(true);}
 public synchronized boolean cpuBusy(){return cpu;}
 public synchronized boolean cancelled(Object token){return activity!=token||cancelled;}
}

package expo.modules.recognitioncpu;
import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.provider.DocumentsContract;
import android.system.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** One fixed local document request. Never imports an arbitrary URI or retries an uncertain write. */
public final class EnrollmentReportTransfer {
 private static final Object LOCK=new Object();private static Transfer current;private static final Map<Integer,Completed> completed=new HashMap<>();
 private static final class Completed {final String source,session;final EnrollmentTransferDiagnostic.Result result;Completed(Transfer t,EnrollmentTransferDiagnostic.Result r){this(t.owner.source,t.session,r);}Completed(String s,String id,EnrollmentTransferDiagnostic.Result r){source=s;session=id;result=r;}}
 public static final int FIRST=52101,LAST=52108;
 private static final class Transfer {final EnrollmentOwner owner;final Activity activity;final int slot,code;final String session,hash;final byte[] bytes;final long began;final EnrollmentTransferState state;volatile EnrollmentTransferDiagnostic.Phase phase=EnrollmentTransferDiagnostic.Phase.ADMISSION;volatile EnrollmentTransferDiagnostic.Failure primary,cleanup,closeFailure;EnrollmentReportReadback.Facts readback;String identity="",reopened="";Transfer(EnrollmentOwner o,Activity a,int n,String s,byte[] b){owner=o;activity=a;slot=n;code=52100+n;session=s;bytes=b;hash=ObservedEnrollment.hash(b);began=SystemClock.elapsedRealtime();state=new EnrollmentTransferState(began);}}
 public static String filename(String session,int n){ObservedEnrollment.require(session!=null&&session.matches("[a-zA-Z0-9][a-zA-Z0-9-]{0,63}"),"TRANSFER_SESSION");return EnrollmentTransferPolicy.filename(session,n);}
 public static boolean local(Uri uri,String session,int n){if(uri==null||!EnrollmentTransferPolicy.local(uri.toString(),session,n)||!"content".equals(uri.getScheme())||!"com.android.externalstorage.documents".equals(uri.getAuthority())||uri.getQuery()!=null||uri.getFragment()!=null||DocumentsContract.isTreeUri(uri))return false;try{return ("primary:Download/"+filename(session,n)).equals(DocumentsContract.getDocumentId(uri));}catch(Exception e){return false;}}
 /** Called on the existing module worker. All private reads/hash/receipt writes precede the UI-only picker launch. */
 public static void prepare(Activity activity,String source,int number,int sequence,String session)throws Exception{
  ObservedEnrollment.require(activity.hasWindowFocus()&&!activity.isFinishing()&&!activity.isDestroyed(),"REPORT_FOREGROUND_REQUIRED");synchronized(LOCK){ObservedEnrollment.require(current==null,"TRANSFER_BUSY");}
  long began=SystemClock.elapsedRealtime();EnrollmentOwner owner=EnrollmentOwner.beginTransfer(activity,source,number,sequence,session);Transfer ticket=null;
  try{byte[] bytes=owner.transferBytes(number);ObservedEnrollment.require(bytes!=null&&bytes.length<=EnrollmentEvidence.HARD,"TRANSFER_INTERNAL");ticket=new Transfer(owner,activity,number,session,bytes);synchronized(LOCK){ObservedEnrollment.require(current==null,"TRANSFER_BUSY");current=ticket;}
   final Transfer launched=ticket;
   ObservedEnrollment.require(new Handler(Looper.getMainLooper()).postDelayed(()->{synchronized(LOCK){if(current!=launched)return;}launched.owner.reports.cancel();if(launched.state.expire(SystemClock.elapsedRealtime(),false)){cancelled(launched);finish(launched,false);}},300000),"TRANSFER_TIMEOUT_SCHEDULING");
  }catch(Exception error){if(ticket!=null){ticket.primary=failure(ticket,error);finish(ticket,false);}else{EnrollmentTransferDiagnostic.Result value=owner.reports.admissionFailure(number,failure(EnrollmentTransferDiagnostic.Phase.ADMISSION,error),(int)Math.min(Integer.MAX_VALUE,Math.max(0,SystemClock.elapsedRealtime()-began)));try{owner.endTransfer(value.bytes());}catch(Exception close){value=new EnrollmentTransferDiagnostic.Result(false,EnrollmentTransferDiagnostic.Phase.TERMINAL,value.primary,null,failure(EnrollmentTransferDiagnostic.Phase.TERMINAL,close),value.elapsed,value.length,value.hash,"","");error.addSuppressed(close);}synchronized(LOCK){completed.put(number,new Completed(source,session,value));}}throw error;}
 }
 /** UI thread only; no filesystem operations or hashing. */
 public static void launchPrepared(Activity activity,int number){Transfer ticket;synchronized(LOCK){ticket=current;}ObservedEnrollment.require(ticket!=null&&ticket.activity==activity&&ticket.slot==number,"TRANSFER_STALE_LAUNCH");
  try{ObservedEnrollment.require(activity.hasWindowFocus()&&!activity.isFinishing()&&!activity.isDestroyed()&&ticket.state.launch(SystemClock.elapsedRealtime()),"TRANSFER_FOREGROUND_OR_EXPIRED");
   ticket.owner.reports.transferCheck();Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/octet-stream").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,filename(ticket.session,number)).putExtra(DocumentsContract.EXTRA_INITIAL_URI,DocumentsContract.buildDocumentUri("com.android.externalstorage.documents","primary:Download"));activity.startActivityForResult(intent,ticket.code);
  }catch(RuntimeException error){ticket.primary=failure(ticket,error);finish(ticket,false);throw error;}
 }
 public static void abortPrepared(Activity activity,int number){Transfer t;synchronized(LOCK){t=current;}if(t!=null&&t.activity==activity&&t.slot==number){t.owner.reports.cancel();if(t.state.expire(SystemClock.elapsedRealtime(),true)){cancelled(t);finish(t,false);}}}
 public static boolean handles(int code){return code>=FIRST&&code<=LAST;}
 public static void returned(Activity activity,int code,int resultCode,Intent data){
  final Transfer ticket;synchronized(LOCK){ticket=current;if(ticket==null||ticket.code!=code||ticket.activity!=activity||!ticket.state.callback(SystemClock.elapsedRealtime())){revoke(activity,data);return;}}
  // The picker may return before focus restoration. A short UI-post chain waits without granting ownership to other work.
  android.os.Handler main=new android.os.Handler(android.os.Looper.getMainLooper());Runnable[] poll=new Runnable[1];poll[0]=()->{
   synchronized(LOCK){if(current!=ticket){revoke(activity,data);return;}}
   if(!activity.isFinishing()&&!activity.isDestroyed()&&activity.hasWindowFocus()){
    ticket.phase=EnrollmentTransferDiagnostic.Phase.CALLBACK;ticket.owner.reports.pickerReturned();if(!ticket.state.worker(SystemClock.elapsedRealtime())){cancelled(ticket);revokeTicket(ticket,data);finish(ticket,false);return;}
    Thread worker=new Thread(()->write(ticket,resultCode,data),"p204-report-local-write");try{worker.start();}catch(RuntimeException e){ticket.state.drained();ticket.primary=failure(ticket,e);revokeTicket(ticket,data);finish(ticket,false);}return;
   }
   if(activity.isFinishing()||activity.isDestroyed()||SystemClock.elapsedRealtime()-ticket.began>=300000){cancelled(ticket);revokeTicket(ticket,data);finish(ticket,false);return;}
   if(!main.postDelayed(poll[0],50)){cancelled(ticket);revokeTicket(ticket,data);finish(ticket,false);}
  };if(!main.post(poll[0])){cancelled(ticket);revokeTicket(ticket,data);finish(ticket,false);}
 }
 private static void cancelled(Transfer t){if(t.primary==null)t.primary=new EnrollmentTransferDiagnostic.Failure(t.phase,EnrollmentTransferDiagnostic.Code.CANCELLED_OR_EXPIRED,EnrollmentTransferDiagnostic.Kind.STATE,0);}
 private static void revokeTicket(Transfer t,Intent data){if(data!=null&&data.getData()!=null)try{t.activity.revokeUriPermission(data.getData(),Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);}catch(RuntimeException e){EnrollmentTransferDiagnostic.Phase previous=t.phase;t.phase=EnrollmentTransferDiagnostic.Phase.REVOKE;t.cleanup=failure(t,e);t.phase=previous;}}
 private static void revoke(Activity activity,Intent data){if(data!=null&&data.getData()!=null)try{activity.revokeUriPermission(data.getData(),Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);}catch(RuntimeException ignored){}}
 public static void destroyed(Activity activity){Transfer t;synchronized(LOCK){t=current;if(t==null||t.activity!=activity)return;}t.owner.reports.cancel();if(t.state.expire(SystemClock.elapsedRealtime(),true)){cancelled(t);finish(t,false);}}
 private static void check(Transfer t){synchronized(LOCK){ObservedEnrollment.require(current==t,"TRANSFER_STALE");}ObservedEnrollment.require(!t.activity.isFinishing()&&!t.activity.isDestroyed()&&t.activity.hasWindowFocus(),"TRANSFER_FOCUS_LOST");t.owner.reports.transferCheck();}
 private static void capacity(FileDescriptor fd,long pending)throws Exception{StructStatVfs space=Os.fstatvfs(fd);EnrollmentReportBudget.physical(EnrollmentReportBudget.available(space.f_bavail,space.f_frsize),pending);}
 private static EnrollmentTransferDiagnostic.Failure failure(Transfer t,Exception e){return failure(t.phase,e);}
 private static EnrollmentTransferDiagnostic.Failure failure(EnrollmentTransferDiagnostic.Phase phase,Exception e){
  EnrollmentTransferDiagnostic.Kind kind=e instanceof ErrnoException?EnrollmentTransferDiagnostic.Kind.ERRNO:e instanceof SecurityException?EnrollmentTransferDiagnostic.Kind.SECURITY:e instanceof IOException?EnrollmentTransferDiagnostic.Kind.IO:e instanceof IllegalStateException?EnrollmentTransferDiagnostic.Kind.STATE:EnrollmentTransferDiagnostic.Kind.UNKNOWN;
  EnrollmentTransferDiagnostic.Code code=kind==EnrollmentTransferDiagnostic.Kind.ERRNO?EnrollmentTransferDiagnostic.Code.ERRNO:kind==EnrollmentTransferDiagnostic.Kind.SECURITY?EnrollmentTransferDiagnostic.Code.SECURITY:kind==EnrollmentTransferDiagnostic.Kind.IO?EnrollmentTransferDiagnostic.Code.IO:EnrollmentTransferDiagnostic.Code.UNKNOWN;
  // Only invariant literals from this adapter are exposed; never arbitrary exception messages.
  String m=e instanceof IllegalStateException?e.getMessage():null;
  if(m!=null)switch(m){case "TRANSFER_CANCELLED_OR_MULTIPLE":case "REPORT_CANCELLED_OR_EXPIRED":code=EnrollmentTransferDiagnostic.Code.CANCELLED_OR_EXPIRED;break;case "TRANSFER_LOCAL_DESTINATION":code=EnrollmentTransferDiagnostic.Code.DESTINATION;break;case "TRANSFER_DESCRIPTOR":case "TRANSFER_REOPEN":code=EnrollmentTransferDiagnostic.Code.DESCRIPTOR;break;case "TRANSFER_NOT_NEW_EMPTY_REGULAR_SEEKABLE":code=EnrollmentTransferDiagnostic.Code.NOT_EMPTY_REGULAR;break;case "TRANSFER_WRITE_CHANGED":code=EnrollmentTransferDiagnostic.Code.WRITE_CHANGED;break;case "TRANSFER_REOPEN_SIZE_OR_IDENTITY":code=EnrollmentTransferDiagnostic.Code.REOPEN_CHANGED;break;case "TRANSFER_READ_LIMIT":code=EnrollmentTransferDiagnostic.Code.READ_LIMIT;break;case "TRANSFER_READ_SHORT":code=EnrollmentTransferDiagnostic.Code.READ_SHORT;break;case "TRANSFER_READ_HASH":code=EnrollmentTransferDiagnostic.Code.READ_HASH;break;case "TRANSFER_READ_CHANGED":code=EnrollmentTransferDiagnostic.Code.READ_CHANGED;break;case "TRANSFER_READBACK":code=EnrollmentTransferDiagnostic.Code.READBACK;break;case "TRANSFER_FOCUS_LOST":code=EnrollmentTransferDiagnostic.Code.FOCUS_LOST;break;case "TRANSFER_STALE":code=EnrollmentTransferDiagnostic.Code.STALE;break;default:break;}
  int errno=e instanceof ErrnoException?((ErrnoException)e).errno:0;if(errno<0||errno>4095)errno=0;
  return new EnrollmentTransferDiagnostic.Failure(phase,code,kind,errno);
 }
 private static void write(Transfer t,int resultCode,Intent data){boolean verified=false;Uri uri=null;
  try{t.phase=EnrollmentTransferDiagnostic.Phase.CALLBACK;check(t);ObservedEnrollment.require(resultCode==Activity.RESULT_OK&&data!=null&&data.getClipData()==null&&(data.getFlags()&3)==3&&(data.getFlags()&Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)==0,"TRANSFER_CANCELLED_OR_MULTIPLE");uri=data.getData();t.phase=EnrollmentTransferDiagnostic.Phase.DESTINATION;ObservedEnrollment.require(local(uri,t.session,t.slot),"TRANSFER_LOCAL_DESTINATION");t.owner.reports.destination(uri.toString());check(t);
   ContentResolver resolver=t.activity.getContentResolver();
   t.phase=EnrollmentTransferDiagnostic.Phase.WRITE;
   try(ParcelFileDescriptor pfd=resolver.openFileDescriptor(uri,"rw")){
    ObservedEnrollment.require(pfd!=null,"TRANSFER_DESCRIPTOR");FileDescriptor fd=pfd.getFileDescriptor();StructStat before=Os.fstat(fd);ObservedEnrollment.require(OsConstants.S_ISREG(before.st_mode)&&before.st_size==0&&before.st_nlink==1&&Os.lseek(fd,0,OsConstants.SEEK_CUR)==0,"TRANSFER_NOT_NEW_EMPTY_REGULAR_SEEKABLE");
    capacity(fd,t.bytes.length);
    try(ParcelFileDescriptor duplicate=ParcelFileDescriptor.dup(fd);OutputStream out=new ParcelFileDescriptor.AutoCloseOutputStream(duplicate)){
     for(int at=0;at<t.bytes.length;){check(t);capacity(fd,t.bytes.length-at);check(t);int n=Math.min(65536,t.bytes.length-at);out.write(t.bytes,at,n);at+=n;}t.phase=EnrollmentTransferDiagnostic.Phase.FLUSH;out.flush();t.phase=EnrollmentTransferDiagnostic.Phase.FSYNC;Os.fsync(fd);capacity(fd,0);StructStat after=Os.fstat(fd);ObservedEnrollment.require(after.st_dev==before.st_dev&&after.st_ino==before.st_ino&&after.st_size==t.bytes.length,"TRANSFER_WRITE_CHANGED");t.phase=EnrollmentTransferDiagnostic.Phase.OUTPUT_CLOSE;
    }
    t.identity=EnrollmentDisk.identity(Os.fstat(fd));t.phase=EnrollmentTransferDiagnostic.Phase.OUTPUT_CLOSE;
   }
   check(t);t.phase=EnrollmentTransferDiagnostic.Phase.REOPEN;try(ParcelFileDescriptor pfd=resolver.openFileDescriptor(uri,"r")){
    ObservedEnrollment.require(pfd!=null,"TRANSFER_REOPEN");StructStat before=Os.fstat(pfd.getFileDescriptor());t.reopened=EnrollmentDisk.identity(before);t.phase=EnrollmentTransferDiagnostic.Phase.IDENTITY;ObservedEnrollment.require(OsConstants.S_ISREG(before.st_mode)&&before.st_nlink==1&&before.st_size==t.bytes.length&&t.identity.equals(t.reopened),"TRANSFER_REOPEN_SIZE_OR_IDENTITY");
    t.phase=EnrollmentTransferDiagnostic.Phase.READBACK;
    t.readback=new EnrollmentReportReadback.Facts();
    try(InputStream in=new ParcelFileDescriptor.AutoCloseInputStream(ParcelFileDescriptor.dup(pfd.getFileDescriptor()))){EnrollmentReportReadback.verify(in,t.bytes.length,t.hash,t.reopened,()->check(t),()->EnrollmentDisk.identity(Os.fstat(pfd.getFileDescriptor())),t.readback);t.phase=EnrollmentTransferDiagnostic.Phase.READ_CLOSE;}finally{if(t.readback.sample.equals("UNOBSERVED"))EnrollmentReportReadback.sample(t.reopened,()->EnrollmentDisk.identity(Os.fstat(pfd.getFileDescriptor())),t.readback);}
    t.phase=EnrollmentTransferDiagnostic.Phase.READ_CLOSE;
   }check(t);verified=true;
  }catch(Exception error){t.primary=failure(t,error);for(Throwable suppressed:error.getSuppressed())if(suppressed instanceof Exception){t.phase=t.phase.ordinal()<=EnrollmentTransferDiagnostic.Phase.OUTPUT_CLOSE.ordinal()?EnrollmentTransferDiagnostic.Phase.OUTPUT_CLOSE:EnrollmentTransferDiagnostic.Phase.READ_CLOSE;t.closeFailure=failure(t,(Exception)suppressed);break;}}
  finally{if(uri!=null)try{t.phase=EnrollmentTransferDiagnostic.Phase.REVOKE;t.activity.revokeUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);}catch(RuntimeException error){t.cleanup=failure(t,error);verified=false;}t.state.drained();finish(t,verified);}
 }
 private static EnrollmentTransferDiagnostic.Result result(Transfer t,boolean verified,EnrollmentTransferDiagnostic.Failure terminal){
  if(!verified&&t.primary==null&&t.cleanup==null&&terminal==null)t.primary=new EnrollmentTransferDiagnostic.Failure(t.phase,EnrollmentTransferDiagnostic.Code.UNKNOWN,EnrollmentTransferDiagnostic.Kind.UNKNOWN,0);
  return new EnrollmentTransferDiagnostic.Result(verified,verified?EnrollmentTransferDiagnostic.Phase.COMPLETE:terminal!=null?EnrollmentTransferDiagnostic.Phase.TERMINAL:t.primary!=null?t.primary.phase:t.cleanup!=null?t.cleanup.phase:t.phase,t.primary,t.cleanup,terminal,(int)Math.min(Integer.MAX_VALUE,Math.max(0,SystemClock.elapsedRealtime()-t.began)),t.bytes.length,t.hash,t.identity,t.reopened,t.closeFailure,t.readback==null?null:new EnrollmentTransferDiagnostic.Readback(t.readback.count,t.readback.hash,t.readback.stat,t.readback.statFailure==null?null:failure(EnrollmentTransferDiagnostic.Phase.READBACK,t.readback.statFailure),t.readback.finalIdentity,t.readback.sample,t.readback.total,t.readback.actualHash,t.readback.eof));
 }
 private static void finish(Transfer t,boolean verified){
  if(!t.state.finish())return;Runnable terminal=()->{EnrollmentTransferDiagnostic.Result value=result(t,verified,null);try{t.phase=EnrollmentTransferDiagnostic.Phase.TERMINAL;t.owner.endTransfer(value.bytes());}catch(Exception error){value=result(t,false,failure(t,error));}finally{synchronized(LOCK){completed.put(t.slot,new Completed(t,value));if(current==t)current=null;}}};
  if(Looper.myLooper()!=Looper.getMainLooper()){terminal.run();return;}
  try{new Thread(terminal,"p204-report-terminal").start();}catch(RuntimeException error){t.owner.transferUncertain();t.phase=EnrollmentTransferDiagnostic.Phase.TERMINAL;synchronized(LOCK){completed.put(t.slot,new Completed(t,result(t,false,failure(t,error))));if(current==t)current=null;/* owner deliberately remains poisoned */}}
 }
 /** Read-only snapshot: never reset a deadline, generation, cancellation or mutation owner. */
 public static EnrollmentReportDecision.Snapshot observation(String source,int slot,String session){synchronized(LOCK){Object token=current!=null&&current.slot==slot?current:completed.get(slot);return new EnrollmentReportDecision.Snapshot(token,status(source,slot,session));}}
 public static Map<String,Object> status(String source,int slot,String session){synchronized(LOCK){
  if(current!=null&&current.slot==slot){ObservedEnrollment.require(current.owner.source.equals(source)&&current.session.equals(session),"TRANSFER_STATUS_BINDING");return statusMap(slot,session,"PENDING","",current.phase.name());}
  Completed c=completed.get(slot);if(c!=null){ObservedEnrollment.require(c.source.equals(source)&&c.session.equals(session),"TRANSFER_STATUS_BINDING");return statusMap(slot,session,c.result.verified?"VERIFIED":"UNCERTAIN",new String(c.result.bytes(),StandardCharsets.US_ASCII),c.result.phase.name());}return null;
 }}
 public static Map<String,Object> statusMap(int slot,String session,String state,String terminal,String phase){Map<String,Object> m=new LinkedHashMap<>();m.put("report",slot);m.put("session",session);m.put("state",state);m.put("terminal",terminal);m.put("phase",phase);if(slot>=6){m.put("basis","LIVE");m.put("acknowledgment",state.equals("PENDING")?"PENDING":state.equals("VERIFIED")?"ACKNOWLEDGED":"FAILED");}return m;}
}

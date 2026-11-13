package local.cameracomponent;
import android.content.Context;
/** Application-scoped disk/record ownership; readback does not reacquire a lock. */
public final class AndroidOwner {
 private static RecordOwner owner;
 private static FixedSlots slots;
 public static synchronized RecordOwner get(Context context)throws Exception {
  if(owner==null){AndroidDisk disk=new AndroidDisk(context.getApplicationContext());try{FixedSlots fixed=new FixedSlots(disk,disk.diagnostic(),disk.retainedSuccess(),disk.trial());owner=new RecordOwner(fixed.diagnostic);slots=fixed;}catch(Exception e){disk.close();throw e;}}
  return owner;
 }
 public static synchronized void selectS03()throws Exception{Failure.require(owner!=null&&!owner.session.busy(),Failure.Code.BUSY,"S03-owner");slots.selectS03();}
 public static synchronized String retainedStatus()throws Exception{Failure.require(slots!=null,Failure.Code.NOT_READY,"S00-owner");return "S00: "+slots.retained.reopen()+"\nS01: "+slots.retainedS01.reopen()+"\nS02: "+slots.retainedSuccessStatus()+"\n"+slots.retainedInventory();}
 private AndroidOwner(){}
}

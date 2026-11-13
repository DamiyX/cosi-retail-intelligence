package expo.modules.recognitioncpu;
/** Pure accounting transition used by the Android control journal. No reservation refund by cancellation. */
public final class EnrollmentReportBudget {
 private EnrollmentReportBudget(){}
 public static final long FREE_FLOOR=268435456L;
 /** Logical allowance is not a physical reservation. Pending bytes are checked even when logicalExtra is zero. */
 public static void write(long used,long logicalExtra,long available,long pending){ObservedEnrollment.require(used>=0&&logicalExtra>=0&&logicalExtra<=ObservedEnrollment.CAP&&used<=ObservedEnrollment.CAP-logicalExtra,"REPORT_LOGICAL_QUOTA");physical(available,pending);}
 /** New slots are already charged from admission; old slots add their original full reservation. */
 public static void prepare(long used,long available,boolean preReserved){write(used,preReserved?0:12648448L,available,12648448L);}
 public static void physical(long available,long pending){ObservedEnrollment.require(pending>=0&&available>=FREE_FLOOR&&pending<=available-FREE_FLOOR,"REPORT_PHYSICAL_FREE_FLOOR");}
 public static long available(long blocks,long fragment){ObservedEnrollment.require(blocks>=0&&fragment>0,"REPORT_FILESYSTEM_SPACE");return Math.multiplyExact(blocks,fragment);}
 public static long[] slot(long internal,long controls,boolean prepared,long verifiedLength,Long verifiedDownload){
  ObservedEnrollment.require(internal>=0&&internal<=EnrollmentEvidence.HARD&&controls>=0&&controls<=65536,"REPORT_CHARGES");
  if(prepared)ObservedEnrollment.require(verifiedLength>0&&verifiedLength<=EnrollmentEvidence.HARD&&internal==verifiedLength,"REPORT_RESULT_INTERNAL");
  if(verifiedDownload!=null)ObservedEnrollment.require(prepared&&verifiedDownload.equals(verifiedLength),"EXPORT_LENGTH_BINDING");
  long reserved=(prepared?0:EnrollmentEvidence.HARD-internal)+65536-controls;
  long external=EnrollmentEvidence.HARD+(verifiedDownload==null?EnrollmentEvidence.HARD:verifiedDownload);
  return new long[]{reserved,external};
 }
}

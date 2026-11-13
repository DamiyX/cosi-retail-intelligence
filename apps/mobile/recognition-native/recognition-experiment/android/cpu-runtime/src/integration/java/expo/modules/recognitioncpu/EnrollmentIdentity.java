package expo.modules.recognitioncpu;
import java.util.Set;

/** Shared file identity policy; Android supplies lstat/fstat and host checks inject real filesystem observations. */
public final class EnrollmentIdentity {
 private EnrollmentIdentity(){}
 public static void regular(boolean file,long uid,long owner,long links,long size,long max){ObservedEnrollment.require(file&&uid==owner&&links==1&&size>=0&&size<=max,"FILE_IDENTITY");}
 public static void directory(String expected,String path,String held){ObservedEnrollment.require(expected.equals(path)&&expected.equals(held),"ROOT_CHANGED");}
 public static void file(String before,String path,String held){ObservedEnrollment.require(before.equals(path)&&before.equals(held),"FILE_CHANGED");}
 public static void inventory(String before,String held,String path,Set<String> names,Set<String> after){ObservedEnrollment.require(before.equals(held)&&before.equals(path)&&names.equals(after),"INVENTORY_CHANGED");}
}

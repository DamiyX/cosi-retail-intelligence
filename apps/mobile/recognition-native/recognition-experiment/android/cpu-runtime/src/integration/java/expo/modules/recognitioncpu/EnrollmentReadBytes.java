package expo.modules.recognitioncpu;
import java.io.*;
/** Actual bounded read loop used by the Android disk; only its staged-journal caller enables empty bytes. */
public final class EnrollmentReadBytes {
 private EnrollmentReadBytes(){}
 public static boolean scope(String name,boolean journal,boolean allowEmpty){if(!allowEmpty)return false;ObservedEnrollment.require(journal&&name.matches("event-[0-9]{4}\\.new")&&Integer.parseInt(name.substring(6,10))>=1&&Integer.parseInt(name.substring(6,10))<=4096,"EMPTY_READ_SCOPE");return true;}
 public static byte[] read(InputStream in,long size,int max,boolean allowEmpty)throws IOException{
  ObservedEnrollment.require(size>=0&&size<=max&&(allowEmpty||size>0),"READ_LENGTH");byte[] bytes=new byte[(int)size];int at=0;
  while(at<bytes.length){int n=in.read(bytes,at,bytes.length-at);ObservedEnrollment.require(n>0,"READ_TRUNCATED");at+=n;}
  ObservedEnrollment.require(in.read()==-1,"READ_CHANGED");return bytes;
 }
}

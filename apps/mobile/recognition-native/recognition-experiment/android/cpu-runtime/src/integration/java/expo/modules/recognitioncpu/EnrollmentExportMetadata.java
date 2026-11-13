package expo.modules.recognitioncpu;
import java.math.BigInteger;
import java.util.*;

/** Public-export samples only. Shared private identity comparisons remain byte-exact. */
public final class EnrollmentExportMetadata {
 public static final List<String> FIELDS=Collections.unmodifiableList(Arrays.asList("device","inode","mode","uid","links","size","mtimeSeconds","mtimeNanoseconds","ctimeSeconds","ctimeNanoseconds"));
 private static final BigInteger U64=new BigInteger("18446744073709551615"),U32=new BigInteger("4294967295"),I64=new BigInteger("9223372036854775807");
 public final String wire;private final BigInteger[] values;
 public EnrollmentExportMetadata(String wire){
  String[] parts=wire.split(":",-1);require(parts.length==10);values=new BigInteger[10];
  for(int i=0;i<10;i++){require(parts[i].matches("0|[1-9][0-9]{0,19}"));values[i]=new BigInteger(parts[i]);require(values[i].compareTo(U64)<=0);}
  require(values[2].compareTo(U32)<=0&&values[3].compareTo(U32)<=0&&values[5].compareTo(BigInteger.valueOf(4194304))<=0&&values[6].compareTo(I64)<=0&&values[8].compareTo(I64)<=0&&values[7].compareTo(BigInteger.valueOf(999999999))<=0&&values[9].compareTo(BigInteger.valueOf(999999999))<=0);this.wire=wire;
 }
 private static void require(boolean b){ObservedEnrollment.require(b,"TRANSFER_METADATA_SCHEMA");}
 public boolean regularSingleLength(int length){return values[2].and(BigInteger.valueOf(0170000)).intValue()==0100000&&values[4].equals(BigInteger.ONE)&&values[5].equals(BigInteger.valueOf(length));}
 public List<String> changed(EnrollmentExportMetadata after){List<String> result=new ArrayList<>();for(int i=0;i<10;i++)if(!values[i].equals(after.values[i]))result.add(FIELDS.get(i));return Collections.unmodifiableList(result);}
 public String comparison(EnrollmentExportMetadata after){
  for(int i=0;i<8;i++)if(!values[i].equals(after.values[i]))return "CHANGED";
  int seconds=after.values[8].compareTo(values[8]);int time=seconds!=0?seconds:after.values[9].compareTo(values[9]);return time==0?"MATCH":time>0?"ADVANCED":"CHANGED";
 }
}

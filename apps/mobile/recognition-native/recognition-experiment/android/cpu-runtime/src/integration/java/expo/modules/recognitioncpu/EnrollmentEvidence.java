package expo.modules.recognitioncpu;
import java.io.*;
import java.security.*;
import java.util.*;

/** Fixed BE container. Embedded native state/reference bytes and their float bits are never re-encoded. */
public final class EnrollmentEvidence {
 public static final int HEADER=16384,EVENT=360960,REFERENCES=1048576,WITNESSES=1048576,INVENTORY=1048576,FOOTER=4096,DERIVED=3527168,HARD=4194304;
 public static final int[] LIMITS={HEADER,EVENT,REFERENCES,WITNESSES,INVENTORY};
 private static final long MAGIC=0x5032303445563031L;
 private static final int TABLE=8+4+4+5*12;
 private EnrollmentEvidence(){}
 public static byte[] digest(byte[] b){try{return MessageDigest.getInstance("SHA-256").digest(b);}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 public static byte[] encode(byte[][] sections){
  ObservedEnrollment.require(sections!=null&&sections.length==5,"REPORT_SECTIONS");long length=TABLE+32;
  for(int i=0;i<5;i++){ObservedEnrollment.require(sections[i]!=null&&sections[i].length>0&&sections[i].length<=LIMITS[i]-(i==0?TABLE:0),"REPORT_SECTION_BOUND");length=Math.addExact(length,sections[i].length);}
  ObservedEnrollment.require(length<=DERIVED&&length<=HARD,"REPORT_SIZE");
  try{ByteArrayOutputStream bytes=new ByteArrayOutputStream((int)length);DataOutputStream d=new DataOutputStream(bytes);d.writeLong(MAGIC);d.writeInt(1);d.writeInt(5);int offset=TABLE;for(int i=0;i<5;i++){d.writeInt(i+1);d.writeInt(offset);d.writeInt(sections[i].length);offset+=sections[i].length;}for(byte[] b:sections)d.write(b);d.flush();d.write(digest(bytes.toByteArray()));d.flush();byte[] value=bytes.toByteArray();decode(value);return value;}catch(IOException e){throw new IllegalStateException("REPORT_ENCODING",e);}
 }
 public static byte[][] decode(byte[] bytes){
  ObservedEnrollment.require(bytes!=null&&bytes.length>=TABLE+37&&bytes.length<=HARD&&bytes.length<=DERIVED,"REPORT_SIZE");
  try{DataInputStream d=new DataInputStream(new ByteArrayInputStream(bytes));ObservedEnrollment.require(d.readLong()==MAGIC&&d.readInt()==1&&d.readInt()==5,"REPORT_SCHEMA");int[] lengths=new int[5];long offset=TABLE;for(int i=0;i<5;i++){ObservedEnrollment.require(d.readInt()==i+1&&d.readInt()==offset,"REPORT_ORDER_OR_OVERLAP");int n=d.readInt();ObservedEnrollment.require(n>0&&n<=LIMITS[i]-(i==0?TABLE:0)&&offset+n<=bytes.length-32,"REPORT_SECTION_BOUND");lengths[i]=n;offset+=n;}ObservedEnrollment.require(offset==bytes.length-32,"REPORT_TRAILING");byte[][] out=new byte[5][];for(int i=0;i<5;i++){out[i]=new byte[lengths[i]];d.readFully(out[i]);}byte[] hash=new byte[32];d.readFully(hash);ObservedEnrollment.require(d.available()==0&&MessageDigest.isEqual(hash,digest(Arrays.copyOf(bytes,bytes.length-32))),"REPORT_CHECKSUM");return out;}catch(IOException e){throw new IllegalStateException("REPORT_TRUNCATED",e);}
 }
 /** Every framed reference uses its actual production bounds; no reduced maximum fixture. */
 public static byte[] reference(ObservedEnrollment.Reference ref,byte[] geometry,byte[] receipt,byte[] featureReceipt,byte[] feature, int role){
  byte[] raw=ObservedEnrollment.referenceBytes(ref);ObservedEnrollment.require(raw.length<=8192&&geometry.length>0&&geometry.length<=4096&&receipt.length>0&&receipt.length<=1024&&featureReceipt.length>0&&featureReceipt.length<=2048&&feature.length==4096&&(role==1||role==4),"REPORT_REFERENCE_BOUNDS");
  ObservedEnrollment.require(ObservedEnrollment.hash(geometry).equals(ref.geometry)&&ObservedEnrollment.hash(receipt).equals(ref.receipt),"REPORT_REFERENCE_DIGEST");
  java.nio.ByteBuffer values=java.nio.ByteBuffer.allocate(4096).order(java.nio.ByteOrder.LITTLE_ENDIAN);for(float f:ref.vector())values.putFloat(f);ObservedEnrollment.require(Arrays.equals(feature,values.array()),"REPORT_FEATURE_BITS");
  String expected="schema=1|job="+ref.job+"|product="+ref.product+"|view="+ref.view+"|epoch="+ref.epoch+"|reference="+ObservedEnrollment.hash(raw)+"|feature="+ObservedEnrollment.hash(feature)+"|acquisition="+ObservedEnrollment.ACQUISITION+"|processing="+ObservedEnrollment.PROCESSING;
  ObservedEnrollment.require(expected.equals(new String(featureReceipt,java.nio.charset.StandardCharsets.US_ASCII)),"REPORT_FEATURE_RECEIPT");
  try{ByteArrayOutputStream b=new ByteArrayOutputStream();DataOutputStream d=new DataOutputStream(b);d.writeInt(role);for(byte[] data:new byte[][]{raw,geometry,receipt,featureReceipt,digest(feature)}){d.writeInt(data.length);d.write(data);}d.flush();ObservedEnrollment.require(b.size()+4<=16384,"REPORT_REFERENCE_BLOCK");ByteArrayOutputStream framed=new ByteArrayOutputStream();DataOutputStream f=new DataOutputStream(framed);f.writeInt(b.size());f.write(b.toByteArray());return framed.toByteArray();}catch(IOException e){throw new IllegalStateException(e);}
 }
}

package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Immutable real-product roster; does not alter canonical v1 journal state bytes. */
public final class EnrollmentDescriptor {
 public static final int LIMIT=8192;
 public static final String PURPOSE="REAL_PRODUCT_ENROLLMENT";
 public final String experiment,source,rosterHash;
 public final List<String> labels;
 public interface Disk { byte[] descriptor()throws Exception; void publishDescriptor(byte[] bytes)throws Exception; }
 public EnrollmentDescriptor(String experiment,String source,List<String> labels){
  ObservedEnrollment.require(experiment!=null&&experiment.matches("[a-zA-Z0-9][a-zA-Z0-9-]{0,63}"),"SESSION_ID");ObservedEnrollment.digest(source);
  ObservedEnrollment.require(labels!=null&&labels.size()==10,"CONFIRMED_TEN_PRODUCTS");Set<String> distinct=new HashSet<>();List<String> copy=new ArrayList<>();
  for(String label:labels){ObservedEnrollment.text(label,192);ObservedEnrollment.require(label.codePoints().noneMatch(c->c>=0xd800&&c<=0xdfff),"ROSTER_UNPAIRED_SURROGATE");ObservedEnrollment.require(label.equals(label.trim())&&!label.matches("(?i)product[ -]?0?[0-9]+")&&distinct.add(label.toLowerCase(Locale.ROOT)),"ROSTER_DUPLICATE_OR_SPACE");copy.add(label);}
  this.experiment=experiment;this.source=source;this.labels=Collections.unmodifiableList(copy);rosterHash=ObservedEnrollment.hash(rosterBytes(copy));
 }
 private static byte[] rosterBytes(List<String> labels){try{ByteArrayOutputStream b=new ByteArrayOutputStream();DataOutputStream d=new DataOutputStream(b);d.writeInt(labels.size());for(String label:labels)d.writeUTF(label);d.flush();return b.toByteArray();}catch(IOException e){throw new IllegalStateException(e);}}
 public byte[] bytes(){try{ByteArrayOutputStream b=new ByteArrayOutputStream();DataOutputStream d=new DataOutputStream(b);d.writeInt(1);d.writeUTF(PURPOSE);d.writeUTF(experiment);d.writeUTF(source);d.writeUTF(rosterHash);d.write(rosterBytes(labels));d.flush();byte[] raw=b.toByteArray();ObservedEnrollment.require(raw.length<=LIMIT,"DESCRIPTOR_BYTES");return raw;}catch(IOException e){throw new IllegalStateException(e);}}
 public static EnrollmentDescriptor read(byte[] raw){try{ObservedEnrollment.require(raw!=null&&raw.length>0&&raw.length<=LIMIT,"DESCRIPTOR_BYTES");DataInputStream d=new DataInputStream(new ByteArrayInputStream(raw));ObservedEnrollment.require(d.readInt()==1&&d.readUTF().equals(PURPOSE),"DESCRIPTOR_SCHEMA");String id=d.readUTF(),source=d.readUTF(),hash=d.readUTF();ObservedEnrollment.require(d.readInt()==10,"CONFIRMED_TEN_PRODUCTS");List<String> labels=new ArrayList<>();for(int i=0;i<10;i++)labels.add(d.readUTF());EnrollmentDescriptor value=new EnrollmentDescriptor(id,source,labels);ObservedEnrollment.require(d.available()==0&&hash.equals(value.rosterHash)&&Arrays.equals(raw,value.bytes()),"DESCRIPTOR_CANONICAL");return value;}catch(IOException e){throw new IllegalStateException("DESCRIPTOR_TRUNCATED",e);}}
 /** Caller owns the drained global operation gate. Descriptor-only recovery requires explicit identical request. */
 public static void initialize(Disk disk,EnrollmentStore store,EnrollmentDescriptor requested)throws Exception{
  byte[] old=disk.descriptor();
  if(store.initialized()){
   ObservedEnrollment.require(old!=null,"LEGACY_SESSION_NO_DESCRIPTOR");EnrollmentDescriptor saved=read(old);ObservedEnrollment.require(Arrays.equals(saved.bytes(),requested.bytes()),"IMMUTABLE_ROSTER");throw new IllegalStateException("ALREADY_CREATED");
  }
  ObservedEnrollment.require(old==null&&store.consumedEvents()==0,"INITIALIZATION_REQUIRES_RECONCILIATION");
  disk.publishDescriptor(requested.bytes());
  ObservedEnrollment.require(Arrays.equals(disk.descriptor(),requested.bytes()),"DESCRIPTOR_READBACK");store.create(requested.labels,true);
 }
 public void validate(ObservedEnrollment.State state){ObservedEnrollment.require(state.products().size()==labels.size(),"SESSION_ROSTER_CHANGED");for(int i=0;i<labels.size();i++)ObservedEnrollment.require(labels.get(i).equals(state.products().get(i).label),"SESSION_ROSTER_CHANGED");}
}

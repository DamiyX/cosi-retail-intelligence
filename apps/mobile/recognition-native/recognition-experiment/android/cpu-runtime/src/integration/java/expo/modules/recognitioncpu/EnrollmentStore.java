package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Immutable hash-chained state snapshots. A publication exception poisons this instance until explicit recovery. */
public final class EnrollmentStore {
 public interface Disk {Set<String> names()throws Exception;byte[] read(String name,int max)throws Exception;void publish(String name,byte[] bytes)throws Exception;long used()throws Exception;long free()throws Exception;}
 public interface Mutation {void apply(ObservedEnrollment.State state)throws Exception;}
 public static final int EVENT_BYTES=ObservedEnrollment.STATE_BYTES+256;
 private final Disk disk;private ObservedEnrollment.State state;private int sequence,consumedEvents;private String head=String.join("",Collections.nCopies(64,"0"));private boolean uncertain;
 private final Map<Integer,ObservedEnrollment.Reference> references=new TreeMap<>();
 public EnrollmentStore(Disk disk)throws Exception{this.disk=disk;recover();}
 public static String name(int sequence){ObservedEnrollment.require(sequence>=1&&sequence<=ObservedEnrollment.MAX_EVENTS,"EVENT_LIMIT");return String.format(Locale.ROOT,"event-%04d",sequence);}
 private void recover()throws Exception{
  Set<String> names=disk.names();ObservedEnrollment.require(names.size()<=ObservedEnrollment.MAX_EVENTS,"EVENT_COUNT");
  for(String key:names){ObservedEnrollment.require(key.matches("event-[0-9]{4}(\\.new)?"),"EVENT_NAME");int id=Integer.parseInt(key.substring(6,10));ObservedEnrollment.require(id>=1&&id<=ObservedEnrollment.MAX_EVENTS,"EVENT_NAME");consumedEvents=Math.max(consumedEvents,id);}
  // Physical IDs include orphan stages and are never reused. Only published events advance logical state.
  for(int id=1;id<=consumedEvents;id++){
   String key=name(id);boolean committed=names.contains(key),stage=names.contains(key+".new");
   ObservedEnrollment.require(committed!=stage,"EVENT_GAP_OR_DUPLICATE");if(stage)continue;
   byte[] bytes=disk.read(key,EVENT_BYTES);try(DataInputStream d=new DataInputStream(new ByteArrayInputStream(bytes))){ObservedEnrollment.require(d.readInt()==2&&d.readInt()==sequence+1&&d.readInt()==id&&d.readUTF().equals(head),"EVENT_CHAIN");int len=d.readInt();ObservedEnrollment.require(len>0&&len<=ObservedEnrollment.STATE_BYTES&&len<=d.available()-66,"EVENT_LENGTH");byte[] body=new byte[len];d.readFully(body);String sum=d.readUTF();ObservedEnrollment.require(d.available()==0&&sum.equals(ObservedEnrollment.hash(body)),"EVENT_HASH");ObservedEnrollment.State next=ObservedEnrollment.State.read(body);if(state!=null){if(!state.frozen().isEmpty())ObservedEnrollment.require(next.revision()==state.revision()+1&&next.frozen().isEmpty(),"FROZEN_MUTATION");else ObservedEnrollment.require(next.revision()==state.revision(),"REVISION_WITHOUT_FREEZE");ObservedEnrollment.require(next.attempts()>=state.attempts()&&next.attempts()<=state.attempts()+1&&next.revision()>=state.revision()&&next.revision()<=state.revision()+1,"STATE_SEQUENCE");ObservedEnrollment.require(next.products().size()==state.products().size(),"ROSTER_CHANGED");for(int p=0;p<state.products().size();p++)ObservedEnrollment.require(next.products().get(p).label.equals(state.products().get(p).label),"ROSTER_CHANGED");}references(next,true);state=next;head=ObservedEnrollment.hash(bytes);sequence++;}
  }
 }
 public synchronized boolean initialized(){return state!=null;}
 public synchronized ObservedEnrollment.State snapshot(){ObservedEnrollment.require(!uncertain&&state!=null,"RECOVERY_REQUIRED");return ObservedEnrollment.State.read(state.bytes());}
 public synchronized int sequence(){return sequence;}
 public synchronized int consumedEvents(){return consumedEvents;}
 public synchronized List<ObservedEnrollment.Reference> historicalReferences(){return Collections.unmodifiableList(new ArrayList<>(references.values()));}
 private void references(ObservedEnrollment.State value,boolean retain){List<ObservedEnrollment.Reference> list=new ArrayList<>();for(ObservedEnrollment.Product p:value.products())for(int v=0;v<4;v++)if(p.view(v)!=null)list.add(p.view(v));if(value.candidate()!=null)list.add(value.candidate());for(ObservedEnrollment.Reference ref:list){ObservedEnrollment.Reference old=references.get(ref.job);ObservedEnrollment.require(old==null||Arrays.equals(ObservedEnrollment.referenceBytes(old),ObservedEnrollment.referenceBytes(ref)),"IMMUTABLE_REFERENCE_CHANGED");if(retain)references.put(ref.job,ref);}ObservedEnrollment.require(references.size()<=64,"REFERENCE_COUNT");}
 public synchronized String head(){return head;}
 public synchronized void create(List<String> labels,boolean barcodeAvailable)throws Exception{ObservedEnrollment.require(!uncertain&&state==null&&sequence==0&&consumedEvents==0&&disk.names().isEmpty(),"ALREADY_CREATED");append(new ObservedEnrollment.State(labels,barcodeAvailable));}
 public synchronized void transact(int expectedSequence,Mutation mutation)throws Exception{ObservedEnrollment.require(!uncertain&&state!=null&&expectedSequence==sequence,"STALE_SNAPSHOT");ObservedEnrollment.State next=ObservedEnrollment.State.read(state.bytes());mutation.apply(next);append(next);}
 /** Explicit recovery records one interrupt classification. It never starts an SDK/model job. */
 public synchronized boolean classifyInterrupted()throws Exception{ObservedEnrollment.State current=snapshot();if(current.pending()==null)return false;ObservedEnrollment.Pending p=current.pending();transact(sequence,s->s.interrupt(p.job,p.epoch));return true;}
 private void append(ObservedEnrollment.State next)throws Exception{
  ObservedEnrollment.require(!uncertain&&consumedEvents<ObservedEnrollment.MAX_EVENTS,"EVENT_LIMIT");byte[] body=next.bytes();ObservedEnrollment.State.read(body);references(next,false);ByteArrayOutputStream buffer=new ByteArrayOutputStream();try(DataOutputStream d=new DataOutputStream(buffer)){d.writeInt(2);d.writeInt(sequence+1);d.writeInt(consumedEvents+1);d.writeUTF(head);d.writeInt(body.length);d.write(body);d.writeUTF(ObservedEnrollment.hash(body));}byte[] bytes=buffer.toByteArray();ObservedEnrollment.require(bytes.length<=EVENT_BYTES,"EVENT_BYTES");long used=disk.used();ObservedEnrollment.require(used>=ObservedEnrollment.RETAINED_PROOFS&&used<=ObservedEnrollment.CAP-bytes.length&&disk.free()>=256L*1024*1024+bytes.length,"QUOTA");String key=name(consumedEvents+1);
  try{disk.publish(key,bytes);ObservedEnrollment.require(Arrays.equals(disk.read(key,EVENT_BYTES),bytes),"EVENT_READBACK");references(next,true);state=next;head=ObservedEnrollment.hash(bytes);sequence++;consumedEvents++;}catch(Exception e){uncertain=true;throw e;}
 }
}

package expo.modules.recognitioncpu;
import java.io.*;
import java.util.*;
/** Fixed original request, read-only classifier, and explicitly confirmed continuation. */
public final class EnrollmentInitialization {
 public static final String ORIGINAL_SOURCE="3d9ad3427b4f192d1a3cf8f918e1403ff8e3d82fe803724cca4541d033d11a4f";
 public static final EnrollmentDescriptor EXPECTED=new EnrollmentDescriptor("enrollment-mw4zmxro",ORIGINAL_SOURCE,Arrays.asList("Fanta Orange / 33cl","Airport air freshener / Cherry Blossom,  300ml","GM Whiteboard cleaner / 8.44 fl  oz","CWAY water / 750ml","CWAY water / 600ml","Hair brush / Wooden red","Freshglow Bar soap / Milk & papaya","NIVEVA MEN roll-on / Dry Impact 72H, 50ml","Itel light bulb / 10W","Godrej aer / Lemon Tangy  Delight, 10g"));
 public static final class Refusal extends Exception {public final String code;public Refusal(String code){super("Bounded initialization observation refused");ObservedEnrollment.require(Arrays.asList("ACCESS_DENIED","OBSERVATION_CANCELLED","IO_UNAVAILABLE","IDENTITY_CHANGED","READ_BOUND","STAGE_OVERSIZED","DESCRIPTOR_OVERSIZED").contains(code),"OBSERVATION_CODE");this.code=code;}}
 public interface Disk {
  View observe()throws Exception;
  void publishExistingStage(View observed)throws Exception;
  void createInitialEvent()throws Exception;
 }
 public interface JournalReader {byte[] read(String name,int max)throws Exception;}
 public static final class View {
  private final JournalReader reader;
  public final byte[] descriptor,stage; public final Map<String,byte[]> journal; public final String descriptorIdentity,stageIdentity,journalIdentity;
  public View(byte[] descriptor,byte[] stage,Map<String,byte[]> journal,String descriptorIdentity,String stageIdentity,String journalIdentity){this(descriptor,stage,journal,descriptorIdentity,stageIdentity,journalIdentity,null);}
  public View(byte[] descriptor,byte[] stage,Map<String,byte[]> journal,String descriptorIdentity,String stageIdentity,String journalIdentity,JournalReader reader){this.reader=reader;
   this.descriptor=descriptor==null?null:descriptor.clone();this.stage=stage==null?null:stage.clone();TreeMap<String,byte[]> copy=new TreeMap<>();journal.forEach((k,v)->copy.put(k,v.clone()));this.journal=Collections.unmodifiableMap(copy);this.descriptorIdentity=descriptorIdentity;this.stageIdentity=stageIdentity;this.journalIdentity=journalIdentity;
  }
  byte[] readJournal(String name,int max)throws Exception{ObservedEnrollment.require(journal.containsKey(name),"JOURNAL_SCOPE");byte[] b=reader==null?journal.get(name):reader.read(name,max);ObservedEnrollment.require(b!=null&&b.length<=max,"JOURNAL_READ");return b.clone();}
  String token(){try{ByteArrayOutputStream b=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(b);out.writeUTF(descriptorIdentity);out.writeUTF(stageIdentity);out.writeUTF(journalIdentity);for(byte[] data:new byte[][]{descriptor,stage}){out.writeInt(data==null?-1:data.length);if(data!=null)out.write(data);}out.writeInt(journal.size());for(Map.Entry<String,byte[]> e:journal.entrySet()){out.writeUTF(e.getKey());out.writeInt(e.getValue().length);out.write(e.getValue());}return ObservedEnrollment.hash(b.toByteArray());}catch(IOException e){throw new IllegalStateException(e);}}
 }
 static EnrollmentStore journal(View v)throws Exception{return new EnrollmentStore(new EnrollmentStore.Disk(){public Set<String> names(){return v.journal.keySet();}public byte[] read(String n,int max)throws Exception{return v.readJournal(n,max);}public void publish(String n,byte[] b){throw new IllegalStateException("READ_ONLY");}public long used(){throw new IllegalStateException("READ_ONLY");}public long free(){throw new IllegalStateException("READ_ONLY");}});}
 public static boolean original(EnrollmentDescriptor d){return Arrays.equals(d.bytes(),EXPECTED.bytes());}
 public static boolean sourceMatches(EnrollmentDescriptor d,String implementation){return d.source.equals(implementation)||original(d);}
 private static String digest(byte[] data){return data==null?"":ObservedEnrollment.hash(data);}
 public static Map<String,Object> inspect(Disk disk,String implementation,Runnable live){
  ObservedEnrollment.digest(implementation);try{live.run();View before=disk.observe();Map<String,Object> result=classify(before,implementation);live.run();View after=disk.observe();if(!before.token().equals(after.token()))return unknown(implementation,"OBSERVATION_CHANGED");return result;}catch(Refusal e){return result(e.code.equals("STAGE_OVERSIZED")?"INVALID_STAGE":e.code.equals("DESCRIPTOR_OVERSIZED")?"CONFLICT":"UNKNOWN",e.code,null,implementation,false,false,0,0,"0".repeat(64));}catch(Exception e){return unknown(implementation,"OBSERVATION_FAILED");}
 }
 private static Map<String,Object> unknown(String implementation,String code){return result("UNKNOWN",code,null,implementation,false,false,0,0,"0".repeat(64));}
 private static Map<String,Object> result(String status,String code,View v,String implementation,boolean descriptorMatch,boolean journalMatch,int sequence,int consumed,String head){
  List<Integer> publishedIds=new ArrayList<>(),stagedIds=new ArrayList<>();
  if(v!=null)for(String name:v.journal.keySet())if(name.matches("event-[0-9]{4}(\\.new)?")){int id=Integer.parseInt(name.substring(6,10));if(id>=1&&id<=4096){(name.endsWith(".new")?stagedIds:publishedIds).add(id);consumed=Math.max(consumed,id);}}
  Collections.sort(publishedIds);Collections.sort(stagedIds);
  Map<String,Object> m=new LinkedHashMap<>();m.put("publishedIds",publishedIds);m.put("stagedIds",stagedIds);m.put("journalVerified",Arrays.asList("ABSENT","MATCHING_STAGE","DESCRIPTOR_ONLY","COMMITTED_MATCH").contains(status));m.put("status",status);m.put("phase","OBSERVE");m.put("code",code);m.put("implementationSource",implementation);m.put("descriptorSource",ORIGINAL_SOURCE);m.put("expectedDescriptorHash",digest(EXPECTED.bytes()));m.put("expectedRosterHash",EXPECTED.rosterHash);m.put("observationHash",v==null?"":v.token());m.put("descriptorHash",v==null?"":digest(v.descriptor));m.put("stageHash",v==null?"":digest(v.stage));m.put("descriptorMatch",descriptorMatch);m.put("journalMatch",journalMatch);m.put("sequence",sequence);m.put("consumedEvents",consumed);m.put("head",head);m.put("descriptorIdentity",v==null?"":v.descriptorIdentity);m.put("stageIdentity",v==null?"":v.stageIdentity);m.put("journalIdentity",v==null?"":v.journalIdentity);return m;
 }
 static Map<String,Object> classify(View v,String implementation)throws Exception{
  String status;boolean match=false,journalMatch=false;int sequence=0,consumed=0;String head="0".repeat(64);
  if(v.descriptor!=null&&v.stage!=null)return result("CONFLICT","DESCRIPTOR_AND_STAGE",v,implementation,false,false,0,0,head);
  byte[] candidate=v.descriptor!=null?v.descriptor:v.stage;
  if(candidate!=null){try{EnrollmentDescriptor parsed=EnrollmentDescriptor.read(candidate);match=original(parsed);}catch(Exception e){return result(v.stage!=null?"INVALID_STAGE":"CONFLICT","DESCRIPTOR_INVALID",v,implementation,false,false,0,0,head);}if(!match)return result("CONFLICT","REQUEST_MISMATCH",v,implementation,false,false,0,0,head);}
  if(v.journal.size()>4096||v.journal.keySet().stream().anyMatch(n->n.endsWith(".new")))return result("JOURNAL_UNCERTAIN","JOURNAL_STAGE_OR_LIMIT",v,implementation,match,false,0,0,head);
  EnrollmentStore store;
  try{store=journal(v);sequence=store.sequence();consumed=store.consumedEvents();head=store.head();}catch(Refusal e){throw e;}catch(Exception e){return result("JOURNAL_UNCERTAIN","JOURNAL_INVALID",v,implementation,match,false,0,0,head);}
  if(store.initialized()){
   try{EXPECTED.validate(store.snapshot());journalMatch=true;}catch(Exception e){return result("CONFLICT","JOURNAL_ROSTER_MISMATCH",v,implementation,match,false,sequence,consumed,head);}
   status=v.descriptor!=null&&match?"COMMITTED_MATCH":"JOURNAL_UNCERTAIN";
  }else if(!v.journal.isEmpty()||consumed!=0)status="JOURNAL_UNCERTAIN";
  else status=candidate==null?"ABSENT":v.stage!=null?"MATCHING_STAGE":"DESCRIPTOR_ONLY";
  return result(status,status,v,implementation,match,journalMatch,sequence,consumed,head);
 }
 public static Map<String,Object> resume(Disk disk,String implementation,String expectedObservation,boolean confirmed,Runnable live){
  Map<String,Object> before=inspect(disk,implementation,live);String status=(String)before.get("status"),operation="REFUSED",primary="INELIGIBLE";
  if(confirmed&&!expectedObservation.isEmpty()&&expectedObservation.equals(before.get("observationHash"))){
   if(status.equals("COMMITTED_MATCH")){operation="ALREADY_COMPLETE";primary="NO_WRITE";}
   else if(status.equals("MATCHING_STAGE")||status.equals("DESCRIPTOR_ONLY")){
    String phase="REVALIDATE";try{live.run();View held=disk.observe();ObservedEnrollment.require(held.token().equals(expectedObservation),"STALE_OBSERVATION");
     if(status.equals("MATCHING_STAGE")){phase="PUBLISH_DESCRIPTOR";live.run();disk.publishExistingStage(held);}
     phase="VERIFY_DESCRIPTOR";live.run();View published=disk.observe();Map<String,Object> checked=classify(published,implementation);ObservedEnrollment.require(checked.get("status").equals("DESCRIPTOR_ONLY")&&published.journal.isEmpty(),"JOURNAL_NOT_EMPTY");
     phase="CREATE_EVENT";live.run();disk.createInitialEvent();operation="CONTINUED";primary="COMPLETE";
    }catch(Exception e){operation="UNCERTAIN";primary=phase+"_UNVERIFIED";}
   }
  }else primary=confirmed?"STALE_OBSERVATION":"CONFIRMATION_REQUIRED";
  Map<String,Object> out=new LinkedHashMap<>();out.put("operation",operation);out.put("primaryCode",primary);out.put("readback",inspect(disk,implementation,live));return out;
 }
}

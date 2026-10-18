package expo.modules.recognitioncpu;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
public final class PhoneOfflineGateChecks {
  static int count=0;
  static PhoneOfflineGate.Snapshot s(String a,String w,String b,String p){return new PhoneOfflineGate.Snapshot(a,w,b,p);}
  static void test(boolean value,String name){if(!value)throw new AssertionError(name);count++;}
  static boolean eligible(PhoneOfflineGate.Snapshot x){return PhoneOfflineGate.evaluate(x,x).eligible;}
  public static void main(String[] args){
    String p="cell,bluetooth,wifi,nfc,wimax";
    test(eligible(s("1","3","2",p)),"synthetic optional nfc/wimax 1/3/2 supported airplane policy");
    test(eligible(s("1","0","0",p)),"standard all-zero radios");
    test(eligible(s("1","3","0","cell,wifi,bluetooth")),"wifi airplane saved policy");
    test(eligible(s("1","0","2","cell,wifi,bluetooth")),"bluetooth airplane saved policy");
    for(String a:new String[]{"0","2","-1","01","true","",null})test(!eligible(s(a,"3","2",p)),"airplane invalid "+a);
    for(String w:new String[]{"1","2","4","-1"," 0","",null})test(!eligible(s("1",w,"2",p)),"wifi invalid "+w);
    for(String b:new String[]{"1","3","-1","00","",null})test(!eligible(s("1","3",b,p)),"bluetooth invalid "+b);
    for(String policy:new String[]{null,"","cell,wifi","cell,bluetooth","wifi,bluetooth","cell,wifi,bluetooth,unknown","cell,wifi,bluetooth,","cell,wifi,wifi,bluetooth","CELL,wifi,bluetooth","cell, wifi,bluetooth"})test(!eligible(s("1","3","2",policy)),"policy invalid "+policy);
    test(!PhoneOfflineGate.evaluate(s("1","3","2",p),s("0","3","2",p)).eligible,"airplane transition");
    test(!PhoneOfflineGate.evaluate(s("1","3","2",p),s("1","1","2",p)).eligible,"wifi transition");
    test(!PhoneOfflineGate.evaluate(s("1","3","2",p),s("1","3","1",p)).eligible,"bluetooth transition");
    test(!PhoneOfflineGate.evaluate(s("1","3","2",p),s("1","3","2","cell,wifi")).eligible,"policy transition");
    test(!PhoneOfflineGate.evaluate(null,null).eligible,"missing snapshot");
    test(PhoneOfflineGate.check(()->{throw new Exception("private details");}).reason.equals("READ_ERROR"),"read error sanitized");
    AtomicInteger clock=new AtomicInteger();test(PhoneOfflineGate.check(()->s("1","3","2",p),()->clock.getAndIncrement()==0?0:1_000_000_001L).reason.equals("READ_TIMEOUT"),"late reads refuse");
    AtomicBoolean busy=new AtomicBoolean(true),closed=new AtomicBoolean(false);AtomicInteger reads=new AtomicInteger();
    PhoneOfflineGate.Reader reader=()->{reads.incrementAndGet();return s("1","3","2",p);};
    test(PhoneOfflineGate.status(reader,busy::get,closed::get).reason.equals("BUSY") && reads.get()==0 && busy.get(),"busy status does not read or release owner");
    busy.set(false);closed.set(true);test(PhoneOfflineGate.status(reader,busy::get,closed::get).reason.equals("CLOSED") && reads.get()==0,"closed does not read");
    closed.set(false);test(PhoneOfflineGate.status(reader,busy::get,closed::get).eligible && !busy.get(),"status eligible without owning gate");
    test(PhoneOfflineGate.status(()->{busy.set(true);return s("1","3","2",p);},busy::get,closed::get).reason.equals("BUSY") && busy.get(),"busy raced read does not clear operation");
    busy.set(false);test(PhoneOfflineGate.status(()->{closed.set(true);return s("1","3","2",p);},busy::get,closed::get).reason.equals("CLOSED"),"teardown raced read");
    AtomicInteger sequence=new AtomicInteger();test(!PhoneOfflineGate.check(()->sequence.getAndIncrement()==0?s("1","3","2",p):s("1","1","2",p)).eligible,"same shared read refuses cancellation drift");
    test(PhoneOfflineGate.check(reader).eligible,"shared admission");
    test(!PhoneOfflineGate.check(()->s("1","1","2",p)).eligible,"shared repeated cancellation");
    test(count==49,"all original 49 meaningful cases retained");
    String actual="cell,bluetooth,uwb,wifi,wimax";
    for(String policy:new String[]{actual,"cell,wifi,bluetooth,uwb","uwb,cell,wifi,bluetooth,nfc,wimax"}) {
      for(String wifi:new String[]{"0","3"})for(String bluetooth:new String[]{"0","2"}) {
        PhoneOfflineGate.Snapshot snapshot=s("1",wifi,bluetooth,policy);
        test(eligible(snapshot),"full supported policy evaluate "+policy+"/"+wifi+"/"+bluetooth);
        test(PhoneOfflineGate.check(()->snapshot).eligible,"full supported policy shared admission "+policy);
        test(PhoneOfflineGate.status(()->snapshot,()->false,()->false).eligible,"full supported policy diagnostic "+policy);
      }
    }
    for(String policy:new String[]{actual+",unknown",actual+",uwb",actual+",",actual.replace("uwb","UWB"),actual.replace("uwb"," uwb"),"cell,uwb,wifi,wimax","bluetooth,uwb,wifi,wimax","cell,bluetooth,uwb,wimax"}) {
      test(!PhoneOfflineGate.check(()->s("1","3","2",policy)).eligible,"actual policy malformed/required/unknown/duplicate refuses admission "+policy);
      test(!PhoneOfflineGate.status(()->s("1","3","2",policy),()->false,()->false).eligible,"actual invalid policy diagnostic refuses "+policy);
    }
    AtomicInteger actualReads=new AtomicInteger();
    test(!PhoneOfflineGate.check(()->actualReads.getAndIncrement()==0?s("1","3","2",actual):s("1","1","2",actual)).eligible,"actual full policy cancellation refuses wifi drift");
    test(!PhoneOfflineGate.check(()->s("1","3","1",actual)).eligible,"actual full policy cancellation refuses bluetooth enabled");
    test(!PhoneOfflineGate.check(()->s("0","3","2",actual)).eligible,"actual full policy cancellation refuses airplane off");
    test(!PhoneOfflineGate.check(()->s("1","3","2",actual+",unknown")).eligible,"actual full policy cancellation refuses unknown extra");
    test(PhoneOfflineGate.check(()->s("1","3","2",actual)).eligible,"actual full policy cancellation continuation when unchanged");
    AtomicInteger policyReads=new AtomicInteger();
    test(!PhoneOfflineGate.check(()->s("1","3","2",policyReads.getAndIncrement()==0?actual:actual.replace("uwb,",""))).eligible,"actual supported-to-supported policy transition refuses");
    System.out.println("PASS "+count+" actual saved-policy/status assertions; no store, decoder or model.");
  }
}

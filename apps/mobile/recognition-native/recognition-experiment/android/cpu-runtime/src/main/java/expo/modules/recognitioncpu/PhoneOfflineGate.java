package expo.modules.recognitioncpu;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.function.BooleanSupplier;
import java.util.function.LongSupplier;

/** Saved Android policy only. Live hardware/network proof remains a separate requirement. */
public final class PhoneOfflineGate {
  public interface Reader { Snapshot read() throws Exception; }
  public static final class Snapshot {
    public final String airplane, wifi, bluetooth, radios;
    public Snapshot(String airplane, String wifi, String bluetooth, String radios) {
      this.airplane=airplane; this.wifi=wifi; this.bluetooth=bluetooth; this.radios=radios;
    }
    boolean same(Snapshot other) {
      return other!=null && Objects.equals(airplane,other.airplane) && Objects.equals(wifi,other.wifi)
          && Objects.equals(bluetooth,other.bluetooth) && Objects.equals(radios,other.radios);
    }
  }
  public static final class Result {
    public final boolean eligible, policySupported, coherent;
    public final String reason;
    public final Integer airplane, wifiPolicy, bluetoothPolicy;
    Result(String reason, Integer airplane, Integer wifi, Integer bluetooth, boolean policy, boolean coherent) {
      this.reason=reason; this.eligible="ELIGIBLE".equals(reason); this.airplane=airplane;
      this.wifiPolicy=wifi; this.bluetoothPolicy=bluetooth; this.policySupported=policy; this.coherent=coherent;
    }
  }
  private static Result refused(String reason) { return new Result(reason,null,null,null,false,false); }
  private static Integer scalar(String raw,int max) {
    if(raw==null || raw.length()!=1 || raw.charAt(0)<'0' || raw.charAt(0)>'0'+max)return null;
    return raw.charAt(0)-'0';
  }
  private static boolean policy(String radios) {
    if(radios==null || radios.length()>128)return false;
    Set<String> found=new HashSet<>();
    for(String token:radios.split(",",-1)) {
      if(!token.equals("cell") && !token.equals("wifi") && !token.equals("bluetooth") && !token.equals("nfc") && !token.equals("wimax") && !token.equals("uwb"))return false;
      if(!found.add(token))return false;
    }
    return found.contains("cell") && found.contains("wifi") && found.contains("bluetooth");
  }
  public static Result evaluate(Snapshot first,Snapshot second) {
    if(first==null || second==null)return refused("MISSING");
    if(!first.same(second))return refused("STATE_CHANGED");
    if(first.airplane==null || first.wifi==null || first.bluetooth==null || first.radios==null)return refused("MISSING");
    Integer a=scalar(first.airplane,1),w=scalar(first.wifi,3),b=scalar(first.bluetooth,2);
    boolean supported=policy(first.radios);
    String reason=a==null || w==null || b==null ? "MALFORMED" : a!=1 ? "AIRPLANE_REQUIRED"
        : !supported ? "POLICY_UNSUPPORTED" : !(w==0 || w==3) ? "WIFI_ENABLED"
        : !(b==0 || b==2) ? "BLUETOOTH_ENABLED" : "ELIGIBLE";
    return new Result(reason,a,w,b,supported,true);
  }
  public static Result check(Reader reader) { return check(reader,System::nanoTime); }
  public static Result check(Reader reader,LongSupplier clock) {
    try {
      long start=clock.getAsLong(); Snapshot first=reader.read(),second=reader.read();
      if(clock.getAsLong()-start>1_000_000_000L)return refused("READ_TIMEOUT");
      return evaluate(first,second);
    } catch(Exception error) { return refused("READ_ERROR"); }
  }
  public static Result status(Reader reader,BooleanSupplier busy,BooleanSupplier closed) {
    if(closed.getAsBoolean())return refused("CLOSED");
    if(busy.getAsBoolean())return refused("BUSY");
    Result result=check(reader);
    if(closed.getAsBoolean())return refused("CLOSED");
    if(busy.getAsBoolean())return refused("BUSY");
    return result;
  }
  private PhoneOfflineGate() {}
}

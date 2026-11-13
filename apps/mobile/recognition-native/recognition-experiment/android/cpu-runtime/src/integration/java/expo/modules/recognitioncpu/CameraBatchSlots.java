package expo.modules.recognitioncpu;
import android.content.Context;
/** Exactly one new IC01 slot. Completed B slots are read-only; no preference migration or rearm. */
public final class CameraBatchSlots {
 private CameraBatchSlots(){}
 public static String require(String slot){if(!"IC01".equals(slot))throw new IllegalArgumentException("IC01_SLOT");return slot;}
 public static String selected(Context c){return "IC01";}
 public static void select(Context c,String slot)throws java.io.IOException{require(slot);}
}

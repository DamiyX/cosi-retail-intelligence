package expo.modules.recognitioncpu;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

public final class GraphicsAdmissionTraceChecks {
 private static int checks;
 private static void yes(boolean v){if(!v)throw new AssertionError();checks++;}
 private static void refuses(Runnable r){try{r.run();}catch(IllegalStateException expected){checks++;return;}throw new AssertionError("Expected refusal");}
 public static void main(String[] args)throws Exception{
   AtomicLong clock=new AtomicLong(100);List<GraphicsAdmissionTrace.Event> events=new ArrayList<>();
   GraphicsAdmissionTrace trace=new GraphicsAdmissionTrace(clock::get,events::add);trace.received(25);
   yes(events.get(0).observedMillis==25&&!events.get(0).durable&&events.get(0).provenance.equals("LIVE_ADMISSION_NOT_DURABLE"));
   refuses(trace::nextDurable);refuses(trace::rootIntent);
   trace.step("IDENTITY",()->"identity");
   try{trace.step("LEGACY_METADATA",()->{yes(events.get(events.size()-1).event.equals("LEGACY_METADATA_INTENT"));clock.set(200);throw new IllegalArgumentException("CAMERA_DIRECTORY_ALIAS");});throw new AssertionError();}catch(IllegalArgumentException expected){}
   yes(events.get(events.size()-1).event.equals("ADMISSION_REFUSED")&&events.get(events.size()-1).observedMillis==200&&events.get(events.size()-1).code.equals("CAMERA_DIRECTORY_ALIAS"));
   yes(events.stream().noneMatch(e->e.durable));refuses(trace::nextDurable);
   int size=events.size();trace.refused(new Exception("private/path/must/not/log"));yes(events.size()==size);
   List<GraphicsAdmissionTrace.Event> success=new ArrayList<>();GraphicsAdmissionTrace ready=new GraphicsAdmissionTrace(clock::get,success::add);ready.received(100);
   for(String step:new String[]{"IDENTITY","LEGACY_METADATA","B1_METADATA","CAMERA_CLOSED"})ready.step(step,()->true);
   ready.rootIntent();boolean contiguous=true;for(int i=0;i<20;i++)contiguous &= ready.nextDurable()==10+i;yes(contiguous);refuses(ready::nextDurable);
   yes(success.size()==10&&success.get(9).event.equals("PROBE_ROOT_INTENT"));
   List<GraphicsAdmissionTrace.Event> sanitized=new ArrayList<>();GraphicsAdmissionTrace bad=new GraphicsAdmissionTrace(clock::get,sanitized::add);bad.received(0);bad.refused(new Exception("untrusted /private/path"));yes(sanitized.get(1).code.equals("CAMERA_OPERATION_FAILED"));
   System.out.println("PASS "+checks+" production early-before-failure/original-time/provenance/order/cap/sanitized-code checks; no device logging proof");
 }
}

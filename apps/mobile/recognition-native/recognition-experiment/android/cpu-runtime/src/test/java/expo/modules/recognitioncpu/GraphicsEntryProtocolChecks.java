package expo.modules.recognitioncpu;
public final class GraphicsEntryProtocolChecks {
 private static int checks;
 private static void yes(boolean ok){if(!ok)throw new AssertionError();checks++;}
 private static void refuses(Runnable r){try{r.run();}catch(IllegalStateException expected){checks++;return;}throw new AssertionError("Expected refusal");}
 public static void main(String[] ignored){
  GraphicsEntryProtocol p=new GraphicsEntryProtocol(1000);
  refuses(()->p.bind(1001,true));refuses(()->p.shellReady(2000,1100,true));
  p.shellReady(11100,1100,true);p.idle(12000,true);refuses(()->p.idle(12001,true));
  p.idleReady(22000,true);p.bind(23000,true);p.streaming(24000,true);
  refuses(()->p.streaming(24001,true));refuses(()->p.previewReady(53000,true));p.previewReady(54000,true);
  p.closing(55000);p.closed(55999,true);yes(p.phase()==GraphicsEntryProtocol.Phase.CLOSED);refuses(()->p.bind(56000,true));
  GraphicsEntryProtocol late=new GraphicsEntryProtocol(0);refuses(()->late.shellReady(30000,1,true));refuses(()->late.shellReady(11000,1,false));late.unknown();refuses(()->late.idle(12000,true));
  GraphicsEntryProtocol closed=new GraphicsEntryProtocol(0);closed.closing(100);refuses(()->closed.closed(101,false));refuses(()->closed.closed(10101,true));
  GraphicsEntryProtocol budget=new GraphicsEntryProtocol(0);refuses(()->budget.reserveRecord(2049));for(int i=0;i<32;i++)budget.reserveRecord(2048);refuses(()->budget.reserveRecord(1));
  yes(GraphicsEntryProtocol.TOTAL==253602084L&&GraphicsEntryProtocol.CAP-GraphicsEntryProtocol.TOTAL==14833372L);
  System.out.println("PASS "+checks+" ordered/duplicate/foreground/deadline/unknown/record-cap protocol checks; no Android frame/camera/fsync evidence");
 }
}

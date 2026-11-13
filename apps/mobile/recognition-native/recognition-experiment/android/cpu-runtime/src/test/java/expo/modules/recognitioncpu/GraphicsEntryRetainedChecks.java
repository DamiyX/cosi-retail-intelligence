package expo.modules.recognitioncpu;
public final class GraphicsEntryRetainedChecks {
 private static int checks;
 private static void yes(boolean v){if(!v)throw new AssertionError();checks++;}
 private static void refuses(Runnable r){try{r.run();}catch(IllegalArgumentException expected){checks++;return;}throw new AssertionError("Expected changed profile refusal");}
 public static void main(String[] args){
  long[] d=new long[8];for(int i=0;i<d.length;i++)d[i]=Long.parseLong(args[i+3]);
  GraphicsEntryRetained.validate(args[11],d,0);yes(true);
  for(int i=0;i<d.length;i++){long[] changed=d.clone();changed[i]++;refuses(()->GraphicsEntryRetained.validate(GraphicsEntryRetained.ROOT,changed,0));}
  refuses(()->GraphicsEntryRetained.validate(GraphicsEntryRetained.ROOT,d,1));
  refuses(()->GraphicsEntryRetained.validate(GraphicsEntryProtocol.ROOT,d,0));
  GraphicsEntryRetained.provenance(args[0],args[1],args[2]);yes(true);
  refuses(()->GraphicsEntryRetained.provenance("0".repeat(64),args[1],args[2]));
  yes(GraphicsEntryRetained.allowedRoot(GraphicsEntryRetained.ROOT)&&GraphicsEntryRetained.allowedRoot(GraphicsEntryProtocol.ROOT)&&!GraphicsEntryRetained.allowedRoot("p203-graphics-entry-unknown"));
  yes(GraphicsEntryProtocol.ROOT.equals("p203-graphics-entry-20261030-c2")&&GraphicsEntryProtocol.RETAINED==253536548L&&GraphicsEntryProtocol.TOTAL==253602084L&&GraphicsEntryProtocol.CAP-GraphicsEntryProtocol.TOTAL==14833372L);
  System.out.println("PASS "+checks+" exact observed descriptor/empty/provenance/namespace/full-claim checks; no Android IO or ownership proof");
 }
}

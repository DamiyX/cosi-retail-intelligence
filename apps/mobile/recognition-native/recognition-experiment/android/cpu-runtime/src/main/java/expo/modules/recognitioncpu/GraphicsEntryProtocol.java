package expo.modules.recognitioncpu;

/** One entry, three explicitly advanced stages; clocks are monotonic milliseconds. */
public final class GraphicsEntryProtocol {
  public static final String ROOT="p203-graphics-entry-20261030-c2";
  public static final long RETAINED=253536548L, RESERVE=65536L, TOTAL=RETAINED+RESERVE, CAP=268435456L;
  public enum Phase { SHELL, SHELL_READY, IDLE, IDLE_READY, BINDING, STREAMING, PREVIEW_READY, CLOSING, CLOSED, UNKNOWN }
  private Phase phase=Phase.SHELL;
  private long begun,streaming=-1;
  private int records;private long bytes;
  public GraphicsEntryProtocol(long now){need(now>=0);begun=now;need(TOTAL<=CAP);}
  public synchronized Phase phase(){return phase;}
  public synchronized void checkStage(long now,boolean current){
    need(current&&now>=begun);
    if(phase==Phase.SHELL||phase==Phase.IDLE||phase==Phase.BINDING)need(now-begun<30000);
    need(phase!=Phase.UNKNOWN&&phase!=Phase.CLOSED&&phase!=Phase.CLOSING);
  }
  public synchronized void shellReady(long now,long frame,boolean current){checkStage(now,current);need(phase==Phase.SHELL&&frame>=begun&&now-frame>=10000);phase=Phase.SHELL_READY;}
  public synchronized void idle(long now,boolean current){checkStage(now,current);need(phase==Phase.SHELL_READY);phase=Phase.IDLE;begun=now;}
  public synchronized void idleReady(long now,boolean current){checkStage(now,current);need(phase==Phase.IDLE&&now-begun>=10000);phase=Phase.IDLE_READY;}
  public synchronized void bind(long now,boolean current){checkStage(now,current);need(phase==Phase.IDLE_READY);phase=Phase.BINDING;begun=now;}
  public synchronized void streaming(long now,boolean current){checkStage(now,current);need(phase==Phase.BINDING);phase=Phase.STREAMING;streaming=now;}
  public synchronized void previewReady(long now,boolean current){checkStage(now,current);need(phase==Phase.STREAMING&&now-streaming>=30000);phase=Phase.PREVIEW_READY;}
  public synchronized void closing(long now){need(phase!=Phase.CLOSED&&phase!=Phase.CLOSING);phase=Phase.CLOSING;begun=now;}
  public synchronized void closed(long now,boolean actualClosed){need(phase==Phase.CLOSING&&now>=begun&&now-begun<=10000&&actualClosed);phase=Phase.CLOSED;}
  public synchronized void unknown(){phase=Phase.UNKNOWN;}
  public synchronized void reserveRecord(int size){need(size>0&&size<=2048&&records<32&&bytes<=RESERVE-size);records++;bytes+=size;}
  public static void need(boolean ok){if(!ok)throw new IllegalStateException("GRAPHICS_PROBE_REFUSED");}
}

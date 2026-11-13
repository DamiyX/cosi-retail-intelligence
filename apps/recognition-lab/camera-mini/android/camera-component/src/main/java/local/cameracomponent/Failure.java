package local.cameracomponent;
public final class Failure extends Exception {
 public enum Code { NOT_READY, STALE, BUSY, CONSUMED, PERMISSION, DEADLINE, INTERRUPTED, GEOMETRY, OVERSIZE, PROXY, SCHEDULING, STORAGE, TORN, QUOTA, CAMERA }
 public final Code code; public final String stage;
 public final String detail;
 public final String context;
 public Failure(Code code,String stage) {this(code,stage,"NONE");}
 public Failure(Code code,String stage,String detail) {this(code,stage,detail,"NONE");}
 /** Numeric geometry context only; existing detail80 and durable record512 limits remain. */
 public Failure(Code code,String stage,String detail,String context) {super(code.name()+":"+stage);if(!detail.matches("[A-Z0-9_]{1,80}")||!context.matches("[A-Z0-9_]{1,220}"))throw new IllegalArgumentException("unsafe detail");this.code=code;this.stage=stage;this.detail=detail;this.context=context;}
 public static void require(boolean condition,Code code,String stage)throws Failure { if(!condition) throw new Failure(code,stage); }
 /** Deliberately excludes arbitrary exception messages and paths. */
 public String safe(Throwable cause) { return getMessage()+":"+detail+(context.equals("NONE")?"":":"+context)+":"+(cause==null?"NONE":cause.getClass().getSimpleName().replaceAll("[^A-Za-z0-9]", "").substring(0,Math.min(64,cause.getClass().getSimpleName().replaceAll("[^A-Za-z0-9]", "").length()))); }
}

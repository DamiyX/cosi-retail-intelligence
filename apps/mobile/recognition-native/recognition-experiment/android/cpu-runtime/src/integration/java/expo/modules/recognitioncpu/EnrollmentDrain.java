package expo.modules.recognitioncpu;
import java.util.concurrent.Executor;
import java.util.function.BooleanSupplier;

/** Wait for callback completion, terminal worker publications, then the owning callback queue. */
public final class EnrollmentDrain {
 private EnrollmentDrain(){}
 public static void afterCallbacks(Executor main,Executor worker,BooleanSupplier ready,Runnable complete,Runnable deferred){
  try{main.execute(()->{if(!ready.getAsBoolean()){deferred.run();return;}try{worker.execute(()->{try{main.execute(complete);}catch(RuntimeException error){deferred.run();}});}catch(RuntimeException error){deferred.run();}});}catch(RuntimeException error){deferred.run();}
 }
}

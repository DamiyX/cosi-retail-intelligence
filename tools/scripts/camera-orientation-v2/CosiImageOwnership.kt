package expo.modules.camera
import expo.modules.kotlin.Promise
import java.util.concurrent.atomic.AtomicBoolean

internal class CosiOncePromise(private val target: Promise) : Promise {
  private val settled = AtomicBoolean(false)
  val isSettled: Boolean get() = settled.get()
  override fun resolve(value: Any?) { if (settled.compareAndSet(false, true)) target.resolve(value) }
  override fun reject(code: String?, message: String?, cause: Throwable?) { if (settled.compareAndSet(false, true)) target.reject(code, message, cause) }
}

/** A callback is not reported settled before its ImageProxy is closed, including refusal. */
internal class CosiClosureUnconfirmed(cause: Throwable) : RuntimeException(cause)
internal fun <T> cosiReadAndClose(read: () -> T, close: () -> Unit): T {
  var original: Throwable? = null
  try { return read() } catch (error: Throwable) { original = error; throw error }
  finally {
    try { close() } catch (error: Throwable) {
      original?.let { error.addSuppressed(it) }
      throw CosiClosureUnconfirmed(error)
    }
  }
}

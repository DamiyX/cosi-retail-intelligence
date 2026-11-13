package expo.modules.camera

/** Real pure native registry and callback-close seam, with generated values only. */
fun main() {
  var checks = 0
  fun ok(value: Boolean) { check(value);checks++ }
  fun refuse(action: () -> Unit) { var refused = false;try { action() } catch (_: IllegalStateException) { refused = true };ok(refused) }
  val job = "a0000000-0000-4000-8000-000000000001"
  val other = "b0000000-0000-4000-8000-000000000001"
  val uri = "file:///private/Camera/$job.jpg"
  val hash = "a".repeat(64)
  val token = CosiGeometryRegistry.record(job, uri, hash, "{\"native\":true}")
  refuse { CosiGeometryRegistry.record(other, uri, hash, "{}") }
  refuse { CosiGeometryRegistry.claim(other, uri, hash, token) }
  refuse { CosiGeometryRegistry.claim(job, uri + "x", hash, token) }
  refuse { CosiGeometryRegistry.claim(job, uri, "b".repeat(64), token) }
  refuse { CosiGeometryRegistry.claim(job, uri, hash, other) }
  CosiGeometryRegistry.discard(other)
  ok(CosiGeometryRegistry.claim(job, uri, hash, token) == "{\"native\":true}")
  refuse { CosiGeometryRegistry.claim(job, uri, hash, token) }
  CosiGeometryRegistry.record(job, uri, hash, "{}");CosiGeometryRegistry.discard(job)
  refuse { CosiGeometryRegistry.claim(job, uri, hash, token) }
  refuse { CosiGeometryRegistry.record(job, uri, hash, "x".repeat(8193)) }
  val order = mutableListOf<String>()
  ok(cosiReadAndClose({ order.add("read");42 }, { order.add("close") }) == 42)
  ok(order == listOf("read", "close"));order.clear()
  val primary = IllegalArgumentException("malformed metadata")
  try { cosiReadAndClose({ order.add("read");throw primary }, { order.add("close") });error("missing error") }
  catch (error: IllegalArgumentException) { ok(error === primary) }
  ok(order == listOf("read", "close"));order.clear()
  val close = IllegalStateException("close unknown")
  try { cosiReadAndClose({ throw primary }, { throw close });error("missing close error") }
  catch (error: CosiClosureUnconfirmed) { ok(error.cause === close && close.suppressed.single() === primary) }
  var closed = 0
  try { cosiReadAndClose({ 1 }, { closed++;throw IllegalStateException("unknown") });error("missing closure error") }
  catch (_: CosiClosureUnconfirmed) { ok(closed == 1) }
  class Sink : expo.modules.kotlin.Promise {
    var resolutions = 0;var rejections = 0
    override fun resolve(value: Any?) { resolutions++ }
    override fun reject(code: String?, message: String?, cause: Throwable?) { rejections++ }
  }
  val sink = Sink();val once = CosiOncePromise(sink)
  once.resolve("complete");once.reject("late", "ignored", null);once.resolve("duplicate")
  ok(sink.resolutions == 1 && sink.rejections == 0)
  val failed = Sink();val rejectOnce = CosiOncePromise(failed)
  rejectOnce.reject("failed", "callback refused after close", null);rejectOnce.resolve("late")
  ok(failed.resolutions == 0 && failed.rejections == 1)
  println("CosiOwnershipChecks assertions=$checks; generated native token/closure only")
}

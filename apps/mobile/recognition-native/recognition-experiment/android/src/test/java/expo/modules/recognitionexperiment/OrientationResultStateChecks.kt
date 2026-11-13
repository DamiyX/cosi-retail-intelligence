package expo.modules.recognitionexperiment

fun main() {
  var checks = 0
  fun ok(value: Boolean) { check(value); checks++ }
  fun no(work: () -> Unit) { var refused = false; try { work() } catch (_: IllegalStateException) { refused = true }; check(refused); checks++ }
  val empty = OrientationResultState()
  ok(empty.takeResult() == null)
  empty.launch("owned-operation-and-selection")
  no { empty.launch("another") }
  val recreated = OrientationResultState()
  recreated.restore(empty.binding, empty.pending)
  ok(recreated.takeResult() == "owned-operation-and-selection")
  ok(recreated.takeResult() == null)
  val afterDelivery = OrientationResultState()
  afterDelivery.restore(recreated.binding, recreated.pending)
  ok(afterDelivery.takeResult() == null)
  no { afterDelivery.launch("another") }
  val missing = OrientationResultState()
  no { missing.restore(null, true) }
  ok(missing.takeResult() == null)
  val large = OrientationResultState()
  no { large.restore("x".repeat(4097), true) }
  ok(large.takeResult() == null)
  // Losing the route means no result authority; status cannot manufacture one.
  val lost = OrientationResultState()
  lost.restore(null, false)
  ok(lost.takeResult() == null)
  println("OrientationResultStateChecks assertions=$checks; pure state only; Android saved-state/provider delivery unproved")
}

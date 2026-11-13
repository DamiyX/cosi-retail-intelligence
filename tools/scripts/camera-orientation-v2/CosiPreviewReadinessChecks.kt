package expo.modules.camera

fun main() {
  val ready = CosiPreviewReadiness()
  var checks = 0
  fun ok(value: Boolean) { check(value); checks++ }
  val empty = ready.bound(1, "")
  ok(ready.stream(empty, 1, "", false) == null)
  ok(ready.stream(empty, 1, "", true) == null)
  val old = ready.bound(1, "2336x1080")
  ok(ready.stream(old, 1, "2336x1080", true) == null) // cached STREAMING
  ok(ready.stream(old, 1, "2336x1080", false) == null)
  val event = ready.stream(old, 1, "2336x1080", true)!!
  ok(event["generation"] == 1 && event["pictureSize"] == "2336x1080")
  ok(ready.stream(old, 2, "2336x1080", true) == null)
  ok(ready.stream(old, 1, "1440x1080", true) == null)
  ready.begin()
  ok(ready.stream(old, 1, "2336x1080", true) == null)
  val current = ready.bound(2, "1440x1080")
  ok(ready.stream(old, 2, "1440x1080", false) == null) // delayed old IDLE cannot arm new binding
  ok(ready.stream(old, 2, "1440x1080", true) == null) // delayed old STREAMING cannot be relabelled
  ok(ready.stream(current, 2, "1440x1080", true) == null)
  ok(ready.stream(current, 2, "1440x1080", false) == null)
  val next = ready.stream(current, 2, "1440x1080", true)!!
  ok(next["generation"] == 2 && next["pictureSize"] == "1440x1080" && event["generation"] == 1)
  val same = ready.bound(2, "1440x1080")
  ok(ready.stream(current, 2, "1440x1080", true) == null) // same fields, different native binding
  ok(ready.stream(same, 2, "1440x1080", true) == null)
  println("CosiPreviewReadinessChecks assertions=$checks; binding/stream provenance, no physical CameraX proof")
}

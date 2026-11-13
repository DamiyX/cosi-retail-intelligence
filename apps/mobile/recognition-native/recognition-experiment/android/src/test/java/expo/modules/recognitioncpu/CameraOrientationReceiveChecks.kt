package expo.modules.recognitioncpu

import expo.modules.recognitionexperiment.OrientationResultState
import java.nio.file.Files
import java.nio.file.Path

/** Real receiver boundary, saved-state helper and native journal; Android access/output IO is fake. */
private class GrantGapCrash : RuntimeException("SIMULATED_AFTER_GRANT_BEFORE_DESTINATION")

private class AndroidReceiver(
  val fixture: CameraOrientationResultBindingChecks.Fixture,
  var grantFlags: Int,
  val crashAfterGrant: Boolean = false,
) : CameraOrientationResultBinding.Receiver {
  var grantQueries = 0
  var outputOpens = 0
  var takePersistableCalls = 0
  var acceptCalls = 0

  override fun hasAnyPersistedGrant(): Boolean {
    grantQueries++
    return grantFlags != 0 // Read-only, write-only and read/write all count.
  }

  override fun accept(): MutableMap<String, Any> {
    acceptCalls++
    outputOpens++
    takePersistableCalls++
    grantFlags = 3
    if (crashAfterGrant) throw GrantGapCrash()
    fixture.store.destination(CameraMatrixRecoveryPlan.Lane.ORIENTATION_FIXTURE.uri, 67, fixture.output.identity())
    CameraMatrixRecoveryEngine(fixture.store, fixture.source, CameraMatrixRecoveryPlan.Lane.ORIENTATION_FIXTURE)
      .continueSelected(fixture.output)
    return fixture.store.status()
  }
}

fun main(args: Array<String>) {
  var checks = 0
  fun ok(value: Boolean, why: String) { check(value) { why }; checks++ }
  fun refused(code: String, work: () -> Unit) {
    var failure: IllegalArgumentException? = null
    try { work() } catch (error: IllegalArgumentException) { failure = error }
    check(failure?.message == "CAMERA_MATRIX_$code") { "Expected CAMERA_MATRIX_$code; got $failure" }
    checks++
  }
  fun hashes(root: Path): Map<String, String> = Files.list(root).use { paths ->
    paths.toList().associate {
      val payload = if (it.fileName.toString() == "lock" && Files.size(it) == 0L) byteArrayOf() else Files.readAllBytes(it)
      it.fileName.toString() to CameraProofFrame.hash(payload)
    }
  }
  val parent = Path.of(args[0])
  Files.createDirectories(parent)
  val lane = CameraMatrixRecoveryPlan.Lane.ORIENTATION_FIXTURE

  for (flags in listOf(1, 2, 3)) {
    CameraOrientationResultBindingChecks.Fixture(parent, "preexisting-$flags", "a".repeat(64)).use { f ->
      val binding = CameraOrientationResultBinding.create(f.store, lane)
      val oldSaved = OrientationResultState().apply { launch(binding) }
      val restored = OrientationResultState().apply { restore(oldSaved.binding, oldSaved.pending) }
      val receiver = AndroidReceiver(f, flags)
      val before = hashes(f.root)
      val mutations = f.io.mutations
      refused("ORIENTATION_ORPHAN_GRANT") {
        CameraOrientationResultBinding.receive(f.store, lane, restored.takeResult(), receiver)
      }
      ok(receiver.grantQueries == 1, "checked any matching persisted grant")
      ok(receiver.outputOpens == 0 && receiver.takePersistableCalls == 0 && receiver.acceptCalls == 0, "no Android destination/access effects")
      ok(f.store.state() == "SELECTION" && !f.store.has("destination") && !f.store.has("write"), "pending lane remains incomplete")
      ok(f.output.writes == 0 && f.io.mutations == mutations && hashes(f.root) == before, "no journal/output mutation")
      ok(restored.takeResult() == null, "same restored instance cannot deliver twice")
    }
  }

  CameraOrientationResultBindingChecks.Fixture(parent, "grant-gap-crash", "a".repeat(64)).use { f ->
    val state = OrientationResultState().apply { launch(CameraOrientationResultBinding.create(f.store, lane)) }
    val savedBinding = state.binding
    val savedPending = state.pending // The older Android saved instance outlives RAM consumption.
    val receiver = AndroidReceiver(f, 0, crashAfterGrant = true)
    val before = hashes(f.root)
    var crashed = false
    try { CameraOrientationResultBinding.receive(f.store, lane, state.takeResult(), receiver) }
    catch (_: GrantGapCrash) { crashed = true }
    ok(crashed && !state.pending, "first callback consumed RAM before grant-gap crash")
    ok(receiver.outputOpens == 1 && receiver.takePersistableCalls == 1 && receiver.grantFlags == 3, "crash leaves fake persisted grant")
    ok(f.store.state() == "SELECTION" && hashes(f.root) == before, "crash precedes native destination append")
    val restored = OrientationResultState().apply { restore(savedBinding, savedPending) }
    refused("ORIENTATION_ORPHAN_GRANT") {
      CameraOrientationResultBinding.receive(f.store, lane, restored.takeResult(), receiver)
    }
    ok(receiver.outputOpens == 1 && receiver.takePersistableCalls == 1 && receiver.acceptCalls == 1, "restored callback does not reopen or adopt")
    ok(f.store.state() == "SELECTION" && !f.store.has("destination") && !f.store.has("write") && f.output.writes == 0, "gap stays incomplete; no WRITE")
    ok(hashes(f.root) == before, "original owner/selection bytes preserved")
  }

  CameraOrientationResultBindingChecks.Fixture(parent, "fresh-no-grant", "a".repeat(64)).use { f ->
    val state = OrientationResultState().apply { launch(CameraOrientationResultBinding.create(f.store, lane)) }
    val savedBinding = state.binding
    val receiver = AndroidReceiver(f, 0)
    val result = CameraOrientationResultBinding.receive(f.store, lane, state.takeResult(), receiver)
    ok(result["state"] == "TERMINAL" && f.store.payload("terminal")["status"] == "READBACK_VERIFIED", "fresh callback writes and verifies")
    ok(receiver.outputOpens == 1 && receiver.takePersistableCalls == 1 && receiver.acceptCalls == 1 && f.output.writes > 0, "one successful access/write path")
    val writes = f.output.writes
    val restored = OrientationResultState().apply { restore(savedBinding, true) }
    var refusedCompleted = false
    try { CameraOrientationResultBinding.receive(f.store, lane, restored.takeResult(), receiver) }
    catch (_: IllegalArgumentException) { refusedCompleted = true }
    ok(refusedCompleted && receiver.acceptCalls == 1 && f.output.writes == writes, "completed callback never repeats effects")
  }

  CameraOrientationResultBindingChecks.Fixture(parent, "stale-route", "a".repeat(64)).use { f ->
    val binding = CameraOrientationResultBinding.create(f.store, lane)
    val receiver = AndroidReceiver(f, 3)
    val before = hashes(f.root)
    refused("ORIENTATION_STALE_RESULT_BINDING") {
      CameraOrientationResultBinding.receive(f.store, lane, binding + " ", receiver)
    }
    ok(receiver.grantQueries == 0 && receiver.acceptCalls == 0 && receiver.outputOpens == 0 && receiver.takePersistableCalls == 0, "binding checked before grant query/effects")
    ok(f.store.state() == "SELECTION" && hashes(f.root) == before && f.output.writes == 0, "stale callback leaves journal/output unchanged")
  }
  println("CameraOrientationReceiveChecks assertions=$checks; actual receiver boundary/native journal/saved-state helper; fake Android grants/access/output; real provider delivery unproved")
}

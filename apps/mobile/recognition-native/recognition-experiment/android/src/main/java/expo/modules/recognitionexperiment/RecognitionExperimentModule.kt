package expo.modules.recognitionexperiment

import expo.modules.kotlin.Promise
import expo.modules.recognitioncpu.GeneratedProbeCpu
import expo.modules.recognitioncpu.GeneratedImagePipeline
import expo.modules.recognitioncpu.GeneratedExportState
import expo.modules.recognitioncpu.GeneratedEvidenceAndroid
import expo.modules.recognitioncpu.GeneratedEvidenceStore
import expo.modules.recognitioncpu.PhonePortabilityStore
import expo.modules.recognitioncpu.PhonePortabilityReplay
import expo.modules.recognitioncpu.PhoneOfflineGate
import expo.modules.recognitioncpu.PhonePortabilityState
import expo.modules.recognitioncpu.CameraProofAndroid
import expo.modules.recognitioncpu.CameraProofCpu
import expo.modules.recognitioncpu.CameraProofLifecycle
import expo.modules.recognitioncpu.CameraProofFinalizer
import android.provider.Settings
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicBoolean

/** Isolated generated probes plus fixed private local-document portability replay. */
class RecognitionExperimentModule : Module() {
  private val worker = Executors.newSingleThreadExecutor()
  private val busy = CameraProofLifecycle.SHARED_BUSY
  private val closed = AtomicBoolean(false)
  private val cameraProof by lazy { CameraProofAndroid(requireNotNull(appContext.reactContext)) }
  private fun cameraCode(error: Throwable): String = CameraProofFinalizer.code(error)
  private fun cameraStart(id: String, promise: Promise, captureFailure: String? = null, work: (CameraProofLifecycle.Ticket) -> Any?) {
    var admitted: CameraProofLifecycle.Ticket? = null
    try {
      val ticket = cameraProof.captureReturned(id); admitted = ticket
      CameraProofFinalizer.dispatch<Any?>(worker, { work(ticket) },
        cameraProof.completion<Any?>(ticket, captureFailure, closed), object : CameraProofFinalizer.Sink<Any?> {
          override fun resolve(value: Any?) {
            if (closed.get()) promise.reject("CAMERA_CLOSED", "Native work finalized after the module closed; no view result is delivered.", null)
            else promise.resolve(value)
          }
          override fun reject(failure: CameraProofFinalizer.Failure) {
            val primary = failure.primary?.let { cameraCode(it) } ?: "NONE"
            val finalization = failure.finalization?.let { cameraCode(it) } ?: "NONE"
            val code = if (failure.finalization != null) "CAMERA_FINALIZATION_FAILED" else primary
            promise.reject(code, "primary=$primary; finalization=$finalization; ownerRetained=${cameraProof.gate.activeId() == ticket.id}", failure)
          }
        })
    } catch (error: Throwable) {
      // Covers admission/dispatch construction only. No cleanup IO or release here.
      admitted?.let { CameraProofLifecycle.INSTANCE.block(it, cameraCode(error), "CAMERA_DISPATCH_SETUP_FAILED") }
      try { promise.reject(cameraCode(error), "Camera admission/dispatch failed; any admitted owner remains blocked.", error) } catch (_: Throwable) { /* Bridge delivery is unavailable; no second settlement. */ }
    }
  }
  private fun cameraTask(promise: Promise, work: () -> Any?) {
    try { worker.execute { try { check(!closed.get()); promise.resolve(work()) } catch (error: Exception) { promise.reject(cameraCode(error), cameraCode(error), error) } } }
    catch (error: RejectedExecutionException) { promise.reject("CAMERA_CLOSED", "Camera worker is closed.", error) }
  }
  private fun cancelCamera(reason: String) {
    CameraProofLifecycle.INSTANCE.activeId()?.let { CameraProofLifecycle.INSTANCE.cancel(it, reason) }
  }
  private val store by lazy { GeneratedEvidenceAndroid.open(requireNotNull(appContext.reactContext)) }
  private val exports = GeneratedExportState { store.reserveRequest() }
  @Volatile private var imageResult: GeneratedEvidenceStore.Evidence? = null
  @Volatile private var exportPromise: Promise? = null
  @Volatile private var currentExportTicket: GeneratedExportState.Ticket? = null
  @Volatile private var exportCode = -1
  private val exportLock = Any()
  private val privateStore by lazy { PhonePortabilityStore(requireNotNull(appContext.reactContext)) }
  private val privateOperations = PhonePortabilityState<Promise>(busy, closed)
  @Volatile private var privateResult: Map<String, Any?>? = null
  private fun privateOfflineReader() = PhoneOfflineGate.Reader {
    val resolver = requireNotNull(appContext.reactContext).contentResolver
    PhoneOfflineGate.Snapshot(
      Settings.Global.getString(resolver, Settings.Global.AIRPLANE_MODE_ON),
      Settings.Global.getString(resolver, Settings.Global.WIFI_ON),
      Settings.Global.getString(resolver, "bluetooth_on"),
      Settings.Global.getString(resolver, "airplane_mode_radios"))
  }
  private fun privateOfflinePolicy() = PhoneOfflineGate.check(privateOfflineReader())
  private fun privateOfflineStatus(): Map<String, Any?> {
    val result = PhoneOfflineGate.status(privateOfflineReader(), { busy.get() }, { closed.get() })
    return mapOf("kind" to "PRIVATE_OFFLINE_GATE_STATUS", "eligible" to result.eligible,
      "reason" to result.reason, "airplane" to result.airplane, "wifiPolicy" to result.wifiPolicy,
      "bluetoothPolicy" to result.bluetoothPolicy, "policySupported" to result.policySupported,
      "coherent" to result.coherent, "modelCalls" to 0, "privateStateTouched" to false)
  }

  private fun finishPrivate(request: PhonePortabilityState.Ticket<Promise>) {
    privateOperations.finish(request) { ticket ->
      if (ticket.purpose == 1 || ticket.purpose == 2) {
        try { privateStore.finish(ticket.code) } catch (_: Exception) { /* Explicit recovery classifies a retained marker. */ }
      }
    }
  }
  private fun cancelPrivateRequest(request: PhonePortabilityState.Ticket<Promise>, reason: String) {
    privateOperations.cancel(request,
      { ticket -> ticket.payload.reject("PRIVATE_CANCELLED", reason, null) },
      { ticket -> try { privateStore.finish(ticket.code) } catch (_: Exception) {} })
  }
  private fun cancelPrivate(reason: String) {
    // Explicit user/teardown cancellation intentionally targets the current private operation.
    privateOperations.cancelCurrent(
      { ticket -> ticket.payload.reject("PRIVATE_CANCELLED", reason, null) },
      { ticket -> if (ticket.purpose == 1 || ticket.purpose == 2) {
          try { privateStore.finish(ticket.code) } catch (_: Exception) {}
        }
      })
  }
  private fun privatePicker(purpose: Int, promise: Promise) {
    var request: PhonePortabilityState.Ticket<Promise>? = null
    try {
      val captured = privateOperations.begin(purpose, false, promise, { privateStore.reserve(purpose) }) {
        if (purpose == 2) {
          val expected = requireNotNull(privateResult)
          @Suppress("UNCHECKED_CAST") val current = privateStore.recover()["result"] as? Map<String, Any?>
          check(current != null && current["bundleSha256"] == expected["bundleSha256"])
        }
      }
      request = captured
      requireNotNull(appContext.currentActivity).runOnUiThread {
        try {
          privateOperations.act(captured) {
            val intent = Intent(if (purpose == 1) Intent.ACTION_OPEN_DOCUMENT else Intent.ACTION_CREATE_DOCUMENT).apply {
              addCategory(Intent.CATEGORY_OPENABLE); type = "application/zip"; putExtra(Intent.EXTRA_LOCAL_ONLY, true)
              if (purpose == 2) putExtra(Intent.EXTRA_TITLE, "private-portability-${captured.code}.zip")
            }
            requireNotNull(appContext.currentActivity).startActivityForResult(intent, captured.code)
          }
        } catch (_: Exception) { cancelPrivateRequest(captured, "Private document picker could not open.") }
      }
    } catch (error: Exception) {
      val captured = request
      if (captured != null) cancelPrivateRequest(captured, "Private document session could not start; recover any interrupted marker.")
      else promise.reject(if (error is PhonePortabilityState.BusyOrClosed) "BUSY_OR_CLOSED" else "PRIVATE_PICKER_FAILED", "Private document session could not start.", error)
    }
  }
  private fun localDocument(uri: Uri?): Boolean {
    if (uri == null) return false
    return try {
      val context = requireNotNull(appContext.reactContext)
      DocumentsContract.isDocumentUri(context, uri) && GeneratedExportState.localDocument(uri.scheme, uri.authority, DocumentsContract.getDocumentId(uri))
    } catch (error: Exception) { false }
  }
  private fun cancelExport(reason: String) {
    val cancelled = synchronized(exportLock) {
      val ticket = exports.cancel() ?: return
      val promise = exportPromise
      exportPromise = null; currentExportTicket = null; exportCode = -1
      Pair(ticket, promise)
    }
    val (ticket, promise) = cancelled
    if (ticket.settle()) promise?.reject("EXPORT_CANCELLED", reason, null)
    if (!ticket.writing) {
      try { store.finishRequest(ticket.requestCode) } catch (_: Exception) { /* Recovery will classify the retained pending marker. */ }
      busy.set(false)
    }
  }
  private val fixtures = mapOf(
    "zero" to "ad8c5f4d30e45b2a50f7f4d1f347f64d613c6fbcd92c54ca746ab077f402d8cc",
    "gray128" to "9f431255f59af2eddd112f42c666dff575d46dc45ab4da29e0e31c9085a54ab7",
    "gradient" to "cbdae93c587d46d692e49931bdba89acc6a1f0ac606829fc544a08decae6a178"
  )
  override fun definition() = ModuleDefinition {
    Name("RecognitionExperiment")
    Events("onGeneratedImageProgress", "onPrivatePortabilityProgress")
    AsyncFunction("cameraProofStatus") { promise: Promise -> cameraTask(promise) { cameraProof.status() } }
    AsyncFunction("recoverCameraProof") { promise: Promise -> cameraTask(promise) { cameraProof.recover(); cameraProof.status() } }
    AsyncFunction("recordCameraProofRefusal") { code: String, promise: Promise -> cameraTask(promise) { cameraProof.refusal(code); true } }
    AsyncFunction("beginCameraProof") { request: String, promise: Promise ->
      cameraTask(promise) {
        try {
          val t = cameraProof.begin(request, closed)
          mapOf("jobId" to t.id, "sourceSha256" to cameraProof.source())
        } catch (error: Exception) {
          try { cameraProof.refusal(cameraCode(error)) } catch (_: Exception) { /* Existing failed evidence remains; no capture is admitted. */ }
          throw error
        }
      }
    }
    AsyncFunction("cancelCameraProof") { id: String, reason: String ->
      require(reason in listOf("USER", "BACKGROUND", "UNMOUNT", "PERMISSION_LOSS", "STALE_START", "CAPTURE_DRAIN_UNKNOWN"))
      CameraProofLifecycle.INSTANCE.cancel(id, reason)
    }
    AsyncFunction("failCameraProofCapture") { id: String, code: String, promise: Promise ->
      require(code in listOf("CAMERA_CAPTURE_REJECTED", "CAMERA_CAPTURE_NOT_STARTED", "CAMERA_METADATA_INVALID"))
      cameraStart(id, promise, code) { true }
    }
    AsyncFunction("processCameraProof") { id: String, metadata: String, promise: Promise ->
      cameraStart(id, promise) { ticket ->
        check(!closed.get()) { "CAMERA_CLOSED" }
        cameraProof.process(ticket, metadata, CameraProofCpu(requireNotNull(appContext.reactContext)))
      }
    }
    AsyncFunction("cameraProofNumerical") { id: String, promise: Promise -> cameraTask(promise) { cameraProof.numerical(id) } }
    AsyncFunction("checkPrivateOfflineGate") { privateOfflineStatus() }
    AsyncFunction("importPrivatePortability") { promise: Promise -> privatePicker(1, promise) }
    AsyncFunction("exportPrivatePortability") { promise: Promise -> privatePicker(2, promise) }
    AsyncFunction("cancelPrivatePortability") { cancelPrivate("Private operation cancelled; existing work drains without forced native preemption.") }
    AsyncFunction("recoverPrivatePortability") { promise: Promise ->
      var request: PhonePortabilityState.Ticket<Promise>? = null
      try {
        val captured = privateOperations.begin(3, true, promise, { -1 }) {}
        request = captured
        worker.execute {
          try {
            check(!closed.get() && !captured.cancelled.get())
            val interrupted = privateStore.abandon(); val state = privateStore.recover(); state["interruptedSession"] = interrupted
            @Suppress("UNCHECKED_CAST") val recovered = state["result"] as? Map<String, Any?>
            privateOperations.resolve(captured) { ticket -> privateResult = recovered; ticket.payload.resolve(state) }
          } catch (error: Exception) {
            privateOperations.reject(captured) { ticket -> privateResult = null; ticket.payload.reject("PRIVATE_RECOVERY_FAILED", "Interrupted private requests were classified; saved evidence is unready, corrupt, stale or mismatched. No session resumes.", error) }
          } finally { finishPrivate(captured) }
        }
      } catch (error: Exception) {
        val captured = request
        if (captured != null) { cancelPrivateRequest(captured, "The private worker closed."); finishPrivate(captured) }
        else promise.reject("BUSY_OR_CLOSED", "Another operation is active or closed.", error)
      }
    }
    AsyncFunction("runPrivatePortability") { offlineConfirmed: Boolean, promise: Promise ->
      if (!offlineConfirmed) promise.reject("OFFLINE_CONFIRMATION_REQUIRED", "The reviewed private packet requires explicit human/device offline confirmation.", null)
      else if (!privateOfflinePolicy().eligible) promise.reject("PRIVATE_OFFLINE_GATE_REFUSED", "Saved offline policy refused. Use Check private offline gate; reviewed live radio/network confirmation is still required.", null)
      else {
        var request: PhonePortabilityState.Ticket<Promise>? = null
        try {
          val captured = privateOperations.begin(0, true, promise, { -1 }) { privateResult = null }
          request = captured
          worker.execute {
            try {
              val context = requireNotNull(appContext.reactContext)
              check(!closed.get() && !captured.cancelled.get())
              check(privateOfflinePolicy().eligible)
              val result = PhonePortabilityReplay.run(context, privateStore,
                { count -> privateOperations.act(captured) { sendEvent("onPrivatePortabilityProgress", mapOf("completed" to count, "total" to 80)) } },
                { closed.get() || captured.cancelled.get() || !privateOfflinePolicy().eligible })
              privateOperations.resolve(captured) { ticket -> privateResult = result; ticket.payload.resolve(result) }
            } catch (error: Exception) { privateOperations.reject(captured) { ticket -> ticket.payload.reject("PRIVATE_REPLAY_FAILED", "Private replay failed; no partial success is claimed.", error) } }
            catch (error: LinkageError) { privateOperations.reject(captured) { ticket -> ticket.payload.reject("PRIVATE_RUNTIME_LINKAGE", "Private runtime linkage failed.", error) } }
            finally { finishPrivate(captured) }
          }
        } catch (error: Exception) {
          val captured = request
          if (captured != null) { cancelPrivateRequest(captured, "The private worker closed."); finishPrivate(captured) }
          else promise.reject("BUSY_OR_CLOSED", "Another operation is active or closed.", error)
        }
      }
    }
    AsyncFunction("runGeneratedProbe") { id: String, promise: Promise ->
      val expected = fixtures[id]
      when {
        expected == null -> promise.reject("INVALID_FIXTURE", "Use an accepted generated fixture ID.", null)
        closed.get() -> promise.reject("CLOSED", "The harness has closed.", null)
        !busy.compareAndSet(false, true) -> promise.reject("BUSY", "One probe is already running.", null)
        else -> {
          try {
            worker.execute {
              try { promise.resolve(GeneratedProbeCpu.runGeneratedProbe(requireNotNull(appContext.reactContext), id, expected)) }
              catch (error: Exception) { promise.reject("PROBE_FAILED", "Generated probe validation or execution failed.", error) }
              catch (error: LinkageError) { promise.reject("NATIVE_LINKAGE_FAILED", "Native CPU runtime linkage failed.", error) }
              finally { busy.set(false) }
            }
          } catch (error: RejectedExecutionException) {
            busy.set(false)
            promise.reject("CLOSED", "The harness has closed.", error)
          }
        }
      }
    }
    AsyncFunction("runGeneratedImageProbes") { id: String, promise: Promise ->
      when {
        id != "all-generated-v1" -> promise.reject("INVALID_IMAGE_FIXTURE", "Use the generated batch ID.", null)
        closed.get() -> promise.reject("CLOSED", "The harness has closed.", null)
        !busy.compareAndSet(false, true) -> promise.reject("BUSY", "One operation is already running.", null)
        else -> {
          imageResult = null
          try {
            worker.execute {
              try {
                val result = GeneratedImagePipeline.run(requireNotNull(appContext.reactContext), id) { count ->
                  if (!closed.get()) sendEvent("onGeneratedImageProgress", mapOf("completed" to count, "total" to 42))
                }
                val saved = store.publish(result.bundle, GeneratedEvidenceAndroid.metadata(result.summary))
                if (closed.get()) promise.reject("CLOSED", "Completed generated evidence was saved while the harness closed; recover it on reopening.", null)
                else { imageResult = saved; promise.resolve(GeneratedEvidenceAndroid.summary(saved)) }
              } catch (error: Exception) { promise.reject("IMAGE_PROBE_FAILED", "Generated image processing failed.", error) }
              catch (error: LinkageError) { promise.reject("IMAGE_LINKAGE_FAILED", "Generated image linkage failed.", error) }
              finally { busy.set(false) }
            }
          } catch (error: RejectedExecutionException) {
            busy.set(false); promise.reject("CLOSED", "The harness has closed.", error)
          }
        }
      }
    }
    AsyncFunction("recoverGeneratedImageEvidence") { promise: Promise ->
      when {
        closed.get() -> promise.reject("CLOSED", "The harness has closed.", null)
        !busy.compareAndSet(false, true) -> promise.reject("BUSY", "One operation is already running.", null)
        else -> try {
          worker.execute {
            try {
              val saved = store.recover()
              val interrupted = store.abandonPending()
              if (closed.get()) promise.reject("CLOSED", "Recovery completed while the harness closed.", null)
              else {
                imageResult = saved
                promise.resolve(if (saved == null) mapOf("status" to "NONE", "interruptedExport" to interrupted)
                  else mapOf("status" to "RECOVERED", "interruptedExport" to interrupted, "result" to GeneratedEvidenceAndroid.summary(saved)))
              }
            } catch (error: Exception) { imageResult = null; promise.reject("RECOVERY_FAILED", "Saved generated evidence is incomplete, corrupt or stale; no automatic rerun/export occurred.", error) }
            finally { busy.set(false) }
          }
        } catch (error: RejectedExecutionException) { busy.set(false); promise.reject("CLOSED", "The harness has closed.", error) }
      }
    }
    AsyncFunction("exportGeneratedImageEvidence") { promise: Promise ->
      val result = imageResult
      when {
        closed.get() -> promise.reject("CLOSED", "The harness has closed.", null)
        result == null -> promise.reject("NO_IMAGE_EVIDENCE", "Run the generated image batch first.", null)
        !busy.compareAndSet(false, true) -> promise.reject("BUSY", "One operation is already running.", null)
        else -> {
          var created = false
          try {
            val ticket = synchronized(exportLock) {
              check(!closed.get())
              // Revalidate fixed committed bytes before external picker admission.
              val current = requireNotNull(store.recover())
              check(current.sha256 == result.sha256 && current.bytes == result.bytes)
              val reserved = exports.begin(current.bytes, current.sha256)
              exportPromise = promise; currentExportTicket = reserved
              exportCode = reserved.requestCode; created = true
              reserved
            }
            val code = exportCode
            val activity = requireNotNull(appContext.currentActivity)
            activity.runOnUiThread {
              if (closed.get() || ticket.cancelled) cancelExport("The harness closed before the picker.")
              else try {
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                  addCategory(Intent.CATEGORY_OPENABLE)
                  type = "application/zip"
                  putExtra(Intent.EXTRA_TITLE, "generated-image-lifecycle-c1-$code.zip")
                  putExtra(Intent.EXTRA_LOCAL_ONLY, true)
                }
                activity.startActivityForResult(intent, code)
              } catch (error: Exception) { cancelExport("The local generated export picker could not open.") }
            }
          } catch (error: Exception) {
            if (created) cancelExport("The generated export could not start.")
            else { busy.set(false); promise.reject("EXPORT_START_FAILED", "The generated export could not start.", error) }
          }
        }
      }
    }
    OnActivityResult { _, payload ->
      val request = privateOperations.request(payload.requestCode)
      if (request != null) {
        val uri = payload.data?.data
        if (payload.resultCode != Activity.RESULT_OK || !localDocument(uri)) cancelPrivateRequest(request, "Private selection cancelled or nonlocal provider rejected.")
        else if (privateOperations.startWriting(request)) try {
          worker.execute {
            try {
              check(!closed.get() && !request.cancelled.get()); val context = requireNotNull(appContext.reactContext)
              val result = if (request.purpose == 1) {
                check(privateOperations.act(request) { privateResult = null })
                context.contentResolver.openInputStream(requireNotNull(uri)).use { input -> privateStore.importPacket(requireNotNull(input)) { closed.get() || request.cancelled.get() } }
              } else {
                val expected = requireNotNull(privateResult); val hash = expected["bundleSha256"] as String
                context.contentResolver.openOutputStream(requireNotNull(uri), "w").use { output -> privateStore.export(requireNotNull(output), hash) { closed.get() || request.cancelled.get() } }
                mapOf("bundleSha256" to hash, "bundleBytes" to expected["bundleBytes"])
              }
              check(!closed.get() && !request.cancelled.get()); privateStore.finish(request.code)
              privateOperations.resolve(request) { ticket -> ticket.payload.resolve(result) }
            } catch (error: Exception) {
              privateOperations.reject(request) { ticket -> ticket.payload.reject("PRIVATE_DOCUMENT_FAILED", "Private packet/document failed validation or write; partial selected documents may remain.", error) }
            } finally { finishPrivate(request) }
          }
        } catch (error: RejectedExecutionException) { cancelPrivateRequest(request, "The private worker closed."); finishPrivate(request) }
      }
      if (payload.requestCode == exportCode) {
        val uri = payload.data?.data
        if (payload.resultCode != Activity.RESULT_OK || !localDocument(uri)) {
          cancelExport("Generated export cancelled or destination rejected. Choose local Downloads.")
        } else {
          val destination = requireNotNull(uri)
          val result = imageResult
          val admission = synchronized(exportLock) {
            val ticket = currentExportTicket
            val promise = exportPromise
            if (payload.requestCode == exportCode && ticket != null && promise != null && exports.start(ticket)) Pair(ticket,promise) else null
          }
          // No JS/caller URI is accepted; only the result of our single document request.
          if (result != null && admission != null) {
            val (ticket,promise) = admission
              try {
                worker.execute {
                  try {
                    check(!closed.get() && !ticket.cancelled)
                    requireNotNull(appContext.reactContext).contentResolver.openOutputStream(destination, "w").use { stream ->
                      requireNotNull(stream)
                      store.copyTo(stream, result) { closed.get() || ticket.cancelled }
                    }
                    check(!closed.get() && !ticket.cancelled)
                    store.finishRequest(ticket.requestCode)
                    if (ticket.settle()) promise.resolve(mapOf("bundleSha256" to ticket.sha256, "bundleBytes" to ticket.bytesCount, "outputEntries" to 211))
                  } catch (error: Exception) {
                    if (ticket.settle()) promise.reject("EXPORT_FAILED", "Generated export failed; a partial selected document may remain.", error)
                  } finally {
                    try { store.finishRequest(ticket.requestCode) } catch (_: Exception) { /* Retained marker is handled by explicit recovery. */ }
                    synchronized(exportLock) {
                      exports.finish(ticket)
                      if (currentExportTicket === ticket) { exportPromise = null; currentExportTicket = null; exportCode = -1 }
                    }
                    busy.set(false)
                  }
                }
              } catch (error: RejectedExecutionException) { cancelExport("The harness closed before writing."); busy.set(false) }
          }
        }
      }
    }
    OnActivityEntersBackground { cancelCamera("BACKGROUND") }
    OnActivityDestroys { cancelCamera("ACTIVITY_DESTROYED"); cancelExport("Activity destroyed; generated export cancelled. A partial document may remain."); cancelPrivate("Activity destroyed; private document session cancelled. A partial document may remain.") }
    OnDestroy {
      closed.set(true)
      cancelCamera("MODULE_DESTROYED")
      cancelPrivate("Module destroyed; private session cancelled.")
      cancelExport("Module destroyed; generated export cancelled.")
      imageResult = null
      // Drain an existing job; do not claim interpreter interruption/cancellation.
      worker.shutdown()
    }
  }

}

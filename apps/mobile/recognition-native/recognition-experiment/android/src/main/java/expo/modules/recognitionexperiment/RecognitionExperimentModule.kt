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
import expo.modules.recognitioncpu.CameraEvidenceAndroid
import expo.modules.recognitioncpu.CameraStationaryAndroid
import expo.modules.recognitioncpu.CameraStationarySlot
import expo.modules.recognitioncpu.CameraEvidenceSession
import expo.modules.recognitioncpu.CameraMatrixAndroid
import expo.modules.recognitioncpu.CameraMatrixPlan
import expo.modules.recognitioncpu.CameraMatrixStore
import expo.modules.recognitioncpu.CameraMatrixRecoveryAndroid
import expo.modules.recognitioncpu.CameraOrientationAndroid
import expo.modules.recognitioncpu.CameraOrientationPlan
import expo.modules.recognitioncpu.CameraOrientationExportAndroid
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
  private val stationaryEvidence by lazy { CameraStationaryAndroid(requireNotNull(appContext.reactContext)) }
  private val stationarySession = CameraEvidenceSession.stationary<Promise>(busy, closed)
  private val cameraEvidence by lazy { CameraEvidenceAndroid(requireNotNull(appContext.reactContext)) }
  private val cameraEvidenceSession = CameraEvidenceSession<Promise>(busy, closed)
  private val cameraProof by lazy { CameraProofAndroid(requireNotNull(appContext.reactContext)) }
  private val matrix by lazy { CameraMatrixAndroid(requireNotNull(appContext.reactContext), cameraProof) }
  private val matrixSession = CameraMatrixStore.ExportSession<Promise>(busy, closed)
  private val orientationProof by lazy { CameraProofAndroid(requireNotNull(appContext.reactContext), true) }
  private val orientation by lazy { CameraOrientationAndroid(requireNotNull(appContext.reactContext), orientationProof) }
  private fun cameraCode(error: Throwable): String = CameraProofFinalizer.code(error)
  private fun requireBridgeAvailable(name: String) {
    val probeContext=requireNotNull(appContext.reactContext)
    val enrollment = probeContext.packageManager.getApplicationInfo(probeContext.packageName, android.content.pm.PackageManager.GET_META_DATA).metaData?.getBoolean("com.damiyx.recognition.OBSERVED_ENROLLMENT", false) == true
    if(enrollment) { check(name == "enrollmentSetup" || name == "enrollmentCommand") { "ENROLLMENT_ONLY" }; return }
    check(name != "enrollmentSetup" && name != "enrollmentCommand") { "ENROLLMENT_DISABLED" }
    val integration = probeContext.packageManager.getApplicationInfo(probeContext.packageName, android.content.pm.PackageManager.GET_META_DATA).metaData?.getBoolean("com.damiyx.recognition.CAMERA_COMPONENT_INTEGRATION", false) == true
    if(integration) { check(name == "openCameraComponentIntegration" || name == "cameraComponentIntegrationStatus") { "COMPONENT_INTEGRATION_ONLY" }; return }
    check(name != "openCameraComponentIntegration" && name != "cameraComponentIntegrationStatus") { "COMPONENT_INTEGRATION_DISABLED" }

    if(GraphicsEntryProbe.enabled(probeContext)) {
      check(name=="openGraphicsEntryProbe"||name=="graphicsEntryMetadata") { "GRAPHICS_PROBE_ONLY_BOUNDARY" }
      return
    }
    check(name!="openGraphicsEntryProbe"&&name!="graphicsEntryMetadata") { "GRAPHICS_PROBE_DISABLED" }
    if(name=="openCaptureDiagnostic")CameraCaptureDiagnosticBinding.requireEntryAvailable() else CameraCaptureDiagnosticBinding.requireLegacyAvailable()
    val context = requireNotNull(appContext.reactContext)
    val info = context.packageManager.getApplicationInfo(context.packageName, android.content.pm.PackageManager.GET_META_DATA)
    val metadataOnly = info.metaData?.getBoolean("com.damiyx.recognition.SETUP_METADATA_ONLY", false) == true
    check(if (name == "captureDiagnosticSetupSnapshot") metadataOnly else !metadataOnly) { "DIAGNOSTIC_METADATA_ONLY_BOUNDARY" }
  }

  private fun cameraStart(id: String, promise: Promise, captureFailure: String? = null, work: (CameraProofLifecycle.Ticket) -> Any?) {
    var admitted: CameraProofLifecycle.Ticket? = null
    try {
      CameraCaptureDiagnosticBinding.requireLegacyAvailable()
      val ticket = cameraProof.captureReturned(id); admitted = ticket
      CameraProofFinalizer.dispatch<Any?>(worker, { work(ticket) },
        cameraProof.completion<Any?>(ticket, captureFailure, closed), object : CameraProofFinalizer.Sink<Any?> {
          override fun resolve(value: Any?) {
            try { if (CameraMatrixPlan.byJob(id) != null) matrix.complete(id, captureFailure) } catch (error: Exception) { promise.reject("CAMERA_MATRIX_TERMINAL", "Native finalized; matrix accounting unresolved. Do not retry.", error); return }
            if (closed.get()) promise.reject("CAMERA_CLOSED", "Native work finalized after the module closed; no view result is delivered.", null)
            else promise.resolve(value)
          }
          override fun reject(failure: CameraProofFinalizer.Failure) {
            if (CameraMatrixPlan.byJob(id) != null && cameraProof.gate.activeId() == null) {
              try { matrix.complete(id, captureFailure) } catch (error: Exception) { failure.addSuppressed(error) }
            }
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
    try { worker.execute { try { check(!closed.get()); CameraCaptureDiagnosticBinding.requireLegacyAvailable(); promise.resolve(work()) } catch (error: Exception) { promise.reject(cameraCode(error), cameraCode(error), error) } } }
    catch (error: RejectedExecutionException) { promise.reject("CAMERA_CLOSED", "Camera worker is closed.", error) }
  }
  private fun orientationStart(id: String, promise: Promise, captureFailure: String? = null, work: (CameraProofLifecycle.Ticket) -> Any?) {
    var admitted: CameraProofLifecycle.Ticket? = null
    try {
      check(CameraOrientationAndroid.enabled(requireNotNull(appContext.reactContext)) && CameraOrientationPlan.byJob(id) != null) { "CAMERA_ORIENTATION_VARIANT_OR_JOB" }
      CameraCaptureDiagnosticBinding.requireLegacyAvailable()
      val ticket = orientationProof.captureReturned(id); admitted = ticket
      CameraProofFinalizer.dispatch<Any?>(worker, { work(ticket) }, orientationProof.completion<Any?>(ticket, captureFailure, closed), object : CameraProofFinalizer.Sink<Any?> {
        override fun resolve(value: Any?) {
          try { orientation.complete(id) } catch (error: Exception) { promise.reject("CAMERA_ORIENTATION_TERMINAL", "Native finalized; V2 row accounting is unresolved. Do not retry.", error); return }
          if (closed.get()) promise.reject("CAMERA_CLOSED", "Native work finalized after closure.", null) else promise.resolve(value)
        }
        override fun reject(failure: CameraProofFinalizer.Failure) {
          if (orientationProof.gate.activeId() == null) try { orientation.complete(id) } catch (error: Exception) { failure.addSuppressed(error) }
          val code = if (failure.finalization != null) "CAMERA_FINALIZATION_FAILED" else failure.primary?.let { cameraCode(it) } ?: "CAMERA_ORIENTATION_FAILED"
          promise.reject(code, "V2 callback finalized; inspect the consumed native row.", failure)
        }
      })
    } catch (error: Throwable) {
      admitted?.let { CameraProofLifecycle.INSTANCE.block(it, cameraCode(error), "CAMERA_DISPATCH_SETUP_FAILED") }
      try { promise.reject(cameraCode(error), "V2 dispatch failed; any admitted owner remains blocked.", error) } catch (_: Throwable) { }
    }
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
    AsyncFunction("enrollmentSetup") { promise: Promise ->
      requireBridgeAvailable("enrollmentSetup")
      try { worker.execute { try {
        check(!closed.get())
        val type=Class.forName("expo.modules.recognitioncpu.EnrollmentOwner")
        promise.resolve(type.getMethod("setup",android.content.Context::class.java,String::class.java).invoke(null,requireNotNull(appContext.reactContext),BuildConfig.INTEGRATION_SOURCE_SHA))
      } catch(error:Exception) {promise.reject("ENROLLMENT_SETUP","Saved enrollment setup could not be verified",null)} } }
      catch(error:RejectedExecutionException){promise.reject("CLOSED","Probe worker is closed",null)}
    }
    AsyncFunction("enrollmentCommand") { request: Map<String,Any?>, promise: Promise ->
      requireBridgeAvailable("enrollmentCommand")
      val activity=requireNotNull(appContext.currentActivity)
      if(request["op"] != "snapshot" && request["op"] != "reportStatus" && request["op"] != "readDiagnosticStatus") check(activity.hasWindowFocus() && !activity.isFinishing) { "ENROLLMENT_FOREGROUND_REQUIRED" }
      try { worker.execute { try {
        check(!closed.get())
        val context=requireNotNull(appContext.reactContext)
        val type=Class.forName("expo.modules.recognitioncpu.EnrollmentOwner")
        if(request["op"]=="startReadDiagnostic" || request["op"]=="readDiagnosticStatus") {
          check(request.keys==setOf("op"))
          if(request["op"]=="readDiagnosticStatus") {
            promise.resolve(type.getMethod("readDiagnosticStatus",android.content.Context::class.java,String::class.java).invoke(null,context,BuildConfig.INTEGRATION_SOURCE_SHA))
          } else {
            type.getMethod("prepareReadDiagnostic",android.app.Activity::class.java,String::class.java).invoke(null,activity,BuildConfig.INTEGRATION_SOURCE_SHA)
            activity.runOnUiThread { try {
              check(!closed.get() && !activity.isFinishing && activity.hasWindowFocus())
              type.getMethod("launchReadDiagnostic",android.app.Activity::class.java).invoke(null,activity)
              promise.resolve(mapOf("state" to "PICKER_OPENED","terminal" to ""))
            } catch(error:Exception) {try{type.getMethod("abortReadDiagnostic",android.app.Activity::class.java).invoke(null,activity)}catch(ignored:Exception){};promise.reject("READ_DIAGNOSTIC","Existing R04 diagnostic unavailable; preserve attempt",null)} }
          }
          return@execute
        }
        if(request["op"]=="reportStatus") {
          val result=type.getMethod("reportStatus",android.content.Context::class.java,String::class.java,Map::class.java).invoke(null,context,BuildConfig.INTEGRATION_SOURCE_SHA,request)
          promise.resolve(result)
          return@execute
        }
        if(request["op"]=="reconcileInitialization" || request["op"]=="resumeInitialization") {
          val live=Runnable { check(!closed.get() && !activity.isFinishing && activity.hasWindowFocus()) { "INITIALIZATION_FOREGROUND" } }
          live.run()
          val result=type.getMethod("initialization",android.content.Context::class.java,String::class.java,Map::class.java,Runnable::class.java).invoke(null,context,BuildConfig.INTEGRATION_SOURCE_SHA,request,live)
          promise.resolve(result)
          return@execute
        }
        if(request["op"]=="exportReport") {
          check(request.keys==setOf("op","report","sequence","session"))
          val number=(request["report"] as? Number)?.toDouble() ?: error("REPORT_NUMBER")
          val sequence=(request["sequence"] as? Number)?.toDouble() ?: error("REPORT_SEQUENCE")
          check(number.isFinite() && number>=1 && number<=8 && number==number.toInt().toDouble() && sequence.isFinite() && sequence>=0 && sequence<=4096 && sequence==sequence.toInt().toDouble())
          val session=request["session"] as? String ?: error("REPORT_SESSION")
          val transferType=type
          transferType.getMethod("prepareReportTransfer",android.app.Activity::class.java,String::class.java,Int::class.javaPrimitiveType,Int::class.javaPrimitiveType,String::class.java).invoke(null,activity,BuildConfig.INTEGRATION_SOURCE_SHA,number.toInt(),sequence.toInt(),session)
          activity.runOnUiThread { try {
            check(!closed.get() && !activity.isFinishing && activity.hasWindowFocus())
            transferType.getMethod("launchReportTransfer",android.app.Activity::class.java,Int::class.javaPrimitiveType).invoke(null,activity,number.toInt())
            promise.resolve(mapOf("report" to number.toInt(),"status" to "LOCAL_PICKER_OPENED"))
          } catch(error:Exception) {try{transferType.getMethod("abortReportTransfer",android.app.Activity::class.java,Int::class.javaPrimitiveType).invoke(null,activity,number.toInt())}catch(ignored:Exception){};promise.reject("ENROLLMENT_REPORT_TRANSFER","Local report selection refused; preserve the attempt",null)} }
          return@execute
        }
        check(request["op"]=="snapshot" || (activity.hasWindowFocus() && !activity.isFinishing)) { "ENROLLMENT_FOREGROUND_REQUIRED" }
        type.getMethod("reportActivity",android.app.Activity::class.java).invoke(null,activity)
        val value=type.getMethod("command",android.content.Context::class.java,String::class.java,Map::class.java).invoke(null,context,BuildConfig.INTEGRATION_SOURCE_SHA,request)
        val op=request["op"]
        if(op == "openCapture" || op == "openBarcode" || op == "reviewCandidate" || op == "permission") {
          val owner=type.getMethod("get",android.content.Context::class.java,String::class.java).invoke(null,context,BuildConfig.INTEGRATION_SOURCE_SHA)
          val job=if(op == "openCapture") type.getMethod("launchJob").invoke(owner) as Int else null
          activity.runOnUiThread { try {
            check(!closed.get() && !activity.isFinishing && activity.hasWindowFocus()) { "ENROLLMENT_LAUNCH_BACKGROUND" }
            val intent=Intent().setClassName(activity.packageName,if(op=="openBarcode") "expo.modules.recognitionexperiment.EnrollmentBarcodeActivity" else "expo.modules.recognitionexperiment.EnrollmentActivity").putExtra("mode",if(op=="openCapture") "capture" else if(op=="reviewCandidate") "review" else "permission")
            if(job!=null) intent.putExtra("job",job)
            if(op=="openBarcode") intent.putExtra("barcodeEpoch",type.getMethod("launchBarcodeEpoch").invoke(owner) as Long)
            activity.startActivity(intent);promise.resolve(value)
          } catch(error:Exception) {
            if(op != "permission") try {type.getMethod("launchFailed").invoke(owner)}catch(ignored:Exception){}
            promise.reject("ENROLLMENT_LAUNCH","Enrollment screen did not open; preserve the attempt",null)
          } }
        } else promise.resolve(value)
      } catch(error:Exception) {promise.reject("ENROLLMENT_COMMAND","Enrollment action refused; read saved progress before continuing",null)} } }
      catch(error:RejectedExecutionException){promise.reject("CLOSED","Probe worker is closed",null)}
    }
    AsyncFunction("cameraComponentIntegrationStatus") { promise: Promise ->
      requireBridgeAvailable("cameraComponentIntegrationStatus")
      try { worker.execute { try { val type=Class.forName("expo.modules.recognitioncpu.CameraIntegrationOwner");val value=type.getMethod("status", android.content.Context::class.java).invoke(null,requireNotNull(appContext.reactContext));promise.resolve(value) } catch(error:Exception) {promise.reject("INTEGRATION_STATUS","Saved status could not be verified",null)} } } catch(error:RejectedExecutionException){promise.reject("CLOSED","Probe worker is closed",null)}
    }
    AsyncFunction("openCameraComponentIntegration") { promise: Promise ->
      requireBridgeAvailable("openCameraComponentIntegration")
      check(!closed.get() && !busy.get()) { "BUSY_OR_CLOSED" }
      val activity=requireNotNull(appContext.currentActivity)
      fun noLegacy(view: android.view.View): Boolean = !view.javaClass.name.startsWith("expo.modules.camera.") && (view !is android.view.ViewGroup || (0 until view.childCount).all { noLegacy(view.getChildAt(it)) })
      check(noLegacy(activity.window.decorView)) { "LEGACY_PREVIEW_PRESENT" }
      activity.runOnUiThread { try { activity.startActivity(Intent().setClassName(activity.packageName,"expo.modules.recognitionexperiment.CameraComponentIntegrationActivity"));promise.resolve(mapOf("launchRequested" to true,"captureStarted" to false)) } catch(error:Exception) {promise.reject("INTEGRATION_LAUNCH","Native launch refused",error)} }
    }

    AsyncFunction("captureDiagnosticSetupSnapshot") { promise: Promise -> requireBridgeAvailable("captureDiagnosticSetupSnapshot"); cameraTask(promise) {
      expo.modules.recognitioncpu.CameraCaptureDiagnosticSetupSnapshot.collect(requireNotNull(appContext.reactContext))
    } }

    AsyncFunction("captureDiagnosticSnapshot") { promise: Promise -> requireBridgeAvailable("captureDiagnosticSnapshot"); cameraTask(promise) {
      expo.modules.recognitioncpu.CameraCaptureDiagnosticSnapshot.collect(requireNotNull(appContext.reactContext))
    } }
    AsyncFunction("graphicsEntryMetadata") { promise: Promise -> requireBridgeAvailable("graphicsEntryMetadata");
      try { worker.execute { try { check(!closed.get());promise.resolve(GraphicsEntryProbe.readback(requireNotNull(appContext.reactContext))) } catch(error:Exception) { promise.reject(cameraCode(error),cameraCode(error),error) } } }
      catch(error:RejectedExecutionException) { promise.reject("CAMERA_CLOSED","Probe metadata worker closed.",error) }
    }
    AsyncFunction("openGraphicsEntryProbe") { promise: Promise -> val received=android.os.SystemClock.elapsedRealtime();requireBridgeAvailable("openGraphicsEntryProbe");
      val admission=GraphicsEntryProbe.admission(received)
      try { worker.execute { try {
        check(!closed.get());val activity=requireNotNull(appContext.currentActivity)
        val handle=GraphicsEntryProbe.prepare(requireNotNull(appContext.reactContext),activity,admission)
        handle.journal.record("START_ACTIVITY_INTENT")
        activity.runOnUiThread { try { GraphicsEntryProbe.launch(activity,handle);promise.resolve(mapOf("launchRequested" to true,"captureAuthority" to false)) } catch(error:Exception) {promise.reject("GRAPHICS_ENTRY_REFUSED","Probe launch refused; no retry.",error)} }
      } catch(error:Exception) { admission.progress.refused(error);promise.reject(cameraCode(error),cameraCode(error),error) } } }
      catch(error:RejectedExecutionException) { admission.progress.refused(error);promise.reject("CAMERA_CLOSED","Probe worker closed.",error) }
    }
    AsyncFunction("openCaptureDiagnostic") { promise: Promise -> requireBridgeAvailable("openCaptureDiagnostic");
      try { worker.execute { try {
        check(!closed.get())
        val activity=requireNotNull(appContext.currentActivity)
        CameraCaptureDiagnosticBinding.prepare(requireNotNull(appContext.reactContext),activity)
        activity.runOnUiThread { activity.startActivity(Intent(activity,CameraCaptureDiagnosticActivity::class.java)) }
        promise.resolve(mapOf("launchRequested" to true,"recognitionAccepted" to false))
      } catch(error:Exception) { promise.reject(cameraCode(error),cameraCode(error),error) } } }
      catch(error:RejectedExecutionException) { promise.reject("CAMERA_CLOSED","Diagnostic worker closed.",error) }
    }
    AsyncFunction("inspectOrientationProof") { promise: Promise -> requireBridgeAvailable("inspectOrientationProof"); cameraTask(promise) { orientation.inspect() } }
    AsyncFunction("beginOrientationCase") { id: String, request: String, nonce: String, promise: Promise -> requireBridgeAvailable("beginOrientationCase"); cameraTask(promise) { orientation.begin(id, request, nonce, closed) } }
    AsyncFunction("cancelOrientationProof") { id: String, reason: String -> requireBridgeAvailable("cancelOrientationProof");
      require(CameraOrientationPlan.byJob(id) != null && reason in listOf("USER", "BACKGROUND", "UNMOUNT", "PERMISSION_LOSS", "STALE_START", "CAPTURE_DRAIN_UNKNOWN"))
      CameraProofLifecycle.INSTANCE.cancel(id, reason)
    }
    AsyncFunction("failOrientationCapture") { id: String, code: String, promise: Promise -> requireBridgeAvailable("failOrientationCapture");
      require(code in listOf("CAMERA_CAPTURE_REJECTED", "CAMERA_CAPTURE_NOT_STARTED", "CAMERA_METADATA_INVALID"))
      orientationStart(id, promise, code) { true }
    }
    AsyncFunction("processOrientationProof") { id: String, metadata: String, promise: Promise -> requireBridgeAvailable("processOrientationProof");
      orientationStart(id, promise) { ticket -> check(!closed.get()) { "CAMERA_CLOSED" }; orientationProof.process(ticket, metadata, CameraProofCpu(requireNotNull(appContext.reactContext))) }
    }
    AsyncFunction("sealOrientationRun") { promise: Promise -> requireBridgeAvailable("sealOrientationRun"); cameraTask(promise) { orientation.seal() } }
    AsyncFunction("orientationExportStatus") { prefix: Int, promise: Promise -> requireBridgeAvailable("orientationExportStatus"); cameraTask(promise) { CameraOrientationExportAndroid.readStatus(requireNotNull(appContext.reactContext), prefix) } }
    AsyncFunction("openOrientationExport") { prefix: Int, promise: Promise -> requireBridgeAvailable("openOrientationExport");
      val activity = appContext.currentActivity
      if (activity == null) promise.reject("CAMERA_ORIENTATION_NO_ACTIVITY", "Open the native export from the foreground app.", null)
      else activity.runOnUiThread {
        try {
          check(CameraOrientationAndroid.enabled(requireNotNull(appContext.reactContext)) && prefix in listOf(0, 1))
          activity.startActivity(Intent(activity, CameraOrientationRecoveryActivity::class.java).putExtra("prefix", prefix))
          promise.resolve(mapOf("launched" to true, "exportVerified" to false))
        } catch (error: Exception) { promise.reject("CAMERA_ORIENTATION_LAUNCH", "No output was authorized by the launch call.", error) }
      }
    }
    AsyncFunction("openP203Recovery") { fixture: Boolean, promise: Promise -> requireBridgeAvailable("openP203Recovery");
      val activity = appContext.currentActivity
      if (activity == null) promise.reject("CAMERA_RECOVERY_NO_ACTIVITY", "Open the native recovery screen from the foreground app.", null)
      else activity.runOnUiThread {
        try {
          check(CameraProofAndroid.enabled(requireNotNull(appContext.reactContext)))
          activity.startActivity(Intent(activity, CameraMatrixRecoveryActivity::class.java).putExtra("fixture", fixture))
          promise.resolve(mapOf("launched" to true, "exportVerified" to false))
        } catch (error: Exception) { promise.reject("CAMERA_RECOVERY_LAUNCH", "Native recovery did not launch. No output was authorized by this bridge call.", error) }
      }
    }
    AsyncFunction("p203RecoveryStatus") { fixture: Boolean, promise: Promise -> requireBridgeAvailable("p203RecoveryStatus"); cameraTask(promise) {
      CameraMatrixRecoveryAndroid.readStatus(requireNotNull(appContext.reactContext), fixture)
    } }
    AsyncFunction("exportSavedCameraEvidence") { requireBridgeAvailable("exportSavedCameraEvidence"); throw IllegalStateException("CAMERA_MATRIX_ONLY") }
    AsyncFunction("cancelSavedCameraEvidenceExport") { requireBridgeAvailable("cancelSavedCameraEvidenceExport"); cameraEvidenceSession.cancel(); true }
    AsyncFunction("exportStationaryChartEvidence") { requireBridgeAvailable("exportStationaryChartEvidence"); throw IllegalStateException("CAMERA_MATRIX_ONLY") }
    AsyncFunction("cancelStationaryChartEvidenceExport") { requireBridgeAvailable("cancelStationaryChartEvidenceExport"); stationarySession.cancel(); true }
    Events("onGeneratedImageProgress", "onPrivatePortabilityProgress")

    AsyncFunction("inspectMatrixProof") { promise: Promise -> requireBridgeAvailable("inspectMatrixProof"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("observeMatrixPermission") { _: String, _: Boolean, promise: Promise -> requireBridgeAvailable("observeMatrixPermission"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("beginMatrixCase") { _: String, _: String, _: String, promise: Promise -> requireBridgeAvailable("beginMatrixCase"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("matrixCaptureInvoked") { _: String, _: Double, promise: Promise -> requireBridgeAvailable("matrixCaptureInvoked"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("matrixCapturePhase") { _: String, _: String, promise: Promise -> requireBridgeAvailable("matrixCapturePhase"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("recoverMatrixProof") { promise: Promise -> requireBridgeAvailable("recoverMatrixProof"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("sealMatrixRun") { promise: Promise -> requireBridgeAvailable("sealMatrixRun"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("cancelMatrixEvidenceExport") { promise: Promise -> requireBridgeAvailable("cancelMatrixEvidenceExport"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("exportMatrixEvidence") { promise: Promise -> requireBridgeAvailable("exportMatrixEvidence"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("cameraProofStatus") { promise: Promise -> requireBridgeAvailable("cameraProofStatus"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("recoverCameraProof") { promise: Promise -> requireBridgeAvailable("recoverCameraProof"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("recordCameraProofRefusal") { _: String, promise: Promise -> requireBridgeAvailable("recordCameraProofRefusal"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("stationaryChartStatus") { promise: Promise -> requireBridgeAvailable("stationaryChartStatus"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("beginStationaryChartProof") { _: String, _: String, promise: Promise -> requireBridgeAvailable("beginStationaryChartProof"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("beginCameraProof") { _: String, promise: Promise -> requireBridgeAvailable("beginCameraProof"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("cancelCameraProof") { _: String, _: String, promise: Promise -> requireBridgeAvailable("cancelCameraProof"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("failCameraProofCapture") { _: String, _: String, promise: Promise -> requireBridgeAvailable("failCameraProofCapture"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("processCameraProof") { _: String, _: String, promise: Promise -> requireBridgeAvailable("processCameraProof"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("cameraProofNumerical") { _: String, promise: Promise -> requireBridgeAvailable("cameraProofNumerical"); promise.reject("CAMERA_RECOVERY_ONLY", "Original camera and export endpoints are closed in this recovery artifact.", null) }
    AsyncFunction("checkPrivateOfflineGate") { requireBridgeAvailable("checkPrivateOfflineGate"); privateOfflineStatus() }
    AsyncFunction("importPrivatePortability") { promise: Promise -> requireBridgeAvailable("importPrivatePortability"); privatePicker(1, promise) }
    AsyncFunction("exportPrivatePortability") { promise: Promise -> requireBridgeAvailable("exportPrivatePortability"); privatePicker(2, promise) }
    AsyncFunction("cancelPrivatePortability") { requireBridgeAvailable("cancelPrivatePortability"); cancelPrivate("Private operation cancelled; existing work drains without forced native preemption.") }
    AsyncFunction("recoverPrivatePortability") { promise: Promise -> requireBridgeAvailable("recoverPrivatePortability");
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
    AsyncFunction("runPrivatePortability") { offlineConfirmed: Boolean, promise: Promise -> requireBridgeAvailable("runPrivatePortability");
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
    AsyncFunction("runGeneratedProbe") { id: String, promise: Promise -> requireBridgeAvailable("runGeneratedProbe");
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
    AsyncFunction("runGeneratedImageProbes") { id: String, promise: Promise -> requireBridgeAvailable("runGeneratedImageProbes");
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
    AsyncFunction("recoverGeneratedImageEvidence") { promise: Promise -> requireBridgeAvailable("recoverGeneratedImageEvidence");
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
    AsyncFunction("exportGeneratedImageEvidence") { promise: Promise -> requireBridgeAvailable("exportGeneratedImageEvidence");
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
      if(payload.requestCode==52110) {
        val activity=appContext.currentActivity
        if(activity!=null) try {Class.forName("expo.modules.recognitioncpu.EnrollmentOwner").getMethod("returnedReadDiagnostic",android.app.Activity::class.java,Int::class.javaPrimitiveType,Intent::class.java).invoke(null,activity,payload.resultCode,payload.data)}catch(ignored:Exception){}
        return@OnActivityResult
      }

      if(payload.requestCode in 52101..52108) {
        val activity=appContext.currentActivity
        if(activity!=null) try {Class.forName("expo.modules.recognitioncpu.EnrollmentOwner").getMethod("returnedReportTransfer",android.app.Activity::class.java,Int::class.javaPrimitiveType,Int::class.javaPrimitiveType,Intent::class.java).invoke(null,activity,payload.requestCode,payload.resultCode,payload.data)}catch(ignored:Exception){}
        return@OnActivityResult
      }
      if (payload.requestCode == CameraMatrixPlan.REQUEST) {
        val ticket = matrixSession.callback(payload.requestCode)
        if (ticket != null) {
          try { worker.execute {
            var result: Map<String, Any>? = null
            var failure: Exception? = null
            var terminal = "FAILED_UNVERIFIED"
            try {
              if (payload.resultCode != Activity.RESULT_OK || closed.get() || ticket.cancelled) {
                terminal = "CANCELLED"; throw IllegalStateException("CAMERA_MATRIX_CANCELLED")
              }
              @Suppress("UNCHECKED_CAST")
              val value = matrix.write(requireNotNull(payload.data?.data)) { closed.get() || ticket.cancelled } as Map<String, Any>
              result = value; terminal = "READBACK_VERIFIED"
            } catch (error: Exception) { failure = error }
            try { matrix.exportTerminal(terminal, result) } catch (error: Exception) {
              if (failure == null) failure = error else failure.addSuppressed(error)
            }
            if (closed.get() || ticket.cancelled) failure = failure ?: IllegalStateException("CAMERA_MATRIX_CANCELLED")
            try {
              if (ticket.settle()) {
                if (failure == null) ticket.payload.resolve(requireNotNull(result))
                else ticket.payload.reject("CAMERA_MATRIX_EXPORT_UNVERIFIED", "Attempt consumed; reconcile saved receipt or retain partial. Never Save again.", failure)
              }
            } finally { matrixSession.finish(ticket) }
          } } catch (error: RejectedExecutionException) {
            try { if (ticket.settle()) ticket.payload.reject("CAMERA_MATRIX_CLOSED", "No writer admitted; export intent consumed.", error) }
            finally { matrixSession.finish(ticket) }
          }
        }
      }

      if (payload.requestCode == CameraEvidenceSession.REQUEST) {
        val ticket = cameraEvidenceSession.callback(payload.requestCode)
        if (ticket != null) {
          try { worker.execute {
            var result: Map<String, Any>? = null
            var failure: Exception? = null
            var terminal = "FAILED_UNVERIFIED"
            try {
              if (payload.resultCode != Activity.RESULT_OK || closed.get() || ticket.cancelled) {
                terminal = "CANCELLED"
                throw IllegalStateException("CAMERA_EXPORT_CANCELLED")
              }
              result = cameraEvidence.write(requireNotNull(payload.data?.data)) { closed.get() || ticket.cancelled }
              terminal = "READBACK_VERIFIED"
            } catch (error: Exception) { failure = error }
            try { cameraEvidence.terminal(terminal) } catch (error: Exception) {
              if (failure == null) failure = error else failure.addSuppressed(error)
            }
            if (closed.get() || ticket.cancelled) { failure = failure ?: IllegalStateException("CAMERA_EXPORT_CANCELLED") }
            try {
              if (ticket.settle()) {
                if (failure == null) ticket.payload.resolve(requireNotNull(result))
                else ticket.payload.reject("CAMERA_EXPORT_UNVERIFIED", "Export unverified or cancelled; a partial selected document may remain. Attempt is consumed.", failure)
              }
            } finally { cameraEvidenceSession.finish(ticket) }
          } } catch (error: RejectedExecutionException) {
            // No writer was admitted. The durable one-shot attempt stays consumed.
            try { if (ticket.settle()) ticket.payload.reject("CAMERA_EXPORT_CLOSED", "Export callback arrived after worker closure; no output was written.", error) }
            finally { cameraEvidenceSession.finish(ticket) }
          }
        }
      }
      if (payload.requestCode == CameraStationarySlot.REQUEST) {
        val ticket = stationarySession.callback(payload.requestCode)
        if (ticket != null) {
          try { worker.execute {
            var result: Map<String, Any>? = null
            var failure: Exception? = null
            var terminal = "FAILED_UNVERIFIED"
            try {
              if (payload.resultCode != Activity.RESULT_OK || closed.get() || ticket.cancelled) {
                terminal = "CANCELLED"
                throw IllegalStateException("CAMERA_EXPORT_CANCELLED")
              }
              result = stationaryEvidence.write(requireNotNull(payload.data?.data)) { closed.get() || ticket.cancelled }
              terminal = "READBACK_VERIFIED"
            } catch (error: Exception) { failure = error }
            try { stationaryEvidence.terminal(terminal, if (failure == null) result else null) } catch (error: Exception) {
              if (failure == null) failure = error else failure.addSuppressed(error)
            }
            if (closed.get() || ticket.cancelled) { failure = failure ?: IllegalStateException("CAMERA_EXPORT_CANCELLED") }
            try {
              if (ticket.settle()) {
                if (failure == null) ticket.payload.resolve(requireNotNull(result))
                else ticket.payload.reject("CAMERA_EXPORT_UNVERIFIED", "Export unverified or cancelled; a partial selected document may remain. Attempt is consumed.", failure)
              }
            } finally { stationarySession.finish(ticket) }
          } } catch (error: RejectedExecutionException) {
            // No writer was admitted. The durable one-shot attempt stays consumed.
            try { if (ticket.settle()) ticket.payload.reject("CAMERA_EXPORT_CLOSED", "Export callback arrived after worker closure; no output was written.", error) }
            finally { stationarySession.finish(ticket) }
          }
        }
      }
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
    OnActivityEntersBackground { cancelCamera("BACKGROUND"); try {Class.forName("expo.modules.recognitioncpu.EnrollmentOwner").getMethod("reportBackground").invoke(null)}catch(ignored:Exception){} }
    OnActivityDestroys { try {Class.forName("expo.modules.recognitioncpu.EnrollmentOwner").getMethod("destroyedReportTransfer",android.app.Activity::class.java).invoke(null,appContext.currentActivity)}catch(ignored:Exception){}; matrixSession.cancel(); stationarySession.cancel(); cameraEvidenceSession.cancel(); cancelCamera("ACTIVITY_DESTROYED"); cancelExport("Activity destroyed; generated export cancelled. A partial document may remain."); cancelPrivate("Activity destroyed; private document session cancelled. A partial document may remain.") }
    OnDestroy {
      closed.set(true)
      matrixSession.cancel()
      cameraEvidenceSession.cancel()
      stationarySession.cancel()
      cancelCamera("MODULE_DESTROYED")
      cancelPrivate("Module destroyed; private session cancelled.")
      cancelExport("Module destroyed; generated export cancelled.")
      imageResult = null
      // Drain an existing job; do not claim interpreter interruption/cancellation.
      worker.shutdown()
    }
  }

}

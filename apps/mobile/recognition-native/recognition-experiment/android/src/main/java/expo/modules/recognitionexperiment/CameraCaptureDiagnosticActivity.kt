package expo.modules.recognitionexperiment

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.os.Bundle
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import expo.modules.recognitioncpu.CameraCaptureDiagnosticDelivery
import expo.modules.recognitioncpu.CameraCaptureDiagnosticSession
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit

/** No React root or Expo camera view. One binding; no decode, model or export. */
class CameraCaptureDiagnosticActivity : ComponentActivity() {
  private var graphicsProbe: GraphicsEntryController? = null
  private val io = Executors.newSingleThreadExecutor()
  private var provider: ProcessCameraProvider? = null
  private var session: CameraCaptureDiagnosticSession? = null
  private var active = true
  private var surfaceEpoch = 0
  private var captured = false
  private var delivery = CameraCaptureDiagnosticDelivery()
  private lateinit var preview: PreviewView
  private lateinit var status: TextView
  private lateinit var handle: CameraCaptureDiagnosticEpochs.Handle
  private lateinit var previewFrame: android.widget.FrameLayout
  private lateinit var restartControl: Button
  private var live: Preview? = null
  private var closing = false
  private var setupClosed = false
  private var destroyed = false
  @Volatile private var blocked = false
  private lateinit var capture: ImageCapture
  private var camera: androidx.camera.core.Camera? = null
  private lateinit var readyControl: Button
  private lateinit var shutterControl: Button
  @Volatile private var diagnosticSaved = false
  private var errorCode = ""
  private var phase = "CREATED"
  private var lastGeometry = ""
  private var readyAt = 0.0
  private var streamingAt = 0.0
  private var physicallyClosed = false
  private val events = linkedMapOf<String, Double>()
  @Volatile private var jpegBytes = 0
  @Volatile private var jpegHash = ""
  @Volatile private var jpegHeader = ""
  private fun mark(next: String) {
    runOnUiThread {
      if (phase == "ERROR" && next !in listOf("CLOSED","DIAGNOSTIC_SAVED","SETUP_CLOSING","SETUP_CLOSED")) return@runOnUiThread
      if (next == "DIAGNOSTIC_SAVED" && !diagnosticSaved) return@runOnUiThread
      if (phase in listOf("CLOSED","SETUP_CLOSED") && next !in listOf("SETUP_CLOSED","ERROR")) return@runOnUiThread
      phase = next
      if (!events.containsKey(next) && events.size < 24) events[next] = now()
      val marker = org.json.JSONObject().apply {
        put("kind", "CAPTURE_DIAGNOSTIC_STATUS"); put("schemaVersion", 2)
        put("epoch", handle.owner.epoch); put("epochRoot", handle.io.root.name)
        put("ownerSha256", CameraCaptureDiagnosticSession.hash(handle.owner.bytes()))
        put("setupClosed", setupClosed); put("readyAttempted", readyAt > 0)
        put("legacyOwnerProven", false); put("totalClaim", 253471012L)
        put("run", expo.modules.recognitioncpu.CameraCaptureDiagnosticProfile.RUN); put("process", expo.modules.recognitioncpu.CameraProofLifecycle.PROCESS)
        put("pid", android.os.Process.myPid()); put("sourceSha256", expo.modules.recognitioncpu.CameraCaptureDiagnosticProfile.EXECUTOR_SOURCE_SHA256)
        put("apkSha256", try { CameraCaptureDiagnosticBinding.apkSha256() } catch (_: Exception) { "" })
        put("retainedSha256", expo.modules.recognitioncpu.CameraCaptureDiagnosticProfile.RETAINED_SHA256); put("phase", phase)
        put("atMonotonic", now()); put("readyMonotonic", readyAt); put("streamingMonotonic", streamingAt)
        put("geometry", lastGeometry); put("currentGeometry", try { if (active && ::capture.isInitialized) geometry() else "CLOSED" } catch (_: Exception) { "UNAVAILABLE" }); put("events", org.json.JSONObject(events as Map<*, *>))
        put("busy", captured && phase != "ERROR" && phase != "DIAGNOSTIC_SAVED" && phase != "CLOSED")
        put("ownerReserved", true); put("cameraClosed", physicallyClosed)
        put("jpegBytes", jpegBytes); put("jpegSha256", jpegHash); put("jpegHeader", jpegHeader)
        put("error", errorCode); put("saved", diagnosticSaved); put("recognitionAccepted", false)
      }.toString()
      check(marker.length <= 4096)
      status.contentDescription = marker
      status.text = "Native diagnostic: $phase\nOne capture only. No recognition acceptance."
    }
  }
  private fun closePreview() {
    if (closing || !::handle.isInitialized) return
    closing = true; active = false; blocked = true; delivery.destroy(); session?.invalidate("CLOSE")
    readyControl.isEnabled = false; shutterControl.isEnabled = false; restartControl.isEnabled = false
    val closingHandle=handle; val oldPreview=preview
    val recoverable=closingHandle.setup.interruptBeforeReady()
    if (recoverable) mark("SETUP_CLOSING")
    live?.setSurfaceProvider(null); provider?.unbindAll(); previewFrame.removeView(oldPreview)
    val infos=provider?.availableCameraInfos.orEmpty()
    val observations=mutableListOf<Pair<androidx.lifecycle.LiveData<androidx.camera.core.CameraState>,androidx.lifecycle.Observer<androidx.camera.core.CameraState>>>()
    var done=false
    fun clear() { observations.forEach { (data,observer) -> data.removeObserver(observer) }; observations.clear() }
    fun inspect() {
      if (done || infos.isEmpty() || !infos.all { it.cameraState.value?.type == androidx.camera.core.CameraState.Type.CLOSED }) return
      done=true;clear();physicallyClosed=true
      if (!recoverable) { mark("CLOSED");return }
      val observed=try { CameraCaptureDiagnosticBinding.releaseAfterClose(this,oldPreview) } catch (_:Exception) { invalidate("CLOSE_OBSERVATION_UNAVAILABLE");return }
      try { io.execute {
        try {
          closingHandle.setup.commitPreReadyClosed(observed)
          runOnUiThread { if(handle==closingHandle) { setupClosed=true;mark("SETUP_CLOSED");restartControl.visibility=android.view.View.VISIBLE;restartControl.isEnabled=!destroyed&&hasWindowFocus()&&handle.owner.epoch<3 } }
        } catch (_: Exception) { invalidate("SETUP_CLOSE_UNKNOWN") }
      } } catch (_: Exception) { invalidate("SETUP_CLOSE_WORKER_UNAVAILABLE") }
    }
    for(info in infos) {
      val observer=androidx.lifecycle.Observer<androidx.camera.core.CameraState> { inspect() }
      observations.add(Pair(info.cameraState,observer));info.cameraState.observeForever(observer);if(done)info.cameraState.removeObserver(observer)
    }
    inspect()
    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ if(!done) { done=true;clear();invalidate("CLOSE_TIMEOUT") } },10_000)
  }
  private fun now() = SystemClock.elapsedRealtimeNanos() / 1e9
  private fun geometry(): String {
    check(checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    check(hasWindowFocus() && resources.configuration.orientation == android.content.res.Configuration.ORIENTATION_PORTRAIT)
    check(active && preview.isAttachedToWindow && preview.width > 0 && preview.height > 0)
    check(preview.previewStreamState.value == PreviewView.StreamState.STREAMING)
    val zoom = requireNotNull(camera?.cameraInfo?.zoomState?.value)
    check(zoom.linearZoom == 0f)
    val position = IntArray(2); preview.getLocationOnScreen(position)
    return listOf(surfaceEpoch, preview.display.displayId, preview.display.rotation,
      capture.targetRotation, preview.width, preview.height, position[0], position[1],
      preview.scaleType.name, zoom.linearZoom, capture.resolutionInfo?.resolution,
      camera?.cameraInfo?.getSensorRotationDegrees(preview.display.rotation),
      (0 until preview.childCount).joinToString { preview.getChildAt(it).javaClass.name }).joinToString("|")
  }
  private fun mainGeometry(): String {
    val task = FutureTask { geometry() }; runOnUiThread(task)
    return task.get(2, TimeUnit.SECONDS)
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (savedInstanceState != null) { finish();return }
    if (GraphicsEntryProbe.enabled(this)) {
      try { graphicsProbe=GraphicsEntryController(this);graphicsProbe!!.create() }
      catch (_: Exception) { setContentView(TextView(this).apply { text="STOP: graphics probe unavailable. No retry." }) }
      return
    }
    val admitted = try { CameraCaptureDiagnosticBinding.requireBound(this) }
      catch (_: Exception) { setContentView(TextView(this).apply { text = "STOP: diagnostic binding unavailable. No camera opened." });return }
    startEpoch(admitted)
  }
  private fun startEpoch(admitted: CameraCaptureDiagnosticEpochs.Handle) {
    handle=admitted;provider=CameraCaptureDiagnosticBinding.cameraProvider();val epochHandle=admitted;val admission=admitted.admission;admission.check()
    active=true;blocked=false;closing=false;setupClosed=false;captured=false;diagnosticSaved=false
    surfaceEpoch=0;readyAt=0.0;streamingAt=0.0;physicallyClosed=false;phase="CREATED";lastGeometry="";errorCode="";events.clear()
    jpegBytes=0;jpegHash="";jpegHeader="";delivery=CameraCaptureDiagnosticDelivery()
    val root=admitted.io.root
    val sink = object : CameraCaptureDiagnosticSession.Sink {
      private fun write(name: String, bytes: ByteArray) { epochHandle.io.writeNew(name,bytes) }
      override fun record(name: String, value: String) {
        check(value.toByteArray().size <= 1024); write(name, "$value|${SystemClock.elapsedRealtimeNanos()}".toByteArray())
        if (name == "jpeg-header") jpegHeader = value
        if (value.startsWith("SAVE_COMPLETE_")) mark("SAVE_COMPLETE")
      }
      override fun save(jpeg: ByteArray) {
        jpegBytes = jpeg.size; jpegHash = CameraCaptureDiagnosticSession.hash(jpeg)
        write("capture.jpeg", jpeg)
        val file = File(root, "capture.jpeg")
        val before = Os.lstat(file.path)
        check(OsConstants.S_ISREG(before.st_mode) && before.st_nlink == 1L && before.st_size == jpeg.size.toLong())
        val fd = Os.open(file.path, OsConstants.O_RDONLY or OsConstants.O_NOFOLLOW or OsConstants.O_CLOEXEC, 0)
        val hash = java.security.MessageDigest.getInstance("SHA-256")
        java.io.FileInputStream(fd).use { input ->
          val opened = Os.fstat(fd); check(opened.st_ino == before.st_ino && opened.st_dev == before.st_dev)
          val buffer = ByteArray(8192); var total = 0L
          while (true) { val n = input.read(buffer); if (n < 0) break; total += n; check(total <= CameraCaptureDiagnosticSession.JPEG); hash.update(buffer, 0, n) }
          check(total == jpeg.size.toLong())
        }
        check(java.security.MessageDigest.isEqual(hash.digest(), java.security.MessageDigest.getInstance("SHA-256").digest(jpeg)))
      }
    }
    session = CameraCaptureDiagnosticSession(sink) { bytes ->
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true; inScaled = false }
      BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
      check(bounds.outMimeType == "image/jpeg" && bounds.outWidth > 0 && bounds.outHeight > 0 && bounds.outWidth.toLong() * bounds.outHeight <= 4_000_000)
      val orientation = android.media.ExifInterface(java.io.ByteArrayInputStream(bytes)).getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, 0)
      check(orientation in 1..8)
      sink.record("jpeg-header", "${bounds.outWidth}|${bounds.outHeight}|$orientation")
    }
    preview = PreviewView(this) // Keep CameraX backend policy; record actual child type.
    preview.addOnLayoutChangeListener { _, l, t, r, b, ol, ot, or, ob -> if (listOf(l,t,r,b) != listOf(ol,ot,or,ob)) surfaceEpoch++ }
    status = TextView(this).apply {
      text = "Native diagnostic only. No recognition acceptance."
      setTextColor(android.graphics.Color.BLACK); setBackgroundColor(android.graphics.Color.WHITE)
      textSize = 14f; accessibilityLiveRegion = android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE
      importantForAccessibility = android.view.View.IMPORTANT_FOR_ACCESSIBILITY_YES
    }
    val ready = Button(this).apply { text = "READY: supported phone and exact chart"; isEnabled = false }
    val shutter = Button(this).apply { text = "Capture diagnostic once"; isEnabled = false }
    readyControl = ready; shutterControl = shutter
    val close = Button(this).apply { text = "Close diagnostic preview"; setOnClickListener { closePreview() } }
    listOf(ready, shutter, close).forEach { it.minHeight = (48 * resources.displayMetrics.density).toInt() }
    val frame = android.widget.FrameLayout(this).apply {
      addView(preview, android.widget.FrameLayout.LayoutParams(-1, -1))
      addView(object : android.view.View(this@CameraCaptureDiagnosticActivity) {
        private val pen = android.graphics.Paint().apply { color = android.graphics.Color.YELLOW; strokeWidth = 3 * resources.displayMetrics.density; style = android.graphics.Paint.Style.STROKE }
        init { importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO }
        override fun onDraw(canvas: android.graphics.Canvas) {
          super.onDraw(canvas); canvas.drawRect(width * .06f, height * .06f, width * .94f, height * .94f, pen)
        }
      }, android.widget.FrameLayout.LayoutParams(-1, -1))
    }
    previewFrame=frame
    restartControl=Button(this).apply {
      text="Start fresh setup epoch";isEnabled=false;visibility=android.view.View.GONE;minHeight=(48*resources.displayMetrics.density).toInt()
      setOnClickListener {
        if (!setupClosed || !physicallyClosed || readyAt!=0.0 || captured || !hasWindowFocus()) return@setOnClickListener
        isEnabled=false
        val oldPreview=preview
        io.execute {
          try { val next=CameraCaptureDiagnosticBinding.nextEpoch(this@CameraCaptureDiagnosticActivity,oldPreview)
            runOnUiThread { if(!destroyed&&hasWindowFocus())startEpoch(next) else invalidate("EPOCH_START_CONTEXT_CHANGED") }
          } catch (_: Exception) { invalidate("EPOCH_START_REFUSED") }
        }
      }
    }
    val column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; setBackgroundColor(android.graphics.Color.BLACK)
      addView(frame, LinearLayout.LayoutParams(-1, 0, 1f))
      addView(status, LinearLayout.LayoutParams(-1, (72 * resources.displayMetrics.density).toInt()))
      addView(ready); addView(shutter); addView(close); addView(restartControl)
    }; setContentView(column); mark("BINDING")
    val future = ProcessCameraProvider.getInstance(this)
    future.addListener({
      if(!active||isFinishing||handle!=epochHandle)return@addListener
      try {
        provider = future.get()
        val live = Preview.Builder().setTargetRotation(preview.display.rotation).build()
        capture = ImageCapture.Builder().setTargetRotation(preview.display.rotation)
          .setTargetResolution(android.util.Size(1440, 1080)).setFlashMode(ImageCapture.FLASH_MODE_OFF).build()
        this.live=live;live.setSurfaceProvider(preview.surfaceProvider)
        camera = provider!!.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, live, capture)
        camera!!.cameraControl.setLinearZoom(0f)
        preview.previewStreamState.observe(this) {
          if(handle!=epochHandle)return@observe
          if (handle==epochHandle && it == PreviewView.StreamState.STREAMING && active && streamingAt == 0.0) {
            streamingAt = now(); mark("STREAMING")
            preview.postDelayed({
              if (handle==epochHandle && active && !captured && readyAt == 0.0 && preview.previewStreamState.value == PreviewView.StreamState.STREAMING) {
                try { lastGeometry = geometry(); ready.isEnabled = true; mark("SETTLED") } catch (_: Exception) { invalidate("GEOMETRY") }
              }
            }, 15_000)
          } else if (it != PreviewView.StreamState.STREAMING) {
            ready.isEnabled = false; shutter.isEnabled = false
            if (readyAt > 0 && active) invalidate("STREAM_LOST")
          }
        }
      } catch (_: Exception) { invalidate("BIND_FAILED"); ready.isEnabled = false }
    }, ContextCompat.getMainExecutor(this))
    ready.setOnClickListener {
      try {
        check(active&&!blocked&&hasWindowFocus()&&now()-streamingAt>=15&&readyAt==0.0)
        lastGeometry=geometry();readyAt=now();epochHandle.setup.claimReadyAttempt()
        ready.isEnabled=false;mark("READY_PENDING")
        val geo=lastGeometry;val at=readyAt;val currentSession=requireNotNull(session)
        io.execute {
          try {
            CameraCaptureDiagnosticBinding.beforeReady(this,epochHandle)
            epochHandle.setup.persistReadyAttempt();currentSession.ready(admission,geo,at)
            runOnUiThread { try { check(active&&!blocked&&handle==epochHandle&&geometry()==geo&&now()-at<120);shutter.isEnabled=true;mark("READY") } catch (_: Exception) { invalidate("READINESS_CONTEXT_CHANGED") } }
          } catch (_: Exception) { invalidate("READINESS_REFUSED") }
        }
      } catch (_: Exception) { invalidate("READINESS_REFUSED") }
    }
    shutter.setOnClickListener {
      shutter.isEnabled = false; ready.isEnabled = false; captured = true
      val requested=now();val geo=try { geometry() } catch (_: Exception) { invalidate("INVOKE_GEOMETRY");return@setOnClickListener }
      preview.postDelayed({ if (!diagnosticSaved && phase != "CLOSED" && handle==epochHandle) invalidate("TERMINAL_TIMEOUT") },20_000)
      io.execute { try { session!!.invoke(geo,requested) { runOnUiThread { try {
        check(CameraCaptureDiagnosticBinding.apkSha256().length==64&&active&&!blocked&&handle==epochHandle&&now()-requested<20&&now()-readyAt<120&&geometry()==geo)
        mark("CAPTURE_INVOKED")
        capture.takePicture(ContextCompat.getMainExecutor(this), object : ImageCapture.OnImageCapturedCallback() {
          override fun onCaptureStarted() { mark("CAPTURE_STARTED");if(!CameraCaptureDiagnosticDelivery.dispatchStarted(io) { try { session!!.started() } catch (_: Exception) { invalidate("START_FAILED") } })invalidate("START_SCHEDULING_REJECTED") }
          override fun onError(exception: ImageCaptureException) { invalidate("SDK_ERROR") }
          override fun onCaptureSuccess(image: ImageProxy) {
            mark("CALLBACK")
            val atCallback = try { geometry() } catch (_: Exception) { "INVALID" }
            var imageMetadata = ""
            try {
              val outcome = delivery.deliver(image, {
                imageMetadata = "${image.width}|${image.height}|${image.cropRect.flattenToString()}|${image.imageInfo.rotationDegrees}|${image.imageInfo.timestamp}"
                check(image.format == 256 && image.width.toLong() * image.height <= 4_000_000 && image.planes.size == 1)
                val buffer = image.planes[0].buffer; check(buffer.remaining() in 1..10_485_760)
                ByteArray(buffer.remaining()).also {
                  buffer.get(it)
                  val shape = BitmapFactory.Options().apply { inJustDecodeBounds = true; inScaled = false }
                  BitmapFactory.decodeByteArray(it, 0, it.size, shape)
                  check(shape.outWidth == image.width && shape.outHeight == image.height)
                }
              }, { image.close(); mark("PROXY_CLOSED") }, io) { ownedBytes ->
                try {
                  sink.record("image", imageMetadata)
                  session!!.accept(object : CameraCaptureDiagnosticSession.Frame {
                    override fun bytes() = ownedBytes
                    // Actual SDK proxy already closed on callback thread, before scheduling.
                    override fun close() = Unit
                  }, atCallback) { mainGeometry() }
                  diagnosticSaved = true; mark("DIAGNOSTIC_SAVED")
                } catch (_: Exception) { invalidate("SAVE_FAILED") }
              }
              if (outcome == "REJECTED_PROXY_ALREADY_CLOSED") invalidate("SAVE_SCHEDULING_REJECTED")
            } catch (_: Exception) { invalidate("CALLBACK_COPY_OR_CLOSE_FAILED") }
          }
        })
      } catch (_: Exception) { invalidate("INVOKE_CONTEXT_FAILED") } } } } catch (_: Exception) { invalidate("INVOKE_FAILED") } }
    }
  }
  private fun invalidate(reason: String) {
    blocked=true;session?.invalidate(reason); errorCode = reason
    if (::status.isInitialized) {
      runOnUiThread {
        readyControl.isEnabled = false; shutterControl.isEnabled = false
        if (!diagnosticSaved) mark("ERROR")
      }
    }
  }
  override fun onStop() { graphicsProbe?.stop(); if (::handle.isInitialized) { errorCode="LIFECYCLE";closePreview() };super.onStop() }
  override fun onWindowFocusChanged(hasFocus: Boolean) { super.onWindowFocusChanged(hasFocus);graphicsProbe?.focus(hasFocus);if(hasFocus&&::restartControl.isInitialized&&setupClosed)restartControl.isEnabled=physicallyClosed&&readyAt==0.0&&handle.owner.epoch<3&&!destroyed }
  override fun onResume() { super.onResume();graphicsProbe?.resume();if(::restartControl.isInitialized&&setupClosed)restartControl.isEnabled=physicallyClosed&&readyAt==0.0&&handle.owner.epoch<3 }
  override fun onDestroy() { graphicsProbe?.destroy();destroyed=true;if(::handle.isInitialized)closePreview();io.shutdown();super.onDestroy() }
}

package expo.modules.camera

import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.Camera
import androidx.camera.core.ZoomState
import androidx.lifecycle.Observer
import androidx.camera.view.PreviewView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import androidx.exifinterface.media.ExifInterface
import android.graphics.BitmapFactory

/** Per-view, UI-thread geometry history. Physical sensor pose is deliberately absent. */
internal class CosiSameFrame(private val view: View, private val previewView: PreviewView, private val snapshot: () -> Bundle, private val synchronize: () -> Unit) {
  private var generation = 1L
  private var signature: String? = null
  private var capture: ImageCapture? = null
  private var preview: Preview? = null
  private var camera: Camera? = null
  private var boundId = UUID.randomUUID().toString()
  val viewId: String = UUID.randomUUID().toString()
  var enabled = false
    private set
  private var registered = false
  private val displays = view.context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
  private val layout = ViewTreeObserver.OnGlobalLayoutListener { observe() }
  private val streamObserver = Observer<PreviewView.StreamState> { state -> if (enabled) { invalidate() } }
  private var readinessObserver: Observer<PreviewView.StreamState>? = null
  private val zoomObserver = Observer<ZoomState> { if (enabled) invalidate() }
  private val displayListener = object : DisplayManager.DisplayListener {
    override fun onDisplayAdded(id: Int) { if (enabled) invalidate() }
    override fun onDisplayRemoved(id: Int) { if (enabled) invalidate() }
    override fun onDisplayChanged(id: Int) { if (enabled) { invalidate(); synchronize() } }
  }
  init {
    view.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(v: View) { invalidate(); register() }
      override fun onViewDetachedFromWindow(v: View) { invalidate(); unregister() }
    })
  }
  private fun main() { check(Looper.myLooper() == Looper.getMainLooper()) { "CAMERA_GEOMETRY_THREAD" } }
  fun enable(value: Boolean) {
    main()
    check(!value || view.context.packageName == "com.damiyx.retailintelligence.recognitionverification") { "CAMERA_GEOMETRY_VARIANT" }
    if (enabled != value) { invalidate(); enabled = value; if (value) register() else unregister() }
  }
  private fun register() {
    if (enabled && view.isAttachedToWindow && !registered) {
      displays.registerDisplayListener(displayListener, Handler(Looper.getMainLooper()))
      view.viewTreeObserver.addOnGlobalLayoutListener(layout)
      registered = true
      previewView.previewStreamState.observeForever(streamObserver)
      readinessObserver?.let { previewView.previewStreamState.observeForever(it) }
      camera?.cameraInfo?.zoomState?.observeForever(zoomObserver)
    }
  }
  private fun unregister() {
    if (registered) {
      displays.unregisterDisplayListener(displayListener)
      if (view.viewTreeObserver.isAlive) view.viewTreeObserver.removeOnGlobalLayoutListener(layout)
      previewView.previewStreamState.removeObserver(streamObserver)
      readinessObserver?.let { previewView.previewStreamState.removeObserver(it) }
      camera?.cameraInfo?.zoomState?.removeObserver(zoomObserver)
      registered = false
    }
  }
  fun invalidate() { main(); check(generation < 9007199254740991L); generation++ }
  fun bind(c: ImageCapture?, p: Preview?, cam: Camera?) {
    main()
    if (capture !== c || preview !== p || camera !== cam) {
      invalidate(); capture = c; preview = p; boundId = UUID.randomUUID().toString()
      if (registered) camera?.cameraInfo?.zoomState?.removeObserver(zoomObserver)
      camera = cam
      if (registered) camera?.cameraInfo?.zoomState?.observeForever(zoomObserver)
    }
  }
  // Each binding owns its observer closure. Queued callbacks retain their old token.
  fun beginReadiness() {
    main()
    readinessObserver?.let { previewView.previewStreamState.removeObserver(it) }
    readinessObserver = null
  }
  fun bindReadiness(stream: (Boolean) -> Unit) {
    main(); beginReadiness()
    val observer = Observer<PreviewView.StreamState> { state ->
      if (enabled) stream(state == PreviewView.StreamState.STREAMING)
    }
    readinessObserver = observer
    if (registered) previewView.previewStreamState.observeForever(observer)
  }
  fun useCaseId(): String = boundId
  private fun observe() {
    main()
    if (!enabled) return
    val next = try { snapshot().let { b -> b.keySet().sorted().joinToString("|") { "$it=${b.get(it)}" } } } catch (_: Exception) { "UNAVAILABLE" }
    if (signature != next) { invalidate(); signature = next }
  }
  fun state(): Bundle {
    main(); check(enabled && registered && view.isAttachedToWindow) { "CAMERA_GEOMETRY_VIEW_LIFETIME" }
    observe()
    return snapshot().apply { putLong("generation", generation); putString("view", viewId); putString("useCase", boundId) }
  }
  fun admit(options: PictureOptions): CosiAdmission {
    main()
    check(options.skipProcessing && options.exif && !options.base64 && !options.fastMode && !options.pictureRef && options.additionalExif == null && !options.mirror && options.imageType == PictureFormat.JPEG) { "CAMERA_GEOMETRY_OPTIONS" }
    val job = requireNotNull(options.cosiGeometryJob) { "CAMERA_GEOMETRY_JOB" }
    check(job.matches(Regex("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"))) { "CAMERA_GEOMETRY_JOB" }
    val before = state()
    check(before.getBoolean("streaming") && before.getString("lens") == "BACK" && !before.getBoolean("mirror") && before.getFloat("zoom") == 0f) { "CAMERA_GEOMETRY_UNSUPPORTED_VIEW" }
    val rotation = before.getInt("displayRotation", -1)
    check(rotation in 0..3 && before.getInt("captureTargetRotation", -1) == rotation && before.getInt("previewTargetRotation", -1) == rotation && before.getInt("previewWidth") in 1..10000 && before.getInt("previewHeight") in 1..10000 && before.getString("scale") in listOf("FILL_CENTER", "FIT_CENTER")) { "CAMERA_GEOMETRY_TARGET_DISPLAY" }
    return CosiAdmission(job, before, this)
  }
}

internal class CosiAdmission(private val job: String, private val admission: Bundle, private val tracker: CosiSameFrame) {
  private fun equal(a: Bundle, b: Bundle): Boolean = a.keySet() == b.keySet() && a.keySet().all { a.get(it) == b.get(it) }
  fun captured(image: ImageProxy): CosiCaptured {
    val callback = tracker.state()
    check(equal(admission, callback)) { "CAMERA_GEOMETRY_STALE" }
    check(image.format == 256 && image.width > 0 && image.height > 0 && image.width.toLong() * image.height <= 4000000 && image.planes.size == 1 && image.planes[0].buffer.remaining() in 1..(10 * 1024 * 1024)) { "CAMERA_GEOMETRY_BUFFER" }
    val crop = image.cropRect
    val info = Bundle().apply {
      putInt("width", image.width); putInt("height", image.height)
      putIntegerArrayList("crop", arrayListOf(crop.left, crop.top, crop.right, crop.bottom))
      putInt("rotationDegrees", image.imageInfo.rotationDegrees)
      putString("timestampNanos", image.imageInfo.timestamp.toString()); putInt("format", image.format)
    }
    return CosiCaptured(job, admission, callback, info, tracker)
  }
}

/** Saved JPEG binding: small buffers only; generation is checked again on main after IO. */
class CosiCaptured internal constructor(private val job: String, private val admission: Bundle, private val callback: Bundle, private val image: Bundle, private val tracker: CosiSameFrame) {
  suspend fun attach(response: Bundle) {
    val path = requireNotNull(response.getString("uri"))
    val file = File(requireNotNull(android.net.Uri.parse(path).path))
    check(file.length() in 1..(10L * 1024 * 1024)) { "CAMERA_GEOMETRY_JPEG_BOUND" }
    val hash = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input -> val buffer = ByteArray(8192); while (true) { val n = input.read(buffer); if (n < 0) break; check(n > 0); hash.update(buffer, 0, n) } }
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true; inScaled = false }
    BitmapFactory.decodeFile(file.path, bounds)
    val exif = ExifInterface(file.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, 0)
    image.putInt("jpegWidth", bounds.outWidth); image.putInt("jpegHeight", bounds.outHeight)
    image.putInt("exifOrientation", exif); image.putLong("jpegBytes", file.length())
    image.putString("jpegSha256", hash.digest().joinToString("") { "%02x".format(it.toInt() and 255) })
    val saved = withContext(Dispatchers.Main) { tracker.state() }
    check(admission.keySet() == saved.keySet() && admission.keySet().all { admission.get(it) == saved.get(it) }) { "CAMERA_GEOMETRY_STALE" }
    val geometry = Bundle().apply {
      putInt("version", 2); putString("job", job); putBundle("admission", admission)
      putBundle("callback", callback); putBundle("saved", saved); putBundle("image", image)
    }
    fun encode(bundle: Bundle): org.json.JSONObject = org.json.JSONObject().apply {
      for (key in bundle.keySet().sorted()) {
        val value = bundle.get(key)
        put(key, if (value is Bundle) encode(value) else if (value is List<*>) org.json.JSONArray(value) else value)
      }
    }
    response.putInt("width", bounds.outWidth); response.putInt("height", bounds.outHeight)
    response.getBundle("exif")?.putInt("Orientation", exif)
    response.putString("cosiGeometryToken", CosiGeometryRegistry.record(job, path, requireNotNull(image.getString("jpegSha256")), encode(geometry).toString()))
    response.putBundle("cosiGeometry", geometry)
  }
}

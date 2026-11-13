package expo.modules.recognitionexperiment

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.DocumentsContract
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import expo.modules.recognitioncpu.CameraOrientationPlan
import expo.modules.recognitioncpu.CameraOrientationAndroid
import expo.modules.recognitioncpu.CameraOrientationExportAndroid
import expo.modules.recognitioncpu.CameraMatrixRecoveryAndroid

/** New fixed V2 bindings; V1 recovery Activity and its generated lifecycle protocol are untouched. */
class CameraOrientationRecoveryActivity : ComponentActivity() {
  private val prefix: Int get() = intent.getIntExtra("prefix", 0)
  private lateinit var message: TextView
  private lateinit var select: Button
  private lateinit var resume: Button
  private var observer: CameraMatrixRecoveryAndroid.Listener? = null
  private val resultState = OrientationResultState()
  private val picker = activityResultRegistry.register("${CameraOrientationPlan.RUN}:fixed-selection", this, ActivityResultContracts.StartActivityForResult()) { result ->
    val binding = resultState.takeResult()
    if (binding == null) {
      if (::message.isInitialized) message.text = "STOP: missing or already consumed result route. Inspect only; do not select again."
      return@register
    }
    CameraOrientationExportAndroid.receive(applicationContext, prefix, binding, result.data?.data?.toString(), result.data?.flags ?: 0, result.resultCode != Activity.RESULT_OK, observer ?: NO_UI)
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (!CameraOrientationAndroid.enabled(applicationContext) || prefix !in listOf(0, 1, 8)) { finish(); return }
    try { resultState.restore(savedInstanceState?.getString("orientationResultBinding"), savedInstanceState?.getBoolean("orientationResultPending") ?: false) }
    catch (_: Exception) { /* Invalid saved state remains unbound: a callback cannot authorize a write. */ }
    val lane = CameraOrientationExportAndroid.lane(prefix)
    val column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 32, 28, 28) }
    column.addView(TextView(this).apply { textSize = 22f; text = if (prefix == 0) "Generated geometry recovery check" else "Saved geometry evidence: $prefix image(s)" })
    column.addView(TextView(this).apply { text = "Use only the reviewed packet. OPEN the existing empty local Download/${lane.filename} once. Do not create, rename or Save a file here. No photo or model runs on this screen." })
    message = TextView(this).apply { text = "Reading the durable native operation. No selection starts automatically." };column.addView(message)
    select = Button(this).apply { text = "Select the fixed existing ZIP once"; isEnabled = false; setOnClickListener { isEnabled = false; CameraOrientationExportAndroid.prepare(applicationContext, prefix, observer ?: NO_UI) } };column.addView(select)
    resume = Button(this).apply { text = "Check or continue saved operation"; isEnabled = false; setOnClickListener { isEnabled = false; CameraOrientationExportAndroid.inspect(applicationContext, prefix, true, observer ?: NO_UI) } };column.addView(resume)
    column.addView(Button(this).apply { text = "Refresh native status"; setOnClickListener { CameraOrientationExportAndroid.observe(applicationContext, prefix, observer ?: NO_UI) } })
    column.addView(TextView(this).apply { text = "A consumed WRITE never permits another write. Complete bytes may reconcile read-only after restart. Export success does not accept scene, field of view or camera geometry." })
    column.addView(Button(this).apply { text = "Close screen"; setOnClickListener { finish() } })
    setContentView(ScrollView(this).apply { addView(column) })
    observer = CameraMatrixRecoveryAndroid.Listener { status ->
      if (!isDestroyed && !isFinishing) {
        message.text = status.toString()
        select.isEnabled = status["state"] in listOf("AVAILABLE", "OWNER")
        resume.isEnabled = status["state"] in listOf("DESTINATION", "WRITE", "VERIFIED", "TERMINAL") || status["durableState"] in listOf("DESTINATION", "WRITE", "VERIFIED")
        if (status["launchPicker"] == true) {
          select.isEnabled = false
          try {
            resultState.launch(requireNotNull(status["resultBinding"] as? String) { "RESULT_BINDING_REQUIRED" })
            picker.launch(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
              addCategory(Intent.CATEGORY_OPENABLE);type = "application/zip"
              addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
              putExtra(Intent.EXTRA_LOCAL_ONLY, true)
              putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload"))
            })
          } catch (_: Exception) { message.text = "STOP: durable selection intent remains consumed. Do not select again." }
        }
      }
    }
  }
  override fun onStart() { super.onStart();if (CameraOrientationAndroid.enabled(applicationContext) && prefix in listOf(0, 1, 8)) CameraOrientationExportAndroid.observe(applicationContext, prefix, observer ?: NO_UI) }
  override fun onSaveInstanceState(outState: Bundle) {
    outState.putString("orientationResultBinding", resultState.binding)
    outState.putBoolean("orientationResultPending", resultState.pending)
    super.onSaveInstanceState(outState)
  }
  override fun onDestroy() { observer = null;super.onDestroy() }
  companion object { private val NO_UI = CameraMatrixRecoveryAndroid.Listener { _ -> } }
}

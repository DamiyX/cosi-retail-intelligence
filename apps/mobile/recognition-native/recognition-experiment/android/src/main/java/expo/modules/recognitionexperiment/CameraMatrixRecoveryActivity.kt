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
import android.widget.Toast
import java.util.UUID
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import expo.modules.recognitioncpu.CameraMatrixRecoveryAndroid
import expo.modules.recognitioncpu.CameraMatrixRecoveryPlan
import expo.modules.recognitioncpu.CameraProofAndroid

/** Native callback registration is unconditional and does not await Expo, React or a JS promise. */
class CameraMatrixRecoveryActivity : ComponentActivity() {
  private val activityInstance = UUID.randomUUID().toString()
  private var pickerPending = false
  private var recreationDispatchIssued = false
  private var observer: CameraMatrixRecoveryAndroid.Listener? = null
  private val fixture: Boolean get() = intent?.getBooleanExtra("fixture", false) == true
  private val lane get() = if (fixture) CameraMatrixRecoveryPlan.Lane.FIXTURE else CameraMatrixRecoveryPlan.Lane.ACTUAL
  private lateinit var message: TextView
  private lateinit var select: Button
  private lateinit var resume: Button

  private val picker = activityResultRegistry.register(
    "p203-fixed-recovery-selection-v1", this, ActivityResultContracts.StartActivityForResult()
  ) { result ->
    pickerPending = false
    if (::message.isInitialized) message.text = "Selection returned. Validating the saved operation; do not select again."
    CameraMatrixRecoveryAndroid.receive(applicationContext, fixture,
      result.data?.data?.toString(), result.data?.flags ?: 0, result.resultCode != Activity.RESULT_OK,
      observer ?: NO_UI)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    pickerPending = savedInstanceState?.getBoolean("p203-fixture-picker-pending", false) == true
    if (!CameraProofAndroid.enabled(applicationContext)) { finish(); return }
    val column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 32, 28, 28) }
    column.addView(TextView(this).apply {
      textSize = 22f
      text = if (fixture) "Generated recovery lifecycle check" else "Recover the existing sealed evidence"
    })
    column.addView(TextView(this).apply {
      text = "Use only the separately approved device packet. Select Internal storage > Download > ${lane.filename}, then tap OPEN. Do not create, rename, or Save another file. No camera or model runs here."
    })
    if (fixture) column.addView(TextView(this).apply {
      text = "After the picker opens, one Activity-only recreation runs automatically and records its result. Keep the picker open; wait for the test agent before selecting the generated ZIP. Process death is a separate step."
    })
    message = TextView(this).apply { text = "Reading native durable state. Opening this screen does not start a picker or a new write." }
    column.addView(message)
    select = Button(this).apply {
      text = "Select the fixed existing ZIP once"; isEnabled = false
      setOnClickListener {
        isEnabled = false; message.text = "Preparing immutable inputs and saving one selection intent."
        CameraMatrixRecoveryAndroid.prepare(applicationContext, fixture, activityInstance, observer ?: NO_UI)
      }
    }
    column.addView(select)
    resume = Button(this).apply {
      text = "Check or continue the saved operation"; isEnabled = false
      setOnClickListener { isEnabled = false; message.text = "Reading saved state. An existing WRITE is reconciled read-only."
        CameraMatrixRecoveryAndroid.inspect(applicationContext, fixture, true, observer ?: NO_UI) }
    }
    column.addView(resume)
    column.addView(Button(this).apply {
      text = "Refresh native status"
      setOnClickListener { CameraMatrixRecoveryAndroid.inspect(applicationContext, fixture, false, observer ?: NO_UI) }
    })
    column.addView(TextView(this).apply {
      text = "A consumed WRITE never permits another write, even to an empty output. Closing this screen does not cancel an operation. Export verification does not accept scene, geometry, or the four inconclusive preview markers."
    })
    column.addView(Button(this).apply { text = "Close screen"; setOnClickListener { finish() } })
    setContentView(ScrollView(this).apply { addView(column) })
    observer = CameraMatrixRecoveryAndroid.Listener { status ->
      if (!isDestroyed && !isFinishing) {
        message.text = status.toString()
        val state = status["state"] as? String
        select.isEnabled = state == "AVAILABLE" || state == "OWNER"
        resume.isEnabled = state in listOf("DESTINATION", "WRITE", "VERIFIED") || status["durableState"] in listOf("DESTINATION", "WRITE", "VERIFIED")
        if (fixture && status["fixtureRecreateNow"] == true && pickerPending && !recreationDispatchIssued) {
          recreationDispatchIssued = true
          CameraMatrixRecoveryAndroid.fixtureRecreateInvoked(applicationContext, activityInstance, NO_UI)
          recreate() // public API on this Activity's main thread; no shell/global setting/instrumentation
        }
        if (fixture && status["fixtureRecreatedNow"] == true) {
          Toast.makeText(this, "Activity check recorded. Keep the picker open.", Toast.LENGTH_LONG).show()
        }
        if (status["launchPicker"] == true) {
          select.isEnabled = false
          try {
            pickerPending = true
            picker.launch(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
              addCategory(Intent.CATEGORY_OPENABLE); type = "application/zip"
              addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
              putExtra(Intent.EXTRA_LOCAL_ONLY, true)
              putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload"))
            })
          } catch (_: Exception) { pickerPending = false; message.text = "STOP: selection launch is uncertain. Its durable intent stays consumed; do not relaunch." }
        }
      }
    }
    if (fixture) CameraMatrixRecoveryAndroid.fixtureActivityCreated(applicationContext, activityInstance,
      savedInstanceState?.getString("p203-fixture-instance"), observer ?: NO_UI)
  }

  override fun onSaveInstanceState(outState: Bundle) {
    if (fixture) {
      outState.putString("p203-fixture-instance", activityInstance)
      outState.putBoolean("p203-fixture-picker-pending", pickerPending)
    }
    super.onSaveInstanceState(outState)
  }
  override fun onStop() {
    super.onStop()
    if (fixture && pickerPending && !isFinishing)
      CameraMatrixRecoveryAndroid.fixturePickerStopped(applicationContext, activityInstance, observer ?: NO_UI)
  }

  override fun onStart() {
    super.onStart()
    if (CameraProofAndroid.enabled(applicationContext)) {
      // No selection is relaunched. A selected pre-WRITE operation may continue; WRITE only reconciles.
      CameraMatrixRecoveryAndroid.inspect(applicationContext, fixture, true, observer ?: NO_UI)
    }
  }
  override fun onDestroy() {
    if (fixture) CameraMatrixRecoveryAndroid.fixtureActivityDestroyed(applicationContext, activityInstance, NO_UI)
    observer = null // the application controller and OS lock outlive this view
    super.onDestroy()
  }
  companion object {
    private val NO_UI = CameraMatrixRecoveryAndroid.Listener { _ -> }
  }
}

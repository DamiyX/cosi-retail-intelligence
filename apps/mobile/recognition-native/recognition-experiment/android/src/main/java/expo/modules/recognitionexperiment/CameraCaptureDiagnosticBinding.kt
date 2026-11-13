package expo.modules.recognitionexperiment

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import androidx.camera.core.CameraState
import androidx.camera.lifecycle.ProcessCameraProvider
import expo.modules.recognitioncpu.*
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Native-only admission and process ownership; no JS/Intent supplied proof. */
object CameraCaptureDiagnosticBinding {
  private data class Ticket(val process: String, val issued: Long, val previous: java.lang.ref.WeakReference<Activity>, val handle: CameraCaptureDiagnosticEpochs.Handle)
  private val pending=AtomicReference<Ticket?>()
  private var token: CameraCaptureDiagnosticReservation.Token?=null
  private var provider: ProcessCameraProvider?=null
  private var executorApk=""
  private var boundActivity=java.lang.ref.WeakReference<Activity>(null)
  fun cameraProvider(): ProcessCameraProvider = requireNotNull(provider)
  fun requireEntryAvailable() {
    if (!CameraCaptureDiagnosticReservation.reserved()) return
    check(held()&&pending.get()==null&&boundActivity.get()?.let { it.isDestroyed||it.isFinishing }!=false&&camerasClosed()) { "SETUP_OLD_ACTIVITY_NOT_RELEASED" }
  }
  fun requireLegacyAvailable() { check(!CameraCaptureDiagnosticReservation.reserved()) { "DIAGNOSTIC_EXCLUSIVE_PROCESS" } }
  fun apkSha256(): String { CameraCaptureDiagnosticReservation.require(token);return executorApk }
  private fun own(context: Context) {
    check(context.packageName=="com.damiyx.retailintelligence.recognitionverification")
    check(context.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)
    check(CameraCaptureDiagnosticProfile.bound())
    val info=context.packageManager.getApplicationInfo(context.packageName,PackageManager.GET_META_DATA)
    check(info.metaData?.getString("com.damiyx.recognition.DIAGNOSTIC_SOURCE")==CameraCaptureDiagnosticProfile.EXECUTOR_SOURCE_SHA256) { "DIAGNOSTIC_EXECUTOR_SOURCE_UNBOUND" }
  }
  private fun noOldView(view: View): Boolean {
    if(view.javaClass.name.startsWith("expo.modules.camera.")&&view.isAttachedToWindow)return false
    return view !is ViewGroup || (0 until view.childCount).all { noOldView(view.getChildAt(it)) }
  }
  private fun camerasClosed()=provider?.availableCameraInfos?.let { it.isNotEmpty()&&it.all { info -> info.cameraState.value?.type==CameraState.Type.CLOSED } }==true
  private fun held(): Boolean = try { CameraCaptureDiagnosticReservation.require(token);true } catch (_: Exception) { false }
  /** Main-thread observations. Native view must actually detach, not merely be hidden. */
  fun releaseAfterClose(activity: Activity, previousPreview: View): CameraCaptureDiagnosticSetup.ReleaseObservation {
    check(!activity.isDestroyed)
    return CameraCaptureDiagnosticSetup.ReleaseObservation(camerasClosed(),!previousPreview.isAttachedToWindow&&noOldView(activity.window.decorView),held())
  }
  /** Initial launch worker: inspect legacy, observe CLOSED, acquire native reservation, persist owner. */
  fun prepare(context: Context, previous: Activity) {
    own(context);requireEntryAvailable();check(pending.get()==null)
    CameraCaptureDiagnosticEpochs.validateLegacy(context,token)
    provider=ProcessCameraProvider.getInstance(context).get(2,TimeUnit.SECONDS)
    val initial=FutureTask { !previous.isDestroyed&&!previous.isFinishing&&previous.hasWindowFocus()&&noOldView(previous.window.decorView)&&camerasClosed()&&(held()||!CameraProofLifecycle.SHARED_BUSY.get()) }
    previous.runOnUiThread(initial);check(initial.get(2,TimeUnit.SECONDS)) { "DIAGNOSTIC_PRIOR_OWNER_NOT_RELEASED" }
    if(token==null)token=CameraCaptureDiagnosticReservation.claim()
    executorApk=CameraOrientationAndroid.apkHash(context)
    val observed=FutureTask { check(previous.hasWindowFocus());CameraCaptureDiagnosticSetup.ReleaseObservation(camerasClosed(),noOldView(previous.window.decorView),held()) }
    previous.runOnUiThread(observed)
    val handle=CameraCaptureDiagnosticEpochs.next(context,requireNotNull(token),executorApk,observed.get(2,TimeUnit.SECONDS))
    check(pending.compareAndSet(null,Ticket(CameraProofLifecycle.PROCESS,SystemClock.elapsedRealtimeNanos(),java.lang.ref.WeakReference(previous),handle)))
  }
  /** Main thread: consumes one fresh launch ticket, no filesystem/worker wait. */
  fun requireBound(context: Context): CameraCaptureDiagnosticEpochs.Handle {
    own(context);val ticket=pending.getAndSet(null)?:error("DIAGNOSTIC_NATIVE_TICKET_REQUIRED")
    check(ticket.process==CameraProofLifecycle.PROCESS&&held())
    check(ticket.previous.get()?.let { !it.isDestroyed&&noOldView(it.window.decorView) }==true)
    CameraCaptureDiagnosticProfile.admit(CameraCaptureDiagnosticProfile.RETAINED_SHA256,ticket.handle.owner.retained,CameraCaptureDiagnosticProfile.RETAINED_CLAIM,SystemClock.elapsedRealtimeNanos()-ticket.issued,camerasClosed())
    boundActivity=java.lang.ref.WeakReference(context as Activity)
    return ticket.handle
  }
  fun beforeReady(context: Context, handle: CameraCaptureDiagnosticEpochs.Handle) {
    CameraCaptureDiagnosticEpochs.beforeReady(context,requireNotNull(token),handle,executorApk)
  }
  /** Worker only, after the explicit Start-fresh-epoch control, never on resume/stream callback. */
  fun nextEpoch(activity: Activity, oldPreview: View): CameraCaptureDiagnosticEpochs.Handle {
    own(activity);CameraCaptureDiagnosticReservation.require(token)
    val observed=FutureTask { check(activity.hasWindowFocus()&&!activity.isFinishing);releaseAfterClose(activity,oldPreview) }
    activity.runOnUiThread(observed)
    return CameraCaptureDiagnosticEpochs.next(activity,requireNotNull(token),executorApk,observed.get(2,TimeUnit.SECONDS))
  }
}

package expo.modules.recognitionexperiment

import android.app.ActivityManager
import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.camera.core.CameraSelector
import androidx.camera.core.CameraState
import androidx.camera.core.ImageCapture
import androidx.camera.core.Preview
import androidx.camera.view.PreviewView
import androidx.lifecycle.Observer
import expo.modules.recognitioncpu.GraphicsEntryProtocol
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/** Same Activity/theme and original camera configuration. No capture invocation exists here. */
class GraphicsEntryController(private val a: CameraCaptureDiagnosticActivity) {
  private val io=Executors.newSingleThreadExecutor()
  private val main=Handler(Looper.getMainLooper())
  private val handle=GraphicsEntryProbe.consume(a)
  private val protocol=GraphicsEntryProtocol(now())
  private val status=TextView(a)
  private val frame=FrameLayout(a)
  private val idle=Button(a)
  private val bind=Button(a)
  private val close=Button(a)
  private var view: PreviewView?=null
  private var preview: Preview?=null
  private var capture: ImageCapture?=null
  private var camera: androidx.camera.core.Camera?=null
  private var resumed=false
  private var focused=false
  private var invalid=false
  private var generation=0
  private var frameTime=-1L
  private var last=""
  private var opened=false
  private var destroyed=false
  private val cameraObservers=mutableListOf<Pair<androidx.lifecycle.LiveData<CameraState>,Observer<CameraState>>>()
  private fun now()=SystemClock.elapsedRealtime()
  private fun current()=!invalid&&!destroyed&&resumed&&a.hasWindowFocus()&&!a.isFinishing&&!a.isDestroyed&&frame.isAttachedToWindow&&frame.width>0&&frame.height>0&&GraphicsEntryProbe.noExpo(a.window.decorView)
  private fun details(): JSONObject {
    val info=ActivityManager.MemoryInfo();(a.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).getMemoryInfo(info)
    val child=view?.let { v -> (0 until v.childCount).joinToString(",") { v.getChildAt(it).javaClass.name } }.orEmpty()
    return JSONObject().put("phase",protocol.phase().name).put("activity",a.javaClass.name).put("activityIdentity",System.identityHashCode(a)).put("resumed",resumed).put("focused",a.hasWindowFocus()).put("attached",frame.isAttachedToWindow).put("hardwareAccelerated",a.window.decorView.isHardwareAccelerated).put("frameWidth",frame.width).put("frameHeight",frame.height).put("previewClass",view?.javaClass?.name?:"ABSENT").put("actualBackend",child.take(180)).put("previewWidth",view?.width?:0).put("previewHeight",view?.height?:0).put("displayRotation",view?.display?.rotation?:-1).put("captureRotation",capture?.targetRotation?:-1).put("scaleType",view?.scaleType?.name?:"ABSENT").put("sensorRotation",view?.display?.rotation?.let { camera?.cameraInfo?.getSensorRotationDegrees(it) }?:-1).put("previewResolution",preview?.resolutionInfo?.resolution?.toString()?:"UNKNOWN").put("captureResolution",capture?.resolutionInfo?.resolution?.toString()?:"UNKNOWN").put("linearZoom",camera?.cameraInfo?.zoomState?.value?.linearZoom?:-1f).put("cameraState",camera?.cameraInfo?.cameraState?.value?.type?.name?:"UNBOUND").put("streamState",view?.previewStreamState?.value?.name?:"ABSENT").put("useCases",if(capture==null)"NONE" else "Preview,ImageCapture").put("pssKb",android.os.Debug.getPss()).put("nativeHeapKb",android.os.Debug.getNativeHeapAllocatedSize()/1024).put("availableMemoryMb",info.availMem/(1024*1024)).put("lowMemory",info.lowMemory)
  }
  private fun publish(){if(!destroyed){status.contentDescription=last;status.text="Graphics entry: ${protocol.phase().name}\nNo photo. Explicit stages only."}}
  /** Snapshot on main; only worker performs filesystem IO. Render callbacks never wait for it. */
  private fun event(name: String,observedAt: Long=now(),after: (() -> Unit)?=null){
    val d=details().put("observedMillis",observedAt).put("snapshotMillis",now());val epoch=generation
    try {io.execute {try {val record=handle.journal.record(name,d);main.post {last=record;publish();if(epoch==generation&&!destroyed)after?.invoke()} }catch(_:Exception){main.post {journalUnknown()}}}}
    catch(_:RejectedExecutionException){journalUnknown()}
  }
  private fun journalUnknown(){invalid=true;generation++;protocol.unknown();idle.isEnabled=false;bind.isEnabled=false;close.isEnabled=false;preview?.setSurfaceProvider(null);handle.provider.unbindAll();view?.let {frame.removeView(it)};clearObservers();publish()}
  /** Before each explicit effect: durable intent, then current context recheck on main. */
  private fun effect(name: String,work: () -> Unit){
    if(!current()) {fail("CONTEXT_CHANGED");return};idle.isEnabled=false;bind.isEnabled=false
    event(name){try{check(current());work()}catch(_:Exception){fail("STAGE_REFUSED")}}
  }
  private fun timeout(phase: GraphicsEntryProtocol.Phase){val epoch=generation;main.postDelayed({if(epoch==generation&&protocol.phase()==phase)fail("STAGE_NOT_READY")},30000)}
  fun create(){
    status.apply {setTextColor(Color.BLACK);setBackgroundColor(Color.WHITE);textSize=14f;importantForAccessibility=View.IMPORTANT_FOR_ACCESSIBILITY_YES;accessibilityLiveRegion=View.ACCESSIBILITY_LIVE_REGION_POLITE}
    idle.apply {text="Attach idle preview view";isEnabled=false;setOnClickListener {effect("IDLE_VIEW_INTENT"){
      protocol.idle(now(),current());view=PreviewView(a).also {frame.addView(it,0,FrameLayout.LayoutParams(-1,-1))};event("IDLE_VIEW_ATTACHED")
      timeout(GraphicsEntryProtocol.Phase.IDLE);main.postDelayed({try{protocol.idleReady(now(),current());event("IDLE_READY"){bind.isEnabled=current()}}catch(_:Exception){fail("IDLE_NOT_READY")}},10000)
    }}}
    bind.apply {text="Bind camera preview (no photo)";isEnabled=false;setOnClickListener {effect("CAMERA_BIND_INTENT"){
      protocol.bind(now(),current());check(GraphicsEntryProbe.closed(handle.provider));val v=checkNotNull(view)
      val live=Preview.Builder().setTargetRotation(v.display.rotation).build()
      val image=ImageCapture.Builder().setTargetRotation(v.display.rotation).setTargetResolution(android.util.Size(1440,1080)).setFlashMode(ImageCapture.FLASH_MODE_OFF).build()
      preview=live;capture=image;live.setSurfaceProvider(v.surfaceProvider)
      camera=handle.provider.bindToLifecycle(a,CameraSelector.DEFAULT_BACK_CAMERA,live,image);camera!!.cameraControl.setLinearZoom(0f)
      event("CAMERA_BOUND");timeout(GraphicsEntryProtocol.Phase.BINDING)
      camera!!.cameraInfo.cameraState.observe(a){state -> if(!invalid&&state.type==CameraState.Type.OPEN&&!opened){opened=true;event("CAMERA_OPEN")}}
      v.previewStreamState.observe(a){state ->
        if(!invalid&&state==PreviewView.StreamState.STREAMING&&protocol.phase()==GraphicsEntryProtocol.Phase.BINDING){
          try{check(opened&&camera!!.cameraInfo.cameraState.value?.type==CameraState.Type.OPEN);protocol.streaming(now(),current());event("STREAMING")
            val epoch=generation;main.postDelayed({if(epoch==generation)try{check(v.previewStreamState.value==PreviewView.StreamState.STREAMING&&camera!!.cameraInfo.cameraState.value?.type==CameraState.Type.OPEN);protocol.previewReady(now(),current());event("PREVIEW_READY")}catch(_:Exception){fail("STREAM_HOLD_INTERRUPTED")}},30000)
          }catch(_:Exception){fail("STREAM_CONTEXT")}
        }else if(!invalid&&state!=PreviewView.StreamState.STREAMING&&protocol.phase() in listOf(GraphicsEntryProtocol.Phase.STREAMING,GraphicsEntryProtocol.Phase.PREVIEW_READY))fail("STREAM_LOST")
      }
    }}}
    close.apply {text="Close graphics probe";setOnClickListener {closing()}}
    listOf(idle,bind,close).forEach {it.minHeight=(48*a.resources.displayMetrics.density).toInt()}
    frame.addView(object: View(a){private val pen=android.graphics.Paint().apply {color=Color.YELLOW;strokeWidth=3*a.resources.displayMetrics.density;style=android.graphics.Paint.Style.STROKE};init{importantForAccessibility=IMPORTANT_FOR_ACCESSIBILITY_NO};override fun onDraw(c: android.graphics.Canvas){super.onDraw(c);c.drawRect(width*.06f,height*.06f,width*.94f,height*.94f,pen)}},FrameLayout.LayoutParams(-1,-1))
    val column=LinearLayout(a).apply {orientation=LinearLayout.VERTICAL;setBackgroundColor(Color.BLACK);addView(frame,LinearLayout.LayoutParams(-1,0,1f));addView(status,LinearLayout.LayoutParams(-1,(72*a.resources.displayMetrics.density).toInt()));addView(idle);addView(bind);addView(close)}
    a.setContentView(column);event("NATIVE_SHELL_CREATED");timeout(GraphicsEntryProtocol.Phase.SHELL)
    frame.post {if(!invalid){event("SHELL_LAYOUT");if(android.os.Build.VERSION.SDK_INT>=29&&frame.isHardwareAccelerated){
      frame.viewTreeObserver.registerFrameCommitCallback {val submittedAt=now();main.post {if(!invalid&&frameTime<0){frameTime=submittedAt;event("SHELL_FRAME_SUBMITTED",observedAt=submittedAt);main.postDelayed({try{protocol.shellReady(now(),frameTime,current());event("SHELL_READY"){idle.isEnabled=current()}}catch(_:Exception){fail("SHELL_NOT_READY")}},10000)}}};frame.invalidate()
    }else fail("FRAME_COMMIT_UNAVAILABLE")}}
  }
  fun resume(){resumed=true}
  fun focus(value: Boolean){if(value)focused=true else if(focused&&!invalid&&protocol.phase()!=GraphicsEntryProtocol.Phase.CLOSED)fail("FOCUS_LOST")}
  fun stop(){resumed=false;if(protocol.phase()!=GraphicsEntryProtocol.Phase.CLOSED&&protocol.phase()!=GraphicsEntryProtocol.Phase.CLOSING)fail("BACKGROUND")}
  private fun fail(reason: String){if(invalid||destroyed)return;invalid=true;generation++;protocol.unknown();idle.isEnabled=false;bind.isEnabled=false;event(reason);closing()}
  private fun clearObservers(){cameraObservers.forEach {(d,o)->d.removeObserver(o)};cameraObservers.clear()}
  private fun closing(){
    if(protocol.phase() in listOf(GraphicsEntryProtocol.Phase.CLOSING,GraphicsEntryProtocol.Phase.CLOSED))return
    invalid=true;generation++;idle.isEnabled=false;bind.isEnabled=false;close.isEnabled=false
    protocol.closing(now())
    event("CLOSE_INTENT") {
      preview?.setSurfaceProvider(null);handle.provider.unbindAll();view?.let {frame.removeView(it)}
      var done=false
      fun inspect(){if(!done&&GraphicsEntryProbe.closed(handle.provider)){done=true;clearObservers();try{protocol.closed(now(),true);event("CAMERAS_CLOSED")}catch(_:Exception){protocol.unknown();publish()}}}
      for(info in handle.provider.availableCameraInfos){val o=Observer<CameraState>{inspect()};cameraObservers.add(Pair(info.cameraState,o));info.cameraState.observeForever(o);if(done)info.cameraState.removeObserver(o)}
      inspect();main.postDelayed({if(!done){done=true;clearObservers();protocol.unknown();event("CLOSE_NOT_OBSERVED")}},10000)
    }
  }
  fun destroy(){destroyed=true;generation++;invalid=true;preview?.setSurfaceProvider(null);handle.provider.unbindAll();view?.let {frame.removeView(it)};clearObservers();io.shutdown()}
}

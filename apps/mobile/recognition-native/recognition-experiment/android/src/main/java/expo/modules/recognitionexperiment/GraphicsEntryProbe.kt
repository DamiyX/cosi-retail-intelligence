package expo.modules.recognitionexperiment

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import android.view.View
import android.view.ViewGroup
import androidx.camera.core.CameraState
import androidx.camera.lifecycle.ProcessCameraProvider
import expo.modules.recognitioncpu.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit

/** Native-only observation mode. A readback never creates a ticket or resumes stages. */
object GraphicsEntryProbe {
  const val META="com.damiyx.recognition.GRAPHICS_ENTRY_PROBE"
  const val OLD_SOURCE="8f0127a4b4e4b39e9162c9993642f7488040f5f7beebb039fd62bd4dbd3f0cfa"
  const val OLD_APK="0e2ae8a3b63c9915ba1de932bf994a1c731710282d76d4aec6448995cac4f7a8"
  @Volatile private var token: CameraCaptureDiagnosticReservation.Token?=null
  private var ticket: Handle?=null
  private var issued=0L
  data class Handle(val journal: Journal,val provider: ProcessCameraProvider,val previous: java.lang.ref.WeakReference<Activity>)
  fun enabled(c: Context)=c.packageManager.getApplicationInfo(c.packageName,PackageManager.GET_META_DATA).metaData?.getBoolean(META,false)==true
  private fun own(c: Context){check(enabled(c)&&c.packageName=="com.damiyx.retailintelligence.recognitionverification");check(c.packageManager.getApplicationInfo(c.packageName,PackageManager.GET_META_DATA).metaData?.getString("com.damiyx.recognition.DIAGNOSTIC_SOURCE")==CameraCaptureDiagnosticSource.SHA256)}
  fun noExpo(v: View): Boolean=!(v.javaClass.name.startsWith("expo.modules.camera.")&&v.isAttachedToWindow)&&(v !is ViewGroup||(0 until v.childCount).all { noExpo(v.getChildAt(it)) })
  fun closed(p: ProcessCameraProvider)=p.availableCameraInfos.isNotEmpty()&&p.availableCameraInfos.all { it.cameraState.value?.type==CameraState.Type.CLOSED }
  private fun onlyProcess(c: Context){val p=(c.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).runningAppProcesses;check(p!=null&&p.any { it.uid==android.os.Process.myUid()&&it.pid==android.os.Process.myPid() }&&p.filter { it.uid==android.os.Process.myUid() }.all { it.pid==android.os.Process.myPid() })}
  fun held(){CameraCaptureDiagnosticReservation.require(token)}
  private val entryClaimed=java.util.concurrent.atomic.AtomicBoolean(false)
  class Admission(val receivedMillis: Long) {
    @Volatile var apk=""
    var aliasFacts: JSONObject?=null
    val progress=GraphicsAdmissionTrace({SystemClock.elapsedRealtime()},{e ->
      val record=JSONObject().put("kind","GRAPHICS_ENTRY_ADMISSION").put("schemaVersion",2)
        .put("provenance",e.provenance).put("durable",e.durable).put("rootOwnerTrusted",false)
        .put("sequence",e.earlySequence).put("streamSequence",e.streamSequence).put("event",e.event).put("stage",e.stage)
        .put("observedMillis",e.observedMillis).put("elapsedMillis",SystemClock.elapsedRealtime())
        .put("source",CameraCaptureDiagnosticSource.SHA256).put("sourceVerified",apk.isNotEmpty())
        .put("apk",if(apk.isEmpty())JSONObject.NULL else apk).put("apkVerified",apk.isNotEmpty())
        .put("process",CameraProofLifecycle.PROCESS).put("pid",android.os.Process.myPid())
        .put("code",e.code).put("totalClaim",GraphicsEntryProtocol.TOTAL).put("captureAuthority",false)
      aliasFacts?.let {record.put("alias",it)}
      check(record.toString().toByteArray().size<=2048);android.util.Log.i("CosiGraphicsProbe",record.toString())
    })
    fun alias(location: String,absoluteUnder: Boolean,canonicalUnder: Boolean,contextCanonical: Boolean){
      aliasFacts=JSONObject().put("location",location).put("absoluteUnderCanonicalFiles",absoluteUnder).put("canonicalUnderCanonicalFiles",canonicalUnder).put("contextFilesCanonical",contextCanonical)
      progress.alias()
    }
  }
  fun admission(receivedMillis: Long): Admission {
    check(entryClaimed.compareAndSet(false,true)){"CAMERA_GRAPHICS_ENTRY_CONSUMED"}
    return Admission(receivedMillis).also {it.progress.received(receivedMillis)}
  }
  private fun probeRoot(c: Context): File=try{CameraDirectoryPath.exactRoot(c.filesDir,GraphicsEntryProtocol.ROOT)}catch(e:IllegalArgumentException){
    if(e.message=="CAMERA_DIRECTORY_ALIAS")throw IllegalArgumentException("CAMERA_DIRECTORY_ALIAS_AT_GRAPHICS_PROBE",e) else throw e
  }
  /** Worker only. Early live observations cannot create/approve a durable owner. */
  @Synchronized fun prepare(c: Context,a: Activity,admission: Admission): Handle {
    val trace=admission.progress
    try {
      trace.step("IDENTITY") {
        own(c);onlyProcess(c);check(ticket==null&&token==null&&!CameraProofLifecycle.SHARED_BUSY.get())
        check(!present(probeRoot(c))){"CAMERA_GRAPHICS_PROBE_ROOT_CONSUMED"}
        admission.apk=CameraOrientationAndroid.apkHash(c)
      }
      CameraProofFiles.observeAliases {location,absoluteUnder,canonicalUnder,contextCanonical -> admission.alias(location,absoluteUnder,canonicalUnder,contextCanonical)}.use {
        trace.step("LEGACY_METADATA") {
          val legacy=CameraCaptureDiagnosticSetupSnapshot.collectForRecovery(c,null)
          check(legacy["sha256"]==CameraCaptureDiagnosticProfile.RETAINED_SHA256)
        }
        trace.step("B1_METADATA") {historical(c);quarantined(c)}
      }
      val provider=trace.step("CAMERA_CLOSED") {
        check(c.checkSelfPermission(android.Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)
        val p=ProcessCameraProvider.getInstance(c).get(2,TimeUnit.SECONDS)
        val observation=FutureTask { !a.isDestroyed&&!a.isFinishing&&a.hasWindowFocus()&&noExpo(a.window.decorView)&&closed(p) }
        a.runOnUiThread(observation);check(observation.get(2,TimeUnit.SECONDS));p
      }
      trace.rootIntent();token=CameraCaptureDiagnosticReservation.claim()
      val journal=Journal(c,admission.apk,admission);journal.create()
      journal.record("ADMISSION_VALIDATED",JSONObject().put("observedMillis",SystemClock.elapsedRealtime()).put("bridgeObservedMillis",admission.receivedMillis).put("earlyLiveEvents",trace.earlyCount()).put("quarantineEvidenceSha256",GraphicsEntryRetained.METADATA_SHA256))
      val h=Handle(journal,provider,java.lang.ref.WeakReference(a));ticket=h;issued=SystemClock.elapsedRealtime();return h
    }catch(error:Exception){trace.refused(error);throw error}
  }
  fun launch(a: Activity,h: Handle){held();check(a.hasWindowFocus()&&!a.isFinishing&&noExpo(a.window.decorView)&&closed(h.provider)&&ticket===h&&SystemClock.elapsedRealtime()-issued<30000);a.startActivity(android.content.Intent(a,CameraCaptureDiagnosticActivity::class.java))}
  @Synchronized fun consume(c: Context): Handle {own(c);held();val h=checkNotNull(ticket);ticket=null;check(SystemClock.elapsedRealtime()-issued<30000&&closed(h.provider)&&h.previous.get()?.let { !it.isDestroyed&&noExpo(it.window.decorView) }==true);return h}
  private fun descriptor(f: File,dir: Boolean): JSONObject {
    check(f.absoluteFile==f.canonicalFile);val before=Os.lstat(f.path)
    check(before.st_uid==android.os.Process.myUid()&&if(dir)OsConstants.S_ISDIR(before.st_mode) else OsConstants.S_ISREG(before.st_mode)&&before.st_nlink==1L)
    val fd=Os.open(f.path,OsConstants.O_RDONLY or OsConstants.O_NONBLOCK or OsConstants.O_NOFOLLOW or OsConstants.O_CLOEXEC,0)
    try {val s=Os.fstat(fd);check(s.st_dev==before.st_dev&&s.st_ino==before.st_ino&&s.st_size==before.st_size&&s.st_mode==before.st_mode&&s.st_uid==before.st_uid);return JSONObject().put("name",f.name).put("device",s.st_dev).put("inode",s.st_ino).put("uid",s.st_uid).put("mode",s.st_mode).put("links",s.st_nlink).put("bytes",s.st_size).put("mtime",s.st_mtime).put("ctime",s.st_ctime)}finally{Os.close(fd)}
  }
  private fun present(f: File): Boolean=try{Os.lstat(f.path);true}catch(e:android.system.ErrnoException){if(e.errno==OsConstants.ENOENT)false else throw e}
  private fun historicalOnce(c: Context): JSONArray {
    val result=JSONArray();val parent=c.filesDir.canonicalFile
    for(epoch in 1..3){val f=File(parent,CameraCaptureDiagnosticProfile.root(epoch));check(!present(f)){"CAMERA_GRAPHICS_B1_CHANGED"};result.put(JSONObject().put("root",f.name).put("shape","ABSENT_QUARANTINED"))}
    return result
  }
  /** The reviewed old root is read-only forever; no ownership is inferred from emptiness. */
  private fun quarantined(c: Context): JSONObject {
    val io=CameraProofFiles(c);val parent=c.filesDir.canonicalFile
    check(io.list(parent).filter {it.startsWith("p203-graphics-entry-")}.all {GraphicsEntryRetained.allowedRoot(it)}){"CAMERA_GRAPHICS_UNKNOWN_ROOT"}
    val root=try{CameraDirectoryPath.exactRoot(c.filesDir,GraphicsEntryRetained.ROOT)}catch(e:IllegalArgumentException){throw IllegalArgumentException("CAMERA_DIRECTORY_ALIAS_AT_GRAPHICS_RETAINED_A1",e)}
    check(present(root)){"CAMERA_GRAPHICS_RETAINED_MISSING"}
    fun once(): JSONObject {
      val d=descriptor(root,true);val leaves=io.list(root)
      GraphicsEntryRetained.validate(d.getString("name"),longArrayOf(d.getLong("device"),d.getLong("inode"),d.getLong("uid"),d.getLong("mode"),d.getLong("links"),d.getLong("bytes"),d.getLong("mtime"),d.getLong("ctime")),leaves.size)
      return d
    }
    val first=once();check(first.toString()==once().toString()){"CAMERA_GRAPHICS_RETAINED_CHANGED"}
    return JSONObject().put("root",GraphicsEntryRetained.ROOT).put("shape","EMPTY_QUARANTINED").put("descriptor",first).put("records",JSONArray()).put("observedBytes",0)
      .put("ownerProven",false).put("adopted",false).put("fullClaim",GraphicsEntryRetained.CLAIM).put("validation","EXACT_REVIEWED_EMPTY_DESCRIPTOR")
      .put("reviewedMetadataSha256",GraphicsEntryRetained.METADATA_SHA256).put("dispositionSha256",GraphicsEntryRetained.DISPOSITION_SHA256)
      .put("expectedMetadataProducerReference",GraphicsEntryRetained.METADATA_PRODUCER).put("expectedMetadataExecutorApkReference",GraphicsEntryRetained.METADATA_EXECUTOR_APK)
      .put("provenance","MAIN_REVIEWED_METADATA_REFERENCE_NOT_OWNERSHIP")
  }
  fun historical(c: Context): JSONArray {val first=historicalOnce(c);check(first.toString()==historicalOnce(c).toString());return first}
  @Synchronized fun readback(c: Context): String {
    own(c);onlyProcess(c)
    var facts: JSONObject?=null
    CameraProofFiles.observeAliases {location,absoluteUnder,canonicalUnder,contextCanonical ->
      facts=JSONObject().put("location",location).put("absoluteUnderCanonicalFiles",absoluteUnder).put("canonicalUnderCanonicalFiles",canonicalUnder).put("contextFilesCanonical",contextCanonical)
    }.use {
      return try{readbackObserved(c)}catch(error:Exception){
        JSONObject().put("kind","GRAPHICS_ENTRY_METADATA_REFUSAL").put("schemaVersion",2).put("code",CameraProofFinalizer.code(error)).put("alias",facts?:JSONObject.NULL)
          .put("source",CameraCaptureDiagnosticSource.SHA256).put("process",CameraProofLifecycle.PROCESS).put("pid",android.os.Process.myPid()).put("observedMillis",SystemClock.elapsedRealtime()).put("probeRootState","UNKNOWN").put("writeAuthority","NONE").put("captureAuthority",false).put("recoveryAuthorized",false).put("totalClaim",GraphicsEntryProtocol.TOTAL).toString()
      }
    }
  }
  private fun readbackObserved(c: Context): String {
    own(c);onlyProcess(c)
    if(token!=null)held() else check(!CameraProofLifecycle.SHARED_BUSY.get())
    val legacy=CameraCaptureDiagnosticSetupSnapshot.collectForRecovery(c,token);check(legacy["sha256"]==CameraCaptureDiagnosticProfile.RETAINED_SHA256)
    val old=historical(c);val retained=quarantined(c);val root=probeRoot(c);val probe=JSONObject().put("root",GraphicsEntryProtocol.ROOT).put("shape","ABSENT").put("adopted",false).put("ownerProven",false)
    if(present(root)) {val d=descriptor(root,true);val io=CameraProofFiles(c);val names=io.list(root).sorted();check(names.size<=32);var total=0L;val records=JSONArray();var expected=0
      for(n in names){check(n=="record-%02d.json".format(expected++));val f=File(root,n);descriptor(f,false);val value=io.read(f,2048);total+=value.size;check(total<=65536);val parsed=try{JSONObject(String(value,Charsets.UTF_8))}catch(_:Exception){null}
        records.put(JSONObject().put("name",n).put("bytes",value.size).put("sha256",CameraCaptureDiagnosticSession.hash(value)).put("record",parsed?:JSONObject.NULL).put("torn",parsed==null))}
      check(d.toString()==descriptor(root,true).toString()&&names==io.list(root).sorted());probe.put("descriptor",d).put("records",records).put("observedBytes",total).put("shape",if(names.isEmpty())"EMPTY_UNKNOWN" else "RECORDS_METADATA_ONLY_UNKNOWN_UNLESS_CLOSED")
    }
    val rawParentPasses=try{CameraDirectoryPath.requireCanonical(c.filesDir);true}catch(error:IllegalArgumentException){check(error.message=="CAMERA_DIRECTORY_ALIAS");false}
    val pathFacts=JSONObject().put("location","ORIGINAL_JOURNAL_PARENT_SYNC_CALLER").put("originalRawParentPassesStrictGuardNow",rawParentPasses).put("actualProbeRootCanonical",root.absoluteFile==root.canonicalFile).put("actualProbeParentMatchesCanonicalFiles",root.parentFile==c.filesDir.canonicalFile).put("historicalFailureLocationProven",false)
    return JSONObject().put("kind","GRAPHICS_ENTRY_METADATA").put("schemaVersion",2).put("pathFacts",pathFacts).put("producerSource",CameraCaptureDiagnosticSource.SHA256).put("executorApk",CameraOrientationAndroid.apkHash(c)).put("process",CameraProofLifecycle.PROCESS).put("pid",android.os.Process.myPid()).put("observedMillis",SystemClock.elapsedRealtime()).put("legacyPayloadSha256",legacy["sha256"]).put("b1",old).put("quarantinedProbe",retained).put("probe",probe).put("retainedClaim",GraphicsEntryProtocol.RETAINED).put("probeClaim",65536).put("totalClaim",GraphicsEntryProtocol.TOTAL).put("writeAuthority","NONE").put("captureAuthority",false).put("recoveryAuthorized",false).toString().also{check(it.toByteArray().size<=196608)}
  }
  class Journal(private val c: Context,val apk: String,private val admission: Admission) {
    private val root=probeRoot(c);private val files=CameraProofFiles(c)
    private val budget=GraphicsEntryProtocol(0)
    private var rootIdentity="";private var count=0;private var bytes=0L
    private fun checkRoot(){held();historical(c);quarantined(c);check(descriptor(root,true).let { "${it.getLong("device")}|${it.getLong("inode")}" }==rootIdentity)}
    fun create(){held();check(!root.exists()&&c.filesDir.usableSpace>=65536&&GraphicsEntryProtocol.TOTAL<=GraphicsEntryProtocol.CAP);Os.mkdir(root.path,448);val d=descriptor(root,true);rootIdentity="${d.getLong("device")}|${d.getLong("inode")}";files.syncDirectory(root.parentFile!!);files.syncDirectory(root)}
    @Synchronized fun record(event: String,details: JSONObject=JSONObject()): String {
      checkRoot();check(event.matches(Regex("[A-Z_]{1,40}"))&&count<20)
      val record=JSONObject().put("kind","GRAPHICS_ENTRY_PHASE").put("schemaVersion",2).put("sequence",count).put("streamSequence",admission.progress.nextDurable()).put("provenance","DURABLE_JOURNAL").put("durable",true).put("apkVerified",true).put("sourceVerified",true).put("observedMillis",details.optLong("observedMillis",SystemClock.elapsedRealtime())).put("event",event).put("elapsedMillis",SystemClock.elapsedRealtime()).put("source",CameraCaptureDiagnosticSource.SHA256).put("apk",apk).put("process",CameraProofLifecycle.PROCESS).put("pid",android.os.Process.myPid()).put("details",details).put("totalClaim",GraphicsEntryProtocol.TOTAL).put("captureAuthority",false)
      val raw=record.toString().toByteArray();budget.reserveRecord(raw.size);check(raw.size in 1..2048&&bytes<=65536-raw.size);check(files.list(root).sorted()==(0 until count).map { "record-%02d.json".format(it) })
      files.writeNew(File(root,"record-%02d.json".format(count)),raw);files.syncDirectory(root);checkRoot();count++;bytes+=raw.size
      android.util.Log.i("CosiGraphicsProbe",record.toString());return record.toString()
    }
  }
}

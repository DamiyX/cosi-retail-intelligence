package expo.modules.recognitionexperiment

import android.content.Context
import android.system.Os
import android.system.OsConstants
import expo.modules.recognitioncpu.*
import java.io.File
import java.io.FileOutputStream

/** Exclusive fixed-profile roots. Never writes the quarantined A1 directory. */
class CameraCaptureDiagnosticEpochIO(private val context: Context, val epoch: Int) : CameraCaptureDiagnosticSetup.IO {
  val root = File(context.filesDir.canonicalFile, CameraCaptureDiagnosticProfile.root(epoch))
  private val uid = android.os.Process.myUid()
  private val files = CameraProofFiles(context)
  private var identity: Pair<Long,Long>? = if (root.exists()) inspect() else null
  private fun inspect(): Pair<Long,Long> {
    check(root.absoluteFile == root.canonicalFile)
    val s = Os.lstat(root.path)
    check(OsConstants.S_ISDIR(s.st_mode) && s.st_uid == uid && (s.st_mode and 511) == 448) { "SETUP_DIRECTORY_OWNER_TYPE_MODE" }
    return Pair(s.st_dev, s.st_ino)
  }
  private fun checkRoot() { check(identity != null && inspect() == identity) { "SETUP_DIRECTORY_CHANGED" } }
  private fun sync(dir: File) {
    val before = Os.lstat(dir.path)
    val fd = Os.open(dir.path, OsConstants.O_RDONLY or OsConstants.O_NOFOLLOW or OsConstants.O_CLOEXEC, 0)
    try { val s = Os.fstat(fd); check(OsConstants.S_ISDIR(s.st_mode) && s.st_uid == uid && s.st_ino == before.st_ino && s.st_dev == before.st_dev); Os.fsync(fd) } finally { Os.close(fd) }
  }
  override fun createFresh() {
    check(identity == null && !root.exists()) { "SETUP_EXISTING_OR_TORN" }
    check(root.parentFile!!.usableSpace >= CameraCaptureDiagnosticProfile.NEW_CLAIM) { "SETUP_FREE_SPACE" }
    Os.mkdir(root.path, 448); identity = inspect(); sync(root.parentFile!!); sync(root)
  }
  override fun names(): Set<String> { checkRoot(); return files.list(root).toSet().also { check(it.size <= 128); checkRoot() } }
  override fun read(name: String, cap: Int): ByteArray { checkRoot(); check(name.matches(Regex("[a-z0-9.-]{1,128}"))); return files.read(File(root,name),cap).also { checkRoot() } }
  override fun syncDirectory() { checkRoot(); sync(root); checkRoot() }
  override fun writeNew(name: String, value: ByteArray) {
    checkRoot()
    check(name in setOf("setup-owner","ready-attempt","pre-ready-closed","jpeg-header","image","capture.jpeg") || name.matches(Regex("event-[0-9]{3}"))) { "SETUP_UNKNOWN_WRITE" }
    check(value.size.toLong() <= if (name == "capture.jpeg") CameraCaptureDiagnosticSession.JPEG else 2048)
    val names = names(); check(names.size < 128 && name !in names)
    var observed = 0L
    for (leaf in names) { val size=files.size(File(root,leaf));check(size>=0);observed=Math.addExact(observed,size) }
    check(observed <= CameraCaptureDiagnosticSetup.CLAIM - value.size) { "SETUP_ROOT_ALLOWANCE" }
    val fd=Os.open(File(root,name).path,OsConstants.O_WRONLY or OsConstants.O_CREAT or OsConstants.O_EXCL or OsConstants.O_NOFOLLOW or OsConstants.O_CLOEXEC,384)
    FileOutputStream(fd).use { stream ->
      val s=Os.fstat(fd);check(OsConstants.S_ISREG(s.st_mode)&&s.st_uid==uid&&s.st_nlink==1L)
      stream.write(value);stream.flush();Os.fsync(fd)
    }
    syncDirectory()
    check(files.read(File(root,name),value.size).contentEquals(value)) { "SETUP_WRITE_READBACK" }
  }
}

/** Blocking worker operations only; native observations are supplied by Binding on main. */
object CameraCaptureDiagnosticEpochs {
  data class Handle(val owner: CameraCaptureDiagnosticSetup.Owner, val io: CameraCaptureDiagnosticEpochIO,
    val setup: CameraCaptureDiagnosticSetup, val admission: CameraCaptureDiagnosticSession.Admission)
  data class LegacyEvidence(val hash: String, val retained: Long)
  fun validateLegacy(context: Context, token: CameraCaptureDiagnosticReservation.Token?): LegacyEvidence {
    val snapshot=CameraCaptureDiagnosticSetupSnapshot.collectForRecovery(context,token)
    check(snapshot["sha256"] == CameraCaptureDiagnosticProfile.RETAINED_SHA256) { "SETUP_QUARANTINED_LEGACY_CHANGED" }
    val payload=snapshot["payload"] as Map<*,*>
    check(payload["legacyOwnerProven"] == false && payload["legacyFileShape"] == "EMPTY_DIRECTORY")
    val retained=(payload["retainedIncludingLegacyA1"] as Number).toLong()
    check(retained == CameraCaptureDiagnosticProfile.RETAINED_CLAIM)
    return LegacyEvidence(snapshot["sha256"] as String,retained)
  }
  fun beforeReady(context: Context, token: CameraCaptureDiagnosticReservation.Token, handle: Handle, apk: String) {
    CameraCaptureDiagnosticReservation.require(token);validateLegacy(context,token)
    for (epoch in 1..3) {
      val root=File(context.filesDir,CameraCaptureDiagnosticProfile.root(epoch))
      if (epoch > handle.owner.epoch) { check(!root.exists()) { "SETUP_FUTURE_ROOT_CONFLICT" };continue }
      val io=if(epoch==handle.owner.epoch)handle.io else CameraCaptureDiagnosticEpochIO(context,epoch)
      val owner=CameraCaptureDiagnosticSetup.Owner.parse(io.read(CameraCaptureDiagnosticSetup.OWNER,1024))
      check(owner.epoch==epoch&&owner.run==CameraCaptureDiagnosticProfile.RUN&&owner.source==CameraCaptureDiagnosticProfile.EXECUTOR_SOURCE_SHA256&&owner.apk==apk&&owner.retained==CameraCaptureDiagnosticProfile.RETAINED_SHA256)
      if (epoch < handle.owner.epoch) CameraCaptureDiagnosticSetup.readClosed(io,owner)
      else { check(io.names()==setOf(CameraCaptureDiagnosticSetup.OWNER));check(owner.bytes().contentEquals(handle.owner.bytes())) }
    }
  }
  fun next(context: Context, token: CameraCaptureDiagnosticReservation.Token, apk: String,
    observed: CameraCaptureDiagnosticSetup.ReleaseObservation): Handle {
    CameraCaptureDiagnosticReservation.require(token)
    val legacy=validateLegacy(context,token)
    val retained=legacy.retained
    val prior=mutableListOf<CameraCaptureDiagnosticSetup.RetainedClosed>()
    var next=1;var gap=false
    for (epoch in 1..3) {
      val root=File(context.filesDir,CameraCaptureDiagnosticProfile.root(epoch))
      if (!root.exists()) { gap=true;continue }
      check(!gap) { "SETUP_EPOCH_GAP" }
      val io=CameraCaptureDiagnosticEpochIO(context,epoch)
      val owner=CameraCaptureDiagnosticSetup.Owner.parse(io.read(CameraCaptureDiagnosticSetup.OWNER,1024))
      check(owner.run==CameraCaptureDiagnosticProfile.RUN && owner.epoch==epoch && owner.source==CameraCaptureDiagnosticProfile.EXECUTOR_SOURCE_SHA256 && owner.apk==apk && owner.retained==CameraCaptureDiagnosticProfile.RETAINED_SHA256) { "SETUP_PRIOR_OWNER_CHANGED" }
      prior.add(CameraCaptureDiagnosticSetup.readClosed(io,owner));next=epoch+1
    }
    check(next<=3) { "SETUP_EPOCH_LIMIT" }
    val owner=CameraCaptureDiagnosticSetup.Owner(CameraCaptureDiagnosticProfile.RUN,next,CameraCaptureDiagnosticProfile.EXECUTOR_SOURCE_SHA256,apk,CameraCaptureDiagnosticProfile.RETAINED_SHA256,CameraProofLifecycle.PROCESS)
    CameraCaptureDiagnosticSetup.admitNext(prior,owner,retained,legacy.hash==CameraCaptureDiagnosticProfile.RETAINED_SHA256,observed)
    val io=CameraCaptureDiagnosticEpochIO(context,next)
    val setup=CameraCaptureDiagnosticSetup.create(io,owner)
    val admission=CameraCaptureDiagnosticProfile.admit(CameraCaptureDiagnosticProfile.RETAINED_SHA256,legacy.hash,retained,0,observed.released())
    return Handle(owner,io,setup,admission)
  }
}

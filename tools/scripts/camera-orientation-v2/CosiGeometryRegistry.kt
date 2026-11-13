package expo.modules.camera

import androidx.annotation.Keep
import java.util.UUID

/** One ephemeral native capability. Nothing can rebuild this attestation from a JS object or disk. */
@Keep
object CosiGeometryRegistry {
  private data class Entry(val job: String, val uri: String, val sha256: String, val json: String, val token: String)
  private var entry: Entry? = null
  @JvmStatic @Synchronized fun record(job: String, uri: String, sha256: String, json: String): String {
    check(entry == null && json.toByteArray(Charsets.UTF_8).size in 1..8192) { "CAMERA_GEOMETRY_NATIVE_SLOT" }
    check(job.matches(Regex("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}")) && uri.startsWith("file:///") && uri.length <= 2048 && sha256.matches(Regex("[a-f0-9]{64}"))) { "CAMERA_GEOMETRY_NATIVE_BINDING" }
    val token = UUID.randomUUID().toString();entry = Entry(job, uri, sha256, json, token);return token
  }
  @JvmStatic @Synchronized fun claim(job: String, uri: String, sha256: String, token: String): String {
    val current = checkNotNull(entry) { "CAMERA_GEOMETRY_NATIVE_MISSING" }
    check(current.job == job && current.uri == uri && current.sha256 == sha256 && current.token == token) { "CAMERA_GEOMETRY_NATIVE_BINDING" }
    entry = null;return current.json
  }
  @JvmStatic @Synchronized fun discard(job: String) { if (entry?.job == job) entry = null }
}

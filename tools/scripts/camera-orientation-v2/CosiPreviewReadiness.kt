package expo.modules.camera

/** Per-binding event provenance. Geometry admission is still independently mandatory. */
internal class CosiPreviewReadiness {
  class Binding(val generation: Int, val pictureSize: String) { internal var idle = false }
  private var configured: Binding? = null
  fun begin() { configured = null }
  fun bound(generation: Int, pictureSize: String): Binding = Binding(generation, pictureSize).also { configured = it }
  // A cached STREAMING replay cannot open a new binding. Require IDLE then STREAMING.
  fun stream(binding: Binding, generation: Int, pictureSize: String, streaming: Boolean): Map<String, Any>? {
    if (configured !== binding || binding.generation <= 0 || binding.generation != generation || binding.pictureSize != pictureSize || pictureSize.isEmpty()) return null
    if (!streaming) { binding.idle = true; return null }
    if (!binding.idle) return null
    return mapOf("generation" to binding.generation, "pictureSize" to binding.pictureSize)
  }
}

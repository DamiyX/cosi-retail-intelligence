package expo.modules.recognitionexperiment

/** Activity-owned launch binding. Never reconstructed from a provider result or fresh status. */
internal class OrientationResultState {
  var binding: String? = null
    private set
  var pending: Boolean = false
    private set
  fun restore(value: String?, launched: Boolean) {
    check(binding == null && !pending)
    if (value != null) check(value.isNotEmpty() && value.toByteArray(Charsets.UTF_8).size <= 4096)
    check(!launched || value != null)
    binding = value
    pending = launched
  }
  fun launch(value: String) {
    check(binding == null && !pending)
    check(value.isNotEmpty() && value.toByteArray(Charsets.UTF_8).size <= 4096)
    binding = value
    pending = true // Set before the SDK launch. Failure stays consumed.
  }
  fun takeResult(): String? {
    if (!pending) return null
    pending = false // Duplicate/replayed delivery cannot issue another native request.
    return binding
  }
}

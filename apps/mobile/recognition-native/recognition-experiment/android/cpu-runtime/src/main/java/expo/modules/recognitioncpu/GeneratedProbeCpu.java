package expo.modules.recognitioncpu;

import android.content.Context;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.Buffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.tensorflow.lite.DataType;
import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.InterpreterApi;
import org.tensorflow.lite.Tensor;

/** Private Interpreter implementation; its public boundary exposes only Java/Android types. */
public final class GeneratedProbeCpu {
  private static final String MODEL_HASH = "bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40";
  private static final char[] HEX = "0123456789abcdef".toCharArray();
  private GeneratedProbeCpu() {}

  public static Map<String, Object> runGeneratedProbe(Context context, String id, String fixtureHash)
      throws IOException, NoSuchAlgorithmException {
    // The Kotlin wrapper admits work. This extra check prevents this helper ever reading caller paths.
    String acceptedHash;
    switch (id) {
      case "zero": acceptedHash = "ad8c5f4d30e45b2a50f7f4d1f347f64d613c6fbcd92c54ca746ab077f402d8cc"; break;
      case "gray128": acceptedHash = "9f431255f59af2eddd112f42c666dff575d46dc45ab4da29e0e31c9085a54ab7"; break;
      case "gradient": acceptedHash = "cbdae93c587d46d692e49931bdba89acc6a1f0ac606829fc544a08decae6a178"; break;
      default: throw new IllegalArgumentException("Invalid generated fixture ID");
    }
    check(acceptedHash.equals(fixtureHash), "Fixture hash contract mismatch");
    long started = System.nanoTime();
    ByteBuffer model = direct(asset(context, "mobilenet_v3_small.tflite", 4117670, MODEL_HASH));
    ByteBuffer input = direct(asset(context, id + ".runtime.f32le", 602112, fixtureHash));
    FloatBuffer floats = input.asFloatBuffer();
    while (floats.hasRemaining()) {
      float value = floats.get();
      check(Float.isFinite(value) && value >= 0f && value <= 1f, "Invalid generated input");
    }
    Interpreter.Options options = new Interpreter.Options();
    options.setRuntime(InterpreterApi.Options.TfLiteRuntime.FROM_APPLICATION_ONLY);
    options.setNumThreads(1);
    options.setUseXNNPACK(false);
    // This pinned classic API has no NNAPI/delegate setters. No delegate/CompiledModel is constructed.
    ByteBuffer output = ByteBuffer.allocateDirect(4096).order(ByteOrder.LITTLE_ENDIAN);
    double inferenceMs;
    try (Interpreter interpreter = new Interpreter(model, options)) {
      check(interpreter.getInputTensorCount() == 1 && interpreter.getOutputTensorCount() == 1, "Tensor count mismatch");
      Tensor inTensor = interpreter.getInputTensor(0);
      Tensor outTensor = interpreter.getOutputTensor(0);
      check(Arrays.equals(inTensor.shape(), new int[] {1, 224, 224, 3}), "Input shape mismatch");
      check(Arrays.equals(outTensor.shape(), new int[] {1, 1024}), "Output shape mismatch");
      check(inTensor.dataType() == DataType.FLOAT32 && outTensor.dataType() == DataType.FLOAT32, "Tensor type mismatch");
      check(inTensor.numBytes() == 602112 && outTensor.numBytes() == 4096, "Tensor size mismatch");
      check("serving_default_inputs:0".equals(inTensor.name()) && "StatefulPartitionedCall:0".equals(outTensor.name()), "Tensor name mismatch");
      long inferenceStarted = System.nanoTime();
      interpreter.run(input, output);
      inferenceMs = (System.nanoTime() - inferenceStarted) / 1e6;
    }
    ((Buffer) output).rewind();
    List<Double> vector = new ArrayList<>(1024);
    double normSquared = 0;
    for (int i = 0; i < 1024; i++) {
      double value = output.getFloat();
      check(Double.isFinite(value), "Nonfinite output");
      vector.add(value);
      normSquared += value * value;
    }
    check(Double.isFinite(normSquared) && normSquared > 0, "Invalid output norm");
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("fixtureId", id); result.put("fixtureSha256", fixtureHash); result.put("modelSha256", MODEL_HASH);
    result.put("vector", vector); result.put("inferenceMs", inferenceMs);
    result.put("totalMs", (System.nanoTime() - started) / 1e6); result.put("normSquared", normSquared);
    result.put("runtime", "FROM_APPLICATION_ONLY"); result.put("threads", 1);
    result.put("xnnpack", false); result.put("nnapi", false); result.put("gpu", false);
    return result;
  }

  private static ByteBuffer direct(byte[] bytes) {
    ByteBuffer buffer = ByteBuffer.allocateDirect(bytes.length).order(ByteOrder.LITTLE_ENDIAN);
    buffer.put(bytes); ((Buffer) buffer).rewind(); return buffer;
  }

  private static byte[] asset(Context context, String name, int expectedBytes, String expectedHash)
      throws IOException, NoSuchAlgorithmException {
    byte[] result;
    try (InputStream stream = context.getAssets().open("recognition-experiment/" + name)) {
      ByteArrayOutputStream collected = new ByteArrayOutputStream(expectedBytes);
      byte[] chunk = new byte[8192];
      int count;
      while ((count = stream.read(chunk)) != -1) {
        check(collected.size() + count <= expectedBytes, "Asset exceeds expected size");
        collected.write(chunk, 0, count);
      }
      check(collected.size() == expectedBytes, "Asset size mismatch");
      result = collected.toByteArray();
    }
    byte[] digest = MessageDigest.getInstance("SHA-256").digest(result);
    char[] encoded = new char[digest.length * 2];
    for (int i = 0; i < digest.length; i++) {
      int value = digest[i] & 0xff;
      encoded[i * 2] = HEX[value >>> 4]; encoded[i * 2 + 1] = HEX[value & 15];
    }
    check(expectedHash.equals(new String(encoded)), "Asset hash mismatch");
    return result;
  }

  private static void check(boolean condition, String message) {
    if (!condition) throw new IllegalArgumentException(message);
  }
}

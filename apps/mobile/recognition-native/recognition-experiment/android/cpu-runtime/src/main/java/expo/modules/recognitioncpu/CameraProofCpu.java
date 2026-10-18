package expo.modules.recognitioncpu;

import android.content.Context;
import java.io.*;
import java.nio.*;
import java.util.Arrays;
import org.tensorflow.lite.DataType;
import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.InterpreterApi;

/** Pinned application CPU adapter. Generated checks inject a different Model implementation. */
public final class CameraProofCpu implements CameraProofAndroid.Model {
  private final Context context;
  public CameraProofCpu(Context context){this.context=context;}
  private static ByteBuffer direct(byte[] b){ByteBuffer v=ByteBuffer.allocateDirect(b.length).order(ByteOrder.LITTLE_ENDIAN);v.put(b);((Buffer)v).rewind();return v;}
  @Override public float[] run(byte[] tensor)throws Exception{
    CameraProofFrame.require(tensor.length==CameraProofFrame.TENSOR_BYTES,"CAMERA_TENSOR_BYTES");
    FloatBuffer f=ByteBuffer.wrap(tensor).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer();while(f.hasRemaining()){float n=f.get();CameraProofFrame.require(Float.isFinite(n)&&n>=0&&n<=1,"CAMERA_TENSOR_RANGE");}
    byte[] model;
    try(InputStream in=context.getAssets().open("recognition-experiment/mobilenet_v3_small.tflite")){
      ByteArrayOutputStream out=new ByteArrayOutputStream(4117670);byte[] b=new byte[8192];int n;
      while((n=in.read(b))!=-1){CameraProofFrame.require(out.size()+(long)n<=4117670,"CAMERA_MODEL_BYTES");out.write(b,0,n);}model=out.toByteArray();
    }
    CameraProofFrame.require(model.length==4117670&&CameraProofFrame.hash(model).equals(CameraProofFrame.MODEL),"CAMERA_MODEL_HASH");
    Interpreter.Options options=new Interpreter.Options();options.setRuntime(InterpreterApi.Options.TfLiteRuntime.FROM_APPLICATION_ONLY);options.setNumThreads(1);options.setUseXNNPACK(false);
    try(Interpreter interpreter=new Interpreter(direct(model),options)){
      CameraProofFrame.require(interpreter.getInputTensorCount()==1&&interpreter.getOutputTensorCount()==1,"CAMERA_MODEL_IO");
      CameraProofFrame.require(Arrays.equals(interpreter.getInputTensor(0).shape(),new int[]{1,224,224,3})&&interpreter.getInputTensor(0).dataType()==DataType.FLOAT32,"CAMERA_MODEL_INPUT");
      CameraProofFrame.require(Arrays.equals(interpreter.getOutputTensor(0).shape(),new int[]{1,1024})&&interpreter.getOutputTensor(0).dataType()==DataType.FLOAT32,"CAMERA_MODEL_OUTPUT");
      ByteBuffer out=ByteBuffer.allocateDirect(4096).order(ByteOrder.LITTLE_ENDIAN);interpreter.run(direct(tensor),out);((Buffer)out).rewind();float[] vector=new float[1024];out.asFloatBuffer().get(vector);return vector;
    }
  }
}

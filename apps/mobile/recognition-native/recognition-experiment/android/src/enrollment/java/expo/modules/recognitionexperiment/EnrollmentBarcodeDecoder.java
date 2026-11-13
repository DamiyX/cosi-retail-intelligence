package expo.modules.recognitionexperiment;
import com.google.zxing.*;import com.google.zxing.common.HybridBinarizer;import java.util.*;import expo.modules.recognitioncpu.EnrollmentBarcodeSession;
/** Exact public synchronous Java decoder. No CameraX Image, SDK task or native handle is retained. */
public final class EnrollmentBarcodeDecoder implements EnrollmentBarcodeSession.Decoder {
 private final MultiFormatReader reader=new MultiFormatReader();
 public EnrollmentBarcodeDecoder(){Map<DecodeHintType,Object> hints=new EnumMap<>(DecodeHintType.class);hints.put(DecodeHintType.POSSIBLE_FORMATS,Arrays.asList(BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A));hints.put(DecodeHintType.TRY_HARDER,Boolean.TRUE);reader.setHints(hints);}
 public EnrollmentBarcodeSession.Hit decode(EnrollmentBarcodeSession.Pixels pixels)throws Exception{
  try{Result r=reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(new Luma(pixels.width,pixels.height,pixels.bytes))));String format=r.getBarcodeFormat()==BarcodeFormat.EAN_13?"ean13":r.getBarcodeFormat()==BarcodeFormat.EAN_8?"ean8":r.getBarcodeFormat()==BarcodeFormat.UPC_A?"upc_a":"unsupported";return new EnrollmentBarcodeSession.Hit(r.getText(),format);}catch(NotFoundException absent){return null;}
 }
 public void reset(){reader.reset();}
 private static final class Luma extends LuminanceSource {
  private final byte[] data;Luma(int w,int h,byte[] data){super(w,h);this.data=data;}
  public byte[] getRow(int y,byte[] row){if(y<0||y>=getHeight())throw new IllegalArgumentException();if(row==null||row.length<getWidth())row=new byte[getWidth()];System.arraycopy(data,y*getWidth(),row,0,getWidth());return row;}
  public byte[] getMatrix(){return data;}
  public boolean isRotateSupported(){return true;}
  public LuminanceSource rotateCounterClockwise(){int w=getWidth(),h=getHeight();byte[] out=new byte[data.length];for(int y=0;y<h;y++)for(int x=0;x<w;x++)out[(w-1-x)*h+y]=data[y*w+x];return new Luma(h,w,out);}
 }
}

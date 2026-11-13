package expo.modules.recognitioncpu;
import java.util.*;import java.io.IOException;import local.cameracomponent.FixedSlots;
/** Fixed I00/I01 retained and one I05 attempt accounting only; retained staging is charged, never accepted as saved data. */
final class RetainedI00Policy {
 static final long CAP=268435456L,RESERVATION=49L*1024*1024,OUTPUT_AND_RESERVE=24L*1024*1024;
 static int limit(String n)throws Exception{switch(n){case "cpu-intent":return 1;case "cpu-receipt":return 1024;case "tensor.f32le":return 602112;case "cpu-result":return 65536;default:return FixedSlots.limit(n);}}
 static long retained(Map<String,Long> files)throws Exception{
  if(files.size()>25||!Long.valueOf(0).equals(files.get("owner.lock")))throw new IOException("I00_INVENTORY");long total=0;
  for(Map.Entry<String,Long> e:files.entrySet()){String n=e.getKey();long size=e.getValue();if(n.equals("owner.lock"))continue;boolean stage=n.endsWith(".new");String base=stage?n.substring(0,n.length()-4):n;if(base.equals("export-attempt")||base.equals("export-result"))throw new IOException("I00_EXPORT_UNACCOUNTED");int max=limit(base);if(size<(stage?0:1)||size>max||size>CAP-total)throw new IOException("I00_SIZE");total+=size;}return total;
 }
 // Spent selected I01 output is NEVER refunded. Host stat/hash observed before build;
 // device packet must recheck exact selected file before new intent, like standalone S03.
 static final long I01_OUTPUT_BYTES=1182494L;
 static final String I01_OUTPUT_SHA="9666b632d930623d475100f8c5e7c4e04b8c12a24539557b538eecabe26e0e8f";
 static long retainedI01(Map<String,Long> files)throws IOException{
  Map<String,Long> expected=new TreeMap<>();expected.put("intent",760L);expected.put("original.jpeg",759912L);expected.put("crop.png",607154L);expected.put("geometry",1823L);expected.put("receipt",276L);expected.put("cpu-intent",1L);expected.put("tensor.f32le",602112L);expected.put("cpu-result",40080L);expected.put("cpu-receipt",214L);expected.put("owner.lock",0L);expected.put("export-attempt",1L);expected.put("export-result",17L);
  if(!expected.equals(files))throw new IOException("I01_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;
 }
 static final long I02_OUTPUT_BYTES=1518332L;
 static final String I02_OUTPUT_SHA="ec083fda8a2f09ed49012f17cf13b9b1f2886a234b6ad375247055c0c962fca7";
 static long retainedI02(Map<String,Long> files)throws IOException{
  Map<String,Long> expected=new TreeMap<>();expected.put("intent",763L);expected.put("original.jpeg",846838L);expected.put("crop.png",848973L);expected.put("geometry",1826L);expected.put("receipt",276L);expected.put("cpu-intent",1L);expected.put("tensor.f32le",602112L);expected.put("cpu-result",40441L);expected.put("cpu-receipt",214L);expected.put("owner.lock",0L);expected.put("export-attempt",1L);expected.put("export-result",17L);
  if(!expected.equals(files))throw new IOException("I02_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;
 }
 static final long I03_OUTPUT_BYTES=1464926L;
 static final String I03_OUTPUT_SHA="384f59c189f4b199a28c9b08568146dee2c49ca9122c460f441736816f815439";
 static long retainedI03(Map<String,Long> files)throws IOException{
  Map<String,Long> expected=new TreeMap<>();expected.put("intent",764L);expected.put("original.jpeg",690216L);expected.put("crop.png",959205L);expected.put("geometry",1827L);expected.put("receipt",276L);expected.put("cpu-intent",1L);expected.put("tensor.f32le",602112L);expected.put("cpu-result",39187L);expected.put("cpu-receipt",214L);expected.put("owner.lock",0L);expected.put("export-attempt",1L);expected.put("export-result",17L);
  if(!expected.equals(files))throw new IOException("I03_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;
 }
 static final long I04_OUTPUT_BYTES=1226840L;
 static final String I04_OUTPUT_SHA="f7c48b0aeb02bbecfcaa6e52b73c98c836cf0400b31fec3a9dd64e00d81623e0";
 static long retainedI04(Map<String,Long> files)throws IOException{
  Map<String,Long> expected=new TreeMap<>();expected.put("intent",765L);expected.put("original.jpeg",679415L);expected.put("crop.png",742202L);expected.put("geometry",1828L);expected.put("receipt",276L);expected.put("cpu-intent",1L);expected.put("tensor.f32le",602112L);expected.put("cpu-result",40417L);expected.put("cpu-receipt",214L);expected.put("owner.lock",0L);expected.put("export-attempt",1L);expected.put("export-result",17L);
  if(!expected.equals(files))throw new IOException("I04_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;
 }
 static final long I05_OUTPUT_BYTES=1809010L;
 static final String I05_OUTPUT_SHA="8ae4ad6559f7ed6ccb7f9ff95bf53506a8eb7906460760b39432f9f64773a9d4";
 static long retainedI05(Map<String,Long> files)throws IOException{Map<String,Long> expected=new TreeMap<>();expected.put("cpu-intent",1L);expected.put("cpu-receipt",214L);expected.put("cpu-result",39289L);expected.put("crop.png",1157598L);expected.put("export-attempt",1L);expected.put("export-result",17L);expected.put("geometry",1828L);expected.put("intent",765L);expected.put("original.jpeg",820078L);expected.put("owner.lock",0L);expected.put("receipt",276L);expected.put("tensor.f32le",602112L);if(!expected.equals(files))throw new IOException("I05_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;}
 static final long I06_OUTPUT_BYTES=2206220L;
 static final String I06_OUTPUT_SHA="b5cb2dae49f08d6449fb2a1337e625612fe2fc4454996c941ae6c8ca8ea2efde";
 static long retainedI06(Map<String,Long> files)throws IOException{Map<String,Long> expected=new TreeMap<>();expected.put("cpu-intent",1L);expected.put("cpu-receipt",214L);expected.put("cpu-result",38781L);expected.put("crop.png",1519834L);expected.put("export-attempt",1L);expected.put("export-result",17L);expected.put("geometry",1840L);expected.put("intent",790L);expected.put("original.jpeg",820285L);expected.put("owner.lock",0L);expected.put("receipt",276L);expected.put("tensor.f32le",602112L);if(!expected.equals(files))throw new IOException("I06_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;}
 static final long I07_OUTPUT_BYTES=2613920L;
 static final String I07_OUTPUT_SHA="8afbd0637eca616d6a99c4f6d44ef2ab2a35381207ec11710063b21ddd29baac";
 static long retainedI07(Map<String,Long> files)throws IOException{Map<String,Long> expected=new TreeMap<>();expected.put("cpu-intent",1L);expected.put("cpu-receipt",214L);expected.put("cpu-result",39060L);expected.put("crop.png",1788734L);expected.put("export-attempt",1L);expected.put("export-result",17L);expected.put("geometry",1839L);expected.put("intent",789L);expected.put("original.jpeg",945546L);expected.put("owner.lock",0L);expected.put("receipt",276L);expected.put("tensor.f32le",602112L);if(!expected.equals(files))throw new IOException("I07_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;}
 static final long I08_OUTPUT_BYTES=2122732L;
 static final String I08_OUTPUT_SHA="8c49c6261b60fa003b0218430b1d43112304e40c43ee49be5ebd1f4337563dbc";
 static long retainedI08(Map<String,Long> files)throws IOException{Map<String,Long> expected=new TreeMap<>();expected.put("cpu-intent",1L);expected.put("cpu-receipt",214L);expected.put("cpu-result",38711L);expected.put("crop.png",1467077L);expected.put("export-attempt",1L);expected.put("export-result",17L);expected.put("geometry",1839L);expected.put("intent",789L);expected.put("original.jpeg",795902L);expected.put("owner.lock",0L);expected.put("receipt",276L);expected.put("tensor.f32le",602112L);if(!expected.equals(files))throw new IOException("I08_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;}
 static final long I09_OUTPUT_BYTES=2581789L;
 static final String I09_OUTPUT_SHA="97dcf589bd40d19b19190c76ae944ca4266f96a5a9731a101202a991ec2fa60d";
 static long retainedI09(Map<String,Long> files)throws IOException{Map<String,Long> expected=new TreeMap<>();expected.put("cpu-intent",1L);expected.put("cpu-receipt",214L);expected.put("cpu-result",39299L);expected.put("crop.png",1770477L);expected.put("export-attempt",1L);expected.put("export-result",17L);expected.put("geometry",1839L);expected.put("intent",789L);expected.put("original.jpeg",933454L);expected.put("owner.lock",0L);expected.put("receipt",276L);expected.put("tensor.f32le",602112L);if(!expected.equals(files))throw new IOException("I09_RETAINED_SHAPE_SIZE");long n=0;for(long size:files.values())n+=size;return n;}
 static void admit(long old)throws IOException{if(old<0||old>CAP-RESERVATION)throw new IOException("I00_PLUS_I01_RESERVATION");}
 static void publish(long old,long used,long incoming)throws IOException{admit(old);if(used<0||incoming<1||used>25L*1024*1024||incoming>25L*1024*1024-used)throw new IOException("AGGREGATE_SPACE");}
}

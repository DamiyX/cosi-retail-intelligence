"""D-055: reproducible six-target test-only Expo Camera57.0.6 derivative."""
import difflib,hashlib,importlib.util,json,os,pathlib,stat
spec=importlib.util.spec_from_file_location('g3',pathlib.Path(__file__).with_name('phone-camera-proof-build.py'))
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
PREFIX='android/src/main/java/expo/modules/camera/'
PINS={
 PREFIX+'CameraViewModule.kt':'0aee230cb5709770aded06b2f3b99655857876233cc376279529bbccaae54afd',
 PREFIX+'ExpoCameraView.kt':'614172f7567dcf2e71699db61b910d4a1b8e3d9c3dfb0b0beb085f8dbb4dbd10',
 PREFIX+'utils/CameraUtils.kt':'dc3a9721f3f86c402bf354117b1eed826c1d7b453baba7ae021d7f2001d3b317',
 PREFIX+'records/CameraRecords.kt':'f4d2d46e8a84a6c51cff42fa6e64963664cdbe205a366d8c38141e1260561286',
 'android/build.gradle':'21efd4cefccede17906fffefb921bebcfb98719e56885e8b067e4241e5687241',
 'android/src/main/AndroidManifest.xml':'dace20ff54c855d7b5a640eb04dad2e97a8e1be216eb62880a0c114b6aded111',
 PREFIX+'analyzers/BarcodeAnalyzer.kt':'edc0ea00efafd5660c1ae97effed0f782f8d376cc8e29d6eb77f00ce8e04183c'}
TARGETS=set(PINS)-{PREFIX+'analyzers/BarcodeAnalyzer.kt'}
EXCLUDED=['BarcodeAnalyzer.kt','BarcodeScannerResultSerializer.kt','MLKitBarcodeAnalyzer.kt']

def once(text,before,after):
 assert text.count(before)==1,('Changed/ambiguous anchor',before[:100])
 return text.replace(before,after)

def span(text,start,end,replacement):
 assert text.count(start)==1 and text.count(end)==1,('Changed/ambiguous span',start,end)
 a=text.index(start);b=text.index(end,a);assert b>a
 return text[:a]+replacement+text[b:]

def derive(base):
 for name,pin in PINS.items():assert hashlib.sha256(base[name]).hexdigest()==pin,('Changed upstream bytes',name)
 output={};text=base[PREFIX+'CameraViewModule.kt'].decode('utf-8')
 for line in ['import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions\n','import com.google.mlkit.vision.codescanner.GmsBarcodeScanning\n','import expo.modules.camera.analyzers.BarCodeScannerResultSerializer\n','import expo.modules.camera.analyzers.MLKitBarCodeScanner\n','import expo.modules.interfaces.imageloader.ImageLoaderInterface\n']:
  text=once(text,line,'')
 text=once(text,'!VRUtilities.isQuest() && CameraUtils.isMLKitAvailable(appContext.reactContext)','false')
 text=span(text,'    AsyncFunction("scanFromURLAsync")','    AsyncFunction("launchScanner")','    AsyncFunction("scanFromURLAsync") { url: String, barcodeTypes: List<BarcodeType>, promise: Promise ->\n      promise.reject(CameraExceptions.MLKitUnavailableException())\n    }\n\n')
 text=span(text,'    AsyncFunction("launchScanner")','    AsyncFunction("dismissScanner")','    AsyncFunction("launchScanner") { settings: BarcodeSettings, promise: Promise ->\n      promise.reject(CameraExceptions.MLKitUnavailableException())\n    }\n\n')
 output[PREFIX+'CameraViewModule.kt']=text.encode()
 text=base[PREFIX+'ExpoCameraView.kt'].decode('utf-8')
 for name in ['analyzers.BarcodeAnalyzer','analyzers.toByteArray','common.BarcodeScannedEvent','records.BarcodeType','utils.BarCodeScannerResult','utils.BarCodeScannerResult.BoundingBox','utils.CameraUtils','utils.mapX','utils.mapY']:
  text=once(text,'import expo.modules.camera.'+name+'\n','')
 text=once(text,'import kotlin.math.roundToInt\n','')
 text=once(text,'  private var barcodeFormats: List<BarcodeType> = emptyList()\n','')
 text=span(text,'  private val onBarcodeScanned by EventDispatcher<BarcodeScannedEvent>','  private val onPictureSaved','')
 text=span(text,'      .also { analyzer ->','  private fun buildResolutionSelector(): ResolutionSelector {','\n')
 text=once(text,'    this.shouldScanBarcodes = shouldScanBarcodes','    this.shouldScanBarcodes = false')
 text=span(text,'  fun setBarcodeScannerSettings(settings: BarcodeSettings?) {','  override fun setPreviewTexture','  fun setBarcodeScannerSettings(settings: BarcodeSettings?) {\n    // Test-only camera derivative: scanner settings cannot activate scanning.\n  }\n\n')
 helper=base[PREFIX+'analyzers/BarcodeAnalyzer.kt'].decode('utf-8').split('fun Array<ImageProxy.PlaneProxy>.toByteArray(): ByteArray {')
 assert len(helper)==2
 helper='fun Array<ImageProxy.PlaneProxy>.toByteArray(): ByteArray {'+helper[1]
 text+='\n// Unchanged still-photo byte-copy helper relocated from the excluded analyzer.\n'+helper
 output[PREFIX+'ExpoCameraView.kt']=text.encode()
 output[PREFIX+'utils/CameraUtils.kt']=b'''package expo.modules.camera.utils

import android.content.Context

// Test-only camera derivative: no scanner reflection or Play Store probe.
object CameraUtils {
  fun hasGooglePlayServices(context: Context?): Boolean = false
  fun isMLKitBarcodeScannerAvailable(): Boolean = false
  fun isMLKitAvailable(context: Context?): Boolean = false
}
'''
 text=base[PREFIX+'records/CameraRecords.kt'].decode('utf-8')
 text=once(text,'import com.google.mlkit.vision.barcode.common.Barcode\n','')
 start='  fun mapToBarcode() = when (this) {';assert text.count(start)==1
 text=text[:text.index(start)]+'}\n'
 output[PREFIX+'records/CameraRecords.kt']=text.encode()
 text=base['android/build.gradle'].decode('utf-8')
 text=once(text,'def barcodeScannerEnabled = findProperty(\'expo.camera.barcode-scanner-enabled\')\ndef isBarcodeScannerEnabled = (barcodeScannerEnabled ?: "true").toString() != "false"\n','')
 text=once(text,'  def barcodeDependencyConfiguration = isBarcodeScannerEnabled ? "implementation" : "compileOnly"\n  add(barcodeDependencyConfiguration, "com.google.android.gms:play-services-code-scanner:16.1.0")\n  add(barcodeDependencyConfiguration, "com.google.mlkit:barcode-scanning:17.3.0")\n  add(barcodeDependencyConfiguration, "androidx.camera:camera-mlkit-vision:${camerax_version}")\n','')
 text+='\n// D-055: exclude scanner implementation from the copied package only.\ntasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {\n  exclude(\n'+',\n'.join('    \"**/analyzers/'+name+'\"' for name in EXCLUDED)+'\n  )\n}\n'
 output['android/build.gradle']=text.encode()
 text=base['android/src/main/AndroidManifest.xml'].decode('utf-8')
 text=once(text,'    <meta-data\n      android:name="com.google.mlkit.vision.DEPENDENCIES"\n      android:value="barcode_ui"/>\n','')
 output['android/src/main/AndroidManifest.xml']=text.encode()
 assert set(output)==TARGETS and all(output[p]!=base[p] for p in TARGETS)
 return output,helper

def create():
 g.verify();assert g.STAGE.is_dir() and (g.WRITER/'staged-input-index.json').is_file()
 source=g.ROOT/'node_modules/expo-camera';dest=g.STAGE/'camera-packages/expo-camera'
 if dest.exists():
  recovery=g.read(g.WRITER/'derivative-copy-a1-refusal.json');assert recovery['allCopiedFilesStillBaseExact']
  for row in recovery['files']:assert g.sha(dest/row['path'])==row['sha256']==g.sha(source/row['path'])
 else:dest.mkdir(parents=True)
 rows=[];js=[]
 for current,dirs,names in os.walk(g.ext(source),followlinks=False):
  parent=pathlib.Path(str(current).removeprefix('\\\\?\\'))
  dirs[:]=[name for name in dirs if name not in ['build','.gradle','.cxx','.kotlin','local-maven-repo','node_modules']]
  for name in dirs+names:assert not os.lstat(g.ext(parent/name)).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT
  for name in names:
   p=parent/name;rel=p.relative_to(source).as_posix();target=dest/rel;g.ext(target.parent).mkdir(parents=True,exist_ok=True)
   if not target.exists():
    with g.ext(target).open('xb') as f:f.write(g.ext(p).read_bytes())
   assert g.sha(p)==g.sha(target)
   rows.append(dict(path=rel,bytes=g.ext(p).stat().st_size,baseSha256=g.sha(p)))
 for p in (source/'build').rglob('*'):
  if p.is_file():js.append(dict(path=p.relative_to(source).as_posix(),bytes=p.stat().st_size,sha256=g.sha(p)))
 base={p:g.ext(source/p).read_bytes() for p in PINS};patched,helper=derive(base);diffs=[]
 baseCopies=g.WRITER/'camera-base-six';baseCopies.mkdir()
 for n,(rel,data) in enumerate(sorted(patched.items())):
  old=base[rel]
  with (baseCopies/(str(n)+'-'+pathlib.Path(rel).name)).open('xb') as f:f.write(old)
  g.ext(dest/rel).write_bytes(data)
  diffs.extend(difflib.unified_diff(old.decode().splitlines(),data.decode().splitlines(),fromfile='base/'+rel,tofile='derivative/'+rel,lineterm=''))
 for row in rows:row['derivativeSha256']=g.sha(dest/row['path']);row['changed']=row['derivativeSha256']!=row['baseSha256']
 assert {row['path'] for row in rows if row['changed']}==TARGETS
 assert json.loads((dest/'package.json').read_bytes())==json.loads((source/'package.json').read_bytes())
 assert (dest/'LICENSE').read_bytes()==(source/'LICENSE').read_bytes()
 with (g.WRITER/'camera-derivative.diff').open('x',encoding='utf-8') as f:f.write('\n'.join(diffs)+'\n')
 canonical=lambda field:hashlib.sha256(('\n'.join(row['path']+'\0'+row[field] for row in sorted(rows,key=lambda row:row['path']))+'\n').encode()).hexdigest()
 g.put(g.WRITER/'camera-derivative-index.json',dict(createdUtc=g.now(),base=str(source),derivative=str(dest),packageVersion='57.0.6',files=sorted(rows,key=lambda row:row['path']),baseFingerprint=canonical('baseSha256'),derivativeFingerprint=canonical('derivativeSha256'),changedTargets=sorted(TARGETS),excludedKotlinPaths=[PREFIX+'analyzers/'+n for n in EXCLUDED],excludedFilesPreservedByteExact=True,installedDistributedJsBaseInputs=js,jsResolvedFromInstalledPackage=True,jsBaseInputsNotModified=True,pureStillPhotoHelper=dict(baseFile=PREFIX+'analyzers/BarcodeAnalyzer.kt',relocatedTo=PREFIX+'ExpoCameraView.kt',bodyByteExact=True,sha256=hashlib.sha256(helper.encode()).hexdigest()),licence=dict(path='LICENSE',sha256=g.sha(dest/'LICENSE'),copyrightPreserved=True),networkUsed=False))
 print(json.dumps(dict(sourceFiles=len(rows),changedTargets=len(TARGETS),excludedFiles=len(EXCLUDED),installedJsInputs=len(js),derivativeFingerprint=canonical('derivativeSha256'))))

if __name__=='__main__':create()

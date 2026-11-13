package expo.modules.recognitioncpu;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.BooleanSupplier;
import java.util.zip.*;
import java.nio.charset.StandardCharsets;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
/** Fixed run streaming export. Only one group is loaded; no private staged ZIP. */
public final class CameraMatrixEvidence implements CameraMatrixRecoveryEngine.Archive {
  public interface Profiles {Map<String,byte[]> load(Case c)throws Exception;}
  private static final class Entry {
    final String name,hash,role;final Case group;final int size;final long crc;final byte[] small;
    Entry(String n,Case c,String r,byte[] bytes){require(n.matches("[A-Za-z0-9._/-]{1,96}")&&!n.contains(".."),"ENTRY_NAME");name=n;group=c;role=r;size=bytes.length;hash=CameraProofFrame.hash(bytes);CRC32 crc32=new CRC32();crc32.update(bytes);crc=crc32.getValue();small=c==null?bytes:null;}
  }
  private final List<Entry> entries=new ArrayList<>();private final CameraMatrixStore store;private final Profiles profiles;
  private final String source,apk;
  public CameraMatrixEvidence(CameraMatrixStore store,Profiles profiles,String source,String apk)throws Exception{this(store,profiles,source,apk,null);}
  CameraMatrixEvidence(CameraMatrixStore store,Profiles profiles,String source,String apk,Map<String,Object> recovery)throws Exception{
    this.store=store;this.profiles=profiles;this.source=hash(source);this.apk=hash(apk);
    require(store.has("seal"),"EXPORT_UNSEALED");List<Object> manifest=new ArrayList<>();
    for(Case c:CASES)if(store.has(c.id+".terminal")){
      Map<String,byte[]> group=profiles.load(c);validate(c,group);
      for(Map.Entry<String,byte[]> e:new TreeMap<>(group).entrySet())add(new Entry(c.id+"/"+e.getKey(),c,e.getKey(),e.getValue()));
    }
    for(String name:store.evidenceNames())add(new Entry("run/"+name,null,null,store.raw(name)));
    add(new Entry("run.json",null,null,bytes(json(map("run",RUN,"source",source,"apk",apk,"model",CameraProofFrame.MODEL,"recipe",CameraProofFrame.RECIPE,"geometryStatus","INCONCLUSIVE","physicalDrainProven",false,"sdkHardCap",false)))));
    if(recovery!=null){byte[] provenance=bytes(json(recovery));require(provenance.length<=2048,"RECOVERY_ENTRY_CAP");add(new Entry("recovery.json",null,null,provenance));}
    for(Entry e:entries)manifest.add(map("name",e.name,"bytes",e.size,"sha256",e.hash));byte[] m=bytes(json(map("run",RUN,"entries",manifest,"originalExifPreserved",true,"cameraProofAccepted",false)));require(m.length<=65536,"MANIFEST_CAP");add(new Entry("manifest.json",null,null,m));
    long payload=0;for(Entry e:entries)payload=Math.addExact(payload,e.size);require(entries.size()<=128&&payload+entries.size()*1024L+22<=OUTPUT,"ZIP_CAP");
  }
  private void add(Entry e){require(entries.stream().noneMatch(x->x.name.equals(e.name)),"ENTRY_DUPLICATE");entries.add(e);}
  private void validate(Case c,Map<String,byte[]> p)throws Exception{
    require(CameraMatrixStore.profileHash(p).equals(store.read(c.id+".terminal").get("nativeProfileSha256")),"PROFILE_CHANGED");

    if(p.isEmpty())require(!Boolean.TRUE.equals(store.read(c.id+".terminal").get("advance")),"EMPTY_PROFILE");
    validateNative(c,p,source,apk,store.read(c.id+".intent"));
  }
  static void validateNative(Case c,Map<String,byte[]> p,String source,String apk,Map<String,Object> intent)throws Exception{
    if(p.isEmpty())return;
    require(p.size()<=11,"PROFILE_COUNT");for(Map.Entry<String,byte[]> e:p.entrySet()){String role=e.getKey();int cap=role.equals("raw.jpg")?JPEG:role.equals("preview.png")?CameraProofStore.PREVIEW:role.equals("numerical.json")||role.equals("receipt.json")?CameraProofStore.RECEIPT:4096;require(Arrays.asList("raw.jpg","preview.png","numerical.json","receipt.json","failure.json","interruption.json","reservation","done","invalidated","request.json","resolution").contains(role)&&e.getValue().length>0&&e.getValue().length<=cap,"ROLE_CAP");}
    require(p.containsKey("reservation")&&p.containsKey("done")&&p.containsKey("resolution"),"PROFILE_UNRESOLVED");
    if(p.containsKey("request.json")){Map<String,Object> req=parse(p.get("request.json"),4096);require(c.id.equals(req.get("matrixCase"))&&c.target.equals(req.get("matrixTarget"))&&source.equals(req.get("matrixSource"))&&apk.equals(req.get("matrixApk"))&&intent.get("requestSha256").equals(req.get("matrixRequestSha256"))&&intent.get("nonce").equals(req.get("matrixNonce")),"REQUEST_BINDING");}
    if(p.containsKey("raw.jpg")){
      CameraProofFrame.Header h=CameraProofFrame.header(p.get("raw.jpg"));require(h.width*(long)h.height<=4000000,"HEADER_PIXELS");
      if(p.containsKey("numerical.json")){
        Map<String,Object> n=parse(p.get("numerical.json"),65536);require(CameraProofFrame.hash(p.get("raw.jpg")).equals(n.get("jpegSha256"))&&source.equals(n.get("matrixSource"))&&c.id.equals(n.get("matrixCase"))&&c.job.equals(n.get("jobId"))&&CameraProofFrame.MODEL.equals(n.get("modelSha256"))&&CameraProofFrame.RECIPE.equals(n.get("recipe"))&&"INCONCLUSIVE".equals(n.get("geometryStatus"))&&Boolean.FALSE.equals(n.get("cameraProofAccepted")),"NUMERICAL_BINDING");
        require(number(n.get("width"),1,4000000)==h.width&&number(n.get("height"),1,4000000)==h.height&&number(n.get("orientation"),1,8)==h.orientation&&number(n.get("jpegBytes"),1,JPEG)==p.get("raw.jpg").length,"NUMERICAL_HEADER");
        require(p.containsKey("preview.png")&&CameraProofFrame.hash(p.get("preview.png")).equals(n.get("previewSha256"))&&p.containsKey("receipt.json")&&Arrays.equals(p.get("receipt.json"),p.get("numerical.json")),"RECEIPT_IDENTITY");
      }
    }
  }
  public Map<String,Object> write(CameraEvidenceExport.Destination target,BooleanSupplier cancelled)throws Exception{
    require(target.size()==0&&!cancelled.getAsBoolean(),"DESTINATION_NONEMPTY_OR_CANCELLED");target.rewind();MessageDigest digest=MessageDigest.getInstance("SHA-256");final long[] written={0};final boolean[] poisoned={false};
    OutputStream bounded=new OutputStream(){public void write(int b)throws IOException{write(new byte[]{(byte)b},0,1);}public void write(byte[] b,int at,int n)throws IOException{
      require(!poisoned[0],"WRITE_POISONED");poisoned[0]=true;try{require(!cancelled.getAsBoolean()&&n>=0&&written[0]+n<=OUTPUT,"WRITE_BOUND");int count=target.write(b,at,n);require(count>=0&&count<=n,"WRITE_COUNT");written[0]+=count;require(count==n,"SHORT_WRITE");digest.update(b,at,n);poisoned[0]=false;}catch(Exception e){throw new IOException("CAMERA_MATRIX_WRITE",e);}
    }};
    BufferedOutputStream buffer=new BufferedOutputStream(bounded,8192);
    serialize(buffer,cancelled);buffer.flush(); // never flush a failed serializer as a cleanup side effect
    require(!cancelled.getAsBoolean()&&target.size()==written[0],"OUTPUT_SIZE");target.sync();target.rewind();MessageDigest read=MessageDigest.getInstance("SHA-256");byte[] b=new byte[8192];long total=0;int n;while((n=target.read(b))!=-1){require(n>0&&n<=b.length&&!cancelled.getAsBoolean()&&total+n<=written[0],"READBACK_BOUND");read.update(b,0,n);total+=n;}byte[] h=digest.digest();require(total==written[0]&&target.size()==total&&Arrays.equals(h,read.digest())&&!cancelled.getAsBoolean(),"READBACK_HASH");StringBuilder hex=new StringBuilder();for(byte v:h)hex.append(String.format(Locale.ROOT,"%02x",v&255));return map("kind","CAMERA_MATRIX_EXPORT","run",RUN,"status","READBACK_VERIFIED","bundleBytes",total,"bundleSha256",hex.toString(),"outputEntries",entries.size(),"source",source,"apk",apk,"providerDirectoryDurabilityProven",false,"powerLossDurabilityProven",false);
  }

  /** Identical serializer for counting, actual output and restart reconciliation; fixed DOS metadata. */
  public void serialize(OutputStream out,BooleanSupplier cancelled)throws Exception{
    final long[] count={0};class Binary {
      void raw(byte[] b,int at,int n)throws Exception{require(!cancelled.getAsBoolean()&&count[0]+n<=OUTPUT,"SERIALIZER_BOUND");out.write(b,at,n);count[0]+=n;}
      void u16(long n)throws Exception{byte[] b={(byte)n,(byte)(n>>>8)};raw(b,0,2);}
      void u32(long n)throws Exception{byte[] b={(byte)n,(byte)(n>>>8),(byte)(n>>>16),(byte)(n>>>24)};raw(b,0,4);}
    }Binary b=new Binary();List<Long> offsets=new ArrayList<>();Map<String,byte[]> current=null;Case loaded=null;
    for(Entry e:entries){byte[] value=e.small;if(e.group!=null){if(loaded!=e.group){current=profiles.load(e.group);validate(e.group,current);loaded=e.group;}value=current.get(e.role);}require(value!=null&&value.length==e.size&&CameraProofFrame.hash(value).equals(e.hash),"ENTRY_CHANGED");byte[] name=e.name.getBytes(StandardCharsets.UTF_8);offsets.add(count[0]);
      b.u32(0x04034b50L);b.u16(20);b.u16(2048);b.u16(0);b.u16(0);b.u16(34);b.u32(e.crc);b.u32(e.size);b.u32(e.size);b.u16(name.length);b.u16(0);b.raw(name,0,name.length);for(int at=0;at<value.length;at+=8192)b.raw(value,at,Math.min(8192,value.length-at));
    }
    long central=count[0];for(int i=0;i<entries.size();i++){Entry e=entries.get(i);byte[] name=e.name.getBytes(StandardCharsets.UTF_8);b.u32(0x02014b50L);b.u16(20);b.u16(20);b.u16(2048);b.u16(0);b.u16(0);b.u16(34);b.u32(e.crc);b.u32(e.size);b.u32(e.size);b.u16(name.length);b.u16(0);b.u16(0);b.u16(0);b.u16(0);b.u32(0);b.u32(offsets.get(i));b.raw(name,0,name.length);}
    long centralSize=count[0]-central;b.u32(0x06054b50L);b.u16(0);b.u16(0);b.u16(entries.size());b.u16(entries.size());b.u32(centralSize);b.u32(central);b.u16(0);
  }
  static CameraMatrixEvidence recoveryFixture(String source,String apk)throws Exception{return new CameraMatrixEvidence(source,apk);}
  static CameraMatrixEvidence orientationFixture(String source,String apk,Map<String,byte[]> extra)throws Exception{return new CameraMatrixEvidence(source,apk,extra);}
  private CameraMatrixEvidence(String source,String apk)throws Exception{this(source,apk,null);}
  private CameraMatrixEvidence(String source,String apk,Map<String,byte[]> extra)throws Exception{
    this.store=null;this.profiles=null;this.source=hash(source);this.apk=hash(apk);byte[] body=bytes(json(map("kind","P203_GENERATED_RECOVERY_FIXTURE","source",source,"apk",apk,"originalPhotos",0,"modelCalls",0,"serializer",CameraMatrixRecoveryPlan.SERIALIZER)));add(new Entry("fixture.json",null,null,body));if(extra!=null)for(Map.Entry<String,byte[]> e:extra.entrySet())add(new Entry(e.getKey(),null,null,e.getValue()));List<Object> rows=new ArrayList<>();for(Entry e:entries)rows.add(map("name",e.name,"bytes",e.size,"sha256",e.hash));byte[] manifest=bytes(json(map("kind",extra==null?"GENERATED_ONLY":"GENERATED_ORIENTATION_METADATA_ONLY","entries",rows)));add(new Entry("manifest.json",null,null,manifest));
  }
}

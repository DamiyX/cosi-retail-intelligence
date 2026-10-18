package expo.modules.recognitioncpu;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.CRC32;

/** Fixed STORED ZIP protocol, streamed with central/local agreement and CRC/hash checks. */
public final class PhonePortabilityZip {
  public static final long MAX_PACKET=128L*1024*1024;
  public static final class Entry {public final String name;public final long offset,size,crc;Entry(String n,long o,long s,long c){name=n;offset=o;size=s;crc=c;}}
  private final File file;public final Map<String,Entry> entries=new LinkedHashMap<>();
  private static void check(boolean v,String reason){PhonePortabilityJson.require(v,reason);}
  private static int u16(RandomAccessFile r)throws IOException{return r.readUnsignedByte()|(r.readUnsignedByte()<<8);}
  private static long u32(RandomAccessFile r)throws IOException{return (long)u16(r)|(long)u16(r)<<16;}
  public PhonePortabilityZip(File file,List<String> orderedNames,long cap)throws Exception {
    this.file=file;check(file.isFile()&&file.length()>22&&file.length()<=cap,"ZIP_PACKET_SIZE");
    try(RandomAccessFile r=new RandomAccessFile(file,"r")) {
      long end=r.length()-22;r.seek(end);check(u32(r)==0x06054b50L,"ZIP_EOCD");
      check(u16(r)==0&&u16(r)==0,"ZIP_MULTIDISK");int count=u16(r);check(u16(r)==count&&count==orderedNames.size(),"ZIP_COUNT");long cdSize=u32(r),cdStart=u32(r);check(u16(r)==0&&cdStart+cdSize==end&&cdSize<=2*1024*1024,"ZIP_DIRECTORY");
      r.seek(cdStart);long nextLocal=0,total=0;
      for(int i=0;i<count;i++) {
        check(u32(r)==0x02014b50L,"ZIP_CENTRAL");u16(r);u16(r);int flags=u16(r),method=u16(r);u16(r);u16(r);long crc=u32(r),compressed=u32(r),size=u32(r);int nameLen=u16(r),extra=u16(r),comment=u16(r);int disk=u16(r);u16(r);u32(r);long local=u32(r);
        check((flags&~2048)==0&&method==0&&compressed==size&&disk==0&&extra==0&&comment==0&&nameLen>0&&nameLen<=160&&local==nextLocal,"ZIP_FLAGS_TYPE_ORDER");
        byte[] raw=new byte[nameLen];r.readFully(raw);String name=new String(raw,StandardCharsets.UTF_8);check(name.equals(orderedNames.get(i))&&!entries.containsKey(name)&&!name.contains("..")&&!name.startsWith("/")&&!name.contains("\\"),"ZIP_NAME_OR_DUPLICATE");long centralNext=r.getFilePointer();
        r.seek(local);check(u32(r)==0x04034b50L,"ZIP_LOCAL");u16(r);check(u16(r)==flags&&u16(r)==method,"ZIP_LOCAL_FLAGS");u16(r);u16(r);check(u32(r)==crc&&u32(r)==compressed&&u32(r)==size,"ZIP_LOCAL_SIZE_CRC");check(u16(r)==nameLen&&u16(r)==0,"ZIP_LOCAL_NAME");byte[] ln=new byte[nameLen];r.readFully(ln);check(Arrays.equals(ln,raw),"ZIP_LOCAL_NAME");long data=r.getFilePointer();check(data+size<=cdStart,"ZIP_OVERLAP");
        nextLocal=data+size;total+=size;check(total<=cap,"ZIP_EXPANSION");entries.put(name,new Entry(name,data,size,crc));r.seek(centralNext);
      }
      check(r.getFilePointer()==cdStart+cdSize&&nextLocal==cdStart,"ZIP_TRAILING_OR_GAPS");
    }
  }
  public byte[] read(String name,int cap,String hash)throws Exception {
    Entry e=entries.get(name);check(e!=null&&e.size<=cap,"ZIP_ENTRY_BOUND");ByteArrayOutputStream out=new ByteArrayOutputStream((int)e.size);transfer(e,out,hash);return out.toByteArray();
  }
  public void verify(String name,int size,String hash)throws Exception {Entry e=entries.get(name);check(e!=null&&e.size==size,"ZIP_EXACT_SIZE");transfer(e,new OutputStream(){public void write(int b){}public void write(byte[] b,int o,int n){}},hash);}
  private void transfer(Entry e,OutputStream out,String hash)throws Exception {
    MessageDigest digest=MessageDigest.getInstance("SHA-256");CRC32 crc=new CRC32();
    try(RandomAccessFile r=new RandomAccessFile(file,"r")){r.seek(e.offset);long remaining=e.size;byte[] b=new byte[8192];while(remaining>0){int n=r.read(b,0,(int)Math.min(b.length,remaining));check(n>0,"ZIP_TRUNCATED");digest.update(b,0,n);crc.update(b,0,n);out.write(b,0,n);remaining-=n;}}
    check(crc.getValue()==e.crc,"ZIP_CRC");StringBuilder s=new StringBuilder();for(byte b:digest.digest())s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));check(s.toString().equals(hash),"ZIP_SHA256");
  }
}

package expo.modules.recognitioncpu;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
public final class EnrollmentTransferPolicy {
 private EnrollmentTransferPolicy(){}
 public static String filename(String session,int n){ObservedEnrollment.require(session!=null&&session.matches("[a-zA-Z0-9][a-zA-Z0-9-]{0,63}")&&n>=1&&n<=8,"TRANSFER_SESSION_OR_SLOT");return "p204-evidence-"+session+"-R0"+n+".bin";}
 public static boolean local(String raw,String session,int n){try{if(raw==null||raw.length()>4096)return false;URI u=new URI(raw);String path=u.getRawPath();return "content".equals(u.getScheme())&&"com.android.externalstorage.documents".equals(u.getRawAuthority())&&u.getRawQuery()==null&&u.getRawFragment()==null&&path!=null&&path.startsWith("/document/")&&!path.substring(10).contains("/")&&URLDecoder.decode(path.substring(10),StandardCharsets.UTF_8.name()).equals("primary:Download/"+filename(session,n));}catch(Exception e){return false;}}
}

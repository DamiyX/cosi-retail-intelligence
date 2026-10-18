package expo.modules.recognitioncpu;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.util.*;

/** Strict bounded JSON; duplicate decoded keys and nonstandard numeric forms fail. */
public final class PhonePortabilityJson {
  private final String text;private int at,nodes;
  private PhonePortabilityJson(String s){text=s;}
  public static Object parse(byte[] bytes)throws Exception {
    require(bytes.length>0&&bytes.length<=2*1024*1024,"JSON_BOUND");
    String s=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
    PhonePortabilityJson p=new PhonePortabilityJson(s);Object value=p.value(0);p.ws();require(p.at==s.length(),"JSON_TRAILING");return value;
  }
  public static void require(boolean ok,String reason){if(!ok)throw new IllegalArgumentException("PORTABILITY_"+reason);}
  private void ws(){while(at<text.length()&&" \t\r\n".indexOf(text.charAt(at))>=0)at++;}
  private char take(){require(at<text.length(),"JSON_EOF");return text.charAt(at++);}
  private Object value(int depth) {
    require(depth<=32&&++nodes<=150000,"JSON_COMPLEXITY");ws();require(at<text.length(),"JSON_EOF");char c=text.charAt(at);
    if(c=='"')return string();
    if(c=='{'){
      at++;Map<String,Object> m=new LinkedHashMap<>();ws();if(at<text.length()&&text.charAt(at)=='}'){at++;return m;}
      while(true){ws();require(at<text.length()&&text.charAt(at)=='"',"JSON_KEY");String key=string();require(!m.containsKey(key),"JSON_DUPLICATE_KEY");ws();require(take()==':',"JSON_COLON");m.put(key,value(depth+1));ws();char end=take();if(end=='}')return m;require(end==',',"JSON_OBJECT");}
    }
    if(c=='['){at++;List<Object> a=new ArrayList<>();ws();if(at<text.length()&&text.charAt(at)==']'){at++;return a;}while(true){a.add(value(depth+1));ws();char end=take();if(end==']')return a;require(end==',',"JSON_ARRAY");}}
    for(String literal:new String[]{"true","false","null"})if(text.startsWith(literal,at)){at+=literal.length();return literal.equals("null")?null:literal.equals("true");}
    int start=at;while(at<text.length()&&"-+0123456789.eE".indexOf(text.charAt(at))>=0)at++;String n=text.substring(start,at);
    require(n.length()<=64&&n.matches("-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?"),"JSON_NUMBER");
    if(!n.contains(".")&&!n.contains("e")&&!n.contains("E")){try{return Long.valueOf(n);}catch(NumberFormatException e){throw new IllegalArgumentException("PORTABILITY_JSON_INTEGER",e);}}
    double d=Double.parseDouble(n);require(Double.isFinite(d),"JSON_NONFINITE");return d;
  }
  private String string() {
    require(take()=='"',"JSON_STRING");StringBuilder b=new StringBuilder();
    while(true){char c=take();if(c=='"')return b.toString();require(c>=32,"JSON_CONTROL");if(c!='\\'){b.append(c);continue;}char e=take();switch(e){case '"':case '\\':case '/':b.append(e);break;case 'b':b.append('\b');break;case 'f':b.append('\f');break;case 'n':b.append('\n');break;case 'r':b.append('\r');break;case 't':b.append('\t');break;case 'u':require(at+4<=text.length(),"JSON_UNICODE");String hex=text.substring(at,at+4);require(hex.matches("[a-fA-F0-9]{4}"),"JSON_UNICODE");b.append((char)Integer.parseInt(hex,16));at+=4;break;default:throw new IllegalArgumentException("PORTABILITY_JSON_ESCAPE");}}
  }
  @SuppressWarnings("unchecked") public static Map<String,Object> object(Object value){require(value instanceof Map,"OBJECT");return (Map<String,Object>)value;}
  @SuppressWarnings("unchecked") public static List<Object> array(Object value){require(value instanceof List,"ARRAY");return (List<Object>)value;}
  public static String string(Object value){require(value instanceof String,"STRING");return (String)value;}
  public static int integer(Object value,int max){require(value instanceof Long&&(Long)value>=0&&(Long)value<=max,"INTEGER");return ((Long)value).intValue();}
}

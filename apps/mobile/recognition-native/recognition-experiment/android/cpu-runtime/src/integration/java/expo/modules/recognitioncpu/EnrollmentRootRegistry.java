package expo.modules.recognitioncpu;
import java.util.*;
import java.nio.charset.StandardCharsets;

/** Exact compiled top-level ownership classification; never infers ownership from a prefix. */
public final class EnrollmentRootRegistry {
 public static final long HISTORICAL_CLAIM=253602084L,STANDALONE_CLAIM=67108864L;
 public static final String CONTROL="observed-enrollment-evidence-v1";
 public static final class Root {public final int id,category;public final String name;public final boolean required;Root(int id,String name,int category,boolean required){this.id=id;this.name=name;this.category=category;this.required=required;}}
 private static final Map<String,Root> ROOTS=new LinkedHashMap<>();
 private static void add(int id,String name,int category,boolean required){ObservedEnrollment.require(ROOTS.put(name,new Root(id,name,category,required))==null,"ROOT_REGISTRY_DUPLICATE");}
 static {
  add(1,"camera-capture-diagnostic-20261029-a1",1,false);
  add(2,"camera-capture-diagnostic-setup-20261029-b1-e01",1,false);
  add(3,"camera-capture-diagnostic-setup-20261029-b1-e02",1,false);
  add(4,"camera-capture-diagnostic-setup-20261029-b1-e03",1,false);
  add(5,"camera-evidence-export-c9-v1",1,false);
  add(6,"camera-evidence-export-v1",1,false);
  add(7,"camera-geometry-c8-v1",1,false);
  add(8,"camera-m00-repeat-export-final-disabled-20261029-a1",1,false);
  add(9,"camera-m00-repeat-export-final-disabled-20261029-c1",1,false);
  add(10,"camera-m00-repeat-export-first-20261029-a1",1,false);
  add(11,"camera-m00-repeat-export-first-20261029-c1",1,false);
  add(12,"camera-m00-repeat-export-fixture-20261029-a1",1,false);
  add(13,"camera-m00-repeat-export-fixture-20261029-c1",1,false);
  add(14,"camera-matrix-20261023-c1-r1-v1",1,false);
  add(15,"camera-matrix-20261023-c1-r2-v1",1,false);
  add(16,"camera-matrix-recovery-20261024-v1",1,false);
  add(17,"camera-matrix-recovery-fixture-20261024-v1",1,false);
  add(18,"camera-orientation-20261024-v2",1,false);
  add(19,"camera-orientation-20261025-ui-v2",1,false);
  add(20,"camera-orientation-20261026-evidence-v2",1,false);
  add(21,"camera-orientation-20261027-preview-v3",1,false);
  add(22,"camera-orientation-20261027-readiness-v2",1,false);
  add(23,"camera-orientation-20261028-preview-v4",1,false);
  add(24,"camera-orientation-export-final-20261024-v2",1,false);
  add(25,"camera-orientation-export-final-20261025-ui-v2",1,false);
  add(26,"camera-orientation-export-final-20261026-evidence-v2",1,false);
  add(27,"camera-orientation-export-final-20261027-preview-v3",1,false);
  add(28,"camera-orientation-export-final-20261027-readiness-v2",1,false);
  add(29,"camera-orientation-export-final-20261028-preview-v4",1,false);
  add(30,"camera-orientation-export-first-20261024-v2",1,false);
  add(31,"camera-orientation-export-first-20261025-ui-v2",1,false);
  add(32,"camera-orientation-export-first-20261026-evidence-v2",1,false);
  add(33,"camera-orientation-export-first-20261027-preview-v3",1,false);
  add(34,"camera-orientation-export-first-20261027-readiness-v2",1,false);
  add(35,"camera-orientation-export-first-20261028-preview-v4",1,false);
  add(36,"camera-orientation-export-fixture-20261024-v2",1,false);
  add(37,"camera-orientation-export-fixture-20261025-ui-v2",1,false);
  add(38,"camera-orientation-export-fixture-20261026-evidence-v2",1,false);
  add(39,"camera-orientation-export-fixture-20261027-preview-v3",1,false);
  add(40,"camera-orientation-export-fixture-20261027-readiness-v2",1,false);
  add(41,"camera-orientation-export-fixture-20261028-preview-v4",1,false);
  add(42,"camera-orientation-m00-repeat-20261029-a1",1,false);
  add(43,"camera-orientation-m00-repeat-20261029-c1",1,false);
  add(44,"camera-proof-m00-repeat-20261029-a1",1,false);
  add(45,"camera-proof-m00-repeat-20261029-c1",1,false);
  add(46,"camera-proof-orientation-evidence-v2",1,false);
  add(47,"camera-proof-orientation-preview-v3",1,false);
  add(48,"camera-proof-orientation-preview-v4",1,false);
  add(49,"camera-proof-orientation-readiness-v2",1,false);
  add(50,"camera-proof-orientation-ui-v2",1,false);
  add(51,"camera-proof-orientation-v2",1,false);
  add(52,"camera-proof-v1",1,false);
  add(53,"p203-graphics-entry-20261029-a1",1,false);
  add(54,"p203-graphics-entry-20261030-c2",1,false);
  add(55,"recognition-generated-evidence-lifecycle-v1",1,false);
  add(56,"recognition-private-portability-v1",1,false);
  add(57,"camera-component-integration-v1",2,true);
  add(58,"camera-component-integration-i01-v1",2,true);
  add(59,"camera-component-integration-i02-v1",2,true);
  add(60,"camera-component-integration-i03-v1",2,true);
  add(61,"camera-component-integration-i04-v1",2,true);
  add(62,"camera-component-integration-i05-v1",2,true);
  add(63,"camera-component-integration-i06-v1",2,true);
  add(64,"camera-component-integration-i07-v1",2,true);
  add(65,"camera-component-integration-i08-v1",2,true);
  add(66,"camera-component-integration-i09-v1",2,true);
  add(67,"camera-component-integration-ic01-v1",2,true);
  add(100,"observed-enrollment-ledger-v1",3,true);
  for(int i=1;i<=64;i++)add(100+i,String.format(Locale.ROOT,"observed-enrollment-record-%04d-v1",i),3,false);
  add(200,CONTROL,3,false);
  // Expo/React Native preferences: excluded platform metadata; contents are never enumerated or returned.
  add(250,"datastore",0,false);
 }
 public static Root root(String name){Root r=ROOTS.get(name);ObservedEnrollment.require(r!=null,"ACCOUNTING_UNCLASSIFIED");return r;}
 public static Root rootById(int id){for(Root r:ROOTS.values())if(r.id==id)return r;throw new IllegalStateException("ACCOUNTING_ROOT_ID");}
 public static Collection<Root> roots(){return Collections.unmodifiableCollection(ROOTS.values());}

 // Policy text is part of the manifest identity. Changes to limits/roles require a new policy source hash.
 public static final String RETENTION_SOURCE_MANIFEST_SHA256="6f73e4d7e7de1f2748c053b9632bfa4eaec5440b1c707839a8d6b97a1e400052";
 public static final String POLICY_SOURCE_SHA256="baa68733c2693e5ad3c3de95719744fa6a5b40824097b93b5cb513a308df5c69";
 public static String manifest(){StringBuilder b=new StringBuilder("p204-root-policy-v3|"+POLICY_SOURCE_SHA256+"|"+RETENTION_SOURCE_MANIFEST_SHA256+"\n");for(Root r:ROOTS.values())b.append(r.id).append('|').append(r.category).append('|').append(r.name).append('|').append(r.required).append('|').append(policy(r)).append('\n');return b.toString();}
 public static String hash(){return ObservedEnrollment.hash(manifest().getBytes(StandardCharsets.US_ASCII));}
 public static String policy(Root r){
  if(r.id==250)return "EXCLUDED_PLATFORM_NO_DESCENT";if(r.id==200)return "REPORT_CONTROL_T3";if(r.id==100)return "ENROLLMENT_JOURNAL";if(r.id>100&&r.id<=164)return "ENROLLMENT_RECORD";if(r.category==2)return "RETAINED_INTEGRATION_EXACT_SHAPE";
  if(r.id==56)return "PRIVATE_PORTABILITY";if(r.id==55)return "GENERATED_JOURNAL";if(r.id==53||r.id==54)return "GRAPHICS_RECORDS";if(r.id>=1&&r.id<=4)return "DIAGNOSTIC_RECORDS";if(r.id==5||r.id==6)return "SAVED_EXPORT";if(r.id==7)return "STATIONARY";
  if(r.id==14||r.id==15)return "MATRIX";if((r.id>=18&&r.id<=23)||r.id==42||r.id==43)return "ORIENTATION";
  if(r.id>=44&&r.id<=52)return "LEGACY_CAMERA";return "RECOVERY";
 }
 private static final List<String> FIXED=Arrays.asList("owner.lock","owner","registry","refusals","seal","intent","receipt","failure","terminal","setup-owner","ready-attempt","pre-ready-closed","pre-ready-declined","release","result","export-attempt","export-terminal","lock","selection","destination","write","verified","recreate-intent","recreate-receipt","attempt","geometry","original.jpeg","crop.png","feature.bin","feature-receipt","tensor.f32le","cpu-intent","cpu-receipt","cpu-result","export-result","session","jpeg-header","image","capture.jpeg");
 private static final List<String> PRIVATE=Arrays.asList("owner.dat","requests.dat","packet.zip","result.zip","result-index.json","packet-index.json","packet-stage.zip","result-stage.zip","store.lock","completed.dat");
 private static final List<String> CAMERA=Arrays.asList("raw.jpg","preview.png","receipt.json","numerical.json","failure.json","interruption.json","reservation","done","invalidated","request.json","resolution");
 private static final List<String> CASES=Arrays.asList("M00-A000","M01-A090","M02-A180","M03-A270","M04-B000","M05-B090","M06-B180","M07-B270","L01-USER-CANCEL","L02-BACKGROUND","L03-VIEW-UNMOUNT","L04-PERMISSION-LOSS","D01-DENIED","D02-GRANTED-RESTORED","D03-RESTORED-AFTER-L04");
 private static String base(String leaf){return leaf.endsWith(".new")?leaf.substring(0,leaf.length()-4):leaf;}
 public static int leafId(Root r,String leaf){
  limit(r,leaf);String n=base(leaf);if(n.endsWith(".bak"))n=n.substring(0,n.length()-4);
  if(r.id==100&&!n.equals("owner.lock"))return 400;
  if(policy(r).equals("LEGACY_CAMERA")&&n.length()>37&&n.charAt(36)=='.')return 300+CAMERA.indexOf(n.substring(37));
  if(PRIVATE.contains(n))return 200+PRIVATE.indexOf(n);if(FIXED.contains(n))return 1+FIXED.indexOf(n);
  if(policy(r).equals("GRAPHICS_RECORDS"))return 410;if(policy(r).equals("DIAGNOSTIC_RECORDS")&&n.startsWith("event-"))return 411;
  if(n.equals("R04.read-diagnostic-intent"))return 506;if(n.equals("R04.read-diagnostic-result"))return 507;
  if(n.matches("R0[1-8]\\..+"))return 500+Arrays.asList("bin","intent","result","export-intent","destination","export-result").indexOf(n.substring(4));
  if(n.contains("."))return 600+Arrays.asList("intent","terminal","invoke","phase","permission").indexOf(n.substring(n.lastIndexOf('.')+1));
  throw new IllegalStateException("ACCOUNTING_LEAF_ID");
 }
 public static long limit(Root root,String leaf){
  ObservedEnrollment.require(leaf!=null&&leaf.length()<=128&&!leaf.contains("/")&&!leaf.contains("\\"),"ACCOUNTING_LEAF_NAME");String name=base(leaf),policy=policy(root);
  switch(policy){
   case "REPORT_CONTROL_T3":if(name.equals("R04.read-diagnostic-intent"))return 2048;if(name.equals("R04.read-diagnostic-result"))return 4096;if(name.equals("session"))return 8192;if(name.matches("R0[1-8]\\.bin"))return 4194304;if(name.matches("R0[1-8]\\.(intent|result|export-intent|destination|export-result)"))return 65536;break;
   case "ENROLLMENT_JOURNAL":if(name.equals("owner.lock"))return 0;if(name.matches("event-[0-9]{4}")&&Integer.parseInt(name.substring(6))>=1&&Integer.parseInt(name.substring(6))<=4096)return 360704;break;
   case "ENROLLMENT_RECORD":switch(name){case "intent":case "geometry":return 4096;case "original.jpeg":return 10485760;case "crop.png":return 2097152;case "receipt":return 1024;case "failure":return 512;case "feature.bin":return 4096;case "feature-receipt":return 2048;}break;
   case "RETAINED_INTEGRATION_EXACT_SHAPE":if(Arrays.asList("owner.lock","intent","geometry","original.jpeg","crop.png","receipt","tensor.f32le","cpu-intent","cpu-receipt","cpu-result","export-attempt","export-result").contains(name))return name.equals("owner.lock")?0:10485760;break;
   case "PRIVATE_PORTABILITY":{String n=name.endsWith(".bak")?name.substring(0,name.length()-4):name;if(PRIVATE.contains(n))return 134217728;break;}
   case "GENERATED_JOURNAL":{String n=name.endsWith(".bak")?name.substring(0,name.length()-4):name;if(Arrays.asList("owner.dat","requests.dat","completed.dat","store.lock").contains(n))return 50331648;break;}
   case "RECOVERY":if(Arrays.asList("lock","owner","selection","destination","write","verified","terminal","recreate-intent","recreate-receipt").contains(name))return 2048;break;
   case "SAVED_EXPORT":if(name.equals("attempt")||name.equals("terminal"))return 4096;break;
   case "STATIONARY":if(Arrays.asList("intent","export-attempt","export-terminal").contains(name))return 4096;break;
   case "GRAPHICS_RECORDS":if(name.matches("record-(0[0-9]|1[0-9]|2[0-9]|3[01])\\.json"))return 2048;break;
   case "DIAGNOSTIC_RECORDS":if(name.equals("capture.jpeg"))return 10485760;if(Arrays.asList("setup-owner","ready-attempt","pre-ready-closed","jpeg-header","image").contains(name)||name.matches("event-(0[0-9]{2}|1[01][0-9]|12[0-7])"))return 2048;break;
   case "LEGACY_CAMERA":{
    String n=name.endsWith(".bak")?name.substring(0,name.length()-4):name;
    if(n.equals("owner"))return 1024;if(n.equals("refusals"))return 65536;
    if(n.matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}\\..+")&&CAMERA.contains(n.substring(37))){String role=n.substring(37);return role.equals("raw.jpg")?12582912:role.equals("preview.png")?262144:role.equals("receipt.json")||role.equals("numerical.json")?65536:4096;}break;
   }
   case "MATRIX":case "ORIENTATION":
    if(name.equals("registry"))return policy.equals("MATRIX")?16384:4096;
    if(Arrays.asList("owner","seal","export-attempt","export-terminal").contains(name))return 4096;
    int dot=name.lastIndexOf('.');if(dot>0){String id=name.substring(0,dot),role=name.substring(dot+1);int at=CASES.indexOf(id);if(at>=0&&((at<8&&(role.equals("intent")||role.equals("terminal")))||(policy.equals("MATRIX")&&at>=8&&at<12&&Arrays.asList("intent","terminal","invoke","phase").contains(role))||(policy.equals("MATRIX")&&at>=12&&role.equals("permission"))))return 4096;}break;
  }
  throw new IllegalStateException("ACCOUNTING_UNCLASSIFIED_LEAF");
 }
}

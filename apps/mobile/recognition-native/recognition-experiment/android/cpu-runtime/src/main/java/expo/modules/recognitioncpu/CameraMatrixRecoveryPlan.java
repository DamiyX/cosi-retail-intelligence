package expo.modules.recognitioncpu;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static expo.modules.recognitioncpu.CameraMatrixPlan.*;
/** One historical run and one generated lane. No caller-supplied paths, source pins or bytes. */
public final class CameraMatrixRecoveryPlan {
  private CameraMatrixRecoveryPlan(){}
  public static final String ZERO="0000000000000000000000000000000000000000000000000000000000000000";
  public static final String CAPTURE_SOURCE="08d1f1f319765a12ebc98b1805d5d83056d620c466b0561e607a41f6926ce19b";
  public static final String CAPTURE_APK="b83a2b2d6cc744345c46106c3d76c9c1a52eddddeecb7c2535394230f3512674";
  public static final String CAMERA_OWNER="360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e";
  public static final List<String> LEGACY_JOBS=Collections.unmodifiableList(Arrays.asList("16c586fc-146b-4877-9002-1d4fb89afd78","9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c","76d28e3f-cdcd-4d1a-a86e-026e2568ce5e","a9d4ffa8-85cc-4145-bc5c-31a57a327f09","78cf411b-25e1-4dc2-ac8d-80caaacb2de6","21b9d32b-5f31-45ac-b453-2a261e9e9ccc"));
  public static final String SERIALIZER="p203-stored-fixed-dos-v1";
  public static final int RECORD=2048,JOURNAL=14*1024,ORIGINAL_CANONICAL=172*1024,FIXTURE_ALLOWANCE=64*1024,FIXTURE_OUTPUT=4096,FIXTURE_JOURNAL=JOURNAL+4*1024;
  public static final List<String> STEPS=Collections.unmodifiableList(Arrays.asList("owner","selection","destination","write","verified","terminal"));
  public static final List<String> FIXTURE_STEPS=Collections.unmodifiableList(Arrays.asList("recreate-intent","recreate-receipt"));
  public enum Lane {
    ACTUAL("camera-matrix-recovery-20261024-v1","p203-matrix-20261023-c1-r1.zip",90*1024*1024),
    FIXTURE("camera-matrix-recovery-fixture-20261024-v1","p203-export-recovery-fixture-20261024.zip",FIXTURE_OUTPUT),
    ORIENTATION_FIRST("camera-m00-repeat-export-first-20261029-c1","p203-m00-repeat-20261029-c1-first.zip",CameraOrientationPlan.ACTIVE_OUTPUT,1),
    ORIENTATION_FINAL("camera-m00-repeat-export-final-disabled-20261029-c1","p203-m00-repeat-20261029-c1-final-disabled.zip",CameraOrientationPlan.ACTIVE_OUTPUT,8),
    ORIENTATION_FIXTURE("camera-m00-repeat-export-fixture-20261029-c1","p203-m00-repeat-20261029-c1-fixture.zip",64*1024,-1),
    RETAINED_SOURCE753_ORIENTATION_FIRST("camera-m00-repeat-export-first-20261029-a1","p203-m00-repeat-20261029-a1-first.zip",16*1024*1024,1),
    RETAINED_SOURCE753_ORIENTATION_FINAL("camera-m00-repeat-export-final-disabled-20261029-a1","p203-m00-repeat-20261029-a1-final-disabled.zip",16*1024*1024,8),
    RETAINED_SOURCE753_ORIENTATION_FIXTURE("camera-m00-repeat-export-fixture-20261029-a1","p203-m00-repeat-20261029-a1-fixture.zip",64*1024,-1),
    RETAINED_SOURCE750_ORIENTATION_FIRST("camera-orientation-export-first-20261028-preview-v4","p203-orientation-20261028-preview-v4-first.zip",CameraOrientationPlan.OUTPUT,1),
    RETAINED_SOURCE750_ORIENTATION_FINAL("camera-orientation-export-final-20261028-preview-v4","p203-orientation-20261028-preview-v4-final.zip",CameraOrientationPlan.OUTPUT,8),
    RETAINED_SOURCE750_ORIENTATION_FIXTURE("camera-orientation-export-fixture-20261028-preview-v4","p203-orientation-20261028-preview-v4-fixture.zip",64*1024,-1),
    RETAINED_PREVIEW_ORIENTATION_FIRST("camera-orientation-export-first-20261027-preview-v3","p203-orientation-20261027-preview-v3-first.zip",CameraOrientationPlan.OUTPUT,1),
    RETAINED_PREVIEW_ORIENTATION_FINAL("camera-orientation-export-final-20261027-preview-v3","p203-orientation-20261027-preview-v3-final.zip",CameraOrientationPlan.OUTPUT,8),
    RETAINED_PREVIEW_ORIENTATION_FIXTURE("camera-orientation-export-fixture-20261027-preview-v3","p203-orientation-20261027-preview-v3-fixture.zip",64*1024,-1),
    RETAINED_READINESS_ORIENTATION_FIRST("camera-orientation-export-first-20261027-readiness-v2","p203-orientation-20261027-readiness-v2-first.zip",CameraOrientationPlan.OUTPUT,1),
    RETAINED_READINESS_ORIENTATION_FINAL("camera-orientation-export-final-20261027-readiness-v2","p203-orientation-20261027-readiness-v2-final.zip",CameraOrientationPlan.OUTPUT,8),
    RETAINED_READINESS_ORIENTATION_FIXTURE("camera-orientation-export-fixture-20261027-readiness-v2","p203-orientation-20261027-readiness-v2-fixture.zip",64*1024,-1),
    RETAINED_EVIDENCE_ORIENTATION_FIRST("camera-orientation-export-first-20261026-evidence-v2","p203-orientation-20261026-evidence-v2-first.zip",CameraOrientationPlan.OUTPUT,1),
    RETAINED_EVIDENCE_ORIENTATION_FINAL("camera-orientation-export-final-20261026-evidence-v2","p203-orientation-20261026-evidence-v2-final.zip",CameraOrientationPlan.OUTPUT,8),
    RETAINED_EVIDENCE_ORIENTATION_FIXTURE("camera-orientation-export-fixture-20261026-evidence-v2","p203-orientation-20261026-evidence-v2-fixture.zip",64*1024,-1),
    RETAINED_UI_ORIENTATION_FIRST("camera-orientation-export-first-20261025-ui-v2","p203-orientation-20261025-ui-v2-first.zip",CameraOrientationPlan.OUTPUT,1),
    RETAINED_UI_ORIENTATION_FINAL("camera-orientation-export-final-20261025-ui-v2","p203-orientation-20261025-ui-v2-final.zip",CameraOrientationPlan.OUTPUT,8),
    RETAINED_UI_ORIENTATION_FIXTURE("camera-orientation-export-fixture-20261025-ui-v2","p203-orientation-20261025-ui-v2-fixture.zip",64*1024,-1),
    RETAINED_ORIENTATION_FIRST("camera-orientation-export-first-20261024-v2","p203-orientation-20261024-v2-first.zip",CameraOrientationPlan.OUTPUT,1),
    RETAINED_ORIENTATION_FINAL("camera-orientation-export-final-20261024-v2","p203-orientation-20261024-v2-final.zip",CameraOrientationPlan.OUTPUT,8),
    RETAINED_ORIENTATION_FIXTURE("camera-orientation-export-fixture-20261024-v2","p203-orientation-20261024-v2-fixture.zip",64*1024,-1);
    public final String root,filename,documentId,uri;public final int outputCap,orientationPrefix;
    Lane(String root,String filename,int cap){this(root,filename,cap,0);}
    Lane(String root,String filename,int cap,int prefix){this.root=root;this.filename=filename;outputCap=cap;orientationPrefix=prefix;documentId="primary:Download/"+filename;uri="content://com.android.externalstorage.documents/document/primary%3ADownload%2F"+filename;}
    public boolean retained(){return name().startsWith("RETAINED_");}
    public boolean retainedSource753(){return name().startsWith("RETAINED_SOURCE753_");}
    public boolean retainedSource750(){return name().startsWith("RETAINED_SOURCE750_");}
    public boolean retainedPreview(){return name().startsWith("RETAINED_PREVIEW_");}
    public boolean retainedReadiness(){return name().startsWith("RETAINED_READINESS_");}
    public boolean retainedEvidence(){return name().startsWith("RETAINED_EVIDENCE_");}
    public boolean retainedUi(){return name().startsWith("RETAINED_UI_");}
    public String recordName(){return retainedSource753()?name().substring("RETAINED_SOURCE753_".length()):retainedSource750()?name().substring("RETAINED_SOURCE750_".length()):retainedPreview()?name().substring("RETAINED_PREVIEW_".length()):retainedReadiness()?name().substring("RETAINED_READINESS_".length()):retainedEvidence()?name().substring(18):retainedUi()?name().substring(12):retained()?name().substring(9):name();}
    public String run(){return retainedSource753()?CameraOrientationRepeatSetupRetained.RUN:retainedSource750()?CameraOrientationRepeatRetained.RUN:retainedPreview()?CameraOrientationPreviewRetained.RUN:retainedReadiness()?CameraOrientationReadinessRetained.RUN:retainedEvidence()?CameraOrientationEvidenceRetained.RUN:retainedUi()?CameraOrientationUiRetained.RUN:retained()?CameraOrientationRetained.RUN:orientation()?CameraOrientationPlan.RUN:RUN;}
    public boolean orientation(){return orientationPrefix!=0;}
  }
  public static void requireRecovery(boolean ok,String code){require(ok,"RECOVERY_"+code);}
  public static int index(String step){int n=STEPS.indexOf(step);requireRecovery(n>=0,"STEP");return n;}
  public static boolean fixedUri(Lane lane,String text){
    if(text==null||text.length()>512)return false;
    try{URI uri=new URI(text);String p=uri.getRawPath();if(!"content".equals(uri.getScheme())||!"com.android.externalstorage.documents".equals(uri.getRawAuthority())||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getRawUserInfo()!=null||p==null||!p.startsWith("/document/")||p.substring(10).contains("/"))return false;
      String id=URLDecoder.decode(p.substring(10),StandardCharsets.UTF_8.name());return lane.documentId.equals(id);
    }catch(Exception bad){return false;}
  }
  public static void footprint(java.io.File root,CameraProofStore.IO io,Lane lane)throws Exception{
    List<String> names=io.list(root);requireRecovery(names.size()<=(lane==Lane.FIXTURE?10:8)&&names.contains("lock"),"FILE_COUNT_OR_LOCK");long bytes=0;int temps=0;
    for(String name:names){if(name.equals("lock")){requireRecovery(io.size(new java.io.File(root,name))==0,"LOCK_PAYLOAD");continue;}String base=name.endsWith(".new")?name.substring(0,name.length()-4):name;if(!STEPS.contains(base))requireRecovery(lane==Lane.FIXTURE&&FIXTURE_STEPS.contains(base),"FIXTURE_LEAF");if(!name.equals(base))temps++;long size=io.size(new java.io.File(root,name));requireRecovery(size>0&&size<=RECORD,"RECORD_SIZE");bytes=Math.addExact(bytes,size);}
    requireRecovery(bytes<=(lane==Lane.FIXTURE?FIXTURE_JOURNAL:JOURNAL)&&temps<=1,"JOURNAL_CAP");
  }
}

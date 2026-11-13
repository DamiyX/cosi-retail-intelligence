package expo.modules.recognitioncpu;
/** New report roles are prospective; R01-R05 retain their original admission rules. */
public final class EnrollmentReportPurpose {
 public static void validate(int number,int sequence,String session,ObservedEnrollment.State state,int references){
  ObservedEnrollment.require(number>=1&&number<=8,"REPORT_NUMBER");if(number<6)return;
  ObservedEnrollment.require(state!=null&&session.equals("enrollment-mw4zmxro")&&state.products().size()==10,"REPORT_PURPOSE_SESSION");
  if(number==6){
   ObservedEnrollment.require(sequence==24&&state.revision()==1&&state.epoch()==9&&state.attempts()==8&&references==7,"REPORT_FANTA_CHECKPOINT");int[] jobs={8,5,6,7};
   for(int product=0;product<10;product++)for(int view=0;view<4;view++){ObservedEnrollment.Reference ref=state.products().get(product).view(view);ObservedEnrollment.require(product==0?ref!=null&&ref.job==jobs[view]:ref==null,"REPORT_FANTA_VIEWS");}
  }else for(ObservedEnrollment.Product product:state.products())for(int view=0;view<4;view++)ObservedEnrollment.require(product.view(view)!=null,"REPORT_FULL_GALLERY");
 }
 /** Device-local gate only; coordinator still requires a witnessed live PRE plus strict host proof and settled restart. */
 public static void pre(EnrollmentReportDecision decision,byte[] prepared,byte[] intent,String session,int sequence,String head){
  ObservedEnrollment.require(prepared!=null&&intent!=null&&decision.stableCut&&decision.download(EnrollmentReportRecords.prepared(prepared))!=null,"REPORT_PRE_NOT_VERIFIED");
  String[] cut=new String(intent,java.nio.charset.StandardCharsets.US_ASCII).split("\\|",-1);ObservedEnrollment.require(cut.length==5&&cut[1].equals(session)&&cut[2].equals(Integer.toString(sequence))&&cut[3].equals(head),"REPORT_GALLERY_CHANGED_AFTER_PRE");
 }

 private EnrollmentReportPurpose(){}
}

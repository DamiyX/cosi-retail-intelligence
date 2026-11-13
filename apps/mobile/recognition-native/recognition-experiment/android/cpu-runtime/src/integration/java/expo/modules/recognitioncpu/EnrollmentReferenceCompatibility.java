package expo.modules.recognitioncpu;
/** Exact immutable source665 references independently accepted in the frozen R03; no migration. */
public final class EnrollmentReferenceCompatibility {
 public static final String REPORT="5360c9b20d4ee50e20fcffb5b1b5f5c6c50137a047b61b934e6a031681017fce",SOURCE="030552c6d7625087a38f578d37c7b338fe5fa43ea61407bcfc0692e519eef294";
 public static boolean accepts(EnrollmentDescriptor descriptor,ObservedEnrollment.Reference ref){
  if(!EnrollmentInitialization.original(descriptor)||!ref.source.equals(SOURCE)||!ref.model.equals(CameraProofFrame.MODEL))return false;
  String hash=ObservedEnrollment.hash(ObservedEnrollment.referenceBytes(ref));switch(ref.job){
   case 1:return ref.product==0&&ref.view==0&&ref.epoch==1L&&ref.receipt.equals("c96cf92afcb88063a999f21c732cef1b507c9ee9db52a274c41f71141b5838eb")&&hash.equals("6653678bdf03de49547a0a06fe0170d103f53b032daae9382c93478a7d36e3b1");
   case 3:return ref.product==0&&ref.view==1&&ref.epoch==4L&&ref.receipt.equals("4756f1eecf89825be3e752c2e49c54c18aaf9157eadde6d23edf7769e8cd495f")&&hash.equals("427b3fb5bc0cca8fc9fd6bf7e60e1ee4e1f7dbabd3f6638f22c8bcbfbd805a03");
   case 4:return ref.product==0&&ref.view==1&&ref.epoch==5L&&ref.receipt.equals("dca0c68f9a8e0c6ca116605adc444c1e49208a45074c132ad8597baf1d847718")&&hash.equals("4c6f91b6ee38ffaffa6a802e0273f0237849d4950467a41937359a38cc9f1384");
   case 5:return ref.product==0&&ref.view==1&&ref.epoch==6L&&ref.receipt.equals("06887722171d55d824774bff7ba622243bd847bf234969d8634a269a0dbd0022")&&hash.equals("7b80951cc6b0a1b860bfd8fcc5ad4bfd8737a43fb053f35d11ba3e89ccca8047");
   case 6:return ref.product==0&&ref.view==2&&ref.epoch==7L&&ref.receipt.equals("e7620b4e05b34da24ea818cb570061a29ec99e4568fb618f77dc789829833735")&&hash.equals("181494168ee2cf54b6889e1e19cd685b2961b0fa6f2895cc9a2bc063b4a604b0");
   case 7:return ref.product==0&&ref.view==3&&ref.epoch==8L&&ref.receipt.equals("25b058b753ef7f063dc3a785e27bad1458989d81d1fecb3f6c2ecd745ab84e46")&&hash.equals("dd9e0048f29f5ce9a75c57f07900ad1643c8b8c94af65285eaedc786c4032f3c");
   case 8:return ref.product==0&&ref.view==0&&ref.epoch==9L&&ref.receipt.equals("6df0c7c206e294c747608ce9517ff7a4c8c15cd13e0f650f035cb64ae8d15938")&&hash.equals("cf6bb91f77db8acab141d925f544d266b7a64b7a4684de3708a07241a4989f15");
   default:return false;
  }
 }
 private EnrollmentReferenceCompatibility(){}
}

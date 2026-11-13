package expo.modules.recognitioncpu;

/** Main's finite descriptor disposition. Provenance is a reference, never old ownership. */
public final class GraphicsEntryRetained {
  public static final String ROOT="p203-graphics-entry-20261029-a1";
  public static final String METADATA_SHA256="ac032fe72184369eb829c2f7b023a41126e6fe3f796dd9fddd99b1ada8615576";
  public static final String DISPOSITION_SHA256="4f597cc1e7bf9aaea01002921bf60281b90cbee78a49004215ee4cf807b3e272";
  public static final String METADATA_PRODUCER="404a41f7c9865d5cbb6abe87ab134952756f25cb508221e9704d8c98d19a16f0";
  public static final String METADATA_EXECUTOR_APK="566fbfd3635bcfece9d1e583aad8655156f5ca02007483497641badfa27eedaf";
  public static final long CLAIM=65536L;
  private static final long[] EXACT={65086L,1774225L,10264L,16832L,2L,3452L,1793317885L,1793317885L};
  /** Order: device,inode,uid,mode,links,directory bytes,mtime,ctime. No bytes or owner receipt. */
  public static void validate(String root,long[] descriptor,int leafCount){
    need(ROOT.equals(root)&&descriptor!=null&&descriptor.length==EXACT.length&&leafCount==0);
    for(int i=0;i<EXACT.length;i++)need(EXACT[i]==descriptor[i]);
  }
  public static void provenance(String metadata,String producer,String apk){need(METADATA_SHA256.equals(metadata)&&METADATA_PRODUCER.equals(producer)&&METADATA_EXECUTOR_APK.equals(apk));}
  public static boolean allowedRoot(String name){return ROOT.equals(name)||GraphicsEntryProtocol.ROOT.equals(name);}
  private static void need(boolean value){if(!value)throw new IllegalArgumentException("CAMERA_GRAPHICS_RETAINED_CHANGED");}
}

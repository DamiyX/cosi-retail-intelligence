package expo.modules.recognitioncpu;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

public final class CameraDirectoryPathChecks {
  private static int checks;
  private static void yes(boolean v){if(!v)throw new AssertionError();checks++;}
  private static void alias(File f)throws Exception{try{CameraDirectoryPath.requireCanonical(f);}catch(IllegalArgumentException e){yes(e.getMessage().equals("CAMERA_DIRECTORY_ALIAS"));return;}throw new AssertionError("Alias accepted");}
  public static void main(String[] args)throws Exception {
    Path base=Path.of(args[1]);Files.createDirectories(base.resolve("anchor"));Files.createDirectories(base.resolve("files"));
    File contextFiles=new File(base.toFile(),"anchor/../files");
    File root=CameraDirectoryPath.exactRoot(contextFiles,GraphicsEntryProtocol.ROOT);
    Files.createDirectory(root.toPath());
    // Original Journal.create creates root, then syncDirectory(raw Context filesDir):
    // the production strict directory predicate rejects before the first record.
    if(args[0].equals("original")){CameraDirectoryPath.requireCanonical(contextFiles);throw new AssertionError("Original alias unexpectedly accepted");}
    CameraDirectoryPath.requireCanonical(root.getParentFile());yes(root.isDirectory()&&root.list().length==0);
    alias(contextFiles);alias(new File(contextFiles,GraphicsEntryProtocol.ROOT));
    yes(CameraDirectoryPath.exactRoot(contextFiles,GraphicsEntryProtocol.ROOT).equals(root));
    alias(new File(root,"."));
    try{CameraDirectoryPath.exactRoot(contextFiles,"../escape");throw new AssertionError();}catch(IllegalArgumentException expected){checks++;}
    yes(root.getParentFile().equals(contextFiles.getCanonicalFile()));
    System.out.println("PASS "+checks+" real-host-directory original-path/parent-sync/readback/strict-refusal checks; no Android alias/fsync claim");
  }
}

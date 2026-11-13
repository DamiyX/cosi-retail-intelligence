package expo.modules.recognitioncpu;

import java.io.File;
import java.io.IOException;

/** Exact original directory comparison, shared with the caller-path regression. */
public final class CameraDirectoryPath {
  private CameraDirectoryPath() {}
  public static void requireCanonical(File directory) throws IOException {
    CameraProofFrame.require(directory.getAbsoluteFile().equals(directory.getCanonicalFile()),"CAMERA_DIRECTORY_ALIAS");
  }
  /** Canonicalize the Context anchor, never a root child that could itself be an alias. */
  public static File exactRoot(File filesDirectory,String fixedName) throws IOException {
    CameraProofFrame.require(fixedName!=null&&fixedName.matches("[a-z0-9-]{1,96}"),"CAMERA_FIXED_ROOT_NAME");
    File root=new File(filesDirectory.getCanonicalFile(),fixedName);
    requireCanonical(root);
    return root;
  }
}

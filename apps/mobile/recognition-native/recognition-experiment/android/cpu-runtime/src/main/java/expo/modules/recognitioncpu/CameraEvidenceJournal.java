package expo.modules.recognitioncpu;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Separately owned sidecar; no metadata is renamed, deleted, truncated or replayed. */
public final class CameraEvidenceJournal {
  private final File root;private final CameraProofStore.IO io;
  public CameraEvidenceJournal(File root,CameraProofStore.IO io){this.root=root;this.io=io;}
  private byte[] bytes(String s){return s.getBytes(StandardCharsets.UTF_8);}
  private void validate()throws IOException{
    CameraEvidenceC9.bookkeeping(0,CameraEvidenceC9.current(root,io));
  }
  public void consume(String id,String source,String apk)throws IOException{
    validate();CameraEvidenceExport.require(io.list(root).isEmpty(),"ATTEMPT_CONSUMED");
    CameraEvidenceExport.require(id.matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}")&&source.matches("[a-f0-9]{64}")&&apk.matches("[a-f0-9]{64}"),"JOURNAL_BINDING");
    String body="CAMERA_EXPORT_ATTEMPT_V1\n"+CameraEvidenceExport.JOB+"\n"+id+"\n"+source+"\n"+apk+"\n"+CameraEvidenceExport.OUTPUT_LIMIT+"\n";
    io.writeNew(new File(root,"attempt"),bytes(body+CameraProofFrame.hash(bytes(body))+"\n"));io.syncDirectory(root);validate();
  }
  public void terminal(String status)throws IOException{
    validate();CameraEvidenceExport.require(Arrays.asList("CANCELLED","FAILED_UNVERIFIED","READBACK_VERIFIED").contains(status)&&io.list(root).equals(Collections.singletonList("attempt")),"JOURNAL_STATE");
    byte[] attempt=io.read(new File(root,"attempt"),4096);String body="CAMERA_EXPORT_TERMINAL_V1\n"+CameraProofFrame.hash(attempt)+"\n"+status+"\n";
    io.writeNew(new File(root,"terminal"),bytes(body+CameraProofFrame.hash(bytes(body))+"\n"));io.syncDirectory(root);validate();
  }
}

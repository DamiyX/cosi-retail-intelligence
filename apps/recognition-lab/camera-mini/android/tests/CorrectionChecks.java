import local.cameracomponent.*;
import java.util.*;
public final class CorrectionChecks {
 static void check(boolean b,String why){if(!b)throw new AssertionError(why);}
 interface Action {void run()throws Exception;}
 static void refuses(Action a)throws Exception{try{a.run();throw new AssertionError("unexpected acceptance");}catch(Failure expected){}}
 public static void main(String[] args)throws Exception{
  for(long free:new long[]{-1,0,Evidence.EXPORT_REQUIRED-1})refuses(()->Evidence.exportCapacity(free));
  Evidence.exportCapacity(Evidence.EXPORT_REQUIRED);Evidence.exportCapacity(Evidence.EXPORT_REQUIRED+1);
  MechanismChecks.Disk d=new MechanismChecks.Disk();Evidence e=new Evidence(d);e.begin("g");e.retain(new byte[]{1},"g","native");
  check(e.reopen().startsWith("PARTIAL:"),"partial recovery");refuses(e::claimExport);refuses(()->e.begin("g"));
  refuses(()->e.save(new byte[]{9},new byte[]{2},"g","native"));check(!d.names().contains("receipt"),"changed original committed");
  e.failure("STORAGE:crop:NONE:Failure");check(e.reopen().startsWith("REFUSED:"),"refused recovery");check(Arrays.equals(d.read("original.jpeg",10),new byte[]{1}),"original lost");
  d.files.get("original.jpeg")[0]=3;refuses(e::reopen);
  for(String leaf:Arrays.asList("original.jpeg","geometry")){
   MechanismChecks.Disk broken=new MechanismChecks.Disk();Evidence b=new Evidence(broken);b.begin("g");broken.fail=leaf;
   try{b.retain(new byte[]{1},"g","n");throw new AssertionError("torn retained");}catch(java.io.IOException expected){}
   refuses(b::reopen);refuses(()->b.begin("g"));refuses(b::claimExport);
  }
  MechanismChecks.Disk good=new MechanismChecks.Disk();Evidence saved=new Evidence(good);saved.begin("g");saved.retain(new byte[]{1},"g","n");saved.save(new byte[]{1},new byte[]{2},"g","n");
  good.free=Evidence.EXPORT_REQUIRED-1;refuses(saved::claimExport);check(!good.names().contains("export-attempt"),"low-space consumed");
  good.free=Evidence.EXPORT_REQUIRED;saved.claimExport();good.free=-1;refuses(()->Evidence.exportCapacity(good.free));saved.exportResult(false);refuses(saved::claimExport);check(saved.reopen().startsWith("SAVED:"),"export failure damaged capture");
  System.out.println("PASS correction boundaries: partial/refused integrity, tamper/torn/no-rearm, admitted original binding, export capacity equality/unknown/picker loss/no-refund");
 }
}

"""Offline signed lab release only. No installation, network, or device commands."""
from pathlib import Path
import os,sys,subprocess,hashlib,json
root=Path(__file__).resolve().parent;out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
rows=[]
for p in sorted(root.rglob('*')):
 if not p.is_file() or any(part in ('build','.gradle','.cxx') for part in p.relative_to(root).parts) or p.name=='local.properties':continue
 rows.append({'path':p.relative_to(root).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
raw=(json.dumps(rows,sort_keys=True,separators=(',',':'))+'\n').encode();pin=hashlib.sha256(raw).hexdigest();(out/'source-index.json').write_bytes(raw)
base=Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1');env=os.environ.copy();env.update(JAVA_HOME=str(base/'jdk17'),ANDROID_HOME=str(base/'sdk'),GRADLE_USER_HOME='C:/p1g-20261012-a1',ANDROID_SDK_ROOT=str(base/'sdk'),MINI_REVIEW_OUTPUT=str(out))
gradle=base/'gradle/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1/bin/gradle.bat'
cmd=[str(gradle),'--offline','--no-daemon','--console=plain','-PsourceSha='+pin,':app:assembleRelease',':reviewClosure',':app:dependencies','--configuration','releaseRuntimeClasspath']
if '--write-locks' in sys.argv:cmd.append('--write-locks')
(out/'command.json').write_text(json.dumps({'cwd':str(root),'cmd':cmd,'sourceSha':pin},indent=2))
with (out/'gradle.log').open('w',encoding='utf-8') as log:p=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
(out/'result.json').write_text(json.dumps({'exit':p.returncode,'sourceSha':pin},indent=2));print('offline Gradle exit',p.returncode,'source',pin);print((out/'gradle.log').read_text()[-4500:]);sys.exit(p.returncode)

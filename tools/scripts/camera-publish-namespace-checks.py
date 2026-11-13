"""Execute the actual publisher's pre-open C predicate as freestanding WASM, without a phone."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[2]
C_PATH = 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/cpp/camera_proof_publish.c'
TOOLS = Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1/sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64/bin')
NODE = 'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe'
PREAMBLE = r'''
typedef __SIZE_TYPE__ size_t;
#define NULL ((void*)0)
static size_t strlen(const char*s){size_t n=0;while(s[n])n++;return n;}
static int strcmp(const char*a,const char*b){while(*a&&*a==*b){a++;b++;}return (unsigned char)*a-(unsigned char)*b;}
static int strncmp(const char*a,const char*b,size_t n){while(n&&*a&&*a==*b){a++;b++;n--;}return n?(unsigned char)*a-(unsigned char)*b:0;}
static const char*strrchr(const char*s,int c){const char*r=NULL;do{if(*s==c)r=s;}while(*s++);return r;}
'''


def compile_mapping(source, path):
    functions = source[source.index('static int leaf('):source.index('static int regular(')]
    condition = re.search(r'if\((.+)\)return failure\(3,EINVAL\);', source[source.index('static jlong publish_at('):]).group(1)
    body = PREAMBLE + functions + '\nint check_publish(const char*directory,const char*from,const char*to){return !(' + condition + ');}\n'
    path.with_suffix('.c').write_text(body, encoding='utf8')
    command = [str(TOOLS/'clang.exe'), '--target=wasm32', '-nostdlib', '-ffreestanding', '-fno-builtin', '-O1',
        '-Wl,--no-entry', '-Wl,--export=check_publish', '-Wl,--export=__heap_base', '-Wl,--export-memory',
        str(path.with_suffix('.c')), '-o', str(path)]
    p = subprocess.run(command, capture_output=True, text=True, timeout=60)
    if p.returncode:
        raise RuntimeError(p.stderr)


def main():
    output = Path(sys.argv[1]).resolve()
    output.mkdir(exist_ok=False)
    source = (ROOT/C_PATH).read_text(encoding='utf8')
    plan = (ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraOrientationPlan.java').read_text(encoding='utf8')
    run, run_root, camera_root = re.search(r'RUN="([^"]+)",ROOT="([^"]+)",CAMERA_ROOT="([^"]+)"', plan).groups()
    job = str(uuid.UUID(bytes=hashlib.md5((run+':M00-A000').encode()).digest(), version=3))
    export = 'camera-m00-repeat-export-'
    suffix = '20261029-c1'
    cases = []
    def add(root, name, yes=True, staged=None):
        cases.append(dict(directory='/data/user/0/test/files/'+root, to=name, source=staged or name+'.new', expected=int(yes)))
    for root in [export+'fixture-'+suffix, export+'first-'+suffix]:
        for name in ['owner','selection','destination','write','verified','terminal']:
            add(root,name)
        for name in ['owner.new','unknown','../owner','M00-A000.intent']:
            add(root,name,False)
    for name in ['owner','registry','seal','M00-A000.intent','M00-A000.terminal']:
        add(run_root,name)
    for name in ['M01-A090.intent','M07-B270.terminal','unknown','owner.new']:
        add(run_root,name,False)
    for role in ['reservation','request.json','raw.jpg','preview.png','numerical.json','receipt.json','done','resolution','failure.json','interruption.json','invalidated']:
        add(camera_root,job+'.'+role)
    for wrong in ['626a0912-65af-3d6b-be11-09f63d294bf8','6a28812d-494d-3361-b35e-9238c00afaaf']:
        add(camera_root,wrong+'.raw.jpg',False)
    for root in ['camera-m00-repeat-export-fixture-20261029-a1','camera-m00-repeat-export-first-20261029-a1',
                 'camera-orientation-export-fixture-20261028-preview-v4','camera-orientation-20261028-preview-v4',
                 'camera-orientation-m00-repeat-20261029-a1',run_root+'.new',run_root+'/child',
                 export+'final-disabled-'+suffix,'unknown']:
        add(root,'owner',False)
    add('unknown',job+'.raw.jpg',False)
    add('camera-proof-m00-repeat-20261029-a1','626a0912-65af-3d6b-be11-09f63d294bf8.raw.jpg',False)
    add('camera-proof-v1',job+'.raw.jpg')
    add('camera-matrix-20261023-c1-r2-v1','M01-A090.intent')
    add(export+'fixture-'+suffix,'owner',False,'owner.bak')
    add(export+'fixture-'+suffix,'owner',False,'owner.new.extra')
    (output/'cases.json').write_text(json.dumps(cases),encoding='utf8')
    compile_mapping(source,output/'current.wasm')
    # Source753 source artifact reproduces exactly the Java/C namespace incompatibility.
    with zipfile.ZipFile(sys.argv[2]) as z:
        old = z.read(C_PATH).decode('utf8')
    compile_mapping(old,output/'source753.wasm')
    baseline = [dict(directory='/data/user/0/test/files/'+root, to='owner', source='owner.new', expected=0)
                for root in ['camera-m00-repeat-export-fixture-20261029-a1','camera-orientation-m00-repeat-20261029-a1']]
    (output/'baseline.json').write_text(json.dumps(baseline),encoding='utf8')
    script = output/'run.cjs'
    script.write_text(r'''
const fs=require('node:fs');
async function run(wasm,cases){
 const {instance}=await WebAssembly.instantiate(fs.readFileSync(wasm),{}),e=instance.exports;
 const bytes=new Uint8Array(e.memory.buffer),base=e.__heap_base.value;
 function text(value,offset){const b=Buffer.from(value+'\0');bytes.set(b,base+offset);return base+offset;}
 const rows=JSON.parse(fs.readFileSync(cases));
 for(const c of rows){const actual=e.check_publish(text(c.directory,0),text(c.source,1024),text(c.to,2048));
  if(actual!==c.expected)throw Error(JSON.stringify({case:c,actual}));}
 return rows.length;
}
(async()=>{const a=await run(process.argv[2],process.argv[3]);const b=await run(process.argv[4],process.argv[5]);console.log(JSON.stringify({currentChecks:a,source753FailureReproductions:b,allPassed:true,phoneAccess:false}));})().catch(e=>{console.error(e);process.exitCode=1});
''',encoding='utf8')
    p = subprocess.run([NODE,str(script),str(output/'current.wasm'),str(output/'cases.json'),str(output/'source753.wasm'),str(output/'baseline.json')],capture_output=True,text=True,timeout=30)
    receipt = dict(exitCode=p.returncode,stdout=p.stdout,stderr=p.stderr,actualCSourceSha256=hashlib.sha256((ROOT/C_PATH).read_bytes()).hexdigest(),currentWasmSha256=hashlib.sha256((output/'current.wasm').read_bytes()).hexdigest(),source753CSourceSha256=hashlib.sha256(old.encode()).hexdigest(),phoneAccess=False,scope='Actual pre-open namespace/suffix predicate; no POSIX rename/device execution')
    (output/'result.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8')
    print(json.dumps(receipt))
    raise SystemExit(p.returncode)


if __name__ == '__main__':
    main()

from pathlib import Path
import re
R=Path.cwd();P=R/'apps/recognition-lab/runs/phone-experiment/p203-native-setup-bound-recovery-20261029-a1';W=P.parent/'p203-native-setup-bound-recovery-c1-20261029-a1';s=(P/'build-bootstrap.py').read_text();s=s.replace("P=W.parent/'p203-native-setup-metadata-build-20261029-a1'", "P=W.parent/'p203-native-setup-bound-recovery-20261029-a1'")
s=re.sub(r'newnames=\[.*?\]\nfor name in newnames:', "newnames=['apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/test/java/expo/modules/recognitioncpu/CameraCaptureDiagnosticStartedDispatchChecks.java']\nfor name in newnames:",s,flags=re.S)
s=s.replace("(W/'CHARTER.md').write_text(","(W/'BASE_SCOPE.md').write_text(")
s=s.replace('6b4914ed7e0fce8af335dce5e723562740567c5c3ed2c40953763bc5b5fc69ac','8f3419c968e8d137fa4be19434e4f2933202d68fce7eff896b749b569bf8c26d')
# Derived cache-version key uses only the actual five safe public variant flags.
needle="metro=B.APP/'metro.config.js';"
a=s.index(needle);b=s.index("manifest=B.APP/",a)
s=s[:a]+'''flags=dict(EXPO_PUBLIC_APP_ENV='recognition-verification',EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF='1',EXPO_PUBLIC_RECOGNITION_ORIENTATION_V2='1',EXPO_PUBLIC_RECOGNITION_CAPTURE_DIAGNOSTIC='1',EXPO_PUBLIC_RECOGNITION_SETUP_METADATA_ONLY='0')
identity=dict(sourceIndexSha256=source,publicVariantFlags=flags)
cacheVersion='p203-source-variant-'+hashlib.sha256(json.dumps(identity,separators=(',',':')).encode()).hexdigest()
c['safePublicVariantFlags']=flags;c['cacheVersion']=cacheVersion
(W/'charter.json').write_text(json.dumps(c,ensure_ascii=True,indent=2)+'\\n',encoding='utf-8')
metro=B.APP/'metro.config.js';(W/'metro-before.js').write_bytes(B.ex(metro).read_bytes())
config="const {getDefaultConfig}=require('expo/metro-config');\\nconst {captureGraph}=require("+json.dumps(str(W/'metro-observer.cjs'))+");\\nconst crypto=require('node:crypto');\\nconst names="+json.dumps(list(flags))+";\\nconst publicVariantFlags=Object.fromEntries(names.map(name=>[name,process.env[name]||'']));\\nconst identity={sourceIndexSha256:"+json.dumps(source)+",publicVariantFlags};\\nconst config=getDefaultConfig(__dirname,{unstable_beforeAssetSerializationPlugins:[captureGraph]});\\nconfig.cacheVersion='p203-source-variant-'+crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');\\nmodule.exports=config;\\n"
B.ex(metro).write_text(config,encoding='utf-8')
put('cache-partition.json',dict(identity=identity,cacheVersion=cacheVersion,allowlistCompleteForRecognitionApp=True,installedMetroKeySource='node_modules/metro/src/DeltaBundler/getTransformCacheKey.js',installedMetroKeySha256=sha(R/'node_modules/metro/src/DeltaBundler/getTransformCacheKey.js'),cacheDeleted=False,generalEnvironmentRecorded=False))
p=W/'verify-effective-metro.cjs';v=p.read_text().replace("const observer=", "assert.equal(result.config.cacheVersion,c.cacheVersion);\\n const observer=").replace("actualExpoProjectRootLoader:true,", "actualExpoProjectRootLoader:true,cacheVersion:result.config.cacheVersion,safePublicVariantFlags:c.safePublicVariantFlags,");p.write_text(v,encoding='utf-8')
''' +s[b:]
# Prior corrective precheck has fresh filenames already, no alias of old trace.
(W/'build-bootstrap.py').write_text(s,encoding='utf-8')

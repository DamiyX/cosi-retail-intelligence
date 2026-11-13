import pathlib,re
R=pathlib.Path.cwd();S=R/'tools/scripts'
b=(S/'phone-camera-storage-build.py').read_text()
b=b.replace('"""Gate A only: immutable reviewed source, fresh shadow, one bounded offline release. No device."""','"""C7 only: reviewed immutable source, one offline release, no device."""')
b=b.replace("W=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer'","W=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-build-20261019-a1/writer'")
b=b.replace("STAGE=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-c6-build-20261018-a1')","STAGE=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-export-c7-build-20261019-a1')")
b=b.replace("OLD=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-diagnostic-c5-20261018-a1')","OLD=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-c6-build-20261018-a1')")
b=b.replace("C5=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-diagnostic-c5-20261018-a1/writer'","C6=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer'")
b=b.replace('edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d','ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84')
start=b.index('def old_inputs():');end=b.index('def excluded(',start)
b=b[:start]+'''def old_inputs():
    expected=read(C6/'stage-source-index.json');result=[]
    for row in expected:
        p=OLD/row['path'];assert sha(p)==row['sha256'],row['path']
        result.append(dict(path=row['path'],bytes=ex(p).stat().st_size,sha256=sha(p)))
    assert ex(OLD/'app/metro.config.js').read_text(encoding='utf-8')==config(C6)
    return result
'''+b[end:]
b=b.replace("    # Original node_modules stays untouched;",'''    derived=read(ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-source-20261019-a1/writer/runtime-binding.json')['derivedSource']
    assert sha(ROOT/derived['path'])==derived['sha256']=='6458e69dc894f0fb3ac69a3a7966d96f6e42ba8e315f9fe9e39a17972761cf30'
    rel=pathlib.Path(derived['path']).relative_to('apps/mobile');dest=ex(APP/rel);dest.write_bytes((ROOT/derived['path']).read_bytes())
    refreshed.append(dict(path=derived['path'],staged=rel.as_posix(),sha256=derived['sha256'],derived=True))
    # Original node_modules stays untouched;''')
b=b.replace(".replace('p2-camera-build-g3-c4-20261018-a1/writer','p2-camera-storage-c6-build-20261018-a1/writer')",".replace('p2-camera-build-g3-c4-20261018-a1/writer','p2-camera-export-c7-build-20261019-a1/writer')")
b=b.replace("(C5/'release.init.gradle')","(C6/'release.init.gradle')")
b=b.replace("ROOT/'tools/scripts/phone-camera-storage-build-static.py'","ROOT/'tools/scripts/phone-camera-export-c7-build-static.py'")
b=b.replace('recognition-camera-storage-release.apk','recognition-camera-export-release.apk')
b=b.replace("    return c\ndef config",'''    assert sha(ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraEvidenceExportSource.java')==c['derivedSourceSha256']
    assert sha(C6/'recognition-camera-storage-release.apk')=='80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713'
    return c
def config''')
with (S/'phone-camera-export-c7-build.py').open('x',encoding='utf-8') as f:f.write(b)
s=(S/'phone-camera-storage-build-static-a2.py').read_text()
s=s.replace('Gate A exact APK closure.','C7 exact APK closure.')
s=s.replace("'phone-camera-storage-build.py'","'phone-camera-export-c7-build.py'")
s=s.replace("APK=W/'recognition-camera-storage-release.apk';OLD=g.C5/'recognition-camera-diagnostic-release.apk'","APK=W/'recognition-camera-export-release.apk';OLD=g.C6/'recognition-camera-storage-release.apk'")
s=s.replace('d23ce001b944c8a503848b44273dcc246a57db2d0f89fbe99cff94f3f2175a69','80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713')
s=s.replace('|new_service_paths|{LIB}', '|new_service_paths')
s=s.replace("assert len(old_libs)==17 and LIB not in old_libs","assert len(old_libs)==18 and LIB in old_libs")
s=s.replace("==old_libs|{LIB}","==old_libs")
s=s.replace("if info.filename!=LIB and data!=previous:","if data!=previous:")
s=s.replace("g.C5/'resolved-artifacts.json'","g.C6/'resolved-artifacts.json'")
s=s.replace('manifestByteExactC5=True','manifestByteExactC6=True').replace('externalArtifactsExactC5=True','externalArtifactsExactC6=True').replace('old17LibrariesExactExceptBuildId=True','all18LibrariesExactExceptBuildId=True').replace('exactNewLibrary=LIB','unchangedAdapterLibrary=LIB')
s=s.replace("new=info.filename==LIB","adapter=info.filename==LIB,identicalToC6=data==previous,gnuBuildIdOnly=data!=previous")
s=s.replace("                    pos,length=note(data", "                    assert digest(data)=='c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63','JNI adapter bytes changed'\n                    pos,length=note(data")
s=s.replace("    assert 'CAMERA_PUBLISH_API_UNSUPPORTED'", "    assert 'ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84' in all_strings,'Exporter source pin missing from DEX'\n    assert '360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e' in all_strings,'Legacy owner changed/missing'\n    assert 'exportSavedCameraEvidence' in all_strings and 'cancelSavedCameraEvidenceExport' in all_strings,'Camera export bridge missing'\n    assert 'CAMERA_PUBLISH_API_UNSUPPORTED'")
s=s.replace("or 'CameraProofRecoveryChecks' in s", "or 'CameraProofRecoveryChecks' in s or 'CameraEvidenceExportChecks' in s")
s=s.replace("    graphs=list(W.glob('metro-graph-*.json'))", "    graphs=list(W.glob('metro-graph-*.json'))")
s=s.replace("legacyOwnerDoesNotCoverRepairedCode=True)","legacyOwnerDoesNotCoverRepairedCode=True,exporterSourceIndexSha256=g.sha(W/'source-index.json'),exporterPinPresentInDex=True)")
with (S/'phone-camera-export-c7-build-static.py').open('x',encoding='utf-8') as f:f.write(s)
print('Created two fresh C7 build/static helpers; old helpers untouched')

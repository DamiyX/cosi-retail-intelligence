"""Exact C3 generated-app overlay and final merged-manifest contract."""
import copy,hashlib,xml.etree.ElementTree as ET
A='{http://schemas.android.com/apk/res/android}';T='{http://schemas.android.com/tools}'
LIBRARIES=('androidx.camera.extensions.impl','androidx.window.extensions','androidx.window.sidecar')
VENDOR='androidx.camera.extensions.action.VENDOR_ACTION'
GENERATED_BASE_SHA256='445b756ee8ba47c20e945d53d52f90f9c83a95f345ae0d3fbb9732be0fb6a35a'
def canonical(tree):
 return (tree.tag,tuple(sorted(tree.attrib.items())),(tree.text or '').strip(),tuple(canonical(c) for c in tree))
def generate(data):
 assert hashlib.sha256(data).hexdigest()==GENERATED_BASE_SHA256,'Unexpected generated input bytes'
 before=ET.fromstring(data);app=before.findall('application');queries=before.findall('queries');assert len(app)==len(queries)==1
 assert not app[0].findall('uses-library') and len(queries[0].findall('intent'))==1
 assert queries[0][0].find('data').attrib[A+'scheme']=='https'
 text=data.decode('utf-8');assert text.count('  </queries>')==text.count('  </application>')==1
 text=text.replace('  </queries>','    <intent tools:node="remove">\n      <action android:name="'+VENDOR+'"/>\n    </intent>\n  </queries>')
 markers=''.join('    <uses-library android:name="'+name+'" tools:node="remove"/>\n' for name in LIBRARIES)
 text=text.replace('  </application>',markers+'  </application>');after=ET.fromstring(text);restored=copy.deepcopy(after);a=restored.find('application');q=restored.find('queries')
 added=a.findall('uses-library');assert len(added)==3 and [n.attrib for n in added]==[{A+'name':name,T+'node':'remove'} for name in LIBRARIES]
 for n in added:a.remove(n)
 intent=q.findall('intent')[-1];assert intent.attrib=={T+'node':'remove'} and len(intent)==1 and intent[0].attrib=={A+'name':VENDOR};q.remove(intent)
 assert canonical(restored)==canonical(before),'Overlay changed unrelated settings'
 return text.encode('utf-8')
def expected_final(c2):
 tree=copy.deepcopy(c2);app=tree.find('application');libs=app.findall('uses-library');assert len(libs)==3 and {n.attrib[A+'name'] for n in libs}==set(LIBRARIES)
 for n in libs:assert n.attrib[A+'required']=='false';app.remove(n)
 queries=tree.findall('queries');assert len(queries)==1;intents=queries[0].findall('intent');matches=[n for n in intents if any(c.tag=='action' and c.attrib.get(A+'name')==VENDOR for c in n)]
 assert len(matches)==1 and len(matches[0])==1;queries[0].remove(matches[0]);assert len(queries[0])==1
 return tree
def final_absence(tree):
 assert not list(tree.iter('uses-library')),'Device shared library declaration remains'
 assert not list(tree.iter('uses-native-library')),'Vendor native library declaration remains'
 assert not any('VENDOR' in n.attrib.get(A+'name','').upper() for q in tree.findall('queries') for n in q.iter('action')),'Vendor package visibility remains'
 queries=tree.findall('queries');assert len(queries)==1 and len(queries[0])==1
 intent=queries[0][0];assert intent.tag=='intent' and len(intent)==3 and not intent.attrib
 assert sorted((n.tag,tuple(n.attrib.items())) for n in intent)==sorted([('action',((A+'name','android.intent.action.VIEW'),)),('category',((A+'name','android.intent.category.BROWSABLE'),)),('data',((A+'scheme','https'),))]),'Unexpected package visibility'
def compare_final(tree,c2):
 final_absence(tree);assert canonical(tree)==canonical(expected_final(c2)),'Unrelated final manifest delta'
 return dict(optionalSharedLibrariesAbsent=True,vendorNativeLibrariesAbsent=True,vendorVisibilityAbsent=True,allOtherC2ManifestSemanticsExact=True)

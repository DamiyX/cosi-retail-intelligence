const {
  withAppBuildGradle, withSettingsGradle, withGradleProperties, withAndroidManifest, withProjectBuildGradle,
} = require('@expo/config-plugins');

const excluded = [
  'expo-router', 'expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu',
  'expo-dev-menu-interface', 'expo-updates', 'expo-updates-interface',
  'expo-camera', 'expo-audio', 'expo-file-system', 'expo-sqlite', 'expo-secure-store',
  'expo-linking', 'expo-crypto', 'expo-status-bar',
  'react-native-reanimated', 'react-native-worklets', 'react-native-screens',
  'react-native-safe-area-context',
  'react-native-gesture-handler', '@react-native-masked-view/masked-view',
  '@expo/dom-webview', '@expo/log-box', '@expo/ui', 'expo-asset', 'expo-font',
  'expo-keep-awake', 'expo-manifests', 'expo-json-utils',
];
function replaceRequired(source, before, after) {
  if (!source.includes(before)) throw new Error(`Pinned native template changed: ${before}`);
  return source.replace(before, after);
}
function withRecognitionExperiment(config) {
  if (process.env.COSI_RECOGNITION_EXPERIMENT !== '1' ||
      process.env.EXPO_PUBLIC_APP_ENV !== 'recognition-verification') {
    throw new Error('Recognition native plugin requires matching explicit opt-in.');
  }
  const cameraProof = process.env.EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF === '1';
  config = withSettingsGradle(config, c => {
    const values = excluded.filter(s => !cameraProof || s !== 'expo-camera').map(s => `'${s}'`).join(', ');
    c.modResults.contents = replaceRequired(c.modResults.contents,
      'extensions.configure(com.facebook.react.ReactSettingsExtension)',
      `expoAutolinking.searchPaths = ['--', new File(rootDir, '../recognition-native').absolutePath]\nexpoAutolinking.exclude = [${values}]\n\nextensions.configure(com.facebook.react.ReactSettingsExtension)`);
    c.modResults.contents = replaceRequired(c.modResults.contents,
      'ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)',
      `ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand + ['--exclude', ${values}])`);
    // A community autolinking override would bypass the experiment's exclusions.
    c.modResults.contents = replaceRequired(c.modResults.contents,
      'ex.autolinkLibrariesFromCommand()',
      "throw new GradleException('Community autolinking is unsupported for this isolated experiment')");
    c.modResults.contents += "\ninclude ':recognition-cpu-runtime'\nproject(':recognition-cpu-runtime').projectDir = new File(rootDir, '../recognition-native/recognition-experiment/android/cpu-runtime')\n";
    return c;
  });
  config = withAppBuildGradle(config, c => {
    c.modResults.contents = replaceRequired(c.modResults.contents,
      'entryFile = file(["node", "-e", "require(\'expo/scripts/resolveAppEntry\')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())',
      'entryFile = file("${projectRoot}/recognition-entry.js")');
    c.modResults.contents = replaceRequired(c.modResults.contents, 'defaultConfig {',
      "defaultConfig {\n        ndk { abiFilters 'arm64-v8a' }");
    c.modResults.contents = replaceRequired(c.modResults.contents,
      'signingConfigs {',
      `signingConfigs {\n        internalTest {\n            storeFile file(System.getenv('COSI_TEST_KEYSTORE'))\n            storePassword System.getenv('COSI_TEST_STORE_PASSWORD')\n            keyAlias 'recognition-test'\n            keyPassword System.getenv('COSI_TEST_KEY_PASSWORD')\n        }`);
    const releaseAt = c.modResults.contents.indexOf('        release {');
    const tail = c.modResults.contents.slice(releaseAt);
    c.modResults.contents = c.modResults.contents.slice(0, releaseAt) +
      replaceRequired(tail, 'signingConfig signingConfigs.debug', 'signingConfig signingConfigs.internalTest');
    return c;
  });
  config = withGradleProperties(config, c => {
    const properties = {
      'reactNativeArchitectures': 'arm64-v8a',
      'android.minSdkVersion': '24', 'android.compileSdkVersion': '36',
      'android.targetSdkVersion': '36', 'android.buildToolsVersion': '36.0.0',
      'android.enableMinifyInReleaseBuilds': 'true',
      'org.gradle.workers.max': '2', 'org.gradle.parallel': 'false',
      'EX_DEV_CLIENT_NETWORK_INSPECTOR': 'false',
      'expo.gif.enabled': 'false', 'expo.webp.enabled': 'false',
    };
    c.modResults = c.modResults.filter(p => !(p.type === 'property' && Object.hasOwn(properties, p.key)));
    c.modResults.push(...Object.entries(properties).map(([key, value]) => ({ type: 'property', key, value })));
    return c;
  });
  config = withProjectBuildGradle(config, c => {
    const staging = `// Isolated experiment: approved SDK36 tools and task-owned CMake staging.\nsubprojects { child ->\n  child.plugins.withId('com.android.library') {\n    child.extensions.getByName('android').buildToolsVersion = '36.0.0'\n    child.extensions.getByName('android').externalNativeBuild.cmake.buildStagingDirectory = new File(System.getenv('COSI_P1_CXX_ROOT'), child.name)\n  }\n  child.plugins.withId('com.android.application') {\n    child.extensions.getByName('android').externalNativeBuild.cmake.buildStagingDirectory = new File(System.getenv('COSI_P1_CXX_ROOT'), child.name)\n  }\n}\n\n`;
    // The RN root plugin eagerly evaluates Android children; register before it runs.
    c.modResults.contents = replaceRequired(c.modResults.contents, 'apply plugin: "expo-root-project"',
      staging + 'apply plugin: "expo-root-project"');
    return c;
  });
  return withAndroidManifest(config, c => {
    const manifest = c.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = manifest.application[0];
    application.$['android:usesCleartextTraffic'] = 'false';
    application.$['android:allowBackup'] = 'false';
    application['meta-data'] = (application['meta-data'] || []).filter(m =>
      !m.$['android:name'].startsWith('expo.modules.updates.'));
    if (cameraProof) {
      application['meta-data'] = application['meta-data'].filter(m => m.$['android:name'] !== 'com.google.mlkit.vision.DEPENDENCIES');
      application['meta-data'].push({ $: { 'android:name': 'com.google.mlkit.vision.DEPENDENCIES', 'tools:node': 'remove' } });
    }
    application.provider = [{ $: {
      'android:name': 'androidx.startup.InitializationProvider', 'tools:node': 'remove',
    } }];
    application.receiver = [{ $: {
      'android:name': 'androidx.profileinstaller.ProfileInstallReceiver', 'tools:node': 'remove',
    } }];
    // Interpreter CPU execution needs no optional NPU/GPU vendor declarations.
    application['uses-native-library'] = [
      { $: { 'tools:node': 'removeAll' } },
    ];
    manifest['uses-feature'] = [
      { $: { 'android:name': 'android.hardware.npu', 'tools:node': 'remove' } },
    ];
    return c;
  });
}
module.exports = withRecognitionExperiment;
module.exports.excluded = excluded;

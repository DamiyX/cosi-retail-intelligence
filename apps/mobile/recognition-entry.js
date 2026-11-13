import { AppRegistry } from 'react-native';
// Integration entry is chosen before evaluating any legacy root or recovery panel.
const Root = process.env.EXPO_PUBLIC_RECOGNITION_ENROLLMENT === '1'
  ? require('./src/recognitionExperiment/enrollment/EnrollmentEntry').default
  : process.env.EXPO_PUBLIC_RECOGNITION_CAMERA_COMPONENT_INTEGRATION === '1'
  ? require('./src/recognitionExperiment/CameraComponentIntegrationPanel').default
  : require('./src/recognitionExperiment/ExperimentRoot').default;
AppRegistry.registerComponent('main', () => Root);

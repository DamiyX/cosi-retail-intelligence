const path = require('path');
const mobile = path.resolve(__dirname, '../../../apps/mobile');
module.exports = {
  ...require(path.join(mobile, 'jest.config.cjs')),
  rootDir: mobile,
  roots: [__dirname, mobile],
  testMatch: [
    path.join(__dirname, 'panel-session.test.js').replaceAll('\\', '/'),
    '<rootDir>/__tests__/recognitionExperimentCameraOrientationReadiness.test.tsx',
    '<rootDir>/__tests__/recognitionExperimentCameraOrientationEvidenceUi.test.tsx',
    '<rootDir>/__tests__/recognitionExperimentCameraOrientationUi.test.tsx',
    '<rootDir>/__tests__/recognitionExperimentCameraOrientation.test.ts',
  ],
};

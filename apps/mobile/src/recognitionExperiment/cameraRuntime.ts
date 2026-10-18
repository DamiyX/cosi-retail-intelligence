// Isolated camera runtime for pinned Expo Camera 57.0.6 / Modules Core 57.0.18.
// Build provenance verifies these installed deep-import inputs; avoid Expo's eager barrel.
import { createPermissionHook } from 'expo-modules-core';
import CameraManager from 'expo-camera/build/ExpoCameraManager';
export { default as CameraView } from 'expo-camera/build/CameraView';

// Keep the same async wrappers and manager receivers as expo-camera/build/index.js.
export async function getCameraPermissionsAsync() {
  return CameraManager.getCameraPermissionsAsync();
}
export async function requestCameraPermissionsAsync() {
  return CameraManager.requestCameraPermissionsAsync();
}
export const useCameraPermissions = createPermissionHook({
  getMethod: getCameraPermissionsAsync,
  requestMethod: requestCameraPermissionsAsync,
});

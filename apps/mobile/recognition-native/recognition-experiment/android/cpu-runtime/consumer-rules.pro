# JNI symbol is resolved by its exact class and method name. Camera-only adapter.
-keep class expo.modules.recognitioncpu.CameraProofRename { *; }

# Fixed native status bridge uses this exact class/method in the integration variant.
-keep class expo.modules.recognitioncpu.CameraIntegrationOwner { public static java.util.Map status(android.content.Context); }

# Guarded enrollment bridge reflection in the optional component variant.
-keep class expo.modules.recognitioncpu.EnrollmentOwner { *; }

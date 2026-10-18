# Generated P0 phone probes

Only invented identities, authored vectors and generated images. No model,
native runtime, device or private input is executed by these fixtures.
The fixed generated four-arm scenarios live in phoneExperimentGenerated.ts.
image_probes.py creates synthetic EXIF1–8 JPEGs, odd dimensions/colors/borders,
decoded upright RGB, full/cropped Pillow12.3.0 LANCZOS tensor oracles, and separate
generated float32 runtime inputs. It accepts only a new ignored phone-experiment
output directory. Oracles certify the declared laptop fixture construction;
the native runtime/JPEG/resize comparisons are still pending.

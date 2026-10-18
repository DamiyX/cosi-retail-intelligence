import { MODEL_SHA256, policySha256, recipeSha256, sha256 } from './phoneExperimentSchema.ts';
import type { Manifest, Bundle, Frame } from './phoneExperimentSchema.ts';
export const fixtureNames = ['clean', 'missing-arm', 'failed-frame', 'late-frame', 'cancelled'] as const;
export function generatedExperiment(sourceSha256: string, scenario: typeof fixtureNames[number] = 'clean') {
  const vector = (a: number, b?: number) => Array.from({ length: 1024 }, (_, j) => j === a ? 1 : j === b ? .3 : 0);
  const gallery = Array.from({ length: 10 }, (_, i) => ({ productId: 'invented-' + i.toString().padStart(2, '0'),
    orderedReferences: Array.from({ length: 4 }, (_, k) => ({ id: 'ref-' + i + '-' + k, inputSha256: sha256('authored-reference-' + i + '-' + k) })) }));
  const trials = Array.from({ length: 25 }, (_, i) => ({ id: 'trial-' + i.toString().padStart(2, '0'), sessionId: 'session-' + i,
    truth: i < 20 ? { kind: 'KNOWN' as const, productId: gallery[Math.floor(i / 2)].productId } : { kind: 'UNKNOWN' as const },
    condition: 'warm' as const, phase: 'development' as const }));
  const manifest: Manifest = { schemaVersion: 1, kind: 'GENERATED_PHONE_EXPERIMENT', nativeValidated: false, experimentId: 'generated-phone-four-arm',
    modelSha256: MODEL_SHA256, sourceSha256, recipeSha256, policySha256, gallery, trials, specifications: [] };
  const manifestRaw = JSON.stringify(manifest, null, 2) + '\n', manifestHash = sha256(manifestRaw);
  const referenceRecords = gallery.flatMap((p, i) => p.orderedReferences.map((r, k) => ({ ...r, modelSha256: MODEL_SHA256, recipeSha256,
    outcome: { status: 'VECTOR' as const, values: vector(i === 0 && k >= 2 ? 1 : i) } })));
  const trialRecords = trials.map((t, i) => ({ trialId: t.id, sessionId: t.sessionId, terminal: 'COMPLETED' as 'COMPLETED' | 'CANCELLED' | 'DEADLINE', terminalAtMs: 1500,
    frames: Array.from({ length: 3 }, (_, k): Frame => ({ id: t.id + '-frame-' + k, sessionId: t.sessionId, requestAtMs: k * 500,
      capturedAtMs: k * 500 + 10, completedAtMs: k * 500 + 100, ready: true, modelSha256: MODEL_SHA256, recipeSha256,
      inputSha256: sha256('authored-query-' + i + '-' + k), outcome: { status: 'VECTOR', values: vector(i < 2 && k === 0 ? 1 : i < 20 ? Math.floor(i / 2) : 1023, i < 2 && k === 0 ? 0 : undefined) } })) }));
  const armRuns = trials.flatMap(t => (['V21', 'V41', 'V23', 'V43'] as const).map(arm => ({ trialId: t.id, arm, status: 'COMPLETED' as const,
    selectedFrameIds: trialRecords.find(r => r.trialId === t.id)!.frames.slice(0, arm.endsWith('1') ? 1 : 3).map(f => f.id),
    firstActionableMs: 100, stableMs: null, finalMs: 1500, stages: { cameraReadyMs: 0, captureMs: 10, bridgeReadMs: 10, decodeMs: 10, preprocessMs: 10, inferenceMs: 10, searchMs: 10 }, failureCodes: [] } )));
  const bundle: Bundle = { schemaVersion: 1, kind: 'GENERATED_PHONE_NUMERIC_BUNDLE', sourceSha256, manifestSha256: manifestHash,
    modelSha256: MODEL_SHA256, recipeSha256, policySha256, referenceRecords, trialRecords, armRuns };
  if (scenario === 'missing-arm') bundle.armRuns = armRuns.filter(r => !(r.trialId === trials[0].id && r.arm === 'V43'));
  if (scenario === 'failed-frame') trialRecords[0].frames[1].outcome = { status: 'FAILURE', code: 'CAPTURE_FAILURE' };
  if (scenario === 'late-frame') trialRecords[0].frames[2].completedAtMs = 3500;
  if (scenario === 'cancelled') { trialRecords[0].terminal = 'CANCELLED'; trialRecords[0].terminalAtMs = 1500; }
  return { manifest, manifestRaw, manifestHash, bundle, bundleRaw: JSON.stringify(bundle, null, 2) + '\n' };
}

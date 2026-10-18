/** Lab summaries only; private tensors, vectors and images never enter React state. */
export interface PrivateLane { lane: 'control' | 'phone'; denominator: 20; first: number; firstThree: number; complete: boolean }
export interface PrivateResult {
  kind: 'PRIVATE_PHONE_PORTABILITY_RESULTS'; manifestSha256: string; replaySourceSha256: string;
  packetSha256: string; bundleSha256: string; bundleBytes: number; durable: true;
  complete: boolean; records: 80; attemptedInferences: number; totalMs: number; lanes: PrivateLane[];
}
export interface PrivateState { kind: 'PRIVATE_PORTABILITY_STATE'; ready: boolean; interruptedSession: boolean; packetSha256?: string; records?: 40; result?: PrivateResult }
export const offlineGateReasons = ['ELIGIBLE', 'BUSY', 'CLOSED', 'READ_ERROR', 'READ_TIMEOUT', 'STATE_CHANGED', 'MISSING', 'MALFORMED', 'AIRPLANE_REQUIRED', 'POLICY_UNSUPPORTED', 'WIFI_ENABLED', 'BLUETOOTH_ENABLED'] as const;
export interface PrivateOfflineGateStatus {
  kind: 'PRIVATE_OFFLINE_GATE_STATUS'; eligible: boolean; reason: typeof offlineGateReasons[number];
  airplane: number | null; wifiPolicy: number | null; bluetoothPolicy: number | null;
  policySupported: boolean; coherent: boolean; modelCalls: 0; privateStateTouched: false;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid private portability summary.');
  return value as Record<string, unknown>;
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid private evidence hash.');
  return value;
}
function count(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) throw new Error('Invalid private evidence count.');
  return value;
}
export function validatePrivateOfflineGate(value: unknown): PrivateOfflineGateStatus {
  const r = object(value);
  const keys = ['kind', 'eligible', 'reason', 'airplane', 'wifiPolicy', 'bluetoothPolicy', 'policySupported', 'coherent', 'modelCalls', 'privateStateTouched'];
  if (Object.keys(r).length !== keys.length || keys.some(key => !Object.hasOwn(r, key)) || r.kind !== 'PRIVATE_OFFLINE_GATE_STATUS' ||
      typeof r.eligible !== 'boolean' || typeof r.policySupported !== 'boolean' || typeof r.coherent !== 'boolean' ||
      !offlineGateReasons.some(reason => reason === r.reason) || r.modelCalls !== 0 || r.privateStateTouched !== false ||
      r.eligible !== (r.reason === 'ELIGIBLE')) throw new Error('Invalid private offline gate status.');
  const scalar = (value: unknown, max: number): number | null => value === null ? null : count(value, max);
  const airplane = scalar(r.airplane, 1), wifiPolicy = scalar(r.wifiPolicy, 3), bluetoothPolicy = scalar(r.bluetoothPolicy, 2);
  if (r.eligible && (!r.coherent || !r.policySupported || airplane !== 1 || (wifiPolicy !== 0 && wifiPolicy !== 3) ||
      (bluetoothPolicy !== 0 && bluetoothPolicy !== 2))) throw new Error('Incoherent eligible offline gate status.');
  return { kind: 'PRIVATE_OFFLINE_GATE_STATUS', eligible: r.eligible, reason: r.reason as PrivateOfflineGateStatus['reason'],
    airplane, wifiPolicy, bluetoothPolicy, policySupported: r.policySupported, coherent: r.coherent, modelCalls: 0, privateStateTouched: false };
}
export function privateOfflineGateMessage(status: PrivateOfflineGateStatus): string {
  validatePrivateOfflineGate(status);
  if (status.eligible) return 'Saved offline policy is eligible. Verify live radios/network and confirm manually before replay. No private work started.';
  const guidance: Record<Exclude<PrivateOfflineGateStatus['reason'], 'ELIGIBLE'>, string> = {
    BUSY: 'Another operation owns the harness. Wait for it to drain before checking again.',
    CLOSED: 'The harness is closed. Reopen the isolated app before checking again.',
    READ_ERROR: 'Settings could not be read. Keep replay stopped and request review.',
    READ_TIMEOUT: 'Settings reads exceeded the check bound. Keep replay stopped and request review.',
    STATE_CHANGED: 'Settings changed during the check. Keep replay stopped until the state is stable.',
    MISSING: 'Required airplane/radio policy settings are missing. Keep replay stopped and request review.',
    MALFORMED: 'A saved radio value is unsupported. Keep replay stopped and request review.',
    AIRPLANE_REQUIRED: 'Airplane mode must be ON under the reviewed manual procedure.',
    POLICY_UNSUPPORTED: 'Airplane policy does not support the required radios. Keep replay stopped and request review.',
    WIFI_ENABLED: 'Wi-Fi is enabled or overriding airplane mode. Keep replay stopped; follow the reviewed manual procedure.',
    BLUETOOTH_ENABLED: 'Bluetooth is enabled. Keep replay stopped; follow the reviewed manual procedure.',
  };
  return guidance[status.reason as Exclude<PrivateOfflineGateStatus['reason'], 'ELIGIBLE'>];
}
export function validatePrivateResult(value: unknown): PrivateResult {
  const r = object(value);
  if (r.kind !== 'PRIVATE_PHONE_PORTABILITY_RESULTS' || r.durable !== true || r.records !== 80 || typeof r.complete !== 'boolean' ||
      typeof r.totalMs !== 'number' || !Number.isFinite(r.totalMs) || r.totalMs < 0 || !Array.isArray(r.lanes) || r.lanes.length !== 2)
    throw new Error('Private evidence is incomplete or not durable.');
  const lanes = r.lanes.map((value, i): PrivateLane => {
    const lane = object(value);
    if (lane.lane !== (i === 0 ? 'control' : 'phone') || lane.denominator !== 20 || typeof lane.complete !== 'boolean') throw new Error('Invalid private lane.');
    const first = count(lane.first, 20), firstThree = count(lane.firstThree, 20);
    if (first > firstThree) throw new Error('Invalid private rank counts.');
    return { lane: i === 0 ? 'control' : 'phone', denominator: 20, first, firstThree, complete: lane.complete };
  });
  if (r.complete !== lanes.every(l => l.complete)) throw new Error('Private completion does not match both lanes.');
  const bundleBytes = count(r.bundleBytes, 48 * 1024 * 1024);
  if (bundleBytes <= 22) throw new Error('Empty private evidence.');
  return { kind: 'PRIVATE_PHONE_PORTABILITY_RESULTS', manifestSha256: hash(r.manifestSha256), replaySourceSha256: hash(r.replaySourceSha256),
    packetSha256: hash(r.packetSha256), bundleSha256: hash(r.bundleSha256), bundleBytes, durable: true, complete: r.complete, records: 80,
    attemptedInferences: count(r.attemptedInferences, 80), totalMs: r.totalMs, lanes };
}
export function validatePrivateState(value: unknown): PrivateState {
  const r = object(value);
  if (r.kind !== 'PRIVATE_PORTABILITY_STATE' || typeof r.ready !== 'boolean' || typeof r.interruptedSession !== 'boolean') throw new Error('Invalid private recovery state.');
  if (r.ready && r.records !== 40 || r.result && !r.ready) throw new Error('Invalid private recovery counts.');
  const result = r.result ? validatePrivateResult(r.result) : undefined;
  const packetSha256 = r.ready ? hash(r.packetSha256) : undefined;
  if (result && result.packetSha256 !== packetSha256) throw new Error('Private recovery packet mismatch.');
  return { kind: 'PRIVATE_PORTABILITY_STATE', ready: r.ready, interruptedSession: r.interruptedSession, packetSha256, records: r.ready ? 40 : undefined, result };
}
export function validatePrivateImport(value: unknown): string {
  const r = object(value);
  if (r.kind !== 'PRIVATE_PORTABILITY_IMPORTED_PACKET' || r.records !== 40 || count(r.packetBytes, 128 * 1024 * 1024) <= 22) throw new Error('Private packet was not admitted.');
  hash(r.manifestSha256); return hash(r.packetSha256);
}
export function validatePrivateExport(value: unknown, expected: PrivateResult): void {
  const r = object(value); validatePrivateResult(expected);
  if (r.bundleSha256 !== expected.bundleSha256 || r.bundleBytes !== expected.bundleBytes) throw new Error('Private export does not match saved evidence.');
}

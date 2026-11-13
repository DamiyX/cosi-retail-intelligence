import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import EnrollmentPanel from './EnrollmentPanel';
import { readDiagnostic } from './readDiagnostic';
import { reportCompletion, reportCompletionDetails } from './reportCompletion';
import type { EnrollmentBridge } from './protocol';
import { initializationObservation, initializationContinuation, originalInitialization, type InitializationObservation } from './initializationRecovery';

type Native = { enrollmentSetup(): Promise<unknown>; enrollmentCommand(request: Record<string, unknown>): Promise<unknown> };
const native = requireNativeModule<Native>('RecognitionExperiment');
const bridge: EnrollmentBridge = {
  snapshot: () => native.enrollmentCommand({ op: 'snapshot' }),
  recover: sequence => native.enrollmentCommand({ op: 'recover', sequence }),
  enableBarcodes: sequence => native.enrollmentCommand({ op: 'enableBarcodes', sequence }),
  openBarcode: (sequence, product, view, previousReceipt) => native.enrollmentCommand({ op: 'openBarcode', sequence, product, view, previousReceipt }),
  confirmBarcode: (sequence, product, epoch, accept) => native.enrollmentCommand({ op: 'confirmBarcode', sequence, product, epoch, accept }),
  select: (sequence, product) => native.enrollmentCommand({ op: 'select', sequence, product }),
  openCapture: (sequence, product, view, previousReceipt) => native.enrollmentCommand({ op: 'openCapture', sequence, product, view, previousReceipt }),
  reviewCandidate: (sequence, job) => native.enrollmentCommand({ op: 'reviewCandidate', sequence, job }),
  keep: (sequence, job, epoch) => native.enrollmentCommand({ op: 'keep', sequence, job, epoch }),
  decline: (sequence, job, epoch) => native.enrollmentCommand({ op: 'decline', sequence, job, epoch }),
  freeze: sequence => native.enrollmentCommand({ op: 'freeze', sequence }),
  newRevision: sequence => native.enrollmentCommand({ op: 'newRevision', sequence }),
};
function setup(value: unknown): { initialized: boolean; sourceSha256: string; session: string; sequence: number; roster: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_SETUP');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join('|') !== 'initialized|roster|sequence|session|sourceSha256' || typeof row.initialized !== 'boolean' || typeof row.sourceSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(row.sourceSha256)) throw new Error('INVALID_SETUP');
  if (typeof row.session !== 'string' || (row.session !== '' && !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/.test(row.session)) || !Number.isInteger(row.sequence) || (row.sequence as number) < 0 || (row.sequence as number) > 4096) throw new Error('INVALID_SETUP');
  if (!Array.isArray(row.roster) || ![0, 10].includes(row.roster.length) || !row.roster.every(label => typeof label === 'string') || (row.initialized && row.roster.length !== 10)) throw new Error('INVALID_SETUP');
  return { initialized: row.initialized, sourceSha256: row.sourceSha256, session: row.session, sequence: row.sequence as number, roster: row.roster as string[] };
}
export default function EnrollmentEntry() {
  const [value, setValue] = useState<ReturnType<typeof setup> | null>(null);
  const [pending, setPending] = useState(true);
  const [message, setMessage] = useState('Reading saved enrollment setup.');
  const inFlight = useRef(false);
  const [draft, setDraft] = useState(() => Array.from({ length: 10 }, () => ({ name: '', size: '' })));
  const [confirmed, setConfirmed] = useState(false);
  const [experiment, setExperiment] = useState(() => `enrollment-${Date.now().toString(36)}`);
  const reportGeneration = useRef(0);
  const reportWake = useRef<(() => void) | null>(null);
  useEffect(() => () => { reportGeneration.current++; reportWake.current?.(); }, []);
  const [diagnostic, setDiagnostic] = useState('Existing R04 diagnostic has not been requested.');
  const [diagnosticSpent, setDiagnosticSpent] = useState(false);
  const [evidence, setEvidence] = useState('No numerical report requested.');
  const [reconciliation, setReconciliation] = useState<InitializationObservation | null>(null);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('Recovery has not been inspected.');
  async function initializationRecovery(resume: boolean) {
    if (inFlight.current) return;
    if (resume && (!recoveryConfirmed || !reconciliation || !['MATCHING_STAGE', 'DESCRIPTOR_ONLY', 'COMMITTED_MATCH'].includes(reconciliation.status))) return;
    inFlight.current = true; setPending(true); setRecoveryConfirmed(false);
    try {
      const raw = await native.enrollmentCommand(resume ? { op: 'resumeInitialization', observationHash: reconciliation!.observationHash, confirmed: true } : { op: 'reconcileInitialization' });
      if (resume) {
        const result = initializationContinuation(raw); setReconciliation(result.readback);
        setRecoveryMessage(`Continuation: ${result.operation} (${result.primaryCode}); readback: ${result.readback.status} (${result.readback.code}).`);
        if (result.readback.status === 'COMMITTED_MATCH') {
          try { setValue(setup(await native.enrollmentSetup())); setMessage('Saved original roster verified.'); }
          catch { setMessage('Continuation result retained above; setup refresh could not be verified. Do not repeat continuation.'); }
        }
      } else { const result = initializationObservation(raw); setReconciliation(result); setRecoveryMessage(`Inspection: ${result.status} (${result.code}). Original descriptor source: ${result.descriptorSource}; implementation: ${result.implementationSource}.`); }
    } catch { setReconciliation(null); setRecoveryMessage(resume ? 'Continuation result unavailable. Inspect saved state explicitly before any further action.' : 'Read-only inspection unavailable. Saved evidence preserved.'); }
    finally { inFlight.current = false; setPending(false); }
  }
  const setupVerified = value !== null && (!reconciliation || reconciliation.status === 'COMMITTED_MATCH');
  const descriptorPending = !value?.initialized && value?.roster.length === 10;
  const draftLabels = draft.map(row => `${row.name.trim()} / ${row.size.trim()}`);
  const labels = descriptorPending ? value!.roster : draftLabels;
  const labelValid = (label: string) => !/[\u0000-\u001f\u007f-\u009f]/.test(label) && Array.from(label).reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) <= 127 ? 1 : (ch.codePointAt(0) ?? 0) <= 2047 ? 2 : (ch.codePointAt(0) ?? 0) <= 65535 ? 3 : 4), 0) <= 192;
  const draftValid = labels.every(labelValid) && (descriptorPending || draft.every(row => row.name.trim() !== '' && row.size.trim() !== '')) && new Set(labels.map(label => label.toLowerCase())).size === 10;
  async function diagnosticAction(start: boolean) {
    if (inFlight.current || !value || value.session !== 'enrollment-mw4zmxro' || start && diagnosticSpent) return;
    const generation = ++reportGeneration.current; inFlight.current = true; setPending(true);
    if (start) setDiagnosticSpent(true);
    try {
      const result = await native.enrollmentCommand({ op: start ? 'startReadDiagnostic' : 'readDiagnosticStatus' });
      if (generation === reportGeneration.current) setDiagnostic(readDiagnostic(result));
    } catch { if (generation === reportGeneration.current) setDiagnostic('Existing R04 diagnostic unavailable. Preserve the attempt; original R04 remains UNCERTAIN. No action was repeated.'); }
    finally { if (generation === reportGeneration.current) { inFlight.current = false; setPending(false); } }
  }
  async function inspectReportResult(number: number) {
    if (inFlight.current || !value || !value.session) return;
    const session = value.session; const generation = ++reportGeneration.current;
    const current = () => generation === reportGeneration.current;
    inFlight.current = true; setPending(true);
    try {
      const result = await native.enrollmentCommand({ op: 'reportStatus', report: number, session });
      if (current()) setEvidence(reportCompletionDetails(result, number, session));
    } catch { if (current()) setEvidence('Report status could not be verified. Preserve this attempt; no action was repeated.'); }
    finally { if (current()) { inFlight.current = false; setPending(false); } }
  }
  async function report(op: 'accounting' | 'prepareReport' | 'exportReport', reportNumber?: number) {
    if (inFlight.current || !value) return;
    inFlight.current = true; setPending(true); const generation = ++reportGeneration.current;
    const current = () => generation === reportGeneration.current;
    try {
      const status = setup(await native.enrollmentSetup()); if (!current()) return; setValue(status);
      const session = status.session || experiment;
      const result = await native.enrollmentCommand({ op, sequence: status.sequence, session, ...(reportNumber === undefined ? {} : { report: reportNumber }) });
      if (!current()) return;
      if (op !== 'exportReport') { setEvidence(JSON.stringify(result)); return; }
      if (!result || typeof result !== 'object' || Array.isArray(result) || Object.keys(result).sort().join('|') !== 'report|status' || (result as Record<string, unknown>).report !== reportNumber || (result as Record<string, unknown>).status !== 'LOCAL_PICKER_OPENED') throw new Error('INVALID_REPORT_LAUNCH');
      setEvidence('Save screen opened. Waiting for the final local report result.');
      const began = performance.now();
      for (let poll = 0; poll < 300 && current() && performance.now() - began < 300000; poll++) {
        const raw = await native.enrollmentCommand({ op: 'reportStatus', report: reportNumber, session });
        const completion = reportCompletion(raw, reportNumber!, session);
        if (!current()) return;
        if (completion.state === 'VERIFIED' && reportNumber! >= 6 && completion.acknowledgment !== 'ACKNOWLEDGED') { setEvidence(`Saved receipt verified. Original publication acknowledgment unknown. Stop this physical test.\n${reportCompletionDetails(raw, reportNumber!, session)}`); return; }
        if (completion.state === 'VERIFIED') { setEvidence(`${completion.terminal.startsWith('P204T3|') ? 'Report contents verified' : 'Local report save verified'}.\n${reportCompletionDetails(raw, reportNumber!, session)}`); return; }
        if (completion.state !== 'PENDING') { setEvidence(`Local report save could not be verified (${completion.phase}). Preserve this attempt; do not repeat it.\n${reportCompletionDetails(raw, reportNumber!, session)}`); return; }
        await new Promise<void>(resolve => { const timer = setTimeout(() => { reportWake.current = null; resolve(); }, 1000); reportWake.current = () => { clearTimeout(timer); reportWake.current = null; resolve(); }; });
      }
      if (current()) setEvidence('Local report result is still unverified. Preserve this attempt; do not repeat it. Read its saved result explicitly when available.');
    } catch { if (current()) setEvidence('Evidence action could not be verified. Preserve the attempt; no automatic retry.'); }
    finally { if (current()) { inFlight.current = false; setPending(false); } }
  }
  useEffect(() => {
    let live = true; inFlight.current = true;
    void native.enrollmentSetup().then(result => { const parsed = setup(result); if (live) { setValue(parsed); setMessage('Setup verified. No camera opened.'); } }).catch(() => { if (live) setMessage('Setup could not be verified. Preserve saved data.'); }).finally(() => { if (live) { setPending(false); inFlight.current = false; } });
    return () => { live = false; };
  }, []);
  async function action(op: 'initialize' | 'permission') {
    if (inFlight.current) return; inFlight.current = true; setPending(true);
    try { if (op === 'initialize' && (descriptorPending || reconciliation !== null || !confirmed || !draftValid)) throw new Error('CONFIRMED_ROSTER_REQUIRED'); await native.enrollmentCommand(op === 'initialize' ? { op, experiment: value?.session || experiment, labels, confirmed: true } : { op }); setMessage('Native operation completed; checking saved setup.'); try { setValue(setup(await native.enrollmentSetup())); setMessage(op === 'initialize' ? 'Confirmed product and package roster saved. This mapping is now fixed.' : 'Permission setup opened. No photo requested.'); } catch { setMessage('Native operation completed, but setup refresh could not be verified. Inspect saved state; do not repeat the action.'); } }
    catch { setMessage('Action could not be verified. Preserve the attempt; no automatic retry.'); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text accessibilityRole="header">Observed product enrollment</Text>
      <Text>Barcode scanning and four reviewed product views are separate steps. Confirm each code against the selected physical product and package size. P2-04 still requires physical verification.</Text>
      <Text accessibilityLiveRegion="polite">{message}</Text>
      <Text accessibilityRole="header">Original initialization recovery</Text>
      <Text>Only the recorded session {originalInitialization.session} and these exact original identities can be continued. Reconfirm against the physical products before an approved continuation.</Text>
      {originalInitialization.labels.map((label, index) => <Text key={index}>Original {index + 1}: {label}</Text>)}
      <Text accessibilityLiveRegion="polite">{recoveryMessage}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Inspect original initialization without changes" disabled={pending} accessibilityState={{ disabled: pending }} onPress={() => void initializationRecovery(false)} style={{ minHeight: 48, padding: 16 }}><Text>Inspect original initialization</Text></Pressable>
      {reconciliation && <Text>{JSON.stringify(reconciliation)}</Text>}
      {reconciliation && ['MATCHING_STAGE', 'DESCRIPTOR_ONLY', 'COMMITTED_MATCH'].includes(reconciliation.status) && <>
        <Pressable accessibilityRole="checkbox" accessibilityLabel="I reconfirm the exact original ten identities for initialization continuation" disabled={pending} accessibilityState={{ checked: recoveryConfirmed, disabled: pending }} onPress={() => setRecoveryConfirmed(old => !old)} style={{ minHeight: 48, padding: 16 }}><Text>{recoveryConfirmed ? 'Original identities reconfirmed' : 'Reconfirm original identities'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Continue only the matching original initialization" disabled={pending || !recoveryConfirmed} accessibilityState={{ disabled: pending || !recoveryConfirmed }} onPress={() => void initializationRecovery(true)} style={{ minHeight: 48, padding: 16 }}><Text>Continue matching original initialization</Text></Pressable>
      </>}

      {value && !value.initialized && <>
        <Text>Enter ten available products and their package size or distinguishing variant. You may substitute unavailable historical items before confirming this roster. Once initialized, changing a physical product requires a separate session amendment.</Text>
        <TextInput accessibilityLabel="Experiment identifier" value={value.session || experiment} style={{ minHeight: 48 }} editable={!pending && value.session === ''} onChangeText={setExperiment} maxLength={64} />
        {descriptorPending && <Text>A roster descriptor exists. Use the explicit recovery inspection; Initialize cannot continue an existing descriptor.</Text>}
        {descriptorPending ? labels.map((label, index) => <Text key={index}>Product {index + 1}: {label}</Text>) : draft.map((row, index) => <View key={index}>
          <Text>Product {String(index + 1).padStart(2, '0')}</Text>
          <TextInput accessibilityLabel={`Product ${index + 1} name`} value={row.name} placeholder="Product name" style={{ minHeight: 48 }} editable={!pending} maxLength={192} onChangeText={name => { setConfirmed(false); setDraft(old => old.map((item, i) => i === index ? { ...item, name } : item)); }} />
          <TextInput accessibilityLabel={`Product ${index + 1} package size or variant`} value={row.size} placeholder="Package size or distinguishing variant" style={{ minHeight: 48 }} editable={!pending} maxLength={192} onChangeText={size => { setConfirmed(false); setDraft(old => old.map((item, i) => i === index ? { ...item, size } : item)); }} />
        </View>)}
        <Pressable accessibilityRole="checkbox" accessibilityLabel="I confirm these ten physical products and package identities" accessibilityState={{ checked: confirmed, disabled: pending || !draftValid }} disabled={pending || !draftValid} onPress={() => setConfirmed(old => !old)} style={{ minHeight: 48, padding: 16 }}><Text>{confirmed ? 'Ten product identities confirmed' : 'Confirm the ten product identities'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Initialize confirmed ten product slots" accessibilityState={{ disabled: pending || descriptorPending || reconciliation !== null || !confirmed || !draftValid }} disabled={pending || descriptorPending || reconciliation !== null || !confirmed || !draftValid} onPress={() => void action('initialize')} style={{ minHeight: 48, padding: 16 }}><Text>Initialize confirmed ten product slots</Text></Pressable>
      </>}
      {value && setupVerified && <>
        <Text>Numerical evidence includes local product labels, barcodes and private image-derived vectors. Transfer only to local Download when specifically authorized.</Text>
        <Text accessibilityLiveRegion="polite">{evidence}</Text>
        <Text accessibilityLiveRegion="polite">{diagnostic}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Diagnose existing R04 once" accessibilityHint="Select only the previously saved R04 report. This consumes one diagnostic attempt and does not create a report." accessibilityState={{ disabled: pending || diagnosticSpent || value.session !== 'enrollment-mw4zmxro' }} disabled={pending || diagnosticSpent || value.session !== 'enrollment-mw4zmxro'} onPress={() => void diagnosticAction(true)} style={{ minHeight: 48, padding: 16 }}><Text>Diagnose existing R04 once</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Read existing R04 diagnostic result" accessibilityHint="Reads saved diagnostic facts without opening a file picker." accessibilityState={{ disabled: pending || value.session !== 'enrollment-mw4zmxro' }} disabled={pending || value.session !== 'enrollment-mw4zmxro'} onPress={() => void diagnosticAction(false)} style={{ minHeight: 48, padding: 16 }}><Text>Read existing R04 diagnostic result</Text></Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Inspect controlled storage accounting" disabled={pending} accessibilityState={{ disabled: pending }} onPress={() => void report('accounting')} style={{ minHeight: 48, padding: 16 }}><Text>Inspect controlled storage accounting</Text></Pressable>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(number => <View key={number}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Read saved export result R0${number}`} disabled={pending || !value.session} accessibilityState={{ disabled: pending || !value.session }} onPress={() => void inspectReportResult(number)} style={{ minHeight: 48, padding: 16 }}><Text>Read saved export result R0{number}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Prepare numerical report R0${number}`} disabled={pending} accessibilityState={{ disabled: pending }} onPress={() => void report('prepareReport', number)} style={{ minHeight: 48, padding: 16 }}><Text>Prepare R0{number} once{number === 6 ? ': existing Fanta qualification' : number === 7 ? ': complete gallery before restart' : number === 8 ? ': complete gallery after restart' : ''}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Export prepared report R0${number} locally`} disabled={pending} accessibilityState={{ disabled: pending }} onPress={() => void report('exportReport', number)} style={{ minHeight: 48, padding: 16 }}><Text>Export prepared R0{number} to local Download</Text></Pressable>
        </View>)}
      </>}
      {value?.initialized && setupVerified && <Pressable accessibilityRole="button" accessibilityLabel="Open camera permission setup" accessibilityState={{ disabled: pending }} disabled={pending} onPress={() => void action('permission')} style={{ minHeight: 48, padding: 16 }}><Text>Open camera permission setup</Text></Pressable>}
    </ScrollView>
    {value?.initialized && setupVerified && <EnrollmentPanel bridge={bridge} expectedSource={value.sourceSha256} />}
  </>;
}

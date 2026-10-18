"""NON-OPERATIONAL plan/observation validation only. No subprocess, ADB, UI or radio API."""
import pathlib,json,re,copy
ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilitySource.java'
def source_sha():return SOURCE.read_text().split('SHA256="')[1].split('"')[0]
def validate_observation(row):
 required={'kind','sourceSha256','deviceBindingSha256','humanConfirmed','nativeStatus','wifiLive','bluetoothLive','cellularLive','defaultNetwork','tetherUpstream','savedMobileData','observedAtMs','readWindowMs'}
 if not isinstance(row,dict) or set(row)!=required or row['kind']!='PRIVATE_OFFLINE_DEVICE_OBSERVATION' or row['sourceSha256']!=source_sha() or not isinstance(row['deviceBindingSha256'],str) or not re.fullmatch('[0-9a-f]{64}',row['deviceBindingSha256']) or row['humanConfirmed']is not True:raise ValueError('DEVICE_BINDING_OR_HUMAN_CONFIRMATION_REQUIRED')
 n=row['nativeStatus'];keys={'kind','eligible','reason','airplane','wifiPolicy','bluetoothPolicy','policySupported','coherent','modelCalls','privateStateTouched'}
 if not isinstance(n,dict) or set(n)!=keys or n['kind']!='PRIVATE_OFFLINE_GATE_STATUS' or n['eligible']is not True or n['reason']!='ELIGIBLE' or n['policySupported']is not True or n['coherent']is not True or n['privateStateTouched']is not False or type(n['modelCalls'])is not int or n['modelCalls']!=0:raise ValueError('ACTUAL_NATIVE_DIAGNOSTIC_REQUIRED')
 # Bind the actual production gate result; this utility does not parse/reimplement radio policy.
 if type(n['airplane'])is not int or n['airplane']!=1 or type(n['wifiPolicy'])is not int or n['wifiPolicy']not in [0,3] or type(n['bluetoothPolicy'])is not int or n['bluetoothPolicy']not in [0,2]:raise ValueError('NATIVE_POLICY_STATUS_MISMATCH')
 if row['wifiLive']!='DISABLED' or row['bluetoothLive']!='STATE_OFF' or row['cellularLive']!='POWER_OFF' or row['defaultNetwork']!='NONE' or row['tetherUpstream']!='NONE':raise ValueError('LIVE_OFFLINE_EVIDENCE_REQUIRED')
 if row['savedMobileData']not in [None,0,1] or type(row['savedMobileData'])is bool:raise ValueError('MALFORMED_DATA_PREFERENCE_DIAGNOSTIC')
 if type(row['observedAtMs'])is not int or row['observedAtMs']<0 or type(row['readWindowMs'])is not int or not 0<=row['readWindowMs']<=3000:raise ValueError('LIVE_OBSERVATION_UNBOUNDED')
 return True
def validate_monitor(rows):
 if not rows:raise ValueError('LIVE_MONITOR_EMPTY')
 for row in rows:validate_observation(row)
 times=[row['observedAtMs'] for row in rows]
 if times[-1]-times[0]>1500000 or any(b<=a or b-a>5000 for a,b in zip(times,times[1:])):raise ValueError('LIVE_MONITOR_DRIFT_OR_GAP')
 if len({row['deviceBindingSha256'] for row in rows})!=1:raise ValueError('LIVE_DEVICE_BINDING_DRIFT')
 return True
def plan():
 return dict(kind='DRAFT_NON_OPERATIONAL_OFFLINE_GATE_DEVICE_PLAN',sourceSha256=source_sha(),operationalAuthority=False,deviceCommandsExecuted=0,settingsWritesAllowed=False,
  liveRequired=['human explicit airplane/radios/tether confirmation','native Check private offline gate eligible without private state work','Wi-Fi service disabled','Bluetooth STATE_OFF','cellular POWER_OFF','no active default network','no tether upstream'],
  readOnlyCommandDescriptions=['settings get global airplane_mode_on/airplane_mode_radios/wifi_on/bluetooth_on/mobile_data','dumpsys wifi selected state lines only','dumpsys bluetooth_manager STATE_OFF/adapter state only','dumpsys telephony.registry POWER_OFF markers only; retain no identifiers','dumpsys connectivity active default network only','dumpsys tethering upstream status only'],
  limits=dict(diagnosticReads=8,nativeReadLatenessMs=1000,hostObservationWindowMs=3000,hostMaximumGapMs=5000,replaySeconds=1500,maxInferences=80,queryDenominatorPerLane=20,maxReplays=1,maxNumericalExports=1,hostImportExportObservationSeconds=120,cancellationDrainObservationSeconds=120),
  failure='Unknown/reading drift/timeout/live-enabled state: stop admission or request native cancellation once, keep offline and observe owned drain within bound. No new replay/export/install/reset; if uncertain return HIGH for review. No atomic privacy/native preemption claim.')
if __name__=='__main__':print(json.dumps(plan(),indent=2))

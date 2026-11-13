/** Exact original D-066 request; metadata is never a model input. */
export const originalInitialization = {
  "session": "enrollment-mw4zmxro",
  "source": "3d9ad3427b4f192d1a3cf8f918e1403ff8e3d82fe803724cca4541d033d11a4f",
  "labels": [
    "Fanta Orange / 33cl",
    "Airport air freshener / Cherry Blossom,  300ml",
    "GM Whiteboard cleaner / 8.44 fl  oz",
    "CWAY water / 750ml",
    "CWAY water / 600ml",
    "Hair brush / Wooden red",
    "Freshglow Bar soap / Milk & papaya",
    "NIVEVA MEN roll-on / Dry Impact 72H, 50ml",
    "Itel light bulb / 10W",
    "Godrej aer / Lemon Tangy  Delight, 10g"
  ]
} as const;
export const originalDescriptorHash = 'bad6f76c641f61ed686025699ceb40dd1c91e924e7396f66dfdb08e6e9b176e2';
export const originalRosterHash = 'b4ebbcf8994c2a44b11a650971ce0f23e12a181c3d5f0ef75010df6fac33e26c';
const statuses = ['ABSENT', 'MATCHING_STAGE', 'DESCRIPTOR_ONLY', 'COMMITTED_MATCH', 'CONFLICT', 'INVALID_STAGE', 'JOURNAL_UNCERTAIN', 'UNKNOWN'] as const;
export type InitializationObservation = {
 status: typeof statuses[number]; phase: 'OBSERVE'; code: string; implementationSource: string; descriptorSource: string;
 expectedDescriptorHash: string; expectedRosterHash: string; observationHash: string; descriptorHash: string; stageHash: string;
 descriptorMatch: boolean; journalMatch: boolean; journalVerified: boolean; publishedIds: number[]; stagedIds: number[]; sequence: number; consumedEvents: number; head: string;
 descriptorIdentity: string; stageIdentity: string; journalIdentity: string;
};
function object(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INITIALIZATION_RESPONSE');
 return value as Record<string, unknown>;
}
function keys(row: Record<string, unknown>, expected: string[]) {
 if (Object.keys(row).sort().join('|') !== expected.sort().join('|')) throw new Error('INITIALIZATION_KEYS');
}
export function initializationObservation(value: unknown): InitializationObservation {
 const r = object(value);
 keys(r, ['status','phase','code','implementationSource','descriptorSource','expectedDescriptorHash','expectedRosterHash','observationHash','descriptorHash','stageHash','descriptorMatch','journalMatch','journalVerified','publishedIds','stagedIds','sequence','consumedEvents','head','descriptorIdentity','stageIdentity','journalIdentity']);
 if (!statuses.includes(r.status as InitializationObservation['status']) || r.phase !== 'OBSERVE' || typeof r.code !== 'string' || !/^[A-Z_]{1,64}$/.test(r.code)) throw new Error('INITIALIZATION_STATUS');
 for (const key of ['implementationSource','descriptorSource','expectedDescriptorHash','expectedRosterHash','head']) if (typeof r[key] !== 'string' || !/^[0-9a-f]{64}$/.test(r[key] as string)) throw new Error('INITIALIZATION_DIGEST');
 for (const key of ['observationHash','descriptorHash','stageHash','journalIdentity']) if (typeof r[key] !== 'string' || !/^(?:[0-9a-f]{64})?$/.test(r[key] as string)) throw new Error('INITIALIZATION_DIGEST');
 for (const key of ['descriptorIdentity','stageIdentity']) if (typeof r[key] !== 'string' || (r[key] as string).length > 512 || !/^[0-9:|]*$/.test(r[key] as string)) throw new Error('INITIALIZATION_IDENTITY');
 for (const key of ['sequence','consumedEvents']) if (!Number.isInteger(r[key]) || (r[key] as number) < 0 || (r[key] as number) > 4096) throw new Error('INITIALIZATION_SEQUENCE');
 if (typeof r.descriptorMatch !== 'boolean' || typeof r.journalMatch !== 'boolean' || r.descriptorSource !== originalInitialization.source || (r.sequence as number) > (r.consumedEvents as number)) throw new Error('INITIALIZATION_BINDING');
 if (['MATCHING_STAGE','DESCRIPTOR_ONLY','COMMITTED_MATCH'].includes(r.status as string) && (!r.descriptorMatch || !(r.observationHash as string))) throw new Error('INITIALIZATION_MATCH');
 if (r.expectedDescriptorHash !== originalDescriptorHash || r.expectedRosterHash !== originalRosterHash || typeof r.journalVerified !== 'boolean') throw new Error('INITIALIZATION_REQUEST_HASH');
 for (const key of ['publishedIds','stagedIds']) {
  const ids = r[key]; if (!Array.isArray(ids) || ids.length > 4096 || !ids.every((n: unknown, i: number) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 4096 && (i === 0 || (ids[i - 1] as number) < (n as number)))) throw new Error('INITIALIZATION_IDS');
 }
 const published = r.publishedIds as number[], staged = r.stagedIds as number[];
 const maximum = Math.max(0, ...published, ...staged);
 if (maximum !== r.consumedEvents || (r.journalVerified && (staged.length !== 0 || published.length !== r.sequence || published.some((id, i) => id !== i + 1)))) throw new Error('INITIALIZATION_ID_BINDING');
 if (r.status === 'MATCHING_STAGE' && (r.stageHash !== originalDescriptorHash || r.descriptorHash !== '')) throw new Error('INITIALIZATION_STAGE_BINDING');
 if (['DESCRIPTOR_ONLY','COMMITTED_MATCH'].includes(r.status as string) && (r.descriptorHash !== originalDescriptorHash || r.stageHash !== '')) throw new Error('INITIALIZATION_DESCRIPTOR_BINDING');
 if (['ABSENT','MATCHING_STAGE','DESCRIPTOR_ONLY','COMMITTED_MATCH'].includes(r.status as string) && !r.journalVerified) throw new Error('INITIALIZATION_JOURNAL_UNVERIFIED');
 if (r.status === 'COMMITTED_MATCH' && (!r.journalMatch || (r.sequence as number) < 1)) throw new Error('INITIALIZATION_JOURNAL');
 if (['MATCHING_STAGE','DESCRIPTOR_ONLY','ABSENT'].includes(r.status as string) && (r.sequence !== 0 || r.consumedEvents !== 0 || r.journalMatch)) throw new Error('INITIALIZATION_EMPTY');
 return r as InitializationObservation;
}
export function initializationContinuation(value: unknown): { operation: string; primaryCode: string; readback: InitializationObservation } {
 const r = object(value); keys(r, ['operation','primaryCode','readback']);
 if (!['REFUSED','ALREADY_COMPLETE','CONTINUED','UNCERTAIN'].includes(r.operation as string) || typeof r.primaryCode !== 'string' || !/^[A-Z_]{1,64}$/.test(r.primaryCode)) throw new Error('INITIALIZATION_RESULT');
 return { operation: r.operation as string, primaryCode: r.primaryCode, readback: initializationObservation(r.readback) };
}

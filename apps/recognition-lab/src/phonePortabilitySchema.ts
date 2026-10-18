import { z } from 'zod';
const hash = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const portabilityFrameSchema = z.object({ id, role: z.enum(['reference', 'query']), productId: id,
  tensorSha256: hash }).strict();
export const portabilityObservationSchema = z.discriminatedUnion('kind', [
  z.object({ id, lane: z.enum(['control', 'phone']), kind: z.literal('vector'), values: z.array(z.number().finite()).length(1024), tensorSha256: hash }).strict(),
  z.object({ id, lane: z.enum(['control', 'phone']), kind: z.literal('failure'), code: z.enum(['CANCELLED', 'NOT_RUN', 'TIMEOUT', 'FRAME_FAILED']) }).strict(),
]);
export const portabilityInputSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('PRIVATE_PORTABILITY_NUMERICAL_COMPARISON'),
  manifestSha256: hash, replaySourceSha256: hash, packetSha256: hash, resultSha256: hash, modelSha256: z.literal('bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40'),
  frames: z.array(portabilityFrameSchema).length(40), observations: z.array(portabilityObservationSchema).length(80),
  baseline: z.array(z.object({ id, values: z.array(z.number().finite()).length(1024) }).strict()).length(40),
  tensorComparisons: z.array(z.object({ id, unequalComponents: z.number().int().min(0).max(150528), maxAbsoluteDifference: z.number().finite().min(0).max(1),
    meanAbsoluteDifference: z.number().finite().min(0).max(1) }).strict()).max(40),
}).strict();
export type PortabilityInput = z.infer<typeof portabilityInputSchema>;
export function parsePortabilityJson(raw: Uint8Array): unknown {
  if (raw.length > 8 * 1024 * 1024) throw Error('PORTABILITY_INPUT_BOUND');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(raw); let at = 0, nodes = 0;
  const whitespace = () => { while (/[ \r\n\t]/.test(text[at] ?? '\u0000')) at++; };
  const string = (): string => {
    const start = at++; let escaped = false;
    while (at < text.length) { const c = text[at++]; if (c === '"' && !escaped) return JSON.parse(text.slice(start, at)) as string;
      if (c === '\\' && !escaped) escaped = true; else escaped = false; }
    throw Error('PORTABILITY_JSON_STRING');
  };
  const value = (depth: number): void => {
    whitespace(); if (depth > 32 || ++nodes > 150000) throw Error('PORTABILITY_JSON_BOUND');
    const c = text[at];
    if (c === '"') { string(); return; }
    if (c === '{' || c === '[') {
      at++; whitespace(); const close = c === '{' ? '}' : ']', keys = new Set<string>();
      if (text[at] === close) { at++; return; }
      while (at < text.length) {
        if (c === '{') { whitespace(); if (text[at] !== '"') throw Error('PORTABILITY_JSON_KEY'); const key = string();
          if (keys.has(key)) throw Error('PORTABILITY_JSON_DUPLICATE'); keys.add(key); whitespace(); if (text[at++] !== ':') throw Error('PORTABILITY_JSON_COLON'); }
        value(depth + 1); whitespace(); if (text[at] === close) { at++; return; }
        if (text[at++] !== ',') throw Error('PORTABILITY_JSON_SEPARATOR');
      }
      throw Error('PORTABILITY_JSON_TRUNCATED');
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(at));
    if (!token) throw Error('PORTABILITY_JSON_VALUE'); at += token[0].length;
  };
  value(0); whitespace(); if (at !== text.length) throw Error('PORTABILITY_JSON_TRAILING'); return JSON.parse(text);
}
export function validatePortabilityInput(input: unknown) {
  const p = portabilityInputSchema.parse(input);
  const ids = new Set(p.frames.map(f => f.id)), products = new Set(p.frames.map(f => f.productId));
  if (ids.size !== 40 || products.size !== 10 || p.frames.filter(f => f.role === 'reference').length !== 20 ||
      [...products].some(product => p.frames.filter(f => f.productId === product && f.role === 'reference').length !== 2 || p.frames.filter(f => f.productId === product && f.role === 'query').length !== 2)) throw Error('PORTABILITY_FIXED_GALLERY');
  if (new Set(p.baseline.map(b => b.id)).size !== 40 || p.baseline.some(b => !ids.has(b.id))) throw Error('PORTABILITY_BASELINE_IDS');
  const expected = ['control', 'phone'].flatMap(lane => p.frames.map(f => `${lane}/${f.id}`));
  if (p.observations.some((o, i) => `${o.lane}/${o.id}` !== expected[i])) throw Error('PORTABILITY_RECORD_ORDER');
  if (p.observations.some(o => o.kind === 'vector' && o.lane === 'control' && o.tensorSha256 !== p.frames.find(f => f.id === o.id)!.tensorSha256)) throw Error('PORTABILITY_CONTROL_TENSOR_PIN');
  const paired = p.frames.filter(f => p.observations.filter(o => o.id === f.id && o.kind === 'vector').length === 2).map(f => f.id);
  if (new Set(p.tensorComparisons.map(t => t.id)).size !== paired.length || p.tensorComparisons.length !== paired.length || p.tensorComparisons.some(t => !paired.includes(t.id))) throw Error('PORTABILITY_TENSOR_PAIR_COVERAGE');
  return p;
}

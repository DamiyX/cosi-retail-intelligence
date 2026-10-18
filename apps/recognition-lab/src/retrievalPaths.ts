import { lstatSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LabError } from './schema.ts';
import { sha256 } from './provenance.ts';

export const retrievalLab = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function within(root: string, path: string) {
  const rel = relative(root, path);
  return rel === '' || !isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\');
}
function existing(path: string) {
  try { return lstatSync(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
const key = (path: string) => process.platform === 'win32' ? path.toLowerCase() : path;
function physicalIdentity(path: string) {
  const stat = statSync(path, { bigint: true });
  return stat.dev + ':' + stat.ino;
}
function destinationIdentity(path: string) {
  // Windows realpath can retain 8.3 names. Bind a missing destination to its
  // nearest existing physical ancestor plus remaining components too, so two
  // aliases of a future file cannot pass distinct-target preflight.
  let ancestor = resolve(path); const suffix: string[] = [];
  while (!existing(ancestor)) { suffix.unshift(basename(ancestor)); ancestor = dirname(ancestor); }
  return physicalIdentity(ancestor) + ':' + key(suffix.join('/'));
}
function noLinks(path: string, code: string) {
  let current = parse(path).root;
  for (const part of relative(current, path).split(sep)) {
    current = resolve(current, part); const stat = existing(current);
    if (stat && (stat.isSymbolicLink() || stat.isFile() && stat.nlink > 1))
      throw new LabError(code, 'Linked paths prohibited');
    if (current !== path && stat && !stat.isDirectory()) throw new LabError(code, 'Ancestor must be directory');
  }
}
export function inputPath(path: string, directory = false): string {
  const location = resolve(path);
  if (!within(retrievalLab, location)) throw new LabError('INPUT_OUTSIDE_LAB', 'Explicit inputs must remain inside lab');
  noLinks(location, 'INPUT_LINKED');
  const stat = existing(location);
  if (!stat || (directory ? !stat.isDirectory() : !stat.isFile())) throw new LabError('INPUT_UNAVAILABLE', 'Input unavailable');
  return location;
}
export function readJson(path: string) {
  const bytes = readFileSync(inputPath(path));
  return { value: JSON.parse(bytes.toString('utf8')) as unknown, sha256: sha256(bytes) };
}
// All targets are preflighted together before any creation/write. Cache shares
// the ignored runs ceiling with reports, even when it is only being read.
export function outputTargets(directory: string, names: string[], extraFiles: string[] = []) {
  const out = resolve(directory); const root = resolve(retrievalLab, 'runs');
  const paths = [...names.map(name => resolve(out, name)), ...extraFiles.map(p => resolve(p))];
  if (!within(root, out) || paths.some(p => !within(root, p))) throw new LabError('OUTPUT_OUTSIDE_RUNS', 'Outputs require ignored runs');
  if (new Set(paths.map(p => process.platform === 'win32' ? p.toLowerCase() : p)).size !== paths.length)
    throw new LabError('OUTPUT_COLLISION', 'Output targets must be distinct');
  for (const location of [out, ...paths]) {
    noLinks(location, 'OUTPUT_LINKED'); const stat = existing(location);
    if (stat && (location === out ? !stat.isDirectory() : !stat.isFile())) throw new LabError('OUTPUT_LINKED', 'Invalid output target');
  }
  if (new Set(paths.map(destinationIdentity)).size !== paths.length)
    throw new LabError('OUTPUT_COLLISION', 'Output targets must be physically distinct');
  return { out, paths, create: () => { for (const path of paths) mkdirSync(dirname(path), { recursive: true }); } };
}
export function cacheBytes(path: string): string | null {
  // Call outputTargets before this so a linked/missing target cannot turn cache
  // fallback into an unconfined read. ENOENT alone means absent cache.
  try { return readFileSync(path, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new LabError('CACHE_IO', 'Cache could not be read');
  }
}
export function protectInputs(targets: string[], inputs: string[]) {
  const protectedPaths = new Set(inputs.map(path => key(realpathSync(resolve(path)))));
  const protectedFiles = new Set(inputs.map(physicalIdentity));
  if (targets.some(path => protectedPaths.has(key(existing(path) ? realpathSync(path) : resolve(path))) ||
    existing(path) && protectedFiles.has(physicalIdentity(path))))
    throw new LabError('OUTPUT_INPUT_COLLISION', 'Outputs cannot replace source inputs');
}

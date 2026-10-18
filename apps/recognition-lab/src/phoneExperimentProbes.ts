import { unit, cosine } from './phoneExperimentEvaluation.ts';
export const RUNTIME_TOLERANCES = Object.freeze({ version: 'runtime-normalized-v1', maxComponentError: 1e-4, maxCosineDistance: 1e-5 });
export function compareRuntimeVectors(laptop: number[], candidate: number[]) {
  if (laptop.length !== 1024 || candidate.length !== 1024) throw Error('PHONE_VECTOR_DIMENSION');
  const a = unit(laptop), b = unit(candidate);
  const maxComponentError = Math.max(...a.map((v, i) => Math.abs(v - b[i]))), cosineDistance = Math.max(0, 1 - cosine(a, b));
  return { maxComponentError, cosineDistance, rawMaxAbsoluteDifference: Math.max(...laptop.map((v, i) => Math.abs(v - candidate[i]))),
    rawMeanAbsoluteDifference: laptop.reduce((sum, v, i) => sum + Math.abs(v - candidate[i]), 0) / laptop.length,
    passesDeclaredTolerance: maxComponentError <= RUNTIME_TOLERANCES.maxComponentError && cosineDistance <= RUNTIME_TOLERANCES.maxCosineDistance,
    thresholds: RUNTIME_TOLERANCES, nativeValidated: false, imagePipelineValidated: false };
}
export interface Geometry { imageWidth: number; imageHeight: number; previewWidth: number; previewHeight: number; rotation: 0 | 90 | 180 | 270; mirrored: boolean }
export function mapGuide(g: Geometry) {
  const { imageWidth: w, imageHeight: h, previewWidth: pw, previewHeight: ph } = g;
  if (![w, h, pw, ph].every(v => Number.isSafeInteger(v) && v > 0 && v <= 100000) || ![0, 90, 180, 270].includes(g.rotation) || typeof g.mirrored !== 'boolean') throw Error('PHONE_GEOMETRY');
  const swapped = g.rotation === 90 || g.rotation === 270, ow = swapped ? h : w, oh = swapped ? w : h;
  const scale = Math.max(pw / ow, ph / oh), dx = (ow * scale - pw) / 2, dy = (oh * scale - ph) / 2;
  const bounds = { left: (pw * .1 + dx) / scale, top: (ph * .1 + dy) / scale,
    right: (pw * .9 + dx) / scale, bottom: (ph * .9 + dy) / scale };
  if (g.mirrored) [bounds.left, bounds.right] = [ow - bounds.right, ow - bounds.left];
  const padX = (bounds.right - bounds.left) * .05, padY = (bounds.bottom - bounds.top) * .05;
  const effective = { left: Math.max(0, Math.floor(bounds.left - padX)), top: Math.max(0, Math.floor(bounds.top - padY)),
    right: Math.min(ow, Math.ceil(bounds.right + padX)), bottom: Math.min(oh, Math.ceil(bounds.bottom + padY)) };
  const inverse = (x: number, y: number) => g.rotation === 90 ? [y, h - x] : g.rotation === 180 ? [w - x, h - y] : g.rotation === 270 ? [w - y, x] : [x, y];
  const corners = [[effective.left, effective.top], [effective.right, effective.top], [effective.left, effective.bottom], [effective.right, effective.bottom]].map(([x, y]) => inverse(x, y));
  return { orientedWidth: ow, orientedHeight: oh, guide: bounds, effectiveCrop: effective,
    encodedCrop: { left: Math.min(...corners.map(p => p[0])), top: Math.min(...corners.map(p => p[1])), right: Math.max(...corners.map(p => p[0])), bottom: Math.max(...corners.map(p => p[1])) },
    scale, offsetX: dx, offsetY: dy, coordinateConvention: 'half-open pixel-edge bounds; upright EXIF-normalized crop', nativeValidated: false };
}
export function letterboxGeometry(width: number, height: number) {
  if (![width, height].every(v => Number.isSafeInteger(v) && v > 0 && v <= 50000000)) throw Error('PHONE_GEOMETRY');
  const scale = Math.min(224 / width, 224 / height), resizedWidth = Math.max(1, Math.floor(width * scale + .5)), resizedHeight = Math.max(1, Math.floor(height * scale + .5));
  const left = Math.floor((224 - resizedWidth) / 2), top = Math.floor((224 - resizedHeight) / 2);
  return { resizedWidth, resizedHeight, left, top, rightPadding: 224 - resizedWidth - left, bottomPadding: 224 - resizedHeight - top };
}

import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';
import { importDataset, IntegrityError } from './importer.ts';
import { CurationError, validateCuration, challengeTags } from './curation.ts';
import type { Curation } from './curation.ts';
import type { Entry, Split } from './schema.ts';
import { sha256 } from './provenance.ts';

const splits: Split[] = ['development', 'calibration', 'holdout'];
// Coverage policy is lab preparation guidance, never an accuracy threshold.
export const coveragePolicy = {
  version: 'r1-capture-coverage-v1', minEnrolledProducts: 30, maxEnrolledProducts: 50,
  minReferenceViewsPerProduct: 2, minKnownQueriesPerProductPerSplit: 2,
  unknownRatioMin: 0.15, unknownRatioMax: 0.25,
  lighting: ['bright', 'normal', 'dim', 'glare', 'mixed'],
  views: ['front', 'left', 'right', 'tilt', 'side', 'cashier'],
  occlusion: ['none', 'partial'],
  challengeTags: challengeTags.filter(t => t !== 'manual-choice-required'),
};
const limitations = [
  'Hashes and declared family IDs do not prove independent physical captures or detect all transformed duplicates.',
  'Image usability, lawful rights and seal-before-tuning are recorded human attestations, not automated proof.',
  'No image decoding, sharpness assessment, encoder, recognition scores, device or accuracy acceptance was performed.',
  'A checksum seal detects changes; it cannot prove holdout secrecy or prevent human retuning.',
  'Synthetic and authored test fixtures cannot establish actual real-dataset acceptance; coordinator review remains required.',
];
type Stage = 'review' | 'coverage' | 'seal' | 'realData';
interface Gap { stage: Stage; code: string; entryId?: string; productId?: string; split?: Split; stratum?: string }
const rate = (numerator: number, denominator: number) => ({ numerator, denominator, value: denominator ? numerator / denominator : null });
const counts = (values: string[]) => Object.fromEntries([...new Set(values)].sort().map(v => [v, values.filter(x => x === v).length]));
const unique = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => v !== null))].sort();

function coverage(entries: Entry[], curation: Curation, gaps: Gap[], declaredProducts: number) {
  const refs = entries.filter(e => e.role === 'reference');
  const queries = entries.filter(e => e.role === 'query');
  const enrolled = unique(refs.map(e => e.productId));
  const reviews = new Map(curation.entries.map(r => [r.entryId, r]));
  const families = (items: Entry[]) => ({
    source: unique(items.map(e => reviews.get(e.id)?.sourceFamily ?? null)).length,
    physical: unique(items.map(e => reviews.get(e.id)?.physicalFamily ?? null)).length,
  });
  if (enrolled.length < coveragePolicy.minEnrolledProducts || enrolled.length > coveragePolicy.maxEnrolledProducts)
    gaps.push({ stage: 'coverage', code: 'ENROLLED_PRODUCT_TARGET' });
  const population = (items: Entry[], split?: Split) => {
    const unknown = items.filter(e => !e.known).length;
    if (!items.length) gaps.push({ stage: 'coverage', code: 'QUERY_SPLIT_EMPTY', ...(split ? { split } : {}) });
    const ratio = rate(unknown, items.length);
    if (ratio.value === null || ratio.value < coveragePolicy.unknownRatioMin || ratio.value > coveragePolicy.unknownRatioMax)
      gaps.push({ stage: 'coverage', code: 'UNKNOWN_RATIO_TARGET', ...(split ? { split } : {}) });
    return { total: items.length, known: items.length - unknown, unknown,
      unknownRatio: ratio, packageLabelled: items.filter(e => e.packageId !== null).length,
      packageMissing: items.filter(e => e.packageId === null).length, declaredFamilies: families(items) };
  };
  const overall = population(queries);
  const perSplit = Object.fromEntries(splits.map(split => [split, population(queries.filter(e => e.split === split), split)]));
  const perProduct = enrolled.map(productId => {
    const productRefs = refs.filter(e => e.productId === productId);
    const referenceViews = unique(productRefs.map(e => e.capture.view));
    if (referenceViews.length < coveragePolicy.minReferenceViewsPerProduct)
      gaps.push({ stage: 'coverage', code: 'REFERENCE_VIEWS_MISSING', productId });
    const knownQueries = Object.fromEntries(splits.map(split => {
      const items = queries.filter(e => e.known && e.productId === productId && e.split === split);
      const declaredFamilies = families(items);
      if (items.length < coveragePolicy.minKnownQueriesPerProductPerSplit)
        gaps.push({ stage: 'coverage', code: 'KNOWN_QUERIES_MISSING', productId, split });
      if (declaredFamilies.source < coveragePolicy.minKnownQueriesPerProductPerSplit ||
        declaredFamilies.physical < coveragePolicy.minKnownQueriesPerProductPerSplit)
        gaps.push({ stage: 'coverage', code: 'INDEPENDENT_QUERY_FAMILIES_MISSING', productId, split });
      return [split, { count: items.length, declaredFamilies }];
    }));
    return { productId, referenceCount: productRefs.length, referenceViews, referenceFamilies: families(productRefs), knownQueries };
  });
  for (const entry of entries) {
    if (entry.packageId === null) gaps.push({ stage: 'coverage', code: 'PACKAGE_LABEL_MISSING', entryId: entry.id });
    const unseen = entry.role === 'query' && entry.known && entry.packageId !== null &&
      !refs.some(r => r.productId === entry.productId && r.packageId === entry.packageId);
    const tagged = reviews.get(entry.id)?.challengeTags.includes('unseen-package') ?? false;
    if (unseen && !tagged) gaps.push({ stage: 'coverage', code: 'UNSEEN_PACKAGE_TAG_MISSING', entryId: entry.id });
    if (!unseen && tagged) gaps.push({ stage: 'coverage', code: 'UNSEEN_PACKAGE_TAG_INCORRECT', entryId: entry.id });
  }
  const strata = {
    lighting: counts(queries.map(e => e.capture.lighting)),
    views: counts(queries.map(e => e.capture.view)), occlusion: counts(queries.map(e => e.capture.occlusion)),
    challengeTags: counts(queries.flatMap(e => reviews.get(e.id)?.challengeTags ?? [])),
  };
  for (const key of ['lighting', 'views', 'occlusion', 'challengeTags'] as const)
    for (const stratum of coveragePolicy[key])
      if (!strata[key][stratum]) gaps.push({ stage: 'coverage', code: 'STRATUM_MISSING', stratum: key + ':' + stratum });
  return {
    enrolledProducts: enrolled.length, declaredProducts, representedProducts: unique(entries.map(e => e.productId)).length,
    referenceEntries: refs.length, queryEntries: queries.length,
    distinctPackages: unique(entries.map(e => e.packageId)).length,
    distinctPackagingGenerations: unique(entries.map(e => e.packagingGeneration)).length,
    packagingGenerations: counts(entries.map(e => e.packagingGeneration)),
    referencePackages: unique(refs.map(e => e.packageId)), queryPackages: unique(queries.map(e => e.packageId)),
    overall, perSplit, perProduct, strata,
    unseenPackageQueries: queries.filter(e => e.known && e.packageId !== null && !refs.some(r => r.productId === e.productId && r.packageId === e.packageId)).map(e => e.id),
    manualChoiceRequired: curation.entries.filter(r => r.challengeTags.includes('manual-choice-required')).map(r => r.entryId),
  };
}

function assess(imported: ReturnType<typeof importDataset>, curation: Curation, curationHash: string) {
  const { dataset, manifestHash, integrity } = imported;
  const gaps: Gap[] = [];
  const add = (stage: Stage, code: string, entryId?: string) => gaps.push({ stage, code, ...(entryId ? { entryId } : {}) });
  if (curation.datasetId === null || curation.datasetVersion === null || curation.manifestSha256 === null) add('review', 'CURATION_BINDING_MISSING');
  const reviews = new Map(curation.entries.map(r => [r.entryId, r]));
  for (const entry of dataset.entries) {
    const review = reviews.get(entry.id);
    if (!review) { add('review', 'ENTRY_REVIEW_MISSING', entry.id); continue; }
    if (review.decision !== 'accepted') add('review', review.decision === 'rejected' ? 'ENTRY_REJECTED_REVISE_MANIFEST' : 'ENTRY_REVIEW_PENDING', entry.id);
    if (review.reviewerId === null) add('review', 'ENTRY_REVIEWER_MISSING', entry.id);
    if (review.sourceFamily === null || review.physicalFamily === null) add('review', 'ENTRY_FAMILIES_MISSING', entry.id);
    if (review.usability !== 'accepted') add('review', 'IMAGE_USABILITY_NOT_ACCEPTED', entry.id);
    if (review.permission !== 'accepted' || review.permissionId === null || review.provenanceId === null) add('review', 'PERMISSION_NOT_ACCEPTED', entry.id);
  }
  const human = curation.review;
  if (human.decision !== 'accepted' || human.reviewerId === null) add('review', 'CURATOR_DECISION_MISSING');
  for (const field of ['imageUsabilityInspected', 'rightsRecordsInspected', 'physicalIndependenceInspected'] as const)
    if (!human[field]) add('review', field === 'imageUsabilityInspected' ? 'IMAGE_REVIEW_ATTESTATION_MISSING' :
      field === 'rightsRecordsInspected' ? 'RIGHTS_ATTESTATION_MISSING' : 'INDEPENDENCE_ATTESTATION_MISSING');
  const captureCoverage = coverage(dataset.entries, curation, gaps, dataset.products.length);
  if (!curation.holdoutSeal) add('seal', 'HOLDOUT_SEAL_MISSING');
  if (!dataset.entries.some(e => e.role === 'query' && e.split === 'holdout')) add('seal', 'HOLDOUT_EMPTY');
  if (dataset.kind !== 'real-capture') add('realData', 'SYNTHETIC_DATASET_INELIGIBLE');
  if (curation.evidenceKind !== 'real-capture-attested') add('realData', 'REAL_CAPTURE_ATTESTATION_MISSING');
  if (dataset.entries.some(e => e.observation !== undefined)) add('realData', 'AUTHORED_OBSERVATIONS_INELIGIBLE');
  const complete = (stage: Stage) => !gaps.some(g => g.stage === stage);
  return {
    schemaVersion: 1, status: gaps.length ? 'INCOMPLETE' as const : 'READY_FOR_RECORDED_REVIEW' as const,
    label: dataset.kind === 'synthetic-tooling-only' || curation.evidenceKind === 'synthetic-tooling-only' ?
      'SYNTHETIC TOOLING-ONLY — NOT REAL DATASET READINESS' : 'DATASET PREPARATION ONLY — HUMAN ATTESTATIONS REQUIRE INDEPENDENT REVIEW',
    dataset: { datasetId: dataset.datasetId, version: dataset.version, kind: dataset.kind, manifestSha256: manifestHash },
    curation: { sha256: curationHash, evidenceKind: curation.evidenceKind },
    states: { integrityValidity: integrity.status, curatorReviewCompleteness: complete('review') ? 'COMPLETE_RECORDED_ATTESTATIONS' : 'INCOMPLETE',
      captureCoverage: complete('coverage') ? 'TARGETS_MET' : 'INCOMPLETE', holdoutSeal: complete('seal') ? 'RECORDED_HASH_BOUND' : 'INCOMPLETE',
      realDatasetReadiness: gaps.length ? 'NOT_READY' : 'READY_FOR_INDEPENDENT_CURATOR_ACCEPTANCE' },
    realDatasetReady: gaps.length === 0, independentAcceptance: 'PENDING_NOT_AUTOMATED',
    integrity, review: { entryCount: dataset.entries.length, reviewedEntries: curation.entries.length,
      decisions: counts(curation.entries.map(r => r.decision)), attestations: human },
    coveragePolicy, coverage: captureCoverage,
    holdoutSeal: curation.holdoutSeal, gaps, limitations,
  };
}

// The only dataset-loading path is the existing importer; no discovery or decoder.
export function assessReadiness(manifest: string, approvedRoot: string, sidecar: string) {
  let integrityValidity = 'NOT_ASSESSED';
  try {
    const imported = importDataset(manifest, approvedRoot);
    integrityValidity = 'VALID';
    const root = realpathSync(approvedRoot);
    let bytes: Buffer;
    try {
      const path = realpathSync(sidecar);
      const rel = relative(root, path);
      if (isAbsolute(rel) || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\'))
        throw new CurationError([{ code: 'CURATION_OUTSIDE_ROOT' }]);
      bytes = readFileSync(path);
    } catch (error) {
      if (error instanceof CurationError) throw error;
      throw new CurationError([{ code: 'CURATION_UNAVAILABLE' }]);
    }
    let input: unknown;
    try { input = JSON.parse(bytes.toString('utf8')); }
    catch { throw new CurationError([{ code: 'CURATION_JSON' }]); }
    return assess(imported, validateCuration(input, imported.dataset, imported.manifestHash), sha256(bytes));
  } catch (error) {
    const issues = error instanceof IntegrityError || error instanceof CurationError ?
      error.issues.map(i => ({ code: i.code, ...('entryId' in i && i.entryId ? { entryId: i.entryId } : {}) })) : [{ code: 'INVALID_INPUT_OR_IO' }];
    return { schemaVersion: 1, status: 'INVALID' as const, label: 'DATASET PREPARATION ONLY — NO RECOGNITION RESULTS',
      states: { integrityValidity: error instanceof IntegrityError ? 'INVALID' : integrityValidity,
        curatorReviewCompleteness: 'NOT_ASSESSED', captureCoverage: 'NOT_ASSESSED', holdoutSeal: 'NOT_ASSESSED', realDatasetReadiness: 'NOT_READY' },
      realDatasetReady: false, independentAcceptance: 'PENDING_NOT_AUTOMATED', issues, limitations };
  }
}
export type ReadinessReport = ReturnType<typeof assessReadiness>;
export function readinessSummary(report: ReadinessReport): string {
  const lines = [report.label, '', 'Status: ' + report.status,
    'Independent acceptance: ' + report.independentAcceptance, '',
    '| Gate | State |', '| --- | --- |', ...Object.entries(report.states).map(([gate, state]) => `| ${gate} | ${state} |`)];
  if ('dataset' in report) {
    const c = report.coverage;
    const population = (name: string, p: typeof c.overall) => `| ${name} | ${p.total} | ${p.known} | ${p.unknown} | ` +
      `${p.unknownRatio.numerator}/${p.unknownRatio.denominator} (${p.unknownRatio.value === null ? 'N/A' : (100 * p.unknownRatio.value).toFixed(2) + '%'}) | ` +
      `${p.packageLabelled}/${p.packageMissing} | ${p.declaredFamilies.source}/${p.declaredFamilies.physical} |`;
    lines.push('', 'Dataset/hash: ' + JSON.stringify(report.dataset), 'Curation/hash: ' + JSON.stringify(report.curation),
      'Recorded review: ' + JSON.stringify(report.review), 'Coverage policy: ' + JSON.stringify(report.coveragePolicy), '',
      `Enrolled products: ${c.enrolledProducts}; declared: ${c.declaredProducts}; represented: ${c.representedProducts}.`,
      `References: ${c.referenceEntries}; queries: ${c.queryEntries}; distinct captured packages: ${c.distinctPackages}; packaging generations: ${c.distinctPackagingGenerations}.`,
      'Packaging-generation entry counts: ' + JSON.stringify(c.packagingGenerations),
      'Reference/query package IDs: ' + JSON.stringify({ reference: c.referencePackages, query: c.queryPackages }), '',
      '| Query split | Total | Known | Unknown | Unknown ratio | Package labelled/missing | Declared source/physical families |',
      '| --- | --- | --- | --- | --- | --- | --- |', population('overall', c.overall),
      ...splits.map(split => population(split, c.perSplit[split])), '',
      '| Product | Reference count/views/families | Known queries and declared source/physical families by split |',
      '| --- | --- | --- |', ...c.perProduct.map(p => `| ${p.productId} | ${p.referenceCount}; ${p.referenceViews.join(',')}; ` +
        `${p.referenceFamilies.source}/${p.referenceFamilies.physical} | ` + splits.map(s => {
          const q = p.knownQueries[s]; return `${s}: ${q.count}; ${q.declaredFamilies.source}/${q.declaredFamilies.physical}`;
        }).join(' / ') + ' |'), '',
      'Query challenge/lighting/view/occlusion entry counts: ' + JSON.stringify(c.strata),
      'Known unseen-package query IDs: ' + JSON.stringify(c.unseenPackageQueries),
      'Manual-choice-required entry IDs: ' + JSON.stringify(c.manualChoiceRequired),
      'Recorded seal/hash inventory: ' + JSON.stringify(report.holdoutSeal), '',
      'Actionable gaps (all entries retained; rejected entries require a revised manifest/version):', '',
      ...report.gaps.map(g => '- ' + JSON.stringify(g)));
  } else lines.push('', 'Invalid input issues:', '', ...report.issues.map(i => '- ' + JSON.stringify(i)));
  return [...lines, '', 'Evidence limitations:', '', ...report.limitations.map(l => '- ' + l), ''].join('\n');
}

import axios from 'axios';
import {loadConfig} from './config.js';

const config = loadConfig();
const serviceHeaders = config.serviceToken ? {'X-Chute-Service-Token': config.serviceToken} : {};
type ProofReader = {getProofDocument: (proofRef: string) => Promise<unknown>};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function collectProofRefs(source: Record<string, unknown> | null): string[] {
  if (!source) return [];
  const proofRefs = Array.isArray(source.proofRefs) ? source.proofRefs.filter((value): value is string => typeof value === 'string') : [];
  const validation = asRecord(source.validation);
  const nestedProofRefs = Array.isArray(validation?.proofRefs) ? validation?.proofRefs.filter((value): value is string => typeof value === 'string') : [];
  return uniqueStrings([
    ...proofRefs,
    ...nestedProofRefs,
    typeof source.proofRef === 'string' ? source.proofRef : undefined,
    typeof source.validationSource === 'string' ? source.validationSource : undefined,
    typeof validation?.proofRef === 'string' ? validation.proofRef : undefined,
    typeof validation?.validationSource === 'string' ? validation.validationSource : undefined,
  ]);
}

function extractNumericStatKeys(source: Record<string, unknown> | null): string[] {
  if (!source) return [];
  const directStats = asRecord(source.stats);
  const nestedScore = asRecord(source.score);
  const nestedStats = asRecord(nestedScore?.stats);
  const stats = directStats || nestedStats;
  if (!stats) return [];
  return Object.keys(stats).filter((key) => /^\d+$/.test(key)).sort((a, b) => Number(a) - Number(b));
}

export function extractProofRefsFromScorePayload(fixtureId: string, payload: unknown, apiBase = config.apiBase): string[] {
  const entries = Array.isArray(payload) ? payload : [payload];
  const latest = asRecord(entries.at(-1));
  const explicitRefs = collectProofRefs(latest);
  if (explicitRefs.length > 0) return explicitRefs;

  const sequence = latest?.Seq ?? latest?.sequence;
  const statKeys = extractNumericStatKeys(latest);
  if ((typeof sequence === 'string' || typeof sequence === 'number') && statKeys.length > 0) {
    return [`${apiBase}/scores/stat-validation?fixtureId=${encodeURIComponent(fixtureId)}&seq=${encodeURIComponent(String(sequence))}&statKeys=${statKeys.join(',')}`];
  }
  return [];
}

export function buildValidationFromProofDocument(
  proofRef: string,
  proofDocument: unknown,
  programId = config.programId,
): Record<string, unknown> | null {
  const proof = asRecord(proofDocument);
  if (!proof) return null;
  const statsToProve = Array.isArray(proof.statsToProve) ? proof.statsToProve : [];
  const summary = asRecord(proof.summary);
  const targetTimestamp = typeof proof.ts === 'number' ? proof.ts : summary?.updateStats && asRecord(summary.updateStats)?.maxTimestamp;
  return {
    statsToProve,
    targetTimestamp: typeof targetTimestamp === 'number' ? targetTimestamp : null,
    summary: summary || null,
    proofRefs: [proofRef],
    onChainValidation: {
      method: 'validateStatV2.view',
      programId,
      targetTimestamp: typeof targetTimestamp === 'number' ? targetTimestamp : null,
      valid: null,
      dryRun: true,
      proofStatus: 'proof_fetched_unverified',
    },
  };
}

export async function enrichScorePayloadWithValidation(
  fixtureId: string,
  payload: unknown,
  proofReader?: ProofReader,
): Promise<{snapshot: unknown; proofRefs: string[]}> {
  const proofRefs = extractProofRefsFromScorePayload(fixtureId, payload);
  const latest = asRecord(Array.isArray(payload) ? payload.at(-1) : payload);
  if (!latest || proofRefs.length === 0 || !proofReader) {
    return {snapshot: payload, proofRefs};
  }
  const proofRef = proofRefs[0];
  try {
    const proofDocument = await proofReader.getProofDocument(proofRef);
    const validation = buildValidationFromProofDocument(proofRef, proofDocument);
    if (!validation) return {snapshot: payload, proofRefs};
    return {
      snapshot: {
        ...latest,
        validation,
      },
      proofRefs,
    };
  } catch {
    return {snapshot: payload, proofRefs};
  }
}

export async function persistFixtures(payload: unknown) {
  const data = payload as {fixtures?: unknown[]; payload?: unknown[]};
  const fixtures = Array.isArray(payload) ? payload : data.fixtures || data.payload || [];
  const response = await axios.post(`${config.persistenceUrl}/internal/txline/fixtures`, {network: config.network, fixtures}, {timeout: 15000, headers: serviceHeaders});
  return response.data;
}

export async function persistScoreSnapshot(fixtureId: string, payload: unknown, proofReader?: ProofReader) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const latest = entries.at(-1) as Record<string, unknown> | undefined;
  const sequence = String(latest?.Seq || latest?.sequence || 'latest');
  const sourceTimestamp = String(latest?.Ts || latest?.Timestamp || latest?.sourceTimestamp || '') || undefined;
  const enriched = await enrichScorePayloadWithValidation(fixtureId, payload, proofReader);
  const response = await axios.post(`${config.persistenceUrl}/internal/txline/snapshots`, {
    fixture_id: fixtureId,
    snapshot_type: 'score',
    snapshot: enriched.snapshot,
    network: config.network,
    source_timestamp: sourceTimestamp,
    sequence,
    data_status: 'txline_live',
    proof_refs: enriched.proofRefs,
  }, {timeout: 15000, headers: serviceHeaders});
  return response.data;
}

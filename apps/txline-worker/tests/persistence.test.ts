import {describe, expect, it} from 'vitest';
import {buildValidationFromProofDocument, enrichScorePayloadWithValidation, extractProofRefsFromScorePayload} from '../src/persistence.js';

describe('extractProofRefsFromScorePayload', () => {
  it('prefers explicit proof refs already present in the payload', () => {
    const payload = {
      Seq: 892,
      stats: {'1': 2, '2': 0},
      proofRefs: ['https://txline-dev.txodds.com/api/scores/stat-validation?fixtureId=18179551&seq=892&statKeys=1,2'],
    };
    expect(extractProofRefsFromScorePayload('18179551', payload)).toEqual([
      'https://txline-dev.txodds.com/api/scores/stat-validation?fixtureId=18179551&seq=892&statKeys=1,2',
    ]);
  });

  it('builds an official stat-validation URL from fixture, sequence and numeric stat keys', () => {
    const payload = [
      {Seq: 891, stats: {'1': 1}},
      {Seq: 892, stats: {'3002': 0, '1': 2, '3001': 1, '2': 0}},
    ];
    expect(extractProofRefsFromScorePayload('18179551', payload)).toEqual([
      'https://txline-dev.txodds.com/api/scores/stat-validation?fixtureId=18179551&seq=892&statKeys=1,2,3001,3002',
    ]);
  });

  it('returns no proof refs when the payload lacks sequence or numeric stat keys', () => {
    const payload = {stats: {shots_on_target: 2}, events: []};
    expect(extractProofRefsFromScorePayload('18257739', payload)).toEqual([]);
  });
});

describe('live validation enrichment', () => {
  it('builds a dry-run validation block from a proof document', () => {
    const validation = buildValidationFromProofDocument(
      'https://txline-dev.txodds.com/api/scores/stat-validation?fixtureId=18179551&seq=892&statKeys=1,2',
      {
        ts: 1783025099554,
        statsToProve: [{key: 1, value: 2, period: 4}],
        summary: {fixtureId: 18179551, updateStats: {maxTimestamp: 1783025099554}},
      },
      '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J',
    );
    expect(validation).toEqual({
      statsToProve: [{key: 1, value: 2, period: 4}],
      targetTimestamp: 1783025099554,
      summary: {fixtureId: 18179551, updateStats: {maxTimestamp: 1783025099554}},
      proofRefs: ['https://txline-dev.txodds.com/api/scores/stat-validation?fixtureId=18179551&seq=892&statKeys=1,2'],
      onChainValidation: {
        method: 'validateStatV2.view',
        programId: '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J',
        targetTimestamp: 1783025099554,
        valid: null,
        dryRun: true,
        proofStatus: 'proof_fetched_unverified',
      },
    });
  });

  it('enriches the latest score payload with validation when proof fetch succeeds', async () => {
    const payload = {Seq: 892, stats: {'1': 2, '2': 0}};
    const enriched = await enrichScorePayloadWithValidation('18179551', payload, {
      getProofDocument: async () => ({
        ts: 1783025099554,
        statsToProve: [{key: 1, value: 2, period: 4}],
        summary: {fixtureId: 18179551, updateStats: {maxTimestamp: 1783025099554}},
      }),
    });
    expect(enriched.proofRefs).toEqual([
      'https://txline-dev.txodds.com/api/scores/stat-validation?fixtureId=18179551&seq=892&statKeys=1,2',
    ]);
    expect(enriched.snapshot).toMatchObject({
      Seq: 892,
      validation: {
        proofRefs: ['https://txline-dev.txodds.com/api/scores/stat-validation?fixtureId=18179551&seq=892&statKeys=1,2'],
        onChainValidation: {
          method: 'validateStatV2.view',
          valid: null,
          dryRun: true,
        },
      },
    });
  });
});

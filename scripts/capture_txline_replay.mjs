import {mkdir, readFile, writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const envText = await readFile(`${process.env.HOME}/.config/chute/txline-devnet.env`, 'utf8');
const env = Object.fromEntries(envText.split('\n').filter(Boolean).map(line => line.split('=')));
const base = env.TXLINE_API_BASE;
const headers = {Authorization: `Bearer ${(await (await fetch(`${env.TXLINE_API_ORIGIN}/auth/guest/start`, {method: 'POST'})).json()).token}`, 'X-Api-Token': env.TXLINE_API_TOKEN};
const fixtureId = 18179551;
const scoreUrl = `${base}/scores/snapshot/${fixtureId}`;
const fixtureUrl = `${base}/fixtures/snapshot?competitionId=72&startEpochDay=20624`;
const scores = await (await fetch(scoreUrl, {headers})).json();
const fixtures = await (await fetch(fixtureUrl, {headers})).json();
const fixture = fixtures.find(item => item.FixtureId === fixtureId);
if (!fixture || !Array.isArray(scores) || scores.length === 0) throw new Error('FIXTURE_NOT_FOUND');
const latest = scores.at(-1);
const statKeys = [1, 2, 3001, 3002];
const validationUrl = `${base}/scores/stat-validation?fixtureId=${fixtureId}&seq=${latest.Seq}&statKeys=${statKeys.join(',')}`;
const validation = await (await fetch(validationUrl, {headers})).json();
if (!validation.summary || !validation.statsToProve || !validation.statProofs) throw new Error('MISSING_DATA: validation proof');

const snapshot = {
  snapshotId: `txline-replay-${fixtureId}-${latest.Seq}`,
  fixtureId,
  mode: 'REPLAY',
  network: env.TXLINE_NETWORK,
  feedTier: '1',
  teams: [fixture.Participant1, fixture.Participant2],
  fixture: {
    competition: fixture.Competition,
    competitionId: fixture.CompetitionId,
    startTime: new Date(fixture.StartTime).toISOString(),
    participant1: fixture.Participant1,
    participant2: fixture.Participant2,
    participant1Id: fixture.Participant1Id,
    participant2Id: fixture.Participant2Id,
  },
  score: {
    sequence: latest.Seq,
    sourceTimestamp: new Date(latest.Ts).toISOString(),
    action: latest.Action,
    statusId: latest.StatusId,
    stats: latest.Stats,
    score: latest.Score,
    possession: latest.Possession ?? null,
  },
  validation: {
    statKeys,
    targetTimestamp: validation.ts,
    values: validation.statsToProve,
    summary: validation.summary,
    proofRefs: [validationUrl],
    onChainValidation: {
      valid: true,
      method: 'validateStatV2.view',
      statKey: 1,
      programId: env.TXLINE_PROGRAM_ID,
      targetTimestamp: validation.summary.updateStats.minTimestamp,
    },
  },
  evidence: {
    fixtureSource: fixtureUrl,
    scoreSource: scoreUrl,
    validationSource: validationUrl,
  },
  modelVersion: 'chute-quiz-v2-txline-replay',
  dataStatus: 'txline_replay',
};
const canonicalize = value => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const canonical = JSON.stringify(canonicalize(snapshot));
snapshot.contentHash = `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
await mkdir('data', {recursive: true});
await writeFile('data/txline-replay-snapshot.json', `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify({snapshotId: snapshot.snapshotId, fixtureId, sequence: latest.Seq, contentHash: snapshot.contentHash, proofRefs: snapshot.validation.proofRefs}));

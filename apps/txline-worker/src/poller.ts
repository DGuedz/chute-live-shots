import {loadConfig} from './config.js';
import {TxlineClient} from './txlineClient.js';
import {persistFixtures, persistScoreSnapshot} from './persistence.js';

const config = loadConfig();

export type PollerTelemetry = {
  enabled: boolean;
  fixtureIntervalMs: number;
  scoreIntervalMs: number;
  lastFixtureSyncAt: string | null;
  lastScoreSyncAt: string | null;
  fixtureSyncCount: number;
  scoreSyncCount: number;
  consecutiveFailures: number;
  lastError: string | null;
  backoffMs: number;
  trackedFixtures: string[];
};

const telemetry: PollerTelemetry = {
  enabled: false,
  fixtureIntervalMs: config.fixtureSyncIntervalMs,
  scoreIntervalMs: config.scoreSyncIntervalMs,
  lastFixtureSyncAt: null,
  lastScoreSyncAt: null,
  fixtureSyncCount: 0,
  scoreSyncCount: 0,
  consecutiveFailures: 0,
  lastError: null,
  backoffMs: 0,
  trackedFixtures: [],
};

const MAX_BACKOFF_MS = 15 * 60 * 1000;

function recordFailure(error: unknown) {
  telemetry.consecutiveFailures += 1;
  telemetry.lastError = error instanceof Error ? error.message : String(error);
  telemetry.backoffMs = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** telemetry.consecutiveFailures);
}

function recordSuccess() {
  telemetry.consecutiveFailures = 0;
  telemetry.lastError = null;
  telemetry.backoffMs = 0;
}

// Fixtures with a game state other than "scheduled" have score data worth snapshotting.
function scoreWorthy(fixture: Record<string, unknown>): boolean {
  const state = Number(fixture.GameState ?? fixture.gameState ?? 1);
  return state > 1;
}

export async function syncFixturesOnce(client: TxlineClient): Promise<void> {
  const fixtures = await client.listFixtures({});
  await persistFixtures(fixtures);
  const list = (Array.isArray(fixtures) ? fixtures : (fixtures as {fixtures?: unknown[]; payload?: unknown[]}).fixtures || (fixtures as {payload?: unknown[]}).payload || []) as Record<string, unknown>[];
  telemetry.trackedFixtures = list.filter(scoreWorthy).map((f) => String(f.FixtureId ?? f.fixtureId ?? f.id)).filter(Boolean);
  telemetry.lastFixtureSyncAt = new Date().toISOString();
  telemetry.fixtureSyncCount += 1;
}

export async function syncScoresOnce(client: TxlineClient): Promise<void> {
  for (const fixtureId of telemetry.trackedFixtures) {
    const scores = await client.getScores(fixtureId);
    await persistScoreSnapshot(fixtureId, scores, client);
  }
  telemetry.lastScoreSyncAt = new Date().toISOString();
  telemetry.scoreSyncCount += 1;
}

export function pollerStatus(): PollerTelemetry {
  return {...telemetry};
}

export function startPoller(client: TxlineClient): void {
  if (!config.autoSync) {
    telemetry.enabled = false;
    console.log('TxLINE poller disabled (set TXLINE_AUTOSYNC=true to enable)');
    return;
  }
  telemetry.enabled = true;
  const loop = async (task: () => Promise<void>, baseInterval: number, label: string) => {
    for (;;) {
      try {
        await task();
        recordSuccess();
      } catch (error) {
        recordFailure(error);
        console.error(`TxLINE poller ${label} failed:`, telemetry.lastError);
      }
      await new Promise((resolve) => setTimeout(resolve, baseInterval + telemetry.backoffMs));
    }
  };
  void loop(() => syncFixturesOnce(client), config.fixtureSyncIntervalMs, 'fixtures');
  void loop(() => syncScoresOnce(client), config.scoreSyncIntervalMs, 'scores');
  console.log(`TxLINE poller enabled (fixtures every ${config.fixtureSyncIntervalMs}ms, scores every ${config.scoreSyncIntervalMs}ms)`);
}

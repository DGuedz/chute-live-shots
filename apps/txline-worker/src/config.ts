export type TxlineConfig = {
  apiBase: string;
  apiOrigin: string;
  jwt?: string;
  apiToken?: string;
  rpcUrl: string;
  network: 'devnet' | 'mainnet';
  programId: string;
  fixturesPath: string;
  scoresPath: string;
  proofsPath: string;
  sseUrl?: string;
  persistenceUrl: string;
  serviceToken?: string;
  autoSync: boolean;
  fixtureSyncIntervalMs: number;
  scoreSyncIntervalMs: number;
};

export function loadConfig(env = process.env): TxlineConfig {
  const network = env.TXLINE_NETWORK === 'mainnet' ? 'mainnet' : 'devnet';
  return {
    apiBase: env.TXLINE_API_BASE || 'https://txline-dev.txodds.com/api',
    apiOrigin: env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com',
    jwt: env.TXLINE_JWT,
    apiToken: env.TXLINE_API_TOKEN,
    rpcUrl: env.SOLANA_RPC_URL || (network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com'),
    network,
    programId: env.TXLINE_PROGRAM_ID || '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J',
    fixturesPath: env.TXLINE_FIXTURES_PATH || '/fixtures/snapshot',
    scoresPath: env.TXLINE_SCORES_PATH || '/scores',
    proofsPath: env.TXLINE_PROOFS_PATH || '/proofs',
    sseUrl: env.TXLINE_SSE_URL,
    persistenceUrl: env.CHUTE_API_URL || 'http://127.0.0.1:8000',
    serviceToken: env.CHUTE_SERVICE_TOKEN,
    autoSync: (env.TXLINE_AUTOSYNC || 'false').toLowerCase() === 'true',
    fixtureSyncIntervalMs: Number(env.TXLINE_FIXTURE_SYNC_MS || 10 * 60 * 1000),
    scoreSyncIntervalMs: Number(env.TXLINE_SCORE_SYNC_MS || 60 * 1000),
  };
}

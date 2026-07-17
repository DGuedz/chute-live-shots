import axios from 'axios';
import {loadConfig} from './config.js';

const config = loadConfig();
const serviceHeaders = config.serviceToken ? {'X-Chute-Service-Token': config.serviceToken} : {};

export async function persistFixtures(payload: unknown) {
  const data = payload as {fixtures?: unknown[]; payload?: unknown[]};
  const fixtures = Array.isArray(payload) ? payload : data.fixtures || data.payload || [];
  const response = await axios.post(`${config.persistenceUrl}/internal/txline/fixtures`, {network: config.network, fixtures}, {timeout: 15000, headers: serviceHeaders});
  return response.data;
}

export async function persistScoreSnapshot(fixtureId: string, payload: unknown) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const latest = entries.at(-1) as Record<string, unknown> | undefined;
  const sequence = String(latest?.Seq || latest?.sequence || 'latest');
  const sourceTimestamp = String(latest?.Ts || latest?.Timestamp || latest?.sourceTimestamp || '') || undefined;
  const response = await axios.post(`${config.persistenceUrl}/internal/txline/snapshots`, {
    fixture_id: fixtureId,
    snapshot_type: 'score',
    snapshot: payload,
    network: config.network,
    source_timestamp: sourceTimestamp,
    sequence,
    data_status: 'txline_live',
  }, {timeout: 15000, headers: serviceHeaders});
  return response.data;
}

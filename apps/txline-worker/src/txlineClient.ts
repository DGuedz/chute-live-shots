import axios, { AxiosInstance } from 'axios';
import { loadConfig, TxlineConfig } from './config.js';

export class TxlineClient {
  readonly config: TxlineConfig;
  private readonly http: AxiosInstance;
  private guestJwt?: string;

  constructor(config = loadConfig()) {
    this.config = config;
    this.http = axios.create({baseURL: config.apiBase, timeout: 15000});
  }

  private async headers() {
    if (!this.config.apiToken) throw new Error('MISSING_DATA: TXLINE_API_TOKEN is required');
    const jwt = this.config.jwt || this.guestJwt || await this.startGuestSession();
    return {Authorization: `Bearer ${jwt}`, 'X-Api-Token': this.config.apiToken};
  }

  private async startGuestSession() {
    const response = await axios.post(`${this.config.apiOrigin}/auth/guest/start`, undefined, {timeout: 15000});
    const token = response.data?.token;
    if (!token) throw new Error('MISSING_DATA: TXLINE guest JWT was not returned');
    this.guestJwt = token;
    return token;
  }

  async listFixtures(params: Record<string, string> = {}) {
    const response = await this.http.get(this.config.fixturesPath, {params, headers: await this.headers()});
    return response.data;
  }

  async getScores(fixtureId: string) {
    const response = await this.http.get(`${this.config.scoresPath}/${encodeURIComponent(fixtureId)}`, {headers: await this.headers()});
    return response.data;
  }

  async getProof(proofRef: string) {
    const response = await this.http.get(`${this.config.proofsPath}/${encodeURIComponent(proofRef)}`, {headers: await this.headers()});
    return response.data;
  }

  async activateToken(input: {txSig: string; walletSignature: string; leagues?: number[]; jwt: string}) {
    const response = await axios.post(`${this.config.apiBase}/token/activate`, {txSig: input.txSig, walletSignature: input.walletSignature, leagues: input.leagues || []}, {headers: {Authorization: `Bearer ${input.jwt}`}});
    return response.data;
  }

  status() {
    return {configured: Boolean(this.config.apiToken), network: this.config.network, apiBase: this.config.apiBase, programId: this.config.programId, guestSession: this.config.jwt ? 'configured' : this.guestJwt ? 'active' : 'on_demand', sseConfigured: Boolean(this.config.sseUrl)};
  }
}

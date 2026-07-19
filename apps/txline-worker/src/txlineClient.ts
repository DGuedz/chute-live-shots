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

  private async startGuestSession(): Promise<string> {
    // A resposta pode vir como JSON {token} ou como texto cru — o token de API real
    // (mainnet) devolveu texto puro em pelo menos um endpoint irmão, então blindamos aqui.
    const response = await axios.post(`${this.config.apiOrigin}/auth/guest/start`, undefined, {timeout: 15000, transformResponse: (data) => data});
    let token: string | undefined;
    try {
      token = JSON.parse(response.data)?.token;
    } catch {
      token = typeof response.data === 'string' ? response.data : undefined;
    }
    if (!token) throw new Error('MISSING_DATA: TXLINE guest JWT was not returned');
    this.guestJwt = token;
    return token;
  }

  /** Renova o JWT sob demanda (401/403) e reexecuta a chamada uma única vez.
   * O apiToken da assinatura on-chain é de longa duração; só o JWT expira. */
  private async withJwtRetry<T>(run: (headers: {Authorization: string; 'X-Api-Token': string}) => Promise<T>): Promise<T> {
    try {
      return await run(await this.headers());
    } catch (err) {
      const status = (err as {response?: {status?: number}})?.response?.status;
      if (status !== 401 && status !== 403) throw err;
      this.guestJwt = undefined;
      await this.startGuestSession();
      return run(await this.headers());
    }
  }

  async listFixtures(params: Record<string, string> = {}) {
    const response = await this.withJwtRetry((headers) => this.http.get(this.config.fixturesPath, {params, headers}));
    return response.data;
  }

  async getScores(fixtureId: string) {
    const response = await this.withJwtRetry((headers) => this.http.get(`${this.config.scoresPath}/${encodeURIComponent(fixtureId)}`, {headers}));
    return response.data;
  }

  async getProof(proofRef: string) {
    const response = await this.getProofDocument(proofRef);
    return response;
  }

  async getProofDocument(proofRef: string) {
    const response = await this.withJwtRetry((headers) => /^https?:\/\//i.test(proofRef)
      ? axios.get(proofRef, {headers, timeout: 15000})
      : this.http.get(`${this.config.proofsPath}/${encodeURIComponent(proofRef)}`, {headers}));
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

import express from 'express';
import {TxlineClient} from './txlineClient.js';
import {solanaStatus, validateSignature} from './solana.js';
import {persistFixtures, persistScoreSnapshot} from './persistence.js';
import {pollerStatus, startPoller} from './poller.js';

const app = express(); app.use(express.json());
const client = new TxlineClient();
app.get('/health', (_req, res) => res.json({ok:true, service:'txline-worker', txline:client.status(), solana:solanaStatus(), poller:pollerStatus()}));
app.get('/txline/status', (_req, res) => res.json({...client.status(), poller: pollerStatus()}));
app.get('/txline/fixtures', async (req, res) => { try { res.json(await client.listFixtures(req.query as Record<string, string>)); } catch (error) { res.status(502).json({error: error instanceof Error ? error.message : 'TXLINE_REQUEST_FAILED'}); }});
app.get('/txline/scores/:fixtureId', async (req, res) => { try { res.json(await client.getScores(req.params.fixtureId)); } catch (error) { res.status(502).json({error: error instanceof Error ? error.message : 'TXLINE_REQUEST_FAILED'}); }});
app.post('/txline/sync/fixtures', async (req, res) => { try { const fixtures = await client.listFixtures(req.body || {}); res.json({payload: await persistFixtures(fixtures), data_status: 'txline_persisted'}); } catch (error) { res.status(502).json({error: error instanceof Error ? error.message : 'TXLINE_PERSIST_FAILED'}); }});
app.post('/txline/sync/scores/:fixtureId', async (req, res) => { try { const scores = await client.getScores(req.params.fixtureId); res.json({payload: await persistScoreSnapshot(req.params.fixtureId, scores, client), data_status: 'txline_persisted'}); } catch (error) { res.status(502).json({error: error instanceof Error ? error.message : 'TXLINE_PERSIST_FAILED'}); }});
app.get('/txline/proofs/:proofRef', async (req, res) => { try { res.json(await client.getProof(req.params.proofRef)); } catch (error) { res.status(502).json({error: error instanceof Error ? error.message : 'TXLINE_REQUEST_FAILED'}); }});
app.post('/txline/activate', async (req, res) => { const {txSig, walletSignature, leagues, jwt} = req.body || {}; if (!txSig || !walletSignature || !jwt) return res.status(400).json({error:'txSig, walletSignature and jwt are required'}); try { res.json(await client.activateToken({txSig, walletSignature, leagues, jwt})); } catch (error) { res.status(502).json({error: error instanceof Error ? error.message : 'TXLINE_ACTIVATION_FAILED'}); }});
app.get('/solana/signatures/:signature', async (req, res) => { try { res.json(await validateSignature(req.params.signature)); } catch (error) { res.status(502).json({error: error instanceof Error ? error.message : 'SOLANA_RPC_FAILED'}); }});

const port = Number(process.env.TXLINE_WORKER_PORT || 8100); app.listen(port, () => { console.log(`TxLINE worker listening on http://127.0.0.1:${port}`); startPoller(client); });

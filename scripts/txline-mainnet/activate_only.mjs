// Reaproveita uma transação `subscribe` já confirmada e completa só a ativação do
// token de API — usado quando o subscribe já rodou mas a ativação falhou por outro motivo
// (ex.: parsing de resposta). Não repete a transação on-chain nem gasta SOL de novo.
//
// Uso: node scripts/txline-mainnet/activate_only.mjs <txSig>

import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {Keypair} from '@solana/web3.js';
import nacl from 'tweetnacl';

const API_ORIGIN = 'https://txline.txodds.com';
const SELECTED_LEAGUES = [];

const txSig = process.argv[2];
if (!txSig) {
  console.error('Uso: node scripts/txline-mainnet/activate_only.mjs <txSig>');
  process.exit(1);
}

const keypairPath = process.env.TXLINE_MAINNET_KEYPAIR || `${homedir()}/.config/solana/chute-mainnet-keypair.json`;
const user = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keypairPath, 'utf8'))));

async function parseBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text; // a API pode devolver o token cru, sem envelope JSON
  }
}

console.log('Wallet :', user.publicKey.toBase58());
console.log('txSig  :', txSig);

const jwtResponse = await fetch(`${API_ORIGIN}/auth/guest/start`, {method: 'POST'});
const jwtBody = await parseBody(jwtResponse);
const jwt = typeof jwtBody === 'string' ? jwtBody : jwtBody.token;
console.log('JWT obtido.');

const messageString = `${txSig}:${SELECTED_LEAGUES.join(',')}:${jwt}`;
const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), user.secretKey);
const walletSignature = Buffer.from(signatureBytes).toString('base64');

const activationResponse = await fetch(`${API_ORIGIN}/api/token/activate`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`},
  body: JSON.stringify({txSig, walletSignature, leagues: SELECTED_LEAGUES}),
});
const activationBody = await parseBody(activationResponse);
if (!activationResponse.ok) {
  console.error('✗ Ativação falhou:', activationResponse.status, activationBody);
  process.exit(1);
}
const apiToken = typeof activationBody === 'string' ? activationBody : (activationBody.token || activationBody);

console.log('\n✓ TxLINE mainnet ativado.');
console.log('Cole no seu .env de produção (worker + API):');
console.log('TXLINE_NETWORK=mainnet');
console.log(`TXLINE_API_BASE=${API_ORIGIN}/api`);
console.log(`TXLINE_API_ORIGIN=${API_ORIGIN}`);
console.log(`TXLINE_JWT=${jwt}`);
console.log(`TXLINE_API_TOKEN=${apiToken}`);

// Assina o CHUTE na TxLINE mainnet (tier gratuito da Copa, SL12 = tempo real) e ativa
// o token de API — fluxo oficial da TxODDS (github.com/txodds/tx-on-chain), adaptado
// para a keypair e o .env do CHUTE.
//
// Custo: rent da conta de token Token-2022 (~0.00204 SOL, não recuperável enquanto a
// conta existir) + taxas de duas transações (~0.00001 SOL). Tier gratuito = sem compra
// de TxL, mas a transação `subscribe` em si tem custo real de rede.
//
// Uso: CONFIRM_MAINNET_SPEND=yes node scripts/txline-mainnet/subscribe_and_activate.mjs
// Env opcionais: TXLINE_MAINNET_KEYPAIR (default ~/.config/solana/chute-mainnet-keypair.json)
//                TXLINE_SERVICE_LEVEL (default 12), TXLINE_SUBSCRIBE_WEEKS (default 4)

import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import * as anchor from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction} from '@solana/web3.js';
import nacl from 'tweetnacl';

if (process.env.CONFIRM_MAINNET_SPEND !== 'yes') {
  console.error('✗ Bloqueado: esta transação assina um contrato de terceiros e gasta SOL real (rent + taxas).');
  console.error('  Rode novamente com CONFIRM_MAINNET_SPEND=yes node scripts/txline-mainnet/subscribe_and_activate.mjs');
  process.exit(1);
}

const PROGRAM_ID = new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA');
const TOKEN_MINT = new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL');
const API_ORIGIN = 'https://txline.txodds.com';
const RPC_URL = process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SERVICE_LEVEL = Number(process.env.TXLINE_SERVICE_LEVEL || 12);
const WEEKS = Number(process.env.TXLINE_SUBSCRIBE_WEEKS || 4);
const SELECTED_LEAGUES = [];

const keypairPath = process.env.TXLINE_MAINNET_KEYPAIR || `${homedir()}/.config/solana/chute-mainnet-keypair.json`;
const user = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keypairPath, 'utf8'))));

const idl = JSON.parse(readFileSync(new URL('./txoracle.idl.json', import.meta.url), 'utf8'));

const connection = new Connection(RPC_URL, 'confirmed');
const wallet = new anchor.Wallet(user);
const provider = new anchor.AnchorProvider(connection, wallet, {commitment: 'confirmed'});
anchor.setProvider(provider);
const program = new anchor.Program(idl, provider);

if (!program.programId.equals(PROGRAM_ID)) {
  throw new Error(`IDL aponta para ${program.programId.toBase58()}, esperado ${PROGRAM_ID.toBase58()}`);
}

console.log('Rede        : mainnet-beta');
console.log('Wallet      :', user.publicKey.toBase58());
console.log('Service lvl :', SERVICE_LEVEL, `(${SERVICE_LEVEL === 12 ? 'tempo real, Copa gratuito' : 'delay 60s, Copa gratuito'})`);
console.log('Duração     :', WEEKS, 'semanas');

const balance = await connection.getBalance(user.publicKey);
console.log('Saldo       :', balance / 1e9, 'SOL');
const minRent = await connection.getMinimumBalanceForRentExemption(165);
if (balance < minRent + 20000) {
  console.error(`✗ Saldo insuficiente. Recomendado: >= ${(minRent + 20000) / 1e9} SOL (rent da ATA + margem de taxas).`);
  process.exit(1);
}

const userTokenAccountAddress = getAssociatedTokenAddressSync(TOKEN_MINT, user.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

const existingAccount = await connection.getAccountInfo(userTokenAccountAddress);
if (!existingAccount) {
  console.log('Criando conta de token Token-2022…');
  const createTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(user.publicKey, userTokenAccountAddress, user.publicKey, TOKEN_MINT, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
  );
  await sendAndConfirmTransaction(connection, createTx, [user], {commitment: 'confirmed'});
  console.log('✓ Conta de token criada:', userTokenAccountAddress.toBase58());
} else {
  console.log('Conta de token já existe:', userTokenAccountAddress.toBase58());
}

const userTokenAccount = await getAccount(connection, userTokenAccountAddress, 'confirmed', TOKEN_2022_PROGRAM_ID);

const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from('pricing_matrix')], program.programId);
const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from('token_treasury_v2')], program.programId);
const tokenTreasuryVault = getAssociatedTokenAddressSync(TOKEN_MINT, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

console.log('\nAssinando on-chain (subscribe)…');
const subscribeTx = await program.methods
  .subscribe(SERVICE_LEVEL, WEEKS)
  .accounts({
    user: user.publicKey,
    pricingMatrix: pricingMatrixPda,
    tokenMint: TOKEN_MINT,
    userTokenAccount: userTokenAccount.address,
    tokenTreasuryVault,
    tokenTreasuryPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .transaction();

const latestBlockhash = await connection.getLatestBlockhash('confirmed');
subscribeTx.recentBlockhash = latestBlockhash.blockhash;
subscribeTx.feePayer = user.publicKey;
subscribeTx.sign(user);
const txSig = await connection.sendRawTransaction(subscribeTx.serialize());
await connection.confirmTransaction({signature: txSig, blockhash: latestBlockhash.blockhash, lastValidBlockHeight: latestBlockhash.lastValidBlockHeight}, 'confirmed');
console.log('✓ Assinatura on-chain confirmada:', txSig);
console.log(`  https://explorer.solana.com/tx/${txSig}`);

console.log('\nAtivando token de API…');
const jwtResponse = await fetch(`${API_ORIGIN}/auth/guest/start`, {method: 'POST'});
const {token: jwt} = await jwtResponse.json();

const messageString = `${txSig}:${SELECTED_LEAGUES.join(',')}:${jwt}`;
const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), user.secretKey);
const walletSignature = Buffer.from(signatureBytes).toString('base64');

const activationResponse = await fetch(`${API_ORIGIN}/api/token/activate`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`},
  body: JSON.stringify({txSig, walletSignature, leagues: SELECTED_LEAGUES}),
});
if (!activationResponse.ok) {
  console.error('✗ Ativação falhou:', activationResponse.status, await activationResponse.text());
  process.exit(1);
}
const activationBody = await activationResponse.json();
const apiToken = activationBody.token || activationBody;

console.log('\n✓ TxLINE mainnet ativado.');
console.log('Cole no seu .env de produção (worker + API):');
console.log(`TXLINE_NETWORK=mainnet`);
console.log(`TXLINE_API_BASE=${API_ORIGIN}/api`);
console.log(`TXLINE_API_ORIGIN=${API_ORIGIN}`);
console.log(`TXLINE_JWT=${jwt}`);
console.log(`TXLINE_API_TOKEN=${apiToken}`);
console.log(`TXLINE_PROGRAM_ID=${PROGRAM_ID.toBase58()}`);
console.log('\nNota: o JWT expira; o worker precisa renovar via /auth/guest/start quando a API responder 401,');
console.log('mantendo o mesmo apiToken ativado (ele é o crachá de longa duração da assinatura on-chain).');

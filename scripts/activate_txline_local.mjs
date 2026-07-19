// Fluxo completo TxLINE Devnet com carteira local (sem Phantom):
// airdrop -> subscribe(1,4) on-chain -> JWT guest -> assinatura nacl -> /token/activate.
// Uso: node scripts/activate_txline_local.mjs   (rodar da raiz do repo chute)
import {readFile} from 'node:fs/promises';
import {AnchorProvider, Program, Wallet} from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {Connection, Keypair, PublicKey, SystemProgram, Transaction} from '@solana/web3.js';
import nacl from 'tweetnacl';

const PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');
const TXL_MINT = new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG');
const TXLINE_ORIGIN = 'https://txline-dev.txodds.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CHUTE/1.0';

const keypairPath = `${process.env.HOME}/.config/solana/chute-devnet-keypair.json`;
const secret = JSON.parse(await readFile(keypairPath, 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
const user = keypair.publicKey;
console.log('wallet:', user.toBase58());

const heliusKey = process.env.HELIUS_API_KEY;
const rpcUrl = heliusKey
  ? `https://devnet.helius-rpc.com/?api-key=${heliusKey}`
  : 'https://api.devnet.solana.com';
const connection = new Connection(rpcUrl, 'confirmed');

let balance = await connection.getBalance(user);
console.log('balance:', balance / 1e9, 'SOL');
if (balance < 0.01e9) {
  console.log('requesting airdrop of 1 SOL (devnet)...');
  const sig = await connection.requestAirdrop(user, 1e9);
  const latest = await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction({signature: sig, ...latest}, 'confirmed');
  balance = await connection.getBalance(user);
  console.log('balance after airdrop:', balance / 1e9, 'SOL');
}

const idl = JSON.parse(await readFile(new URL('../apps/web/src/txline/txoracle.devnet.json', import.meta.url), 'utf8'));
const provider = new AnchorProvider(connection, new Wallet(keypair), {commitment: 'confirmed'});
const program = new Program(idl, provider);
if (!program.programId.equals(PROGRAM_ID)) throw new Error('TXLINE_IDL_NETWORK_MISMATCH');

const userTokenAccount = getAssociatedTokenAddressSync(TXL_MINT, user, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const [pricingMatrix] = PublicKey.findProgramAddressSync([new TextEncoder().encode('pricing_matrix')], PROGRAM_ID);
const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([new TextEncoder().encode('token_treasury_v2')], PROGRAM_ID);
const tokenTreasuryVault = getAssociatedTokenAddressSync(TXL_MINT, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

const transaction = new Transaction();
if (!await connection.getAccountInfo(userTokenAccount)) {
  transaction.add(createAssociatedTokenAccountInstruction(user, userTokenAccount, user, TXL_MINT, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
}
transaction.add(await program.methods.subscribe(1, 4).accounts({
  user,
  pricingMatrix,
  tokenMint: TXL_MINT,
  userTokenAccount,
  tokenTreasuryVault,
  tokenTreasuryPda,
  tokenProgram: TOKEN_2022_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
}).instruction());

const latest = await connection.getLatestBlockhash('confirmed');
transaction.recentBlockhash = latest.blockhash;
transaction.feePayer = user;
transaction.sign(keypair);
const txSig = await connection.sendRawTransaction(transaction.serialize());
console.log('subscribe txSig:', txSig);
await connection.confirmTransaction({signature: txSig, ...latest}, 'confirmed');
console.log('subscribe confirmed');

const jwtResponse = await fetch(`${TXLINE_ORIGIN}/auth/guest/start`, {
  method: 'POST',
  headers: {'User-Agent': UA},
});
if (!jwtResponse.ok) throw new Error(`guest/start ${jwtResponse.status}: ${await jwtResponse.text()}`);
const {token: jwt} = await jwtResponse.json();
console.log('guest JWT obtained');

const leagues = [];
const message = `${txSig}:${leagues.join(',')}:${jwt}`;
const signatureBytes = nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey);
const walletSignature = Buffer.from(signatureBytes).toString('base64');

const activation = await fetch(`${TXLINE_ORIGIN}/api/token/activate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'User-Agent': UA,
  },
  body: JSON.stringify({txSig, walletSignature, leagues}),
});
const bodyText = await activation.text();
console.log('activation HTTP', activation.status);
if (!activation.ok) {
  console.error(bodyText);
  process.exit(1);
}
let apiToken;
try {
  const parsed = JSON.parse(bodyText);
  apiToken = parsed.token || parsed;
} catch {
  apiToken = bodyText;
}
console.log(JSON.stringify({ok: true, wallet: user.toBase58(), txSig, jwt, apiToken}, null, 2));

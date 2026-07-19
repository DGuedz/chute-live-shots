// Ancora a prova CHUTE na MAINNET via Memo program usando a keypair local.
// Custo real: ~0.000005 SOL de taxa por transação. Mesmo payload que o botão
// "Ancorar prova on-chain" do web app produz quando a rede selecionada é mainnet.
//
// Uso: node scripts/anchor_memo_mainnet.mjs [caminho-keypair] [memo]
// Default: ~/.config/solana/chute-mainnet-keypair.json e memo montado com os
// dados reais do quiz replay servidos pela API de produção.
//
// Exige confirmação explícita via env CONFIRM_MAINNET_SPEND=yes — este script
// gasta SOL real e não deve rodar por acidente em CI ou automação.

import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction} from '@solana/web3.js';

if (process.env.CONFIRM_MAINNET_SPEND !== 'yes') {
  console.error('✗ Bloqueado: esta transação gasta SOL real na mainnet.');
  console.error('  Rode novamente com CONFIRM_MAINNET_SPEND=yes node scripts/anchor_memo_mainnet.mjs');
  process.exit(1);
}

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const API = process.env.CHUTE_API_URL || 'https://chute-api-production.up.railway.app';
const RPC_URL = process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';

const keypairPath = process.argv[2] || `${homedir()}/.config/solana/chute-mainnet-keypair.json`;
const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keypairPath, 'utf8'))));

let memo = process.argv[3];
if (!memo) {
  const quiz = await (await fetch(`${API}/api/quizzes/argentina-spain`)).json();
  memo = `CHUTE|${quiz.fixture_id}|${quiz.snapshot_id}|${quiz.content_hash}|score:634|mainnet-proof`;
}

const connection = new Connection(RPC_URL, 'confirmed');
console.log('Rede  : mainnet-beta');
console.log('Payer :', keypair.publicKey.toBase58());
const balanceLamports = await connection.getBalance(keypair.publicKey);
console.log('Saldo :', balanceLamports / 1e9, 'SOL');
if (balanceLamports < 5000) {
  console.error('✗ Saldo insuficiente para a taxa (~0.000005 SOL). Deposite SOL real nesta wallet e tente de novo.');
  process.exit(1);
}
console.log('Memo  :', memo);

const tx = new Transaction().add(new TransactionInstruction({
  keys: [],
  programId: MEMO_PROGRAM_ID,
  data: Buffer.from(memo, 'utf8'),
}));

// RPC pública costuma expirar a confirmação por lentidão (não por falha real da tx).
// Reenvia com blockhash fresco a cada tentativa e confere se já landou antes de desistir.
const maxAttempts = 4;
let signature;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const latest = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = keypair.publicKey;
  tx.signatures = [];
  tx.sign(keypair);
  signature = tx.signatures[0].signature ? tx.signatures[0].publicKey.toBase58() : undefined;
  try {
    signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment: 'confirmed',
      lastValidBlockHeight: latest.lastValidBlockHeight,
      blockhash: latest.blockhash,
    });
    break;
  } catch (err) {
    const sentSig = err?.signature;
    if (sentSig) {
      const status = await connection.getSignatureStatuses([sentSig]);
      if (status.value[0] && !status.value[0].err) {
        signature = sentSig;
        break;
      }
    }
    console.log(`  tentativa ${attempt}/${maxAttempts} expirou, tentando de novo com blockhash fresco…`);
    if (attempt === maxAttempts) throw err;
  }
}

console.log('\n✓ Transação confirmada na mainnet-beta');
console.log(`https://explorer.solana.com/tx/${signature}`);

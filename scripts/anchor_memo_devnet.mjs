// Ancora a prova CHUTE na devnet via Memo program usando a keypair local.
// Mesmo payload que o botão "Ancorar prova on-chain" do web app produz.
//
// Uso: node scripts/anchor_memo_devnet.mjs [caminho-keypair] [memo]
// Default: ~/.config/solana/chute-devnet-keypair.json e memo montado com os
// dados reais do quiz replay servidos pela API de produção.

import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction} from '@solana/web3.js';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const API = process.env.CHUTE_API_URL || 'https://chute-api-production.up.railway.app';

const keypairPath = process.argv[2] || `${homedir()}/.config/solana/chute-devnet-keypair.json`;
const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keypairPath, 'utf8'))));

let memo = process.argv[3];
if (!memo) {
  const quiz = await (await fetch(`${API}/api/quizzes/argentina-spain`)).json();
  memo = `CHUTE|${quiz.fixture_id}|${quiz.snapshot_id}|${quiz.content_hash}|score:634`;
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
console.log('Payer :', keypair.publicKey.toBase58());
console.log('Saldo :', (await connection.getBalance(keypair.publicKey)) / 1e9, 'SOL');
console.log('Memo  :', memo);

const tx = new Transaction().add(new TransactionInstruction({
  keys: [],
  programId: MEMO_PROGRAM_ID,
  data: Buffer.from(memo, 'utf8'),
}));

const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {commitment: 'confirmed'});
console.log('\n✓ Transação confirmada na devnet');
console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);

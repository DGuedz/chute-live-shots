// Gera uma keypair Solana local para uso em mainnet (sem depender do Solana CLI).
// A chave NUNCA é impressa — só o endereço público, para você fundear com SOL real.
//
// Uso: node scripts/generate_mainnet_keypair.mjs [caminho-destino]
// Default: ~/.config/solana/chute-mainnet-keypair.json

import {writeFileSync, existsSync, chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import {Keypair} from '@solana/web3.js';

const destPath = process.argv[2] || `${homedir()}/.config/solana/chute-mainnet-keypair.json`;

if (existsSync(destPath)) {
  console.error(`✗ Já existe uma keypair em ${destPath}. Não sobrescrevendo.`);
  console.error('  Passe um caminho diferente como argumento se quiser gerar outra.');
  process.exit(1);
}

const keypair = Keypair.generate();
writeFileSync(destPath, JSON.stringify(Array.from(keypair.secretKey)));
chmodSync(destPath, 0o600);

console.log('✓ Keypair mainnet gerada em:', destPath);
console.log('  Endereço público (fundeie esta wallet com SOL real):');
console.log(' ', keypair.publicKey.toBase58());
console.log('\n  ~0.001 SOL é suficiente para dezenas de memos (~0.000005 SOL cada).');
console.log('  Depois de fundear, rode:');
console.log('  CONFIRM_MAINNET_SPEND=yes node scripts/anchor_memo_mainnet.mjs');

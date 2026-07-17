import {mkdir, chmod, access, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {Keypair} from '@solana/web3.js';

const path = `${process.env.HOME}/.config/solana/chute-devnet-keypair.json`;
try {
  await access(path, constants.F_OK);
  throw new Error(`wallet already exists at ${path}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const keypair = Keypair.generate();
await mkdir(`${process.env.HOME}/.config/solana`, {recursive: true, mode: 0o700});
await writeFile(path, JSON.stringify(Array.from(keypair.secretKey)), {mode: 0o600});
await chmod(path, 0o600);
console.log(JSON.stringify({network: 'devnet', publicKey: keypair.publicKey.toBase58(), keypairPath: path}));

import {Connection, PublicKey} from '@solana/web3.js';
import {loadConfig} from './config.js';

export function solanaStatus() {
  const config = loadConfig();
  const connection = new Connection(config.rpcUrl, 'confirmed');
  return {network: config.network, rpcUrl: config.rpcUrl, programId: new PublicKey(config.programId).toBase58(), connectionReady: Boolean(connection)};
}

export async function validateSignature(signature: string) {
  const config = loadConfig();
  const connection = new Connection(config.rpcUrl, 'confirmed');
  const result = await connection.getSignatureStatus(signature, {searchTransactionHistory: true});
  return {signature, network: config.network, status: result.value?.confirmationStatus || null, err: result.value?.err || null, valid: Boolean(result.value && !result.value.err)};
}

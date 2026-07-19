/** Pure helpers for the on-chain proof anchor + wallet session persistence.
 * Kept free of React so they can be unit-tested. */

export type Network='devnet'|'mainnet';
export type AnchorProvider={
 signAndSendTransaction?:(tx:unknown)=>Promise<{signature:string}>;
 signTransaction?:(tx:any)=>Promise<any>;
};

export const MEMO_PROGRAM_ID='MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const WALLET_STORAGE_KEY='chute-wallet-session';
export const NETWORK_STORAGE_KEY='chute-network';

const PUBLIC_DEVNET_RPC='https://api.devnet.solana.com';
const PUBLIC_MAINNET_RPC='https://api.mainnet-beta.solana.com';
export const rpcUrl=(n:Network):string=>n==='mainnet'
 ?(import.meta.env.VITE_SOLANA_MAINNET_RPC_URL||PUBLIC_MAINNET_RPC)
 :(import.meta.env.VITE_SOLANA_RPC_URL||PUBLIC_DEVNET_RPC);
export const hasPrivateDevnetRpc=():boolean=>{
 const configured=import.meta.env.VITE_SOLANA_RPC_URL;
 return Boolean(configured&&configured!==PUBLIC_DEVNET_RPC&&(/^https:\/\//.test(configured)||/\/api\/solana\/rpc$/.test(configured)));
};
export const explorerUrl=(sig:string,network:Network):string=>`https://explorer.solana.com/tx/${sig}${network==='devnet'?'?cluster=devnet':''}`;

export const buildReplayMemo=(r:{fixture_id:string|number;snapshot_id:string;content_hash:string;score:number}):string=>
 `CHUTE|${r.fixture_id}|${r.snapshot_id}|${r.content_hash}|score:${r.score}`;

const shortProofRef=(proofRef?:string|null):string|null=>{
 if(!proofRef)return null;
 if(proofRef.length<=18)return proofRef;
 return `${proofRef.slice(0,10)}…${proofRef.slice(-6)}`;
};

export const buildPredictiveMemo=(p:{fixture_id?:string;snapshot_id?:string|null;content_hash?:string|null;score:number;percentage:number;proof_ref?:string|null}):string=>{
 const base=`CHUTE-PRED|${p.fixture_id||'?'}|${p.snapshot_id||'unresolved'}|${p.content_hash||'unresolved'}|score:${Math.round(p.score)}|${p.percentage}%`;
 const proofRef=shortProofRef(p.proof_ref);
 return proofRef?`${base}|proof:${proofRef}`:base;
};

export const mapAnchorError=(e:unknown):string=>{
 const msg=e instanceof Error?e.message:String(e);
 if(/insufficient|0x1\b/i.test(msg))return 'Saldo insuficiente para a taxa (~0.000005 SOL). Use um faucet devnet.';
 return 'Transação cancelada ou rejeitada pela wallet.';
};

export type WalletSession={provider:string;publicKey:string;network:Network};
export const saveWalletSession=(s:WalletSession,storage:Storage=localStorage):void=>storage.setItem(WALLET_STORAGE_KEY,JSON.stringify(s));
export const clearWalletSession=(storage:Storage=localStorage):void=>storage.removeItem(WALLET_STORAGE_KEY);
export const loadWalletSession=(storage:Storage=localStorage):WalletSession|null=>{
 const raw=storage.getItem(WALLET_STORAGE_KEY);
 if(!raw)return null;
 try{
  const parsed=JSON.parse(raw);
  if(typeof parsed?.publicKey!=='string'||!parsed.publicKey)return null;
  return {provider:parsed.provider||'phantom',publicKey:parsed.publicKey,network:parsed.network==='mainnet'?'mainnet':'devnet'};
 }catch{storage.removeItem(WALLET_STORAGE_KEY);return null}
};

type Web3Module=typeof import('@solana/web3.js');
const defaultLoader=():Promise<Web3Module>=>import('@solana/web3.js');

/** Builds and sends a Memo transaction anchoring `memoText`.
 * Prefers signAndSendTransaction; falls back to signTransaction + sendRawTransaction. */
export async function sendMemoTransaction(
 {provider,wallet,network,memoText,loadWeb3=defaultLoader}:
 {provider:AnchorProvider;wallet:string;network:Network;memoText:string;loadWeb3?:()=>Promise<Web3Module>}
):Promise<string>{
 const {Connection,PublicKey,Transaction,TransactionInstruction}=await loadWeb3();
 const connection=new Connection(rpcUrl(network),'confirmed');
 const memo=new TransactionInstruction({keys:[],programId:new PublicKey(MEMO_PROGRAM_ID),data:new TextEncoder().encode(memoText) as any});
 const tx=new Transaction().add(memo);
 tx.feePayer=new PublicKey(wallet);
 tx.recentBlockhash=(await connection.getLatestBlockhash('confirmed')).blockhash;
 if(provider.signAndSendTransaction)return (await provider.signAndSendTransaction(tx)).signature;
 if(provider.signTransaction){
  const signed=await provider.signTransaction(tx);
  return connection.sendRawTransaction(signed.serialize());
 }
 throw Error('wallet sem suporte a transações');
}

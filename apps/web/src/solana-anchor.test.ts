import {describe,it,expect,vi} from 'vitest';
import {
 rpcUrl,explorerUrl,buildReplayMemo,buildPredictiveMemo,mapAnchorError,
 saveWalletSession,loadWalletSession,clearWalletSession,sendMemoTransaction,
 MEMO_PROGRAM_ID,WALLET_STORAGE_KEY,
} from './solana-anchor';

const memoryStorage=():Storage=>{
 const data=new Map<string,string>();
 return {
  getItem:(k:string)=>data.get(k)??null,
  setItem:(k:string,v:string)=>void data.set(k,v),
  removeItem:(k:string)=>void data.delete(k),
  clear:()=>data.clear(),
  key:()=>null,
  get length(){return data.size},
 } as Storage;
};

describe('network + explorer',()=>{
 it('resolves RPC per network',()=>{
  expect(rpcUrl('devnet')).toContain('devnet');
  expect(rpcUrl('mainnet')).toContain('mainnet-beta');
 });
 it('adds cluster param only on devnet',()=>{
  expect(explorerUrl('SIG','devnet')).toBe('https://explorer.solana.com/tx/SIG?cluster=devnet');
  expect(explorerUrl('SIG','mainnet')).toBe('https://explorer.solana.com/tx/SIG');
 });
});

describe('memo payloads',()=>{
 it('replay memo follows CHUTE|fixture|snapshot|hash|score',()=>{
  expect(buildReplayMemo({fixture_id:18179551,snapshot_id:'snap-1',content_hash:'sha256:abc',score:634}))
   .toBe('CHUTE|18179551|snap-1|sha256:abc|score:634');
 });
 it('predictive memo includes fixture, snapshot and hash',()=>{
  expect(buildPredictiveMemo({fixture_id:'argentina-spain',snapshot_id:'snap-2',content_hash:'sha256:def',score:412.4,percentage:60}))
   .toBe('CHUTE-PRED|argentina-spain|snap-2|sha256:def|score:412|60%');
 });
 it('predictive memo marks unresolved snapshot explicitly',()=>{
  expect(buildPredictiveMemo({score:0,percentage:0})).toBe('CHUTE-PRED|?|unresolved|unresolved|score:0|0%');
 });
});

describe('anchor error mapping',()=>{
 it('maps insufficient funds to faucet hint',()=>{
  expect(mapAnchorError(Error('Transaction simulation failed: insufficient lamports'))).toMatch(/faucet devnet/);
  expect(mapAnchorError(Error('custom program error: 0x1'))).toMatch(/Saldo insuficiente/);
 });
 it('maps user rejection to cancel message',()=>{
  expect(mapAnchorError(Error('User rejected the request.'))).toMatch(/cancelada ou rejeitada/);
 });
});

describe('wallet session persistence',()=>{
 it('round-trips a session',()=>{
  const s=memoryStorage();
  saveWalletSession({provider:'solflare',publicKey:'PubKey111',network:'mainnet'},s);
  expect(loadWalletSession(s)).toEqual({provider:'solflare',publicKey:'PubKey111',network:'mainnet'});
  clearWalletSession(s);
  expect(loadWalletSession(s)).toBeNull();
 });
 it('rejects corrupt or incomplete payloads and self-heals',()=>{
  const s=memoryStorage();
  s.setItem(WALLET_STORAGE_KEY,'{not json');
  expect(loadWalletSession(s)).toBeNull();
  expect(s.getItem(WALLET_STORAGE_KEY)).toBeNull();
  s.setItem(WALLET_STORAGE_KEY,JSON.stringify({provider:'phantom'}));
  expect(loadWalletSession(s)).toBeNull();
 });
 it('normalizes unknown network to devnet',()=>{
  const s=memoryStorage();
  s.setItem(WALLET_STORAGE_KEY,JSON.stringify({provider:'phantom',publicKey:'Pk',network:'testnet'}));
  expect(loadWalletSession(s)?.network).toBe('devnet');
 });
});

const fakeWeb3=()=>{
 const sendRawTransaction=vi.fn(async()=>'RAW_SIG');
 class Connection{
  constructor(public url:string,public commitment:string){}
  getLatestBlockhash=async()=>({blockhash:'HASH'});
  sendRawTransaction=sendRawTransaction;
 }
 class PublicKey{constructor(public v:string){} toBase58(){return this.v}}
 class TransactionInstruction{constructor(public cfg:any){}}
 class Transaction{
  instructions:any[]=[];feePayer:any;recentBlockhash='';
  add(ix:any){this.instructions.push(ix);return this}
  serialize(){return new Uint8Array([1])}
 }
 return {module:{Connection,PublicKey,Transaction,TransactionInstruction} as any,sendRawTransaction};
};

describe('sendMemoTransaction',()=>{
 it('prefers signAndSendTransaction and passes memo payload',async()=>{
  const {module}=fakeWeb3();
  const signAndSendTransaction=vi.fn(async(tx:any)=>{
   expect(tx.instructions).toHaveLength(1);
   expect(tx.instructions[0].cfg.programId.v).toBe(MEMO_PROGRAM_ID);
   expect(new TextDecoder().decode(tx.instructions[0].cfg.data)).toBe('CHUTE|f|s|h|score:1');
   expect(tx.recentBlockhash).toBe('HASH');
   return {signature:'SENT_SIG'};
  });
  const sig=await sendMemoTransaction({provider:{signAndSendTransaction},wallet:'Payer',network:'devnet',memoText:'CHUTE|f|s|h|score:1',loadWeb3:async()=>module});
  expect(sig).toBe('SENT_SIG');
  expect(signAndSendTransaction).toHaveBeenCalledOnce();
 });
 it('falls back to signTransaction + sendRawTransaction',async()=>{
  const {module,sendRawTransaction}=fakeWeb3();
  const signTransaction=vi.fn(async(tx:any)=>tx);
  const sig=await sendMemoTransaction({provider:{signTransaction},wallet:'Payer',network:'mainnet',memoText:'m',loadWeb3:async()=>module});
  expect(sig).toBe('RAW_SIG');
  expect(signTransaction).toHaveBeenCalledOnce();
  expect(sendRawTransaction).toHaveBeenCalledOnce();
 });
 it('throws when the wallet supports neither method',async()=>{
  const {module}=fakeWeb3();
  await expect(sendMemoTransaction({provider:{},wallet:'Payer',network:'devnet',memoText:'m',loadWeb3:async()=>module}))
   .rejects.toThrow(/sem suporte/);
 });
 it('surfaces insufficient-funds errors for mapAnchorError',async()=>{
  const {module}=fakeWeb3();
  const signAndSendTransaction=vi.fn(async()=>{throw Error('insufficient lamports')});
  const err=await sendMemoTransaction({provider:{signAndSendTransaction},wallet:'P',network:'devnet',memoText:'m',loadWeb3:async()=>module}).catch(e=>e);
  expect(mapAnchorError(err)).toMatch(/Saldo insuficiente/);
 });
});

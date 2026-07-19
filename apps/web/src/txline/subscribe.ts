import {AnchorProvider,Program} from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {Connection,PublicKey,SystemProgram,Transaction} from '@solana/web3.js';
import txoracleIdl from './txoracle.devnet.json';

const DEVNET_PROGRAM_ID=new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');
const DEVNET_TXL_MINT=new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG');

type PhantomTransactionProvider={
  publicKey?:{toBase58:()=>string}|null;
  signTransaction?:(transaction:Transaction)=>Promise<Transaction>;
  signAndSendTransaction?:(transaction:Transaction)=>Promise<{signature:string}>;
};

export async function subscribeTxlineFreeTier(provider:PhantomTransactionProvider,rpcUrl:string){
  if(!provider.publicKey||!provider.signTransaction)throw new Error('PHANTOM_TRANSACTION_UNAVAILABLE');
  const user=new PublicKey(provider.publicKey.toBase58());
  const connection=new Connection(rpcUrl,'confirmed');
  const wallet={
    publicKey:user,
    signTransaction:(transaction:Transaction)=>provider.signTransaction!(transaction),
    signAllTransactions:(transactions:Transaction[])=>Promise.all(transactions.map(transaction=>provider.signTransaction!(transaction))),
  };
  const anchorProvider=new AnchorProvider(connection,wallet as never,{commitment:'confirmed'});
  const program=new Program(txoracleIdl as never,anchorProvider);
  if(!program.programId.equals(DEVNET_PROGRAM_ID))throw new Error('TXLINE_IDL_NETWORK_MISMATCH');

  const userTokenAccount=getAssociatedTokenAddressSync(DEVNET_TXL_MINT,user,false,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  const [pricingMatrix]=PublicKey.findProgramAddressSync([new TextEncoder().encode('pricing_matrix')],DEVNET_PROGRAM_ID);
  const [tokenTreasuryPda]=PublicKey.findProgramAddressSync([new TextEncoder().encode('token_treasury_v2')],DEVNET_PROGRAM_ID);
  const tokenTreasuryVault=getAssociatedTokenAddressSync(DEVNET_TXL_MINT,tokenTreasuryPda,true,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  const transaction=new Transaction();
  if(!await connection.getAccountInfo(userTokenAccount)){
    transaction.add(createAssociatedTokenAccountInstruction(user,userTokenAccount,user,DEVNET_TXL_MINT,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
  }
  transaction.add(await program.methods.subscribe(1,4).accounts({
    user,
    pricingMatrix,
    tokenMint:DEVNET_TXL_MINT,
    userTokenAccount,
    tokenTreasuryVault,
    tokenTreasuryPda,
    tokenProgram:TOKEN_2022_PROGRAM_ID,
    systemProgram:SystemProgram.programId,
    associatedTokenProgram:ASSOCIATED_TOKEN_PROGRAM_ID,
  }).instruction());
  const latest=await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash=latest.blockhash;
  transaction.feePayer=user;
  // signTransaction + envio pelo nosso RPC Devnet: signAndSendTransaction submeteria
  // pela rede configurada no app da Phantom, que pode estar em Mainnet.
  const result=provider.signTransaction
    ?await (async()=>{
      const signed=await provider.signTransaction!(transaction);
      return {signature:await connection.sendRawTransaction(signed.serialize())};
    })()
    :await provider.signAndSendTransaction!(transaction);
  try{
    await connection.confirmTransaction({signature:result.signature,...latest},'confirmed');
  }catch(e){
    // Blockhash pode expirar enquanto a Phantom segura o popup; a tx ainda pode ter entrado.
    const status=(await connection.getSignatureStatuses([result.signature])).value[0];
    if(!status||status.err)throw e;
  }
  return result.signature;
}

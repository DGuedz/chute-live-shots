import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './neo-arcade-tokens.css';
import './style.css';
import './neo-arcade-main.css';
import './neo-arcade-sections.css';
import { Header } from './components/Header';
import { Icon, IconShowcase } from './icons';
import { CleanButton, StatRow, StatusBadge, InfoAlert } from './components/CleanComponents';
import './quiz.css';
import './premium.css';
import './solana-accent.css';
import './solana-system.css';
import './high-level-layout.css';
import {bootTelegramMiniApp} from './telegram-mini-app';
import {type Network,rpcUrl,explorerUrl as anchorExplorerUrl,buildReplayMemo,buildPredictiveMemo,mapAnchorError,sendMemoTransaction,saveWalletSession,clearWalletSession,loadWalletSession,NETWORK_STORAGE_KEY} from './solana-anchor';
import './stats.css';
import './live-shots.css';
import './chute-motion.css';
import './slow-motion.css';
import './logo.css';
import './intro-video.css';
import './intro-sequence.css';
import './intro-fade.css';
import './unified-palette.css';
import './reading.css';
import './predictive.css';

type Option={value:string|number;label:string;probability:number;odd:number;risk:string;reward_multiplier:number};
type PredictiveProgress={status:string;quiz_id:string;participant_id?:string;progress:number;total?:number;score?:number;percentage?:number;breakdown?:Array<{question_id:string;correct:boolean;payoff:number;expected:any;actual:any}>;fixture_id?:string;snapshot_id?:string|null;content_hash?:string|null;message?:string;timestamp?:string};
type RevealedAnswer={question_id:string;correct:boolean;payoff:number;actual:any};
type Question={id:string;kind:string;answer_type:string;prompt:string;options:Option[];stat_basis:string};
type QuizMeta={title:string;teams:string[];fixture_id:number;snapshot_id:string;content_hash:string;source_timestamp:string;start_time?:string;proof_refs:string[];data_status:string;model_version:string;editorial_match?:string[];snapshot_metrics?:{goals:number[];corners:number[];yellow_cards:number[]}};
type Result=QuizMeta&{score:number;exact_hits:number;total_error:number;proof_status:string;ranking:any[]};
type Fixture={fixture_id:string;home_team:string;away_team:string;start_time?:string|number;game_state?:string;network:string;snapshot_status?:string|null};
type TierInfo={id:string;label:string;description:string;available:boolean;hint?:string|null};
type Insights={fixture_id:string;data_status:string;disclaimer?:string;sources:string[];tournament?:{name:string;format:string;highlights:string[];team_stats:{team:string;goals:number;xg:number|null;shots:number|null;clean_sheets:number|null}[];player_stats:{player:string;team:string;goals:number;assists:number;shots:number|null}[]};editorial?:{match:string;venue:string;path:Record<string,string>;reading:{signal:string;edge:string;detail:string}[];tier_hints:Record<string,string>}|null;tiers:TierInfo[];has_snapshot:boolean};
const API_URL=import.meta.env.VITE_API_URL||'http://127.0.0.1:8000';
const participant=window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()||'demo-telegram-user';
const teamFlag=(team:string)=>({Spain:'🇪🇸',Argentina:'🇦🇷',Austria:'🇦🇹',France:'🇫🇷',England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}[team]||'⚽');
type SolanaProvider={isPhantom?:boolean;publicKey?:{toBase58:()=>string}|null;connect:(opts?:{onlyIfTrusted?:boolean})=>Promise<{publicKey:{toBase58:()=>string}}|void>;disconnect?:()=>Promise<void>;signMessage?:(message:Uint8Array,display?:string)=>Promise<{signature:Uint8Array}>;signAndSendTransaction?:(tx:unknown)=>Promise<{signature:string}>;signTransaction?:(tx:any)=>Promise<any>};
declare global{interface Window{solana?:SolanaProvider;phantom?:{solana?:SolanaProvider};solflare?:SolanaProvider;backpack?:SolanaProvider}}
type WalletId='phantom'|'solflare'|'backpack';
const WALLETS:{id:WalletId;label:string;get:()=>SolanaProvider|undefined}[]=[
 {id:'phantom',label:'Phantom',get:()=>window.phantom?.solana||(window.solana?.isPhantom?window.solana:undefined)},
 {id:'solflare',label:'Solflare',get:()=>window.solflare},
 {id:'backpack',label:'Backpack',get:()=>window.backpack},
];
const RPC_URL=rpcUrl;

function App(){
 const [intro,setIntro]=useState(()=>{const q=new URLSearchParams(location.search);return !q.has('demo-home')&&sessionStorage.getItem('chute-intro-seen')!=='1'});
 const [screen,setScreen]=useState<'home'|'match'|'quiz'|'result'|'setup'|'icons'>('home'); const [meta,setMeta]=useState<QuizMeta|null>(null); const [question,setQuestion]=useState<Question|null>(null); const [answer,setAnswer]=useState<string|number|null>(null); const [progress,setProgress]=useState({answered:0,total:5}); const [result,setResult]=useState<Result|null>(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(false); const [introBeat,setIntroBeat]=useState(0); const [introFading,setIntroFading]=useState(false); const [wallet,setWallet]=useState(''); const [walletError,setWalletError]=useState(''); const [walletId,setWalletId]=useState<WalletId>('phantom'); const [walletPicker,setWalletPicker]=useState(false); const [walletConnecting,setWalletConnecting]=useState(false); const [network,setNetwork]=useState<Network>(()=>localStorage.getItem(NETWORK_STORAGE_KEY)==='mainnet'?'mainnet':'devnet'); const [balance,setBalance]=useState<number|null>(null); const [anchorSig,setAnchorSig]=useState(''); const [anchorBusy,setAnchorBusy]=useState(false); const [anchorError,setAnchorError]=useState(''); const [feedback,setFeedback]=useState(''); const [txlineStep,setTxlineStep]=useState('idle'); const [fixtures,setFixtures]=useState<Fixture[]>([]); const [fixtureId,setFixtureId]=useState('argentina-spain'); const [tier,setTier]=useState('chutes'); const [insights,setInsights]=useState<Insights|null>(null); const [livePulse,setLivePulse]=useState<{at:string;sequence?:string;status:string}|null>(null);
 const [quizMode,setQuizMode]=useState<'replay'|'predictive'>('replay');
 const [selectedTeam,setSelectedTeam]=useState<'Argentina'|'Spain'>('Argentina');
 const [quizId,setQuizId]=useState('');
 const [ticTacTime,setTicTacTime]=useState(5);
 const [predictiveProgress,setPredictiveProgress]=useState<PredictiveProgress|null>(null);
 const [revealedAnswers,setRevealedAnswers]=useState<Record<string,RevealedAnswer>>({});
 const [pollingActive,setPollingActive]=useState(false);
 const [predictiveQuestions,setPredictiveQuestions]=useState<Question[]>([]);
 useEffect(()=>{bootTelegramMiniApp();const initData=window.Telegram?.WebApp?.initData;if(initData)fetch(`${API_URL}/api/session/telegram`,{method:'POST',headers:{'X-Telegram-Init-Data':initData}}).catch(()=>undefined);void loadFixtures()},[]);
 const loadFixtures=async()=>{try{const b=await(await fetch(`${API_URL}/api/fixtures`)).json();setFixtures(b.fixtures||[])}catch{/* home still renders the guaranteed replay card */}};
 // Live pulse: while reading a match, poll the persisted TxLINE snapshot so new worker syncs surface without reload.
 useEffect(()=>{if(screen!=='match')return;const poll=async()=>{try{const r=await fetch(`${API_URL}/api/fixtures/${insights?.fixture_id||fixtureId}/snapshot`);if(!r.ok){setLivePulse(null);return}const b=await r.json();setLivePulse({at:b.source_timestamp||b.created_at,sequence:b.sequence,status:b.data_status})}catch{setLivePulse(null)}};void poll();const id=window.setInterval(poll,20000);return()=>window.clearInterval(id)},[screen,fixtureId]);
 const fixtureBadge=(f:Fixture)=>f.snapshot_status==='txline_replay'?'REPLAY VALIDADO':f.snapshot_status?'DEVNET · SNAPSHOT':'AGENDADO · SEM DADOS';
 const fixturePlayable=(f:Fixture)=>Boolean(f.snapshot_status);
 const loadMeta=async(fid:string=fixtureId)=>{setLoading(true);setError('');try{setFixtureId(fid);const ir=await fetch(`${API_URL}/api/fixtures/${fid}/insights`);const ib=ir.ok?await ir.json():null;setInsights(ib);const r=await fetch(`${API_URL}/api/quizzes/${fid}`);const b=r.ok?await r.json():null;if(b){setMeta({title:b.title,teams:b.teams,fixture_id:b.fixture_id,snapshot_id:b.snapshot_id,content_hash:b.content_hash,source_timestamp:b.source_timestamp,start_time:b.start_time,proof_refs:b.proof_refs,data_status:b.data_status,model_version:b.model_version,editorial_match:b.editorial_match,snapshot_metrics:b.snapshot_metrics})}else setMeta(null);if(!b&&!ib)throw Error('Fixture sem snapshot verificado nem leitura editorial (MISSING_DATA).');setScreen('match')}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os dados do fixture.')}finally{setLoading(false)}};
 const startQuiz=async(tierId:string=tier)=>{setTier(tierId);setLoading(true);setError('');try{const r=await fetch(`${API_URL}/api/quizzes/${fixtureId}/current?participant_id=${participant}&tier=${tierId}`);const b=await r.json();if(!r.ok)throw Error(b.detail?.error||'Tier indisponível para este fixture.');setQuestion(b.question||null);setProgress({answered:b.answered||0,total:b.total||5});if(b.status==='complete'){await loadResult(tierId)}else setScreen('quiz')}catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir o quiz.')}finally{setLoading(false)}};
 const loadResult=async(tierId:string=tier)=>{const b=await(await fetch(`${API_URL}/api/quizzes/${fixtureId}/ranking?tier=${tierId}`)).json();const mine=b.ranking?.find((x:any)=>x.participant_id===participant);if(mine&&meta)setResult({...meta,...mine,...b});setScreen('result')};
 const submit=async()=>{if(!question||answer===null)return;setLoading(true);setError('');try{const r=await fetch(`${API_URL}/api/quizzes/${fixtureId}/answers?tier=${tier}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({participant_id:participant,question_id:question.id,answer,request_id:crypto.randomUUID()})});const b=await r.json();if(!r.ok)throw Error(typeof b.detail==='string'?b.detail:'Resposta inválida');setFeedback('Chute registrado · US$ 1 paper/devnet');setAnswer(null);setProgress({answered:b.answered,total:b.total});if(b.status==='complete')await loadResult();else setQuestion(b.next_question);window.setTimeout(()=>setFeedback(''),1800)}catch(e){setError(e instanceof Error?e.message:'Erro inesperado')}finally{setLoading(false)}};
 const copyResult=()=>{if(!result)return; navigator.clipboard?.writeText(`CHUTE · ${result.score} pontos · ${result.exact_hits} exatos · ${result.snapshot_id} · ${result.content_hash}`);};
 const enter=()=>{sessionStorage.setItem('chute-intro-seen','1');setIntro(false);void loadMeta()};

 // Predictive Quiz Functions
 const startPredictiveQuiz=async(tierId:string=tier)=>{
  setTier(tierId);setLoading(true);setError('');setAnswer(null);setRevealedAnswers({});
  try{
   const r=await fetch(`${API_URL}/api/predictions/${fixtureId}/${selectedTeam}/${tierId}`);
   if(!r.ok)throw Error('Tier indisponível para este fixture.');
   const b=await r.json();
   setMeta({title:b.title,teams:[selectedTeam],fixture_id:b.fixture_id,snapshot_id:'',content_hash:'',source_timestamp:new Date().toISOString(),proof_refs:[],data_status:b.data_status,model_version:'predictive'});
   setPredictiveQuestions(b.questions||[]);setPredictiveProgress(null);setQuestion(b.questions?.[0]||null);setProgress({answered:0,total:b.questions?.length||5});setQuizId(b.quiz_id);setTicTacTime(5);setPollingActive(false);setScreen('quiz')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir o quiz preditivo.')}finally{setLoading(false)}
 };

 const submitPredictiveAnswer=async()=>{
  if(!question||answer===null||!quizId)return;setLoading(true);setError('');
  try{
   const r=await fetch(`${API_URL}/api/predictions/${quizId}/answer`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({participant_id:participant,question_id:question.id,answer,request_id:crypto.randomUUID()})});
   const b=await r.json();
   if(!r.ok)throw Error(typeof b.detail==='string'?b.detail:'Resposta inválida');
   setFeedback('Chute registrado · aguardando resolução TxLINE');setTicTacTime(5);setPollingActive(true);
   const newAnswered=progress.answered+1;
   setProgress({...progress,answered:newAnswered});
   if(newAnswered>=progress.total){
    await pollPredictiveProgress();setScreen('result');
   }else{
    // O backend só confirma o aceite; a próxima pergunta vem da lista congelada no início do quiz.
    setQuestion(predictiveQuestions[newAnswered]||null);
    window.setTimeout(()=>void pollPredictiveProgress(),500);
   }
   setAnswer(null);
  }catch(e){setError(e instanceof Error?e.message:'Erro ao enviar resposta')}finally{setLoading(false)}
 };

 const pollPredictiveProgress=async()=>{
  if(!quizId)return;
  try{
   const r=await fetch(`${API_URL}/api/predictions/${quizId}/progress?participant_id=${participant}`);
   if(r.ok){
    const p:PredictiveProgress=await r.json();
    setPredictiveProgress(p);
    // snapshot_pending/no_answers vêm sem breakdown — a tela de resultado trata como "aguardando resolução".
    if(Array.isArray(p.breakdown))setRevealedAnswers(Object.fromEntries(p.breakdown.map((b:any)=>[b.question_id,{question_id:b.question_id,correct:b.correct,payoff:b.payoff,actual:b.actual}])));
   }
  }catch(e){console.error('Poll error:',e)}
 };

 // Tic-tac timer for predictive quiz
 useEffect(()=>{
  if(screen!=='quiz'||quizMode!=='predictive'||ticTacTime<=0)return;
  const timer=window.setTimeout(()=>setTicTacTime(t=>t-1),1000);
  return()=>window.clearTimeout(timer);
 },[screen,quizMode,ticTacTime]);

 // Polling for predictive progress updates
 useEffect(()=>{
  if(!pollingActive||!quizId)return;
  const interval=window.setInterval(()=>pollPredictiveProgress(),2000);
  return()=>window.clearInterval(interval);
 },[pollingActive,quizId]);
 const haptic=(kind:'selection'|'impact'|'success')=>{const h=window.Telegram?.WebApp?.HapticFeedback;if(kind==='selection')h?.selectionChanged?.();else if(kind==='success')h?.notificationOccurred?.('success');else h?.impactOccurred?.('medium')};
 const walletProvider=(id:WalletId=walletId)=>WALLETS.find(w=>w.id===id)?.get();
 const availableWallets=WALLETS.filter(w=>w.get());
 const refreshBalance=async(publicKey:string,net:Network=network)=>{try{const r=await fetch(RPC_URL(net),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[publicKey]})});const b=await r.json();if(typeof b.result?.value==='number')setBalance(b.result.value/1e9);else setBalance(null)}catch{setBalance(null)}};
 const connectWallet=async(id:WalletId=walletId)=>{
  setWalletError('');setWalletPicker(false);setWalletConnecting(true);setWalletId(id);
  const label=WALLETS.find(w=>w.id===id)!.label;
  const provider=walletProvider(id);
  try{
   if(!provider){setWalletError(`O Telegram não injeta a ${label} aqui. Abra o CHUTE no navegador da wallet para conectar.`);return}
   const response=await provider.connect();
   const publicKey=(response&&'publicKey'in response?response.publicKey:provider.publicKey)!.toBase58();
   if(!provider.signMessage){setWalletError(`Esta versão da ${label} não suporta signMessage; sessão não verificada.`);return}
   const challenge=await(await fetch(`${API_URL}/api/wallet/challenge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({public_key:publicKey})})).json();
   const signed=await provider.signMessage(new TextEncoder().encode(challenge.message),'utf8');
   const signature=btoa(String.fromCharCode(...signed.signature));
   const session=await fetch(`${API_URL}/api/wallet/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({public_key:publicKey,network,signature})});
   if(!session.ok)throw Error('assinatura rejeitada');
   setWallet(publicKey);
   saveWalletSession({provider:id,publicKey,network});
   void refreshBalance(publicKey);
   haptic('success');
  }catch{setWalletError(`Assinatura ${label} cancelada ou inválida — sessão não criada.`)}
  finally{setWalletConnecting(false)}
 };
 const disconnectWallet=async()=>{await walletProvider()?.disconnect?.();setWallet('');setBalance(null);clearWalletSession()};
 // Ancora a prova do resultado on-chain via Memo program — transação real assinada pela wallet.
 const anchorProof=async(memoText:string)=>{
  setAnchorError('');
  const provider=walletProvider();
  if(!wallet||!provider){setAnchorError('Conecte a wallet para ancorar a prova on-chain.');return}
  setAnchorBusy(true);
  try{
   const signature=await sendMemoTransaction({provider,wallet,network,memoText});
   setAnchorSig(signature);haptic('success');
  }catch(e){setAnchorError(mapAnchorError(e))}
  finally{setAnchorBusy(false)}
 };
 const explorerUrl=(sig:string)=>anchorExplorerUrl(sig,network);
 const switchNetwork=(net:Network)=>{setNetwork(net);localStorage.setItem(NETWORK_STORAGE_KEY,net);if(wallet)void refreshBalance(wallet,net)};
 // Restaura a sessão de wallet salva; tenta reconexão silenciosa (onlyIfTrusted) quando o provider está injetado.
 useEffect(()=>{const saved=loadWalletSession();if(!saved)return;if(saved.network==='mainnet')setNetwork('mainnet');setWalletId(saved.provider as WalletId);setWallet(saved.publicKey);void refreshBalance(saved.publicKey,saved.network);const provider=WALLETS.find(w=>w.id===saved.provider)?.get();provider?.connect({onlyIfTrusted:true}).catch(()=>undefined)},[]);
 const shortWallet=wallet?`${wallet.slice(0,4)}…${wallet.slice(-4)}`:'';
 const startTxlineSetup=async()=>{setTxlineStep('connecting');if(!wallet){await connectWallet();if(!wallet){setTxlineStep('idle');return}}setTxlineStep('guest');try{const response=await fetch(`${API_URL}/api/txline/guest`,{method:'POST'});if(!response.ok)throw new Error('Não foi possível iniciar a sessão TxLINE.');setTxlineStep('ready')}catch{setTxlineStep('error')}};
 const fixtureDate=(value?:string)=>value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'data indisponível';
 const questionGroup=(kind:string)=>kind.includes('goal')||kind==='winner'?'PLACAR & RESULTADO':kind.includes('corner')?'EVENTOS · ESCANTEIOS':kind.includes('yellow')?'EVENTOS · CARTÕES':'LEITURA TXLINE';
 const selectedOption=question?.options.find(o=>o.value===answer);
 const questionRisk=(q:Question)=>q.options.some(o=>o.risk.startsWith('ZEBRA'))?'TEM ZEBRA':'ACESSÍVEL';
 const potentialPoints=selectedOption?Math.round(100*selectedOption.reward_multiplier):Math.round(100*Math.max(...(question?.options.map(o=>o.reward_multiplier)||[1])));
 const introLines=['Dados vivos no lance','TxLINE lê o jogo','Solana prova a leitura','Telegram reúne a torcida','Cinco chutes. Um ranking','Entre no matchday.'];
 if(intro)return <main className="intro-shell"><section className={`intro${introFading?' intro-fading':''}`}><video className="intro-video" autoPlay muted playsInline poster="/chute-cover.png" onEnded={enter} onTimeUpdate={e=>{setIntroBeat(Math.min(introLines.length-1,Math.floor(e.currentTarget.currentTime/1.6)));setIntroFading(e.currentTarget.currentTime>=8.4)}}><source src="/chute-intro.mp4" type="video/mp4"/></video><div className="intro-pixels"/><div className="intro-shade"/><div className="intro-copy"><span className="intro-kicker">TXLINE · SUPERTEAM SPORTS</span><div className="intro-line" key={introBeat}>{introLines[introBeat]}</div><button onClick={enter}>Ver estatísticas <span>→</span></button><button className="intro-skip" onClick={enter}>Pular intro</button></div><div className="intro-mark">LIVE SHOTS<br/><b>{String(introBeat+1).padStart(2,'0')} / 06</b></div><div className="intro-ball">●</div></section></main>;
 return <main>
 {screen==='icons'&&<IconShowcase/>}
 {screen!=='icons'&&<><Header wallet={wallet} network={network} loading={walletConnecting} onMenuClick={()=>setScreen('home')} onWalletClick={()=>{if(wallet)void disconnectWallet();else if(availableWallets.length>1)setWalletPicker(v=>!v);else void connectWallet(availableWallets[0]?.id||'phantom')}} onSettingsClick={()=>setScreen('setup')}/>
 {walletPicker&&!wallet&&<div className="wallet-picker">{availableWallets.map(w=><button key={w.id} onClick={()=>void connectWallet(w.id)}>{w.label}</button>)}</div>}
 {walletError&&<InfoAlert type="error" message={walletError} dismissible onDismiss={()=>setWalletError('')}/>}

  {screen==='setup'&&<section className="setup-panel"><button className="back" onClick={()=>setScreen('home')}>← Início</button><p className="eyebrow">TXLINE · SETUP DE TESTE</p><h2>Conectar dados<br/><em>em tempo real.</em></h2><p className="muted">Fluxo seguro para testar wallet, sessão TxLINE e preparação do Service Level 12.</p><div className="setup-steps"><div className={txlineStep==='connecting'?'active':''}><b>01</b><span>Wallet Phantom</span><small>{wallet?shortWallet:'Aguardando conexão'}</small></div><div className={txlineStep==='guest'?'active':''}><b>02</b><span>Guest JWT</span><small>Sessão privada no backend</small></div><div className={txlineStep==='ready'?'active':''}><b>03</b><span>Subscribe SL12</span><small>Mainnet · aprovação manual</small></div></div>{txlineStep==='ready'?<div className="setup-ready">✓ Sessão TxLINE pronta.<br/><small>O próximo passo exige aprovação da transação na Phantom. Nenhum SOL foi movimentado neste teste.</small></div>:txlineStep==='error'?<div className="wallet-error">Não foi possível iniciar o guest session. Verifique o host TxLINE configurado.</div>:<button onClick={startTxlineSetup} disabled={txlineStep==='connecting'}>{txlineStep==='connecting'?'Conectando…':'Iniciar setup de teste'} <span>→</span></button>}<p className="fine">Modo atual: dry-run/devnet. A transação mainnet não é enviada por esta tela.</p></section>}

  {screen==='home'&&<>
   <section className="hero landing-hero"><div className="hero-art"><img src="/chute-cover.png" alt="Jogador em campo sob luzes do estádio"/><span className="art-stamp">AO VIVO<br/><b>01</b></span></div><p className="eyebrow">FUTEBOL, DADOS & PALPITE</p><h1>Jogue o momento.<br/><em>Prove a leitura.</em></h1><p className="muted">O jogo começa antes da bola rolar. Leia os sinais, faça seu chute e transforme sua intuição em prova.</p><a className="telegram-cta" href="https://t.me/chute_app" target="_blank" rel="noreferrer">Jogar pelo Telegram <span>↗</span></a><button className="ghost-cta" onClick={()=>loadMeta()} disabled={loading}>{loading?'Carregando…':'Ver o matchday demo'} <span>→</span></button><div className="hero-proof"><span>● TXLINE VERIFIED</span><span>● SUPERTEAM SPORTS</span><span>● DEVNET</span></div>{error&&<p className="error">{error}</p>}</section>
   <section className="opportunity-hub"><div className="hub-heading"><div><p className="eyebrow">CHUTE HUB · REPLAY</p><h2>Oportunidades<br/><em>mineradas.</em></h2></div><span className="live-dot">● TxLINE</span></div><p className="muted">Dados verificados para uma leitura de jogo auditável.</p>{fixtures.length===0&&<div className="opportunity-card featured"><div className="opp-top"><span>01 · REPLAY TXLINE</span><span className="opp-status">DEVNET</span></div><p>Carregando fixtures persistidos…</p><button onClick={()=>loadMeta('argentina-spain')} disabled={loading}>{loading?'Abrindo…':'Ler oportunidade'} <span>→</span></button></div>}{fixtures.map((f,i)=><div className={`opportunity-card${fixturePlayable(f)?' featured':''}`} key={f.fixture_id}><div className="opp-top"><span>{String(i+1).padStart(2,'0')} · TXLINE</span><span className="opp-status">{fixtureBadge(f)}</span></div><div className="fixture-line"><span className="team-mark">{teamFlag(f.home_team)}</span><strong>{f.home_team}</strong><span className="fixture-x">×</span><span className="team-mark">{teamFlag(f.away_team)}</span><strong>{f.away_team}</strong></div><p>Fixture #{f.fixture_id} · {f.network}{fixturePlayable(f)?' · snapshot verificado':' · aguardando snapshot de score'}</p><button onClick={()=>loadMeta(f.fixture_id)} disabled={loading}>{loading?'Abrindo…':fixturePlayable(f)?'Ler oportunidade':'Ler pré-jogo'} <span>→</span></button></div>)}</section><section className="state-section"><p className="eyebrow">TRÊS ESTADOS. UMA LEITURA.</p><div className="state-grid"><article><span className="state-num">01</span><h3>Pré-jogo</h3><p>Leia dados, forma e contexto antes do apito.</p></article><article><span className="state-num orange">02</span><h3>Lance</h3><p>Faça seu palpite. Uma decisão, sem replay.</p></article><article><span className="state-num pink">03</span><h3>Resultado</h3><p>Compare, pontue e prove como você chegou lá.</p></article></div></section>
   <section className="ecosystem"><div><p className="eyebrow">DO CAMPO PARA A REDE</p><h2>Um novo ritual de matchday.</h2><p className="muted">CHUTE é a camada humana do TxLINE: dados verificáveis viram disputa, conversa e comunidade.</p></div><div className="ecosystem-tags"><span>TXLINE</span><span>SUPERTEAM</span><span>SOLANA</span></div></section>
   <section className="final-cta"><p className="eyebrow">A BOLA ESTÁ COM VOCÊ</p><h2>Seu palpite.<br/>Sua prova.</h2><a className="telegram-cta" href="https://t.me/chute_app" target="_blank" rel="noreferrer">Entrar no CHUTE <span>↗</span></a><small>Disponível no Telegram · experiência devnet</small></section><nav className="mobile-nav" aria-label="Navegação principal"><button className={screen==='home'?'active':''} onClick={()=>setScreen('home')}><span>⌂</span>Início</button><button onClick={()=>loadMeta()}><span>◎</span>Explorar</button><button onClick={()=>setScreen('icons')}><span>🎨</span>Icons</button><button onClick={()=>setError('O ranking abre após seu primeiro chute.')}><span>✦</span>Ranking</button></nav>
  </>}

  {screen==='match'&&(meta||insights)&&<section><button className="back" onClick={()=>setScreen('home')}>← Início</button><p className="eyebrow">{meta?'MATCHDAY · TXLINE':'PRÉ-JOGO · LEITURA EDITORIAL'}</p><div className="fixture-date">Fixture #{meta?.fixture_id||insights?.fixture_id}{meta?.start_time?` · ${fixtureDate(meta.start_time)}`:''}{insights?.editorial?` · ${insights.editorial.venue}`:''}</div>{livePulse&&<span className="live-pulse"><i/>SNAPSHOT TXLINE {livePulse.sequence?`· seq ${livePulse.sequence}`:''} · {new Date(livePulse.at).toLocaleTimeString('pt-BR')}</span>}
   {meta&&<><div className="match-score-card"><div className="score-team"><span className="team-flag">{teamFlag(meta.teams[0])}</span><strong>{meta.teams[0]}</strong></div><div className="score-center"><small>FINAL</small><b>{meta.snapshot_metrics?.goals?.[0]||0} — {meta.snapshot_metrics?.goals?.[1]||0}</b><span>{meta.data_status==='txline_replay'?'REPLAY':'DEVNET'} · DEVNET</span></div><div className="score-team"><span className="team-flag">{teamFlag(meta.teams[1])}</span><strong>{meta.teams[1]}</strong></div></div><p className="muted match-lede">Snapshot TxLINE congelado em {new Date(meta.source_timestamp).toLocaleString('pt-BR')}.</p><div className="stat-grid">{[['GOLS',meta.snapshot_metrics?.goals||[0,0]],['ESCANTEIOS',meta.snapshot_metrics?.corners||[0,0]],['AMARELOS',meta.snapshot_metrics?.yellow_cards||[0,0]]].map(([label,values]:any)=><div className="stat-card" key={label}><small>{label}</small><strong>{values[0]} — {values[1]}</strong><span>{meta.teams[0]} · {meta.teams[1]}</span></div>)}</div><div className="card"><div><small>FONTE</small><strong>{meta.data_status==='txline_replay'?'TxLINE replay':'TxLINE devnet'}</strong></div><div><small>SNAPSHOT</small><strong>{meta.snapshot_id}</strong></div><div><small>PROVA</small><strong>{meta.data_status==='txline_replay'?'Merkle validada':'Snapshot sem validação on-chain'}</strong></div></div></>}
   {insights?.editorial&&<><h2 className="reading-title">{insights.editorial.match}</h2><div className="reading-path">{Object.entries(insights.editorial.path).map(([team,p])=><span key={team}>{teamFlag(team)} {p}</span>)}</div><p className="eyebrow" style={{marginTop:12}}>SINAIS DA PARTIDA</p><div className="signal-list">{insights.editorial.reading.map(r=>{const homeTeam=meta?.teams?.[0]||Object.keys(insights.editorial!.path)[0];const edgeClass=r.edge==='equilíbrio'?'':r.edge===homeTeam||r.edge==='Spain'?' edge-home':' edge-away';return <div className="signal-card" key={r.signal}><div className="signal-side"><span className="signal-name">{r.signal}</span><span className={`edge-chip${edgeClass}`}>{r.edge==='equilíbrio'?'EQUILÍBRIO':`${teamFlag(r.edge)} ${r.edge.toUpperCase()}`}</span></div><span className="signal-detail">{r.detail}</span></div>})}</div></>}
   {insights?.tournament&&!meta&&<><p className="eyebrow" style={{marginTop:12}}>NÚMEROS DO TORNEIO</p><div className="team-strip">{insights.tournament.team_stats.slice(0,5).map(t=><div className="stat-card" key={t.team}><small>{teamFlag(t.team==='Espanha'?'Spain':t.team==='França'?'France':t.team==='Inglaterra'?'England':t.team)} {t.team.toUpperCase()}</small><strong>{t.goals} gols{t.xg?` · ${t.xg} xG`:''}</strong><span>{t.shots?`${t.shots} finalizações`:''}{t.clean_sheets?` · ${t.clean_sheets} CS`:''}</span></div>)}</div><div className="player-list">{insights.tournament.player_stats.slice(0,3).map(p=><div className="player-row" key={p.player}><strong>{p.player}</strong><span>{p.team} · {p.goals} gols · {p.assists} assist.</span></div>)}</div></>}
   {insights?.disclaimer&&insights.data_status==='editorial_curated'&&<div className="disclaimer"><span>⚠</span><span>{insights.disclaimer}</span></div>}
   <p className="eyebrow" style={{marginTop:16}}>MODO DO QUIZ</p><div className="mode-toggle"><button className={quizMode==='replay'?'active':''} onClick={()=>{setQuizMode('replay');haptic('selection')}}>REPLAY · Verificado</button><button className={quizMode==='predictive'?'active':''} onClick={()=>{setQuizMode('predictive');haptic('selection')}}>PREDITIVO · Live</button></div>
   {quizMode==='predictive'&&<><p className="eyebrow">ESCOLHA A EQUIPE</p><div className="team-selector"><button className={`team-button${selectedTeam==='Argentina'?' selected':''}`} onClick={()=>{setSelectedTeam('Argentina');haptic('selection')}} disabled={loading}>{teamFlag('Argentina')} Argentina</button><button className={`team-button${selectedTeam==='Spain'?' selected':''}`} onClick={()=>{setSelectedTeam('Spain');haptic('selection')}} disabled={loading}>{teamFlag('Spain')} Spain</button></div></>}
   <p className="eyebrow" style={{marginTop:16}}>ESCOLHA SEU TIER</p><div className="tier-grid">{(insights?.tiers||[]).map(t=>{const tierLabel=t.id==='chutes'?'CHUTES A GOL':t.id==='escanteios'?'ESCANTEIOS':t.id==='faltas'?'FALTAS & CARTÕES':t.label;return <button key={t.id} className={`tier-card${t.available?(tier===t.id?' selected':''):' locked'}`} disabled={!t.available||loading} onClick={()=>{haptic('impact');quizMode==='predictive'?void startPredictiveQuiz(t.id):void startQuiz(t.id)}}><div className="tier-head"><strong>{tierLabel}</strong><span className="tier-state">{t.available?'5 PERGUNTAS':'SEM DADOS'}</span></div><span className="tier-desc">{t.description}{!t.available?' · aguardando snapshot TxLINE (fail-closed)':''}</span>{t.hint&&<span className="tier-hint">{t.hint}</span>}</button>})}</div>
   {!insights?.has_snapshot&&<p className="fine">O quiz deste fixture abre quando o TxLINE publicar o snapshot de score verificável. A leitura acima é editorial e não define resultado.</p>}
   <p className="fine">Cada tier gera 5 perguntas com probabilidade e odd auditáveis; a leitura estatística acima é o seu mapa para escolher.</p>{error&&<p className="error">{error}</p>}</section>}

  {screen==='quiz'&&quizMode==='replay'&&meta&&question&&<section><button className="back" onClick={()=>setScreen('match')}>← Matchday</button><div className="quiz-context"><span>{meta.teams.join(' × ')}</span><span>{(insights?.tiers.find(t=>t.id===tier)?.label||tier).toUpperCase()} · #{meta.fixture_id}</span></div><div className="quiz-progress"><span>CHUTE {progress.answered+1} / {progress.total}</span><span>{Math.round(progress.answered/progress.total*100)}%</span></div><div className="question-meta"><span>{questionGroup(question.kind)}</span><b>{questionRisk(question)}</b></div><h2>{question.prompt}</h2><p className="stat-basis">Base: {question.stat_basis}</p><div className="risk-strip"><span>STAKE <strong>US$ 1</strong></span><span>ATÉ <strong>+{potentialPoints} pts</strong></span><span>PAPER · DEVNET</span></div><div className="quiz-options">{question.options.map(o=><button key={String(o.value)} className={answer===o.value?'selected':''} onClick={()=>{setAnswer(o.value);haptic('selection')}}><span>{o.label}</span><small style={{display:'block',opacity:.75}}>{Math.round(o.probability*100)}% · odd {o.odd} · {o.risk}</small></button>)}</div><button disabled={answer===null||loading} onClick={()=>{haptic('impact');submit()}}>{loading?'Registrando…':'Confirmar chute'} <span>→</span></button>{feedback&&<div className="answer-feedback">✓ {feedback}</div>}{error&&<p className="error">{error}</p>}<p className="fine">Sua leitura é registrada antes da próxima pergunta. Nenhum valor real é movimentado.</p></section>}

  {screen==='quiz'&&quizMode==='predictive'&&meta&&question&&<section className="predictive-mode"><button className="back" onClick={()=>setScreen('match')}>← Matchday</button><div className="quiz-context"><span>{selectedTeam}</span><span>{tier.toUpperCase()} · PREDITIVO</span></div><div className="quiz-progress"><span>PERGUNTA {progress.answered+1} / {progress.total}</span><span>{Math.round(progress.answered/progress.total*100)}%</span></div>{ticTacTime>0&&!revealedAnswers[question.id]&&<div className="tic-tac-container"><div className="tic-tac-circle">{ticTacTime}</div><div className="tic-tac-ring"/><div className="tic-tac-ring"/><div className="tic-tac-ring"/></div>}<div className="predictive-progress-bar"><div className="predictive-progress-fill" style={{width:`${predictiveProgress?predictiveProgress.percentage:0}%`}}/></div>{revealedAnswers[question.id]?<div className="question-reveal"><h2>{question.prompt}</h2><p className="stat-basis">Base: {question.stat_basis}</p><div className={`glow-option ${revealedAnswers[question.id].correct?'correct':'incorrect'}`}><div style={{padding:'1rem'}}><strong>{String(answer)}</strong><div className={`reveal-badge ${revealedAnswers[question.id].correct?'correct':'incorrect'}`}>{revealedAnswers[question.id].correct?'✓ ACERTOU':'✗ ERROU'}</div><small style={{display:'block',marginTop:'0.5rem'}}>Resposta: {String(revealedAnswers[question.id].actual)}</small></div></div><div className="payoff-indicator" style={{marginTop:'1rem'}}><span className={revealedAnswers[question.id].payoff>0?'easy':''}>{revealedAnswers[question.id].payoff>0?'+':''}{Math.round(revealedAnswers[question.id].payoff*100)}</span> pts</div></div>:<><h2>{question.prompt}</h2><p className="stat-basis">Base: {question.stat_basis}</p><div className="quiz-options">{question.options.map(o=><button key={String(o.value)} className={answer===o.value?'selected':''} onClick={()=>{setAnswer(o.value);haptic('selection');setTicTacTime(5)}} disabled={ticTacTime<=0||revealedAnswers[question.id]?true:false}><span>{o.label}</span><small style={{display:'block',opacity:.75}}>{Math.round(o.probability*100)}% · odd {o.odd}</small><span className="tier-badge-predictive" style={{marginTop:'0.25rem'}}>{o.risk}</span></button>)}</div></>}{revealedAnswers[question.id]?<button onClick={()=>{haptic('impact');if(progress.answered>=progress.total)setScreen('result');else{setQuestion(predictiveQuestions[progress.answered]||null);setAnswer(null)}}} disabled={loading}>{progress.answered>=progress.total?'Ver resultado':'Próxima pergunta'} <span>→</span></button>:<button disabled={answer===null||loading} onClick={()=>{haptic('impact');void submitPredictiveAnswer()}}>{loading?'Enviando…':'Confirmar'} <span>→</span></button>}{pollingActive&&<span className="polling-dot"/> }{error&&<p className="error">{error}</p>}</section>}

  {screen==='result'&&quizMode==='replay'&&result&&<section><p className="eyebrow">RODADA FECHADA · RESULTADO VERIFICÁVEL</p><h2>{result.score} pontos</h2><p className="muted">{result.exact_hits} acertos exatos · erro agregado {result.total_error}</p><div className="proof"><p><small>PARTIDA</small><strong>{result.teams.join(' × ')}</strong></p><p><small>SNAPSHOT ID</small><strong>{result.snapshot_id}</strong></p><p><small>CONTENT HASH</small><strong className="wrap">{result.content_hash}</strong></p><p><small>FIXTURE</small><strong>{result.fixture_id}</strong></p><p><small>SOURCE TIMESTAMP</small><strong>{new Date(result.source_timestamp).toLocaleString('pt-BR')}</strong></p><p><small>PROOF REF</small><strong className="wrap">{result.proof_refs?.[0]}</strong></p><p><small>REDE</small><strong>devnet · paper (sem premiação)</strong></p><p><small>STATUS</small><strong>{result.proof_status}</strong></p></div><h3>RANKING DA RODADA</h3><div className="proof">{result.ranking?.map((row:any,i:number)=><p key={row.participant_id}><small>#{i+1} · {row.participant_id}</small><strong>{row.score??'—'} pts</strong></p>)}</div><div className="anchor-block">{anchorSig?<a className="anchor-link" target="_blank" rel="noreferrer" href={explorerUrl(anchorSig)}>✓ Prova ancorada on-chain · ver no Explorer ↗</a>:<button className="secondary" disabled={anchorBusy} onClick={()=>void anchorProof(buildReplayMemo(result))}>{anchorBusy?'Enviando transação…':`Ancorar prova on-chain (${network})`} <span>⛓</span></button>}{anchorError&&<p className="error">{anchorError}</p>}</div><button onClick={copyResult}>Compartilhar resultado <span>↗</span></button><button className="secondary" onClick={()=>{setAnchorSig('');setAnchorError('');setScreen('home')}}>Voltar ao início</button></section>}

  {screen==='result'&&quizMode==='predictive'&&(!predictiveProgress||predictiveProgress.status!=='scoring'||!Array.isArray(predictiveProgress.breakdown))&&<section className="predictive-mode"><p className="eyebrow">ANÁLISE PREDITIVA · AGUARDANDO RESOLUÇÃO</p><h2>Chutes registrados.</h2><p className="muted">{predictiveProgress?.message||'Seus palpites estão congelados. O resultado abre quando o TxLINE publicar o snapshot da partida.'}</p><span className="polling-dot"/><button onClick={()=>void pollPredictiveProgress()} disabled={loading}>Atualizar agora <span>↻</span></button><button className="secondary" onClick={()=>{setScreen('home');setQuizMode('replay');setRevealedAnswers({});}}>Voltar ao início</button></section>}

  {screen==='result'&&quizMode==='predictive'&&predictiveProgress&&predictiveProgress.status==='scoring'&&Array.isArray(predictiveProgress.breakdown)&&<section className="predictive-mode"><p className="eyebrow">ANÁLISE PREDITIVA · RESULTADO FINAL</p><h2>{Math.round(predictiveProgress.score||0)} pontos</h2><p className="muted">{predictiveProgress.progress} acertos · {predictiveProgress.percentage||0}%</p><div className="predictive-progress-bar"><div className="predictive-progress-fill" style={{width:`${predictiveProgress.percentage}%`}}/></div><h3 style={{marginTop:'1.5rem'}}>BREAKDOWN POR PERGUNTA</h3><div className="predictive-breakdown">{predictiveProgress.breakdown.map((item:any)=><div key={item.question_id} className={`breakdown-item ${item.correct?'correct':'incorrect'}`}><div className="breakdown-question"><strong>Pergunta {item.question_id.slice(1)}</strong><small>Sua resposta: {String(item.expected)} · Real: {String(item.actual)}</small></div><div className="breakdown-payoff"><span className="breakdown-payoff-value">{item.payoff>0?'+':''}{Math.round(item.payoff*100)}</span><span className="breakdown-payoff-mult">{item.payoff>1?'3.5x':'1x'}</span></div></div>)}</div><p className="eyebrow" style={{marginTop:'1.5rem'}}>DETALHES DA SESSÃO</p><div className="proof"><p><small>QUIZ ID</small><strong className="wrap">{quizId}</strong></p><p><small>EQUIPE</small><strong>{selectedTeam}</strong></p><p><small>TIER</small><strong>{tier.toUpperCase()}</strong></p><p><small>REDE</small><strong>devnet · paper (sem premiação)</strong></p><p><small>TIMESTAMP</small><strong>{predictiveProgress.timestamp?new Date(predictiveProgress.timestamp).toLocaleString('pt-BR'):'—'}</strong></p></div><div className="anchor-block">{anchorSig?<a className="anchor-link" target="_blank" rel="noreferrer" href={explorerUrl(anchorSig)}>✓ Prova ancorada on-chain · ver no Explorer ↗</a>:<button className="secondary" disabled={anchorBusy} onClick={()=>void anchorProof(buildPredictiveMemo({fixture_id:predictiveProgress.fixture_id||fixtureId,snapshot_id:predictiveProgress.snapshot_id,content_hash:predictiveProgress.content_hash,score:predictiveProgress.score||0,percentage:predictiveProgress.percentage||0}))}>{anchorBusy?'Enviando transação…':`Ancorar prova on-chain (${network})`} <span>⛓</span></button>}{anchorError&&<p className="error">{anchorError}</p>}</div><button onClick={()=>{navigator.clipboard?.writeText(`CHUTE PREDITIVO · ${Math.round(predictiveProgress.score||0)} pontos · ${predictiveProgress.percentage||0}% acertos · ${selectedTeam} ${tier}`);haptic('success')}}>Compartilhar resultado <span>↗</span></button><button className="secondary" onClick={()=>{setAnchorSig('');setAnchorError('');setScreen('home');setQuizMode('replay');setRevealedAnswers({});}}>Voltar ao início</button></section>}
 </>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

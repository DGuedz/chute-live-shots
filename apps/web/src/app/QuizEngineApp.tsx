import React, {useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {Header} from '../components/Header';
import {QuizImmersiveStage} from '../components/QuizImmersiveStage';
import {MobileWalletModal} from '../components/MobileWalletModal';
import {InfoAlert} from '../components/CleanComponents';
import {PhantomIcon, SolanaLogoBrand} from '../components/LogoPlaceholders';
import {Icon, IconShowcase} from '../icons';
import {APP_ENV} from '../env';
import {
  buildPredictiveMemo,
  clearWalletSession,
  explorerUrl as anchorExplorerUrl,
  hasPrivateDevnetRpc,
  loadWalletSession,
  mapAnchorError,
  NETWORK_STORAGE_KEY,
  rpcUrl,
  saveWalletSession,
  sendMemoTransaction,
  type Network,
} from '../solana-anchor';
import {bootTelegramMiniApp} from '../telegram-mini-app';
import {
  homeRoute,
  matchRoute,
  resultRoute,
  routeToHref,
  setupRoute,
  type AppRoute,
} from '../router';
import {subscribeTxlineFreeTier} from '../txline/subscribe';

type Option = {
  value: string | number;
  label: string;
  probability: number;
  odd: number;
  risk: string;
  reward_multiplier: number;
};

type PredictiveProgress = {
  status: string;
  quiz_id: string;
  participant_id?: string;
  progress: number;
  total?: number;
  score?: number;
  percentage?: number;
  breakdown?: Array<{
    question_id: string;
    correct: boolean;
    payoff: number;
    expected: unknown;
    actual: unknown;
  }>;
  fixture_id?: string;
  resolved_fixture_id?: string;
  snapshot_id?: string | null;
  content_hash?: string | null;
  message?: string;
  timestamp?: string;
  proof_refs?: string[];
  on_chain_validation?: {method?: string; [key: string]: unknown} | null;
  network?: 'devnet' | 'mainnet' | null;
  sl_level?: 'SL1' | 'SL12' | null;
};

type PredictiveResume = {
  status: 'open' | 'complete';
  quiz_id: string;
  participant_id: string;
  fixture_id: string;
  team: 'Argentina' | 'Spain';
  tier: string;
  title: string;
  answered: number;
  total: number;
  locked_at: string;
  answer_refs: string[];
  current_question: Question | null;
};

type RevealedAnswer = {
  question_id: string;
  correct: boolean;
  payoff: number;
  actual: unknown;
};

type Question = {
  id: string;
  kind: string;
  answer_type: string;
  prompt: string;
  options: Option[];
  stat_basis: string;
};

type TierInfo = {
  id: string;
  label: string;
  description: string;
  available: boolean;
  hint?: string | null;
};

type Insights = {
  fixture_id: string;
  data_status: string;
  disclaimer?: string;
  sources: string[];
  tournament?: {
    name: string;
    format: string;
    highlights: string[];
    team_stats: {
      team: string;
      goals: number;
      xg: number | null;
      shots: number | null;
      clean_sheets: number | null;
    }[];
    player_stats: {
      player: string;
      team: string;
      goals: number;
      assists: number;
      shots: number | null;
    }[];
  };
  editorial?: {
    match: string;
    venue: string;
    path: Record<string, string>;
    reading: {signal: string; edge: string; detail: string}[];
    tier_hints: Record<string, string>;
  } | null;
  tiers: TierInfo[];
  has_snapshot: boolean;
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: {toBase58: () => string} | null;
  connect?: (opts?: {onlyIfTrusted?: boolean}) => Promise<{publicKey: {toBase58: () => string}} | void>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array, display?: string) => Promise<{signature: Uint8Array}>;
  signAndSendTransaction?: (tx: unknown) => Promise<{signature: string}>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
};

type WalletId = 'phantom' | 'solflare' | 'backpack';

type StoredQuizSession = {
  fixtureId: string;
  selectedTeam: 'Argentina' | 'Spain';
  tier: string;
  quizId: string;
  currentQuestion: Question | null;
  progress: {answered: number; total: number};
  predictiveProgress: PredictiveProgress | null;
  revealedAnswers: Record<string, RevealedAnswer>;
  anchorSig: string;
  anchorError: string;
};

type QuizEngineAppProps = {
  route: Exclude<AppRoute, {kind: 'home'; showIntro: boolean}>;
  navigate: (route: AppRoute, options?: {replace?: boolean}) => void;
};

const API_URL = APP_ENV.apiUrl;
const QUIZ_SESSION_STORAGE_KEY = 'chute-quiz-session';
const PARTICIPANT_STORAGE_KEY = 'chute-participant-id';
const DEFAULT_FIXTURE_ID = 'argentina-spain';

function resolveParticipantId(): string {
  const telegramParticipant = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
  if (telegramParticipant) return telegramParticipant;
  try {
    const stored = localStorage.getItem(PARTICIPANT_STORAGE_KEY)?.trim();
    if (stored) return stored;
    const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `web-${crypto.randomUUID()}`
      : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PARTICIPANT_STORAGE_KEY, generated);
    return generated;
  } catch {
    return 'demo-telegram-user';
  }
}

const participant = resolveParticipantId();
const WALLETS: {id: WalletId; label: string; get: () => SolanaProvider | undefined}[] = [
  {
    id: 'phantom',
    label: 'Phantom',
    get: () => (window.phantom?.solana || (window.solana?.isPhantom ? window.solana : undefined)) as SolanaProvider | undefined,
  },
  {id: 'solflare', label: 'Solflare', get: () => window.solflare as SolanaProvider | undefined},
  {id: 'backpack', label: 'Backpack', get: () => window.backpack as SolanaProvider | undefined},
];

function teamFlag(team: string): string {
  const flags: Record<string, string> = {
    Spain: '🇪🇸', Argentina: '🇦🇷', Austria: '🇦🇹', France: '🇫🇷',
    England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Belgium: '🇧🇪', Norway: '🇳🇴', Brazil: '🇧🇷', Portugal: '🇵🇹', Germany: '🇩🇪',
    Espanha: '🇪🇸', França: '🇫🇷', Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Bélgica: '🇧🇪', Noruega: '🇳🇴',
  };
  return flags[team] || '⚽';
}

/** Escudos oficiais disponíveis; times sem escudo caem na bandeira. */
const TEAM_CRESTS: Record<string, string> = {
  Spain: '/teams/spain-national-team.png',
  Espanha: '/teams/spain-national-team.png',
  Argentina: '/teams/argentina-afa.svg',
};

/** Classe de branding por seleção: celeste/ouro (ARG) e vermelho/ouro (ESP). */
function teamBrandClass(team: string): string {
  if (team === 'Argentina') return 'brand-arg';
  if (team === 'Spain' || team === 'Espanha') return 'brand-esp';
  return '';
}

function TeamMark({team, size = 18}: {team: string; size?: number}) {
  const crest = TEAM_CRESTS[team];
  if (!crest) return <span aria-hidden="true">{teamFlag(team)}</span>;
  return (
    <span className={`crest-mark ${teamBrandClass(team)}`} style={{width: size, height: size}}>
      <img src={crest} alt={`Escudo ${teamLabel(team)}`} />
    </span>
  );
}

/** Figura estilizada da pergunta: ícone Neo Arcade pelo tipo (chute, escanteio, cartão…). */
function questionIconName(kind: string): string {
  if (kind.includes('shot')) return 'attack';
  if (kind.includes('corner')) return 'corner';
  if (kind.includes('card') || kind.includes('foul')) return 'card';
  if (kind.includes('goal') || kind === 'winner') return 'goal';
  if (kind === 'proof_sequence') return 'checkmark';
  if (kind.includes('player')) return 'star';
  return 'soccer';
}

/** Nome de equipe sempre em PT-BR na interface; valores TxLINE (ex.: "Spain") ficam nos metadados. */
function teamLabel(team: string): string {
  const labels: Record<string, string> = {
    Spain: 'Espanha', Argentina: 'Argentina', Austria: 'Áustria', France: 'França',
    England: 'Inglaterra', Belgium: 'Bélgica', Norway: 'Noruega',
  };
  return labels[team] || team;
}

/** Ícone Neo Arcade por sinal editorial (ataque, defesa, craque, meio-campo…). */
function signalIconName(signal: string): string {
  const s = signal.toLowerCase();
  if (s.includes('ataque')) return 'attack';
  if (s.includes('defesa')) return 'defense';
  if (s.includes('craque')) return 'star';
  if (s.includes('meio')) return 'midfield';
  if (s.includes('escanteio') || s.includes('bola parada')) return 'corner';
  if (s.includes('falta') || s.includes('cart')) return 'card';
  return 'stats';
}

/** Selo de risco legível: valor da API vira rótulo + ícone. */
const RISK_PRESENTATION: Record<string, {label: string; icon: string}> = {
  ACESSIVEL: {label: 'ACESSÍVEL', icon: 'checkmark'},
  DISPUTADA: {label: 'DISPUTADA', icon: 'bolt'},
  ZEBRA: {label: 'ZEBRA', icon: 'flame'},
  ZEBRA_TECNICA: {label: 'ZEBRA TÉCNICA', icon: 'flame'},
};

function readStoredQuizSession(): StoredQuizSession | null {
  const raw = sessionStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredQuizSession;
  } catch {
    sessionStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
    return null;
  }
}

function persistQuizSession(state: StoredQuizSession | null): void {
  if (!state?.quizId) {
    sessionStorage.removeItem(QUIZ_SESSION_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(QUIZ_SESSION_STORAGE_KEY, JSON.stringify(state));
}

function shortWalletLabel(wallet: string): string {
  return wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : '';
}

export default function QuizEngineApp({route, navigate}: QuizEngineAppProps) {
  const [mobileWalletOpen, setMobileWalletOpen] = useState(route.kind === 'setup' && route.walletQr);
  const [txlineSubscribeSig, setTxlineSubscribeSig] = useState('');
  const [txlineTokenStep, setTxlineTokenStep] = useState<'idle' | 'signing' | 'active' | 'error'>('idle');
  const [txlineTokenError, setTxlineTokenError] = useState('');
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<string | number | null>(null);
  const [progress, setProgress] = useState({answered: 0, total: 5});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState('');
  const [walletError, setWalletError] = useState('');
  const [walletId, setWalletId] = useState<WalletId>('phantom');
  const [walletPicker, setWalletPicker] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [network, setNetwork] = useState<Network>(() => localStorage.getItem(NETWORK_STORAGE_KEY) === 'devnet' ? 'devnet' : 'mainnet');
  const [balance, setBalance] = useState<number | null>(null);
  const [anchorSig, setAnchorSig] = useState('');
  const [anchorBusy, setAnchorBusy] = useState(false);
  const [anchorError, setAnchorError] = useState('');
  const [txlineStep, setTxlineStep] = useState('idle');
  const [fixtureId, setFixtureId] = useState(route.kind === 'match' ? route.fixtureId : DEFAULT_FIXTURE_ID);
  const [tier, setTier] = useState('gols');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'Argentina' | 'Spain'>('Argentina');
  const [quizId, setQuizId] = useState(route.kind === 'quiz' || route.kind === 'result' ? route.quizId : '');
  const [ticTacTime, setTicTacTime] = useState(5);
  const [predictiveProgress, setPredictiveProgress] = useState<PredictiveProgress | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, RevealedAnswer>>({});
  const [pollingActive, setPollingActive] = useState(false);

  const availableWallets = WALLETS.filter((item) => item.get());

  const storedSession = useMemo<StoredQuizSession | null>(() => {
    if (!quizId) return null;
    return {
      fixtureId,
      selectedTeam,
      tier,
      quizId,
      currentQuestion: question,
      progress,
      predictiveProgress,
      revealedAnswers,
      anchorSig,
      anchorError,
    };
  }, [anchorError, anchorSig, fixtureId, predictiveProgress, progress, question, quizId, revealedAnswers, selectedTeam, tier]);

  const walletProvider = (id: WalletId = walletId) => WALLETS.find((item) => item.id === id)?.get();
  const explorerUrl = (signature: string) => anchorExplorerUrl(signature, network);

  const haptic = (kind: 'selection' | 'impact' | 'success') => {
    const feedback = window.Telegram?.WebApp?.HapticFeedback;
    if (kind === 'selection') feedback?.selectionChanged?.();
    else if (kind === 'success') feedback?.notificationOccurred?.('success');
    else feedback?.impactOccurred?.('medium');
  };

  const navigateToHome = (event?: React.MouseEvent) => {
    event?.preventDefault();
    setAnswer(null);
    setError('');
    setRevealedAnswers({});
    setAnchorSig('');
    setAnchorError('');
    navigate(homeRoute());
  };

  const navigateToSetup = (event?: React.MouseEvent, options?: {walletQr?: boolean; replace?: boolean}) => {
    event?.preventDefault();
    navigate(setupRoute({walletQr: options?.walletQr}), {replace: options?.replace});
  };

  const navigateToMatch = (event?: React.MouseEvent) => {
    event?.preventDefault();
    navigate(matchRoute(fixtureId));
  };

  const refreshBalance = async (publicKey: string, nextNetwork: Network = network) => {
    try {
      const response = await fetch(rpcUrl(nextNetwork), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'getBalance', params: [publicKey]}),
      });
      const payload = await response.json();
      if (typeof payload.result?.value === 'number') setBalance(payload.result.value / 1e9);
      else setBalance(null);
    } catch {
      setBalance(null);
    }
  };

  const hydrateStoredQuiz = (targetQuizId: string): boolean => {
    const stored = readStoredQuizSession();
    if (!stored || stored.quizId !== targetQuizId) return false;
    setFixtureId(stored.fixtureId || DEFAULT_FIXTURE_ID);
    setSelectedTeam(stored.selectedTeam);
    setTier(stored.tier);
    setQuizId(stored.quizId);
    setQuestion(stored.currentQuestion || null);
    setProgress(stored.progress || {answered: 0, total: 5});
    setPredictiveProgress(stored.predictiveProgress || null);
    setRevealedAnswers(stored.revealedAnswers || {});
    setAnchorSig(stored.anchorSig || '');
    setAnchorError(stored.anchorError || '');
    return true;
  };

  const hydratePredictiveResume = async (targetQuizId: string): Promise<PredictiveResume | null> => {
    try {
      const response = await fetch(`${API_URL}/api/predictions/${targetQuizId}/resume?participant_id=${participant}`);
      if (!response.ok) return null;
      const payload = (await response.json()) as PredictiveResume;
      setFixtureId(payload.fixture_id || DEFAULT_FIXTURE_ID);
      setSelectedTeam(payload.team);
      setTier(payload.tier);
      setQuizId(payload.quiz_id);
      setQuestion(payload.current_question);
      setProgress({answered: payload.answered, total: payload.total});
      setAnswer(null);
      setError('');
      return payload;
    } catch (resumeError) {
      console.error('Resume error:', resumeError);
      return null;
    }
  };

  const pollPredictiveProgress = async (targetQuizId = quizId): Promise<PredictiveProgress | null> => {
    if (!targetQuizId) return null;
    try {
      const response = await fetch(`${API_URL}/api/predictions/${targetQuizId}/progress?participant_id=${participant}`);
      if (!response.ok) return null;
      const payload: PredictiveProgress = await response.json();
      setPredictiveProgress(payload);
      setLastSyncAt(new Date().toLocaleTimeString('pt-BR'));
      if (Array.isArray(payload.breakdown)) {
        setRevealedAnswers(
          Object.fromEntries(
            payload.breakdown.map((item) => [
              item.question_id,
              {
                question_id: item.question_id,
                correct: item.correct,
                payoff: item.payoff,
                actual: item.actual,
              },
            ]),
          ),
        );
      }
      return payload;
    } catch (pollError) {
      console.error('Poll error:', pollError);
      return null;
    }
  };

  const loadMeta = async (targetFixtureId = fixtureId, options?: {replace?: boolean; syncRoute?: boolean}) => {
    setLoading(true);
    setError('');
    try {
      setFixtureId(targetFixtureId);
      const response = await fetch(`${API_URL}/api/fixtures/${targetFixtureId}/insights`);
      const payload = response.ok ? ((await response.json()) as Insights) : null;
      setInsights(payload);
      if (!payload) {
        throw new Error('Fixture sem leitura editorial disponível (MISSING_DATA).');
      }
      if (options?.syncRoute !== false) {
        navigate(matchRoute(targetFixtureId), {replace: options?.replace});
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados do fixture.');
    } finally {
      setLoading(false);
    }
  };

  const startPredictiveQuiz = async (tierId: string = tier) => {
    setTier(tierId);
    setLoading(true);
    setError('');
    setAnswer(null);
    setRevealedAnswers({});
    try {
      const startResponse = await fetch(`${API_URL}/api/predictions/${fixtureId}/${selectedTeam}/${tierId}/start`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({participant_id: participant}),
      });
      const payload = await startResponse.json();
      if (!startResponse.ok) throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Não foi possível iniciar o quiz preditivo.');
      setPredictiveProgress(null);
      setQuestion((payload.current_question as Question | null | undefined) || null);
      setProgress({answered: payload.answered ?? 0, total: payload.total ?? 5});
      setQuizId(payload.quiz_id);
      setTicTacTime(5);
      setPollingActive(false);
      navigate({kind: 'quiz', quizId: payload.quiz_id});
      void hydratePredictiveResume(payload.quiz_id);
    } catch (quizError) {
      setError(quizError instanceof Error ? quizError.message : 'Não foi possível abrir o quiz preditivo.');
    } finally {
      setLoading(false);
    }
  };

  const submitPredictiveAnswer = async () => {
    if (!question || answer === null || !quizId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/predictions/${quizId}/answer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          participant_id: participant,
          question_id: question.id,
          answer,
          request_id: crypto.randomUUID(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Resposta inválida');
      }
      setTicTacTime(5);
      setPollingActive(true);
      setProgress({answered: payload.answered ?? progress.answered + 1, total: payload.total ?? progress.total});
      if (payload.status === 'complete' || (payload.answered ?? progress.answered + 1) >= (payload.total ?? progress.total)) {
        await pollPredictiveProgress(quizId);
        navigate(resultRoute(quizId));
      } else {
        setQuestion((payload.next_question as Question | null | undefined) || null);
        window.setTimeout(() => void pollPredictiveProgress(quizId), 500);
      }
      setAnswer(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro ao enviar resposta');
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async (id: WalletId = walletId) => {
    setWalletError('');
    setWalletPicker(false);
    setWalletConnecting(true);
    setWalletId(id);
    const label = WALLETS.find((item) => item.id === id)?.label || 'Wallet';
    const provider = walletProvider(id);
    try {
      if (!provider) {
        if (id === 'phantom') {
          setMobileWalletOpen(true);
          navigate(setupRoute({walletQr: true}));
          return;
        }
        setWalletError(`${label} não está disponível neste navegador.`);
        return;
      }
      if (!provider.connect) {
        throw new Error('wallet sem método connect');
      }
      const response = await provider.connect();
      const publicKey = (response && 'publicKey' in response ? response.publicKey : provider.publicKey)?.toBase58();
      if (!publicKey) throw new Error('wallet indisponível');
      if (!provider.signMessage) {
        setWalletError(`Esta versão da ${label} não suporta signMessage; sessão não verificada.`);
        return;
      }
      const challengeResponse = await fetch(`${API_URL}/api/wallet/challenge`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({public_key: publicKey}),
      });
      const challenge = await challengeResponse.json();
      const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
      const signature = btoa(String.fromCharCode(...signed.signature));
      const sessionResponse = await fetch(`${API_URL}/api/wallet/session`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({public_key: publicKey, network, signature}),
      });
      if (!sessionResponse.ok) throw new Error('assinatura rejeitada');
      setWallet(publicKey);
      saveWalletSession({provider: id, publicKey, network});
      void refreshBalance(publicKey);
      haptic('success');
    } catch (connectError) {
      setWalletError(`Assinatura ${label} falhou: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
    } finally {
      setWalletConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    await walletProvider()?.disconnect?.();
    setWallet('');
    setBalance(null);
    clearWalletSession();
  };

  const anchorProof = async (memoText: string) => {
    setAnchorError('');
    const provider = walletProvider();
    if (!wallet || !provider) {
      setAnchorError('Conecte a wallet para ancorar a prova on-chain.');
      return;
    }
    setAnchorBusy(true);
    try {
      const signature = await sendMemoTransaction({provider, wallet, network, memoText});
      setAnchorSig(signature);
      haptic('success');
    } catch (anchorFailure) {
      setAnchorError(mapAnchorError(anchorFailure));
    } finally {
      setAnchorBusy(false);
    }
  };

  const activateTxlineToken = async () => {
    setTxlineTokenError('');
    const provider = walletProvider('phantom');
    if (!provider?.signMessage) {
      setTxlineTokenError('Abra o CHUTE no navegador da Phantom para assinar a ativação.');
      return;
    }
    setTxlineTokenStep('signing');
    try {
      const start = await fetch(`${API_URL}/api/txline/activate/start`, {method: 'POST'});
      if (!start.ok) throw new Error(`activate/start ${start.status}`);
      const {message} = await start.json();
      const signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8');
      const walletSignature = btoa(String.fromCharCode(...signed.signature));
      const done = await fetch(`${API_URL}/api/txline/activate/complete`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({wallet_signature: walletSignature}),
      });
      if (!done.ok) {
        const failureText = await done.text();
        throw new Error(`activate/complete ${done.status}: ${failureText.slice(0, 300)}`);
      }
      setTxlineTokenStep('active');
      haptic('success');
    } catch (activationError) {
      setTxlineTokenStep('error');
      setTxlineTokenError(activationError instanceof Error ? activationError.message : String(activationError));
    }
  };

  const startTxlineSetup = async () => {
    setWalletError('');
    if (network !== 'devnet') {
      setWalletError('Mude para Devnet antes de assinar o plano gratuito TxLINE.');
      return;
    }
    if (!hasPrivateDevnetRpc()) {
      setWalletError('RPC privado Devnet ainda não configurado. Adicione a URL Helius antes de assinar.');
      return;
    }
    if (!wallet) {
      await connectWallet('phantom');
      return;
    }
    const provider = walletProvider('phantom');
    if (!provider) {
      setMobileWalletOpen(true);
      navigate(setupRoute({walletQr: true}));
      return;
    }
    if (balance !== null && balance <= 0) {
      setWalletError('Sua carteira não possui SOL Devnet para a taxa da assinatura.');
      return;
    }
    setTxlineStep('subscribing');
    try {
      const signature = await Promise.race([
        subscribeTxlineFreeTier(provider as Parameters<typeof subscribeTxlineFreeTier>[0], rpcUrl('devnet')),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'PHANTOM_TIMEOUT: o popup de assinatura não respondeu em 60s. Feche e reabra a aba do CHUTE na Phantom e tente de novo.',
                ),
              ),
            60000,
          ),
        ),
      ]);
      setTxlineSubscribeSig(signature);
      setTxlineStep('subscribed');
      haptic('success');
      void fetch(`${API_URL}/api/txline/subscription`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({tx_sig: signature, public_key: wallet}),
      }).catch(() => undefined);
    } catch (subscribeError) {
      setTxlineStep('error');
      const raw = subscribeError instanceof Error ? subscribeError.message : String(subscribeError);
      setWalletError(`${mapAnchorError(subscribeError)} Detalhe: ${raw}`);
    }
  };

  useEffect(() => {
    persistQuizSession(storedSession);
  }, [storedSession]);

  useEffect(() => {
    setMobileWalletOpen(route.kind === 'setup' && route.walletQr);
  }, [route]);

  useEffect(() => {
    bootTelegramMiniApp();
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      void fetch(`${API_URL}/api/session/telegram`, {
        method: 'POST',
        headers: {'X-Telegram-Init-Data': initData},
      }).catch(() => undefined);
    }
    const saved = loadWalletSession();
    if (!saved) return;
    if (saved.network === 'mainnet') setNetwork('mainnet');
    setWalletId(saved.provider as WalletId);
    setWallet(saved.publicKey);
    void refreshBalance(saved.publicKey, saved.network);
    const provider = WALLETS.find((item) => item.id === saved.provider)?.get();
    if (provider?.connect) {
      void provider.connect({onlyIfTrusted: true}).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncSubscriptionState = async () => {
      try {
        const response = await fetch(`${API_URL}/api/txline/subscription`);
        const payload = await response.json();
        if (cancelled) return;
        if (payload.tx_sig) {
          setTxlineSubscribeSig(payload.tx_sig);
          setTxlineStep('subscribed');
        }
        if (payload.api_token_active) {
          setTxlineTokenStep('active');
        }
      } catch {
        // Setup mantém o fluxo padrão se o backend ainda não tiver estado persistido.
      }
    };
    void syncSubscriptionState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (route.kind === 'match') {
      if (route.fixtureId !== fixtureId || !insights || insights.fixture_id !== route.fixtureId) {
        void loadMeta(route.fixtureId, {syncRoute: false});
      }
      return;
    }
    if (route.kind === 'quiz' || route.kind === 'result') {
      setQuizId(route.quizId);
      void (async () => {
        const resumed = await hydratePredictiveResume(route.quizId);
        if (!resumed) {
          const restored = hydrateStoredQuiz(route.quizId);
          if (!restored && route.kind === 'quiz') {
            setError('Não foi possível resumir este quiz agora. Tente novamente em alguns segundos.');
          }
          if (!restored && route.kind === 'result') {
            void pollPredictiveProgress(route.quizId);
          }
          return;
        }
        if (route.kind === 'quiz' && resumed.status === 'complete') {
          navigate(resultRoute(route.quizId), {replace: true});
          void pollPredictiveProgress(route.quizId);
          return;
        }
        if (route.kind === 'result') {
          void pollPredictiveProgress(route.quizId);
        }
      })();
      return;
    }
    if (route.kind === 'setup') {
      setError('');
    }
  }, [fixtureId, insights, route]);

  useEffect(() => {
    if (route.kind !== 'quiz' || ticTacTime <= 0) return;
    const timer = window.setTimeout(() => setTicTacTime((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [route.kind, ticTacTime]);

  useEffect(() => {
    if (!pollingActive || !quizId) return;
    const interval = window.setInterval(() => void pollPredictiveProgress(), 2000);
    return () => window.clearInterval(interval);
  }, [pollingActive, quizId]);

  // Recibo vivo: na tela de resultado, o app acompanha o SL12 sozinho —
  // o worker sincroniza score a cada 60s; aqui puxamos a cada 45s sem o user tocar em nada.
  useEffect(() => {
    if (route.kind !== 'result') return;
    const interval = window.setInterval(() => void pollPredictiveProgress(route.quizId), 45000);
    return () => window.clearInterval(interval);
  }, [route]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const shortWallet = shortWalletLabel(wallet);

  if (route.kind === 'icons') {
    return (
      <main className="screen-in">
        <IconShowcase />
      </main>
    );
  }

  return (
    <main className="screen-in web-app">
      {mobileWalletOpen && (
        <MobileWalletModal
          targetPath={routeToHref(setupRoute())}
          network={network}
          onClose={() => {
            setMobileWalletOpen(false);
            if (route.kind === 'setup' && route.walletQr) {
              navigate(setupRoute(), {replace: true});
            }
          }}
        />
      )}

      <Header
        wallet={wallet}
        network={network}
        loading={walletConnecting}
        homeHref={routeToHref(homeRoute())}
        setupHref={routeToHref(setupRoute())}
        onHomeClick={navigateToHome}
        onSettingsClick={navigateToSetup}
        onWalletClick={() => {
          if (wallet) void disconnectWallet();
          else if (availableWallets.length > 1) setWalletPicker((value) => !value);
          else void connectWallet(availableWallets[0]?.id || 'phantom');
        }}
      />

      {walletPicker && !wallet && (
        <div className="wallet-picker">
          {availableWallets.map((item) => (
            <button key={item.id} onClick={() => void connectWallet(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {walletError && <InfoAlert type="error" message={walletError} dismissible onDismiss={() => setWalletError('')} />}

      {route.kind === 'setup' && (
        <section className="setup-panel" id="app-content">
          <a className="back" href={routeToHref(homeRoute())} onClick={navigateToHome}>
            ← Início
          </a>
          <p className="eyebrow">TXLINE · DEVNET FREE TIER</p>
          <h2>
            Conectar dados
            <br />
            <em>em tempo real.</em>
          </h2>
          <p className="muted">Assinatura oficial TxLINE para Copa do Mundo, usando Service Level 1 por quatro semanas.</p>
          <div className="setup-steps">
            <div className={hasPrivateDevnetRpc() ? 'active' : ''}>
              <b>
                <SolanaLogoBrand size={18} />
              </b>
              <span>RPC Devnet</span>
              <small>{hasPrivateDevnetRpc() ? 'Privado · configurado' : 'Helius necessário'}</small>
            </div>
            <div className={wallet ? 'active' : ''}>
              <b>
                <PhantomIcon size={18} />
              </b>
              <span>Wallet Phantom</span>
              <small>{wallet ? shortWallet : 'Aguardando conexão mobile'}</small>
            </div>
            <div className={txlineStep === 'subscribing' || txlineStep === 'subscribed' ? 'active' : ''}>
              <b>
                <img src="/brands/txline-mark.svg" alt="TxLINE" style={{width: 18, height: 18}} />
              </b>
              <span>Subscribe SL1</span>
              <small>{txlineStep === 'subscribed' ? 'Transação confirmada' : 'Devnet · aprovação na Phantom'}</small>
            </div>
          </div>

          {txlineStep === 'subscribed' ? (
            <div className="setup-ready">
              <span>✓ Assinatura TxLINE confirmada.</span>
              <a className="anchor-link" href={explorerUrl(txlineSubscribeSig)} target="_blank" rel="noreferrer">
                Ver transação no Explorer
              </a>
              {txlineTokenStep === 'active' ? (
                <small>✓ API token ativado. Dados TxLINE liberados para o worker.</small>
              ) : (
                <>
                  {txlineTokenError && <div className="wallet-error">{txlineTokenError}</div>}
                  <button onClick={activateTxlineToken} disabled={txlineTokenStep === 'signing'}>
                    {txlineTokenStep === 'signing' ? 'Aguardando assinatura…' : 'Ativar API token'} <span>→</span>
                  </button>
                  <small>Assinatura de mensagem, sem custo. Ativa o token no backend.</small>
                </>
              )}
            </div>
          ) : !hasPrivateDevnetRpc() ? (
            <div className="wallet-error">RPC Helius Devnet ainda não configurado. O subscribe está bloqueado para evitar o endpoint público instável.</div>
          ) : (
            <>
              {walletError && <div className="wallet-error">{walletError}</div>}
              <button onClick={startTxlineSetup} disabled={txlineStep === 'subscribing'}>
                {txlineStep === 'subscribing' ? 'Aguardando Phantom…' : wallet ? 'Assinar TxLINE grátis' : 'Conectar Phantom Mobile'} <span>→</span>
              </button>
            </>
          )}
          <p className="fine">Somente Devnet. RPC, Program ID, IDL e host da API devem permanecer na mesma rede. · build v7</p>
        </section>
      )}

      {route.kind === 'match' && !insights && (
        <section id="app-content">
          <p className="eyebrow">PRÉ-JOGO</p>
          <h2>{loading ? 'Carregando a leitura da partida…' : 'Não deu para carregar agora.'}</h2>
          {error && <p className="muted">{error}</p>}
          {!loading && (
            <button onClick={() => void loadMeta(fixtureId, {syncRoute: false})}>
              Tentar de novo <span>↻</span>
            </button>
          )}
        </section>
      )}

      {route.kind === 'match' && insights && (
        <section id="app-content" className="team-ambient">
          <a className="back" href={routeToHref(homeRoute())} onClick={navigateToHome}>
            ← Início
          </a>
          <p className="eyebrow">PRÉ-JOGO · LEITURA TXODDS</p>
          <div className="fixture-date">
            {insights.editorial ? insights.editorial.venue : `Partida ${insights.fixture_id}`}
          </div>

          {insights.editorial && (
            <>
              <h2 className="reading-title">{insights.editorial.match}</h2>
              <div className="reading-path">
                {Object.entries(insights.editorial.path).map(([team, path]) => (
                  <span key={team} style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                    <TeamMark team={team} /> {path}
                  </span>
                ))}
              </div>
              <p className="eyebrow" style={{marginTop: 12}}>
                SINAIS DA PARTIDA · TXODDS
              </p>
              <div className="signal-list">
                {insights.editorial.reading.map((reading) => {
                  const homeTeam = Object.keys(insights.editorial?.path || {})[0];
                  const edgeClass =
                    reading.edge === 'equilíbrio' ? '' : reading.edge === homeTeam || reading.edge === 'Spain' ? ' edge-home' : ' edge-away';
                  return (
                    <div className="signal-card" key={reading.signal}>
                      <div className="signal-side">
                        <span className="signal-name" style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                          <Icon name={signalIconName(reading.signal)} size={16} color="lime" />
                          {reading.signal}
                        </span>
                        <span className={`edge-chip${edgeClass} ${teamBrandClass(reading.edge)}`} style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                          {reading.edge === 'equilíbrio' ? (
                            'EQUILÍBRIO'
                          ) : (
                            <>
                              <TeamMark team={reading.edge} size={16} /> {teamLabel(reading.edge).toUpperCase()}
                            </>
                          )}
                        </span>
                      </div>
                      <span className="signal-detail">{reading.detail}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {insights.tournament && (
            <>
              <p className="eyebrow" style={{marginTop: 12}}>
                NÚMEROS DO TORNEIO · TXODDS
              </p>
              <div className="team-strip">
                {insights.tournament.team_stats.slice(0, 5).map((item) => (
                  <div className="stat-card" key={item.team}>
                    <small style={{display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center'}}>
                      <TeamMark team={item.team} size={16} /> {item.team.toUpperCase()}
                    </small>
                    <strong>
                      {item.goals} gols
                      {item.xg ? ` · ${item.xg} xG` : ''}
                    </strong>
                    <span>
                      {item.shots ? `${item.shots} finalizações` : ''}
                      {item.clean_sheets ? ` · ${item.clean_sheets} CS` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="player-list">
                {insights.tournament.player_stats.slice(0, 3).map((item) => (
                  <div className="player-row" key={item.player}>
                    <strong>{item.player}</strong>
                    <span>
                      {item.team} · {item.goals} gols · {item.assists} assist.
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {insights.disclaimer && insights.data_status === 'editorial_curated' && (
            <div className="disclaimer">
              <span>⚠</span>
              <span>{insights.disclaimer}</span>
            </div>
          )}

          <p className="eyebrow" style={{marginTop: 16}}>
            ESCOLHA A EQUIPE
          </p>
          <div className="team-selector">
            <button
              className={`team-button brand-arg${selectedTeam === 'Argentina' ? ' selected' : ''}`}
              onClick={() => {
                setSelectedTeam('Argentina');
                haptic('selection');
              }}
              disabled={loading}
            >
              <TeamMark team="Argentina" size={22} /> Argentina
            </button>
            <button
              className={`team-button brand-esp${selectedTeam === 'Spain' ? ' selected' : ''}`}
              onClick={() => {
                setSelectedTeam('Spain');
                haptic('selection');
              }}
              disabled={loading}
            >
              <TeamMark team="Spain" size={22} /> Espanha
            </button>
          </div>

          <p className="eyebrow" style={{marginTop: 16}}>
            ESCOLHA SEU TIER
          </p>
          <div className="tier-grid">
            {(insights.tiers || []).map((item) => {
              const tierLabel = item.id === 'gols' ? 'GOLS' : item.id === 'escanteios' ? 'ESCANTEIOS' : item.id === 'cartoes' ? 'CARTÕES' : item.label;
              return (
                <button
                  key={item.id}
                  className={`tier-card${item.available ? (tier === item.id ? ' selected' : '') : ' locked'}`}
                  disabled={!item.available || loading}
                  onClick={() => {
                    haptic('impact');
                    void startPredictiveQuiz(item.id);
                  }}
                >
                  <div className="tier-head">
                    <strong>{tierLabel}</strong>
                    <span className="tier-state">{item.available ? '5 PERGUNTAS' : 'SEM DADOS'}</span>
                  </div>
                  <span className="tier-desc">{item.description}{!item.available ? ' · aguardando dados TxOdds (fail-closed)' : ''}</span>
                  {item.hint && <span className="tier-hint">{item.hint}</span>}
                </button>
              );
            })}
          </div>
          <p className="fine">
            Cada tier gera 5 perguntas com probabilidade e odd calculadas a partir do histórico TxOdds; a leitura acima é o seu mapa para escolher.
          </p>
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {route.kind === 'quiz' && (
        <section className="predictive-mode" id="app-content">
          <a className="back" href={routeToHref(matchRoute(fixtureId))} onClick={navigateToMatch}>
            ← Matchday
          </a>
          {!question ? (
            <>
              <p className="eyebrow">QUIZ PREDITIVO</p>
              <h2>Retome pelo matchday.</h2>
              <p className="muted">{error || 'As perguntas deste quiz ficam congeladas no navegador que iniciou a rodada.'}</p>
              <button onClick={() => navigate(matchRoute(fixtureId))}>
                Voltar ao pré-jogo <span>→</span>
              </button>
            </>
          ) : (
            <div className="quiz-immersive-layout">
              <QuizImmersiveStage
                team={selectedTeam}
                tier={tier}
                progress={progress}
                question={question}
                loading={loading}
                hasSelection={answer !== null}
              />
              <div className="quiz-workspace">
                <div className="quiz-context">
                  <span>{selectedTeam}</span>
                  <span>{tier.toUpperCase()} · PREDITIVO</span>
                </div>
                <div className="quiz-progress">
                  <span>
                    PERGUNTA {progress.answered + 1} / {progress.total}
                  </span>
                  <span>{Math.round((progress.answered / progress.total) * 100)}%</span>
                </div>
                {ticTacTime > 0 && !revealedAnswers[question.id] && (
                  <div className="tic-tac-container">
                    <div className="tic-tac-circle">{ticTacTime}</div>
                    <div className="tic-tac-ring" />
                    <div className="tic-tac-ring" />
                    <div className="tic-tac-ring" />
                  </div>
                )}
                <div className="predictive-progress-bar">
                  <div className="predictive-progress-fill" style={{width: `${predictiveProgress ? predictiveProgress.percentage : 0}%`}} />
                </div>

                <AnimatePresence mode="wait">
                  {revealedAnswers[question.id] ? (
                    <motion.div
                      className="question-reveal"
                      key={`${question.id}-reveal`}
                      initial={{opacity: 0, y: 14}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -10}}
                      transition={{duration: 0.28, ease: [0.2, 0.8, 0.2, 1]}}
                    >
                      <div className="question-figure" aria-hidden="true">
                        <Icon name={questionIconName(question.kind)} size={34} color="lime" />
                      </div>
                      <h2>{question.prompt}</h2>
                      <p className="stat-basis">Base: {question.stat_basis}</p>
                      <motion.div
                        className={`glow-option ${revealedAnswers[question.id].correct ? 'correct' : 'incorrect'}`}
                        initial={{scale: 0.94, opacity: 0}}
                        animate={{scale: 1, opacity: 1}}
                        transition={{duration: 0.32, delay: 0.08, ease: [0.2, 0.8, 0.2, 1]}}
                      >
                        <div style={{padding: '1rem'}}>
                          <strong>{String(answer)}</strong>
                          <div className={`reveal-badge ${revealedAnswers[question.id].correct ? 'correct' : 'incorrect'}`}>
                            {revealedAnswers[question.id].correct ? '✓ ACERTOU' : '✗ ERROU'}
                          </div>
                          <small style={{display: 'block', marginTop: '0.5rem'}}>Resposta: {String(revealedAnswers[question.id].actual)}</small>
                        </div>
                      </motion.div>
                      <div className="payoff-indicator" style={{marginTop: '1rem'}}>
                        <span className={revealedAnswers[question.id].payoff > 0 ? 'easy' : ''}>
                          {revealedAnswers[question.id].payoff > 0 ? '+' : ''}
                          {Math.round(revealedAnswers[question.id].payoff * 100)}
                        </span>{' '}
                        pts
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`${question.id}-options`}
                      initial={{opacity: 0, y: 14}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -10}}
                      transition={{duration: 0.28, ease: [0.2, 0.8, 0.2, 1]}}
                    >
                      <div className="question-figure" aria-hidden="true">
                        <Icon name={questionIconName(question.kind)} size={34} color="lime" />
                      </div>
                      <h2>{question.prompt}</h2>
                      <p className="stat-basis">Base: {question.stat_basis}</p>
                      <div className="quiz-options">
                        {question.options.map((item) => (
                          <button
                            key={String(item.value)}
                            className={answer === item.value ? 'selected' : ''}
                            onClick={() => {
                              setAnswer(item.value);
                              haptic('selection');
                            }}
                            disabled={Boolean(revealedAnswers[question.id])}
                          >
                            <span>{item.label}</span>
                            <small style={{display: 'block', opacity: 0.75}}>
                              {Math.round(item.probability * 100)}% · odd {item.odd}
                            </small>
                            <span className="tier-badge-predictive" style={{marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: 4}}>
                              <Icon name={(RISK_PRESENTATION[item.risk] || {icon: 'info'}).icon} size={12} color="inherit" />
                              {(RISK_PRESENTATION[item.risk] || {label: item.risk}).label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {revealedAnswers[question.id] ? (
                  <button
                    onClick={() => {
                      haptic('impact');
                      if (progress.answered >= progress.total) navigate(resultRoute(quizId));
                      else {
                        void hydratePredictiveResume(quizId).then((payload) => {
                          if (payload?.status === 'complete') {
                            navigate(resultRoute(quizId));
                          } else {
                            setAnswer(null);
                          }
                        });
                      }
                    }}
                    disabled={loading}
                  >
                    {progress.answered >= progress.total ? 'Ver resultado' : 'Próxima pergunta'} <span>→</span>
                  </button>
                ) : (
                  <button
                    disabled={answer === null || loading}
                    onClick={() => {
                      haptic('impact');
                      void submitPredictiveAnswer();
                    }}
                  >
                    {loading ? 'Enviando…' : 'Confirmar'} <span>→</span>
                  </button>
                )}
                {pollingActive && <span className="polling-dot" />}
                {error && <p className="error">{error}</p>}
              </div>
            </div>
          )}
        </section>
      )}

      {route.kind === 'result' && (
        <>
          {!predictiveProgress || predictiveProgress.status !== 'scoring' || !Array.isArray(predictiveProgress.breakdown) ? (
            <section className="predictive-mode" id="app-content">
              <p className="eyebrow live-eyebrow"><span className="live-dot" /> CHUTES REGISTRADOS · AGUARDANDO A BOLA ROLAR</p>
              <h2>Seus chutes estão no ar.</h2>
              <p className="muted">
                {predictiveProgress?.message || 'Deixe esta tela aberta do lado da TV: quando o jogo responder, cada chute acende aqui — em tempo real via TxLINE.'}
              </p>
              {lastSyncAt && <p className="fine">Última checagem: {lastSyncAt} · próxima automática em instantes</p>}
              <button onClick={() => void pollPredictiveProgress(route.quizId)} disabled={loading}>
                Atualizar agora <span>↻</span>
              </button>
              <button className="secondary" onClick={() => navigate(homeRoute())}>
                Voltar ao início
              </button>
            </section>
          ) : (
            <section className="predictive-mode" id="app-content">
              <p className="eyebrow live-eyebrow"><span className="live-dot" /> AO VIVO · TXLINE {predictiveProgress.sl_level || 'SL1'} · SEUS CHUTES NA TELA</p>
              <AnimatePresence mode="wait">
                <motion.h2
                  key={Math.round(predictiveProgress.score || 0)}
                  initial={{opacity: 0, scale: 0.92, y: 6}}
                  animate={{opacity: 1, scale: 1, y: 0}}
                  transition={{duration: 0.35, ease: [0.2, 0.8, 0.2, 1]}}
                >
                  {Math.round(predictiveProgress.score || 0)} pontos
                </motion.h2>
              </AnimatePresence>
              <p className="muted">
                {predictiveProgress.progress} de {predictiveProgress.total || 5} chutes bateram · {predictiveProgress.percentage || 0}%
              </p>
              {lastSyncAt && (
                <p className="fine">
                  TxLINE {predictiveProgress.sl_level || 'SL1'} · {predictiveProgress.network === 'mainnet' ? 'mainnet · dados reais' : 'devnet · dados de teste'} · última atualização {lastSyncAt} · atualiza sozinho
                </p>
              )}
              <div className="predictive-progress-bar">
                <div className="predictive-progress-fill" style={{width: `${predictiveProgress.percentage}%`}} />
              </div>

              <h3 style={{marginTop: '1.5rem'}}>CHUTE A CHUTE</h3>
              <div className="predictive-breakdown">
                {predictiveProgress.breakdown.map((item) => (
                  <div key={item.question_id} className={`breakdown-item ${item.correct ? 'correct' : 'incorrect'}`}>
                    <div className="breakdown-question">
                      <strong style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
                        Chute {item.question_id.slice(1)}
                        <span className={`hit-chip${item.correct ? ' hit' : ''}`}>{item.correct ? '● BATEU' : 'AINDA NÃO'}</span>
                      </strong>
                      <small>
                        Seu chute: {String(item.expected)} · Jogo: {String(item.actual)}
                      </small>
                    </div>
                    <div className="breakdown-payoff">
                      <span className="breakdown-payoff-value">
                        {item.payoff > 0 ? '+' : ''}
                        {Math.round(item.payoff * 100)}
                      </span>
                      <span className="breakdown-payoff-mult">{item.payoff > 1 ? '3.5x' : '1x'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="eyebrow" style={{marginTop: '1.5rem'}}>
                DETALHES DA SESSÃO
              </p>
              <div className="proof">
                <p>
                  <small>QUIZ ID</small>
                  <strong className="wrap">{quizId}</strong>
                </p>
                <p>
                  <small>EQUIPE</small>
                  <strong>{selectedTeam}</strong>
                </p>
                <p>
                  <small>TIER</small>
                  <strong>{tier.toUpperCase()}</strong>
                </p>
                <p>
                  <small>FIXTURE TXLINE</small>
                  <strong>{predictiveProgress.resolved_fixture_id || predictiveProgress.fixture_id || fixtureId}</strong>
                </p>
                <p>
                  <small>FONTE AO VIVO</small>
                  <strong>TxLINE {predictiveProgress.sl_level || 'SL1'}{lastSyncAt ? ` · sync ${lastSyncAt}` : ''}</strong>
                </p>
                <p>
                  <small>REDE</small>
                  <strong>{predictiveProgress.network === 'mainnet' ? 'mainnet · dados reais (sem premiação nesta etapa)' : 'devnet · paper (sem premiação)'}</strong>
                </p>
                <p>
                  <small>TIMESTAMP</small>
                  <strong>{predictiveProgress.timestamp ? new Date(predictiveProgress.timestamp).toLocaleString('pt-BR') : '—'}</strong>
                </p>
                <p>
                  <small>PROOF REF</small>
                  <strong className="wrap">{predictiveProgress.proof_refs?.[0] || 'aguardando proof ref'}</strong>
                </p>
                <p>
                  <small>VALIDAÇÃO</small>
                  <strong>{predictiveProgress.on_chain_validation?.method || 'pendente no snapshot atual'}</strong>
                </p>
              </div>

              <div className="anchor-block">
                <p className="fine" style={{marginBottom: 8}}>
                  Esse carimbo on-chain é o seu comprovante: é por ele que você confere, a qualquer hora, se seus chutes bateram e quantos pontos você fez.
                </p>
                {anchorSig ? (
                  <motion.a
                    className="anchor-link"
                    target="_blank"
                    rel="noreferrer"
                    href={explorerUrl(anchorSig)}
                    initial={{opacity: 0, scale: 0.9}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{duration: 0.4, ease: [0.2, 0.8, 0.2, 1]}}
                  >
                    ✓ Chute carimbado on-chain · conferir no Explorer ↗
                  </motion.a>
                ) : !wallet ? (
                  <motion.button
                    className="web-primary"
                    disabled={walletConnecting}
                    onClick={() => void connectWallet()}
                    animate={walletConnecting ? {} : {scale: [1, 1.015, 1]}}
                    transition={{duration: 1.8, repeat: Infinity, ease: 'easeInOut'}}
                  >
                    {walletConnecting ? 'Conectando…' : 'Conectar carteira e carimbar meu chute'} <span>→</span>
                  </motion.button>
                ) : (
                  <button
                    className="secondary"
                    disabled={anchorBusy}
                    onClick={() =>
                      void anchorProof(
                        buildPredictiveMemo({
                          fixture_id: predictiveProgress.fixture_id || fixtureId,
                          snapshot_id: predictiveProgress.snapshot_id,
                          content_hash: predictiveProgress.content_hash,
                          score: predictiveProgress.score || 0,
                          percentage: predictiveProgress.percentage || 0,
                          proof_ref: predictiveProgress.proof_refs?.[0],
                        }),
                      )
                    }
                  >
                    {anchorBusy ? 'Assine na sua carteira…' : `Carimbar meu chute on-chain (${network})`} <span>⛓</span>
                  </button>
                )}
                {anchorError && <p className="error">{anchorError}</p>}
              </div>

              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(
                    `CHUTE PREDITIVO · ${Math.round(predictiveProgress.score || 0)} pontos · ${predictiveProgress.percentage || 0}% acertos · ${selectedTeam} ${tier}`,
                  );
                  haptic('success');
                }}
              >
                Compartilhar resultado <span>↗</span>
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setAnchorSig('');
                  setAnchorError('');
                  navigate(homeRoute());
                }}
              >
                Voltar ao início
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}

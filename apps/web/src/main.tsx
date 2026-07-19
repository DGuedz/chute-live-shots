import './polyfills';
import React, {Suspense, lazy, useCallback, useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './neo-arcade-tokens.css';
import './neo-arcade-main.css';
import './neo-arcade-sections.css';
import './neo-arcade-pages.css';
import './predictive.css';
import './web-site.css';
import './web-app.css';
import {APP_ENV} from './env';
import {loadWalletSession, NETWORK_STORAGE_KEY, type Network} from './solana-anchor';
import {homeRoute, matchRoute, parseRoute, resultRoute, routeToHref, setupRoute, type AppRoute} from './router';

const WebHome = lazy(async () => {
  const module = await import('./components/WebHome');
  return {default: module.WebHome};
});
const QuizEngineApp = lazy(() => import('./app/QuizEngineApp'));

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: {toBase58: () => string} | null;
      connect?: (opts?: {onlyIfTrusted?: boolean}) => Promise<unknown>;
      disconnect?: () => Promise<void>;
      signMessage?: (message: Uint8Array, display?: string) => Promise<{signature: Uint8Array}>;
      signAndSendTransaction?: (tx: unknown) => Promise<{signature: string}>;
      signTransaction?: (tx: unknown) => Promise<unknown>;
    };
    phantom?: {solana?: Window['solana']};
    solflare?: Window['solana'];
    backpack?: Window['solana'];
  }
}

const INTRO_LINES = [
  'Dados vivos no lance',
  'TxLINE lê o jogo',
  'Solana prova a leitura',
  'Telegram reúne a torcida',
  'Cinco chutes. Um ranking',
  'Entre no matchday.',
];
const QUIZ_SESSION_STORAGE_KEY = 'chute-quiz-session';

function readStoredQuizId(): string | null {
  const raw = sessionStorage.getItem(QUIZ_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {quizId?: unknown};
    return typeof parsed.quizId === 'string' && parsed.quizId ? parsed.quizId : null;
  } catch {
    return null;
  }
}

function LoadingShell() {
  return (
    <main className="screen-in web-app">
      <section id="app-content">
        <p className="eyebrow">CARREGANDO</p>
        <h2>Abrindo o CHUTE.</h2>
        <p className="muted">Separando landing e app para reduzir o peso inicial do runtime.</p>
      </section>
    </main>
  );
}

function BootErrorScreen({message}: {message: string}) {
  return (
    <main className="screen-in web-app">
      <section id="app-content">
        <p className="eyebrow">BOOT BLOQUEADO</p>
        <h2>Configuração inválida.</h2>
        <p className="muted">{message}</p>
        <p className="fine">Em produção, `VITE_API_URL` e `VITE_PUBLIC_APP_URL` são obrigatórios para evitar fallback silencioso.</p>
      </section>
    </main>
  );
}

function IntroExperience({onEnter}: {onEnter: () => void}) {
  const [introBeat, setIntroBeat] = useState(0);
  const [introFading, setIntroFading] = useState(false);

  return (
    <main className="intro-shell">
      <section className={`intro${introFading ? ' intro-fading' : ''}`}>
        <video
          className="intro-video"
          autoPlay
          muted
          playsInline
          poster="/chute-cover.png"
          onEnded={onEnter}
          onTimeUpdate={(event) => {
            setIntroBeat(Math.min(INTRO_LINES.length - 1, Math.floor(event.currentTarget.currentTime / 1.6)));
            setIntroFading(event.currentTarget.currentTime >= 8.4);
          }}
        >
          <source src="/chute-intro.mp4" type="video/mp4" />
        </video>
        <div className="intro-pixels" />
        <div className="intro-shade" />
        <div className="intro-copy">
          <span className="intro-kicker">TXLINE · SUPERTEAM SPORTS</span>
          <div className="intro-line" key={introBeat}>
            {INTRO_LINES[introBeat]}
          </div>
          <button onClick={onEnter}>
            Ver estatísticas <span>→</span>
          </button>
          <button className="intro-skip" onClick={onEnter}>
            Pular intro
          </button>
        </div>
        <div className="intro-mark">
          LIVE SHOTS
          <br />
          <b>{String(introBeat + 1).padStart(2, '0')} / 06</b>
        </div>
        <div className="intro-ball">●</div>
      </section>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());
  const [homeWallet, setHomeWallet] = useState('');
  const [homeNetwork, setHomeNetwork] = useState<Network>('mainnet');
  const [homeError, setHomeError] = useState('');

  const navigate = useCallback((nextRoute: AppRoute, options?: {replace?: boolean}) => {
    window.history[options?.replace ? 'replaceState' : 'pushState']({}, '', routeToHref(nextRoute));
    setRoute(parseRoute());
  }, []);

  const refreshHomeContext = useCallback(() => {
    const savedSession = loadWalletSession();
    setHomeWallet(savedSession?.publicKey || '');
    setHomeNetwork(savedSession?.network || (localStorage.getItem(NETWORK_STORAGE_KEY) === 'devnet' ? 'devnet' : 'mainnet'));
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    refreshHomeContext();
    setHomeError('');
    window.scrollTo(0, 0);
  }, [refreshHomeContext, route]);

  const resumeQuizId = useMemo(() => readStoredQuizId(), [route]);

  if (APP_ENV.bootError) {
    return <BootErrorScreen message={APP_ENV.bootError} />;
  }

  if (route.kind === 'home' && route.showIntro) {
    return (
      <IntroExperience
        onEnter={() => {
          sessionStorage.setItem('chute-intro-seen', '1');
          navigate(matchRoute(), {replace: true});
        }}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingShell />}>
      {route.kind === 'home' ? (
        <WebHome
          loading={false}
          wallet={homeWallet}
          network={homeNetwork}
          error={homeError}
          onStart={() => navigate(matchRoute())}
          onWallet={() => navigate(setupRoute())}
          onReceipts={() => {
            if (resumeQuizId) navigate(resultRoute(resumeQuizId));
            else setHomeError('Seu primeiro recibo aparece depois que você concluir o chute.');
          }}
        />
      ) : (
        <QuizEngineApp route={route} navigate={navigate} />
      )}
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

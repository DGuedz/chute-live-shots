import {useEffect, useRef, useState} from 'react';
import {
  ArrowRight, ArrowUpRight, ChartLineUp, Database,
  Fingerprint, ShieldCheck, SoccerBall, Wallet,
} from '@phosphor-icons/react';
import gsap from 'gsap';
import {MatchComparisonCard} from './MatchComparisonCard';
import {SolanaWordmark, TxLINELogoBrand} from './LogoPlaceholders';
import {APP_ENV} from '../env';
import {addCue, useNarrativeScrubSection, useVideoScrubSection, type Cue} from '../lib/scrollCinema';
import {apply3DTextDepth} from '../lib/textDepth3D';

type WebHomeProps={
  loading:boolean;
  wallet:string;
  network:'devnet'|'mainnet';
  error:string;
  onStart:()=>void;
  onWallet:()=>void;
  onReceipts:()=>void;
};

type Lang='pt'|'en';
const LANG_STORAGE_KEY='chute-lang';

/* Copy bilíngue da landing. CHUTE é CHUTE em qualquer língua —
 * linguagem popular, zero jargão técnico na frente do torcedor. */
const COPY={
  pt:{
    skip:'Pular para o conteúdo',
    navMarket:'Como funciona',navCup:'Copa 2026',navHow:'Passo a passo',navReceipts:'Meus recibos',
    connect:'Conectar carteira',
    heroKicker:'Futebol · bolão preditivo',
    heroH1a:'Leia o jogo.',heroH1b:'Faça seu chute.',
    heroP:'Cinco palpites sobre a final. Acertou, pontuou — e fica registrado.',
    ctaQuiz:'Fazer meu chute',ctaStart:'Começar meu chute',ctaLoading:'Abrindo…',
    mediaLabel:'Role para explorar',
    tickerEditorial:'HISTÓRICO DA COPA',tickerLive:'AO VIVO · TXLINE',
    marketKicker:'DO PALPITE AO RECIBO',
    marketH2a:'Um bolão que começa',marketH2b:'na sua leitura de jogo.',
    marketP:'A tecnologia fica por trás. Na frente, você só precisa entender de bola.',
    card1T:'Histórico',card1P:'Tudo que já aconteceu em campo vira número organizado antes da bola rolar.',card1S:'DADOS · CONTEXTO',
    card2T:'Seu chute',card2P:'Cinco perguntas transformam seu faro de torcedor em previsão.',card2S:'QUIZ · 5 PERGUNTAS',
    card3T:'Prova',card3P:'O que acontecer em campo fecha a rodada e vira um recibo registrado na Solana.',card3S:'TXLINE',
    stadiumKicker:'MOMENTO DO PALPITE',
    stadiumH2a:'O jogo acelera.',stadiumH2b:'Seu chute também.',
    stadiumP:'Sem tela pesada, sem planilha. O contexto aparece na hora e a próxima ação fica óbvia.',
    chapter2:'CAPÍTULO 02',chapter3:'CAPÍTULO 03',
    cueStadium:['O jogo vira dado.','O dado vira pergunta.','A pergunta vira seu chute.'],
    cueTablet:['Você assina com a carteira.','O jogo responde ao vivo.','O recibo é seu. Para sempre.'],
    cupKicker:'INTELIGÊNCIA DA COPA',
    cupH2a:'Argentina × Espanha.',cupH2b:'Você lê o jogo.',
    cupP:'Os números contam o que já aconteceu. Quem decide o palpite é você.',
    tableKicker:'PANORAMA DA COPA · 48 SELEÇÕES',
    tableH2a:'Antes de chutar,',tableH2b:'veja o torneio inteiro.',
    tableP:'Dados reais de todos os jogos confirmados — não só da final. Quanto mais contexto, melhor o seu palpite.',
    tableTeam:'Seleção',tableGames:'J',tableW:'V',tableD:'E',tableL:'D',tableGF:'Gols',tableGA:'Sofridos',tableCorners:'Escanteios',tableCards:'Cartões',
    tableShowAll:'Ver as 48 seleções',tableShowLess:'Mostrar menos',
    tableSource:'Fonte: TxLINE mainnet (SL12) — mesmo feed que resolve seu quiz.',
    tabletKicker:'CAPÍTULO FINAL',
    tabletH2a:'Da leitura',tabletH2b:'ao recibo.',
    tabletP:'Palpitou, assinou com a carteira, acompanhou. No fim, o resultado fica provado — sem discussão no grupo.',
    howKicker:'SIMPLES PARA O TORCEDOR',
    howH2a:'Do primeiro chute',howH2b:'à prova da rodada.',
    step1T:'Conecte',step1P:'Phantom, Solflare ou Backpack. Um toque.',
    step2T:'Palpite',step2P:'Uma pergunta destrava a próxima.',
    step3T:'Acompanhe',step3P:'O jogo real responde seus chutes em tempo real.',
    step4T:'Comprove',step4P:'Seu placar vira um recibo digital seu.',
    receiptTitle:'CHUTE / RECIBO',receiptConfirmed:'4 de 5 palpites confirmados',
    receiptWallet:'Carteira',receiptWalletOff:'não conectada',receiptSnapshot:'Resultado',receiptWaiting:'aguardando o jogo',receiptNetwork:'Rede',
    receiptCta:'Ver meus recibos',
    receiptNote:'Prévia visual. Sem premiação ou emissão real nesta etapa.',
    finalKicker:'A BOLA ESTÁ COM VOCÊ',
    finalH2a:'Você conhece o jogo.',finalH2b:'Agora prove sua leitura.',
    finalP:'Cinco palpites. Uma carteira. Um resultado que não depende de opinião.',
    liveSoon:'em breve',liveNow:'ao vivo',liveDone:'encerrado',
    poweredBy:'Powered by',
  },
  en:{
    skip:'Skip to content',
    navMarket:'How it works',navCup:'World Cup 2026',navHow:'Step by step',navReceipts:'My receipts',
    connect:'Connect wallet',
    heroKicker:'Football · prediction pool',
    heroH1a:'Read the game.',heroH1b:'Take your CHUTE.',
    heroP:'Five calls on the final. Get them right, score — and it stays on record.',
    ctaQuiz:'Take my CHUTE',ctaStart:'Start my CHUTE',ctaLoading:'Opening…',
    mediaLabel:'Scroll to explore',
    tickerEditorial:'WORLD CUP HISTORY',tickerLive:'LIVE · TXLINE',
    marketKicker:'FROM CALL TO RECEIPT',
    marketH2a:'A pool that starts',marketH2b:'with how you read the game.',
    marketP:'The tech stays in the back. Up front, you just need to know football.',
    card1T:'History',card1P:'Everything that happened on the pitch becomes clean numbers before kickoff.',card1S:'DATA · CONTEXT',
    card2T:'Your CHUTE',card2P:'Five questions turn your fan instinct into a prediction.',card2S:'QUIZ · 5 QUESTIONS',
    card3T:'Proof',card3P:'What happens on the pitch settles the round and becomes a receipt on Solana.',card3S:'TXLINE',
    stadiumKicker:'CALL IT LIVE',
    stadiumH2a:'The game speeds up.',stadiumH2b:'So does your CHUTE.',
    stadiumP:'No heavy screens, no spreadsheets. Context shows up right on time and the next move is obvious.',
    chapter2:'CHAPTER 02',chapter3:'CHAPTER 03',
    cueStadium:['The game becomes data.','Data becomes questions.','Questions become your CHUTE.'],
    cueTablet:['You sign with your wallet.','The match answers live.','The receipt is yours. For good.'],
    cupKicker:'WORLD CUP INTELLIGENCE',
    cupH2a:'Argentina × Spain.',cupH2b:'You read the game.',
    cupP:'The numbers tell what already happened. The call is yours.',
    tableKicker:'WORLD CUP OVERVIEW · 48 TEAMS',
    tableH2a:'Before you call it,',tableH2b:'see the whole tournament.',
    tableP:'Real data from every confirmed match — not just the final. More context, better calls.',
    tableTeam:'Team',tableGames:'P',tableW:'W',tableD:'D',tableL:'L',tableGF:'Goals',tableGA:'Conceded',tableCorners:'Corners',tableCards:'Cards',
    tableShowAll:'See all 48 teams',tableShowLess:'Show less',
    tableSource:'Source: TxLINE mainnet (SL12) — the same feed that resolves your CHUTE.',
    tabletKicker:'FINAL CHAPTER',
    tabletH2a:'From the read',tabletH2b:'to the receipt.',
    tabletP:'Make the call, sign with your wallet, follow it live. The result ends up proven — no arguing in the group chat.',
    howKicker:'SIMPLE FOR THE FAN',
    howH2a:'From your first CHUTE',howH2b:'to the round’s proof.',
    step1T:'Connect',step1P:'Phantom, Solflare or Backpack. One tap.',
    step2T:'Call it',step2P:'Each answer unlocks the next question.',
    step3T:'Follow',step3P:'The real match answers your calls in real time.',
    step4T:'Prove it',step4P:'Your score becomes a digital receipt of yours.',
    receiptTitle:'CHUTE / RECEIPT',receiptConfirmed:'4 of 5 calls confirmed',
    receiptWallet:'Wallet',receiptWalletOff:'not connected',receiptSnapshot:'Result',receiptWaiting:'waiting for the match',receiptNetwork:'Network',
    receiptCta:'See my receipts',
    receiptNote:'Visual preview. No prizes or real issuance at this stage.',
    finalKicker:'THE BALL IS YOURS',
    finalH2a:'You know the game.',finalH2b:'Now prove your read.',
    finalP:'Five calls. One wallet. A result that doesn’t depend on opinion.',
    liveSoon:'soon',liveNow:'live',liveDone:'ended',
    poweredBy:'Powered by',
  },
} as const;

const TEAM_PT:Record<string,string>={Spain:'Espanha',France:'França',England:'Inglaterra',Belgium:'Bélgica',Norway:'Noruega',Austria:'Áustria',Germany:'Alemanha',Netherlands:'Holanda','New Zealand':'Nova Zelândia',Australia:'Austrália',Brazil:'Brasil',India:'Índia'};

type LiveFixture={fixture_id:string;home_team:string;away_team:string;game_state:string|null};
type TournamentRow={pos:number;team:string;games:number;wins:number;draws:number;losses:number;goals_for:number;goals_against:number;goal_diff:number;corners:number;yellow_cards:number;red_cards:number};
type Quiz={quiz_id:string;title:string;status:'active'|'closed'|'upcoming';total_players:number;total_correct:number;prize_pool:string};

const editorialStats=[
  ['Copa 2026','48 seleções'],['Formato','104 jogos'],['Argentina','19 gols'],
  ['Espanha','13 gols'],['Argentina','113 finalizações'],['Espanha','120 finalizações'],
];

function loadLang():Lang{
  try{return localStorage.getItem(LANG_STORAGE_KEY)==='en'?'en':'pt'}catch{return 'pt'}
}

/** Fallback estático (prefers-reduced-motion ou pré-hidratação): sem scrub, sem parallax. */
function StaticReveal({children,className=''}:{children:React.ReactNode;className?:string}){
  return <div className={`cinema-static ${className}`.trim()}>{children}</div>;
}

export function WebHome({loading,wallet,network,error,onStart,onWallet,onReceipts}:WebHomeProps){
  const [lang,setLang]=useState<Lang>(loadLang);
  const t=COPY[lang];
  const shortWallet=wallet?`${wallet.slice(0,4)}…${wallet.slice(-4)}`:t.connect;
  const [liveFixtures,setLiveFixtures]=useState<LiveFixture[]>([]);
  const [quizzes,setQuizzes]=useState<Quiz[]>([]);
  const [tournamentTable,setTournamentTable]=useState<TournamentRow[]>([]);
  const [showFullTable,setShowFullTable]=useState(false);

  // ── Hero: vídeo em Canvas, pin true, copy entra/segura/sai enquanto o vídeo avança ──
  const hero=useVideoScrubSection({pin:true,scrollLength:180,fallbackDuration:12});
  const heroCopyRef=useRef<HTMLDivElement|null>(null);
  const heroCardRef=useRef<HTMLDivElement|null>(null);
  const heroLabelRef=useRef<HTMLSpanElement|null>(null);

  // ── Capítulo 02 (estádio): vídeo em Canvas, pin true, copy + 3 frases sequenciais ──
  const stadium=useVideoScrubSection({pin:true,scrollLength:220,fallbackDuration:7});
  const stadiumCopyRef=useRef<HTMLDivElement|null>(null);
  const stadiumLabelRef=useRef<HTMLSpanElement|null>(null);
  const stadiumCueRefs=useRef<Array<HTMLParagraphElement|null>>([]);

  // ── Capítulo 03 (tablet): mesmo padrão, alinhado à direita ──
  const tablet=useVideoScrubSection({pin:true,scrollLength:220,fallbackDuration:8});
  const tabletCopyRef=useRef<HTMLDivElement|null>(null);
  const tabletLabelRef=useRef<HTMLSpanElement|null>(null);
  const tabletCueRefs=useRef<Array<HTMLParagraphElement|null>>([]);

  // ── Seções narrativas sem vídeo: stagger + parallax discreto ──
  const market=useNarrativeScrubSection(70);
  const marketHeadingRef=useRef<HTMLDivElement|null>(null);
  const marketCardRefs=useRef<Array<HTMLElement|null>>([]);

  const intelligence=useNarrativeScrubSection(50);
  const intelligenceHeadingRef=useRef<HTMLDivElement|null>(null);
  const intelligenceCardRef=useRef<HTMLDivElement|null>(null);

  const tickerRef=useRef<HTMLElement|null>(null);
  const marketSectionRef=useRef<HTMLElement|null>(null);
  const intelligenceSectionRef=useRef<HTMLElement|null>(null);
  const proofSectionRef=useRef<HTMLElement|null>(null);
  const finalSectionRef=useRef<HTMLElement|null>(null);

  const toggleLang=()=>{
    const next:Lang=lang==='pt'?'en':'pt';
    setLang(next);
    try{localStorage.setItem(LANG_STORAGE_KEY,next)}catch{/* storage indisponível não bloqueia o toggle */}
  };
  const teamName=(name:string)=>lang==='pt'?(TEAM_PT[name]||name):name;
  const stateLabel=(state:string|null)=>{
    if(state==='2'||state==='3')return t.liveNow;
    if(state==='4'||state==='5')return t.liveDone;
    return t.liveSoon;
  };

  // Dados reais da TxLINE alimentam a home: quizes com estatísticas em tempo real via SL 12
  useEffect(()=>{
    let cancelled=false;
    Promise.all([
      fetch(`${APP_ENV.apiUrl}/api/quizzes`).then((r)=>r.ok?r.json():null),
      fetch(`${APP_ENV.apiUrl}/api/fixtures`).then((r)=>r.ok?r.json():null),
    ])
      .then(([quizzesPayload,fixturesPayload])=>{
        if(cancelled)return;

        // Carrega quizes com estatísticas da TxLINE
        if(quizzesPayload?.quizzes&&Array.isArray(quizzesPayload.quizzes)){
          setQuizzes(quizzesPayload.quizzes.slice(0,6));
        }

        // Carrega fixtures para fallback se não houver quizes
        if(fixturesPayload?.fixtures){
          const unique=new Map<string,LiveFixture>();
          for(const fixture of fixturesPayload.fixtures as LiveFixture[]){
            const key=`${fixture.home_team}x${fixture.away_team}`;
            if(fixture.home_team&&fixture.away_team&&!unique.has(key))unique.set(key,fixture);
          }
          const statePriority=(state:string|null)=>state==='2'||state==='3'?0:state==='4'||state==='5'?2:1;
          setLiveFixtures([...unique.values()].sort((a,b)=>statePriority(a.game_state)-statePriority(b.game_state)).slice(0,6));
        }
      })
      .catch(()=>{/* fail-closed: ticker segue com histórico editorial */});
    return()=>{cancelled=true};
  },[]);

  // Tabela completa da Copa (48 seleções, dados reais TxLINE) — visão ampla para o
  // torcedor pensar além da final antes de responder o quiz.
  useEffect(()=>{
    let cancelled=false;
    fetch(`${APP_ENV.apiUrl}/api/copa/tabela`)
      .then((response)=>response.ok?response.json():null)
      .then((payload)=>{if(!cancelled&&Array.isArray(payload?.table))setTournamentTable(payload.table)})
      .catch(()=>{/* seção some silenciosamente se a tabela não carregar */});
    return()=>{cancelled=true};
  },[]);

  // Market cards: cada card entra sequencialmente com scroll, girando verde um por um
  useEffect(()=>{
    if(!market.sectionRef.current) return;
    const ctx=gsap.context(()=>{
      const cards=marketCardRefs.current.filter((c)=>c);
      if(cards.length===0) return;

      cards.forEach((card,idx)=>{
        const startDelay=idx*0.15;
        gsap.fromTo(
          card,
          {opacity:0,y:16,scale:0.94},
          {
            opacity:1,
            y:0,
            scale:1,
            duration:0.7,
            ease:'power2.out',
            delay:startDelay,
            scrollTrigger:{
              trigger:market.sectionRef.current,
              start:'top 70%',
              end:'top 30%',
              scrub:0.5,
              markers:false,
            },
          }
        );

        // Animação da cor/accent: anima a cor de fundo levemente
        if(idx<2){
          gsap.to(card,{
            '--accent-glow':1,
            duration:0.8,
            ease:'power2.out',
            delay:startDelay+0.2,
            scrollTrigger:{
              trigger:market.sectionRef.current,
              start:'top 60%',
              end:'top 20%',
              scrub:0.5,
            },
          } as any);
        }
      });
    },market.sectionRef);

    return()=>ctx.revert();
  },[]);

  // 3D Text Depth: aplica parallax em camadas de profundidade para cada seção principal
  useEffect(()=>{
    if(!marketSectionRef.current) return;
    const ctx=apply3DTextDepth({
      trigger:marketSectionRef.current,
      depthAmount:40,
      scaleAmount:0.12,
      start:'top 70%',
      end:'center center',
      scrubSpeed:0.4,
    });
    return()=>ctx.revert();
  },[]);

  useEffect(()=>{
    if(!intelligenceSectionRef.current) return;
    const ctx=apply3DTextDepth({
      trigger:intelligenceSectionRef.current,
      depthAmount:35,
      scaleAmount:0.1,
      start:'top 75%',
      end:'center center',
      scrubSpeed:0.35,
    });
    return()=>ctx.revert();
  },[]);

  useEffect(()=>{
    if(!proofSectionRef.current) return;
    const ctx=apply3DTextDepth({
      trigger:proofSectionRef.current,
      depthAmount:38,
      scaleAmount:0.11,
      start:'top 70%',
      end:'center center',
      scrubSpeed:0.4,
    });
    return()=>ctx.revert();
  },[]);

  useEffect(()=>{
    if(!finalSectionRef.current) return;
    const ctx=apply3DTextDepth({
      trigger:finalSectionRef.current,
      depthAmount:45,
      scaleAmount:0.14,
      start:'top 65%',
      end:'center center',
      scrubSpeed:0.45,
    });
    return()=>ctx.revert();
  },[]);

  // Ticker: ativa com scroll, mostrando partidas/dados reais em movimento
  useEffect(()=>{
    if(!tickerRef.current) return;
    const ctx=gsap.context(()=>{
      const track=tickerRef.current?.querySelector('.ticker-track') as HTMLElement;
      if(!track) return;

      gsap.fromTo(
        track,
        {opacity:0,y:12},
        {
          opacity:1,
          y:0,
          duration:0.6,
          ease:'power2.out',
          scrollTrigger:{
            trigger:tickerRef.current,
            start:'top 85%',
            end:'top 50%',
            scrub:.3,
            markers:false,
          },
        }
      );
    },tickerRef);

    return()=>ctx.revert();
  },[]);

  // Barra de progresso fixa: reforça a leitura "preparando o chute" enquanto o usuário rola a home.
  const progressRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let frame=0;
    const sync=()=>{
      frame=0;
      const doc=document.documentElement;
      const distance=Math.max(1,doc.scrollHeight-window.innerHeight);
      const pct=Math.min(1,Math.max(0,window.scrollY/distance));
      if(progressRef.current)progressRef.current.style.transform=`scaleX(${pct})`;
    };
    const requestSync=()=>{if(!frame)frame=window.requestAnimationFrame(sync)};
    window.addEventListener('scroll',requestSync,{passive:true});
    window.addEventListener('resize',requestSync);
    sync();
    return()=>{window.removeEventListener('scroll',requestSync);window.removeEventListener('resize',requestSync);if(frame)window.cancelAnimationFrame(frame)};
  },[]);

  // ── Cues do Hero: copy entra cedo, segura pra leitura, sai em fade; card acompanha
  // levemente atrasado; o rótulo "role para explorar" desaparece assim que o usuário rola. ──
  useEffect(()=>{
    const tl=hero.timelineRef.current;
    if(!tl)return;
    const fade:Cue={enterStart:0,enterEnd:0.12,exitStart:0.42,exitEnd:0.52};
    if(heroCopyRef.current)addCue(tl,heroCopyRef.current,fade,{opacity:0,y:26},{opacity:1,y:0});
    if(heroCardRef.current)addCue(tl,heroCardRef.current,{enterStart:0.05,enterEnd:0.18,exitStart:0.42,exitEnd:0.54},{opacity:0,y:34},{opacity:1,y:0});
    if(heroLabelRef.current)addCue(tl,heroLabelRef.current,{enterStart:0,enterEnd:0.02,exitStart:0.05,exitEnd:0.12},{opacity:1},{opacity:0});
  },[hero.timelineRef]);

  // ── Cues do capítulo estádio: copy some por volta da metade para o vídeo assumir o
  // primeiro plano; as 3 frases entram em sequência depois, cada uma cede lugar à próxima. ──
  useEffect(()=>{
    const tl=stadium.timelineRef.current;
    if(!tl)return;
    addCue(tl,stadiumCopyRef.current,{enterStart:0,enterEnd:0.08,exitStart:0.4,exitEnd:0.5},{opacity:0,y:22},{opacity:1,y:0});
    addCue(tl,stadiumLabelRef.current,{enterStart:0,enterEnd:0.03,exitStart:0.4,exitEnd:0.48},{opacity:1},{opacity:0});
    const timings:Cue[]=[{enterStart:0.52,enterEnd:0.6,exitStart:0.68,exitEnd:0.75},{enterStart:0.7,enterEnd:0.78,exitStart:0.86,exitEnd:0.92},{enterStart:0.88,enterEnd:0.95,exitStart:0.99,exitEnd:1}];
    stadiumCueRefs.current.forEach((el,index)=>{
      if(!el)return;
      addCue(tl,el,timings[Math.min(index,timings.length-1)],{opacity:0,y:24},{opacity:1,y:0});
    });
  },[stadium.timelineRef]);

  useEffect(()=>{
    const tl=tablet.timelineRef.current;
    if(!tl)return;
    addCue(tl,tabletCopyRef.current,{enterStart:0,enterEnd:0.08,exitStart:0.4,exitEnd:0.5},{opacity:0,y:22},{opacity:1,y:0});
    addCue(tl,tabletLabelRef.current,{enterStart:0,enterEnd:0.03,exitStart:0.4,exitEnd:0.48},{opacity:1},{opacity:0});
    const timings:Cue[]=[{enterStart:0.52,enterEnd:0.6,exitStart:0.68,exitEnd:0.75},{enterStart:0.7,enterEnd:0.78,exitStart:0.86,exitEnd:0.92},{enterStart:0.88,enterEnd:0.95,exitStart:0.99,exitEnd:1}];
    tabletCueRefs.current.forEach((el,index)=>{
      if(!el)return;
      addCue(tl,el,timings[Math.min(index,timings.length-1)],{opacity:0,y:24},{opacity:1,y:0});
    });
  },[tablet.timelineRef]);

  // ── Market-fold: heading entra, os 3 cards entram em stagger com parallax discreto
  // (cada card sobe a uma velocidade levemente diferente) — conteúdo de referência, sem exit. ──
  useEffect(()=>{
    const tl=market.timelineRef.current;
    if(!tl)return;
    if(marketHeadingRef.current)tl.fromTo(marketHeadingRef.current,{opacity:0,y:30},{opacity:1,y:0,duration:0.2,ease:'power2.out'},0);
    marketCardRefs.current.forEach((el,index)=>{
      if(!el)return;
      const start=0.12+index*0.08;
      tl.fromTo(el,{opacity:0,y:46-index*6},{opacity:1,y:0,duration:0.26,ease:'power2.out'},start);
    });
  },[market.timelineRef]);

  useEffect(()=>{
    const tl=intelligence.timelineRef.current;
    if(!tl)return;
    if(intelligenceHeadingRef.current)tl.fromTo(intelligenceHeadingRef.current,{opacity:0,y:28},{opacity:1,y:0,duration:0.24,ease:'power2.out'},0);
    if(intelligenceCardRef.current)tl.fromTo(intelligenceCardRef.current,{opacity:0,y:38},{opacity:1,y:0,duration:0.3,ease:'power2.out'},0.14);
  },[intelligence.timelineRef]);

  // Reveal simples (fade-up ao entrar em vista) para as seções finais — sem vídeo, sem scrub,
  // conteúdo permanece na tela (recibo, passo a passo, CTA final).
  useEffect(()=>{
    const els=document.querySelectorAll<HTMLElement>('[data-reveal]');
    const ctx=gsap.context(()=>{
      els.forEach((el)=>{
        gsap.fromTo(el,{opacity:0,y:26},{
          opacity:1,y:0,duration:0.55,ease:'power2.out',
          scrollTrigger:{trigger:el,start:'top 88%',toggleActions:'play none none reverse'},
        });
      });
    });
    return ()=>ctx.revert();
  },[tournamentTable.length]);

  return <div className="web-home">
    <a className="skip-link" href="#conteudo-principal">{t.skip}</a>
    <div className="scroll-progress" aria-hidden="true"><span ref={progressRef}/></div>
    <header className="web-nav">
      <a className="web-brand" href="#inicio" aria-label="CHUTE — início"><span>CHUTE</span></a>
      <nav aria-label="Navegação principal"><a href="#mercado">{t.navMarket}</a><a href="#copa">{t.navCup}</a><a href="#como-funciona">{t.navHow}</a><button className="nav-receipts" onClick={onReceipts}>{t.navReceipts}</button></nav>
      <div className="nav-actions">
        <button className="lang-toggle" onClick={toggleLang} aria-label={lang==='pt'?'Switch to English':'Mudar para português'}>{lang==='pt'?'EN':'PT'}</button>
        <button className="wallet-button" onClick={onWallet}><Wallet size={18}/><span>{shortWallet}</span></button>
      </div>
    </header>

    <section className="web-fold hero-fold cinema-section" id="inicio" ref={hero.sectionRef as React.RefObject<HTMLElement>}>
      <div className="hero-stage cinema-stage">
        <div className="hero-media cinema-media">
          <canvas ref={hero.canvasRef} className="cinema-canvas" aria-hidden="true"/>
          <video ref={hero.videoRef} className="cinema-video-source" muted playsInline preload="auto" aria-label="Torcedor responde ao quiz enquanto assiste à partida e comemora um gol, vídeo controlado pela rolagem"><source src="/torcedor-hero-scroll.mp4" type="video/mp4"/></video>
          {hero.reduced&&<img className="cinema-poster" src="/torcedor-hero-scroll-poster.jpg" alt=""/>}
          <span className="media-label" ref={heroLabelRef}>{t.mediaLabel}</span>
        </div>
        <div className="hero-contrast"/>
        <div className="hero-shell">
          <div className="hero-copy" id="conteudo-principal" tabIndex={-1} ref={heroCopyRef}>
            <span className="web-kicker"><i/> {t.heroKicker}</span>
            <h1>{t.heroH1a}<br/><em>{t.heroH1b}</em></h1>
            <p>{t.heroP}</p>
            <div className="hero-actions"><button className="web-primary" onClick={onStart} disabled={loading}>{loading?t.ctaLoading:t.ctaQuiz}<ArrowRight size={20}/></button></div>
            {error&&<p className="web-error">{error}</p>}
          </div>
          <div className="hero-comparison" ref={heroCardRef}>
            <MatchComparisonCard/>
          </div>
        </div>
      </div>
    </section>

    <aside ref={tickerRef} className="stats-ticker" aria-label={quizzes.length?'Quizes com dados TxLINE SL12 em tempo real':liveFixtures.length?'Partidas reais do feed TxLINE':'Estatísticas históricas da Copa'}>
      <span className="ticker-source">{quizzes.length?'QUIZES AO VIVO · TXLINE':liveFixtures.length?t.tickerLive:t.tickerEditorial}</span>
      <div className="ticker-window">
        <div className="ticker-track">
          {[0,1].map((copyIndex)=>(
            <div className="ticker-group" key={copyIndex} aria-hidden={copyIndex===1||undefined}>
              {quizzes.length
                ?quizzes.map((quiz)=><span className="ticker-stat" key={`${copyIndex}-${quiz.quiz_id}`}><small>{quiz.status==='active'?'ATIVO':quiz.status==='closed'?'FECHADO':'EM BREVE'}</small><b>{quiz.title}</b><i>{quiz.total_players>0&&<span style={{fontSize:'10px',marginLeft:'6px'}}>👥 {quiz.total_players}</span>}</i></span>)
                :liveFixtures.length
                ?liveFixtures.map((fixture)=><span className="ticker-stat" key={`${copyIndex}-${fixture.fixture_id}`}><small>{stateLabel(fixture.game_state)}</small><b>{teamName(fixture.home_team)} × {teamName(fixture.away_team)}</b><i/></span>)
                :editorialStats.map(([label,value])=><span className="ticker-stat" key={`${copyIndex}-${label}-${value}`}><small>{label}</small><b>{value}</b><i/></span>)}
            </div>
          ))}
        </div>
      </div>
    </aside>

    <section className="web-fold market-fold" id="mercado" ref={(el)=>{if(el){market.sectionRef.current=el; marketSectionRef.current=el;}}}>
      <div className="fold-heading" ref={marketHeadingRef}><span className="web-kicker">{t.marketKicker}</span><h2>{t.marketH2a}<br/><em>{t.marketH2b}</em></h2><p>{t.marketP}</p></div>
      <div className="market-grid">
        <article ref={(el)=>{marketCardRefs.current[0]=el}}><span className="card-number">01</span><Database size={30}/><h3>{t.card1T}</h3><p>{t.card1P}</p><small>{t.card1S}</small></article>
        <article ref={(el)=>{marketCardRefs.current[1]=el}}><span className="card-number">02</span><SoccerBall size={30}/><h3>{t.card2T}</h3><p>{t.card2P}</p><small>{t.card2S}</small></article>
        <article className="accent-card" ref={(el)=>{marketCardRefs.current[2]=el}}><span className="card-number">03</span><Fingerprint size={30}/><h3>{t.card3T}</h3><p>{t.card3P}</p><small>{t.card3S} · {network.toUpperCase()}</small></article>
      </div>
    </section>

    <div className="fold-blend" aria-hidden="true"/>
    <section className="web-fold clip-fold cinema-section" ref={stadium.sectionRef as React.RefObject<HTMLElement>}>
      <div className="clip-stage cinema-stage">
        <div className="clip-media cinema-media">
          <canvas ref={stadium.canvasRef} className="cinema-canvas" aria-hidden="true"/>
          <video ref={stadium.videoRef} className="cinema-video-source" muted playsInline preload="auto" aria-label="Torcedor em um estádio reage ao jogo e consulta o CHUTE no celular, vídeo controlado pela rolagem"><source src="/torcedor-estadio-chute.mp4" type="video/mp4"/></video>
          {stadium.reduced&&<img className="cinema-poster" src="/torcedor-estadio-chute-poster.jpg" alt=""/>}
        </div>
        <div className="clip-shade"/>
        <div className="clip-copy" ref={stadiumCopyRef}>
          <span className="web-kicker"><i/> {t.stadiumKicker}</span>
          <h2>{t.stadiumH2a}<br/><em>{t.stadiumH2b}</em></h2>
          <p>{t.stadiumP}</p>
          <button className="web-primary" onClick={onStart} disabled={loading}>{loading?t.ctaLoading:t.ctaQuiz}<ArrowRight size={20}/></button>
        </div>
        <div className="cue-layer" aria-hidden="true">
          {t.cueStadium.map((text,index)=>(
            <p className="cue-phrase" key={text} ref={(el)=>{stadiumCueRefs.current[index]=el}}>{text}</p>
          ))}
        </div>
        <span className="clip-label" ref={stadiumLabelRef}>{t.chapter2}</span>
      </div>
    </section>
    <div className="fold-blend" aria-hidden="true"/>

    <section className="web-fold intelligence-fold" id="copa" ref={(el)=>{if(el){intelligence.sectionRef.current=el; intelligenceSectionRef.current=el;}}}>
      <div className="fold-heading compact" ref={intelligenceHeadingRef}><span className="web-kicker">{t.cupKicker}</span><h2>{t.cupH2a}<br/><em>{t.cupH2b}</em></h2><p>{t.cupP}</p></div>
      <div ref={intelligenceCardRef}>
        <MatchComparisonCard/>
      </div>
    </section>

    {tournamentTable.length>0&&(
      <section className="web-fold tournament-fold" id="tabela">
        <div className="fold-heading compact" data-reveal>
          <span className="web-kicker">{t.tableKicker}</span>
          <h2>{t.tableH2a}<br/><em>{t.tableH2b}</em></h2>
          <p>{t.tableP}</p>
        </div>
        <div className="tournament-table-wrap" data-reveal>
          <div className="tournament-table-scroll">
            <table className="tournament-table">
              <thead>
                <tr>
                  <th>#</th><th>{t.tableTeam}</th><th>{t.tableGames}</th><th>{t.tableW}</th><th>{t.tableD}</th><th>{t.tableL}</th>
                  <th>{t.tableGF}</th><th>{t.tableGA}</th><th>{t.tableCorners}</th><th>{t.tableCards}</th>
                </tr>
              </thead>
              <tbody>
                {(showFullTable?tournamentTable:tournamentTable.slice(0,10)).map((row)=>(
                  <tr key={row.team} className={row.team==='Argentina'||row.team==='Spain'?'tournament-row-final':''}>
                    <td>{row.pos}</td>
                    <td>{teamName(row.team)}</td>
                    <td>{row.games}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td>
                    <td>{row.goals_for}</td><td>{row.goals_against}</td><td>{row.corners}</td>
                    <td>{row.yellow_cards}{row.red_cards>0?`+${row.red_cards}🟥`:''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tournament-table-footer">
            <button className="secondary" onClick={()=>setShowFullTable((value)=>!value)}>
              {showFullTable?t.tableShowLess:t.tableShowAll}
            </button>
            <small>{t.tableSource}</small>
          </div>
        </div>
      </section>
    )}

    <div className="fold-blend" aria-hidden="true"/>
    <section className="web-fold clip-fold clip-fold-tablet cinema-section" ref={tablet.sectionRef as React.RefObject<HTMLElement>}>
      <div className="clip-stage cinema-stage">
        <div className="clip-media cinema-media">
          <canvas ref={tablet.canvasRef} className="cinema-canvas" aria-hidden="true"/>
          <video ref={tablet.videoRef} className="cinema-video-source" muted playsInline preload="auto" aria-label="A interface do CHUTE aparece em um tablet, vídeo controlado pela rolagem"><source src="/chute-tablet-reveal.mp4" type="video/mp4"/></video>
          {tablet.reduced&&<img className="cinema-poster" src="/chute-tablet-reveal-poster.jpg" alt=""/>}
        </div>
        <div className="clip-shade"/>
        <div className="clip-copy clip-copy-right" ref={tabletCopyRef}>
          <span className="web-kicker"><i/> {t.tabletKicker}</span>
          <h2>{t.tabletH2a}<br/><em>{t.tabletH2b}</em></h2>
          <p>{t.tabletP}</p>
          <button className="web-primary" onClick={onStart} disabled={loading}>{loading?t.ctaLoading:t.ctaStart}<ArrowRight size={20}/></button>
        </div>
        <div className="cue-layer cue-layer-right" aria-hidden="true">
          {t.cueTablet.map((text,index)=>(
            <p className="cue-phrase" key={text} ref={(el)=>{tabletCueRefs.current[index]=el}}>{text}</p>
          ))}
        </div>
        <span className="clip-label" ref={tabletLabelRef}>{t.chapter3}</span>
      </div>
    </section>
    <div className="fold-blend" aria-hidden="true"/>

    <section className="web-fold proof-fold" id="como-funciona" ref={proofSectionRef}>
      <div className="fold-heading" data-reveal><span className="web-kicker">{t.howKicker}</span><h2>{t.howH2a}<br/><em>{t.howH2b}</em></h2></div>
      <div className="proof-layout">
        <div className="steps-list" data-reveal>
          <article><span>01</span><div><h3>{t.step1T}</h3><p>{t.step1P}</p></div><Wallet/></article>
          <article><span>02</span><div><h3>{t.step2T}</h3><p>{t.step2P}</p></div><SoccerBall/></article>
          <article><span>03</span><div><h3>{t.step3T}</h3><p>{t.step3P}</p></div><ChartLineUp/></article>
          <article><span>04</span><div><h3>{t.step4T}</h3><p>{t.step4P}</p></div><ShieldCheck/></article>
        </div>
        <div className="receipt-preview" data-reveal>
          <div className="receipt-top"><span>{t.receiptTitle}</span><span className="status-dot">{network.toUpperCase()}</span></div>
          <div className="receipt-score"><small>ARGENTINA × {lang==='pt'?'ESPANHA':'SPAIN'}</small><strong>420 <span>PTS</span></strong><p>{t.receiptConfirmed}</p></div>
          <div className="receipt-data"><p><span>{t.receiptWallet}</span><b>{wallet?shortWallet:t.receiptWalletOff}</b></p><p><span>{t.receiptSnapshot}</span><b>{t.receiptWaiting}</b></p><p><span>{t.receiptNetwork}</span><b>{network} · paper</b></p></div>
          <button onClick={onReceipts}>{t.receiptCta}<ArrowUpRight/></button>
          <small className="receipt-note">{t.receiptNote}</small>
        </div>
      </div>
    </section>

    <section className="web-fold final-fold" ref={finalSectionRef}>
      <div data-reveal><span className="web-kicker">{t.finalKicker}</span><h2>{t.finalH2a}<br/><em>{t.finalH2b}</em></h2><p>{t.finalP}</p><button className="web-primary" onClick={onStart} disabled={loading}>{loading?t.ctaLoading:t.ctaStart}<ArrowRight/></button></div>
      <footer><a className="web-brand" href="#inicio"><span>CHUTE</span></a><div className="brand-strip"><span>{t.poweredBy}</span><TxLINELogoBrand height={13} /><i/><SolanaWordmark height={12} /></div><span>DEMO · {network.toUpperCase()}</span></footer>
    </section>
  </div>;
}

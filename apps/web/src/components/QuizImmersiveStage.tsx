import {AnimatePresence,motion,useScroll,useTransform} from 'motion/react';
import {useMemo,useRef} from 'react';
import {MatchComparisonCard} from './MatchComparisonCard';

type QuizImmersiveStageProps={
  team:'Argentina'|'Spain';
  tier:string;
  progress:{answered:number;total:number};
  question:{prompt:string;stat_basis:string}|null;
  loading:boolean;
  hasSelection:boolean;
};

const chapterLabels=[
  'Leitura inicial',
  'Sinal principal',
  'Mercado em pressão',
  'Momento de convicção',
  'Fechamento da rodada',
];

const chapterInsights=[
  'Números históricos dão contexto para a primeira leitura da partida.',
  'A abertura compara criação, volume e ameaça real no alvo.',
  'No meio do quiz, o foco passa para pressão ofensiva e variação de cenário.',
  'A convicção cresce quando o histórico confirma padrão, não quando a interface exagera.',
  'O fechamento só vale quando o snapshot TxLINE confirma o desfecho verificável.',
];

function tierLabel(tier:string):string{
  if(tier==='gols')return 'GOLS';
  if(tier==='escanteios')return 'ESCANTEIOS';
  if(tier==='cartoes')return 'CARTÕES';
  return tier.toUpperCase();
}

export function QuizImmersiveStage({team,tier,progress,question,loading,hasSelection}:QuizImmersiveStageProps){
  const shellRef=useRef<HTMLDivElement>(null);
  const totalSteps=Math.max(progress.total,1);
  const chapterIndex=Math.min(progress.answered,totalSteps-1);
  const chapterTitle=chapterLabels[Math.min(chapterIndex,chapterLabels.length-1)] || chapterLabels[0];
  const chapterPrompt=question?.prompt || 'A próxima leitura aparece assim que o quiz estiver pronto.';
  const chapterStatus=loading?'Preparando a próxima ação':hasSelection?'Resposta selecionada':'Role e confirme quando estiver pronto';
  const chapterBasis=question?.stat_basis || 'Base estatística protegida pelo backend';
  const stageTimeline=useMemo(()=>Array.from({length:totalSteps},(_,index)=>index),[totalSteps]);
  const {scrollYProgress}=useScroll({target:shellRef,offset:['start start','end start']});
  const heroOpacity=useTransform(scrollYProgress,[0,.55,.92],[1,1,0]);
  const heroY=useTransform(scrollYProgress,[0,.92],[0,-56]);
  const heroScale=useTransform(scrollYProgress,[0,.92],[1,.965]);

  return <div className="quiz-immersive-shell" ref={shellRef}>
    <motion.div className="quiz-immersive-stage" style={{opacity:heroOpacity,y:heroY,scale:heroScale}}>
    <div className="quiz-immersive-frame">
      <div className="quiz-immersive-grid" aria-hidden="true">
        {Array.from({length:20},(_,index)=><span key={index}/>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${chapterIndex}-${question?.prompt || 'idle'}`}
          className="quiz-immersive-copy"
          initial={{opacity:0,x:36}}
          animate={{opacity:1,x:0}}
          exit={{opacity:0,x:-36}}
          transition={{duration:.42,ease:[.2,.8,.2,1]}}
        >
          <div className="quiz-immersive-topline">
            <span>{team}</span>
            <span>{tierLabel(tier)} · {chapterIndex+1}/{totalSteps}</span>
          </div>
          <p className="quiz-stage-kicker">Inteligência da Copa</p>
          <div className="quiz-stage-heading">
            <span className="quiz-stage-chapter">{chapterTitle}</span>
            <h3>Argentina × Espanha</h3>
          </div>
          <p className="quiz-stage-status">Você lê o jogo pelos sinais que a Copa já deixou.</p>
          <MatchComparisonCard className="quiz-stage-card" activeIndex={Math.min(chapterIndex,3)}/>
          <p className="quiz-stage-question">{chapterInsights[Math.min(chapterIndex,chapterInsights.length-1)]}</p>
          <p className="quiz-stage-active-question">Pergunta ativa: {chapterPrompt}</p>
          <small>{chapterBasis}</small>
          <div className="quiz-stage-track" aria-label="Capítulos do quiz">
            {stageTimeline.map((step)=>(
              <span key={step} className={step===chapterIndex?'active':step<chapterIndex?'past':''}/>
            ))}
          </div>
          <div className="quiz-stage-chapters" aria-label="Perguntas do quiz">
            {stageTimeline.map((step)=>(
              <span key={`chapter-${step}`} className={step===chapterIndex?'active':step<chapterIndex?'past':''}>
                Q{step+1}
              </span>
            ))}
          </div>
          <p className="quiz-stage-footnote">{chapterStatus} · Fonte editorial histórica. Resolução somente com snapshot TxLINE verificável.</p>
        </motion.div>
      </AnimatePresence>
    </div>
    </motion.div>
  </div>;
}

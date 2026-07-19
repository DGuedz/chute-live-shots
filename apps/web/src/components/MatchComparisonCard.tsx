import {TrendUp} from '@phosphor-icons/react';
import {motion} from 'motion/react';

type MatchComparisonCardProps={
  className?: string;
  activeIndex?: number;
};

const comparisonStats=[
  {label:'Gols registrados',left:'19',right:'13',leftShare:59,rightShare:41},
  {label:'Finalizações',left:'113',right:'120',leftShare:48,rightShare:52},
  {label:'xG acumulado',left:'15,38',right:'14,96',leftShare:51,rightShare:49},
  {label:'Jogos sem sofrer gols',left:'2',right:'6',leftShare:25,rightShare:75},
];

const rowMotion={
  hidden:{opacity:0,y:24},
  visible:{opacity:1,y:0,transition:{duration:.48,ease:[.2,.8,.2,1] as const}},
};

export function MatchComparisonCard({className='',activeIndex}:MatchComparisonCardProps){
  return <div className={`comparison-card ${className}`.trim()}>
    <motion.div
      className="team-head"
      variants={rowMotion}
      initial="hidden"
      whileInView="visible"
      viewport={{once:true,amount:.7}}
    >
      <div><img className="team-crest crest-pulse-arg" src="/teams/argentina-afa.svg" alt="Escudo da Seleção Argentina"/><strong>Argentina</strong></div>
      <span aria-hidden="true" className="team-head-x">×</span>
      <div><strong>Espanha</strong><img className="team-crest crest-pulse-esp" src="/teams/spain-national-team.png" alt="Escudo da Seleção Espanhola"/></div>
    </motion.div>
    {comparisonStats.map((stat,index)=><motion.div
      className={`metric ${activeIndex===index?'active':''}`.trim()}
      key={stat.label}
      variants={rowMotion}
      initial="hidden"
      whileInView="visible"
      viewport={{once:true,amount:.72}}
    >
      <b>{stat.left}</b>
      <div>
        <span>{stat.label}</span>
        <i>
          <motion.u
            className="metric-bar-left"
            style={{flexBasis:`${stat.leftShare}%`}}
            initial={{scaleX:0,opacity:.35}}
            whileInView={{scaleX:1,opacity:1}}
            viewport={{once:true,amount:.8}}
            transition={{duration:.7,delay:.08,ease:[.2,.8,.2,1]}}
          />
          <motion.u
            className="metric-bar-right"
            style={{flexBasis:`${stat.rightShare}%`}}
            initial={{scaleX:0,opacity:.35}}
            whileInView={{scaleX:1,opacity:1}}
            viewport={{once:true,amount:.8}}
            transition={{duration:.7,delay:.16,ease:[.2,.8,.2,1]}}
          />
        </i>
      </div>
      <b>{stat.right}</b>
    </motion.div>)}
    <motion.div
      className="comparison-foot"
      variants={rowMotion}
      initial="hidden"
      whileInView="visible"
      viewport={{once:true,amount:.85}}
    >
      <span><TrendUp/> Leitura pré-jogo</span>
      <p>Fonte editorial histórica. A pontuação só é resolvida por snapshot TxLINE verificável.</p>
    </motion.div>
  </div>;
}

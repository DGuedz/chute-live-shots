import React, { useState, useEffect } from 'react';
import { Icon } from '../icons';
import { TeamShield } from './TeamShield';
import type { Insights } from '../types';
import {
  ShieldCheckered,
  Star,
  Target,
  Lightning,
  ArrowsClockwise,
  Crosshair,
  CaretDown,
  Brain,
} from '@phosphor-icons/react';

interface MatchFeedPulsingProps {
  insights: Insights;
  selectedTeam: 'Argentina' | 'Spain';
  onTeamChange: (team: 'Argentina' | 'Spain') => void;
  selectedTier: string;
  onTierSelect: (tier: string) => void;
  onStartQuiz: () => void;
  loading?: boolean;
}

// Get current timestamp for real-time authenticity
function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Render goal stars (identity: Argentina = 3 stars for World Cups)
function renderGoalStars(goals: number, team: 'arg' | 'esp'): string {
  const baseStars = goals >= 10 ? 3 : goals >= 5 ? 2 : 1;
  return '⭐'.repeat(Math.min(baseStars, 3));
}

// Signal card with pulsing animation + trust signals
function SignalCard({ signal, detail, edge, index, player, metric, timestamp }: any) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    // Stagger pulse animation
    const delay = index * 200;
    const timer = setTimeout(() => {
      setIsPulsing(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [index]);

  // Render Phosphor icon by signal type
  const getIconColorClass = (): string => {
    switch (signal) {
      case 'DEFESA':
        return 'signal-icon-defense';
      case 'CRAQUE':
        return 'signal-icon-player';
      case 'MEIO-CAMPO':
        return 'signal-icon-midfield';
      case 'MOMENTUM':
        return 'signal-icon-momentum';
      case 'POSSESSÃO':
        return 'signal-icon-possession';
      case 'FINALIZAÇÕES':
        return 'signal-icon-shots';
      case 'ATAQUE':
        return 'signal-icon-momentum';
      case 'MERCADOS':
        return 'signal-icon-midfield';
      default:
        return 'signal-icon';
    }
  };

  const renderSignalIcon = (): React.ReactNode => {
    const iconProps = { size: 20, weight: 'fill' as const, className: `signal-icon ${getIconColorClass()}` };

    try {
      switch (signal) {
        case 'DEFESA':
          return <ShieldCheckered {...iconProps} aria-label="Defesa" />;
        case 'CRAQUE':
          return <Star {...iconProps} aria-label="Craque" />;
        case 'MEIO-CAMPO':
          return <Target {...iconProps} aria-label="Meio-campo" />;
        case 'MOMENTUM':
          return <Lightning {...iconProps} aria-label="Momentum" />;
        case 'POSSESSÃO':
          return <ArrowsClockwise {...iconProps} aria-label="Possessão" />;
        case 'FINALIZAÇÕES':
          return <Crosshair {...iconProps} aria-label="Finalizações" />;
        case 'ATAQUE':
          return <Lightning {...iconProps} aria-label="Ataque" />;
        case 'MERCADOS':
          return <Target {...iconProps} aria-label="Mercados" />;
        default:
          return <Star {...iconProps} aria-label="Sinal" />;
      }
    } catch (error) {
      console.error('Error rendering icon for signal:', signal, error);
      return null;
    }
  };

  // Authority via player name + metric precision
  const playerDisplay = player ? `${player}` : 'Sistema';
  const metricDisplay = metric ? `${metric} (atualizado ${timestamp || 'agora'})` : '';

  return (
    <div className={`signal-card-feed ${isPulsing ? 'pulse-in' : ''}`}>
      {/* Header: Icon + Signal Type + Authority Badge */}
      <div className="signal-header">
        {renderSignalIcon()}
        <div style={{ flex: 1 }}>
          <span className="signal-name">{signal}</span>
          {player && (
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '8px', display: 'block' }}>
              📊 {playerDisplay}
            </span>
          )}
        </div>
      </div>

      {/* Detail + Metric Precision */}
      <p className="signal-detail">{detail}</p>
      {metricDisplay && (
        <div style={{ fontSize: '12px', color: '#BFFF00', fontWeight: 500 }}>
          {metricDisplay}
        </div>
      )}

      {/* Edge + Social Proof */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(191, 255, 0, 0.1)' }}>
        <div className="signal-edge">
          <span className="edge-label">Vantagem:</span>
          <span className="edge-team">
            {edge === 'equilíbrio' ? '⚖️ EQUILÍBRIO' : `${edge === 'Argentina' ? '🇦🇷' : '🇪🇸'} ${edge.toUpperCase()}`}
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>⏰ {timestamp || getTimestamp()}</span>
      </div>

      <div className="signal-animation">
        <span className="pulse-dot"></span>
      </div>
    </div>
  );
}

// Main component
export function MatchFeedPulsing({
  insights,
  selectedTeam,
  onTeamChange,
  selectedTier,
  onTierSelect,
  onStartQuiz,
  loading = false,
}: MatchFeedPulsingProps) {
  const [showFeed, setShowFeed] = useState(true);

  const argGoals = Number(insights.editorial?.match?.split(' - ')[0]) || 19;
  const espGoals = Number(insights.editorial?.match?.split(' - ')[1]) || 13;
  const goalsTotal = argGoals + espGoals || 1;
  const argShare = Math.round((argGoals / goalsTotal) * 100);
  // Único sinal com leitura de mercado já vem pronto do editorial curado (nunca calculado no cliente).
  const marketSignal = (insights.editorial?.reading || []).find(
    (item: any) => typeof item?.signal === 'string' && item.signal.toLowerCase().includes('mercado'),
  );

  return (
    <section id="match-feed-pulsing" className="match-feed-container">
      {/* ========== HEADER: Premium Match Overview ========== */}
      <div className="feed-header">
        <div className="match-card">
          {/* Team Badges + Score */}
          <div className="match-premium-header">
            <div className="team-section team-arg">
              <div className="team-badge">
                <TeamShield teamName="Argentina" size={48} />
              </div>
              <span className="team-name">Argentina</span>
            </div>

            <div className="score-center">
              <div className="match-score">
                <span className="score-left">{argGoals}</span>
                <span className="score-separator">×</span>
                <span className="score-right">{espGoals}</span>
              </div>
              <div className="match-label">{insights.editorial?.venue || 'Copa 2026'}</div>
            </div>

            <div className="team-section team-esp">
              <div className="team-badge">
                <TeamShield teamName="Spain" size={48} />
              </div>
              <span className="team-name">Espanha</span>
            </div>
          </div>

          {/* Goals Progress Bar */}
          <div className="goals-progress-section">
            <div className="goals-label">GOLS REGISTRADOS</div>
            <div className="progress-bar-container">
              <div className="progress-track">
                <div className="progress-fill-arg" style={{ width: `${argShare}%` }}></div>
                <div className="progress-fill-esp" style={{ width: `${100 - argShare}%` }}></div>
              </div>
            </div>
            <div className="goals-counter">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span className="goals-arg">{argGoals}</span>
                <span style={{ fontSize: '12px', color: 'var(--argentina-primary)' }}>{renderGoalStars(argGoals, 'arg')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span className="goals-esp">{espGoals}</span>
                <span style={{ fontSize: '12px', color: 'var(--spain-primary)' }}>{renderGoalStars(espGoals, 'esp')}</span>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="scroll-indicator">
            <div className="scroll-arrow">
              <CaretDown size={24} weight="fill" color="#BFFF00" />
            </div>
          </div>

        </div>
      </div>

      {/* ========== INSIGHT PREDITIVO: leitura real do mercado, sem número inventado ========== */}
      {marketSignal && (
        <div className="market-insight">
          <div className="market-insight-icon">
            <Brain size={26} weight="fill" />
          </div>
          <div className="market-insight-body">
            <span className="market-insight-kicker">Insight preditivo</span>
            <p>{marketSignal.detail}</p>
          </div>
        </div>
      )}

      {/* ========== CONTROLS: Team & Tier ========== */}
      <div className="feed-controls">
        {/* Step 1: Team */}
        <div className="control-group">
          <label className="control-label">Seu time:</label>
          <div className="team-toggle">
            <button
              className={`team-option ${selectedTeam === 'Argentina' ? 'active' : ''}`}
              onClick={() => onTeamChange('Argentina')}
              type="button"
            >
              <TeamShield teamName="Argentina" size={18} />
              <span>Argentina</span>
            </button>
            <button
              className={`team-option ${selectedTeam === 'Spain' ? 'active' : ''}`}
              onClick={() => onTeamChange('Spain')}
              type="button"
            >
              <TeamShield teamName="Spain" size={18} />
              <span>Espanha</span>
            </button>
          </div>
        </div>

        {/* Step 2: Tier */}
        <div className="control-group">
          <label className="control-label">Aposte em:</label>
          <div className="tier-options">
            {[
              { id: 'gols', name: 'Gols', icon: '⚽' },
              { id: 'escanteios', name: 'Escanteios', icon: '🚩' },
              { id: 'cartoes', name: 'Cartões', icon: '🟨' },
            ].map((tier) => (
              <button
                key={tier.id}
                className={`tier-option ${selectedTier === tier.id ? 'active' : ''}`}
                onClick={() => onTierSelect(tier.id)}
                type="button"
              >
                <span className="tier-icon">{tier.icon}</span>
                <span className="tier-name">{tier.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========== FEED: Pulsing Signals + Trust Indicators ========== */}
      <div className="feed-section">
        <div className="feed-title">
          <h3>📊 Sinais em Tempo Real</h3>
          <span className="feed-badge">ao vivo</span>
        </div>

        {showFeed && insights.editorial?.reading && (
          <div className="signals-feed">
            {insights.editorial.reading
              .filter((signal: any) => signal !== marketSignal)
              .slice(0, 5)
              .map((signal: any, index: number) => (
                <SignalCard
                  key={`${signal.signal}-${index}`}
                  signal={signal.signal}
                  detail={signal.detail}
                  edge={signal.edge}
                  index={index}
                />
              ))}
          </div>
        )}

        {/* Tournament Stats as Secondary Feed + Verified Data */}
        {insights.tournament?.player_stats && (
          <div className="feed-subsection">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4>🏆 Destaques Verificados</h4>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>✓ Dados oficiais</span>
            </div>
            <div className="players-feed">
              {insights.tournament.player_stats.slice(0, 3).map((player: any, idx: number) => (
                <div key={`${player.player}-${idx}`} className={`player-card fade-in-${idx}`}>
                  <div className="player-avatar">
                    {player.team === 'Argentina' ? '🇦🇷' : '🇪🇸'}
                  </div>
                  <div className="player-info">
                    <strong>{player.player}</strong>
                    <span className="player-team">
                      {player.team}
                      <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.6 }}>
                        #{idx + 1} ranking
                      </span>
                    </span>
                  </div>
                  <div className="player-stats">
                    <div className="stat" title="Gols no torneio">
                      <span className="icon">⚽</span>
                      <span>{player.goals}</span>
                    </div>
                    <div className="stat" title="Assistências no torneio">
                      <span className="icon">🎯</span>
                      <span>{player.assists}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========== CTA: Start Quiz + Trust Signals ========== */}
      <div className="feed-footer">
        <button
          className="btn-start-quiz-premium"
          onClick={onStartQuiz}
          disabled={loading || !selectedTeam || !selectedTier}
          type="button"
        >
          <span className="btn-icon">⚡</span>
          <span className="btn-text">{loading ? 'Carregando…' : 'Fazer meu chute'}</span>
        </button>
        <p className="btn-subtext">
          5 perguntas preditivas · ~2 min · resultado confirmado ao vivo via TxLINE · prova na Solana
        </p>
      </div>
    </section>
  );
}

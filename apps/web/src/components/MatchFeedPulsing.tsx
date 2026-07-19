import React, { useState, useEffect } from 'react';
import { Icon } from '../icons';
import type { Insights } from '../types';
import {
  ShieldCheckered,
  Star,
  Target,
  Lightning,
  Repeat,
  Crosshair,
  Scale,
  Trophy,
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

// Polished flag and shield components
function CountryFlag({ country, size = 24 }: { country: string; size?: number }) {
  const flags: Record<string, string> = {
    Argentina: '🇦🇷',
    Spain: '🇪🇸',
  };
  return (
    <span style={{ fontSize: `${size}px`, display: 'inline-flex', alignItems: 'center' }}>
      {flags[country] || '⚽'}
    </span>
  );
}

function CountryShield({ country }: { country: string }) {
  const shields: Record<string, string> = {
    Argentina: '🛡️',
    Spain: '⚔️',
  };
  return <span style={{ fontSize: '20px' }}>{shields[country] || '⚽'}</span>;
}

// Render premium signal icon with Phosphor
function renderSignalIcon(signal: string): React.ReactNode {
  const iconProps = { size: 20, weight: 'fill' as const };

  switch (signal) {
    case 'DEFESA':
      return (
        <ShieldCheckered
          {...iconProps}
          className="signal-icon signal-icon-defense"
          aria-label="Defesa"
        />
      );
    case 'CRAQUE':
      return (
        <Star
          {...iconProps}
          className="signal-icon signal-icon-player"
          aria-label="Craque"
        />
      );
    case 'MEIO-CAMPO':
      return (
        <Target
          {...iconProps}
          className="signal-icon signal-icon-midfield"
          aria-label="Meio-campo"
        />
      );
    case 'MOMENTUM':
      return (
        <Lightning
          {...iconProps}
          className="signal-icon signal-icon-momentum"
          aria-label="Momentum"
        />
      );
    case 'POSSESSÃO':
      return (
        <Repeat
          {...iconProps}
          className="signal-icon signal-icon-possession"
          aria-label="Possessão"
        />
      );
    case 'FINALIZAÇÕES':
      return (
        <Crosshair
          {...iconProps}
          className="signal-icon signal-icon-shots"
          aria-label="Finalizações"
        />
      );
    default:
      return (
        <Trophy
          {...iconProps}
          className="signal-icon"
          aria-label="Sinal"
        />
      );
  }
}

// Signal card with pulsing animation
function SignalCard({ signal, detail, edge, index }: any) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    // Stagger pulse animation
    const delay = index * 200;
    const timer = setTimeout(() => {
      setIsPulsing(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div className={`signal-card-feed ${isPulsing ? 'pulse-in' : ''}`}>
      <div className="signal-header">
        <span className="signal-emoji">{renderSignalIcon(signal)}</span>
        <span className="signal-name">{signal}</span>
      </div>

      <p className="signal-detail">{detail}</p>

      <div className="signal-edge">
        <span className="edge-label">Vantagem:</span>
        <span className="edge-team">
          {edge === 'equilíbrio' ? (
            <>
              <Scale
                size={14}
                weight="fill"
                className="edge-icon"
                aria-label="Equilíbrio"
              />
              <span>EQUILÍBRIO</span>
            </>
          ) : (
            <>
              <CountryFlag country={edge === 'Argentina' ? 'Argentina' : 'Spain'} size={14} />
              <span>{edge.toUpperCase()}</span>
            </>
          )}
        </span>
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

  return (
    <section id="match-feed-pulsing" className="match-feed-container">
      {/* ========== HEADER: Match Overview ========== */}
      <div className="feed-header">
        <div className="match-card">
          <div className="match-teams">
            <div className="team-bubble arg">
              <CountryFlag country="Argentina" size={32} />
              <span className="team-label">Argentina</span>
            </div>

            <div className="match-separator">
              <div className="match-time">
                {insights.editorial?.match || '0 - 0'}
              </div>
              <div className="match-venue">
                {insights.editorial?.venue || 'Copa 2026'}
              </div>
            </div>

            <div className="team-bubble esp">
              <CountryFlag country="Spain" size={32} />
              <span className="team-label">Espanha</span>
            </div>
          </div>

          {/* Quick Stats Row */}
          {insights.tournament?.team_stats && (
            <div className="stats-row">
              {insights.tournament.team_stats.slice(0, 2).map((stat: any) => (
                <div key={stat.team} className="stat-bubble">
                  <span className="stat-value">{stat.goals}</span>
                  <span className="stat-unit">gols</span>
                </div>
              ))}
              <span className="stats-divider">·</span>
              {insights.tournament.team_stats.slice(2, 4).map((stat: any) => (
                <div key={stat.team} className="stat-bubble">
                  <span className="stat-value">{stat.goals}</span>
                  <span className="stat-unit">gols</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
              <CountryFlag country="Argentina" size={18} />
              <span>Argentina</span>
            </button>
            <button
              className={`team-option ${selectedTeam === 'Spain' ? 'active' : ''}`}
              onClick={() => onTeamChange('Spain')}
              type="button"
            >
              <CountryFlag country="Spain" size={18} />
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

      {/* ========== FEED: Pulsing Signals ========== */}
      <div className="feed-section">
        <div className="feed-title">
          <h3>Sinais Pré-Jogo</h3>
          <span className="feed-badge">ao vivo</span>
        </div>

        {showFeed && insights.editorial?.reading && (
          <div className="signals-feed">
            {insights.editorial.reading.slice(0, 5).map((signal: any, index: number) => (
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

        {/* Tournament Stats as Secondary Feed */}
        {insights.tournament?.player_stats && (
          <div className="feed-subsection">
            <h4>Top Jogadores</h4>
            <div className="players-feed">
              {insights.tournament.player_stats.slice(0, 3).map((player: any, idx: number) => (
                <div key={`${player.player}-${idx}`} className={`player-card fade-in-${idx}`}>
                  <div className="player-avatar">
                    {player.team === 'Argentina' ? '🇦🇷' : '🇪🇸'}
                  </div>
                  <div className="player-info">
                    <strong>{player.player}</strong>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stats">
                    <div className="stat">
                      <span className="icon">⚽</span>
                      <span>{player.goals}</span>
                    </div>
                    <div className="stat">
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

      {/* ========== CTA: Start Quiz ========== */}
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
        <p className="btn-subtext">5 perguntas · ~2 min · Resultado na Solana</p>
      </div>
    </section>
  );
}

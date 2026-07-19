import React, { useState } from 'react';
import { TeamMark, Icon } from '../icons';
import type { Insights } from '../types';

interface MatchFlowSimplifiedProps {
  insights: Insights;
  selectedTeam: 'Argentina' | 'Spain';
  onTeamChange: (team: 'Argentina' | 'Spain') => void;
  selectedTier: string;
  onTierSelect: (tier: string) => void;
  onStartQuiz: () => void;
  loading?: boolean;
}

export function MatchFlowSimplified({
  insights,
  selectedTeam,
  onTeamChange,
  selectedTier,
  onTierSelect,
  onStartQuiz,
  loading = false,
}: MatchFlowSimplifiedProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section id="match-flow-simplified" className="match-flow">
      {/* ========== STEP 1: Match Summary ========== */}
      <div className="flow-card match-summary">
        <p className="eyebrow">AO VIVO · TXLINE</p>

        {/* Match Header */}
        <div className="match-header">
          <div className="team-col">
            <TeamMark team="Argentina" size={32} />
            <span className="team-name">Argentina</span>
          </div>
          <div className="match-info">
            <div className="score">
              {insights.editorial?.match || 'Carregando...'}
            </div>
            <p className="match-time">
              {insights.editorial?.venue || 'Copa do Mundo 2026'}
            </p>
          </div>
          <div className="team-col">
            <TeamMark team="Spain" size={32} />
            <span className="team-name">Espanha</span>
          </div>
        </div>

        {/* Quick Stats */}
        {insights.tournament?.team_stats && (
          <div className="quick-stats">
            {insights.tournament.team_stats.slice(0, 2).map((stat: any) => (
              <div key={stat.team} className="stat-mini">
                <strong>{stat.goals}</strong>
                <span className="stat-label">gols</span>
              </div>
            ))}
            <div className="stat-divider">vs</div>
            {insights.tournament.team_stats.slice(2, 4).map((stat: any) => (
              <div key={stat.team} className="stat-mini">
                <strong>{stat.goals}</strong>
                <span className="stat-label">gols</span>
              </div>
            ))}
          </div>
        )}

        {/* Toggle Details */}
        <button
          className="toggle-details"
          onClick={() => setShowDetails(!showDetails)}
          type="button"
        >
          {showDetails ? 'Esconder detalhes' : 'Ver mais dados'}
          <span>{showDetails ? '▲' : '▼'}</span>
        </button>

        {/* Expandable Details */}
        {showDetails && (
          <div className="details-expand">
            {insights.editorial?.reading && (
              <div>
                <p className="eyebrow-small">SINAIS DA PARTIDA</p>
                <div className="signal-list-mini">
                  {insights.editorial.reading.slice(0, 3).map((reading: any) => (
                    <div key={reading.signal} className="signal-mini">
                      <span className="signal-icon">
                        <Icon name="zap" size={14} />
                      </span>
                      <span className="signal-text">{reading.signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== STEP 2: Choose Team ========== */}
      <div className="flow-card team-choice">
        <p className="eyebrow">1. ESCOLHA SEU TIME</p>
        <div className="team-selector-flow">
          <button
            className={`team-btn ${selectedTeam === 'Argentina' ? 'active' : ''}`}
            onClick={() => onTeamChange('Argentina')}
            disabled={loading}
            type="button"
          >
            <TeamMark team="Argentina" size={24} />
            <span>Argentina</span>
          </button>
          <button
            className={`team-btn ${selectedTeam === 'Spain' ? 'active' : ''}`}
            onClick={() => onTeamChange('Spain')}
            disabled={loading}
            type="button"
          >
            <TeamMark team="Spain" size={24} />
            <span>Espanha</span>
          </button>
        </div>
        <p className="team-help">Você palpita sobre qual time terá a ação que escolher</p>
      </div>

      {/* ========== STEP 3: Choose Tier ========== */}
      <div className="flow-card tier-choice">
        <p className="eyebrow">2. ESCOLHA O QUE PALPITAR</p>
        <div className="tier-selector-flow">
          {(insights.tiers || []).map((tier: any) => {
            const tierNames: Record<string, { label: string; emoji: string; desc: string }> =
              {
                gols: { label: '⚽ Gols', emoji: '⚽', desc: 'Quantos gols marcará?' },
                escanteios: { label: '🚩 Escanteios', emoji: '🚩', desc: 'Escanteios e tiros livres' },
                cartoes: { label: '🟨 Cartões', emoji: '🟨', desc: 'Cartões amarelos/vermelhos' },
              };

            const tierInfo = tierNames[tier.id] || { label: tier.label, emoji: '⚽', desc: '' };

            return (
              <button
                key={tier.id}
                className={`tier-btn ${selectedTier === tier.id ? 'active' : ''} ${!tier.available ? 'locked' : ''}`}
                onClick={() => onTierSelect(tier.id)}
                disabled={!tier.available || loading}
                type="button"
              >
                <span className="tier-emoji">{tierInfo.emoji}</span>
                <span className="tier-name">{tierInfo.label}</span>
                {!tier.available && <span className="tier-lock">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========== CTA: Start Quiz ========== */}
      <div className="flow-cta">
        <button
          className="btn-start-quiz"
          onClick={onStartQuiz}
          disabled={loading || !selectedTeam || !selectedTier}
          type="button"
        >
          {loading ? 'Carregando…' : '⚡ Fazer meu chute'}
        </button>
        <p className="cta-subtext">5 perguntas · ~2 minutos · Resultado prova na Solana</p>
      </div>
    </section>
  );
}

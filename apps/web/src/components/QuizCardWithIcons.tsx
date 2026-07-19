import React from 'react';
import { Icon } from '../icons';

interface QuizCardIconsProps {
  title: string;
  description: string;
  tier: 'gols' | 'escanteios' | 'cartoes';
  available: boolean;
  questions: number;
}

/**
 * Example: Quiz Card Component using Neo Arcade Icon System
 * Shows how to integrate Tabler + Phosphor icons with the design system
 */
export const QuizCardWithIcons: React.FC<QuizCardIconsProps> = ({
  title,
  description,
  tier,
  available,
  questions,
}) => {
  // Map tier to icon
  const tierIcons = {
    gols: 'goal',
    escanteios: 'corner',
    cartoes: 'card',
  };

  const tierColors = {
    gols: 'lime',
    escanteios: 'orange',
    cartoes: 'neonGreen',
  } as const;

  return (
    <div className="bg-neo-bg-card border-2 border-neo-lime rounded-sm p-6 hover:border-neo-orange transition-all">
      {/* Header with Icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neo-navy rounded">
            <Icon
              name={tierIcons[tier]}
              size={24}
              color={tierColors[tier]}
            />
          </div>
          <div>
            <h3 className="text-neo-white font-black text-lg">{title}</h3>
            <p className="text-neo-blue-gray text-sm">{description}</p>
          </div>
        </div>
        {available ? (
          <div className="flex items-center gap-1 bg-neo-lime text-neo-navy px-2 py-1 rounded text-xs font-bold">
            <Icon name="checkmark" size={14} color="inherit" />
            DISPONÍVEL
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-neo-surface text-neo-blue-gray px-2 py-1 rounded text-xs font-bold">
            <Icon name="loading" size={14} color="inherit" />
            BLOQUEADO
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Questions count */}
        <div className="flex items-center gap-2 text-neo-white">
          <Icon name="stats" size={18} color="neonGreen" />
          <span className="text-sm">{questions} perguntas</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            className="flex-1 flex items-center justify-center gap-2 bg-neo-orange text-neo-navy font-bold py-2 rounded hover:bg-orange-600 transition-all"
            disabled={!available}
          >
            <Icon name="play" size={16} color="inherit" />
            COMEÇAR
          </button>
          <button className="flex items-center justify-center gap-2 border-2 border-neo-lime text-neo-lime font-bold px-4 py-2 rounded hover:bg-neo-lime hover:text-neo-navy transition-all">
            <Icon name="info" size={16} color="inherit" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Example: Mini Icon Button Component
 * Compact icon buttons for header/toolbar
 */
export const IconButton: React.FC<{
  icon: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
}> = ({ icon, label, variant = 'primary', onClick }) => {
  const variantStyles = {
    primary: 'text-neo-lime hover:bg-neo-lime hover:text-neo-navy',
    secondary: 'text-neo-white hover:bg-neo-white hover:text-neo-navy',
    danger: 'text-neo-orange hover:bg-neo-orange hover:text-neo-white',
  };

  return (
    <button
      onClick={onClick}
      className={`icon-button flex items-center gap-2 px-3 py-2 rounded border-2 transition-all ${variantStyles[variant]}`}
      title={label}
    >
      <Icon name={icon} size={20} color="inherit" />
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
};

/**
 * Example: Stats Row with Icons
 * Shows score, rank, accuracy with icons
 */
export const StatsRowWithIcons: React.FC<{
  score: number;
  rank: number;
  accuracy: number;
}> = ({ score, rank, accuracy }) => {
  return (
    <div className="flex gap-6 bg-neo-bg-card border-2 border-neo-lime rounded-sm p-4">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neo-navy rounded">
          <Icon name="trophy" size={24} color="lime" />
        </div>
        <div>
          <p className="text-neo-blue-gray text-xs font-bold">SCORE</p>
          <p className="text-neo-lime text-xl font-black">{score}</p>
        </div>
      </div>

      {/* Rank */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neo-navy rounded">
          <Icon name="rank" size={24} color="orange" />
        </div>
        <div>
          <p className="text-neo-blue-gray text-xs font-bold">RANKING</p>
          <p className="text-neo-orange text-xl font-black">#{rank}</p>
        </div>
      </div>

      {/* Accuracy */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neo-navy rounded">
          <Icon name="checkmark" size={24} color="neonGreen" />
        </div>
        <div>
          <p className="text-neo-blue-gray text-xs font-bold">ACERTOS</p>
          <p className="text-neo-neon-green text-xl font-black">{accuracy}%</p>
        </div>
      </div>
    </div>
  );
};

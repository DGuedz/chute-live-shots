import React from 'react';

/**
 * Placeholder para logo da Solana
 * Espaço reservado para inserção futura
 */
export const SolanaLogoBrand: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <div
    className="flex items-center justify-center rounded border-2 border-dashed border-neo-lime bg-neo-navy"
    style={{ width: size, height: size }}
    title="Solana Logo - Espaço reservado"
  >
    <span className="text-neo-lime font-bold text-xs">SOL</span>
  </div>
);

/**
 * Placeholder para logo do TxLINE
 * Espaço reservado para inserção futura
 */
export const TxLINELogoBrand: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <div
    className="flex items-center justify-center rounded border-2 border-dashed border-neo-orange bg-neo-navy"
    style={{ width: size, height: size }}
    title="TxLINE Logo - Espaço reservado"
  >
    <span className="text-neo-orange font-bold text-xs">TX</span>
  </div>
);

/**
 * Logo Badge Component
 * Exibe logos com labels para footer/header
 */
export const LogoBadge: React.FC<{
  name: 'solana' | 'txline';
  showLabel?: boolean;
}> = ({ name, showLabel = true }) => {
  const issolana = name === 'solana';

  return (
    <div className="flex items-center gap-2">
      {issolana ? (
        <SolanaLogoBrand size={24} />
      ) : (
        <TxLINELogoBrand size={24} />
      )}
      {showLabel && (
        <span className={`text-xs font-bold ${issolana ? 'text-neo-white' : 'text-neo-orange'}`}>
          {issolana ? 'SOLANA' : 'TXLINE'}
        </span>
      )}
    </div>
  );
};

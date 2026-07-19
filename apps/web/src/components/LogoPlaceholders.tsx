import React from 'react';

// Logos oficiais servidos de /public/brands:
// - Solana: solana.com/branding (logomark gradiente + wordmark)
// - Phantom: kit oficial de integração (docs.phantom.com/resources/assets)
// - TxLINE: repo oficial txodds/tx-on-chain (assets/logo, variante para fundo escuro)

export const SolanaLogoBrand: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <img src="/brands/solana-logomark.svg" alt="Solana" style={{ width: size, height: 'auto' }} />
);

export const SolanaWordmark: React.FC<{ height?: number }> = ({ height = 16 }) => (
  <img src="/brands/solana-wordmark.svg" alt="Solana" style={{ height, width: 'auto' }} />
);

export const TxLINELogoBrand: React.FC<{ height?: number }> = ({ height = 14 }) => (
  <img src="/brands/txline-dark.svg" alt="TxLINE by TxODDS" style={{ height, width: 'auto' }} />
);

export const PhantomIcon: React.FC<{ size?: number; variant?: 'purple' | 'white' }> = ({ size = 18, variant = 'purple' }) => (
  <img src={`/brands/phantom-icon-${variant}.svg`} alt="Phantom" style={{ width: size, height: size }} />
);

export const LogoBadge: React.FC<{
  name: 'solana' | 'txline';
  showLabel?: boolean;
}> = ({ name }) =>
  name === 'solana' ? <SolanaWordmark height={14} /> : <TxLINELogoBrand height={14} />;

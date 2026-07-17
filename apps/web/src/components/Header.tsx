import React from 'react';
import { Icon } from '../icons';
import { SolanaLogoBrand, TxLINELogoBrand } from './LogoPlaceholders';

interface HeaderProps {
  wallet?: string;
  network?: 'devnet' | 'mainnet';
  onMenuClick?: () => void;
  onWalletClick?: () => void;
  onSettingsClick?: () => void;
  loading?: boolean;
}

/**
 * Header do CHUTE com ícones Neo Arcade e placeholders de logo
 */
export const Header: React.FC<HeaderProps> = ({
  wallet,
  network = 'devnet',
  onMenuClick,
  onWalletClick,
  onSettingsClick,
  loading,
}) => {
  const shortWallet = wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : '';

  return (
    <header style={{ backgroundColor: 'var(--neo-bg-dark)', borderBottom: '2px solid var(--neo-lime)' }} className="flex items-center justify-between px-4 py-4">
      {/* Left: Logo + Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:text-neo-lime transition-colors"
          aria-label="Menu"
        >
          <Icon name="menu" size={24} color="lime" />
        </button>
        <img
          src="/chute-live-shots-logo.svg"
          alt="CHUTE LIVE SHOTS"
          className="h-10 w-auto"
        />
      </div>

      {/* Center: Network Badge */}
      <div style={{ backgroundColor: 'var(--neo-navy)', borderColor: 'var(--neo-orange)', color: 'var(--neo-orange)' }} className="flex items-center gap-2 px-3 py-1 rounded border-2">
        <div style={{ backgroundColor: 'var(--neo-orange)' }} className="w-2 h-2 rounded-full animate-pulse" />
        <span className="text-xs font-bold">{network.toUpperCase()}</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* TxLINE Badge (Placeholder) */}
        <button
          onClick={onSettingsClick}
          style={{ borderColor: 'var(--neo-lime)', color: 'var(--neo-white)' }}
          className="flex items-center gap-2 px-3 py-2 rounded border-2 hover:text-neo-navy transition-all"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--neo-lime)'; e.currentTarget.style.color = 'var(--neo-navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--neo-white)'; }}
          title="TxLINE Setup"
        >
          <TxLINELogoBrand size={18} />
          <span className="text-xs font-bold hidden sm:inline">TXLINE</span>
        </button>

        {/* Wallet Button */}
        <button
          onClick={onWalletClick}
          disabled={loading}
          style={{ borderColor: 'var(--neo-lime)', color: 'var(--neo-white)' }}
          className="flex items-center gap-2 px-3 py-2 rounded border-2 hover:text-neo-navy transition-all disabled:opacity-50"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--neo-lime)'; e.currentTarget.style.color = 'var(--neo-navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--neo-white)'; }}
          title={wallet ? `Desconectar ${shortWallet}` : 'Conectar Phantom'}
        >
          <Icon name="wallet" size={18} color="inherit" />
          <span className="text-xs font-bold hidden sm:inline">
            {loading ? 'Conectando…' : wallet ? shortWallet : 'Phantom'}
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;

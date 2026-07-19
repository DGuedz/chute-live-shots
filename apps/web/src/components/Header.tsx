import React from 'react';
import {PhantomIcon, TxLINELogoBrand} from './LogoPlaceholders';

interface HeaderProps {
  wallet?: string;
  network?: 'devnet' | 'mainnet';
  homeHref?: string;
  setupHref?: string;
  onHomeClick?: (event?: React.MouseEvent) => void;
  onWalletClick?: () => void;
  onSettingsClick?: (event?: React.MouseEvent) => void;
  loading?: boolean;
}

// Header interno do app no mesmo padrão da nav da home (web-site.css).
export const Header: React.FC<HeaderProps> = ({
  wallet,
  network = 'mainnet',
  homeHref = '/',
  setupHref = '/setup',
  onHomeClick,
  onWalletClick,
  onSettingsClick,
  loading,
}) => {
  const shortWallet = wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : '';

  return (
    <header className="web-nav app-nav">
      <a className="web-brand" href={homeHref} onClick={onHomeClick} aria-label="CHUTE — início">
        <span>CHUTE</span>
      </a>
      <div className="app-nav-status">
        <span className="app-network"><i />{network.toUpperCase()}</span>
        <a className="app-txline" href={setupHref} onClick={onSettingsClick} title="TxLINE Setup"><TxLINELogoBrand height={12} /></a>
      </div>
      <button className="wallet-button" onClick={onWalletClick} disabled={loading}>
        <PhantomIcon size={18} variant="purple" />
        <span>{loading ? 'Conectando…' : wallet ? shortWallet : 'Conectar carteira'}</span>
      </button>
    </header>
  );
};

export default Header;

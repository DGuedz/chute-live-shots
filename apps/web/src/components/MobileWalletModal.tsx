import {APP_ENV} from '../env';
import {QRCodeSVG} from 'qrcode.react';

type MobileWalletModalProps={
  onClose:()=>void;
  targetPath?: string;
  network?: 'devnet'|'mainnet';
};

export function MobileWalletModal({onClose,targetPath='/setup',network='mainnet'}:MobileWalletModalProps){
  const appUrl=new URL(targetPath,`${APP_ENV.publicAppUrl}/`);
  const phantomUrl=`https://phantom.app/ul/browse/${encodeURIComponent(appUrl.toString())}?ref=${encodeURIComponent(window.location.origin)}`;
  return <div className="mobile-wallet-backdrop" role="presentation" onClick={onClose}>
    <section className="mobile-wallet-modal" role="dialog" aria-modal="true" aria-labelledby="mobile-wallet-title" onClick={event=>event.stopPropagation()}>
      <button className="mobile-wallet-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
      <span className="web-kicker"><i/> PHANTOM MOBILE · {network.toUpperCase()}</span>
      <h2 id="mobile-wallet-title">Escaneie com<br/>seu celular.</h2>
      <p>O CHUTE será aberto dentro da Phantom. Mac e celular precisam estar na mesma rede Wi‑Fi.</p>
      <a className="mobile-wallet-qr" href={phantomUrl} target="_blank" rel="noreferrer" aria-label="Abrir CHUTE na Phantom">
        <QRCodeSVG value={phantomUrl} size={220} level="M" bgColor="#f4f6ef" fgColor="#080b09" marginSize={2}/>
      </a>
      <ol>
        <li>Leia o QR com a câmera do celular.</li>
        <li>Abra o link na Phantom.</li>
        <li>Toque em conectar e assine em Devnet.</li>
      </ol>
      <a className="mobile-wallet-open" href={phantomUrl} target="_blank" rel="noreferrer">Abrir na Phantom <span>→</span></a>
      <p className="mobile-wallet-url">Ou digite no navegador da Phantom:<br/><code>{appUrl.host}</code></p>
      <small>Não use seu SOL da Mainnet. O teste utiliza SOL Devnet gratuito.</small>
    </section>
  </div>;
}

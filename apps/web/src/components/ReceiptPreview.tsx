import {ArrowUpRight} from '@phosphor-icons/react';

type ReceiptPreviewProps = {
  network: 'devnet' | 'mainnet';
  wallet: string;
  onViewReceipts: () => void;
  t: {
    receiptTitle: string;
    receiptConfirmed: string;
    receiptWallet: string;
    receiptWalletOff: string;
    receiptSnapshot: string;
    receiptWaiting: string;
    receiptNetwork: string;
    receiptCta: string;
    receiptNote: string;
  };
};

export function ReceiptPreview({network, wallet, onViewReceipts, t}: ReceiptPreviewProps) {
  const shortWallet = wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : t.receiptWalletOff;

  // Prévia ilustrativa: todos os chutes começam pendentes — o placar real só existe
  // depois que o jogo confirma cada previsão via sinal ao vivo (ver tela de resultado real).
  const chutes = [
    {id: 1, status: 'pending', label: 'Chute 1'},
    {id: 2, status: 'pending', label: 'Chute 2'},
    {id: 3, status: 'pending', label: 'Chute 3'},
    {id: 4, status: 'pending', label: 'Chute 4'},
    {id: 5, status: 'pending', label: 'Chute 5'},
  ];

  return (
    <div className="receipt-preview" data-reveal>
      <div className="receipt-top">
        <span>{t.receiptTitle}</span>
        <span className="status-dot">{network.toUpperCase()}</span>
      </div>

      <div className="receipt-score">
        <small>ARGENTINA × ESPAÑA</small>
        <strong>— <span>PTS</span></strong>
        <p>{t.receiptConfirmed}</p>
      </div>

      {/* Live chutes tracking */}
      <div className="receipt-chutes">
        <span className="chutes-label">Acompanhamento ao vivo</span>
        <div className="chutes-grid">
          {chutes.map((chute) => (
            <div key={chute.id} className={`chute-indicator chute-${chute.status}`}>
              <div className="chute-dot" />
              <span>{chute.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="receipt-data">
        <p>
          <span>{t.receiptWallet}</span>
          <b>{wallet ? shortWallet : t.receiptWalletOff}</b>
        </p>
        <p>
          <span>{t.receiptSnapshot}</span>
          <b>{t.receiptWaiting}</b>
        </p>
        <p>
          <span>{t.receiptNetwork}</span>
          <b>{network} · paper</b>
        </p>
      </div>

      <button onClick={onViewReceipts}>
        {t.receiptCta}
        <ArrowUpRight />
      </button>

      <small className="receipt-note">{t.receiptNote}</small>
    </div>
  );
}

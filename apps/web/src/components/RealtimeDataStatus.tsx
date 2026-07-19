import React from 'react';

interface RealtimeDataStatusProps {
  isConnected: boolean;
  lastUpdated?: Date;
}

export function RealtimeDataStatus({ isConnected, lastUpdated }: RealtimeDataStatusProps) {
  return (
    <div className="realtime-data-status">
      {/* Minimal Status Indicator */}
      <div className="status-container">
        <div className="status-pulse">
          <div className={`pulse-dot ${isConnected ? 'live' : 'offline'}`}></div>
          <span className="status-text">
            {isConnected ? 'Dados ao vivo' : 'Conectando...'}
          </span>
        </div>

        {isConnected && (
          <div className="status-badge">
            <span className="check-mark">✓</span>
            <span className="badge-text">Sincronizado</span>
          </div>
        )}
      </div>

      {/* Optional: Last Update Time (minimal) */}
      {lastUpdated && isConnected && (
        <div className="last-update">
          Atualizado agora
        </div>
      )}
    </div>
  );
}

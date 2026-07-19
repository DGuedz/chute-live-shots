import React from 'react';

type TeamShieldProps = {
  teamName: string;
  size?: number;
  promotional?: boolean;
};

const SHIELD_MAP: Record<string, string> = {
  'Argentina': '/teams/argentina-afa.svg',
  'Spain': '/teams/spain-national-team.png',
  'ARG': '/teams/argentina-afa.svg',
  'ESP': '/teams/spain-national-team.png',
};

export function TeamShield({ teamName, size = 20, promotional = false }: TeamShieldProps) {
  const shieldUrl = SHIELD_MAP[teamName] || SHIELD_MAP[teamName.slice(0, 3)] || '';

  if (promotional) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size + 6,
          height: size + 6,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(200, 240, 0, 0.15) 0%, rgba(200, 240, 0, 0.05) 100%)',
          border: '1.5px solid rgba(200, 240, 0, 0.4)',
          boxShadow: '0 0 12px rgba(200, 240, 0, 0.2), inset 0 0 8px rgba(200, 240, 0, 0.1)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {shieldUrl && (
          <img
            src={shieldUrl}
            alt={teamName}
            style={{
              width: size - 2,
              height: size - 2,
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {shieldUrl && (
        <img
          src={shieldUrl}
          alt={teamName}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
          }}
        />
      )}
    </div>
  );
}

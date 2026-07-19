import React from 'react';

type TeamShieldProps = {
  teamName: string;
  size?: number;
};

const SHIELD_MAP: Record<string, string> = {
  'argentina': '/teams/argentina-afa.svg',
  'arg': '/teams/argentina-afa.svg',
  'spain': '/teams/spain-national-team.png',
  'esp': '/teams/spain-national-team.png',
};

export function TeamShield({ teamName, size = 20 }: TeamShieldProps) {
  if (!teamName) return null;

  const normalized = teamName.trim().toLowerCase();
  let shieldUrl = SHIELD_MAP[normalized];

  // Try 3-letter code if exact match fails
  if (!shieldUrl && normalized.length >= 3) {
    shieldUrl = SHIELD_MAP[normalized.slice(0, 3)];
  }

  if (!shieldUrl) {
    console.warn(`[TeamShield] No shield found for: "${teamName}" (normalized: "${normalized}")`);
    // Render a placeholder to show the component is rendering
    return (
      <div
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: '2px',
          verticalAlign: 'middle',
          marginRight: '2px',
        }}
        title={`No shield for: ${teamName}`}
      />
    );
  }

  return (
    <img
      src={shieldUrl}
      alt={teamName}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      onError={(e) => {
        console.error(`[TeamShield] Failed to load: ${shieldUrl}`);
        (e.target as HTMLImageElement).style.border = '1px solid red';
      }}
    />
  );
}

import React from 'react';

type TeamShieldProps = {
  teamName: string;
  size?: number;
};

const SHIELD_MAP: Record<string, string> = {
  'argentina': '/teams/argentina-afa.svg',
  'Argentina': '/teams/argentina-afa.svg',
  'arg': '/teams/argentina-afa.svg',
  'ARG': '/teams/argentina-afa.svg',
  'spain': '/teams/spain-national-team.png',
  'Spain': '/teams/spain-national-team.png',
  'esp': '/teams/spain-national-team.png',
  'ESP': '/teams/spain-national-team.png',
};

export function TeamShield({ teamName, size = 20 }: TeamShieldProps) {
  if (!teamName) return null;

  const trimmed = teamName.trim();
  let shieldUrl = SHIELD_MAP[trimmed];

  // Try lowercase if exact match fails
  if (!shieldUrl) {
    shieldUrl = SHIELD_MAP[trimmed.toLowerCase()];
  }

  // Try 3-letter code if still not found
  if (!shieldUrl && trimmed.length >= 3) {
    shieldUrl = SHIELD_MAP[trimmed.slice(0, 3)];
  }

  if (!shieldUrl) {
    console.warn(`[TeamShield] No shield found for: "${teamName}"`);
    return null;
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

import React from 'react';
import { Shield } from 'tabler-icons-react';

type TeamShieldProps = {
  teamName: string;
  size?: number;
  color?: string;
};

export function TeamShield({ teamName, size = 16, color = '#000' }: TeamShieldProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Shield size={size} color={color} strokeWidth={1.5} />
      <span style={{ fontSize: '11px', fontWeight: '600', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {teamName.slice(0, 3)}
      </span>
    </div>
  );
}

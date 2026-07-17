import React from 'react';
import * as TablerIcons from 'tabler-icons-react';
import * as PhosphorIcons from '@phosphor-icons/react';

/* Neo Arcade Football color palette */
export const NEO_ARCADE_COLORS = {
  navy: '#031330',
  lime: '#C8F000',
  orange: '#FF5A00',
  white: '#F8F8F3',
  neonGreen: '#A7D900',
  electricYellow: '#E7FF00',
  blueGray: '#4D5870',
} as const;

export type IconSize = 12 | 14 | 16 | 18 | 20 | 24 | 32 | 40 | 48 | number;
export type IconColor = keyof typeof NEO_ARCADE_COLORS | 'inherit';
export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill';

interface IconProps {
  name: string;
  size?: IconSize;
  color?: IconColor;
  weight?: IconWeight;
  className?: string;
  strokeWidth?: number;
}

/* Icon registry: maps names to components */
type IconRegistry = {
  [key: string]: {
    tabler?: React.ComponentType<any>;
    phosphor?: React.ComponentType<any>;
  };
};

const ICON_REGISTRY: IconRegistry = {
  /* Sports & Activity Icons */
  soccer: { tabler: TablerIcons.BallFootball },
  goal: { tabler: TablerIcons.Trophy },
  shot: { tabler: TablerIcons.Flame },
  ball: { tabler: TablerIcons.BallFootball },
  corner: { tabler: TablerIcons.CornerDownRight },
  card: { tabler: TablerIcons.Cards },
  yellowCard: { tabler: TablerIcons.Square },
  redCard: { tabler: TablerIcons.Square },
  whistle: { tabler: TablerIcons.Send },
  stadium: { tabler: TablerIcons.Building },

  /* Action Icons */
  play: { phosphor: PhosphorIcons.Play, tabler: TablerIcons.PlayerPlay },
  pause: { tabler: TablerIcons.PlayerPause },
  stop: { tabler: TablerIcons.PlayerStop },
  replay: { tabler: TablerIcons.Rotate },
  refresh: { phosphor: PhosphorIcons.ArrowClockwise, tabler: TablerIcons.Refresh },

  /* UI Navigation Icons */
  home: { phosphor: PhosphorIcons.House, tabler: TablerIcons.Home },
  menu: { phosphor: PhosphorIcons.List, tabler: TablerIcons.Menu },
  close: { phosphor: PhosphorIcons.X, tabler: TablerIcons.X },
  back: { phosphor: PhosphorIcons.CaretLeft, tabler: TablerIcons.ChevronLeft },
  forward: { phosphor: PhosphorIcons.CaretRight, tabler: TablerIcons.ChevronRight },
  chevronDown: { tabler: TablerIcons.ChevronDown },
  chevronUp: { tabler: TablerIcons.ChevronUp },

  /* Status & Feedback Icons */
  checkmark: { phosphor: PhosphorIcons.CheckCircle, tabler: TablerIcons.CircleCheck },
  success: { tabler: TablerIcons.Check },
  error: { tabler: TablerIcons.X },
  warning: { tabler: TablerIcons.AlertTriangle },
  info: { tabler: TablerIcons.InfoCircle },
  loading: { tabler: TablerIcons.Loader },

  /* Ranking & Achievement Icons */
  trophy: { phosphor: PhosphorIcons.Trophy, tabler: TablerIcons.Trophy },
  medal: { tabler: TablerIcons.Medal },
  rank: { tabler: TablerIcons.Hash },
  star: { phosphor: PhosphorIcons.Star, tabler: TablerIcons.Star },
  bolt: { phosphor: PhosphorIcons.Lightning, tabler: TablerIcons.Bolt },
  flame: { tabler: TablerIcons.Flame },

  /* Data & Analytics Icons */
  chart: { tabler: TablerIcons.ChartBar },
  trend: { tabler: TablerIcons.TrendingUp },
  stats: { tabler: TablerIcons.ChartDots },
  users: { phosphor: PhosphorIcons.Users, tabler: TablerIcons.Users },
  user: { phosphor: PhosphorIcons.User, tabler: TablerIcons.User },

  /* Wallet & Payment Icons */
  wallet: { tabler: TablerIcons.Wallet },
  coin: { tabler: TablerIcons.Coin },
  transaction: { tabler: TablerIcons.ArrowsUpDown },

  /* Settings & Config Icons */
  settings: { phosphor: PhosphorIcons.Gear, tabler: TablerIcons.Settings },
  config: { tabler: TablerIcons.Settings },

  /* Link & External Icons */
  link: { tabler: TablerIcons.Link },
  external: { tabler: TablerIcons.ExternalLink },
};

/**
 * Icon Component - Maps icon names to Tabler/Phosphor with Neo Arcade styling
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = 'white',
  weight = 'regular',
  className = '',
  strokeWidth = 1.5,
}) => {
  const icon = ICON_REGISTRY[name];

  if (!icon) {
    console.warn(`Icon "${name}" not found in registry`);
    return <span className={className}>?</span>;
  }

  const Component = (icon.phosphor || icon.tabler) as React.ComponentType<any>;
  const colorValue = color === 'inherit' ? 'currentColor' : NEO_ARCADE_COLORS[color];

  if (!Component) {
    return <span className={className}>?</span>;
  }

  /* Phosphor-specific weight prop */
  if (icon.phosphor) {
    return (
      <Component
        size={size}
        color={colorValue}
        weight={weight as any}
        className={className}
      />
    );
  }

  /* Tabler icons use strokeWidth */
  return (
    <Component
      size={size}
      color={colorValue}
      stroke={strokeWidth}
      className={className}
    />
  );
};

/**
 * Preset Icon Variants - common use cases with baked-in styling
 */
export const IconVariants = {
  /* Primary action (Lime) */
  action: (name: string, size?: IconSize) =>
    <Icon name={name} size={size || 24} color="lime" weight="bold" />,

  /* Neutral/Default (White) */
  default: (name: string, size?: IconSize) =>
    <Icon name={name} size={size || 24} color="white" />,

  /* Error/Alert (Orange) */
  alert: (name: string, size?: IconSize) =>
    <Icon name={name} size={size || 24} color="orange" />,

  /* Success/Checkmark (Lime Green) */
  success: (name: string, size?: IconSize) =>
    <Icon name={name} size={size || 24} color="neonGreen" />,

  /* Secondary/Subtle (Gray) */
  subtle: (name: string, size?: IconSize) =>
    <Icon name={name} size={size || 24} color="blueGray" />,

  /* Badge/Badge icon (Small, Navy bg, Lime text) */
  badge: (name: string) =>
    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-neo-navy">
      <Icon name={name} size={16} color="lime" />
    </span>,
};

/**
 * Icon Size Presets
 */
export const IconSizes = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
} as const;

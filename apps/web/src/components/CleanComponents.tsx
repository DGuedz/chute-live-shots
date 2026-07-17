import React from 'react';
import { Icon } from '../icons';

/**
 * Clean Action Button - ícone + label minimalista
 */
export const CleanButton: React.FC<{
  icon: string;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}> = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
}) => {
  const variantStyles = {
    primary: 'bg-neo-orange text-neo-navy hover:bg-orange-600',
    secondary: 'border-2 border-neo-lime text-neo-lime hover:bg-neo-lime hover:text-neo-navy',
    danger: 'border-2 border-neo-orange text-neo-orange hover:bg-neo-orange hover:text-neo-navy',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSize = { sm: 16, md: 20, lg: 24 }[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-bold rounded transition-all ${variantStyles[variant]} ${sizeStyles[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon name={loading ? 'loading' : icon} size={iconSize} color="inherit" />
      {label}
    </button>
  );
};

/**
 * Status Badge - ícone + label compacto
 */
export const StatusBadge: React.FC<{
  status: 'available' | 'locked' | 'loading' | 'error';
  label?: string;
}> = ({ status, label }) => {
  const config = {
    available: { icon: 'checkmark', color: 'neonGreen', bg: 'bg-neo-navy' },
    locked: { icon: 'info', color: 'blueGray', bg: 'bg-neo-navy' },
    loading: { icon: 'loading', color: 'orange', bg: 'bg-neo-navy' },
    error: { icon: 'error', color: 'orange', bg: 'bg-neo-navy' },
  };

  const { icon, color, bg } = config[status];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${bg}`}>
      <Icon name={icon} size={12} color={color as any} />
      {label && <span>{label}</span>}
    </div>
  );
};

/**
 * Stat Row - exibe métrica com ícone
 */
export const StatRow: React.FC<{
  icon: string;
  label: string;
  value: string | number;
  color?: 'lime' | 'orange' | 'neonGreen' | 'white';
}> = ({ icon, label, value, color = 'white' }) => (
  <div className="flex items-center gap-3">
    <div className="p-2 bg-neo-navy rounded">
      <Icon name={icon} size={20} color={color} />
    </div>
    <div>
      <p className="text-neo-blue-gray text-xs font-bold">{label}</p>
      <p className={`text-xl font-black text-neo-${color}`}>{value}</p>
    </div>
  </div>
);

/**
 * Info Alert - notificação limpa com ícone
 */
export const InfoAlert: React.FC<{
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}> = ({ type, message, dismissible, onDismiss }) => {
  const iconMap = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    success: 'checkmark',
  };

  const colorMap = {
    info: 'neo-white',
    warning: 'neo-electric-yellow',
    error: 'neo-orange',
    success: 'neo-neon-green',
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded border-l-4 border-neo-${colorMap[type]} bg-neo-surface`}>
      <Icon name={iconMap[type]} size={20} color={colorMap[type] as any} />
      <p className="flex-1 text-sm text-neo-white">{message}</p>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="p-1 hover:text-neo-lime transition-colors"
          aria-label="Fechar"
        >
          <Icon name="close" size={16} color="white" />
        </button>
      )}
    </div>
  );
};

/**
 * Empty State - quando não há dados com ícone educativo
 */
export const EmptyState: React.FC<{
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="p-4 bg-neo-navy rounded-lg mb-4">
      <Icon name={icon} size={40} color="lime" />
    </div>
    <h3 className="text-neo-lime font-black text-lg mb-2">{title}</h3>
    {description && <p className="text-neo-blue-gray text-sm mb-4 max-w-xs">{description}</p>}
    {action && (
      <CleanButton
        icon="play"
        label={action.label}
        onClick={action.onClick}
        variant="primary"
        size="md"
      />
    )}
  </div>
);

/**
 * Divider com ícone (separa seções sem poluição)
 */
export const DividerWithIcon: React.FC<{ icon?: string }> = ({ icon = 'bolt' }) => (
  <div className="flex items-center gap-3 my-6">
    <div className="flex-1 h-px bg-neo-lime" />
    {icon && <Icon name={icon} size={16} color="lime" />}
    <div className="flex-1 h-px bg-neo-lime" />
  </div>
);

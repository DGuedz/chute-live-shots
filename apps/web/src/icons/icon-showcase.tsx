import React, { useState } from 'react';
import { Icon, IconVariants, IconSizes, NEO_ARCADE_COLORS } from './icon-system';

type IconCategory = 'sports' | 'action' | 'ui' | 'status' | 'ranking' | 'data' | 'wallet';

const ICON_CATEGORIES = {
  sports: ['soccer', 'goal', 'shot', 'ball', 'corner', 'card', 'yellowCard', 'redCard', 'whistle', 'stadium'],
  action: ['play', 'pause', 'stop', 'replay', 'refresh'],
  ui: ['home', 'menu', 'close', 'back', 'forward', 'chevronDown', 'chevronUp'],
  status: ['checkmark', 'success', 'error', 'warning', 'info', 'loading'],
  ranking: ['trophy', 'medal', 'rank', 'star', 'bolt', 'flame'],
  data: ['chart', 'trend', 'stats', 'users', 'user'],
  wallet: ['wallet', 'coin', 'transaction'],
};

export const IconShowcase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<IconCategory>('sports');
  const [selectedSize, setSelectedSize] = useState<16 | 24 | 32>(24);

  const icons = ICON_CATEGORIES[activeCategory];

  return (
    <div className="min-h-screen bg-neo-navy-dark p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-neo-lime mb-2">CHUTE Icon System</h1>
          <p className="text-neo-blue-gray text-lg">Neo Arcade Football - Tabler Icons + Phosphor</p>
        </div>

        {/* Controls */}
        <div className="mb-8 space-y-6">
          {/* Category Selector */}
          <div>
            <h2 className="text-neo-lime font-bold text-sm mb-3">CATEGORY</h2>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(ICON_CATEGORIES) as IconCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded font-bold text-sm transition-all ${
                    activeCategory === cat
                      ? 'bg-neo-lime text-neo-navy'
                      : 'bg-neo-surface text-neo-white border-2 border-neo-lime hover:border-neo-orange'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <h2 className="text-neo-lime font-bold text-sm mb-3">SIZE</h2>
            <div className="flex gap-3">
              {([16, 24, 32] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 rounded font-bold text-sm transition-all ${
                    selectedSize === size
                      ? 'bg-neo-orange text-neo-navy'
                      : 'bg-neo-surface text-neo-white border-2 border-neo-orange hover:border-neo-lime'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color Palette Preview */}
        <div className="mb-12">
          <h2 className="text-neo-lime font-bold text-sm mb-4">PALETTE</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(NEO_ARCADE_COLORS).map(([name, hex]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded border-2 border-neo-lime" style={{ backgroundColor: hex }} />
                <div>
                  <p className="font-bold text-neo-white text-sm">{name}</p>
                  <p className="text-neo-blue-gray text-xs">{hex}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Icons Grid */}
        <div>
          <h2 className="text-neo-lime font-bold text-sm mb-6">{activeCategory.toUpperCase()} ICONS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {icons.map((iconName) => (
              <div
                key={iconName}
                className="flex flex-col items-center justify-center p-4 bg-neo-surface border-2 border-neo-lime rounded hover:border-neo-orange transition-all hover:scale-105 cursor-pointer"
              >
                <div className="mb-3 flex items-center justify-center h-12">
                  <Icon name={iconName} size={selectedSize} color="lime" />
                </div>
                <p className="text-neo-white text-xs font-mono text-center break-words">{iconName}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Icon Variants Demo */}
        <div className="mt-16 border-t-2 border-neo-lime pt-12">
          <h2 className="text-neo-lime font-bold text-sm mb-6">ICON VARIANTS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Primary (Lime)', icon: 'trophy', variant: 'lime' },
              { label: 'Alert (Orange)', icon: 'warning', variant: 'orange' },
              { label: 'Success (Neon)', icon: 'checkmark', variant: 'neonGreen' },
              { label: 'Default (White)', icon: 'star', variant: 'white' },
            ].map(({ label, icon, variant }) => (
              <div key={label} className="flex flex-col items-center p-4 bg-neo-surface rounded border-2 border-neo-blue-gray">
                <Icon name={icon} size={32} color={variant as any} />
                <p className="text-neo-white text-xs mt-3 text-center font-mono">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mt-16 border-t-2 border-neo-lime pt-12">
          <h2 className="text-neo-lime font-bold text-sm mb-6">USAGE EXAMPLES</h2>
          <div className="bg-neo-surface border-2 border-neo-lime rounded p-6 font-mono text-neo-blue-gray text-sm space-y-4">
            <div>
              <p className="text-neo-lime mb-2">// Basic usage</p>
              <pre className="bg-neo-navy-dark p-3 rounded overflow-x-auto">
                {`<Icon name="soccer" size={24} color="lime" />`}
              </pre>
            </div>
            <div>
              <p className="text-neo-lime mb-2">// With custom className</p>
              <pre className="bg-neo-navy-dark p-3 rounded overflow-x-auto">
                {`<Icon name="trophy" size={32} color="orange" className="hover:scale-110" />`}
              </pre>
            </div>
            <div>
              <p className="text-neo-lime mb-2">// Using variants</p>
              <pre className="bg-neo-navy-dark p-3 rounded overflow-x-auto">
                {`{IconVariants.action('play', 24)}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconShowcase;

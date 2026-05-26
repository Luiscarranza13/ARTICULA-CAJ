import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { classNames } from '../../lib/utils';

interface Props {
  title: string;
  value: string;
  change?: number;
  description?: string;
  icon: React.ReactNode;
  color?: 'emerald' | 'blue' | 'purple' | 'gold';
  className?: string;
}

const colorMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  gold: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
};

export default function StatCard({ title, value, change, description, icon, color = 'emerald', className }: Props) {
  const c = colorMap[color];
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;

  return (
    <div className={classNames('card p-6 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={classNames('w-12 h-12 rounded-2xl flex items-center justify-center', c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
        {change !== undefined && (
          <span className={classNames('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            isUp ? 'bg-emerald-50 text-emerald-600' : isDown ? 'bg-red-50 text-red-600' : 'bg-surface-50 text-surface-500'
          )}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-surface-900 font-display mb-1">{value}</p>
      <p className="text-sm font-medium text-surface-600 mb-0.5">{title}</p>
      {description && <p className="text-xs text-surface-400">{description}</p>}
    </div>
  );
}

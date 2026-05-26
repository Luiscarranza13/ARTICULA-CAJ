import { classNames } from '../../lib/utils';

interface Props {
  children: React.ReactNode;
  variant?: 'emerald' | 'blue' | 'purple' | 'gold' | 'red' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  emerald: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  blue: 'bg-blue-100 text-blue-700 border border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border border-purple-200',
  gold: 'bg-amber-100 text-amber-700 border border-amber-200',
  red: 'bg-red-100 text-red-700 border border-red-200',
  gray: 'bg-surface-100 text-surface-600 border border-surface-200',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({ children, variant = 'gray', size = 'sm', className }: Props) {
  return (
    <span className={classNames('inline-flex items-center gap-1 rounded-full font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

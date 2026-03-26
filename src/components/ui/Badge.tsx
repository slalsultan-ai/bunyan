import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'red' | 'gray' | 'blue';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ children, variant = 'emerald', size = 'md', className }: BadgeProps) {
  const variants = {
    emerald: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border border-amber-200',
    red: 'bg-red-100 text-red-700 border border-red-200',
    gray: 'bg-gray-100 text-gray-700 border border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border border-blue-200',
  };
  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  selected?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({ hoverable, selected, padding = 'md', className, children, ...props }: CardProps) {
  const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm',
        paddings[padding],
        hoverable && 'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        selected ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-md' : 'border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

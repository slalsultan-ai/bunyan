import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  linkable?: boolean;
}

export default function Logo({ size = 'md', className, linkable = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8 text-lg', text: 'text-lg', sub: 'text-xs' },
    md: { icon: 'w-10 h-10 text-xl', text: 'text-xl', sub: 'text-xs' },
    lg: { icon: 'w-14 h-14 text-2xl', text: 'text-2xl', sub: 'text-sm' },
  };
  const s = sizes[size];

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0', s.icon)}>
        ب
      </div>
      <div>
        <div className={cn('font-bold text-gray-900 leading-none flex items-center gap-1.5', s.text)}>
          بُنيان
          <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-1 py-px rounded leading-none">BETA</span>
        </div>
        <div className={cn('text-gray-400 leading-none mt-0.5', s.sub)}>كل بُنيان يبدأ بلبنة</div>
      </div>
    </div>
  );

  if (linkable) return <Link href="/">{content}</Link>;
  return content;
}

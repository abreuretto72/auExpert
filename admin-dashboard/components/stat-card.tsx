import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  color?: 'jade' | 'ametista' | 'warning' | 'danger' | 'success';
};

const colorClasses = {
  jade:     'text-jade',
  ametista: 'text-ametista',
  warning:  'text-warning',
  danger:   'text-danger',
  success:  'text-success',
};

export function StatCard({ icon: Icon, label, value, hint, color = 'jade' }: Props) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={colorClasses[color]} strokeWidth={1.5} />
        <span className="text-text-muted text-[11px] uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className={cn('font-display text-3xl leading-tight', colorClasses[color])}>
        {value}
      </div>
      {hint && <div className="text-text-dim text-xs mt-2">{hint}</div>}
    </div>
  );
}

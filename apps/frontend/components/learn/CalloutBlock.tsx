import { AlertTriangle, Info, Lightbulb, Zap, Flame } from 'lucide-react';

type CalloutType = 'tip' | 'warning' | 'note' | 'insight' | 'incident';

const CALLOUT_CONFIG: Record<CalloutType, {
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
  label: string;
}> = {
  tip: {
    icon: <Lightbulb className="w-4 h-4" />,
    bg: 'var(--color-tip-bg)',
    border: 'var(--color-tip-border)',
    text: 'var(--color-tip-text)',
    iconColor: 'var(--color-success)',
    label: 'Tip',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
    text: 'var(--color-warning-text)',
    iconColor: 'var(--color-warning)',
    label: 'Warning',
  },
  note: {
    icon: <Info className="w-4 h-4" />,
    bg: 'var(--color-note-bg)',
    border: 'var(--color-note-border)',
    text: 'var(--color-note-text)',
    iconColor: 'var(--color-primary)',
    label: 'Note',
  },
  insight: {
    icon: <Zap className="w-4 h-4" />,
    bg: 'var(--color-insight-bg)',
    border: 'var(--color-insight-border)',
    text: 'var(--color-insight-text)',
    iconColor: '#8b5cf6',
    label: 'Insight',
  },
  incident: {
    icon: <Flame className="w-4 h-4" />,
    bg: 'var(--color-incident-bg)',
    border: 'var(--color-incident-border)',
    text: 'var(--color-incident-text)',
    iconColor: 'var(--color-error)',
    label: 'Incident',
  },
};

interface CalloutBlockProps {
  type?: CalloutType;
  children: React.ReactNode;
}

export function CalloutBlock({ type = 'note', children }: CalloutBlockProps) {
  const resolvedType = (type && type in CALLOUT_CONFIG) ? type : 'note';
  const config = CALLOUT_CONFIG[resolvedType];

  return (
    <div 
      className="my-6 rounded-xl border px-5 py-4"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
    >
      <div 
        className="flex items-center space-x-2 font-bold text-xs uppercase tracking-widest mb-2"
        style={{ color: config.iconColor }}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: config.text }}>
        {children}
      </div>
    </div>
  );
}


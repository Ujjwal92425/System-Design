import { AlertTriangle, Info, Lightbulb, Zap } from 'lucide-react';

type CalloutType = 'tip' | 'warning' | 'note' | 'insight';

const CALLOUT_CONFIG: Record<CalloutType, {
  icon: React.ReactNode;
  container: string;
  iconColor: string;
  label: string;
}> = {
  tip: {
    icon: <Lightbulb className="w-4 h-4" />,
    container: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300',
    iconColor: 'text-emerald-400',
    label: 'Tip',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    container: 'bg-amber-500/5 border-amber-500/20 text-amber-300',
    iconColor: 'text-amber-400',
    label: 'Warning',
  },
  note: {
    icon: <Info className="w-4 h-4" />,
    container: 'bg-sky-500/5 border-sky-500/20 text-sky-300',
    iconColor: 'text-sky-400',
    label: 'Note',
  },
  insight: {
    icon: <Zap className="w-4 h-4" />,
    container: 'bg-violet-500/5 border-violet-500/20 text-violet-300',
    iconColor: 'text-violet-400',
    label: 'Insight',
  },
};

interface CalloutBlockProps {
  type?: CalloutType;
  children: React.ReactNode;
}

export function CalloutBlock({ type = 'note', children }: CalloutBlockProps) {
  const config = CALLOUT_CONFIG[type];

  return (
    <div className={`my-6 rounded-xl border px-5 py-4 ${config.container}`}>
      <div className={`flex items-center space-x-2 font-bold text-xs uppercase tracking-widest mb-2 ${config.iconColor}`}>
        {config.icon}
        <span>{config.label}</span>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

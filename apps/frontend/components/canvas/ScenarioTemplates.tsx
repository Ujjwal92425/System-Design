'use client';

import { memo } from 'react';
import { SCENARIO_TEMPLATES, ScenarioTemplate } from '@/content/scenarios';
import { cn } from '@sd-os/ui';
import {
  Link, MessageCircle, Video, Navigation, MessageSquare, CreditCard,
  Sparkles, Clock, BarChart,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Link, MessageCircle, Video, Navigation, MessageSquare, CreditCard, Sparkles,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-red-50 text-red-700 border-red-200',
};

interface ScenarioTemplatesProps {
  onSelect: (template: ScenarioTemplate) => void;
}

function ScenarioTemplates({ onSelect }: ScenarioTemplatesProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-yc-accent/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-yc-accent" />
          </div>
          <h2 className="text-xl font-bold text-yc-text mb-2">Start with a Blueprint</h2>
          <p className="text-sm text-yc-text-muted max-w-md mx-auto">
            Choose a pre-wired system design template to jumpstart your architecture. Each comes with realistic node configs and service topology.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCENARIO_TEMPLATES.map((template) => {
            const Icon = ICON_MAP[template.icon] || Sparkles;
            return (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="group text-left bg-white border border-yc-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-yc-accent transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-yc-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-yc-accent/20 transition-colors">
                    <Icon className="w-5 h-5 text-yc-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-yc-text mb-1 truncate">{template.name}</h3>
                    <p className="text-[10px] text-yc-text-muted leading-relaxed line-clamp-2">{template.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={cn('text-[8px] font-semibold px-1.5 py-0.5 rounded border', DIFFICULTY_COLORS[template.difficulty])}>
                        {template.difficulty}
                      </span>
                      <span className="text-[8px] font-mono text-yc-text-muted flex items-center gap-1">
                        <BarChart className="w-2.5 h-2.5" />
                        {template.nodes.length} services
                      </span>
                      <span className="text-[8px] font-mono text-yc-text-muted flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {template.edges.length} connections
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(ScenarioTemplates);

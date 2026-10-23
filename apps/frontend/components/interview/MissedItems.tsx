'use client';

import { Lightbulb } from 'lucide-react';

interface MissedItem {
  id: string;
  name: string;
  hint?: string;
}

interface MissedItemsProps {
  missed: MissedItem[];
}

export function MissedItems({ missed }: MissedItemsProps) {
  if (missed.length === 0) {
    return (
      <div style={{
        background: 'rgba(54, 201, 142, 0.05)',
        border: '1px dashed #36C98E',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '12px', color: '#36C98E', fontWeight: 700 }}>
          🎉 Perfect Score! No missed components identified.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h4 className="mono" style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
        KEY ARCHITECTURAL GAPS & RECOMMENDATIONS
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {missed.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              gap: '12px',
              background: 'rgba(232, 160, 69, 0.03)',
              border: '1px solid rgba(232, 160, 69, 0.2)',
              borderRadius: '8px',
              padding: '12px'
            }}
          >
            <Lightbulb style={{ width: '16px', height: '16px', color: 'var(--accent-amber)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Missing: {item.name}
              </span>
              {item.hint && (
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.hint}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

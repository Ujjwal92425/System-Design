'use client';

import { Activity } from 'lucide-react';

interface TrafficSliderProps {
  value: number;
  onChange: (qps: number) => void;
  disabled?: boolean;
}

export function TrafficSlider({ value, onChange, disabled }: TrafficSliderProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '16px 20px',
      opacity: disabled ? 0.6 : 1,
      pointerEvents: disabled ? 'none' : 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Input Traffic QPS
          </span>
        </div>
        <span className="mono" style={{ fontSize: '13px', color: 'var(--accent-amber)', fontWeight: 700 }}>
          {value.toLocaleString()} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>REQ/S</span>
        </span>
      </div>

      <input
        type="range"
        min="100"
        max="10000"
        step="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 1000)}
        style={{
          width: '100%',
          accentColor: 'var(--accent-amber)',
          background: 'var(--border)',
          height: '6px',
          borderRadius: '3px',
          cursor: 'pointer',
          outline: 'none'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }} className="mono">
        <span>100 QPS</span>
        <span>5,000 QPS</span>
        <span>10,000 QPS</span>
      </div>
    </div>
  );
}

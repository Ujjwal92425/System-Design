'use client';

import { Play, Square, RefreshCw, Zap, TrendingUp, HelpCircle } from 'lucide-react';

interface SimulationControlsProps {
  isRunning: boolean;
  scenario: string;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onScenarioChange: (scenario: string) => void;
}

export function SimulationControls({
  isRunning,
  scenario,
  onStart,
  onStop,
  onReset,
  onScenarioChange
}: SimulationControlsProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '12px 20px',
      justifyContent: 'space-between'
    }}>
      
      {/* Playback Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isRunning ? (
          <button
            onClick={onStart}
            style={{
              padding: '8px 16px',
              background: 'var(--accent-amber)',
              color: '#080B14',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play style={{ width: '13px', height: '13px', fill: 'currentColor' }} />
            <span>START SIMULATION</span>
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              padding: '8px 16px',
              background: '#F87171',
              color: '#080B14',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Square style={{ width: '13px', height: '13px', fill: 'currentColor' }} />
            <span>STOP SIMULATION</span>
          </button>
        )}

        <button
          onClick={onReset}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw style={{ width: '12px', height: '12px' }} />
          <span>RESET</span>
        </button>
      </div>

      {/* Scenario Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
          Load Profile:
        </span>
        <select
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value)}
          className="mono"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            color: 'var(--text-primary)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="steady">Steady State</option>
          <option value="spike">Traffic Spike Surges</option>
          <option value="chaos">Chaos Test (CacheStampede)</option>
        </select>
      </div>

    </div>
  );
}

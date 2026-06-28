'use client';

import { Play, Pause, AlertTriangle } from 'lucide-react';

interface TimerProps {
  timeLeft: number; // in seconds
  totalTime: number; // in minutes
  isRunning: boolean;
  onToggle: () => void;
}

export function Timer({ timeLeft, totalTime, isRunning, onToggle }: TimerProps) {
  const totalSeconds = totalTime * 60;
  const percentage = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;
  
  // Format MM:SS
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isLowTime = timeLeft < 600; // < 10 minutes

  // SVG ring properties
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '30px',
      padding: '6px 16px 6px 8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }}>
      {/* Circular Progress Ring */}
      <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ transform: 'rotate(-90deg)', width: '56px', height: '56px' }}>
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="3.5"
            fill="transparent"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={isLowTime ? '#EF4444' : '#3B82F6'}
            strokeWidth="3.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          />
        </svg>
        
        {/* Toggle Button Inside Ring */}
        <button
          onClick={onToggle}
          style={{
            position: 'absolute',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            outline: 'none',
            zIndex: 2
          }}
          title={isRunning ? 'Pause Timer' : 'Resume Timer'}
        >
          {isRunning ? (
            <Pause style={{ width: '12px', height: '12px', fill: 'var(--text-primary)' }} />
          ) : (
            <Play style={{ width: '12px', height: '12px', marginLeft: '2px', fill: 'var(--text-primary)' }} />
          )}
        </button>
      </div>

      {/* Numerical Time Display */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="mono" style={{
          fontSize: '18px',
          fontWeight: 800,
          color: isLowTime ? '#EF4444' : 'var(--text-primary)',
          letterSpacing: '0.05em',
          lineHeight: 1.1
        }}>
          {formattedTime}
        </span>
        <span className="mono" style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {isRunning ? 'timer ticking' : 'timer paused'}
        </span>
      </div>

      {/* Warning indicator */}
      {isLowTime && timeLeft > 0 && (
        <div style={{ color: '#EF4444', display: 'flex', alignItems: 'center' }} title="Less than 10 minutes remaining!">
          <AlertTriangle style={{ width: '16px', height: '16px', animation: 'pulse 1s infinite' }} />
        </div>
      )}
    </div>
  );
}

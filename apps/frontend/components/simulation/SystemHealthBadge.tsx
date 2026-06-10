'use client';

import { Activity, ShieldAlert, ShieldCheck, ShieldAlert as DegradedIcon } from 'lucide-react';

interface SystemHealthBadgeProps {
  health: 'GREEN' | 'YELLOW' | 'RED' | null;
}

export function SystemHealthBadge({ health }: SystemHealthBadgeProps) {
  if (!health) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        color: 'var(--text-muted)',
      }}>
        <Activity style={{ width: '13px', height: '13px' }} />
        <span className="mono" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>
          OFFLINE
        </span>
      </div>
    );
  }

  const CONFIG = {
    GREEN: {
      text: 'SYSTEM STABLE',
      color: '#36C98E',
      bg: 'rgba(54,201,142,0.06)',
      border: 'rgba(54,201,142,0.2)',
      icon: ShieldCheck
    },
    YELLOW: {
      text: 'DEGRADED',
      color: '#E8A045',
      bg: 'rgba(232,160,69,0.06)',
      border: 'rgba(232,160,69,0.2)',
      icon: DegradedIcon
    },
    RED: {
      text: 'CRITICAL FAILURE',
      color: '#F87171',
      bg: 'rgba(248,113,113,0.06)',
      border: 'rgba(248,113,113,0.2)',
      icon: ShieldAlert
    }
  };

  const current = CONFIG[health];
  const Icon = current.icon;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      background: current.bg,
      border: `1px solid ${current.border}`,
      borderRadius: '8px',
      color: current.color,
      boxShadow: `0 0 12px ${current.bg}`,
      transition: 'all 300ms ease'
    }}>
      <Icon style={{ width: '14px', height: '14px' }} />
      <span className="mono" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>
        {current.text}
      </span>
    </div>
  );
}

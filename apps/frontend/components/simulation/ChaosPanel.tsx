'use client';

import { Zap, ZapOff, CheckCircle, AlertTriangle } from 'lucide-react';

interface NodeItem {
  id: string;
  type: string;
  data: {
    label?: string;
  };
}

interface ChaosPanelProps {
  nodes: NodeItem[];
  failedNodes: string[];
  onToggleFailure: (nodeId: string) => void;
}

export function ChaosPanel({ nodes, failedNodes, onToggleFailure }: ChaosPanelProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      height: '100%',
      overflowY: 'auto'
    }}>
      <div>
        <h4 className="bricolage" style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap style={{ width: '14px', height: '14px', color: 'var(--accent-amber)' }} />
          <span>Chaos Engineering Console</span>
        </h4>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
          Simulate node crashes to verify fault tolerance and failover logic.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {nodes.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
            No nodes on the canvas.
          </p>
        ) : (
          nodes.map(n => {
            const isFailed = failedNodes.includes(n.id);
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isFailed ? 'rgba(248,113,113,0.06)' : 'var(--bg-elevated)',
                  border: isFailed ? '1px solid rgba(248,113,113,0.2)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'all 200ms ease'
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {n.data.label || n.type}
                  </span>
                  <p className="mono" style={{ margin: '2px 0 0', fontSize: '8px', color: 'var(--text-muted)' }}>
                    {n.id} · {n.type.split('_').join(' ')}
                  </p>
                </div>

                <button
                  onClick={() => onToggleFailure(n.id)}
                  style={{
                    padding: '6px 12px',
                    background: isFailed ? '#36C98E' : '#F87171',
                    color: '#080B14',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isFailed ? (
                    <>
                      <CheckCircle style={{ width: '11px', height: '11px' }} />
                      <span>HEAL</span>
                    </>
                  ) : (
                    <>
                      <ZapOff style={{ width: '11px', height: '11px' }} />
                      <span>CRASH</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

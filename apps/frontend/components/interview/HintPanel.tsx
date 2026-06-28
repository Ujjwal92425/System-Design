'use client';

import { useState } from 'react';
import { HelpCircle, Lock, Unlock, AlertCircle } from 'lucide-react';

interface HintPanelProps {
  hints: string[];
  hintsUsed: number;
  onUseHint: () => void;
}

export function HintPanel({ hints, hintsUsed, onUseHint }: HintPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUnlockClick = () => {
    setShowConfirm(true);
  };

  const confirmUnlock = () => {
    onUseHint();
    setShowConfirm(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle style={{ width: '16px', height: '16px', color: 'var(--accent-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            Hints & Tips
          </h3>
        </div>
        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {hintsUsed} / {hints.length} UNLOCKED
        </span>
      </div>

      {/* Warnings & confirmation overlay */}
      {showConfirm ? (
        <div style={{
          background: 'rgba(232, 160, 69, 0.08)',
          border: '1px solid var(--accent-amber)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--accent-amber)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>Unlock hint?</span>
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Unlocking a hint will deduct a small score penalty from your final design evaluation scorecard.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmUnlock}
              style={{
                background: 'var(--accent-amber)',
                color: '#080B14',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Unlock Hint
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {hints.map((hint, idx) => {
            const isUnlocked = idx < hintsUsed;
            return (
              <div
                key={idx}
                style={{
                  background: isUnlocked ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: isUnlocked ? 'flex-start' : 'center',
                  transition: 'background-color 200ms ease'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isUnlocked ? 'rgba(54, 201, 142, 0.1)' : 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isUnlocked ? '#36C98E' : 'var(--text-muted)',
                  flexShrink: 0
                }}>
                  {isUnlocked ? <Unlock style={{ width: '12px', height: '12px' }} /> : <Lock style={{ width: '12px', height: '12px' }} />}
                </div>

                <div style={{ flex: 1 }}>
                  {isUnlocked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="mono" style={{ fontSize: '9px', color: '#36C98E', fontWeight: 700 }}>
                        HINT #{idx + 1}
                      </span>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {hint}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Hint #{idx + 1} is locked
                      </span>
                      {idx === hintsUsed && (
                        <button
                          onClick={handleUnlockClick}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--accent-amber)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: 'var(--accent-amber)',
                            fontSize: '9px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

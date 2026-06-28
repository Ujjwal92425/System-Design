/**
 * apps/frontend/components/canvas/panels/VersionPanel.tsx
 *
 * Right-slide-out panel showing version history for the current design.
 * Lists all saved versions with timestamps, allows restore,
 * and provides a "Save Now" button to snapshot the current state.
 *
 * CHANGE: Implemented from stub — full version history list,
 *          restore, and save actions.
 */

'use client';

import { useEffect, useState } from 'react';
import { useVersionHistory } from '../../../features/canvas/useVersionHistory';
import { cn } from '@sd-os/ui';
import { History, RotateCcw, Save, Loader2, AlertCircle, X } from 'lucide-react';

interface VersionPanelProps {
  designId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionPanel({ designId, isOpen, onClose }: VersionPanelProps) {
  const {
    versions,
    isLoading,
    error,
    currentVersion,
    fetchVersions,
    saveVersion,
    restoreVersion,
  } = useVersionHistory(designId);

  useEffect(() => {
    if (isOpen && designId) {
      fetchVersions();
    }
  }, [isOpen, designId, fetchVersions]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await saveVersion();
    setSaving(false);
  };

  const handleRestore = async (version: number) => {
    await restoreVersion(version);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-slate-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Version History</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Save button */}
      <div className="border-b border-slate-100 px-4 py-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? 'Saving...' : 'Save Current Version'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading && versions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : versions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <History className="mx-auto mb-2 h-8 w-8 text-slate-200" />
            <p>No versions saved yet.</p>
            <p className="mt-1">Save your first version above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className={cn(
                  'rounded-lg border px-3 py-2.5 transition-colors',
                  currentVersion === v.version
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-700">
                      v{v.version}
                    </span>
                    {currentVersion === v.version && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        Current
                      </span>
                    )}
                  </div>
                  {currentVersion !== v.version && (
                    <button
                      onClick={() => handleRestore(v.version)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                  )}
                </div>
                {v.message && (
                  <p className="mt-1 text-[11px] text-slate-500">{v.message}</p>
                )}
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {new Date(v.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

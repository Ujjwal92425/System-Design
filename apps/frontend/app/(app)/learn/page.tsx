'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen, Search, Clock, ChevronRight, ChevronDown, ChevronLeft, X,
  Folder, FolderOpen, FileText, PanelLeftClose, PanelLeft,
  CheckCircle2, Bookmark, BookmarkCheck, ArrowLeft, ArrowRight,
  Share2, Check, Shield, Radio, Database,
  Zap, Server, GitBranch, BarChart2, Layout, Monitor, Loader2,
  Building2, Hash, Layers, Cpu, Code2, Sparkles, HardDrive,
  Compass, Binary, Archive, KeyRound, Boxes
} from 'lucide-react';
import { api } from '../../../lib/api';
import { JsonLd } from '../../../components/seo/JsonLd';
import { collectionSchemaJsonLd } from '../../../lib/seo';
import { LessonRenderer } from '../../../components/learn/LessonRenderer';
import { QuizBlock } from '../../../components/learn/QuizBlock';
import { getAllTracksWithLessons, cleanDashes } from '../../../content/curriculum/index';
import { useProgressStore, LessonStatus } from '../../../features/learn/progressStore';
import { BRAND, BRAND_L, BRAND_B, DiffBadge } from '../../../components/ui/curriculum-shared';

// ── VS Code Icon mapping per track (All 18 Tracks) ──────────────────────────
const TRACK_ICONS: Record<string, React.ComponentType<any>> = {
  'networking-os-security':        Shield,
  'apis-protocols-authentication': Radio,
  'databases':                     Database,
  'caching-cdns':                  Zap,
  'distributed-infrastructure':    Server,
  'architecture-patterns':         GitBranch,
  'advanced-distributed-systems':  Cpu,
  'system-design-interviews':      BarChart2,
  'frontend-performance':          Layout,
  'production-operations':         Monitor,
  'simulation-driven':             Boxes,
  'coding-craft':                  Code2,
  'design-deep-dive':              Sparkles,
  'design-deep-dive-2':            HardDrive,
  'system-design-foundations':     Compass,
  'scalable-data-structures':      Binary,
  'advanced-storage-patterns':     Archive,
  'advanced-security-identity':    KeyRound,
};

// ── Main VS Code Workspace Inner Component ──────────────────────────────────
function VSCodeCurriculumWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // All 18 tracks with embedded modules and lessons loaded instantly from local curriculum
  const localTracks = useMemo(() => getAllTracksWithLessons(), []);

  // Progress store for status, bookmarks, and completion
  const lessonStatuses = useProgressStore(s => s.lessonStatuses);
  const updateLessonStatus = useProgressStore(s => s.updateLessonStatus);
  const updateLessonProgress = useProgressStore(s => s.updateLessonProgress);

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Active track and lesson slugs from URL or default to first track & first lesson
  const initialTrackSlug = searchParams.get('track') || localTracks[0]?.slug || 'networking-os-security';
  const [activeTrackSlug, setActiveTrackSlug] = useState(initialTrackSlug);

  const initialTrack = localTracks.find(t => t.slug === activeTrackSlug) || localTracks[0];
  const initialLessonSlug = searchParams.get('lesson') || initialTrack?.lessons?.[0]?.slug || '';
  const [activeLessonSlug, setActiveLessonSlug] = useState(initialLessonSlug);

  // Expanded tracks set in explorer tree
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(
    () => new Set([activeTrackSlug])
  );

  const notesContainerRef = useRef<HTMLDivElement>(null);

  // Sync state when URL params change
  useEffect(() => {
    const trackParam = searchParams.get('track');
    const lessonParam = searchParams.get('lesson');

    if (trackParam && trackParam !== activeTrackSlug) {
      setActiveTrackSlug(trackParam);
      setExpandedTracks(prev => new Set(prev).add(trackParam));
    }
    if (lessonParam && lessonParam !== activeLessonSlug) {
      setActiveLessonSlug(lessonParam);
    }
  }, [searchParams]);

  // Current active track & lesson objects
  const activeTrack = useMemo(() => {
    return localTracks.find(t => t.slug === activeTrackSlug) || localTracks[0];
  }, [localTracks, activeTrackSlug]);

  const activeLesson = useMemo(() => {
    if (!activeTrack?.lessons) return null;
    return activeTrack.lessons.find((l: any) => l.slug === activeLessonSlug) || activeTrack.lessons[0] || null;
  }, [activeTrack, activeLessonSlug]);

  // Sibling lessons (previous & next) for sequential reading
  const { prevLesson, nextLesson } = useMemo(() => {
    if (!activeTrack?.lessons || !activeLesson) return { prevLesson: null, nextLesson: null };
    const idx = activeTrack.lessons.findIndex((l: any) => l.slug === activeLesson.slug);
    return {
      prevLesson: idx > 0 ? activeTrack.lessons[idx - 1] : null,
      nextLesson: idx < activeTrack.lessons.length - 1 ? activeTrack.lessons[idx + 1] : null,
    };
  }, [activeTrack, activeLesson]);

  // Scroll to top whenever active lesson changes
  useEffect(() => {
    if (notesContainerRef.current) {
      notesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeLessonSlug]);

  // Toggle track expand/collapse in sidebar tree
  const toggleTrackExpand = (slug: string) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // Expand or collapse all tracks
  const handleExpandAll = () => {
    setExpandedTracks(new Set(localTracks.map(t => t.slug)));
  };
  const handleCollapseAll = () => {
    setExpandedTracks(new Set());
  };

  // Handle selecting a lesson
  const handleSelectLesson = (trackSlug: string, lessonSlug: string) => {
    setActiveTrackSlug(trackSlug);
    setActiveLessonSlug(lessonSlug);
    setExpandedTracks(prev => new Set(prev).add(trackSlug));

    // Update URL query parameters without reloading the page
    const params = new URLSearchParams(window.location.search);
    params.set('track', trackSlug);
    params.set('lesson', lessonSlug);
    router.replace(`/learn?${params.toString()}`, { scroll: false });
  };

  // Filter tracks and lessons based on search query
  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return localTracks;

    return localTracks
      .map(track => {
        const matchesTrack = track.name.toLowerCase().includes(q) ||
                             (track.description ?? '').toLowerCase().includes(q);
        const matchingLessons = (track.lessons ?? []).filter((l: any) =>
          l.title.toLowerCase().includes(q) ||
          (l.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
        );

        if (matchesTrack || matchingLessons.length > 0) {
          return {
            ...track,
            lessons: matchesTrack ? track.lessons : matchingLessons,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof localTracks;
  }, [localTracks, searchQuery]);

  // Automatically expand matching tracks during active search
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedTracks(new Set(filteredTracks.map(t => t.slug)));
    }
  }, [searchQuery, filteredTracks]);

  // Lesson status & bookmark actions
  const activeLessonId = activeLesson?.id || '';
  const currentStatus = lessonStatuses[activeLessonId]?.status || 'NOT_STARTED';
  const isBookmarked = !!lessonStatuses[activeLessonId]?.bookmarked;

  const handleToggleComplete = async () => {
    if (!activeLessonId) return;
    const newStatus: LessonStatus = currentStatus === 'COMPLETE' ? 'NOT_STARTED' : 'COMPLETE';
    updateLessonStatus(activeLessonId, newStatus);

    // Sync to backend if session exists
    try {
      await api.post('/learn/progress/state', {
        lessonId: activeLessonId,
        status: newStatus,
      });
    } catch {
      // Ignored for unauthenticated users (persisted locally)
    }
  };

  const handleToggleBookmark = async () => {
    if (!activeLessonId) return;
    const nextBookmarked = !isBookmarked;
    updateLessonProgress(activeLessonId, { bookmarked: nextBookmarked });

    // Sync to backend if session exists
    try {
      await api.post('/learn/progress/bookmark', {
        lessonId: activeLessonId,
        bookmarked: nextBookmarked,
      });
    } catch {
      // Ignored for unauthenticated users (persisted locally)
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    // CHANGE: fill remaining space under the header (parent is height-locked in (app)/layout.tsx) instead of assuming a 65px header, which overflowed and clipped the bottom
    <div className="w-full flex flex-col flex-1 min-w-0 min-h-0 relative" style={{ overflow: 'hidden' }}>
      <JsonLd data={collectionSchemaJsonLd()} />

      {/* ── Main VS Code Workspace Flexbox ─────────────────────────────────── */}
      <div className="w-full h-full flex flex-row overflow-hidden relative min-h-0 bg-[var(--bg-base)]">

        {/* CHANGE: Floating collapse button placed at the workspace level directly on the vertical dividing line */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          title={sidebarOpen ? 'Collapse Explorer to Icon Rail (Ctrl+B)' : 'Expand Explorer (Ctrl+B)'}
          style={{
            position: 'absolute',
            left: sidebarOpen ? '340px' : '56px',
            top: '7px',
            transform: 'translateX(-50%)',
            zIndex: 40,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            transition: 'left 180ms cubic-bezier(0.4, 0, 0.2, 1), transform 120ms, border-color 120ms',
          }}
          className="hover:border-[#FF6600] hover:text-[#FF6600] hover:scale-105 active:scale-95"
        >
          {sidebarOpen ? (
            <ChevronLeft style={{ width: '15px', height: '15px' }} />
          ) : (
            <ChevronRight style={{ width: '15px', height: '15px' }} />
          )}
        </button>

        {/* ── Left Sidebar (VS Code Explorer or Mini Icon Rail) ──────────────── */}
        <aside
          style={{
            width: sidebarOpen ? '340px' : '56px',
            minWidth: sidebarOpen ? '340px' : '56px',
            maxWidth: sidebarOpen ? '380px' : '56px',
            transition: 'width 180ms cubic-bezier(0.4, 0, 0.2, 1), min-width 180ms cubic-bezier(0.4, 0, 0.2, 1), max-width 180ms cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
          }}
          className="h-full z-20 flex-shrink-0 min-h-0 relative"
        >
          {sidebarOpen ? (
            <>
              {/* Explorer Header */}
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-elevated)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <Layers style={{ width: '15px', height: '15px', color: BRAND, flexShrink: 0 }} />
                  <span
                    className="mono"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Curriculum
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: '10px',
                      background: BRAND_L,
                      color: BRAND,
                      border: `1px solid ${BRAND_B}`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    18 Tracks
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={handleExpandAll}
                    title="Expand All Tracks"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
                  >
                    <FolderOpen style={{ width: '15px', height: '15px' }} />
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    title="Collapse All Tracks"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
                  >
                    <Folder style={{ width: '15px', height: '15px' }} />
                  </button>
                </div>
              </div>

              {/* Quick Filter Search Bar */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    style={{
                      position: 'absolute',
                      left: '9px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '13px',
                      height: '13px',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Filter tracks & lessons..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      paddingLeft: '28px',
                      paddingRight: searchQuery ? '26px' : '8px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    className="focus:border-[#FF6600]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '2px',
                      }}
                    >
                      <X style={{ width: '12px', height: '12px' }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Hierarchical Tree (Tracks > Modules > Lessons) */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '6px 0',
                }}
                className="custom-scrollbar"
              >
                {filteredTracks.map(track => {
                  const isExpanded = expandedTracks.has(track.slug);
                  const trackLessons = (track.lessons ?? []).filter(Boolean);
                  const completedCount = trackLessons.filter(
                    (l: any) => lessonStatuses[l?.id]?.status === 'COMPLETE'
                  ).length;
                  const TrackIcon = TRACK_ICONS[track.slug] || Folder;

                  return (
                    <div key={track.id} style={{ marginBottom: '2px' }}>
                      {/* Track Node (Folder) */}
                      <div
                        onClick={() => toggleTrackExpand(track.slug)}
                        title={track.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 12px',
                          cursor: 'pointer',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: isExpanded ? 'var(--text-primary)' : 'var(--text-secondary)',
                          background: isExpanded ? 'rgba(0,0,0,0.03)' : 'transparent',
                          borderLeft: activeTrackSlug === track.slug ? `2px solid ${BRAND}` : '2px solid transparent',
                          transition: 'background 120ms',
                        }}
                        className="hover:bg-[var(--bg-elevated)]"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', flexShrink: 0 }}>
                            {isExpanded ? (
                              <ChevronDown style={{ width: '13px', height: '13px' }} />
                            ) : (
                              <ChevronRight style={{ width: '13px', height: '13px' }} />
                            )}
                          </span>
                          <TrackIcon style={{ width: '14px', height: '14px', color: isExpanded ? BRAND : 'var(--text-muted)', flexShrink: 0 }} />
                          <span
                            title={track.name}
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {cleanDashes(track.name)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                          <span
                            className="mono"
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'var(--bg-base)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            L{track.level}
                          </span>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {completedCount > 0 ? `${completedCount}/` : ''}{trackLessons.length}
                          </span>
                        </div>
                      </div>

                      {/* Sub-lessons (Files under Track) */}
                      {isExpanded && (
                        <div style={{ paddingLeft: '8px' }}>
                          {trackLessons.map((lesson: any, i: number) => {
                            const isActive = activeLessonSlug === lesson.slug;
                            const isDone = lessonStatuses[lesson.id]?.status === 'COMPLETE';
                            const isSaved = !!lessonStatuses[lesson.id]?.bookmarked;

                            return (
                              <div
                                key={lesson.id}
                                onClick={() => handleSelectLesson(track.slug, lesson.slug)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 12px 6px 18px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  borderLeft: isActive ? `3px solid ${BRAND}` : '3px solid transparent',
                                  background: isActive ? BRAND_L : 'transparent',
                                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  fontWeight: isActive ? 600 : 400,
                                  transition: 'background 120ms',
                                }}
                                className={isActive ? '' : 'hover:bg-[var(--bg-elevated)]'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                  <FileText
                                    style={{
                                      width: '13px',
                                      height: '13px',
                                      color: isActive ? BRAND : 'var(--text-muted)',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    className="mono"
                                    style={{
                                      fontSize: '10px',
                                      color: isActive ? BRAND : 'var(--text-muted)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <span
                                    title={lesson.title}
                                    style={{
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {cleanDashes(lesson.title)}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                                  {isSaved && (
                                    <Bookmark style={{ width: '11px', height: '11px', color: BRAND, fill: BRAND }} />
                                  )}
                                  {isDone ? (
                                    <CheckCircle2 style={{ width: '12px', height: '12px', color: '#22c55e' }} />
                                  ) : (
                                    <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                      {lesson?.estimatedMin ?? 15}m
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Mini Icon Rail when collapsed */
            <div className="w-full h-full flex flex-col items-center py-2 min-h-0">
              <div
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid var(--border)',
                  width: '100%',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setSidebarOpen(true)}
                  title="Expand Explorer (Ctrl+B)"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    color: BRAND,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="hover:bg-[var(--bg-elevated)]"
                >
                  <Layers style={{ width: '18px', height: '18px' }} />
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 0',
                }}
                className="custom-scrollbar"
              >
                {localTracks.map(track => {
                  const Icon = TRACK_ICONS[track.slug] || BookOpen;
                  const isActive = activeTrackSlug === track.slug;
                  return (
                    <button
                      key={track.id}
                      onClick={() => {
                        setActiveTrackSlug(track.slug);
                        setExpandedTracks(prev => new Set(prev).add(track.slug));
                        setSidebarOpen(true);
                      }}
                      title={`${cleanDashes(track.name)} (L${track.level})`}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isActive ? BRAND_L : 'transparent',
                        border: isActive ? `1px solid ${BRAND_B}` : '1px solid transparent',
                        color: isActive ? BRAND : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 120ms',
                        flexShrink: 0,
                      }}
                      className={isActive ? '' : 'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}
                    >
                      <Icon style={{ width: '18px', height: '18px' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── Right Side: VS Code Editor & Full Notes Area ──────────────────── */}
        <main
          className="flex-1 h-full flex flex-col min-w-0 min-h-0 relative"
          style={{
            background: 'var(--bg-surface)',
            overflow: 'hidden',
          }}
        >
          {/* Top VS Code Editor Tab Bar & Breadcrumbs */}
          <header
            style={{
              height: '42px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px 0 28px',
              flexShrink: 0,
              gap: '12px',
            }}
          >
            {/* Left: Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>

              {/* Breadcrumb Trail */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span className="hover:text-[var(--text-primary)] cursor-pointer" onClick={() => setSidebarOpen(true)}>
                  Curriculum
                </span>
                <ChevronRight style={{ width: '11px', height: '11px', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {activeTrack?.name}
                </span>
                <ChevronRight style={{ width: '11px', height: '11px', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {activeLesson?.title || 'Overview'}
                </span>
              </div>
            </div>

            {/* Right: Quick Lesson Actions */}
            {activeLesson && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock style={{ width: '11px', height: '11px' }} />
                  {activeLesson?.estimatedMin ?? 15}m
                </span>

                <DiffBadge d={activeLesson.difficulty ?? 'BEGINNER'} />

                {/* Bookmark Toggle */}
                <button
                  onClick={handleToggleBookmark}
                  title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this Lesson'}
                  style={{
                    background: isBookmarked ? BRAND_L : 'transparent',
                    border: `1px solid ${isBookmarked ? BRAND_B : 'var(--border)'}`,
                    borderRadius: '6px',
                    padding: '5px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isBookmarked ? BRAND : 'var(--text-secondary)',
                    transition: 'all 120ms',
                  }}
                  className="hover:border-[#FF6600]"
                >
                  {isBookmarked ? (
                    <BookmarkCheck style={{ width: '13px', height: '13px', color: BRAND }} />
                  ) : (
                    <Bookmark style={{ width: '13px', height: '13px' }} />
                  )}
                  <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
                </button>

                {/* Mark Complete Toggle */}
                <button
                  onClick={handleToggleComplete}
                  style={{
                    background: currentStatus === 'COMPLETE' ? 'rgba(34,197,94,0.1)' : BRAND,
                    border: `1px solid ${currentStatus === 'COMPLETE' ? 'rgba(34,197,94,0.3)' : 'transparent'}`,
                    borderRadius: '6px',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: currentStatus === 'COMPLETE' ? '#22c55e' : '#fff',
                    transition: 'opacity 120ms',
                  }}
                  className="hover:opacity-90"
                >
                  <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                  <span>{currentStatus === 'COMPLETE' ? 'Completed' : 'Mark Done'}</span>
                </button>

                {/* Share Link */}
                <button
                  onClick={handleCopyLink}
                  title="Copy lesson link"
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                  className="hover:text-[var(--text-primary)] hover:border-[#FF6600]"
                >
                  {copiedLink ? (
                    <Check style={{ width: '13px', height: '13px', color: '#22c55e' }} />
                  ) : (
                    <Share2 style={{ width: '13px', height: '13px' }} />
                  )}
                </button>
              </div>
            )}
          </header>

          {/* ── Main Notes Reading Pane (Full Width & Scrollable) ─────────────── */}
          {/* CHANGE: Added explicit height, overflowY: 'scroll', and overscrollBehavior: 'contain' */}
          <div
            ref={notesContainerRef}
            style={{
              flex: 1,
              minHeight: 0,
              height: 'calc(100% - 42px)',
              overflowY: 'scroll',
              overscrollBehavior: 'contain',
              padding: '32px 36px 64px',
            }}
            className="custom-scrollbar"
          >
            {activeLesson ? (
              <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Lesson Header Card */}
                <div
                  style={{
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: BRAND,
                        background: BRAND_L,
                        border: `1px solid ${BRAND_B}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {activeTrack.name}
                    </span>
                    <DiffBadge d={activeLesson.difficulty ?? 'BEGINNER'} />
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock style={{ width: '12px', height: '12px' }} /> {activeLesson?.estimatedMin ?? 15}m read
                    </span>
                  </div>

                  <h1
                    className="bricolage"
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: 0,
                      lineHeight: 1.25,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {activeLesson.title}
                  </h1>

                  {/* Target Companies & Tags */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                    {(activeLesson.companies ?? []).map((c: string) => (
                      <span
                        key={c}
                        className="mono"
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {/* CHANGE: Replaced emoji with Lucide Building2 icon */}
                        <Building2 style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
                        <span>{c}</span>
                      </span>
                    ))}
                    {(activeLesson.tags ?? []).map((t: string) => (
                      <span
                        key={t}
                        className="mono"
                        style={{
                          fontSize: '11px',
                          color: BRAND,
                          background: BRAND_L,
                          border: `1px solid ${BRAND_B}`,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {/* CHANGE: Replaced raw text with Lucide Hash icon */}
                        <Hash style={{ width: '11px', height: '11px', color: BRAND }} />
                        <span>{t}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Lesson Markdown Notes Body */}
                <div className="prose prose-invert max-w-none">
                  <LessonRenderer mdxSource={activeLesson.content || ''} />
                </div>

                {/* Concept Check / Quiz Block if available */}
                {activeLesson.quizzes && activeLesson.quizzes.length > 0 && (
                  <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <h2
                      className="bricolage"
                      style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}
                    >
                      Concept Check & Quiz
                    </h2>
                    {activeLesson.quizzes.map((quiz: any) => (
                      <QuizBlock key={quiz.id} quiz={quiz} />
                    ))}
                  </div>
                )}

                {/* Bottom Navigation Buttons (Prev / Next Lesson) */}
                <div
                  style={{
                    marginTop: '40px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  {prevLesson ? (
                    <button
                      onClick={() => handleSelectLesson(activeTrack.slug, prevLesson.slug)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'left',
                        maxWidth: '280px',
                        transition: 'all 120ms',
                      }}
                      className="hover:border-[#FF6600]"
                    >
                      <ArrowLeft style={{ width: '15px', height: '15px', color: BRAND, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>PREVIOUS</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {prevLesson.title}
                        </span>
                      </div>
                    </button>
                  ) : <div />}

                  {nextLesson ? (
                    <button
                      onClick={() => {
                        handleToggleComplete();
                        handleSelectLesson(activeTrack.slug, nextLesson.slug);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        background: BRAND,
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                        maxWidth: '320px',
                        marginLeft: 'auto',
                        transition: 'opacity 120ms',
                      }}
                      className="hover:opacity-90"
                    >
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', display: 'block' }}>NEXT LESSON</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {nextLesson.title}
                        </span>
                      </div>
                      <ArrowRight style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                      <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                      <span>Track completed!</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                Select a lesson from the left explorer to start reading notes.
              </div>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}

// ── Export Default Page with Suspense Boundary for useSearchParams ──────────
export default function LearnCurriculumPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 65px)' }}>
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      }
    >
      <VSCodeCurriculumWorkspace />
    </Suspense>
  );
}


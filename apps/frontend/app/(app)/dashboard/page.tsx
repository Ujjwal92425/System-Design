'use client';

/**
 * apps/frontend/app/(app)/dashboard/page.tsx
 *
 * Full-width, brand-cohesive SD-OS Architect Dashboard.
 * Displays curriculum progress, recent architecture canvases,
 * simulation engine launchpoints, resource quotas, and interview readiness.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/useAuth';
import { useTracks } from '@/features/learn/useLearn';
import { useUsage } from '@/features/usage/useUsage';
import { designsService } from '@/api-clients/designs';
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Flame,
  Layers,
  Sparkles,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  ShieldCheck,
  Zap,
  Clock,
  Compass,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface DesignItem {
  id: string;
  title: string;
  description?: string;
  updatedAt?: string;
  nodes?: any[];
  edges?: any[];
  isPublic?: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { tracks, loading: tracksLoading } = useTracks();
  const usage = useUsage();

  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);

  // Fetch recent user designs
  useEffect(() => {
    let mounted = true;
    designsService
      .list()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setDesigns(data);
        }
      })
      .catch(() => {
        if (mounted) setDesigns([]);
      })
      .finally(() => {
        if (mounted) setDesignsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const validTracks = tracks.filter((t) => t && t.slug);

  // Derived metrics
  const totalPct = validTracks.length
    ? validTracks.reduce((s, t) => s + (t.completedPct || 0), 0) / validTracks.length
    : 0;

  const activeTracksCount = validTracks.filter((t) => (t.completedPct || 0) > 0).length;

  // Active track to resume
  const activeTrack = validTracks.length
    ? validTracks.find((t) => (t.completedPct || 0) > 0 && (t.completedPct || 0) < 1) ??
      validTracks.find((t) => (t.completedPct || 0) === 0) ??
      validTracks[0]
    : null;

  if (tracksLoading && validTracks.length === 0) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-yc-accent animate-spin" />
        <p className="font-mono text-xs text-yc-text-muted">Loading your workbench...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12 py-8 flex flex-col gap-8 bg-yc-bg text-yc-text">
      {/* ── 1. Top Welcome & Action Header ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-yc-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard className="w-4 h-4 text-yc-accent" />
            <span className="font-mono text-[11px] font-bold text-yc-accent uppercase tracking-wider">
              WORKSPACE OVERVIEW
            </span>
            <span className="text-yc-border">&bull;</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-orange-500/10 text-yc-accent border border-orange-500/20">
              {user?.role === 'PRO' ? 'PRO ARCHITECT' : 'FREE TIER'}
            </span>
          </div>
          <h1
            className="text-3xl lg:text-4xl font-bold tracking-tight text-yc-text m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Welcome back, {user?.name || 'Architect'}
          </h1>
          <p className="text-sm text-yc-text-muted mt-1.5 max-w-2xl">
            Here is your live system design cockpit: active architecture diagrams, deterministic simulation telemetry, and curriculum tracks.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/build"
            data-track="dashboard:new_canvas"
            className="px-4 py-2.5 bg-yc-accent hover:bg-yc-accent-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Canvas</span>
          </Link>
          <Link
            href="/interview"
            data-track="dashboard:start_interview"
            className="px-4 py-2.5 bg-white hover:bg-yc-bg-alt text-yc-text border border-yc-border hover:border-yc-accent/40 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-yc-accent" />
            <span>Mock Interview</span>
          </Link>
        </div>
      </div>

      {/* ── 2. Top Metric Cards Strip (4 Full-Width Cards) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Progress */}
        <div className="bg-white border border-yc-border rounded-xl p-5 shadow-sm hover:border-yc-accent/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] font-bold text-yc-text-muted uppercase tracking-wider">
              CURRICULUM PROGRESS
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-yc-accent">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-yc-text">
                {Math.round(totalPct * 100)}%
              </span>
              <span className="text-xs text-yc-text-muted">completed</span>
            </div>
            <div className="w-full bg-yc-bg-card h-1.5 rounded-full mt-3 overflow-hidden border border-yc-border">
              <div
                className="bg-yc-accent h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(totalPct * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Active Tracks */}
        <div className="bg-white border border-yc-border rounded-xl p-5 shadow-sm hover:border-yc-accent/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] font-bold text-yc-text-muted uppercase tracking-wider">
              ACTIVE TRACKS
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-yc-accent">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-yc-text">
                {activeTracksCount}
              </span>
              <span className="text-xs text-yc-text-muted">/ {validTracks.length || 5} enrolled</span>
            </div>
            <p className="text-[11px] text-yc-text-secondary mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-yc-accent" />
              <span>Full 18-module distributed systems path</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Canvases & Studio */}
        <div className="bg-white border border-yc-border rounded-xl p-5 shadow-sm hover:border-yc-accent/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] font-bold text-yc-text-muted uppercase tracking-wider">
              ARCHITECTURE STUDIO
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-yc-accent">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-yc-text">
                {designs.length}
              </span>
              <span className="text-xs text-yc-text-muted">saved diagrams</span>
            </div>
            <p className="text-[11px] text-yc-text-secondary mt-3 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-yc-accent" />
              <span>Simulation engine ready</span>
            </p>
          </div>
        </div>

        {/* Metric 4: Free Tier Quotas & Streak */}
        <div className="bg-white border border-yc-border rounded-xl p-5 shadow-sm hover:border-yc-accent/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] font-bold text-yc-text-muted uppercase tracking-wider">
              RESOURCE QUOTA
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-yc-accent">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-mono">
                <span className="text-yc-text-secondary">Canvases</span>
                <span className="font-bold text-yc-text">
                  {usage.canvasCount} / {usage.canvasLimit}
                </span>
              </div>
              <div className="w-full bg-yc-bg-card h-1.5 rounded-full overflow-hidden border border-yc-border">
                <div
                  className="bg-yc-accent h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (usage.canvasCount / usage.canvasLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-mono">
                <span className="text-yc-text-secondary">Interviews</span>
                <span className="font-bold text-yc-text">
                  {usage.interviewCount} / {usage.interviewLimit}
                </span>
              </div>
              <div className="w-full bg-yc-bg-card h-1.5 rounded-full overflow-hidden border border-yc-border">
                <div
                  className="bg-yc-accent h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (usage.interviewCount / usage.interviewLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Main 2-Column Content Grid (8 cols left / 4 cols right) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column (Primary Workspace - 8 Cols) ────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Resume Learning Hero Banner */}
          {activeTrack && (
            <div className="bg-white border-2 border-yc-border hover:border-yc-accent/60 rounded-2xl p-6 lg:p-7 shadow-sm transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-yc-accent border border-orange-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                      UP NEXT IN YOUR PATH
                    </span>
                    <span className="text-xs text-yc-text-muted">&bull;</span>
                    <span className="font-mono text-xs text-yc-text-muted">
                      Level {activeTrack.level} Track
                    </span>
                  </div>
                  <h2
                    className="text-xl lg:text-2xl font-bold text-yc-text m-0"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {activeTrack.name}
                  </h2>
                  <p className="text-xs text-yc-text-secondary max-w-xl line-clamp-2">
                    {activeTrack.description}
                  </p>
                  <div className="flex items-center gap-4 pt-1 font-mono text-xs text-yc-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-yc-accent" />
                      {activeTrack.estimatedHours ?? 8} hours estimated
                    </span>
                    <span>&bull;</span>
                    <span>{Math.round((activeTrack.completedPct || 0) * 100)}% complete</span>
                  </div>
                </div>

                <Link
                  href={`/learn/${activeTrack.slug}`}
                  data-track="dashboard:resume_track"
                  className="px-5 py-3 bg-yc-accent hover:bg-yc-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 self-start sm:self-center"
                >
                  <span>Resume Lesson</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Recent Architecture Canvases Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-yc-text m-0">Recent Architecture Canvases</h3>
                <p className="text-xs text-yc-text-muted mt-0.5">
                  Visual designs with real-time distributed simulation and chaos injection.
                </p>
              </div>
              <Link
                href="/build"
                className="text-xs font-semibold text-yc-accent hover:text-yc-accent-hover flex items-center gap-1 transition-colors"
              >
                <span>View all in studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {designsLoading ? (
              <div className="bg-white border border-yc-border rounded-xl p-8 flex items-center justify-center gap-2 text-xs text-yc-text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-yc-accent" />
                <span>Loading your saved canvases...</span>
              </div>
            ) : designs.length === 0 ? (
              <div className="bg-white border border-dashed border-yc-border rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-yc-accent">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-yc-text m-0">No architecture diagrams yet</h4>
                  <p className="text-xs text-yc-text-muted mt-1 max-w-sm">
                    Design and simulate distributed systems on an interactive canvas with load balancers, caches, databases, and message queues.
                  </p>
                </div>
                <Link
                  href="/build"
                  data-track="dashboard:create_first_canvas"
                  className="px-4 py-2 bg-yc-accent hover:bg-yc-accent-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Canvas</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {designs.slice(0, 4).map((d) => (
                  <Link
                    key={d.id}
                    href={`/build/${d.id}`}
                    data-track="dashboard:open_canvas"
                    className="group bg-white border border-yc-border hover:border-yc-accent/50 rounded-xl p-4 shadow-sm transition-all flex flex-col justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-yc-text group-hover:text-yc-accent transition-colors truncate">
                          {d.title || 'Untitled Architecture'}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-yc-text-muted group-hover:text-yc-accent transition-colors flex-shrink-0" />
                      </div>
                      <p className="text-[11px] text-yc-text-muted line-clamp-2 m-0">
                        {d.description || 'Custom distributed system architecture diagram.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-yc-border/60 text-[10px] font-mono text-yc-text-muted">
                      <span>{d.nodes ? `${d.nodes.length} components` : 'Ready to edit'}</span>
                      <span>{d.isPublic ? 'Public Blueprint' : 'Private'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Curriculum Tracks Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-yc-text m-0">All Learning Tracks</h3>
                <p className="text-xs text-yc-text-muted mt-0.5">
                  18 structured modules from fundamentals to advanced cloud architectures.
                </p>
              </div>
              <Link
                href="/learn"
                className="text-xs font-semibold text-yc-accent hover:text-yc-accent-hover flex items-center gap-1 transition-colors"
              >
                <span>Browse curriculum</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {validTracks.map((track) => (
                <Link
                  key={track.slug}
                  href={`/learn/${track.slug}`}
                  data-track="dashboard:open_track"
                  className="group bg-white border border-yc-border hover:border-yc-accent/50 rounded-xl p-4 shadow-sm transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-gray-100 text-yc-text-secondary border border-yc-border">
                        Level {track.level}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-yc-accent">
                        {Math.round((track.completedPct || 0) * 100)}%
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-yc-text group-hover:text-yc-accent transition-colors m-0">
                      {track.name}
                    </h4>
                    <p className="text-xs text-yc-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {track.description}
                    </p>
                  </div>

                  <div className="w-full bg-yc-bg-card h-1 rounded-full overflow-hidden border border-yc-border">
                    <div
                      className="bg-yc-accent h-full rounded-full"
                      style={{ width: `${Math.round((track.completedPct || 0) * 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column (Sidebar Tools & Quick Launch - 4 Cols) ───────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Studio Launchpad */}
          <div className="bg-white border border-yc-border rounded-xl p-5 shadow-sm">
            <h4 className="text-xs font-mono font-bold text-yc-text uppercase tracking-wider mb-3">
              QUICK LAUNCHPAD
            </h4>
            <div className="flex flex-col gap-2">
              {[
                {
                  label: 'Architecture Canvas Studio',
                  desc: 'Draw nodes, add edges, inspect latency',
                  href: '/build',
                  icon: Layers,
                },
                {
                  label: 'Mock Interview Simulator',
                  desc: 'Timed real-world prompts with AI feedback',
                  href: '/interview',
                  icon: Sparkles,
                },
                {
                  label: 'Community Blueprints',
                  desc: 'Fork & study production architectures',
                  href: '/community',
                  icon: Compass,
                },
                {
                  label: 'Interactive Curriculum',
                  desc: 'Interactive lessons with quizzes & challenges',
                  href: '/learn',
                  icon: BookOpen,
                },
              ].map(({ label, desc, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  data-track="dashboard:quick_launch"
                  className="group flex items-start gap-3 p-3 rounded-lg border border-yc-border hover:border-yc-accent/40 hover:bg-yc-bg-alt transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-yc-accent flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-yc-text group-hover:text-yc-accent transition-colors block truncate">
                      {label}
                    </span>
                    <span className="text-[10px] text-yc-text-muted block truncate mt-0.5">
                      {desc}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* System Design Cheat-Sheet / Architect Tip */}
          <div className="bg-gradient-to-br from-orange-50/50 to-white border border-orange-200/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-yc-accent font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>ARCHITECT CHEAT-SHEET</span>
            </div>
            <h4 className="text-sm font-bold text-yc-text m-0 mb-1">
              Latency Numbers Every Engineer Should Know
            </h4>
            <p className="text-xs text-yc-text-secondary leading-relaxed mb-3">
              Designing scalable systems requires knowing hardware bottlenecks:
            </p>
            <ul className="space-y-1.5 font-mono text-[10px] text-yc-text-muted m-0 p-0 list-none">
              <li className="flex justify-between border-b border-orange-100 pb-1">
                <span>L1 Cache reference</span>
                <span className="font-bold text-yc-text">0.5 ns</span>
              </li>
              <li className="flex justify-between border-b border-orange-100 pb-1">
                <span>Main Memory (RAM) reference</span>
                <span className="font-bold text-yc-text">100 ns</span>
              </li>
              <li className="flex justify-between border-b border-orange-100 pb-1">
                <span>SSD Random Read</span>
                <span className="font-bold text-yc-text">16 &mu;s</span>
              </li>
              <li className="flex justify-between border-b border-orange-100 pb-1">
                <span>Same Data Center Round Trip</span>
                <span className="font-bold text-yc-text">0.5 ms</span>
              </li>
              <li className="flex justify-between">
                <span>Cross-Continent Network Packet</span>
                <span className="font-bold text-yc-text">150 ms</span>
              </li>
            </ul>
          </div>

          {/* Featured Community Blueprints */}
          <div className="bg-white border border-yc-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-mono font-bold text-yc-text uppercase tracking-wider m-0">
                TRENDING BLUEPRINTS
              </h4>
              <Link
                href="/community"
                className="text-[10px] font-semibold text-yc-accent hover:underline"
              >
                Explore all &rarr;
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                {
                  title: 'Distributed Rate Limiter (Token Bucket)',
                  author: 'system_guru',
                  stars: 142,
                  nodes: 8,
                },
                {
                  title: 'Global URL Shortener with GeoDNS',
                  author: 'alex_dist',
                  stars: 98,
                  nodes: 11,
                },
                {
                  title: 'Real-Time WebSocket Notification Bus',
                  author: 'sarah_cloud',
                  stars: 87,
                  nodes: 6,
                },
              ].map((bp, i) => (
                <Link
                  key={i}
                  href="/community"
                  className="p-2.5 rounded-lg border border-yc-border hover:border-yc-accent/40 bg-yc-bg-alt flex flex-col gap-1 transition-colors group"
                >
                  <span className="text-xs font-semibold text-yc-text group-hover:text-yc-accent transition-colors truncate">
                    {bp.title}
                  </span>
                  <div className="flex items-center justify-between text-[10px] font-mono text-yc-text-muted">
                    <span>@{bp.author}</span>
                    <span>{bp.nodes} nodes &bull; {bp.stars} stars</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth';
import {
  LayoutDashboard,
  BookOpen,
  PenTool,
  HelpCircle,
  Users,
  Settings,
  LogOut,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileOpen]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Learn Curriculum', href: '/learn', icon: BookOpen },
    { name: 'Build Canvas', href: '/build', icon: PenTool },
    { name: 'Practice Interviews', href: '/interview', icon: HelpCircle },
    { name: 'Community', href: '/community', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const desktopSidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-6">
        {/* Logo */}
        <Link href="/dashboard" className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2'} transition-all`}>
          <div className="w-8 h-8 rounded-lg bg-yc-accent flex items-center justify-center font-bold text-white flex-shrink-0 text-sm">
            Ω
          </div>
          <span className={`font-display font-semibold text-base text-yc-text transition-all duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            SD-OS
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col space-y-1" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-yc-accent/10 text-yc-accent'
                    : 'text-yc-text-muted hover:bg-yc-bg-card hover:text-yc-text'
                }`}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.name : undefined}
                data-track="sidebar:nav"
                data-track-page={item.href}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-yc-accent' : 'text-yc-text-muted'}`} />
                <span className={`transition-all duration-200 whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User section */}
      <div className={`space-y-3 pt-4 border-t border-yc-border`}>
        {user && (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-xl bg-yc-bg-card border border-yc-border`}>
            {collapsed ? (
              <div className="w-8 h-8 rounded-full bg-yc-accent/10 border border-yc-accent/20 flex items-center justify-center font-bold text-xs text-yc-accent flex-shrink-0">
                {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-yc-accent/10 border border-yc-accent/20 flex items-center justify-center font-bold text-xs text-yc-accent flex-shrink-0">
                    {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-yc-text truncate">
                      {user.name || 'OS User'}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5 text-yc-accent" />
                      <span className="text-[9px] text-yc-accent font-semibold uppercase tracking-wider">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-yc-text-muted hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  data-track="sidebar:logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-track="sidebar:toggle_collapse"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — collapsible */}
      <aside
        className={`app-sidebar-desktop border-r border-yc-border bg-yc-bg h-screen sticky top-0 flex-shrink-0 overflow-y-auto transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`p-3 ${collapsed ? 'px-2' : 'p-4'}`}>
          {desktopSidebarContent}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        id="mobile-app-sidebar"
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-yc-bg border-r border-yc-border shadow-xl transform transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation sidebar"
      >
        <div className="p-4 flex justify-end">
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation sidebar"
            className="p-1.5 rounded-lg text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-6 overflow-y-auto h-[calc(100%-60px)]">
          <div className="flex flex-col justify-between h-full">
            <div className="space-y-6">
              <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setMobileOpen(false)}>
                <div className="w-8 h-8 rounded-lg bg-yc-accent flex items-center justify-center font-bold text-white flex-shrink-0 text-sm">
                  Ω
                </div>
                <span className="font-display font-semibold text-base text-yc-text">SD-OS</span>
              </Link>
              <nav className="flex flex-col space-y-1" aria-label="Main navigation">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-yc-accent/10 text-yc-accent'
                          : 'text-yc-text-muted hover:bg-yc-bg-card hover:text-yc-text'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-yc-accent' : 'text-yc-text-muted'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            {user && (
              <div className="pt-4 border-t border-yc-border">
                <div className="flex items-center justify-between p-2 rounded-xl bg-yc-bg-card border border-yc-border">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-yc-accent/10 border border-yc-accent/20 flex items-center justify-center font-bold text-xs text-yc-accent flex-shrink-0">
                      {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-yc-text truncate">{user.name || 'OS User'}</p>
                      <div className="flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5 text-yc-accent" />
                        <span className="text-[9px] text-yc-accent font-semibold uppercase tracking-wider">{user.role}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => logout()}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-yc-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile toggle FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation sidebar"
        aria-expanded={mobileOpen}
        aria-controls="mobile-app-sidebar"
        className="app-sidebar-mobile-toggle fixed bottom-4 left-4 z-30 w-12 h-12 rounded-full bg-yc-accent text-white shadow-md flex items-center justify-center hover:bg-yc-accent-hover transition lg:hidden"
        data-track="sidebar:mobile_open"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>
    </>
  );
}

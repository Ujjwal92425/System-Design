'use client';

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
  Sparkles
} from 'lucide-react';

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Learn Curriculum', href: '/learn', icon: BookOpen },
    { name: 'Build Canvas', href: '/build', icon: PenTool },
    { name: 'Practice Interviews', href: '/interview', icon: HelpCircle },
    { name: 'Community', href: '/community', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-zinc-900 bg-zinc-950/60 backdrop-blur-md p-6 flex flex-col justify-between h-screen sticky top-0">
      <div className="space-y-8">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            Ω
          </div>
          <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            System Design OS
          </span>
        </Link>

        <nav className="flex flex-col space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 pt-4 border-t border-zinc-900">
        {user && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-900/50">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-400 flex-shrink-0">
                {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">
                  {user.name || 'OS User'}
                </p>
                <div className="flex items-center space-x-1">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

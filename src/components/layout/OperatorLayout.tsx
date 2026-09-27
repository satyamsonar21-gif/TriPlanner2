import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { LayoutDashboard, Compass, CalendarCheck, Users, Store, ShieldAlert, DollarSign, BarChart3, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { env } from '@/config/env';

export const OperatorLayout: React.FC = () => {
  const { user, role, loginAsDemoUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const navItems = [
    { to: '/operator/dashboard', label: 'Control Center', icon: LayoutDashboard },
    { to: '/operator/tours', label: 'Tour Packages', icon: Compass },
    { to: '/operator/bookings', label: 'Bookings Operations', icon: CalendarCheck },
    { to: '/operator/customers', label: 'Traveler Roster', icon: Users },
    { to: '/operator/vendors', label: 'Vendor Directory', icon: Store },
    { to: '/operator/changes', label: 'Disruption Center', icon: ShieldAlert },
    { to: '/operator/attention', label: 'Attention Center', icon: ShieldAlert },
    { to: '/operator/payments', label: 'Payments', icon: DollarSign },
    { to: '/operator/reports', label: 'Analytics', icon: BarChart3 },
    { to: '/operator/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground font-body">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-espresso/15 bg-deep-slate text-soft-ivory flex flex-col justify-between p-6 shrink-0 hidden md:flex">
        <div>
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-antique-brass text-deep-slate flex items-center justify-center font-display font-bold text-sm">
              OP
            </div>
            <div>
              <span className="font-display text-lg text-soft-ivory block leading-tight">
                SilkRoad Ops
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-antique-brass block">
                Tour Operations Engine
              </span>
            </div>
          </Link>

          <div className="mb-6 p-3 bg-espresso/60 border border-antique-brass/20 text-xs">
            <span className="font-mono text-[10px] uppercase text-stone-gray block">ACTIVE ROLE</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-semibold text-soft-ivory capitalize">{role}</span>
              {env.enableMockData && import.meta.env.DEV && (
                <button
                  onClick={() => loginAsDemoUser('traveler')}
                  className="font-mono text-[10px] text-antique-brass underline hover:text-soft-ivory"
                >
                  Switch Role
                </button>
              )}
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-terracotta text-soft-ivory'
                        : 'text-stone-gray hover:bg-espresso hover:text-soft-ivory'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-espresso/60">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'}
              alt="Avatar"
              className="w-8 h-8 border border-antique-brass/30 object-cover"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-soft-ivory truncate">{user?.full_name}</p>
              <p className="text-[10px] font-mono text-stone-gray truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-stone-gray/30 text-soft-ivory" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5" />
            SIGN OUT
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-espresso/15 bg-soft-ivory px-6 flex items-center justify-between md:hidden">
          <Link to="/" className="font-display text-lg text-deep-slate font-bold">
            Triplanner Ops
          </Link>
          <span className="font-mono text-xs text-terracotta uppercase">Operator Workspace</span>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

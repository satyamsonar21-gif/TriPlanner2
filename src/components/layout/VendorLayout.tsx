import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { Store, Calendar, MessageSquare, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const VendorLayout: React.FC = () => {
  const { user, role, loginAsDemoUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const navItems = [
    { to: '/vendor/dashboard', label: 'Vendor Overview', icon: Store },
    { to: '/vendor/bookings', label: 'Booking Requests', icon: Calendar },
    { to: '/vendor/availability', label: 'Inventory & Slots', icon: Calendar },
    { to: '/vendor/messages', label: 'Operator Messages', icon: MessageSquare },
    { to: '/vendor/profile', label: 'Vendor Profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground font-body">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-espresso/15 bg-parchment flex flex-col justify-between p-6 shrink-0 hidden md:flex">
        <div>
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-burnt-clay text-soft-ivory flex items-center justify-center font-display font-bold text-sm">
              VD
            </div>
            <div>
              <span className="font-display text-lg text-deep-slate block leading-tight">
                Grand Bosphorus
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray block">
                Vendor Portal
              </span>
            </div>
          </Link>

          <div className="mb-6 p-3 bg-soft-ivory border border-espresso/15 text-xs">
            <span className="font-mono text-[10px] uppercase text-stone-gray block">ROLE ACTIVE</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-semibold text-deep-slate capitalize">{role}</span>
              <button
                onClick={() => loginAsDemoUser('traveler')}
                className="font-mono text-[10px] text-terracotta underline hover:text-terracotta-hover"
              >
                Switch Role
              </button>
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
                        ? 'bg-burnt-clay text-soft-ivory'
                        : 'text-espresso hover:bg-soft-ivory hover:text-burnt-clay'
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
        <div className="pt-4 border-t border-espresso/15">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'}
              alt="Avatar"
              className="w-8 h-8 border border-espresso/20 object-cover"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-deep-slate truncate">{user?.full_name}</p>
              <p className="text-[10px] font-mono text-stone-gray truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5" />
            SIGN OUT
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-espresso/15 bg-soft-ivory px-6 flex items-center justify-between md:hidden">
          <Link to="/" className="font-display text-lg text-deep-slate font-bold">
            Vendor Portal
          </Link>
          <span className="font-mono text-xs text-burnt-clay uppercase">Vendor Workspace</span>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

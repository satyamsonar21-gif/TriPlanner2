import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import {
  Compass,
  Home,
  Briefcase,
  Ticket,
  Heart,
  Globe,
  Sliders,
  Wallet,
  Bell,
  HelpCircle,
  Search,
  ChevronDown,
  Crown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { MOCK_TRAVELER_PROFILE } from '@/domains/traveler/traveler.data';

export const TravelerLayout: React.FC = () => {
  const { loginAsDemoUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    await logout();
    setProfileDropdownOpen(false);
    navigate('/', { replace: true });
  };

  // Contextual search placeholder based on current active tab
  const getSearchPlaceholder = () => {
    const p = location.pathname;
    if (p.includes('/journeys')) return 'Search journeys, dates, destinations...';
    if (p.includes('/bookings')) return 'Search bookings, destinations, hotels...';
    if (p.includes('/saved')) return 'Search saved destinations, hotels, activities...';
    if (p.includes('/explore-destinations')) return 'Search destinations, experiences, regions...';
    if (p.includes('/payments')) return 'Search transactions, invoices, receipts...';
    if (p.includes('/notifications')) return 'Search alerts and notifications...';
    if (p.includes('/support')) return 'Search help articles, topics, FAQs...';
    return 'Search destinations, bookings...';
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/journeys', label: 'My Journeys', icon: Briefcase },
    { to: '/bookings', label: 'Bookings', icon: Ticket },
    { to: '/saved', label: 'Saved', icon: Heart },
    { to: '/explore-destinations', label: 'Explore Destinations', icon: Globe },
    { to: '/preferences', label: 'Preferences', icon: Sliders },
    { to: '/payments', label: 'Payments', icon: Wallet },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: 3 },
    { to: '/support', label: 'Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen flex bg-[#F7F3EE] text-[#1C1410] font-body selection:bg-terracotta/20">
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR                                             */}
      {/* ============================================================ */}
      <aside className="w-64 bg-[#FBF7F2] border-r border-[#33231E]/10 flex flex-col justify-between p-5 shrink-0 hidden lg:flex sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Top Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-7 focus:outline-none">
            <div className="w-8 h-8 rounded-full border border-terracotta/30 bg-terracotta/10 flex items-center justify-center text-terracotta shadow-2xs">
              <Compass className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <span className="font-display text-xl text-[#1C1410] font-bold tracking-tight block leading-none">
                TripPlanner
              </span>
              <span className="font-sans text-[10px] text-[#8A7B75] block mt-0.5 font-normal">
                Your journey, built around you.
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-[#EEDFD5] text-terracotta font-semibold shadow-2xs'
                        : 'text-[#33231E]/80 hover:bg-[#33231E]/5 hover:text-[#1C1410]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="w-4 h-4 rounded-full bg-terracotta text-soft-ivory text-[9px] font-bold flex items-center justify-center font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Lower Sidebar Promo & Premium Card */}
        <div className="space-y-3 pt-6 border-t border-[#33231E]/10">
          {/* Promo Card with Historic Skyline Illustration */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#EFE5DB] to-[#E3D6C8] border border-[#33231E]/15 p-4 text-center shadow-xs">
            <h4 className="font-display text-sm font-semibold text-[#1C1410] leading-tight mb-1">
              Plan Smarter. <br />
              Travel Better.
            </h4>
            <p className="text-[10px] text-[#8A7B75] leading-relaxed mb-3">
              Get personalized recommendations and real-time journey updates.
            </p>
            <Link to="/plan" className="block relative z-10">
              <button
                type="button"
                className="w-full py-1.5 px-3 rounded-md bg-terracotta hover:bg-terracotta-hover text-white text-[11px] font-medium transition-colors shadow-xs"
              >
                Create New Journey
              </button>
            </Link>

            {/* Faint Architectural Skyline Texture */}
            <div
              className="mt-3 -mx-4 -mb-4 h-16 opacity-30 bg-contain bg-bottom bg-no-repeat pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#8F321F 0.75px, transparent 0.75px), linear-gradient(to top, rgba(143, 50, 31, 0.2), transparent)',
                backgroundSize: '8px 8px, 100% 100%',
              }}
            />
          </div>

          {/* TripPlanner Premium Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#FFF9F3] border border-[#33231E]/10 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-antique-brass/20 flex items-center justify-center text-antique-brass">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-[11px] text-[#1C1410] block leading-none">
                  TripPlanner Premium
                </span>
                <span className="text-[9px] text-[#8A7B75] block mt-0.5">
                  Valid till 12 Dec 2025
                </span>
              </div>
            </div>
            <Link to="/preferences" className="text-[#8A7B75] hover:text-terracotta transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE SIDEBAR DRAWER                                        */}
      {/* ============================================================ */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-[#FBF7F2] p-5 shadow-2xl flex flex-col justify-between border-r border-espresso/20 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-espresso/15">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span className="font-display text-lg text-deep-slate font-bold">TripPlanner</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-stone-gray hover:text-espresso"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-colors ${
                          isActive
                            ? 'bg-[#EEDFD5] text-terracotta font-semibold'
                            : 'text-[#33231E]/80 hover:bg-[#33231E]/5 hover:text-[#1C1410]'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="w-4 h-4 rounded-full bg-terracotta text-soft-ivory text-[9px] font-bold flex items-center justify-center font-mono">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-espresso/15">
              <Link to="/plan" onClick={() => setMobileSidebarOpen(false)} className="block w-full">
                <button className="w-full py-2 bg-terracotta text-white rounded-md text-xs font-medium">
                  Create New Journey
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MAIN VIEWPORT AREA                                           */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* GLOBAL TOP HEADER */}
        <header className="sticky top-0 z-30 h-16 bg-[#FBF7F2]/90 backdrop-blur-md border-b border-[#33231E]/10 px-6 sm:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile Toggle & Page Context */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 text-[#33231E] hover:text-terracotta hover:bg-espresso/5 rounded-md"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <Link to="/dashboard" className="text-xs text-[#8A7B75] hover:text-terracotta transition-colors">
                Traveler Portal
              </Link>
              <span className="text-[#8A7B75] mx-1.5 text-xs">/</span>
              <span className="text-xs font-semibold text-[#1C1410] capitalize">
                {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Center/Right: Rounded Search Bar */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8A7B75] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getSearchPlaceholder()}
                className="w-full pl-9 pr-4 py-1.5 bg-[#FFF9F3] border border-[#33231E]/15 rounded-full text-xs text-[#1C1410] placeholder:text-[#8A7B75]/70 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Right Controls: Globe, Notifications & Profile */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Language / Globe Icon */}
            <button
              type="button"
              className="p-1.5 text-[#8A7B75] hover:text-terracotta hover:bg-[#33231E]/5 rounded-full transition-colors hidden sm:flex items-center justify-center"
              title="Change Language"
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <Link
              to="/notifications"
              className="relative p-1.5 text-[#8A7B75] hover:text-terracotta hover:bg-[#33231E]/5 rounded-full transition-colors flex items-center justify-center"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-terracotta ring-2 ring-[#FBF7F2]" />
            </Link>

            {/* User Profile Dropdown Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#33231E]/5 transition-colors focus:outline-none"
              >
                <img
                  src={MOCK_TRAVELER_PROFILE.avatar}
                  alt={MOCK_TRAVELER_PROFILE.name}
                  className="w-8 h-8 rounded-full border border-terracotta/30 object-cover shadow-2xs"
                />
                <div className="hidden md:block text-left pr-1">
                  <span className="font-semibold text-xs text-[#1C1410] block leading-tight">
                    {MOCK_TRAVELER_PROFILE.name}
                  </span>
                  <span className="text-[10px] text-[#8A7B75] block leading-tight">
                    {MOCK_TRAVELER_PROFILE.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8A7B75] hidden md:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[#FFF9F3] border border-[#33231E]/15 rounded-xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-[#33231E]/10">
                    <p className="font-semibold text-xs text-[#1C1410]">{MOCK_TRAVELER_PROFILE.name}</p>
                    <p className="text-[10px] text-[#8A7B75] truncate">{MOCK_TRAVELER_PROFILE.email}</p>
                    <span className="inline-block mt-1 font-mono text-[9px] bg-terracotta/10 text-terracotta px-1.5 py-0.5 rounded font-semibold">
                      PREMIUM TRAVELER
                    </span>
                  </div>

                  <div className="py-1 text-xs">
                    <Link
                      to="/preferences"
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#33231E]/5 text-[#33231E] rounded-md transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-stone-gray" />
                      Traveler Preferences
                    </Link>
                    <Link
                      to="/payments"
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#33231E]/5 text-[#33231E] rounded-md transition-colors"
                    >
                      <Wallet className="w-3.5 h-3.5 text-stone-gray" />
                      Payments & Invoices
                    </Link>
                    <button
                      type="button"
                      onClick={() => loginAsDemoUser('operator')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#33231E]/5 text-terracotta rounded-md transition-colors text-left"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Switch to Demo Operator
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#33231E]/10">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-stone-gray hover:text-terracotta hover:bg-[#33231E]/5 rounded-md transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { buttonVariants } from '@/components/ui/button';
import { Menu, X, ArrowUpRight, User as UserIcon, LayoutDashboard, LogOut } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardUrl =
    user?.role === 'operator' || user?.role === 'coordinator'
      ? '/operator/dashboard'
      : user?.role === 'vendor'
      ? '/vendor/dashboard'
      : '/dashboard';

  const handleSignOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 24) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobile menu is closed on link clicks directly

  const navLinks = [
    { label: 'Explore', href: '/explore' },
    { label: 'Experiences', href: '/#experiences' },
    { label: 'Plan Your Trip', href: '/plan' },
    { label: 'How It Works', href: '/#how-it-works' },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-soft-ivory/95 backdrop-blur-md border-b border-espresso/15 shadow-sm py-3'
            : 'bg-transparent border-b border-espresso/10 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          {/* LEFT: Brand / Logo Treatment */}
          <Link
            to="/"
            className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            aria-label="Triplanner Home"
          >
            <div className="w-9 h-9 bg-terracotta text-soft-ivory flex items-center justify-center font-display font-bold text-base shadow-sm transition-transform duration-200 group-hover:scale-105 rounded-lg">
              TP
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl tracking-tight text-deep-slate leading-none font-medium">
                Triplanner
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray mt-0.5">
                LIVING JOURNEY ENGINE™
              </span>
            </div>
          </Link>

          {/* CENTER: Navigation Links (Desktop) */}
          <nav
            className="hidden md:flex items-center gap-8 lg:gap-10 font-body text-sm font-medium tracking-wide text-espresso"
            aria-label="Main Navigation"
          >
            {navLinks.map((link) => {
              const isInternalAnchor = link.href.startsWith('/#');
              if (isInternalAnchor) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className="relative py-1 text-espresso/80 hover:text-terracotta transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                  >
                    {link.label}
                  </a>
                );
              }
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`relative py-1 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
                    isActive ? 'text-terracotta font-semibold' : 'text-espresso/80 hover:text-terracotta'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-terracotta rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT: Primary CTA & Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={dashboardUrl}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider border border-[#33231E]/20 text-[#1C1410] hover:bg-[#F3E8DC] transition-colors h-8 px-3 rounded-none font-semibold"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-terracotta" />
                  <span>My Dashboard</span>
                </Link>
                <div className="hidden lg:flex items-center gap-2 text-xs font-mono border border-espresso/20 px-3 py-1 bg-parchment/60 rounded-md">
                  <UserIcon className="w-3.5 h-3.5 text-terracotta" />
                  <span className="text-espresso font-medium truncate max-w-[120px]">{user.full_name}</span>
                  <span className="text-stone-gray text-[10px]">({user.role})</span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="ml-2 text-stone-gray hover:text-terracotta underline text-[10px]"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/auth/login"
                  className="text-xs font-mono uppercase tracking-wider text-espresso hover:text-terracotta transition-colors px-3 py-2 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/login?mode=signup"
                  className="text-xs font-mono uppercase tracking-wider text-terracotta border border-terracotta/40 hover:bg-terracotta hover:text-white transition-all px-3 py-1.5 rounded-md font-medium"
                >
                  Create Account
                </Link>
              </div>
            )}

            {/* Primary Action Button */}
            <Link
              to="/plan"
              className={buttonVariants({
                variant: 'primary',
                size: 'md',
                className: 'hidden sm:inline-flex items-center gap-2 bg-terracotta hover:bg-terracotta-hover text-soft-ivory text-xs uppercase tracking-wider font-mono font-medium px-4 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 rounded-lg',
              })}
            >
              <span>Build My Journey</span>
              <ArrowUpRight className="w-4 h-4 opacity-90" />
            </Link>

            {/* Compact Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-espresso hover:text-terracotta hover:bg-parchment focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER / OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-deep-slate/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        >
          <div
            className="fixed top-0 right-0 w-full max-w-xs h-full bg-soft-ivory p-6 shadow-2xl flex flex-col justify-between border-l border-espresso/20"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-espresso/15 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-terracotta text-soft-ivory flex items-center justify-center font-display font-bold text-xs">
                    TP
                  </div>
                  <span className="font-display text-lg text-deep-slate">Triplanner</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-stone-gray hover:text-espresso"
                  aria-label="Close Navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col space-y-4 font-body text-base">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-espresso hover:text-terracotta transition-colors py-2 border-b border-espresso/5 font-medium"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  to="/destinations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-espresso hover:text-terracotta transition-colors py-2 border-b border-espresso/5 font-medium"
                >
                  All Destinations
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-stone-gray hover:text-espresso transition-colors py-2 text-sm"
                >
                  Traveler Workspace
                </Link>
                <Link
                  to="/operator/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-stone-gray hover:text-espresso transition-colors py-2 text-sm"
                >
                  Operator Portal
                </Link>
              </nav>
            </div>

            <div className="pt-6 border-t border-espresso/15 space-y-3">
              <Link
                to="/plan"
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({
                  variant: 'primary',
                  className: 'w-full justify-center text-xs uppercase tracking-wider font-mono py-3',
                })}
              >
                Build My Journey
              </Link>

              {user ? (
                <div className="space-y-3 pt-2">
                  <Link
                    to={dashboardUrl}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#FAF4ED] border border-[#33231E]/20 text-xs font-mono uppercase tracking-wider text-[#1C1410] font-semibold"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-terracotta" />
                    <span>Go to My Dashboard</span>
                  </Link>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono text-stone-gray truncate max-w-[160px]">
                      {user.full_name} ({user.role})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="text-xs text-terracotta font-mono uppercase underline flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full block py-2.5 px-4 text-center rounded-lg border border-[#33231E]/20 text-xs font-mono uppercase tracking-wider text-[#1C1410] font-medium hover:bg-parchment"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/login?mode=signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full block py-2.5 px-4 text-center rounded-lg bg-terracotta text-soft-ivory text-xs font-mono uppercase tracking-wider font-semibold"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

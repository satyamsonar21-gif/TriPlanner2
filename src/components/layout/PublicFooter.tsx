import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-parchment border-t border-espresso/15 text-espresso font-body">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 pb-12 border-b border-espresso/15">
          {/* Brand & Mission Statement */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-terracotta text-soft-ivory flex items-center justify-center font-display font-bold text-sm">
                TP
              </div>
              <span className="font-display text-xl tracking-tight text-deep-slate font-medium">
                Triplanner
              </span>
            </Link>
            <p className="text-stone-gray text-xs leading-relaxed max-w-sm">
              The Living Journey Engine™ turns fragmented travel bookings into connected, adaptive travel operations. Built for travelers who value time and operators who run seamless journeys.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-gray">
                Living Engine v1.4 • Deterministic Sync Active
              </span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-stone-gray font-semibold mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/plan" className="hover:text-terracotta transition-colors">
                  Plan Your Trip
                </Link>
              </li>
              <li>
                <Link to="/explore" className="hover:text-terracotta transition-colors">
                  Explore Destinations
                </Link>
              </li>
              <li>
                <a href="/#experiences" className="hover:text-terracotta transition-colors">
                  Curated Experiences
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-terracotta transition-colors">
                  Living Engine Architecture
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-terracotta transition-colors">
                  My Journeys
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Operators */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-stone-gray font-semibold mb-4">
              Operators
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/operator/dashboard" className="hover:text-terracotta transition-colors">
                  Operations Center
                </Link>
              </li>
              <li>
                <Link to="/operators" className="hover:text-terracotta transition-colors">
                  Partner Directory
                </Link>
              </li>
              <li>
                <a href="/#operator-intelligence" className="hover:text-terracotta transition-colors">
                  Conflict Monitoring
                </a>
              </li>
              <li>
                <Link to="/onboarding/operator-setup" className="hover:text-terracotta transition-colors">
                  Operator Setup
                </Link>
              </li>
              <li>
                <Link to="/vendor/dashboard" className="hover:text-terracotta transition-colors">
                  Vendor Network
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-stone-gray font-semibold mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="/#trust-principles" className="hover:text-terracotta transition-colors">
                  About Triplanner
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-terracotta transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#trust-principles" className="hover:text-terracotta transition-colors">
                  Reliability Standards
                </a>
              </li>
              <li>
                <a href="mailto:support@triplanner.travel" className="hover:text-terracotta transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Standards */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-stone-gray font-semibold mb-4">
              Legal & Trust
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <span className="text-stone-gray hover:text-espresso cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-stone-gray hover:text-espresso cursor-pointer">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="text-stone-gray hover:text-espresso cursor-pointer">
                  Cancellation Transparency
                </span>
              </li>
              <li>
                <span className="text-stone-gray hover:text-espresso cursor-pointer">
                  Cookie Preferences
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-gray">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-terracotta" />
            <span className="font-display font-medium text-deep-slate">Triplanner</span>
            <span className="font-mono text-[10px] uppercase tracking-wider">
              • Personalized Dynamic Tour Planning & Tour Operations Platform
            </span>
          </div>

          <p className="font-mono text-[11px]">
            © {new Date().getFullYear()} Triplanner Systems Inc. Built for thoughtful travelers.
          </p>
        </div>
      </div>
    </footer>
  );
};

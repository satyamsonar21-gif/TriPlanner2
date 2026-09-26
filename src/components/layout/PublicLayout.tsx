import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-body selection:bg-terracotta/20 selection:text-deep-slate">
      {/* Editorial Top Navigation */}
      <PublicNavbar />

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Editorial Footer */}
      <PublicFooter />
    </div>
  );
};

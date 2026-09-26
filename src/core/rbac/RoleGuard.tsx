import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import type { UserRole } from '@/types/database.types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = [],
  requireAuth = true,
}) => {
  const { role, status, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-body">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono tracking-widest text-stone-gray uppercase">
            VERIFYING CREDENTIALS...
          </p>
        </div>
      </div>
    );
  }

  // 1. Authentication check
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 2. Account state check (Security requirement #24)
  if (isAuthenticated && status && (status === 'suspended' || status === 'deactivated')) {
    return (
      <Navigate
        to={`/auth/unauthorized?reason=${status}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // 3. Server-authoritative role check (Security requirements #13 & #14)
  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return (
      <Navigate
        to="/auth/unauthorized?reason=role"
        state={{ from: location, requiredRoles: allowedRoles }}
        replace
      />
    );
  }

  return <>{children}</>;
};

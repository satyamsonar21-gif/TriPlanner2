import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { User, Profile, UserRole, AccountStatus } from '@/types/database.types';
import { supabase } from '@/config/supabase';
import { env } from '@/config/env';
import { AuthService, type AuthResponse } from './auth.service';
import type { FormattedAuthError } from './auth-error-mapper';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  status: AccountStatus | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: FormattedAuthError | null;
  clearAuthError: () => void;
  // Actions
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse<{ userId: string; emailVerificationRequired: boolean }>>;
  signIn: (email: string, password: string) => Promise<AuthResponse<{ userId: string }>>;
  signInWithGoogle: (redirectTo?: string) => Promise<AuthResponse<{ url?: string }>>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResponse<{ success: boolean }>>;
  updatePassword: (newPassword: string) => Promise<AuthResponse<{ success: boolean }>>;
  resendVerification: (email: string) => Promise<AuthResponse<{ success: boolean }>>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'display_name' | 'phone' | 'avatar_url'>>) => Promise<AuthResponse<Profile>>;
  loginAsDemoUser: (role: UserRole) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<FormattedAuthError | null>(null);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Fetch application profile from database and sync user object
  const syncProfile = useCallback(async (userId: string, authEmail?: string) => {
    try {
      const res = await AuthService.getProfile(userId);
      if (res.data) {
        setProfile(res.data);
        setUser({
          id: res.data.id,
          email: res.data.email,
          full_name: res.data.full_name,
          avatar_url: res.data.avatar_url || undefined,
          role: res.data.role,
          status: res.data.status,
          organization_id: res.data.organization_id || undefined,
          created_at: res.data.created_at,
          updated_at: res.data.updated_at,
        });
      } else if (authEmail) {
        // Fallback profile if record is still pending trigger execution
        const fallbackProfile: Profile = {
          id: userId,
          auth_user_id: userId,
          email: authEmail,
          full_name: authEmail.split('@')[0],
          display_name: authEmail.split('@')[0],
          avatar_url: null,
          phone: null,
          role: 'traveler',
          status: 'active',
          organization_id: null,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        setUser({
          id: userId,
          email: authEmail,
          full_name: fallbackProfile.full_name,
          role: 'traveler',
          status: 'active',
          created_at: fallbackProfile.created_at,
          updated_at: fallbackProfile.updated_at,
        });
      }
    } catch (err) {
      console.warn('[AuthContext] syncProfile error:', err);
    }
  }, []);

  // Refresh profile action
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await syncProfile(user.id, user.email);
    }
  }, [user, syncProfile]);

  // Initial session restoration
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (supabase && env.isSupabaseConfigured) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (mounted && initialSession?.user) {
            setSession(initialSession);
            await syncProfile(initialSession.user.id, initialSession.user.email);
            return;
          }
        }

        // Check for stored demo role session in localStorage
        const savedRole = localStorage.getItem('triplanner_user_role') as UserRole | null;
        if (mounted && savedRole) {
          const demo = AuthService.getMockProfileForRole(savedRole);
          setProfile(demo);
          setUser({
            id: demo.id,
            email: demo.email,
            full_name: demo.full_name,
            avatar_url: demo.avatar_url || undefined,
            role: demo.role,
            status: demo.status,
            organization_id: demo.organization_id || undefined,
            created_at: demo.created_at,
            updated_at: demo.updated_at,
          });
        } else if (mounted) {
          // Default unauthenticated visitor: starts on public landing page
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.warn('[AuthContext] Auth initialization failed:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    // Supabase Auth listener
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabase && env.isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!mounted) return;

          setSession(newSession);
          if (newSession?.user) {
            await syncProfile(newSession.user.id, newSession.user.email);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
          }
          setIsLoading(false);
        }
      );
      authSubscription = subscription;
    }

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, [syncProfile]);

  // Auth Operations
  const signUp = async (email: string, password: string, fullName: string) => {
    setAuthError(null);
    const res = await AuthService.signUpWithPassword(email, password, fullName);
    if (res.error) {
      setAuthError(res.error);
    } else if (res.data?.userId && !res.data.emailVerificationRequired) {
      await syncProfile(res.data.userId, email);
    }
    return res;
  };

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    const res = await AuthService.signInWithPassword(email, password);
    if (res.error) {
      setAuthError(res.error);
    } else if (res.data?.userId) {
      await syncProfile(res.data.userId, email);
    }
    return res;
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    setAuthError(null);
    const res = await AuthService.signInWithGoogle(redirectTo);
    if (res.error) {
      setAuthError(res.error);
    }
    return res;
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      localStorage.removeItem('triplanner_user_role');
      await AuthService.signOut();
    } catch {
      // Ignore network errors on mock logout
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    const res = await AuthService.resetPasswordForEmail(email);
    if (res.error) {
      setAuthError(res.error);
    }
    return res;
  };

  const updatePassword = async (newPassword: string) => {
    setAuthError(null);
    const res = await AuthService.updateUserPassword(newPassword);
    if (res.error) {
      setAuthError(res.error);
    }
    return res;
  };

  const resendVerification = async (email: string) => {
    setAuthError(null);
    const res = await AuthService.resendVerificationEmail(email);
    if (res.error) {
      setAuthError(res.error);
    }
    return res;
  };

  const updateProfile = async (
    updates: Partial<Pick<Profile, 'full_name' | 'display_name' | 'phone' | 'avatar_url'>>
  ) => {
    if (!user) {
      return {
        data: null,
        error: { message: 'Not authenticated', code: 'UNAUTHENTICATED' },
      };
    }
    const res = await AuthService.updateProfile(user.id, updates);
    const updatedProfile = res.data;
    if (updatedProfile) {
      setProfile(updatedProfile);
      setUser((prev) => (prev ? { ...prev, full_name: updatedProfile.full_name } : null));
    }
    return res;
  };

  const loginAsDemoUser = (targetRole: UserRole) => {
    try {
      localStorage.setItem('triplanner_user_role', targetRole);
    } catch {
      // localstorage quota safety
    }
    const demo = AuthService.getMockProfileForRole(targetRole);
    setProfile(demo);
    setUser({
      id: demo.id,
      email: demo.email,
      full_name: demo.full_name,
      avatar_url: demo.avatar_url || undefined,
      role: demo.role,
      status: demo.status,
      organization_id: demo.organization_id || undefined,
      created_at: demo.created_at,
      updated_at: demo.updated_at,
    });
    setSession(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || user?.role || null,
        status: profile?.status || user?.status || null,
        session,
        isAuthenticated: Boolean(user),
        isLoading,
        authError,
        clearAuthError,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        logout: signOut,
        resetPassword,
        updatePassword,
        resendVerification,
        refreshProfile,
        updateProfile,
        loginAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from './useAuth';

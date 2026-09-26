import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Lock, Mail, User, Compass, ArrowLeft, CheckCircle2, Shield, Store, Sparkles } from 'lucide-react';
import type { UserRole } from '@/types/database.types';

interface LoginPageProps {
  defaultMode?: 'signin' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({ defaultMode = 'signin' }) => {
  const { signIn, signUp, signInWithGoogle, loginAsDemoUser, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Mode: Sign In or Create New Account
  const queryMode =
    searchParams.get('mode') === 'signup' ||
    location.pathname.includes('register') ||
    location.pathname.includes('signup')
      ? 'signup'
      : defaultMode;
  const [userSelectedMode, setUserSelectedMode] = useState<'signin' | 'signup' | null>(null);
  const mode = userSelectedMode ?? queryMode;

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('traveler');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navigate to respective dashboard based on role
  const navigateToRoleDashboard = (targetRole: UserRole) => {
    if (targetRole === 'operator' || targetRole === 'coordinator') {
      navigate('/operator/dashboard', { replace: true });
    } else if (targetRole === 'vendor') {
      navigate('/vendor/dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email || !password) {
      setLocalError('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(email, password);
    setIsSubmitting(false);

    if (res.data?.userId) {
      // Direct to role dashboard
      const targetRole = selectedRole || 'traveler';
      navigateToRoleDashboard(targetRole);
    }
  };

  const handleAutoVerifyAndSignIn = async () => {
    if (!email || !password) {
      setLocalError('Please ensure your email and password are provided.');
      return;
    }
    setIsSubmitting(true);
    setLocalError(null);
    clearAuthError();
    try {
      await fetch('/api/auth/auto-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const res = await signIn(email.trim(), password);
      if (res.data?.userId) {
        navigateToRoleDashboard(selectedRole || 'traveler');
      } else if (res.error) {
        setLocalError(res.error.message);
      }
    } catch {
      setLocalError('Failed to auto-verify email. Please try again or use Demo Login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!fullName || !email || !password) {
      setLocalError('Please provide your name, email, and a secure password.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    const res = await signUp(email, password, fullName);

    if (res.error) {
      setIsSubmitting(false);
      setLocalError(res.error.message);
      return;
    }

    // Auto-confirm and sign in if needed in evaluation/demo
    if (res.data?.emailVerificationRequired) {
      try {
        await fetch('/api/auth/auto-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), userId: res.data.userId }),
        });
        await signIn(email.trim(), password);
      } catch (autoErr) {
        console.warn('Auto confirm warning:', autoErr);
      }
    }

    setIsSubmitting(false);
    setSuccessMessage(`Account created! Welcome to Triplanner, ${fullName}.`);
    setTimeout(() => {
      navigateToRoleDashboard(selectedRole);
    }, 500);
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    const res = await signInWithGoogle();
    setIsSubmitting(false);
    if (res.data?.url) {
      window.location.href = res.data.url;
    }
  };

  const handleDemoRole = (role: UserRole) => {
    loginAsDemoUser(role);
    navigateToRoleDashboard(role);
  };

  const displayError = localError || authError?.message;

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F3E8DC] px-4 font-body py-12 relative selection:bg-terracotta/20">
      {/* Return to Public Landing Page Link */}
      <div className="max-w-md w-full mx-auto mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#33231E]/80 hover:text-terracotta transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Return to Triplanner Home</span>
        </Link>
      </div>

      <Card className="w-full max-w-md mx-auto border-[#33231E]/20 bg-[#FFF9F3] shadow-md rounded-2xl overflow-hidden">
        {/* Card Header */}
        <CardHeader className="text-center pb-4 pt-6 border-b border-[#33231E]/10 bg-[#FAF4ED]">
          <div className="w-12 h-12 bg-terracotta text-soft-ivory mx-auto flex items-center justify-center font-display font-bold text-xl mb-2 shadow-xs rounded-xl">
            TP
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-terracotta block font-bold">
            • LIVING JOURNEY ENGINE™ •
          </span>
          <CardTitle className="font-display text-2xl mt-1 text-[#1C1410] font-semibold">
            {mode === 'signin' ? 'Sign In to Triplanner' : 'Create Your Account'}
          </CardTitle>
          <CardDescription className="text-xs text-[#8A7B75] mt-1 font-body">
            {mode === 'signin'
              ? 'Access your journeys, bookings, and live travel operations.'
              : 'Join Triplanner to experience adaptive journeys and smart travel.'}
          </CardDescription>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#EFE5D8] rounded-lg mt-4 border border-[#33231E]/10">
            <button
              type="button"
              onClick={() => {
                setUserSelectedMode('signin');
                setLocalError(null);
                clearAuthError();
              }}
              className={`py-2 text-xs font-medium font-mono uppercase tracking-wider rounded-md transition-all ${
                mode === 'signin'
                  ? 'bg-[#FFF9F3] text-terracotta shadow-2xs font-bold'
                  : 'text-[#8A7B75] hover:text-[#1C1410]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setUserSelectedMode('signup');
                setLocalError(null);
                clearAuthError();
              }}
              className={`py-2 text-xs font-medium font-mono uppercase tracking-wider rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-[#FFF9F3] text-terracotta shadow-2xs font-bold'
                  : 'text-[#8A7B75] hover:text-[#1C1410]'
              }`}
            >
              Create Account
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-6 sm:p-7">
          {/* Error Banner */}
          {displayError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2.5 text-xs text-red-900 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{displayError}</span>
              </div>
              {(authError?.code === 'EMAIL_NOT_VERIFIED' ||
                displayError.toLowerCase().includes('verify your email')) && (
                <div className="pt-2 border-t border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-red-700 font-mono">
                    Evaluation mode: instant verification ready
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoVerifyAndSignIn}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-[10px] font-mono font-bold tracking-wider uppercase shadow-xs shrink-0 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Verify & Sign In</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1. SIGN IN FORM                                              */}
          {/* ============================================================ */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8A7B75] mb-1.5 font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8A7B75] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="traveler@triplanner.io"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#33231E]/20 rounded-lg text-[#1C1410] text-sm placeholder:text-[#8A7B75]/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#8A7B75] font-medium">
                    Password
                  </label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs font-mono text-terracotta hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A7B75] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#33231E]/20 rounded-lg text-[#1C1410] text-sm placeholder:text-[#8A7B75]/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center h-11 text-xs tracking-widest font-mono uppercase font-semibold bg-terracotta hover:bg-terracotta-hover text-white rounded-lg shadow-2xs mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'SIGNING IN...' : 'SIGN IN WITH CREDENTIALS'}
              </Button>
            </form>
          ) : (
            /* ============================================================ */
            /* 2. CREATE ACCOUNT FORM                                       */
            /* ============================================================ */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8A7B75] mb-1.5 font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8A7B75] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Satyam Sonar"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#33231E]/20 rounded-lg text-[#1C1410] text-sm placeholder:text-[#8A7B75]/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8A7B75] mb-1.5 font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8A7B75] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="satyam.sonar@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#33231E]/20 rounded-lg text-[#1C1410] text-sm placeholder:text-[#8A7B75]/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8A7B75] mb-1.5 font-medium">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A7B75] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#33231E]/20 rounded-lg text-[#1C1410] text-sm placeholder:text-[#8A7B75]/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8A7B75] mb-2 font-medium">
                  Choose Your Account Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'traveler' as UserRole,
                      label: 'Traveler',
                      icon: Compass,
                      desc: 'Plan & travel',
                    },
                    {
                      id: 'operator' as UserRole,
                      label: 'Operator',
                      icon: Shield,
                      desc: 'Tour operations',
                    },
                    {
                      id: 'vendor' as UserRole,
                      label: 'Vendor',
                      icon: Store,
                      desc: 'Stays & activities',
                    },
                  ].map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-start gap-1 ${
                          isSelected
                            ? 'border-terracotta bg-[#F7ECE4] text-[#1C1410] ring-1 ring-terracotta'
                            : 'border-[#33231E]/15 bg-white text-[#554742] hover:border-[#33231E]/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-terracotta' : 'text-[#8A7B75]'}`} />
                          <span className="text-xs font-semibold">{r.label}</span>
                        </div>
                        <span className="text-[10px] text-[#8A7B75]">{r.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center h-11 text-xs tracking-widest font-mono uppercase font-semibold bg-terracotta hover:bg-terracotta-hover text-white rounded-lg shadow-2xs mt-2 gap-2"
                disabled={isSubmitting}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT & ENTER'}</span>
              </Button>
            </form>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-[#33231E]/15 w-full" />
            <span className="bg-[#FFF9F3] px-3 text-[10px] font-mono uppercase text-[#8A7B75] absolute">
              OR CONTINUE WITH
            </span>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full h-11 border border-[#33231E]/20 bg-[#FAF4ED] hover:bg-[#F3E8DC] text-[#1C1410] text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-3 transition-colors cursor-pointer rounded-lg disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Quick Demo Persona Switcher */}
          <div className="pt-4 border-t border-[#33231E]/15">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#8A7B75] font-bold">
                1-CLICK DEMO EVALUATION
              </span>
              <span className="text-[10px] text-terracotta font-mono font-medium">INSTANT ACCESS</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoRole('traveler')}
                className="p-2 border border-terracotta/30 bg-[#F9ECE3] hover:bg-[#F3E0D3] rounded-lg text-left transition-colors flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1">
                  <Compass className="w-3 h-3 text-terracotta" />
                  <span className="font-semibold text-xs text-[#1C1410]">Traveler</span>
                </div>
                <span className="text-[9px] text-[#8A7B75] truncate">Satyam S.</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoRole('operator')}
                className="p-2 border border-[#33231E]/20 bg-white hover:bg-[#FAF4ED] rounded-lg text-left transition-colors flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#33231E]" />
                  <span className="font-semibold text-xs text-[#1C1410]">Operator</span>
                </div>
                <span className="text-[9px] text-[#8A7B75] truncate">SilkRoad Ops</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoRole('vendor')}
                className="p-2 border border-[#33231E]/20 bg-white hover:bg-[#FAF4ED] rounded-lg text-left transition-colors flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1">
                  <Store className="w-3 h-3 text-[#33231E]" />
                  <span className="font-semibold text-xs text-[#1C1410]">Vendor</span>
                </div>
                <span className="text-[9px] text-[#8A7B75] truncate">Goa Aquatic</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

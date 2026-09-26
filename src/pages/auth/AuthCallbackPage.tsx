import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { supabase } from '@/config/supabase';
import { env } from '@/config/env';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AuthCallbackPage: React.FC = () => {
  const { role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function processCallback() {
      try {
        if (supabase && env.isSupabaseConfigured) {
          // Exchange auth code or hash if present
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            if (active) setErrorMessage('Unable to establish identity session from OAuth callback.');
            return;
          }

          if (data.session) {
            await refreshProfile();
            // Profile refreshed, role determined
            const userRole = role || 'traveler';
            if (active) {
              if (userRole === 'operator' || userRole === 'coordinator') {
                navigate('/operator/dashboard', { replace: true });
              } else if (userRole === 'vendor') {
                navigate('/vendor/dashboard', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            }
          } else {
            // Check hash error parameters
            const hash = window.location.hash;
            if (hash.includes('error_description=')) {
              const params = new URLSearchParams(hash.replace('#', '?'));
              const desc = params.get('error_description') || 'Authentication cancelled or failed.';
              if (active) setErrorMessage(decodeURIComponent(desc));
            } else {
              // Direct to login
              if (active) navigate('/auth/login', { replace: true });
            }
          }
        } else {
          // Fallback / mock mode
          if (active) navigate('/dashboard', { replace: true });
        }
      } catch {
        if (active) setErrorMessage('Unexpected error processing authentication callback.');
      }
    }

    processCallback();

    return () => {
      active = false;
    };
  }, [navigate, refreshProfile, role]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body">
      <div className="text-center max-w-sm w-full p-8 bg-soft-ivory border border-espresso/20 shadow-md">
        {errorMessage ? (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-burnt-clay/10 border border-burnt-clay/30 text-burnt-clay mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg text-deep-slate">Authentication Error</h3>
            <p className="text-xs text-stone-gray leading-relaxed">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth/login', { replace: true })}
              className="mt-2 text-xs"
            >
              RETURN TO LOGIN
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-8 h-8 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-gray block">
                AUTHENTICATING
              </span>
              <p className="font-display text-base text-deep-slate font-medium mt-1">
                Synchronizing Passport Identity...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

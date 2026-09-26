import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const isSuspended = reason === 'suspended' || reason === 'deactivated';

  const handleReturnHome = () => {
    if (role === 'operator' || role === 'coordinator') {
      navigate('/operator/dashboard');
    } else if (role === 'vendor') {
      navigate('/vendor/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body py-12">
      <Card className="w-full max-w-md border-burnt-clay/30 bg-soft-ivory shadow-md text-center">
        <CardHeader className="pb-4">
          <div className="w-14 h-14 bg-burnt-clay/10 border border-burnt-clay/30 text-burnt-clay mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-burnt-clay font-bold block">
            ACCESS RESTRICTED
          </span>
          <CardTitle className="text-2xl mt-1">
            {isSuspended ? 'Account Inactive' : 'Authorization Required'}
          </CardTitle>
          <CardDescription className="text-xs text-stone-gray mt-2 leading-relaxed">
            {isSuspended
              ? 'This account has been flagged as suspended or deactivated by system administration.'
              : `Your current passport role (${role?.toUpperCase() || 'TRAVELER'}) does not possess permission to access this operational zone.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 bg-parchment/60 border border-espresso/10 text-xs text-stone-gray text-left">
            <span className="font-mono text-[10px] uppercase text-stone-gray block mb-1">
              SECURITY AUDIT NOTICE
            </span>
            <p className="text-[11px] leading-relaxed">
              All unauthorized navigational and data access requests are cryptographically audited server-side via PostgreSQL Row-Level Security.
            </p>
          </div>

          <div className="space-y-3">
            {!isSuspended && (
              <Button
                variant="primary"
                onClick={handleReturnHome}
                className="w-full justify-center gap-2 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                RETURN TO PERMITTED WORKSPACE
              </Button>
            )}

            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                navigate('/auth/login');
              }}
              className="w-full justify-center gap-2 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              SIGN IN WITH DIFFERENT CREDENTIALS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

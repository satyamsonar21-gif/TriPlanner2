import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MailCheck, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const { resendVerification } = useAuth();

  const email = (location.state as { email?: string })?.email || 'your email address';
  const [cooldown, setCooldown] = useState<number>(0);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resendStatus === 'sending' || !email.includes('@')) return;

    setResendStatus('sending');
    await resendVerification(email);
    setResendStatus('sent');
    setCooldown(60); // 60 seconds cooldown
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body py-12">
      <Card className="w-full max-w-md border-espresso/20 shadow-md text-center">
        <CardHeader className="pb-4">
          <div className="w-14 h-14 bg-parchment border border-espresso/20 text-terracotta mx-auto flex items-center justify-center mb-4">
            <MailCheck className="w-7 h-7" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-gray block">
            PASSPORT SECURITY VERIFICATION
          </span>
          <CardTitle className="text-2xl mt-1">Check Your Email</CardTitle>
          <CardDescription className="text-xs text-stone-gray mt-2 leading-relaxed">
            We have dispatched an official verification link to:
            <br />
            <strong className="text-deep-slate font-mono text-sm mt-1 inline-block">
              {email}
            </strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 bg-parchment/60 border border-espresso/10 text-xs text-stone-gray text-left space-y-2">
            <p>
              Please open the link contained in the email to activate your Living Journey Engine™ passport.
            </p>
            <p className="text-[11px] font-mono text-stone-gray/80">
              Note: If you do not see the message within 2 minutes, please inspect your spam or junk folder.
            </p>
          </div>

          {resendStatus === 'sent' && (
            <div className="p-3 bg-[#2D5A37]/10 border border-[#2D5A37]/30 flex items-center justify-center gap-2 text-xs text-[#2D5A37]">
              <CheckCircle2 className="w-4 h-4" />
              <span>A fresh verification link has been dispatched.</span>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={cooldown > 0 || resendStatus === 'sending'}
              className="w-full justify-center gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendStatus === 'sending' ? 'animate-spin' : ''}`} />
              {cooldown > 0
                ? `RESEND IN ${cooldown}s`
                : resendStatus === 'sending'
                ? 'DISPATCHING LINK...'
                : 'RESEND VERIFICATION EMAIL'}
            </Button>

            <Link
              to="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-gray hover:text-terracotta transition-colors pt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

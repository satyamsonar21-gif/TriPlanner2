import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Check, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!isPasswordValid) {
      setLocalError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setIsSubmitting(true);
    const res = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (res.data?.success) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/auth/login');
      }, 2500);
    }
  };

  const displayError = localError || authError?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body py-12">
      <Card className="w-full max-w-md border-espresso/20 shadow-md">
        <CardHeader className="text-center pb-6">
          <div className="w-12 h-12 bg-parchment border border-espresso/20 text-terracotta mx-auto flex items-center justify-center font-display font-bold text-xl mb-3 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-terracotta block">
            SECURITY CREDENTIALS UPDATE
          </span>
          <CardTitle className="text-2xl mt-1">Set New Password</CardTitle>
          <CardDescription>
            Choose a strong new password for your Triplanner account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isSuccess ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 bg-[#2D5A37]/10 text-[#2D5A37] border border-[#2D5A37]/30 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-display text-xl text-deep-slate font-medium">
                Password Successfully Updated
              </h4>
              <p className="text-xs text-stone-gray leading-relaxed">
                Your credentials have been securely refreshed. Redirecting you to sign in...
              </p>
              <Link to="/auth/login">
                <Button variant="primary" size="sm" className="mt-2 text-xs">
                  CONTINUE TO SIGN IN NOW
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {displayError && (
                <div className="p-3.5 bg-burnt-clay/10 border border-burnt-clay/30 flex items-start gap-2.5 text-xs text-deep-slate animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-burnt-clay shrink-0 mt-0.5" />
                  <span>{displayError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-stone-gray mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-gray absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-soft-ivory border border-espresso/20 text-deep-slate text-sm placeholder:text-stone-gray/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                      disabled={isSubmitting}
                    />
                  </div>

                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1 text-[11px] font-mono text-stone-gray p-2.5 bg-parchment/60 border border-espresso/10">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#2D5A37]' : 'text-stone-gray'}`}>
                        <Check className={`w-3 h-3 ${hasMinLength ? 'text-[#2D5A37]' : 'opacity-40'}`} />
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-[#2D5A37]' : 'text-stone-gray'}`}>
                        <Check className={`w-3 h-3 ${hasLetter ? 'text-[#2D5A37]' : 'opacity-40'}`} />
                        <span>Includes letters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-[#2D5A37]' : 'text-stone-gray'}`}>
                        <Check className={`w-3 h-3 ${hasNumber ? 'text-[#2D5A37]' : 'opacity-40'}`} />
                        <span>Includes numbers</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-stone-gray mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-gray absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-soft-ivory border border-espresso/20 text-deep-slate text-sm placeholder:text-stone-gray/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center h-11 text-xs tracking-widest mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'UPDATING CREDENTIALS...' : 'SAVE NEW PASSWORD'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    await resetPassword(email.trim());
    setIsSubmitting(false);
    // Neutral success response to prevent account enumeration (Requirement #22)
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body py-12">
      <Card className="w-full max-w-md border-espresso/20 shadow-md">
        <CardHeader className="text-center pb-6">
          <div className="w-12 h-12 bg-parchment border border-espresso/20 text-terracotta mx-auto flex items-center justify-center font-display font-bold text-xl mb-3 shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-terracotta block">
            CREDENTIAL RECOVERY
          </span>
          <CardTitle className="text-2xl mt-1">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your account email and we will send you instructions to safely reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-[#2D5A37]/10 border border-[#2D5A37]/30 text-xs text-[#2D5A37] text-left flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-deep-slate text-sm mb-1">Check Your Inbox</h5>
                  <p className="text-stone-gray">
                    If an account is associated with <strong className="text-deep-slate">{email}</strong>, a secure password reset link has been dispatched.
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-gray leading-relaxed">
                The link will expire in 60 minutes for security purposes.
              </p>

              <div className="pt-2">
                <Link to="/auth/login">
                  <Button variant="outline" className="w-full justify-center text-xs">
                    RETURN TO SIGN IN
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-gray mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-gray absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="traveler@triplanner.io"
                    className="w-full pl-9 pr-3 py-2 bg-soft-ivory border border-espresso/20 text-deep-slate text-sm placeholder:text-stone-gray/60 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center h-11 text-xs tracking-widest"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'DISPATCHING LINK...' : 'SEND RECOVERY LINK'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-gray hover:text-terracotta transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

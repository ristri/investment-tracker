import React, { useState } from 'react';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function AuthModal() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.username}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
      {/* Subtle ambient blur */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Hero */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <BrandMark size={52} className="mb-2" />
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Artha Investment Tracker</h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Point-in-time tracking for Stocks, US Equities, SGBs, Mutual Funds, EPF, PPF, and FDs.
          </p>
        </div>

        {/* Auth Card */}
        <div className="card-surface p-6 sm:p-8 rounded-card shadow-2xl space-y-5 border border-surface-border">
          <div className="border-b border-surface-border pb-3">
            <h3 className="font-bold text-base text-foreground">
              Sign In to Your Portfolio
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1.5">Username</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-muted/60 border border-surface-border rounded-tile pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted/60 border border-surface-border rounded-tile pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full font-bold shadow-md shadow-primary/20 gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

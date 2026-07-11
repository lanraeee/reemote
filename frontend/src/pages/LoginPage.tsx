import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', totpCode: '' });
  const [showTOTP, setShowTOTP] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!formData.email || !formData.password) { setLocalError('Email and password are required'); return; }
    setIsLoading(true);
    try {
      await login(formData.email, formData.password, formData.totpCode || undefined);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 400 && formData.totpCode === '') {
        setShowTOTP(true);
        setLocalError('Please enter your 2FA code');
      } else {
        setLocalError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12 overflow-hidden bg-[#080d1a]">

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-float absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="animate-float-delay absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="animate-float-slow absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-in">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 mb-5">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Reemote</h1>
          <p className="text-slate-400 text-sm">VM Management Platform</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 shadow-2xl shadow-black/40">

          {/* Error */}
          {displayError && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-in">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-300">{displayError}</span>
            </div>
          )}

          {/* Email */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="you@example.com" disabled={isLoading} required
                className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/60 focus:bg-white/8 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 disabled:opacity-50 text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password" name="password" value={formData.password} onChange={handleChange}
                placeholder="••••••••••••" disabled={isLoading} required
                className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/60 focus:bg-white/8 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 disabled:opacity-50 text-sm"
              />
            </div>
          </div>

          {/* TOTP */}
          {showTOTP && (
            <div className="mt-5 p-4 rounded-xl bg-blue-500/8 border border-blue-500/20 animate-slide-in">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Authenticator Code</label>
              <input
                type="text" name="totpCode" value={formData.totpCode} onChange={handleChange}
                placeholder="000 000" maxLength={6} disabled={isLoading}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-center text-xl tracking-[0.5em] font-mono disabled:opacity-50"
              />
              <p className="text-xs text-blue-400/80 mt-2 text-center">Enter the 6-digit code from your authenticator app</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={isLoading}
            className="w-full mt-8 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating…
              </>
            ) : (
              <>
                Sign In
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 mt-6">
            Need access?{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Contact your administrator</a>
          </p>
        </form>

        {/* Footer badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-600 text-xs">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Protected by enterprise-grade encryption
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    totpCode: '',
  });
  const [showTOTP, setShowTOTP] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!formData.email || !formData.password) {
      setLocalError('Email and password are required');
      return;
    }

    setIsLoading(true);

    try {
      await login(
        formData.email,
        formData.password,
        formData.totpCode || undefined
      );
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 400 && formData.totpCode === '') {
        setShowTOTP(true);
        setLocalError('Please enter your 2FA code');
      } else {
        setLocalError(
          err.response?.data?.message || 'Login failed. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
            Reemote
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">Remote Desktop VM Management</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700">
          {/* Error Message */}
          {(error || localError) && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm animate-slide-in">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error || localError}</span>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50 transition-all duration-200"
              required
            />
          </div>

          {/* Password Field */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50 transition-all duration-200"
              required
            />
          </div>

          {/* TOTP Field */}
          {showTOTP && (
            <div className="mb-5 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-slide-in">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                2FA Code
              </label>
              <input
                type="text"
                name="totpCode"
                value={formData.totpCode}
                onChange={handleChange}
                placeholder="000000"
                maxLength={6}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50 transition-all duration-200"
              />
              <p className="text-xs text-blue-300 mt-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
                Enter the 6-digit code from your authenticator
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Footer */}
          <p className="text-center text-xs sm:text-sm text-slate-400 mt-6">
            Don't have an account?{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Contact your administrator
            </a>
          </p>
        </form>

        {/* Info Box */}
        <div className="mt-6 sm:mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-center">
          <p className="text-xs text-slate-400">
            💡 Demo credentials are provided by your administrator
          </p>
        </div>
      </div>
    </div>
  );
}

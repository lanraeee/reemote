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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Reemote</h1>
          <p className="text-gray-400">Remote Desktop VM Management</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Error Message */}
          {(error || localError) && (
            <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">
              {error || localError}
            </div>
          )}

          {/* Email Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
              required
            />
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
              required
            />
          </div>

          {/* TOTP Field */}
          {showTOTP && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300 font-medium">
              Contact your administrator
            </a>
          </p>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg text-center">
          <p className="text-xs text-gray-400">
            Demo: Use credentials provided by your administrator
          </p>
        </div>
      </div>
    </div>
  );
}

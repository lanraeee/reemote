import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2 text-sm sm:text-base">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-8 min-w-min sm:min-w-0">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'security', label: 'Security' },
            { id: 'preferences', label: 'Preferences' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-2">Your email address cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Account Type
            </label>
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-medium">
              {user?.isAdmin ? '👑 Administrator' : '👤 Standard User'}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Two-Factor Authentication
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-slate-600">Secure your account with 2FA</p>
                <p className="text-sm text-slate-500 mt-1">
                  Use an authenticator app like Google Authenticator
                </p>
              </div>
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap">
                Enable 2FA
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.429 5.951 1.429a1 1 0 001.169-1.409l-7-14z" />
              </svg>
              Change Password
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Minimum 12 characters with uppercase, lowercase, numbers, and symbols
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Update Password
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Active Sessions
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Current Session</p>
                  <p className="text-sm text-slate-500">Last active: just now</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full whitespace-nowrap">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Console Theme
            </label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white text-slate-900">
              <option>Dark (Default)</option>
              <option>Light</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Console Resolution
            </label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white text-slate-900">
              <option>Auto (Recommended)</option>
              <option>1024x768</option>
              <option>1280x1024</option>
              <option>1920x1440</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Compression Level
            </label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white text-slate-900">
              <option>Balanced (Default)</option>
              <option>High Quality</option>
              <option>High Compression</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Higher compression reduces bandwidth but may increase latency
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="notifications" className="ml-3 text-sm text-slate-700 font-medium">
                Enable session notifications
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}

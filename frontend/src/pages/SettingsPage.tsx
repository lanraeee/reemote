import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth';

const TABS = [
  { id: 'profile',     label: 'Profile',     icon: '👤' },
  { id: 'security',    label: 'Security',    icon: '🔐' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️' },
];

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <span className="text-slate-400">{icon}</span>
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 outline-none transition-all duration-200 text-sm";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'RM';

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your account and application preferences</p>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="space-y-5 animate-slide-in">
          <SectionCard title="Account Information"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          >
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25 flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{user?.email}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${user?.isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user?.isAdmin ? 'Administrator' : 'Standard User'}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="Email Address" hint="Your email address cannot be changed.">
                <input type="email" value={user?.email || ''} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
              </Field>
              <Field label="Account Type">
                <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${user?.isAdmin ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                  {user?.isAdmin ? '👑 Administrator — Full system access' : '👤 Standard User — Limited access'}
                </div>
              </Field>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="space-y-5 animate-slide-in">
          <SectionCard title="Two-Factor Authentication"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-700 font-medium">Add an extra layer of security</p>
                <p className="text-xs text-slate-500 mt-1">Use Google Authenticator or any TOTP-compatible app</p>
              </div>
              <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shadow-sm shadow-blue-600/20">
                Enable 2FA
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Change Password"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
          >
            <form className="space-y-4">
              <Field label="Current Password">
                <input type="password" className={inputCls} placeholder="••••••••••••" />
              </Field>
              <Field label="New Password" hint="Minimum 12 characters with mixed case, numbers and symbols.">
                <input type="password" className={inputCls} placeholder="••••••••••••" />
              </Field>
              <Field label="Confirm Password">
                <input type="password" className={inputCls} placeholder="••••••••••••" />
              </Field>
              <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                Update Password
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Active Sessions"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20m0 0l-.75 3M9 20H5m14 0a9 9 0 10-18 0" /></svg>}
          >
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20m0 0l-.75 3M9 20H5m14 0a9 9 0 10-18 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Current Session</p>
                  <p className="text-xs text-slate-500">Active just now</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full pulse-dot" />
                Live
              </span>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-5 animate-slide-in">
          <SectionCard title="Console Settings"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20m0 0l-.75 3M9 20H5m14 0a9 9 0 10-18 0" /></svg>}
          >
            <div className="space-y-5">
              <Field label="Theme">
                <select className={inputCls}>
                  <option>Dark (Default)</option>
                  <option>Light</option>
                </select>
              </Field>
              <Field label="Resolution">
                <select className={inputCls}>
                  <option>Auto (Recommended)</option>
                  <option>1024×768</option>
                  <option>1280×1024</option>
                  <option>1920×1440</option>
                </select>
              </Field>
              <Field label="Compression" hint="Higher compression reduces bandwidth but may increase latency.">
                <select className={inputCls}>
                  <option>Balanced (Default)</option>
                  <option>High Quality</option>
                  <option>High Compression</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Notifications"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          >
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <p className="text-sm font-medium text-slate-900">Session notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">Get notified when sessions start or end</p>
              </div>
              <div className="relative ml-4">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-6 bg-slate-200 peer-checked:bg-blue-600 rounded-full transition-colors duration-200" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
              </div>
            </label>
          </SectionCard>

          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}

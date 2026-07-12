import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import apiClient from '../services/api';

const TABS = [
  { id: 'profile',     label: 'Profile',     icon: '👤' },
  { id: 'security',    label: 'Security',    icon: '🔐' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  { id: 'email',       label: 'Email Tools', icon: '✉️' },
  { id: 'containers',  label: 'Containers',  icon: '🐳', adminOnly: true },
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

type ValidationResult = {
  valid: boolean;
  email: string;
  domain?: string;
  checks: { format: boolean; mx: boolean; disposable: boolean };
  mx_records?: { exchange: string; priority: number }[];
  reason?: string | null;
} | null;

function EmailToolsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [validateEmail, setValidateEmail] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>(null);
  const [validateError, setValidateError] = useState('');

  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendReplyTo, setSendReplyTo] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message?: string } | null>(null);

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail.trim()) return;
    setValidating(true);
    setValidationResult(null);
    setValidateError('');
    try {
      const result = await apiClient.validateEmail(validateEmail.trim());
      setValidationResult(result);
    } catch (err: any) {
      setValidateError(err?.response?.data?.error || 'Validation failed');
    } finally {
      setValidating(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!sendTo.trim() || !sendSubject.trim() || !sendBody.trim()) return;
    setSending(true);
    setSendResult(null);
    const recipients = sendTo.split(',').map(e => e.trim()).filter(Boolean);
    try {
      const result = await apiClient.sendEmail(recipients, sendSubject.trim(), sendBody.trim(), undefined, sendReplyTo.trim() || undefined);
      setSendResult({ success: true, message: `Sent to ${result.recipients} recipient${result.recipients !== 1 ? 's' : ''}` });
      setSendTo(''); setSendSubject(''); setSendBody(''); setSendReplyTo('');
    } catch (err: any) {
      setSendResult({ success: false, message: err?.response?.data?.error || 'Send failed' });
    } finally {
      setSending(false);
    }
  }

  const checkIcon = (ok: boolean) =>
    ok ? (
      <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        Pass
      </span>
    ) : (
      <span className="flex items-center gap-1 text-red-500 font-medium text-xs">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        Fail
      </span>
    );

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Validator */}
      <SectionCard
        title="Email Validator"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <form onSubmit={handleValidate} className="space-y-4">
          <Field label="Email Address">
            <div className="flex gap-2">
              <input
                type="text"
                value={validateEmail}
                onChange={e => setValidateEmail(e.target.value)}
                placeholder="user@example.com"
                className={`${inputCls} flex-1`}
              />
              <button
                type="submit"
                disabled={validating || !validateEmail.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                {validating ? 'Checking…' : 'Validate'}
              </button>
            </div>
          </Field>

          {validateError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{validateError}</p>
          )}

          {validationResult && (
            <div className={`rounded-xl border p-4 ${validationResult.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${validationResult.valid ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {validationResult.valid
                    ? <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                </div>
                <p className={`text-sm font-semibold ${validationResult.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                  {validationResult.valid ? 'Valid email address' : 'Invalid email address'}
                </p>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Format check</span>
                  {checkIcon(validationResult.checks.format)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">MX records (mail server)</span>
                  {checkIcon(validationResult.checks.mx)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Not disposable</span>
                  {checkIcon(validationResult.checks.disposable)}
                </div>
              </div>
              {validationResult.reason && (
                <p className="text-xs text-red-700 mt-2">{validationResult.reason}</p>
              )}
              {validationResult.mx_records && validationResult.mx_records.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1.5">MX Records</p>
                  {validationResult.mx_records.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-mono bg-white/60 px-1.5 py-0.5 rounded">{r.priority}</span>
                      <span className="font-mono">{r.exchange}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </SectionCard>

      {/* Sender — admin only */}
      {isAdmin ? (
        <SectionCard
          title="Send Email"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        >
          <form onSubmit={handleSend} className="space-y-4">
            <Field label="To" hint="Comma-separate multiple recipients (max 50)">
              <input
                type="text"
                value={sendTo}
                onChange={e => setSendTo(e.target.value)}
                placeholder="alice@example.com, bob@example.com"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Reply-To (optional)">
              <input
                type="email"
                value={sendReplyTo}
                onChange={e => setSendReplyTo(e.target.value)}
                placeholder="support@yourdomain.com"
                className={inputCls}
              />
            </Field>
            <Field label="Subject">
              <input
                type="text"
                value={sendSubject}
                onChange={e => setSendSubject(e.target.value)}
                placeholder="Your subject line"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Message Body">
              <textarea
                value={sendBody}
                onChange={e => setSendBody(e.target.value)}
                placeholder="Write your message here…"
                rows={6}
                className={`${inputCls} resize-none`}
                required
              />
            </Field>

            {sendResult && (
              <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${sendResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {sendResult.message}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !sendTo.trim() || !sendSubject.trim() || !sendBody.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20"
            >
              {sending ? 'Sending…' : 'Send email'}
            </button>
          </form>
        </SectionCard>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
          Email sending is available to administrators only.
        </div>
      )}
    </div>
  );
}

type ContainerInfo = {
  id: string;
  fullId: string;
  name: string;
  image: string;
  state: string;
  status: string;
  vmId: string;
  osType: string;
  vncPort: number | null;
};

function ContainersPanel() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [provisionVmId, setProvisionVmId] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('reemote');
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/containers');
      setContainers(res.data.containers || []);
    } catch (err: any) {
      if (err?.response?.status === 500 && err?.response?.data?.error?.includes('connect ENOENT')) {
        setError('Docker socket not available — Reemote Connect must be running as a Docker container with the Docker socket mounted.');
      } else {
        setError(err?.response?.data?.error || 'Failed to load containers');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  async function handleContainerAction(containerId: string, action: 'start' | 'stop') {
    setActionId(containerId);
    try {
      await apiClient.post(`/admin/containers?containerId=${containerId}&action=${action}`);
      await fetchContainers();
    } catch (err: any) {
      alert(err?.response?.data?.error || `Failed to ${action} container`);
    } finally {
      setActionId(null);
    }
  }

  async function handleRemove(containerId: string) {
    if (!confirm('Remove this container? All data inside will be lost.')) return;
    setActionId(containerId);
    try {
      await apiClient.delete(`/admin/containers?containerId=${containerId}`);
      await fetchContainers();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to remove container');
    } finally {
      setActionId(null);
    }
  }

  async function handleProvision(e: React.FormEvent) {
    e.preventDefault();
    if (!provisionVmId.trim()) return;
    setProvisioning(true);
    setProvisionResult(null);
    try {
      const res = await apiClient.post('/admin/containers', { vmId: provisionVmId.trim(), vncPassword: provisionPassword });
      setProvisionResult({ success: true, message: `Container provisioned — websockify port ${res.data.hostPort}` });
      setProvisionVmId('');
      setProvisionPassword('reemote');
      await fetchContainers();
    } catch (err: any) {
      setProvisionResult({ success: false, message: err?.response?.data?.error || 'Provisioning failed' });
    } finally {
      setProvisioning(false);
    }
  }

  const stateColor: Record<string, string> = {
    running: 'bg-emerald-400',
    exited:  'bg-slate-400',
    paused:  'bg-amber-400',
    created: 'bg-blue-400',
  };

  return (
    <div className="space-y-5 animate-slide-in">
      <SectionCard
        title="OS Containers"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>}
      >
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-500 py-4">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Loading containers…
          </div>
        ) : error ? (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{error}</div>
        ) : containers.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No OS containers running. Provision one below.</p>
        ) : (
          <div className="space-y-2">
            {containers.map(c => (
              <div key={c.fullId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stateColor[c.state] || 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 truncate">{c.osType} — {c.status}{c.vncPort ? ` — ws port ${c.vncPort}` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {c.state === 'running' ? (
                    <button
                      onClick={() => handleContainerAction(c.id, 'stop')}
                      disabled={actionId === c.id}
                      className="px-2.5 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => handleContainerAction(c.id, 'start')}
                      disabled={actionId === c.id}
                      className="px-2.5 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={actionId === c.id}
                    className="px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={fetchContainers}
          className="mt-4 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Refresh list
        </button>
      </SectionCard>

      <SectionCard
        title="Provision Container"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
      >
        <p className="text-xs text-slate-500 mb-4">
          Provision a Docker OS container for a VM. The VM's OS type determines the image used.
          The container's websockify port will be stored as the VM's VNC port.
        </p>
        <form onSubmit={handleProvision} className="space-y-4">
          <Field label="VM ID">
            <input
              type="text"
              value={provisionVmId}
              onChange={e => setProvisionVmId(e.target.value)}
              placeholder="Paste the VM's UUID from the dashboard"
              className={inputCls}
              required
            />
          </Field>
          <Field label="VNC Password" hint="Password users will use to authenticate to the VNC session.">
            <input
              type="text"
              value={provisionPassword}
              onChange={e => setProvisionPassword(e.target.value)}
              placeholder="reemote"
              className={inputCls}
            />
          </Field>

          {provisionResult && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${provisionResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {provisionResult.message}
            </div>
          )}

          <button
            type="submit"
            disabled={provisioning || !provisionVmId.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20"
          >
            {provisioning ? 'Provisioning…' : 'Provision container'}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Build OS Images"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
      >
        <p className="text-xs text-slate-500 mb-3">
          Run this on the Reemote Connect server to build all OS images before provisioning containers.
        </p>
        <pre className="bg-slate-900 text-emerald-400 text-xs rounded-xl px-4 py-3 overflow-x-auto font-mono">
          docker compose run --rm os-builder
        </pre>
        <p className="text-xs text-slate-400 mt-2">
          Images: Ubuntu 22.04, Ubuntu 20.04, Debian 12, CentOS 9 (AlmaLinux), Fedora 39, Alpine 3
        </p>
      </SectionCard>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'RM';

  const visibleTabs = TABS.filter((t: any) => !t.adminOnly || user?.isAdmin);

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your account and application preferences</p>
      </div>

      {/* Tab pills */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-xl w-fit">
        {visibleTabs.map(t => (
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

      {/* Email Tools */}
      {activeTab === 'email' && (
        <EmailToolsPanel isAdmin={user?.isAdmin ?? false} />
      )}

      {/* Containers — admin only */}
      {activeTab === 'containers' && user?.isAdmin && (
        <ContainersPanel />
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

interface VM {
  id: string;
  name: string;
  hostname: string;
  power_state: string;
  vcpu: number;
  memory_mb: number;
  disk_gb: number;
  created_at: string;
}

const STATE_CONFIG: Record<string, { label: string; dot: string; badge: string; bar: string }> = {
  running: { label: 'Running',  dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', bar: 'from-emerald-500 to-green-400' },
  stopped: { label: 'Stopped',  dot: 'bg-slate-500',   badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   bar: 'from-slate-500 to-slate-400' },
  paused:  { label: 'Paused',   dot: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   bar: 'from-amber-500 to-yellow-400' },
  error:   { label: 'Error',    dot: 'bg-red-400',     badge: 'bg-red-500/10 text-red-400 border-red-500/20',         bar: 'from-red-500 to-red-400' },
};
const getState = (s: string) => STATE_CONFIG[s] ?? STATE_CONFIG.stopped;

function StatCard({ label, value, sub, gradient, icon }: {
  label: string; value: string | number; sub?: string;
  gradient: string; icon: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 ${gradient} shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/70 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white flex-shrink-0">
          {icon}
        </div>
      </div>
      {/* Decorative circle */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/8" />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [vms, setVms] = useState<VM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listVMs()
      .then(d => { setVms(d.vms || []); setError(null); })
      .catch(e => setError(e.message || 'Failed to load VMs'))
      .finally(() => setLoading(false));
  }, []);

  const running = vms.filter(v => v.power_state === 'running').length;
  const stopped = vms.filter(v => v.power_state === 'stopped').length;
  const totalRam = (vms.reduce((s, v) => s + v.memory_mb, 0) / 1024).toFixed(1);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Welcome back, <span className="font-semibold text-slate-700">{user?.email}</span>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 animate-slide-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total VMs" value={vms.length} sub="All virtual machines"
            gradient="bg-gradient-to-br from-blue-600 to-blue-500"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>}
          />
          <StatCard label="Running" value={running} sub={`${vms.length ? Math.round(running/vms.length*100) : 0}% active`}
            gradient="bg-gradient-to-br from-emerald-600 to-emerald-500"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3l14 9-14 9V3z" /></svg>}
          />
          <StatCard label="Stopped" value={stopped} sub="Inactive machines"
            gradient="bg-gradient-to-br from-slate-700 to-slate-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" /></svg>}
          />
          <StatCard label="Total RAM" value={`${totalRam} GB`} sub="Allocated memory"
            gradient="bg-gradient-to-br from-purple-600 to-purple-500"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>}
          />
        </div>
      )}

      {/* VM Cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Virtual Machines</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 skeleton rounded w-2/3 mb-3" />
                <div className="h-3 skeleton rounded w-1/3 mb-6" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-3 skeleton rounded" />)}
                </div>
              </div>
            ))
          ) : vms.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <p className="font-semibold text-slate-700">No virtual machines</p>
              <p className="text-sm text-slate-500 mt-1">Add your first VM to get started</p>
            </div>
          ) : (
            vms.map((vm) => {
              const state = getState(vm.power_state);
              const memGB = (vm.memory_mb / 1024).toFixed(1);
              return (
                <div key={vm.id} className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/8 transition-all duration-300 flex flex-col overflow-hidden group">
                  {/* Top accent strip */}
                  <div className={`h-1 w-full bg-gradient-to-r ${state.bar}`} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate text-base">{vm.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{vm.hostname || 'No hostname'}</p>
                      </div>
                      <span className={`ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold flex-shrink-0 ${state.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${state.dot} ${vm.power_state === 'running' ? 'pulse-dot' : ''}`} />
                        {state.label}
                      </span>
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'CPU', value: `${vm.vcpu}`, unit: 'cores' },
                        { label: 'RAM', value: memGB, unit: 'GB' },
                        { label: 'Disk', value: `${vm.disk_gb}`, unit: 'GB' },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className="text-center p-2.5 bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                          <p className="font-bold text-slate-900 text-sm mt-0.5">{value}</p>
                          <p className="text-[10px] text-slate-400">{unit}</p>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto">
                      <p className="text-[11px] text-slate-400 mb-3">
                        Created {new Date(vm.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => navigate(`/vms/${vm.id}/console`)}
                          disabled={vm.power_state !== 'running'}
                          className="py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all duration-200"
                        >
                          Connect
                        </button>
                        <button
                          onClick={() => navigate(`/vms/${vm.id}`)}
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors duration-200"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

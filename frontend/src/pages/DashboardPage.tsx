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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [vms, setVms] = useState<VM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVMs = async () => {
      try {
        const data = await api.listVMs();
        setVms(data.vms || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load VMs');
      } finally {
        setLoading(false);
      }
    };

    loadVMs();
  }, []);

  const handleConnect = (vmId: string) => {
    navigate(`/vms/${vmId}/console`);
  };

  const getPowerStateColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'bg-green-900 text-green-200';
      case 'stopped':
        return 'bg-gray-700 text-gray-200';
      case 'paused':
        return 'bg-yellow-900 text-yellow-200';
      case 'error':
        return 'bg-red-900 text-red-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Welcome back, <span className="font-semibold text-slate-900">{user?.email}</span>
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-700 animate-slide-in">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* VMs Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-slate-600">Loading virtual machines...</span>
            </div>
          </div>
        ) : vms.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20m0 0l-.75 3M9 20H5m4-2.5L5.75 5M9 20l3.25 3M9 20l4-12m6.5 11h.01M19.5 8a.5.5 0 11-1 0 .5.5 0 011 0z" />
            </svg>
            <p className="text-slate-600 font-medium">No virtual machines available</p>
            <p className="text-slate-500 text-sm mt-1">Create your first VM to get started</p>
          </div>
        ) : (
          vms.map((vm) => (
            <div key={vm.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-5 sm:p-6 flex flex-col flex-1">
                {/* VM Name */}
                <h3 className="text-lg font-semibold text-slate-900 truncate mb-2">
                  {vm.name}
                </h3>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPowerStateColor(vm.power_state)}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${vm.power_state === 'running' ? 'bg-green-400' : vm.power_state === 'stopped' ? 'bg-slate-400' : vm.power_state === 'paused' ? 'bg-yellow-400' : 'bg-red-400'}`}></span>
                    {vm.power_state.charAt(0).toUpperCase() + vm.power_state.slice(1)}
                  </span>
                </div>

                {/* VM Details */}
                <div className="mt-3 space-y-3 text-sm text-slate-600 flex-1">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Hostname</span>
                    <span className="font-medium text-slate-900">{vm.hostname || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">CPU</span>
                    <span className="font-medium text-slate-900">{vm.vcpu} cores</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Memory</span>
                    <span className="font-medium text-slate-900">{(vm.memory_mb / 1024).toFixed(1)} GB</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Disk</span>
                    <span className="font-medium text-slate-900">{vm.disk_gb} GB</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">Created</span>
                    <span className="font-medium text-slate-900">
                      {new Date(vm.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleConnect(vm.id)}
                    disabled={vm.power_state !== 'running'}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 text-sm"
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => navigate(`/vms/${vm.id}`)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors duration-200 text-sm"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Summary */}
      {vms.length > 0 && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 sm:p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm font-medium">Total VMs</p>
              <svg className="w-8 h-8 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" /><path fillRule="evenodd" d="M3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm11-3a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900">{vms.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 sm:p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm font-medium">Running</p>
              <svg className="w-8 h-8 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-green-600">
              {vms.filter((vm) => vm.power_state === 'running').length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 sm:p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm font-medium">Stopped</p>
              <svg className="w-8 h-8 text-slate-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16M8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-slate-600">
              {vms.filter((vm) => vm.power_state === 'stopped').length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 sm:p-6 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm font-medium">Total Memory</p>
              <svg className="w-8 h-8 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-purple-600">
              {(vms.reduce((sum, vm) => sum + vm.memory_mb, 0) / 1024).toFixed(1)} GB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

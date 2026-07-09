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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, <span className="font-semibold">{user?.email}</span>
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* VMs Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-600">Loading virtual machines...</span>
            </div>
          </div>
        ) : vms.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-600">No virtual machines available</p>
          </div>
        ) : (
          vms.map((vm) => (
            <div key={vm.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* VM Name */}
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {vm.name}
                </h3>

                {/* Status Badge */}
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPowerStateColor(vm.power_state)}`}>
                    {vm.power_state.charAt(0).toUpperCase() + vm.power_state.slice(1)}
                  </span>
                </div>

                {/* VM Details */}
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Hostname:</span>
                    <span className="font-medium text-gray-900">{vm.hostname || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU:</span>
                    <span className="font-medium text-gray-900">{vm.vcpu} cores</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory:</span>
                    <span className="font-medium text-gray-900">{(vm.memory_mb / 1024).toFixed(1)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Disk:</span>
                    <span className="font-medium text-gray-900">{vm.disk_gb} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(vm.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => handleConnect(vm.id)}
                    disabled={vm.power_state !== 'running'}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => navigate(`/vms/${vm.id}`)}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
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
        <div className="grid gap-4 md:grid-cols-4 mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total VMs</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{vms.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Running</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {vms.filter((vm) => vm.power_state === 'running').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Stopped</p>
            <p className="text-3xl font-bold text-gray-600 mt-2">
              {vms.filter((vm) => vm.power_state === 'stopped').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Memory</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {(vms.reduce((sum, vm) => sum + vm.memory_mb, 0) / 1024).toFixed(1)} GB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

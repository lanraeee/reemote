import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConsoleViewer from '../components/ConsoleViewer';
import api from '../services/api';

interface VMDetail {
  id: string;
  name: string;
  hostname: string;
  vnc_port: number | null;
  power_state: string;
}

export default function ConsolePage() {
  const { vmId } = useParams<{ vmId: string }>();
  const navigate = useNavigate();
  const [vm, setVm] = useState<VMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vmId) { setError('No VM ID provided'); setLoading(false); return; }

    api.getVM(vmId)
      .then(data => { setVm(data); setError(null); })
      .catch(err => setError(err?.response?.data?.error || 'Failed to load VM details'))
      .finally(() => setLoading(false));
  }, [vmId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-sm">Loading VM details…</p>
        </div>
      </div>
    );
  }

  if (error || !vm) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-red-300 font-semibold mb-4">{error || 'VM not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const vncHost = vm.hostname;
  const vncPort = vm.vnc_port || 6080;

  return (
    <div className="h-screen flex flex-col bg-[#050505]">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#0d0d0d] border-b border-[#1e1e1e] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm truncate">{vm.name}</h1>
            <p className="text-slate-600 text-xs">{vncHost}:{vncPort}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
            vm.power_state === 'running'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${vm.power_state === 'running' ? 'bg-emerald-400 pulse-dot' : 'bg-slate-500'}`} />
            {vm.power_state === 'running' ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Console */}
      <div className="flex-1 overflow-hidden">
        <ConsoleViewer
          vmId={vmId || ''}
          sessionId={vm.id}
          vncHost={vncHost}
          vncPort={vncPort}
        />
      </div>
    </div>
  );
}

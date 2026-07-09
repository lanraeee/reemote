import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConsoleViewer from '../components/ConsoleViewer';
import api from '../services/api';

export default function ConsolePage() {
  const { vmId } = useParams<{ vmId: string }>();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vmName, setVmName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectConsole = async () => {
      if (!vmId) {
        setError('No VM ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get VM details
        const vmData = await api.getVM(vmId);
        setVmName(vmData.name);

        // Connect to console
        const consoleData = await api.connectConsole(vmId);
        setSessionId(consoleData.session_id);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to connect to console');
      } finally {
        setLoading(false);
      }
    };

    connectConsole();
  }, [vmId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <svg className="animate-spin mx-auto h-12 w-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white mt-4 font-medium">Connecting to console...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center px-4">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="text-red-300 text-lg font-semibold mb-4">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center px-4">
          <svg className="w-12 h-12 mx-auto text-yellow-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-white mb-4 font-medium">Failed to establish console session</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{vmName}</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Session ID: {sessionId}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors w-full sm:w-auto"
        >
          Back
        </button>
      </div>

      {/* Console Viewer */}
      <ConsoleViewer vmId={vmId || ''} sessionId={sessionId} />
    </div>
  );
}

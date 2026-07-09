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
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <svg className="animate-spin mx-auto h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white mt-4">Connecting to console...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-4">{error}</div>
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
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-white mb-4">Failed to establish console session</p>
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
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{vmName}</h1>
          <p className="text-gray-400 text-sm">Session ID: {sessionId}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          Back
        </button>
      </div>

      {/* Console Viewer */}
      <ConsoleViewer vmId={vmId || ''} sessionId={sessionId} />
    </div>
  );
}

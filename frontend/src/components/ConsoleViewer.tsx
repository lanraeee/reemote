import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';

interface ConsoleViewerProps {
  vmId: string;
  sessionId: string;
}

interface ConsoleStats {
  bandwidth: number;
  frames_sent: number;
  key_events: number;
  mouse_events: number;
  uptime: string;
  bytes_sent: number;
  bytes_received: number;
}

export default function ConsoleViewer({ vmId, sessionId }: ConsoleViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<ConsoleStats | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and update stats periodically
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getConsoleStats(sessionId);
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!isConnected || !canvasRef.current?.focus) return;

      try {
        await api.sendConsoleMessage(sessionId, 'key', {
          key: e.keyCode,
          down: true,
        });
      } catch (err) {
        setError('Failed to send key event');
      }
    };

    const handleKeyUp = async (e: KeyboardEvent) => {
      if (!isConnected) return;

      try {
        await api.sendConsoleMessage(sessionId, 'key', {
          key: e.keyCode,
          down: false,
        });
      } catch (err) {
        setError('Failed to send key event');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isConnected, sessionId]);

  // Handle mouse input
  const handleMouseMove = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      await api.sendConsoleMessage(sessionId, 'pointer', {
        x: Math.round(x),
        y: Math.round(y),
        button_mask: e.buttons,
      });
    } catch (err) {
      // Silently fail for mouse moves to avoid spam
    }
  };

  const handleMouseDown = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      await api.sendConsoleMessage(sessionId, 'pointer', {
        x: Math.round(x),
        y: Math.round(y),
        button_mask: e.buttons,
      });
    } catch (err) {
      setError('Failed to send mouse event');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatBandwidth = (bps: number) => {
    const mbps = bps / (1024 * 1024);
    return mbps.toFixed(2) + ' Mbps';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Console Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black">
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-700 cursor-none max-w-full max-h-full"
          width={1024}
          height={768}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          tabIndex={0}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900 px-4 py-2 text-red-100">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="flex justify-between items-center text-sm">
          <div className="flex gap-6">
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? '● Connected' : '● Disconnected'}
              </span>
            </div>

            {stats && (
              <>
                <div>
                  <span className="text-gray-400">Bandwidth:</span>
                  <span className="ml-2">{formatBandwidth(stats.bandwidth)}</span>
                </div>

                <div>
                  <span className="text-gray-400">Frames:</span>
                  <span className="ml-2">{stats.frames_sent}</span>
                </div>

                <div>
                  <span className="text-gray-400">Uptime:</span>
                  <span className="ml-2">{stats.uptime}</span>
                </div>

                <div>
                  <span className="text-gray-400">Sent:</span>
                  <span className="ml-2">{formatBytes(stats.bytes_sent)}</span>
                </div>

                <div>
                  <span className="text-gray-400">Received:</span>
                  <span className="ml-2">{formatBytes(stats.bytes_received)}</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => canvasRef.current?.focus()}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Focus Console
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
        <p>Click on the console to capture input • Press Esc to release focus</p>
      </div>
    </div>
  );
}
